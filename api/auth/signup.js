import bcrypt from "bcryptjs";
import { col } from "../_lib/db.js";
import { sign, publicUser, fail } from "../_lib/auth.js";

const RESERVED = ["admin", "root", "system"];

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "الطريقة غير مدعومة");
  const { u, pass, name, cls, email } = req.body || {};

  if (!u || !pass) return fail(res, 400, "اكتبي اسم المستخدم وكلمة المرور.");
  if (String(u).length < 3 || /\s/.test(u)) return fail(res, 400, "اسم المستخدم ٣ خانات فأكثر وبدون مسافات.");
  if (String(pass).length < 6) return fail(res, 400, "كلمة المرور ٦ خانات على الأقل.");
  if (!name) return fail(res, 400, "اكتبي اسمكِ الكامل.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, "اكتبي إيميل الطالبة بشكل صحيح.");
  if (RESERVED.includes(String(u).toLowerCase())) return fail(res, 400, "اسم المستخدم محجوز، اختاري غيره.");

  const users = await col("users");
  if (await users.findOne({ u })) return fail(res, 409, "اسم المستخدم محجوز، اختاري غيره.");

  const doc = {
    u, pass: await bcrypt.hash(String(pass), 10),
    role: "student", name, cls: cls || "", email,
    skills: {}, misses: [], done: 0, todayDone: 0,
    examDate: null, agreed: false, placed: false,
    dayLog: [], streak: 0, goalHit: false,
    targetScore: 90, goalPurpose: "الاستعداد للاختبار",
    createdAt: new Date(), lastActive: null
  };
  const r = await users.insertOne(doc);
  doc._id = r.insertedId;
  res.status(201).json({ token: sign(doc), user: publicUser(doc) });
}
