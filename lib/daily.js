function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}
function dailyTarget(level) {
  return level < 60 ? 20 : level < 80 ? 15 : 10;
}
function levelFromSkills(skillRows) {
  let n = 0, ok = 0;
  skillRows.forEach((s) => { n += s.n; ok += s.ok; });
  return n ? Math.round((ok / n) * 100) : 0;
}

/* كل قسم (قدرات/تحصيلي) له تقدّمه الخاص — هدف اليوم وسلسلته مستقلّان تمامًا عن القسم الآخر */
function defaultProgress() {
  return {
    qudrat: { todayDone: 0, streak: 0, goalHit: false, lastLogDay: null },
    tahsili: { todayDone: 0, streak: 0, goalHit: false, lastLogDay: null },
  };
}
function normalizeProgress(p) {
  const d = defaultProgress();
  if (!p) return d;
  return {
    qudrat: Object.assign({}, d.qudrat, p.qudrat || {}),
    tahsili: Object.assign({}, d.tahsili, p.tahsili || {}),
  };
}

module.exports = { todayStr, dailyTarget, levelFromSkills, defaultProgress, normalizeProgress };
