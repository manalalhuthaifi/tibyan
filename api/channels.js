import { ObjectId } from "mongodb";
import { col } from "./_lib/db.js";
import { currentUser, requireRole, fail } from "./_lib/auth.js";

export default async function handler(req, res) {
  const channels = await col("channels");

  if (req.method === "GET") {
    const u = await currentUser(req);
    if (!u) return fail(res, 401, "الجلسة منتهية، سجّلي الدخول من جديد.");
    const rows = await channels.find({}).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({
      channels: rows.map((c) => ({ ...c, id: String(c._id), _id: undefined }))
    });
  }

  if (req.method === "POST") {
    const me = await requireRole(req, res, ["teacher", "manager"]);
    if (!me) return;
    const b = req.body || {};
    if (!b.name || !b.why) return fail(res, 400, "اكتبي اسم القناة وسبب التوصية بها.");
    const doc = {
      name: b.name, area: b.area || "عام", plat: b.plat || "يوتيوب",
      why: b.why, url: b.url || "", by: me.name, createdAt: new Date()
    };
    const r = await channels.insertOne(doc);
    return res.status(201).json({ channel: { ...doc, id: String(r.insertedId) } });
  }

  if (req.method === "DELETE") {
    const me = await requireRole(req, res, ["teacher", "manager"]);
    if (!me) return;
    const id = req.query.id;
    if (!id) return fail(res, 400, "معرّف القناة مفقود.");
    await channels.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ ok: true });
  }

  return fail(res, 405, "الطريقة غير مدعومة");
}
