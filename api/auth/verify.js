const { sql, ensureSchema } = require("../../lib/db");
const { signToken } = require("../../lib/auth");
const { toProfile } = require("../../lib/profile");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    await ensureSchema();
    const b = req.body || {};
    const username = String(b.username || "").trim();
    const code = String(b.code || "").trim().replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    if (!username || !/^\d{6}$/.test(code)) return res.status(400).json({ error: "اكتبي الكود المكوّن من ٦ أرقام." });

    const { rows: urows } = await sql`SELECT * FROM users WHERE username = ${username}`;
    const user = urows[0];
    if (!user) return res.status(400).json({ error: "الحساب غير موجود." });
    if (user.email_verified) {
      const token = signToken({ id: user.id, role: user.role, username: user.username });
      return res.status(200).json({ token, profile: toProfile(user, [], [], []) });
    }

    /* نقبل أي كود صالح لم تنته صلاحيته (مو بس الأخير) عشان لو انرسل أكثر من كود ما يتلخبط الحال */
    const { rows: codeRows } = await sql`
      SELECT * FROM email_codes WHERE user_id = ${user.id} AND expires_at > now() ORDER BY created_at DESC LIMIT 5
    `;
    if (!codeRows.length) return res.status(400).json({ error: "ما فيه كود صالح — اطلبي كودًا جديدًا." });
    const latest = codeRows[0];
    if (latest.attempts >= 5) return res.status(400).json({ error: "محاولات كثيرة — اطلبي كودًا جديدًا." });
    if (!codeRows.some((r) => r.code === code)) {
      await sql`UPDATE email_codes SET attempts = attempts + 1 WHERE id = ${latest.id}`;
      return res.status(400).json({ error: "الكود غير صحيح — استخدمي آخر كود وصلك بالإيميل." });
    }

    await sql`UPDATE users SET email_verified = true WHERE id = ${user.id}`;
    await sql`DELETE FROM email_codes WHERE user_id = ${user.id}`;

    const [skillRows, missRows, dayRows] = await Promise.all([
      sql`SELECT skill, n, ok FROM skills WHERE user_id = ${user.id}`,
      sql`SELECT * FROM misses WHERE user_id = ${user.id} ORDER BY created_at DESC`,
      sql`SELECT count, track FROM day_log WHERE user_id = ${user.id} ORDER BY log_date ASC`,
    ]);
    const token = signToken({ id: user.id, role: user.role, username: user.username });
    user.email_verified = true;
    res.status(200).json({ token, profile: toProfile(user, skillRows.rows, missRows.rows, dayRows.rows) });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
