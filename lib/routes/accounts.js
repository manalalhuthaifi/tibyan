const {sql,ensureSchema}=require('../db');
const {requireAuth}=require('../auth');
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
module.exports=async(req,res)=>{
  let client,committed=false;
  try{
    const user=await requireAuth(req,res,'principal');if(!user)return;await ensureSchema();
    if(req.method==='GET'){
      const q=String(req.query?.q||'').trim().slice(0,120),role=['student','teacher'].includes(req.query?.role)?req.query.role:'all',test=['true','false'].includes(req.query?.test)?req.query.test:'all';
      const page=Math.max(1,Math.min(100000,Math.floor(Number(req.query?.page)||1))),offset=(page-1)*25;
      const [accounts,counts]=await Promise.all([
        sql`SELECT id,username,name,class,role,is_test,done,created_at FROM users WHERE role IN ('student','teacher') AND id<>${user.id} AND LOWER(username)<>LOWER(${user.username||''}) AND (${q}='' OR POSITION(LOWER(${q}) IN LOWER(username||' '||name||' '||COALESCE(class,'')))>0) AND (${role}='all' OR role=${role}) AND (${test}='all' OR is_test=${test==='true'}) ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ${offset}`,
        sql`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE role='student')::int AS students,COUNT(*) FILTER(WHERE role='teacher')::int AS teachers,COUNT(*) FILTER(WHERE is_test)::int AS tests FROM users WHERE role IN ('student','teacher') AND id<>${user.id} AND LOWER(username)<>LOWER(${user.username||''}) AND (${q}='' OR POSITION(LOWER(${q}) IN LOWER(username||' '||name||' '||COALESCE(class,'')))>0) AND (${role}='all' OR role=${role}) AND (${test}='all' OR is_test=${test==='true'})`
      ]);
      return res.status(200).json({accounts:accounts.rows,counts:counts.rows[0],page});
    }
    const body=req.body||{};
    if(req.method==='PATCH'){
      if(!positive(body.id)||typeof body.isTest!=='boolean')return res.status(400).json({error:'بيانات الحساب غير صحيحة.'});
      const {rows}=await sql`UPDATE users SET is_test=${body.isTest} WHERE id=${Number(body.id)} AND id<>${user.id} AND role IN ('student','teacher') AND LOWER(username)<>LOWER(${user.username||''}) RETURNING id`;
      if(!rows.length)return res.status(404).json({error:'الحساب غير متاح للتعديل.'});
      return res.status(200).json({ok:true});
    }
    if(req.method!=='DELETE')return res.status(405).json({error:'طريقة الطلب غير متاحة.'});
    if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>50||body.ids.some(id=>!positive(id))||body.confirmation!=='حذف الحسابات المحددة')return res.status(400).json({error:'حددي من حساب واحد إلى ٥٠ حسابًا وأكدي الحذف.'});
    const ids=Array.from(new Set(body.ids.map(Number))),json=JSON.stringify(ids);
    client=await sql.connect();await client.query('BEGIN');const query=client.sql.bind(client);
    const {rows:found}=await query`SELECT id FROM users WHERE id IN (SELECT jsonb_array_elements_text(${json}::jsonb)::int) AND id<>${user.id} AND role IN ('student','teacher') AND LOWER(username)<>LOWER(${user.username||''}) FOR UPDATE`;
    if(found.length!==ids.length)return res.status(404).json({error:'تغيرت قائمة الحسابات أو تضمنت حسابًا محميًا. حدّثي القائمة قبل الحذف.'});
    await query`DELETE FROM learning_question_reports WHERE reporter_id IN (SELECT jsonb_array_elements_text(${json}::jsonb)::int)`;
    const {rows:deleted}=await query`DELETE FROM users WHERE id IN (SELECT jsonb_array_elements_text(${json}::jsonb)::int) AND id<>${user.id} AND role IN ('student','teacher') AND LOWER(username)<>LOWER(${user.username||''}) RETURNING id`;
    await client.query('COMMIT');committed=true;
    return res.status(200).json({deleted:deleted.length});
  }catch(error){return res.status(500).json({error:'تعذّر تنفيذ إدارة الحسابات. حاولي مرة أخرى.'});}
  finally{if(client){if(!committed)await client.query('ROLLBACK').catch(()=>{});client.release();}}
};
