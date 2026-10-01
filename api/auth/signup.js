const { sql, ensureSchema } = require("../../lib/db");
const { hashPassword } = require("../../lib/auth");
const { issueAndSendCode } = require("../../lib/email");

const DISPOSABLE = new Set([
  "mailinator.com","tempmail.com","temp-mail.org","guerrillamail.com","guerrillamail.info",
  "guerrillamail.biz","guerrillamail.net","guerrillamail.org","guerrillamail.de","sharklasers.com",
  "10minutemail.com","10minutemail.net","20minutemail.com","yopmail.com","yopmail.fr","yopmail.net",
  "throwawaymail.com","trashmail.com","trashmail.net","trashmail.me","dispostable.com","getnada.com",
  "fakeinbox.com","fakemailgenerator.com","maildrop.cc","mohmal.com","mohmal.im","emailondeck.com",
  "mintemail.com","mytemp.email","tempinbox.com","tempmailo.com","moakt.com","moakt.cc","spamgourmet.com",
  "mailnesia.com","mailcatch.com","emailfake.com","tempr.email","discard.email","luxusmail.org",
  "burnermail.io","33mail.com","anonbox.net","harakirimail.com","spambog.com","mailsac.com",
  "inboxkitten.com","tmpmail.org","tmpmail.net","1secmail.com","1secmail.org","1secmail.net"
]);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    await ensureSchema();
    const b = req.body || {};
    const username = String(b.username || "").trim();
    const password = String(b.password || "");
    const name = String(b.name || "").trim();
    const cls = String(b.cls || "").trim();
    const email = String(b.email || "").trim().toLowerCase();

    if (!username || !password || !name) return res.status(400).json({ error: "اكتبي الاسم واسم المستخدم وكلمة المرور." });
    if (username.length < 3 || /\s/.test(username)) return res.status(400).json({ error: "اسم المستخدم ٣ خانات فأكثر وبدون مسافات." });
    if (password.length < 6) return res.status(400).json({ error: "كلمة المرور ٦ خانات على الأقل." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "صيغة الإيميل غير صحيحة." });
    const domain = email.split("@")[1];
    if (DISPOSABLE.has(domain)) return res.status(400).json({ error: "هذا مزوّد إيميل مؤقت — استخدمي إيميلكِ الحقيقي." });
    if (username.toLowerCase() === String(process.env.ADMIN_USER || "").toLowerCase()) {
      return res.status(400).json({ error: "اسم المستخدم محجوز، اختاري غيره." });
    }

    const dupe = await sql`SELECT id, username, email, email_verified FROM users WHERE username = ${username} OR email = ${email}`;
    if (dupe.rows.length) {
      /* حساب سابق لم يكتمل توثيقه بنفس اسم المستخدم والإيميل: نحدّث بياناته ونرسل كود جديد بدل ما نرفض */
      const d = dupe.rows[0];
      if (dupe.rows.length === 1 && !d.email_verified && d.username === username && d.email === email) {
        await sql`UPDATE users SET password_hash = ${hashPassword(password)}, name = ${name}, class = ${cls} WHERE id = ${d.id}`;
        try { await issueAndSendCode(d.id, d.email); }
        catch (mailErr) { return res.status(200).json({ needsVerification: true, username: d.username, mailError: mailErr.message }); }
        return res.status(200).json({ needsVerification: true, username: d.username });
      }
      return res.status(400).json({ error: "اسم المستخدم أو الإيميل مستخدم لحساب آخر." });
    }

    const hash = hashPassword(password);
    const { rows } = await sql`
      INSERT INTO users (username, password_hash, role, name, class, email)
      VALUES (${username}, ${hash}, 'student', ${name}, ${cls}, ${email})
      RETURNING id, username, email
    `;
    const user = rows[0];

    try {
      await issueAndSendCode(user.id, user.email);
    } catch (mailErr) {
      /* الحساب انشأ، بس تعذّر إرسال الإيميل — لا نفشل التسجيل، تقدر تطلب "إعادة الإرسال" لاحقًا */
      return res.status(200).json({ needsVerification: true, username: user.username, mailError: mailErr.message });
    }
    res.status(200).json({ needsVerification: true, username: user.username });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
