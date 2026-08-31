import { ObjectId } from "mongodb";
import { col } from "./_lib/db.js";
import { currentUser, requireRole, fail } from "./_lib/auth.js";

export default async function handler(req, res) {
  const questions = await col("questions");

  if (req.method === "GET") {
    const u = await currentUser(req);
    if (!u) return fail(res, 401, "الجلسة منتهية، سجّلي الدخول من جديد.");
    const rows = await questions.find({}).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({
      questions: rows.map((q) => ({ ...q, id: String(q._id), _id: undefined }))
    });
  }

  if (req.method === "POST") {
    const me = await requireRole(req, res, ["teacher", "manager"]);
    if (!me) return;
    const b = req.body || {};
    if (!b.q || !Array.isArray(b.c) || b.c.length < 2)
      return fail(res, 400, "اكتبي نص السؤال وخيارين على الأقل.");
    const doc = {
      s: b.s || "verbal", skill: b.skill || "عام", q: b.q,
      c: b.c, a: Number(b.a) || 0, e: b.e || "", hint: b.hint || "",
      steps: Array.isArray(b.steps) ? b.steps : [],
      by: me.name, byId: String(me._id), createdAt: new Date()
    };
    const r = await questions.insertOne(doc);
    return res.status(201).json({ question: { ...doc, id: String(r.insertedId) } });
  }

  if (req.method === "DELETE") {
    const me = await requireRole(req, res, ["teacher", "manager"]);
    if (!me) return;
    const id = req.query.id;
    if (!id) return fail(res, 400, "معرّف السؤال مفقود.");
    await questions.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ ok: true });
  }

  return fail(res, 405, "الطريقة غير مدعومة");
}
