const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const F=require('../public/growth-core'),C=require('../public/learning-core');
function setup(user,options={}){
 const calls=[];const sql=async(strings,...values)=>{const text=strings.join('?');calls.push({text,values});assert.ok(values.every(v=>v===null||['string','number','boolean','undefined'].includes(typeof v)));return {rows:text.includes('SELECT p.settings')&&options.saved?[options.saved]:[]};};
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../api/growth.js'),'utf8'),{module,require:id=>({'../lib/db':{sql,ensureSchema:async()=>{}},'../lib/auth':{requireAuth:async()=>user},'../public/growth-core':F,'../public/learning-core':C}[id]),Date,JSON,Number,String,Array,Promise});
 const res={code:200,body:null,status(n){this.code=n;return this;},json(body){this.body=body;return this;}};
 return {calls,res,run:body=>module.exports({method:'POST',body},res),get:()=>module.exports({method:'GET',query:{studentId:2}},res)};
}
test('Student notes are read and deleted only within authenticated account',async()=>{
 const s=setup({id:1,role:'student'});await s.get();assert.equal(s.calls.length,2);assert.ok(s.calls.every(c=>c.values.includes(1)));assert.ok(!s.calls.some(c=>c.values.includes(2)));
 await s.run({op:'deleteNote',key:'note-owned-123',userId:2});const call=s.calls.at(-1);assert.ok(call.text.includes('user_id='));assert.deepEqual(call.values,[1,'note-owned-123']);
});
test('Teacher cannot edit student plan or notebook',async()=>{
 for(const role of ['teacher','principal']){const s=setup({id:2,role});await s.run({op:'saveNote',key:'note-test-123',title:'عنوان',text:'ملاحظة'});assert.equal(s.res.code,403);assert.equal(s.calls.length,0);}
});
test('Notebook saves are idempotent and require title and content',async()=>{
 const s=setup({id:1,role:'student'});await s.run({op:'saveNote',key:'note-test-123',title:'عنوان',text:'ملاحظة'});assert.equal(s.res.code,200);assert.ok(s.calls[0].text.includes('ON CONFLICT(user_id,note_key)'));
 await s.run({op:'saveNote',key:'note-test-123',title:'',text:''});assert.equal(s.res.code,400);
});
test('Plans require a future exam date and valid preferences',async()=>{
 const s=setup({id:1,role:'student'});await s.run({op:'preferences',preferences:{examDate:'2020-01-01',minutes:30,days:[1]}});assert.equal(s.res.code,400);assert.equal(s.calls.length,0);
 await s.run({op:'preferences',preferences:{examDate:C.dayKey(Date.now()+86400000*60),minutes:30,days:[1,2],track:'qudrat'}});assert.equal(s.res.code,200);assert.ok(s.calls[0].text.includes('ON CONFLICT(user_id)'));assert.ok(s.calls[0].text.includes('UPDATE users SET exam_date='));
});
test('Plan reads account date changes and respects clearing an account exam date',async()=>{
 const settings={examDate:'2026-10-10',minutes:30,days:[1,2],track:'qudrat'};
 const s=setup({id:1,role:'student'},{saved:{settings,exam_date:'2026-11-10'}});await s.get();assert.equal(s.res.body.preferences.examDate,'2026-11-10');
 const cleared=setup({id:1,role:'student'},{saved:{settings,exam_date:null}});await cleared.get();assert.equal(cleared.res.body.preferences,null);
});
