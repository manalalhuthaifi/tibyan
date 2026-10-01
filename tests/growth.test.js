const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../public/learning-core'),F=require('../public/growth-core');
const {sanitizeEntries}=(()=>{const fs=require('fs'),vm=require('vm'),module={exports:{}};vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../lib/learning.js'),'utf8'),{module,require:id=>id==='./db'?{}:C});return module.exports;})();
const q={skill:'جبر',q:'٣س = ١٥',s:'quant',c:['٣','٤','٥','٦'],a:2,e:'س = ٥'};
const p={examDate:'2026-10-10',minutes:30,days:[0,1,2,3,4,5,6],track:'qudrat'};
test('Plan schedules only selected Saudi weekdays and excludes exam day',()=>{
 const result=F.plan({...p,days:[0,2]},[],['جبر'],Date.parse('2026-10-01T22:30:00Z'));
 assert.equal(result.today,'2026-10-02');assert.deepEqual(result.dates.map(d=>d.date),['2026-10-04','2026-10-06']);assert.equal(result.studyDays,2);
});
test('Plan rebuilds from today, counts only plan sessions in the selected track',()=>{
 const sessions=[{at:'2026-09-30T12:00:00Z',entries:[{purpose:'plan',track:'qudrat'}]},{at:'2026-10-01T12:00:00Z',entries:[{purpose:'plan',track:'qudrat'},{purpose:'plan',track:'tahsili'},{purpose:'train',track:'qudrat'}]}];
 const result=F.plan(p,sessions,['جبر'],'2026-10-01T13:00:00Z');assert.equal(result.dates[0].completed,1);assert.equal(result.dates[0].remaining,19);assert.equal(result.daysLeft,9);
});
test('Invalid settings reject nonexistent dates, no study days and invalid times',()=>{
 for(const update of [{examDate:'2026-02-30'},{minutes:0},{minutes:181},{minutes:10.5},{days:[]},{days:[7]},{days:['1']}])assert.throws(()=>F.settings({...p,...update}));
 assert.equal(F.plan({...p,examDate:'2026-09-30'},[],['جبر'],'2026-10-01').expired,true);
});
test('Confidence report separates unknown confidence and assistance',()=>{
 const result=F.calibration([{ok:true,confidence:'high'},{ok:false,confidence:'high'},{ok:true,confidence:'low'},{ok:false,confidence:'low'},{ok:true,hints:1,confidence:'high'},{ok:true}]);
 assert.deepEqual(result,{independent:1,confidentWrong:1,uncertainRight:1,uncertainWrong:1,assisted:1,unrated:1,total:6});
});
test('Revealed answers are not scored correct and sanitized entries retain learning signals',()=>{
 const [entry]=sanitizeEntries([{q,picked:2,hints:3,confidence:'high',purpose:'foundation',secs:25,visits:2,flagged:true}]);
 assert.equal(entry.ok,false);assert.equal(entry.purpose,'foundation');assert.equal(entry.confidence,'high');assert.equal(entry.visits,2);assert.equal(entry.flagged,true);
 const [invalid]=sanitizeEntries([{q,picked:2,hints:99,confidence:'fake',purpose:'fake'}]);assert.equal(invalid.hints,3);assert.equal(invalid.confidence,null);assert.equal(invalid.purpose,'train');
});
test('Assisted successful review does not advance mastery',()=>{
 const state=C.stateFromSessions([{at:'2026-10-01',reviewKey:C.key(q),entries:[{q,skill:q.skill,ok:true,hints:1}]}],[{q}]);assert.equal(state.reviews[C.key(q)].successes,0);
});
test('Timing distinguishes missing timing, unanswered questions and revisits',()=>{
 const result=F.timing([{picked:1,ok:false,secs:10,visits:1},{picked:2,ok:true,secs:100,visits:2},{picked:null,ok:false,secs:0}]);
 assert.equal(result.seconds,110);assert.equal(result.average,55);assert.equal(result.unanswered,1);assert.equal(result.quickWrong.length,1);assert.equal(result.slow.length,1);assert.equal(result.revisited,1);
});
test('Teacher signals require adequate weekly samples and identify overdue work',()=>{
 const now=Date.parse('2026-10-01T12:00:00+03:00'),sessions=[{at:'2026-10-01T10:00:00+03:00',entries:Array.from({length:3},()=>({skill:'جبر',ok:false,confidence:'high'}))}];
 const result=F.alerts({id:1},sessions,[{title:'جبر',skill:'جبر',due_at:'2026-09-30',recipients:[{student_id:1,submittedAt:null}]}],now);
 assert.ok(result.some(a=>a.type==='skill'));assert.ok(result.some(a=>a.type==='confidence'));assert.ok(result.some(a=>a.type==='assignment'));assert.ok(!result.some(a=>a.type==='accuracy'));
 const inactive=F.alerts({id:1},[{at:'2026-09-20',entries:[]}],[],now);assert.ok(inactive.some(a=>a.type==='inactive'));
});
