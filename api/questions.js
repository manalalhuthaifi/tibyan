const { sql, ensureSchema } = require("../lib/db");
const { requireAuth } = require("../lib/auth");

function toItem(r) {
  return {
    id: r.id, s: r.section, skill: r.skill, p: r.passage || undefined,
    q: r.question_text, c: r.choices, a: r.correct_idx, e: r.explanation,
    hint: r.hint || undefined, steps: r.steps || undefined, by: r.created_by,
  };
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    if (req.method === "GET") {
      const { rows } = await sql`SELECT * FROM questions ORDER BY created_at DESC`;
      return res.status(200).json({ questions: rows.map(toItem) });
    }
    if (req.method === "DELETE") {
      const u = await requireAuth(req, res, "teacher");
      if (!u) return;
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error: "معرّف غير صحيح." });
      await sql`DELETE FROM questions WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }
    if (req.method === "POST") {
      const u = await requireAuth(req, res, "teacher");
      if (!u) return;
      const b = req.body || {};
      const section = String(b.s || "").trim();
      const skill = String(b.skill || "").trim();
      const text = String(b.q || "").trim();
      const choices = Array.isArray(b.c) ? b.c.map((x) => String(x).slice(0, 500)) : [];
      const ans = Number(b.a);
      const exp = String(b.e || "").trim();
      if (!["verbal", "quant", "saat"].includes(section)) return res.status(400).json({ error: "قسم غير صحيح." });
      if (!skill) return res.status(400).json({ error: "حددي المهارة." });
      if (!text) return res.status(400).json({ error: "اكتبي نص السؤال." });
      if (choices.length !== 4 || choices.some((c) => !c)) return res.status(400).json({ error: "لازم أربعة خيارات كاملة." });
      if (new Set(choices).size < 4) return res.status(400).json({ error: "فيه خيارات متكررة." });
      if (!(ans >= 0 && ans <= 3)) return res.status(400).json({ error: "إجابة غير صحيحة." });
      if (!exp) return res.status(400).json({ error: "الشرح إلزامي." });
      const passage = b.p ? String(b.p).slice(0, 4000) : null;
      const hint = b.hint ? String(b.hint).slice(0, 1000) : null;
      const steps = Array.isArray(b.steps) && b.steps.length ? b.steps.map((s) => String(s).slice(0, 500)) : null;

      const { rows } = await sql`
        INSERT INTO questions (section, skill, passage, question_text, choices, correct_idx, explanation, hint, steps, created_by)
        VALUES (${section}, ${skill}, ${passage}, ${text}, ${JSON.stringify(choices)}, ${ans}, ${exp},
                ${hint}, ${steps ? JSON.stringify(steps) : null}, ${u.username})
        RETURNING *
      `;
      return res.status(200).json({ question: toItem(rows[0]) });
    }
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
