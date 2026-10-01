const { sql, ensureSchema } = require("../../lib/db");
const { requireAuth, hashPassword } = require("../../lib/auth");

/* إدارة حسابات المعلمات — للمديرة فقط.
   GET  → قائمة المعلمات | DELETE/PATCH ?id=N → حذف معلمة / تغيير كلمة مرورها
   POST → { username, password, name } ينشئ حساب معلمة (جاهز للدخول مباشرة، بدون توثيق إيميل) */
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const u = await requireAuth(req, res, "principal");
    if (!u) return;

    const id = req.query && req.query.id !== undefined ? Number(req.query.id) : null;
    if (id !== null && (req.method === "DELETE" || req.method === "PATCH")) {
      if (!Number.isInteger(id)) return res.status(400).json({ error: "معرّف غير صحيح." });
      const { rows: found } = await sql`SELECT id FROM users WHERE id = ${id} AND role = 'teacher'`;
      if (!found.length) return res.status(404).json({ error: "المعلمة غير موجودة." });
      if (req.method === "DELETE") {
        await sql`DELETE FROM users WHERE id = ${id}`;
        return res.status(200).json({ ok: true });
      }
      const newPass = String((req.body || {}).password || "");
      if (newPass.length < 6) return res.status(400).json({ error: "كلمة المرور ٦ خانات على الأقل." });
      await sql`UPDATE users SET password_hash = ${hashPassword(newPass)} WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    if (req.method === "GET") {
      const { rows } = await sql`SELECT id, username, name, created_at FROM users WHERE role = 'teacher' ORDER BY created_at ASC`;
      return res.status(200).json({ teachers: rows });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      const username = String(b.username || "").trim();
      const password = String(b.password || "");
      const name = String(b.name || "").trim();
      if (!name) return res.status(400).json({ error: "اكتبي اسم المعلمة." });
      if (username.length < 3 || /\s/.test(username)) return res.status(400).json({ error: "اسم المستخدم ٣ خانات فأكثر وبدون مسافات." });
      if (password.length < 6) return res.status(400).json({ error: "كلمة المرور ٦ خانات على الأقل." });
      if (username.toLowerCase() === String(process.env.ADMIN_USER || "").toLowerCase()) {
        return res.status(400).json({ error: "اسم المستخدم محجوز، اختاري غيره." });
      }
      const dupe = await sql`SELECT id FROM users WHERE username = ${username}`;
      if (dupe.rows.length) return res.status(400).json({ error: "اسم المستخدم مستخدم لحساب آخر." });

      const { rows } = await sql`
        INSERT INTO users (username, password_hash, role, name, class, email, email_verified, agreed, placed)
        VALUES (${username}, ${hashPassword(password)}, 'teacher', ${name}, '', '', true, true, true)
        RETURNING id, username, name, created_at
      `;
      return res.status(200).json({ teacher: rows[0] });
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
