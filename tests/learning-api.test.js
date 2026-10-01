const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const core=require('../public/learning-core');
const question={s:'verbal',skill:'تناظر لفظي',q:'اختبار',c:['أ','ب','ج','د'],a:1,e:'شرح'};
function load(name,dependencies){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),{module,exports:module.exports,require:id=>{if(id in dependencies)return dependencies[id];throw new Error('Unexpected import '+id);},console,Date,JSON,Number,String,Array,Set,Promise});return module.exports;}
function response(){return {code:200,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
function fakeDb(options={}){
 const calls=[];const user={id:1,role:'student',name:'طالبة',class:'فصل',progress:null,done:0};
 const query=async(strings,...values)=>{const text=strings.join('?').replace(/\s+/g,' ').trim();calls.push({text,values});
  if(text.startsWith('SELECT * FROM users'))return {rows:[user]};
  if(text.startsWith('SELECT id FROM learning_sessions'))return {rows:options.duplicate?[{id:1}]:[]};
  if(text.startsWith('SELECT id FROM users'))return {rows:[{id:1}]};
  if(text.startsWith('SELECT skill, track'))return {rows:[{skill:question.skill,track:'qudrat',n:1,ok:1}]};
  if(options.failWrite&&text.startsWith('UPDATE users SET done'))throw new Error('test write failure');
  if(text.startsWith('INSERT INTO learning_assignments'))return {rows:[{id:7}]};
  return {rows:[]};
 };
 const client={sql:query,query:async(text)=>{calls.push({text,values:[]});},release:()=>calls.push({text:'RELEASE'})};
 const sql=Object.assign(query,{connect:async()=>client});return {sql,ensureSchema:async()=>{},calls,client};
}
function api(db,user){return load('api/learning.js',{'../lib/db':db,'../lib/auth':{requireAuth:async()=>user},'../lib/learning':{getState:async()=>core.empty()},'../public/learning-core':core});}
test('Students cannot create assignments or edit metadata',async()=>{
 for(const op of ['createAssignment','metadata','resolveReport','archiveAssignment']){const db=fakeDb(),res=response();await api(db,{id:1,role:'student'})({method:'POST',body:{op},query:{}},res);assert.equal(res.code,403);assert.equal(db.calls.length,0);}
});
test('Students cannot fetch another student weekly/review history',async()=>{
 const db=fakeDb(),res=response();await api(db,{id:1,role:'student'})({method:'GET',query:{studentId:'2'}},res);assert.equal(res.code,403);
});
test('Reviewed questions require source and all distractor explanations',async()=>{
 const db=fakeDb(),res=response();await api(db,{id:2,role:'teacher',username:'teacher'})({method:'POST',query:{},body:{op:'metadata',question,source:'مصدر',reviewStatus:'reviewed',distractors:['','','','']}},res);assert.equal(res.code,400);assert.equal(db.calls.length,0);
});
test('Assignment creation persists recipients in the same transaction',async()=>{
 const db=fakeDb(),res=response();await api(db,{id:2,role:'teacher',username:'teacher'})({method:'POST',query:{},body:{op:'createAssignment',title:'مهمة',skill:question.skill,track:'qudrat',dueAt:new Date(Date.now()+86400000).toISOString(),questions:[question],studentIds:[1]}},res);
 assert.equal(res.code,200);assert.ok(db.calls.some(x=>x.text==='BEGIN'));assert.ok(db.calls.some(x=>x.text.startsWith('INSERT INTO learning_recipients')));assert.ok(db.calls.some(x=>x.text==='COMMIT'));assert.equal(db.calls.at(-1).text,'RELEASE');
});
test('Assignment archive SQL enforces owner/principal scope',async()=>{
 const db=fakeDb(),res=response();await api(db,{id:2,role:'teacher'})({method:'POST',query:{},body:{op:'archiveAssignment',id:7}},res);assert.equal(res.code,404);assert.ok(db.calls[0].text.includes('owner_id='));assert.ok(db.calls[0].values.includes(2));
});
test('Invalid question bodies return validation errors',async()=>{
 const db=fakeDb(),res=response();await api(db,{id:1,role:'student'})({method:'POST',query:{},body:{op:'report',question:{},reason:'خطأ بالسؤال'}},res);assert.equal(res.code,400);
});
function attempts(db){return load('api/attempts.js',{
 '../lib/db':db,'../lib/auth':{requireAuth:async()=>({id:1,role:'student'})},'../lib/profile':{toProfile:()=>({name:'طالبة'})},
 '../lib/daily':require('../lib/daily'),'../lib/learning':{prepareSession:async()=>({sessionKey:'session-test',entries:[{q:question,skill:question.skill,track:'qudrat',ok:true,picked:1,secs:40}],mode:'train'}),recordSession:async(id,session,query)=>query`INSERT INTO learning_sessions (user_id) VALUES (${id})`},'../public/learning-core':core
});}
test('Attempt writes and learning history commit atomically',async()=>{
 const db=fakeDb(),res=response();await attempts(db)({method:'POST',body:{log:[{}],learningContext:{}}},res);assert.equal(res.code,200);assert.ok(db.calls.some(x=>x.text.startsWith('INSERT INTO learning_sessions')));assert.ok(db.calls.some(x=>x.text==='COMMIT'));assert.ok(!db.calls.some(x=>x.text==='ROLLBACK'));
});
test('Duplicate sessions cannot increment counters again',async()=>{
 const db=fakeDb({duplicate:true}),res=response();await attempts(db)({method:'POST',body:{log:[{}],learningContext:{}}},res);assert.equal(res.code,409);assert.ok(!db.calls.some(x=>x.text.startsWith('INSERT INTO skills')));assert.ok(db.calls.some(x=>x.text==='ROLLBACK'));assert.equal(db.calls.at(-1).text,'RELEASE');
});
test('Failed attempt writes roll back and release the connection',async()=>{
 const db=fakeDb({failWrite:true}),res=response();await attempts(db)({method:'POST',body:{log:[{}],learningContext:{}}},res);assert.equal(res.code,500);assert.ok(db.calls.some(x=>x.text==='ROLLBACK'));assert.ok(!db.calls.some(x=>x.text==='COMMIT'));assert.equal(db.calls.at(-1).text,'RELEASE');
});
test('Teacher task answers use the saved answer key, not client correctness',async()=>{
 const calls=[];const query=async(strings,...values)=>{calls.push({text:strings.join('?'),values});return {rows:[{id:7,track:'qudrat',questions:[question]}]};};
 const helpers=load('lib/learning.js',{'./db':{sql:query},'../public/learning-core':core});
 const prepared=await helpers.prepareSession(1,{mode:'train',learningContext:{sessionKey:'session-test',assignmentId:7},log:[{q:{...question,a:0},skill:question.skill,picked:1,ok:false,track:'tahsili'}]},query);
 assert.equal(prepared.entries[0].ok,true);assert.equal(prepared.entries[0].q.a,1);assert.equal(prepared.entries[0].track,'qudrat');assert.ok(calls[0].text.includes('r.student_id='));
});
