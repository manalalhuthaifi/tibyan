const {sql,ensureSchema}=require('../db');
const {requireAuth}=require('../auth');
const core=require('../../public/growth-core');
const {cleanQuestion,dayKey}=require('../../public/learning-core');

async function teacherAlerts(user){
  const [students,sessions,tasks,recipients,submissions,activity]=await Promise.all([
    sql`SELECT id,name,class FROM users WHERE role='student' ORDER BY name`,
    sql`SELECT user_id,session_key,created_at,mode,entries FROM learning_sessions WHERE created_at>=now()-interval '61 days' ORDER BY created_at`,
    sql`SELECT id,title,skill,track,created_at,due_at,archived FROM learning_assignments WHERE (${user.role}='principal' OR owner_id=${user.id})`,
    sql`SELECT assignment_id,student_id FROM learning_recipients`,
    sql`SELECT DISTINCT assignment_id,user_id FROM learning_sessions WHERE assignment_id IS NOT NULL`,
    sql`SELECT user_id,MAX(created_at) AS last_at FROM learning_sessions GROUP BY user_id`
  ]);
  const assignments=tasks.rows.map(a=>({...a,recipients:recipients.rows.filter(r=>r.assignment_id===a.id).map(r=>({...r,submittedAt:submissions.rows.some(s=>s.assignment_id===a.id&&s.user_id===r.student_id)?true:null}))}));
  const alerts=students.rows.map(student=>{
    const history=sessions.rows.filter(s=>s.user_id===student.id).map(s=>({at:s.created_at,entries:s.entries,mode:s.mode}));
    const last=activity.rows.find(a=>a.user_id===student.id);
    if(last&&!history.length)history.push({at:last.last_at,entries:[]});
    return {id:student.id,name:student.name,cls:student.class,alerts:core.alerts(student,history,assignments)};
  }).filter(s=>s.alerts.length);
  return {alerts,analytics:{assignmentScope:user.role==='principal'?'school':'teacher',students:students.rows.map(s=>({id:s.id,name:s.name,cls:s.class||'غير محدد',lastAt:activity.rows.find(a=>a.user_id===s.id)?.last_at||null})),sessions:sessions.rows.map(s=>({userId:s.user_id,at:s.created_at,mode:s.mode,entries:s.entries.map(({skill,track,ok,secs,hints,confidence,why,picked,purpose})=>({skill,track,ok,secs,hints,confidence,why,picked,purpose}))})),assignments}};
}
module.exports=async(req,res)=>{
  try{
    await ensureSchema();const user=await requireAuth(req,res);if(!user)return;
    const teacher=user.role==='teacher'||user.role==='principal';
    if(req.method==='GET'){
      if(teacher)return res.status(200).json({preferences:null,notes:[],...await teacherAlerts(user)});
      const [preferences,notes]=await Promise.all([
        sql`SELECT p.settings,u.exam_date FROM users u LEFT JOIN growth_preferences p ON p.user_id=u.id WHERE u.id=${user.id}`,
        sql`SELECT note_key,title,body,question,updated_at FROM learning_notebook WHERE user_id=${user.id} ORDER BY updated_at DESC`
      ]);
      const saved=preferences.rows[0];
      const plan=saved?.settings&&saved.exam_date?{...saved.settings,examDate:dayKey(saved.exam_date)}:null;
      return res.status(200).json({preferences:plan,notes:notes.rows,alerts:[]});
    }
    if(req.method!=='POST')return res.status(405).json({error:'طريقة الطلب غير متاحة.'});
    if(teacher)return res.status(403).json({error:'هذه البيانات خاصة بحساب الطالبة.'});
    const body=req.body||{};
    if(body.op==='preferences'){
      const preferences=core.settings(body.preferences);
      if(preferences.examDate<=dayKey(Date.now())||preferences.examDate>dayKey(Date.now()+365*86400000))return res.status(400).json({error:'اختاري موعد اختبار قادمًا خلال سنة.'});
      await sql`WITH saved AS (
        INSERT INTO growth_preferences(user_id,settings) VALUES(${user.id},${JSON.stringify(preferences)}::jsonb)
        ON CONFLICT(user_id) DO UPDATE SET settings=EXCLUDED.settings,updated_at=now() RETURNING user_id
      ) UPDATE users SET exam_date=${preferences.examDate} WHERE id IN (SELECT user_id FROM saved)`;
      return res.status(200).json({preferences});
    }
    if(body.op==='saveNote'||body.op==='deleteNote'){
      const key=String(body.key||'');if(!/^[\w-]{8,100}$/.test(key))return res.status(400).json({error:'معرّف الملاحظة غير صحيح.'});
      if(body.op==='deleteNote'){
        await sql`DELETE FROM learning_notebook WHERE user_id=${user.id} AND note_key=${key}`;
        return res.status(200).json({ok:true});
      }
      const title=String(body.title||'').trim().slice(0,160),text=String(body.text||'').trim().slice(0,4000);
      if(!title||!text)return res.status(400).json({error:'أكملي عنوان الملاحظة ومحتواها.'});
      const question=body.question?cleanQuestion(body.question):null;
      await sql`INSERT INTO learning_notebook(user_id,note_key,title,body,question) VALUES(${user.id},${key},${title},${text},${question?JSON.stringify(question):null}::jsonb) ON CONFLICT(user_id,note_key) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,question=EXCLUDED.question,updated_at=now()`;
      return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:'الإجراء غير معروف.'});
  }catch(error){return res.status(error.statusCode||500).json({error:error.statusCode?error.message:'تعذّر تحميل أو حفظ البيانات. حاولي مرة أخرى.'});}
};
