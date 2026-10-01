const { sql, ensureSchema } = require("../../lib/db");
const { checkPassword, signToken } = require("../../lib/auth");
const { toProfile } = require("../../lib/profile");
const { issueAndSendCode } = require("../../lib/email");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    await ensureSchema();
    const b = req.body || {};
    const username = String(b.username || "").trim();
    const password = String(b.password || "");
    if (!username || !password) return res.status(400).json({ error: "اكتبي اسم المستخدم وكلمة المرور." });

    /* حساب المعلمة معرَّف من متغيّرات البيئة فقط — لا يوجد بالكود ولا بقاعدة البيانات */
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    if (adminUser && username === adminUser) {
      if (password !== adminPass) return res.status(400).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
      const token = signToken({ id: 0, role: "principal", username });
      const { rows: srows } = await sql`SELECT principal_name FROM site_settings WHERE id = 1`;
      const pname = (srows[0] && srows[0].principal_name) || "المديرة";
      return res.status(200).json({
        token,
        profile: toProfile(
          { role: "principal", name: pname, class: "", email: "", exam_date: null, agreed: true, placed: true, done: 0, progress: null },
          [], [], []
        ),
      });
    }

    const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = rows[0];
    if (!user || !checkPassword(password, user.password_hash)) {
      return res.status(400).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." });
    }
    if (!user.email_verified) {
      /* نرسل كود جديد تلقائيًا (بحد أقصى مرة كل ٦٠ ثانية) */
      try {
        const { rows: recent } = await sql`SELECT id FROM email_codes WHERE user_id = ${user.id} AND created_at > now() - interval '60 seconds' LIMIT 1`;
        if (!recent.length) await issueAndSendCode(user.id, user.email);
      } catch (e) { /* تقدر تضغط "أعيدي الإرسال" لاحقًا */ }
      return res.status(403).json({ error: "لازم توثّقي إيميلك أول — تحققي من الكود المرسل لك.", needsVerification: true, username: user.username });
    }
    const [skillRows, missRows, dayRows] = await Promise.all([
      sql`SELECT skill, n, ok FROM skills WHERE user_id = ${user.id}`,
      sql`SELECT * FROM misses WHERE user_id = ${user.id} ORDER BY created_at DESC`,
      sql`SELECT count, track FROM day_log WHERE user_id = ${user.id} ORDER BY log_date ASC`,
    ]);
    const token = signToken({ id: user.id, role: user.role, username: user.username });
    res.status(200).json({ token, profile: toProfile(user, skillRows.rows, missRows.rows, dayRows.rows) });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
