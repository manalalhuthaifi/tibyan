import { col } from "./_lib/db.js";
import { requireRole, fail } from "./_lib/auth.js";

/* سجل "تم التواصل" مع الطالبات — وثيقة واحدة مشتركة بين المعلمات والمديرة */
const KEY = { _id: "contacted" };

export default async function handler(req, res) {
  const me = await requireRole(req, res, ["teacher", "manager"]);
  if (!me) return;
  const contacts = await col("contacts");

  if (req.method === "GET") {
    const doc = await contacts.findOne(KEY);
    return res.status(200).json({ contacted: (doc && doc.map) || {} });
  }

  if (req.method === "PUT") {
    const b = req.body || {};
    if (!b.name) return fail(res, 400, "اسم الطالبة مفقود.");
    const set = {};
    set["map." + b.name] = b.at || new Date().toISOString();
    await contacts.updateOne(KEY, { $set: set }, { upsert: true });
    const doc = await contacts.findOne(KEY);
    return res.status(200).json({ contacted: (doc && doc.map) || {} });
  }

  return fail(res, 405, "الطريقة غير مدعومة");
}
