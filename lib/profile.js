const { normalizeProgress } = require("./daily");

function toProfile(u, skillRows, missRows, dayRows) {
  const skills = {};
  skillRows.forEach((s) => { skills[s.skill] = { n: s.n, ok: s.ok }; });
  const misses = missRows.map((m) => ({
    q: { skill: m.skill, q: m.question_text, c: m.choices, a: m.correct_idx, e: m.explanation },
    picked: m.picked_idx,
    why: m.why,
  }));
  const progress = normalizeProgress(u.progress);
  progress.qudrat.dayLog = dayRows.filter((d) => (d.track || "qudrat") === "qudrat").map((d) => d.count);
  progress.tahsili.dayLog = dayRows.filter((d) => d.track === "tahsili").map((d) => d.count);
  return {
    role: u.role === "principal" ? "teacher" : u.role,
    principal: u.role === "principal",
    name: u.name,
    cls: u.class,
    email: u.email,
    emailVerified: !!u.email_verified,
    examDate: u.exam_date,
    agreed: u.agreed,
    placed: u.placed,
    done: u.done,
    skills,
    misses,
    progress,
  };
}

module.exports = { toProfile };
