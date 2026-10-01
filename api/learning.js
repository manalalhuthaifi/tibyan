const {sql,ensureSchema}=require('../lib/db');
const {requireAuth}=require('../lib/auth');
const {getState}=require('../lib/learning');
const core=require('../public/learning-core');
const teacher=u=>u.role==='teacher'||u.role==='principal';
const isId=v=>Number.isInteger(Number(v))&&Number(v)>0;

async function assignmentsFor(u){
  const {rows}=teacher(u)
    ? await sql`SELECT * FROM learning_assignments WHERE (${u.role}='principal' OR owner_id=${u.id}) ORDER BY created_at DESC`
    : await sql`SELECT a.* FROM learning_assignments a JOIN learning_recipients r ON r.assignment_id=a.id WHERE r.student_id=${u.id} AND a.archived=false ORDER BY a.due_at ASC`;
  const ids=rows.map(a=>a.id);
  if(!ids.length)return [];
  const [recipients,sessions]=await Promise.all([
    sql`SELECT r.assignment_id,r.student_id,u.name,u.class FROM learning_recipients r JOIN users u ON u.id=r.student_id WHERE r.assignment_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::int) AND (${teacher(u)} OR r.student_id=${u.id})`,
    sql`SELECT DISTINCT ON(assignment_id,user_id) assignment_id,user_id,created_at,entries FROM learning_sessions WHERE assignment_id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::int) AND (${teacher(u)} OR user_id=${u.id}) ORDER BY assignment_id,user_id,created_at DESC`
  ]);
  return rows.map(a=>({...a,recipients:recipients.rows.filter(r=>r.assignment_id===a.id).map(r=>{
    const session=sessions.rows.find(s=>s.assignment_id===a.id&&s.user_id===r.student_id);
    return {...r,submittedAt:session?.created_at||null,right:session?session.entries.filter(x=>x.ok).length:null,total:a.questions.length};
  })}));
}
module.exports=async(req,res)=>{
  if(req.query.__r==='growth')return require('../lib/routes/growth')(req,res);
  let client,committed=false;
  try{
    await ensureSchema();const u=await requireAuth(req,res);if(!u)return;
    if(req.method==='GET'){
      if(req.query.studentId&&!teacher(u))return res.status(403).json({error:'لا يمكنكِ عرض بيانات حساب آخر.'});
      const state=(!teacher(u)||isId(req.query.studentId))?await getState(teacher(u)?Number(req.query.studentId):u.id):null;
      const [assignments,metadata,reports]=await Promise.all([
        assignmentsFor(u),sql`SELECT * FROM learning_question_meta`,
        teacher(u)?sql`SELECT * FROM learning_question_reports ORDER BY created_at DESC`:sql`SELECT * FROM learning_question_reports WHERE reporter_id=${u.id} ORDER BY created_at DESC`
      ]);
      return res.status(200).json({state,assignments,metadata:metadata.rows,reports:reports.rows});
    }
    if(req.method!=='POST')return res.status(405).json({error:'طريقة الطلب غير متاحة.'});
    const b=req.body||{};
    if(b.op==='report'){
      const q=core.cleanQuestion(b.question),reason=String(b.reason||'').trim().slice(0,2000);
      if(reason.length<5)return res.status(400).json({error:'وضحي المشكلة في السؤال.'});
      const {rows}=await sql`INSERT INTO learning_question_reports(reporter_id,question_key,question,reason) VALUES(${u.id},${core.key(q)},${JSON.stringify(q)}::jsonb,${reason}) RETURNING *`;
      return res.status(200).json({report:rows[0]});
    }
    if(!teacher(u))return res.status(403).json({error:'هذا الإجراء متاح للمعلمة فقط.'});
    if(b.op==='metadata'){
      const q=core.cleanQuestion(b.question),source=String(b.source||'').trim().slice(0,500);
      const difficulty=['easy','medium','hard','unspecified'].includes(b.difficulty)?b.difficulty:'unspecified';
      const status=b.reviewStatus==='reviewed'?'reviewed':'pending';
      const distractors=Array.isArray(b.distractors)&&b.distractors.length===4?b.distractors.map(x=>String(x||'').trim().slice(0,2000)):['','','',''];
      if(!source)return res.status(400).json({error:'أدخلي مصدر السؤال.'});
      if(status==='reviewed'&&distractors.some((x,i)=>i!==q.a&&!x))return res.status(400).json({error:'أكملي شرح الخيارات الخاطئة قبل اعتماد المراجعة.'});
      const {rows}=await sql`INSERT INTO learning_question_meta(question_key,question,source,difficulty,review_status,distractors,updated_by) VALUES(${core.key(q)},${JSON.stringify(q)}::jsonb,${source},${difficulty},${status},${JSON.stringify(distractors)}::jsonb,${u.username}) ON CONFLICT(question_key) DO UPDATE SET question=EXCLUDED.question,source=EXCLUDED.source,difficulty=EXCLUDED.difficulty,review_status=EXCLUDED.review_status,distractors=EXCLUDED.distractors,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`;
      return res.status(200).json({metadata:rows[0]});
    }
    if(b.op==='resolveReport'){
      if(!isId(b.id)||!['resolved','dismissed'].includes(b.status))return res.status(400).json({error:'حالة البلاغ غير صحيحة.'});
      const response=String(b.response||'').trim().slice(0,2000);
      if(!response)return res.status(400).json({error:'أضيفي ملاحظة المراجعة.'});
      const {rows}=await sql`UPDATE learning_question_reports SET status=${b.status},response=${response},reviewed_by=${u.username},reviewed_at=now() WHERE id=${Number(b.id)} RETURNING *`;
      if(!rows[0])return res.status(404).json({error:'البلاغ غير موجود.'});
      return res.status(200).json({report:rows[0]});
    }
    if(b.op==='archiveAssignment'){
      if(!isId(b.id))return res.status(400).json({error:'معرّف المهمة غير صحيح.'});
      const {rows}=await sql`UPDATE learning_assignments SET archived=true WHERE id=${Number(b.id)} AND (${u.role}='principal' OR owner_id=${u.id}) RETURNING id`;
      if(!rows.length)return res.status(404).json({error:'المهمة غير متاحة.'});
      return res.status(200).json({ok:true});
    }
    if(b.op==='createAssignment'){
      const title=String(b.title||'').trim().slice(0,160),skill=String(b.skill||'').trim().slice(0,120),track=b.track==='tahsili'?'tahsili':'qudrat';
      const due=new Date(b.dueAt),questions=(Array.isArray(b.questions)?b.questions:[]).slice(0,30).map(core.cleanQuestion);
      const ids=Array.from(new Set((Array.isArray(b.studentIds)?b.studentIds:[]).map(Number).filter(isId))).slice(0,300);
      if(!title||!skill||!questions.length||!ids.length||!Number.isFinite(due.getTime())||due.getTime()<=Date.now())return res.status(400).json({error:'أكملي العنوان والمهارة والأسئلة والطالبات وموعدًا قادمًا.'});
      if(questions.some(q=>q.skill!==skill||((q.s==='saat')!==(track==='tahsili')))||new Set(questions.map(core.key)).size!==questions.length)return res.status(400).json({error:'اختاري أسئلة مختلفة من المهارة والقسم المحددين.'});
      client=await sql.connect();await client.query('BEGIN');const query=client.sql.bind(client);
      const {rows:students}=await query`SELECT id FROM users WHERE id IN (SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::int) AND role='student' FOR SHARE`;
      if(students.length!==ids.length)return res.status(400).json({error:'بعض حسابات الطالبات غير متاحة.'});
      const {rows}=await query`INSERT INTO learning_assignments(owner_id,title,skill,track,notes,questions,due_at) VALUES(${u.id},${title},${skill},${track},${String(b.notes||'').slice(0,2000)},${JSON.stringify(questions)}::jsonb,${due.toISOString()}) RETURNING *`;
      await query`INSERT INTO learning_recipients(assignment_id,student_id) SELECT ${rows[0].id},jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb)::int`;
      await client.query('COMMIT');committed=true;
      return res.status(200).json({assignment:rows[0]});
    }
    return res.status(400).json({error:'الإجراء غير معروف.'});
  }catch(error){res.status(error.statusCode||500).json({error:error.statusCode?error.message:'تعذّر حفظ البيانات. حاولي مرة أخرى.'});}
  finally{if(client){if(!committed)await client.query('ROLLBACK').catch(()=>{});client.release();}}
};
