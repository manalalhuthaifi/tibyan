const { sql, ensureSchema } = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { toProfile } = require("../lib/profile");
const { todayStr, dailyTarget, levelFromSkills, normalizeProgress } = require("../lib/daily");

const TRACKS = ["qudrat", "tahsili"];

/* تسجّل جلسة تدريب/تحديد مستوى/اختبار تجريبي كاملة دفعة وحدة. كل قسم (قدرات/تحصيلي)
   يُحدَّث بشكل مستقل تمامًا: هدف اليوم، السلسلة، وخطة الأسبوع.
   body: { mode: "train"|"place"|"mock", log: [{ skill, ok, picked, why, track, q:{skill,q,c,a,e} }] } */
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  try {
    await ensureSchema();
    const u = await requireAuth(req, res, "student");
    if (!u) return;
    const b = req.body || {};
    const mode = b.mode === "place" || b.mode === "mock" ? b.mode : "train";
    const log = Array.isArray(b.log) ? b.log.slice(0, 100) : [];
    if (!log.length) return res.status(400).json({ error: "لا توجد إجابات لتسجيلها." });

    const { rows: urows } = await sql`SELECT * FROM users WHERE id = ${u.id}`;
    const user = urows[0];
    if (!user) return res.status(404).json({ error: "الحساب غير موجود." });

    const today = todayStr();
    const progress = normalizeProgress(user.progress);
    const byTrack = { qudrat: 0, tahsili: 0 };

    for (const item of log) {
      const skill = String(item.skill || "").slice(0, 120);
      const ok = !!item.ok;
      const track = item.track === "tahsili" ? "tahsili" : "qudrat";
      byTrack[track]++;
      if (skill) {
        await sql`
          INSERT INTO skills (user_id, skill, track, n, ok) VALUES (${u.id}, ${skill}, ${track}, 1, ${ok ? 1 : 0})
          ON CONFLICT (user_id, skill) DO UPDATE SET n = skills.n + 1, ok = skills.ok + ${ok ? 1 : 0}
        `;
      }
      if (!ok && item.q) {
        const picked = item.picked === null || item.picked === undefined ? null : Number(item.picked);
        await sql`
          INSERT INTO misses (user_id, skill, question_text, choices, correct_idx, picked_idx, why, explanation)
          VALUES (${u.id}, ${skill}, ${String(item.q.q || "").slice(0, 2000)}, ${JSON.stringify(item.q.c || [])},
                  ${Number(item.q.a) || 0}, ${picked}, ${item.why ? String(item.why).slice(0, 200) : null},
                  ${String(item.q.e || "").slice(0, 4000)})
        `;
      }
    }

    TRACKS.forEach((t) => {
      if (progress[t].lastLogDay !== today) { progress[t].todayDone = 0; progress[t].goalHit = false; }
    });
    progress.qudrat.todayDone += byTrack.qudrat;
    progress.tahsili.todayDone += byTrack.tahsili;
    if (byTrack.qudrat > 0) progress.qudrat.lastLogDay = today;
    if (byTrack.tahsili > 0) progress.tahsili.lastLogDay = today;

    if (mode === "train") {
      for (const t of TRACKS) {
        if (byTrack[t] > 0) {
          await sql`
            INSERT INTO day_log (user_id, log_date, track, count) VALUES (${u.id}, ${today}, ${t}, ${byTrack[t]})
            ON CONFLICT (user_id, log_date, track) DO UPDATE SET count = day_log.count + ${byTrack[t]}
          `;
        }
      }
    }
    if (mode === "place") {
      await sql`UPDATE users SET placed = true WHERE id = ${u.id}`;
    }

    const { rows: skillRows } = await sql`SELECT skill, track, n, ok FROM skills WHERE user_id = ${u.id}`;
    TRACKS.forEach((t) => {
      const trackSkillRows = skillRows.filter((r) => r.track === t);
      const level = levelFromSkills(trackSkillRows);
      const target = dailyTarget(level);
      if (progress[t].todayDone >= target && !progress[t].goalHit) {
        progress[t].goalHit = true;
        progress[t].streak += 1;
      }
    });

    await sql`
      UPDATE users SET done = done + ${log.length}, progress = ${JSON.stringify(progress)}::jsonb
      WHERE id = ${u.id}
    `;

    const { rows: urows2 } = await sql`SELECT * FROM users WHERE id = ${u.id}`;
    const [missRows, dayRows] = await Promise.all([
      sql`SELECT * FROM misses WHERE user_id = ${u.id} ORDER BY created_at DESC`,
      sql`SELECT count, track FROM day_log WHERE user_id = ${u.id} ORDER BY log_date ASC`,
    ]);
    res.status(200).json({ profile: toProfile(urows2[0], skillRows, missRows.rows, dayRows.rows) });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
