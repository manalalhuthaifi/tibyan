const { sql } = require('./db');
const core = require('../public/learning-core');

function sanitizeEntries(log) {
  return log.map(item=>{
    const q=core.cleanQuestion({...item.q,skill:item.skill||item.q?.skill});
    const picked=item.picked==null?null:Number(item.picked);
    if(picked!==null&&(!Number.isInteger(picked)||picked<0||picked>3))throw new Error('خيار إجابة غير صحيح.');
    const hints=Math.max(0,Math.min(3,Math.floor(Number(item.hints)||0)));
    return {q,skill:q.skill,picked,ok:picked===q.a&&hints<3,track:item.track==='tahsili'?'tahsili':'qudrat',secs:Math.max(0,Math.min(3600,Number(item.secs)||0)),why:String(item.why||'').slice(0,200),hints,
      confidence:['high','low'].includes(item.confidence)?item.confidence:null,
      purpose:['plan','diagnostic','foundation'].includes(item.purpose)?item.purpose:'train',
      visits:Math.max(1,Math.min(200,Math.floor(Number(item.visits)||1))),flagged:!!item.flagged};
  });
}
async function prepareSession(userId,body,query=sql) {
  if(!body.learningContext)return null;
  const context=body.learningContext;
  const sessionKey=String(context.sessionKey||'').slice(0,100);
  if(!/^[\w-]{8,100}$/.test(sessionKey))throw new Error('معرّف الجلسة غير صحيح.');
  const entries=sanitizeEntries(body.log);
  let assignmentId=null;
  if(context.assignmentId){
    const {rows}=await query`SELECT a.* FROM learning_assignments a JOIN learning_recipients r ON r.assignment_id=a.id WHERE a.id=${Number(context.assignmentId)} AND r.student_id=${userId} AND a.archived=false FOR SHARE OF a`;
    const assignment=rows[0];
    if(!assignment)throw new Error('المهمة غير متاحة لهذا الحساب.');
    const expected=assignment.questions.map(core.key),actual=entries.map(x=>core.key(x.q));
    if(expected.length!==actual.length||new Set(actual).size!==actual.length||actual.some(k=>!expected.includes(k)))throw new Error('إجابات المهمة غير مكتملة.');
    // Grade teacher-assigned questions against their saved answer keys.
    entries.forEach(x=>{const saved=assignment.questions.find(q=>core.key(q)===core.key(x.q));x.q=saved;x.skill=saved.skill;x.track=assignment.track;x.ok=x.picked===saved.a&&x.hints<3;});
    assignmentId=assignment.id;
  }
  const reviewKey=/^q-[a-f0-9]{16}$/.test(context.reviewKey||'')?context.reviewKey:null;
  return {sessionKey,entries,assignmentId,reviewKey,mode:body.mode||'train'};
}
async function recordSession(userId,session,query=sql) {
  if(!session)return;
  await query`INSERT INTO learning_sessions(user_id,session_key,mode,assignment_id,review_key,entries) VALUES(${userId},${session.sessionKey},${session.mode},${session.assignmentId},${session.reviewKey},${JSON.stringify(session.entries)}::jsonb) ON CONFLICT(user_id,session_key) DO NOTHING`;
}
async function getState(userId){
  const [sessions,misses]=await Promise.all([
    sql`SELECT session_key,created_at,mode,review_key,assignment_id,entries FROM learning_sessions WHERE user_id=${userId} ORDER BY created_at ASC`,
    sql`SELECT skill,question_text,choices,correct_idx,explanation,why,created_at FROM misses WHERE user_id=${userId} ORDER BY created_at ASC`
  ]);
  return core.stateFromSessions(sessions.rows.map(s=>({id:s.session_key,at:s.created_at,mode:s.mode,reviewKey:s.review_key,assignmentId:s.assignment_id,entries:s.entries})),misses.rows.map(m=>({q:{skill:m.skill,q:m.question_text,c:m.choices,a:m.correct_idx,e:m.explanation},why:m.why,createdAt:m.created_at})));
}
module.exports={prepareSession,recordSession,getState,sanitizeEntries};
