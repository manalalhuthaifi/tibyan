const SUBJECTS={qudrat:['quant','verbal'],tahsili:['phys','chem','bio','math']};
function invalid(message){const error=new Error(message);error.statusCode=400;throw error;}
function field(body,name,max,required){const value=body[name]??'';if(typeof value!=='string')invalid('نوع البيانات غير صحيح.');const text=value.trim();if(text.length>max)invalid('النص أطول من الحد المسموح.');if(required&&!text)invalid('أكملي اسم القانون وصيغته.');return text;}
function validateLaw(body){
  if(!body||!SUBJECTS[body.track]?.includes(body.subject))invalid('اختاري القسم والمادة الصحيحين.');
  return {track:body.track,subject:body.subject,title:field(body,'title',160,true),formula:field(body,'formula',4000,true),explanation:field(body,'explanation',3000,false),example:field(body,'example',4000,false),source:field(body,'source',300,false)};
}
function validId(value){const id=Number(value);if(!Number.isSafeInteger(id)||id<1)invalid('معرّف القانون غير صحيح.');return id;}
function clientKey(value){if(typeof value!=='string'||!/^[-\w]{8,100}$/.test(value))invalid('معرّف الحفظ غير صحيح.');return value;}
module.exports={validateLaw,validId,clientKey};
