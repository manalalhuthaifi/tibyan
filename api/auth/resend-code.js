const { sql, ensureSchema } = require("../../lib/db");
const { issueAndSendCode } = require("../../lib/email");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    await ensureSchema();
    const b = req.body || {};
    const username = String(b.username || "").trim();
    if (!username) return res.status(400).json({ error: "اسم مستخدم مفقود." });

    const { rows } = await sql`SELECT id, email, email_verified FROM users WHERE username = ${username}`;
    const user = rows[0];
    if (!user) return res.status(400).json({ error: "الحساب غير موجود." });
    if (user.email_verified) return res.status(400).json({ error: "الإيميل موثّق أصلًا." });

    /* لا نرسل أكثر من كود كل ٦٠ ثانية لنفس الحساب — حماية بسيطة من إساءة الاستخدام */
    const { rows: recent } = await sql`
      SELECT id FROM email_codes WHERE user_id = ${user.id} AND created_at > now() - interval '60 seconds' LIMIT 1
    `;
    if (recent.length) return res.status(429).json({ error: "انتظري دقيقة قبل ما تطلبين كودًا جديدًا." });

    await issueAndSendCode(user.id, user.email);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
