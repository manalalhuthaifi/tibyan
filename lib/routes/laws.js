const {sql,ensureSchema}=require('../db');
const {requireAuth}=require('../auth');
const {validateLaw,validId,clientKey}=require('../laws');
function toItem(row,user){return {id:row.id,track:row.track,subject:row.subject,title:row.title,formula:row.formula,explanation:row.explanation,example:row.example,source:row.source,author:row.owner_name||(row.owner_id===0?'المديرة':'المعلمة'),canEdit:user.role==='principal'||user.role==='teacher'&&row.owner_id===user.id};}
module.exports=async(req,res)=>{
  try{
    if(!['GET','POST','PUT','DELETE'].includes(req.method))return res.status(405).json({error:'طريقة الطلب غير متاحة.'});
    const user=await requireAuth(req,res,req.method==='GET'?undefined:'teacher');if(!user)return;
    await ensureSchema();
    if(req.method==='GET'){
      const {rows}=await sql`SELECT l.*,u.name AS owner_name FROM teacher_laws l LEFT JOIN users u ON u.id=l.owner_id ORDER BY l.created_at DESC,l.id DESC`;
      return res.status(200).json({laws:rows.map(row=>toItem(row,user))});
    }
    if(req.method==='DELETE'){
      const id=validId(req.query?.id);
      const {rows}=await sql`DELETE FROM teacher_laws WHERE id=${id} AND (${user.role}='principal' OR owner_id=${user.id}) RETURNING id`;
      if(!rows.length)return res.status(404).json({error:'القانون غير موجود أو لا تملكين صلاحية حذفه.'});
      return res.status(200).json({ok:true});
    }
    const b=req.body||{},law=validateLaw(b);let rows;
    if(req.method==='POST'){
      const key=clientKey(b.clientKey);
      ({rows}=await sql`INSERT INTO teacher_laws(owner_id,client_key,track,subject,title,formula,explanation,example,source)
        VALUES(${user.id},${key},${law.track},${law.subject},${law.title},${law.formula},${law.explanation},${law.example},${law.source})
        ON CONFLICT(owner_id,client_key) DO UPDATE SET track=EXCLUDED.track,subject=EXCLUDED.subject,title=EXCLUDED.title,formula=EXCLUDED.formula,explanation=EXCLUDED.explanation,example=EXCLUDED.example,source=EXCLUDED.source,updated_at=now() RETURNING *`);
    }else{
      const id=validId(b.id);
      ({rows}=await sql`UPDATE teacher_laws SET track=${law.track},subject=${law.subject},title=${law.title},formula=${law.formula},explanation=${law.explanation},example=${law.example},source=${law.source},updated_at=now() WHERE id=${id} AND (${user.role}='principal' OR owner_id=${user.id}) RETURNING *`);
      if(!rows.length)return res.status(404).json({error:'القانون غير موجود أو لا تملكين صلاحية تعديله.'});
    }
    return res.status(200).json({law:toItem(rows[0],user)});
  }catch(error){return res.status(error.statusCode||500).json({error:error.statusCode?error.message:'تعذّر حفظ أو تحميل القوانين. حاولي مرة أخرى.'});}
};
