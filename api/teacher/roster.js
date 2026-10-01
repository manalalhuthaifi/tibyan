const { sql, ensureSchema } = require("../../lib/db");
const { requireAuth } = require("../../lib/auth");
const { todayStr, normalizeProgress } = require("../../lib/daily");

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
    const u = await requireAuth(req, res, "teacher");
    if (!u) return;

    const { rows: students } = await sql`
      SELECT id, name, class, done, progress FROM users WHERE role = 'student' ORDER BY created_at ASC
    `;
    if (!students.length) return res.status(200).json({ students: [] });

    const ids = students.map((s) => s.id);
    const [skillRows, whyRows] = await Promise.all([
      sql`SELECT user_id, skill, n, ok FROM skills WHERE user_id = ANY(${ids})`,
      sql`SELECT user_id, why, count(*)::int AS c FROM misses WHERE user_id = ANY(${ids}) AND why IS NOT NULL GROUP BY user_id, why`,
    ]);

    const today = todayStr();
    const out = students.map((s) => {
      const skills = {};
      skillRows.rows.filter((r) => r.user_id === s.id).forEach((r) => { skills[r.skill] = { n: r.n, ok: r.ok }; });
      const why = {};
      whyRows.rows.filter((r) => r.user_id === s.id).forEach((r) => { why[r.why] = r.c; });
      const progress = normalizeProgress(s.progress);
      const lastToday = progress.qudrat.lastLogDay === today || progress.tahsili.lastLogDay === today;
      return {
        name: s.name, cls: s.class || "—", skills, why,
        todayDone: progress.qudrat.todayDone + progress.tahsili.todayDone,
        last: s.done ? (lastToday ? "اليوم" : "قبل ذلك") : "ما بدأت",
      };
    });
    res.status(200).json({ students: out });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
