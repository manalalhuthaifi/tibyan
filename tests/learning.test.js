const test=require('node:test');const assert=require('node:assert/strict');const C=require('../public/learning-core');
const q={s:'verbal',skill:'تناظر لفظي',q:'العلاقة',pair:['قلم','كتابة','مقص'],c:['ورق','قص','حديد','خياطة'],a:1,e:'أداة ووظيفتها'};
const entry=(ok,question=q)=>({q:question,skill:question.skill,track:'qudrat',ok,picked:ok?question.a:0,secs:40});
const session=(at,ok,reviewKey)=>({at,entries:[entry(ok)],reviewKey});
test('Legacy analogy snapshots retain the same question key',()=>{
 const old={...q,q:C.questionText(q)};delete old.pair;assert.equal(C.key(old),C.key(q));
});
test('Mastery requires three spaced reviews, not repeated clicks on one day',()=>{
 const key=C.key(q),sessions=[session('2026-09-01T10:00:00Z',false),session('2026-09-01T11:00:00Z',true,key),session('2026-09-01T12:00:00Z',true,key)];
 let r=C.stateFromSessions(sessions).reviews[key];assert.equal(r.successes,1);assert.equal(r.stage,'improved');
 sessions.push(session('2026-09-02T12:00:00Z',true,key),session('2026-09-05T12:00:00Z',true,key));
 r=C.stateFromSessions(sessions).reviews[key];assert.equal(r.stage,'mastered');assert.equal(r.dueAt,null);
 sessions.push(session('2026-09-06T12:00:00Z',false));r=C.stateFromSessions(sessions).reviews[key];assert.equal(r.stage,'needs');assert.equal(r.successes,0);
});
test('An unrelated skill cannot advance a review',()=>{
 const key=C.key(q),other={...q,skill:'إكمال الجمل'};
 const state=C.stateFromSessions([session('2026-09-01T10:00:00Z',false),{at:'2026-09-02T12:00:00Z',reviewKey:key,entries:[entry(true,other)]}]);
 assert.equal(state.reviews[key].successes,0);
});
test('Untested and low-sample skills are not marked mastered',()=>{
 const rows=C.mastery({a:{n:0,ok:0},b:{n:4,ok:4},c:{n:10,ok:9},d:{n:10,ok:5}});
 assert.deepEqual(rows.map(x=>x.status),['insufficient','insufficient','mastered','needs']);
});
test('Weekly windows use Saudi dates and exclude zero/missing timing',()=>{
 const sessions=[{at:'2026-09-30T22:00:00Z',entries:[entry(true)]},{at:'2026-09-23T22:00:00Z',entries:[{...entry(false),secs:0}]},{at:'2026-09-23T20:00:00Z',entries:[entry(false)]}];
 const week=C.weekly(sessions,new Date('2026-10-01T09:00:00Z'),'qudrat');
 assert.equal(C.dayKey('2026-09-30T22:00:00Z'),'2026-10-01');assert.equal(week.current.n,1);assert.equal(week.previous.n,2);assert.equal(week.previous.seconds,40);assert.equal(week.days.length,7);
});
test('Question validation rejects missing options and fractional answer keys',()=>{
 assert.throws(()=>C.cleanQuestion({...q,c:['one','two']}));assert.throws(()=>C.cleanQuestion({...q,a:0.5}));assert.throws(()=>C.cleanQuestion({...q,c:['same','same','x','y']}));
});
