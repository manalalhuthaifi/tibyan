import { col } from "./_lib/db.js";
import { requireRole, fail } from "./_lib/auth.js";

function lastLabel(d) {
  if (!d) return "ما بدأت";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return "اليوم";
  if (days === 1) return "أمس";
  return "قبل " + days + " أيام";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return fail(res, 405, "الطريقة غير مدعومة");
  const me = await requireRole(req, res, ["teacher", "manager"]);
  if (!me) return;

  const users = await col("users");
  const rows = await users.find({ role: "student" })
    .project({ pass: 0 })
    .sort({ name: 1 })
    .toArray();

  res.status(200).json({
    students: rows.map((s) => ({
      id: String(s._id),
      name: s.name, email: s.email || "", cls: s.cls || "—",
      skills: s.skills || {}, misses: s.misses || [],
      done: s.done || 0, todayDone: s.todayDone || 0,
      targetScore: s.targetScore || 90,
      goalPurpose: s.goalPurpose || "الاستعداد للاختبار",
      last: lastLabel(s.lastActive)
    }))
  });
}
