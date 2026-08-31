import bcrypt from "bcryptjs";
import { col, getDb } from "./_lib/db.js";
import { fail } from "./_lib/auth.js";

/* تهيئة أولية: حسابا المعلمة والمديرة + الفهارس. تُشغَّل مرة واحدة.
   POST /api/seed  مع  { "secret": "<SEED_SECRET>" }                       */
export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "الطريقة غير مدعومة");
  const secret = (req.body && req.body.secret) || req.query.secret;
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET)
    return fail(res, 403, "مفتاح التهيئة غير صحيح.");

  const db = await getDb();
  const users = await col("users");

  await users.createIndex({ u: 1 }, { unique: true });
  await users.createIndex({ role: 1 });
  await (await col("questions")).createIndex({ createdAt: -1 });
  await (await col("channels")).createIndex({ createdAt: -1 });

  const staff = [
    { u: process.env.TEACHER_USER || "areej",   pass: process.env.TEACHER_PASS || "admin",
      role: "teacher", name: process.env.TEACHER_NAME || "أ. أريج" },
    { u: process.env.MANAGER_USER || "manager", pass: process.env.MANAGER_PASS || "admin",
      role: "manager", name: process.env.MANAGER_NAME || "أ. عفاف" }
  ];

  const made = [];
  for (const s of staff) {
    const exists = await users.findOne({ u: s.u });
    if (exists) continue;
    await users.insertOne({
      u: s.u, pass: await bcrypt.hash(s.pass, 10), role: s.role, name: s.name,
      cls: "", email: "", skills: {}, misses: [], done: 0, todayDone: 0,
      examDate: null, agreed: true, placed: true, dayLog: [], streak: 0,
      goalHit: false, targetScore: 90, goalPurpose: "متابعة الطالبات",
      createdAt: new Date(), lastActive: null
    });
    made.push(s.u);
  }

  res.status(200).json({ ok: true, db: db.databaseName, created: made });
}
