import { col } from "./_lib/db.js";
import { currentUser, publicUser, fail } from "./_lib/auth.js";

/* الحقول التي يُسمح للواجهة بحفظها */
const FIELDS = ["skills","misses","done","todayDone","examDate","agreed","placed",
                "dayLog","streak","goalHit","targetScore","goalPurpose","name","cls"];

export default async function handler(req, res) {
  const u = await currentUser(req);
  if (!u) return fail(res, 401, "الجلسة منتهية، سجّلي الدخول من جديد.");

  if (req.method === "GET") return res.status(200).json({ user: publicUser(u) });

  if (req.method === "PUT") {
    const body = req.body || {};
    const set = { lastActive: new Date() };
    for (const k of FIELDS) if (k in body) set[k] = body[k];
    if (set.examDate) set.examDate = new Date(set.examDate).getTime();
    const users = await col("users");
    await users.updateOne({ _id: u._id }, { $set: set });
    return res.status(200).json({ ok: true });
  }

  return fail(res, 405, "الطريقة غير مدعومة");
}
