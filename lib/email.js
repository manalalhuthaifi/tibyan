/* إرسال إيميلات عبر Resend (https://resend.com) — يحتاج RESEND_API_KEY في متغيّرات البيئة.
   EMAIL_FROM اختياري: عنوان المرسل (افتراضيًا onboarding@resend.dev وهو صالح فقط للتجربة —
   لإرسال حقيقي لطالباتك لازم تربطي نطاقًا فعليًا من لوحة Resend وتحطّي عنوانه هنا). */
const { sql } = require("./db");

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* تولّد كودًا جديدًا، تحفظه (صالح ١٥ دقيقة)، وترسله لإيميل الطالبة */
async function issueAndSendCode(userId, email) {
  const code = genCode();
  await sql`
    INSERT INTO email_codes (user_id, code, expires_at)
    VALUES (${userId}, ${code}, now() + interval '15 minutes')
  `;
  await sendVerificationEmail(email, code);
}

function verificationHtml(code) {
  return (
    '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;text-align:right">' +
    '<h2>كود التحقق من إيميلك</h2>' +
    '<p style="font-size:28px;font-weight:bold;letter-spacing:6px">' + code + '</p>' +
    '<p>يصلح لمدة ١٥ دقيقة. إذا ما طلبتِ هذا الكود، تجاهلي هذا الإيميل.</p>' +
    '</div>'
  );
}

/* Gmail عبر كلمة مرور تطبيقات (GMAIL_USER + GMAIL_APP_PASSWORD) — يُستخدم لو موجودين، وإلا Resend */
async function sendViaGmail(to, code) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: 'تبيان <' + process.env.GMAIL_USER + '>',
    to,
    subject: 'كود التحقق — تبيان',
    html: verificationHtml(code),
  });
}

async function sendVerificationEmail(to, code) {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try { return await sendViaGmail(to, code); }
    catch (err) { throw new Error('تعذّر إرسال الإيميل عبر Gmail: ' + err.message); }
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY غير معرّف في متغيّرات البيئة — لازم تضيفينه في Vercel.");
  const from = process.env.EMAIL_FROM || "تبيان <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "كود التحقق — تبيان",
      html: verificationHtml(code),
    }),
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error("تعذّر إرسال الإيميل: " + (body.message || r.status));
  }
}

module.exports = { genCode, sendVerificationEmail, issueAndSendCode };
