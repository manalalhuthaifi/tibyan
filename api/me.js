const { sql, ensureSchema } = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { toProfile } = require("../lib/profile");
const { todayStr, normalizeProgress } = require("../lib/daily");

/* لو تغيّر اليوم التقويمي عن آخر نشاط بأي قسم، نصفّر عدّاد اليوم وهدفه لذاك القسم فقط */
async function resetIfNewDay(userId, progress) {
  const today = todayStr();
  let changed = false;
  ["qudrat", "tahsili"].forEach((t) => {
    if (progress[t].lastLogDay !== today) {
      progress[t].todayDone = 0;
      progress[t].goalHit = false;
      progress[t].lastLogDay = today;
      changed = true;
    }
  });
  if (changed) await sql`UPDATE users SET progress = ${JSON.stringify(progress)}::jsonb WHERE id = ${userId}`;
  return progress;
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const u = await requireAuth(req, res);
    if (!u) return;
    if (u.role === "principal") {
      const { rows: srows } = await sql`SELECT principal_name FROM site_settings WHERE id = 1`;
      const pname = (srows[0] && srows[0].principal_name) || "المديرة";
      return res.status(200).json({
        profile: toProfile(
          { role: "principal", name: pname, class: "", email: "", exam_date: null, agreed: true, placed: true, done: 0, progress: null },
          [], [], []
        ),
      });
    }
    if (u.role === "teacher") {
      if (req.method === "PATCH") {
        const b = req.body || {};
        if (b.name !== undefined) {
          const name = String(b.name || "").trim().slice(0, 80);
          if (!name) return res.status(400).json({ error: "اكتبي اسمًا." });
          await sql`UPDATE users SET name = ${name} WHERE id = ${u.id} AND role = 'teacher'`;
        }
      }
      const { rows: trows } = await sql`SELECT name FROM users WHERE id = ${u.id} AND role = 'teacher'`;
      if (!trows[0]) return res.status(404).json({ error: "الحساب غير موجود." });
      return res.status(200).json({
        profile: toProfile(
          { role: "teacher", name: trows[0].name, class: "", email: "", exam_date: null, agreed: true, placed: true, done: 0, progress: null },
          [], [], []
        ),
      });
    }

    if (req.method === "GET") {
      const { rows } = await sql`SELECT * FROM users WHERE id = ${u.id}`;
      const user = rows[0];
      if (!user) return res.status(404).json({ error: "الحساب غير موجود." });
      user.progress = await resetIfNewDay(u.id, normalizeProgress(user.progress));
      const [skillRows, missRows, dayRows] = await Promise.all([
        sql`SELECT skill, n, ok FROM skills WHERE user_id = ${u.id}`,
        sql`SELECT * FROM misses WHERE user_id = ${u.id} ORDER BY created_at DESC`,
        sql`SELECT count, track FROM day_log WHERE user_id = ${u.id} ORDER BY log_date ASC`,
      ]);
      return res.status(200).json({ profile: toProfile(user, skillRows.rows, missRows.rows, dayRows.rows) });
    }

    if (req.method === "PATCH") {
      const b = req.body || {};
      if (b.agreed !== undefined) await sql`UPDATE users SET agreed = ${!!b.agreed} WHERE id = ${u.id}`;
      if (b.placed !== undefined) await sql`UPDATE users SET placed = ${!!b.placed} WHERE id = ${u.id}`;
      if (b.examDate !== undefined) await sql`UPDATE users SET exam_date = ${b.examDate || null} WHERE id = ${u.id}`;
      const { rows } = await sql`SELECT * FROM users WHERE id = ${u.id}`;
      const [skillRows, missRows, dayRows] = await Promise.all([
        sql`SELECT skill, n, ok FROM skills WHERE user_id = ${u.id}`,
        sql`SELECT * FROM misses WHERE user_id = ${u.id} ORDER BY created_at DESC`,
        sql`SELECT count, track FROM day_log WHERE user_id = ${u.id} ORDER BY log_date ASC`,
      ]);
      return res.status(200).json({ profile: toProfile(rows[0], skillRows.rows, missRows.rows, dayRows.rows) });
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
