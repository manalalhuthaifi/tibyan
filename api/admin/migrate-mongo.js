const { MongoClient } = require("mongodb");
const { sql, ensureSchema } = require("../../lib/db");

/* نقل لمرة واحدة لحسابات الطالبات الحقيقية من MongoDB القديمة إلى Postgres الجديدة.
   محمي بمفتاح سري مؤقت — يُحذف هذا الملف بعد الانتهاء من النقل. */
module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const secret = req.headers["x-migrate-secret"];
  if (!secret || secret !== process.env.MIGRATE_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) return res.status(500).json({ error: "MONGODB_URI not set" });

  await ensureSchema();
  const client = new MongoClient(uri, { maxPoolSize: 5 });
  const result = { total: 0, migrated: 0, skippedExisting: 0, errors: [] };
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || "tibyan");
    const docs = await db.collection("users").find({}).toArray();
    result.total = docs.length;

    for (const doc of docs) {
      try {
        const examDate = doc.examDate ? new Date(doc.examDate).toISOString().slice(0, 10) : null;
        const lastLogDay = doc.lastActive ? new Date(doc.lastActive).toISOString().slice(0, 10) : null;
        const progress = {
          qudrat: {
            todayDone: doc.todayDone || 0,
            streak: doc.streak || 0,
            goalHit: !!doc.goalHit,
            lastLogDay,
          },
          tahsili: { todayDone: 0, streak: 0, goalHit: false, lastLogDay: null },
        };

        const { rows } = await sql`
          INSERT INTO users (username, password_hash, role, name, class, email, email_verified, exam_date, agreed, placed, done, progress)
          VALUES (${doc.u}, ${doc.pass}, 'student', ${doc.name || ""}, ${doc.cls || ""}, ${doc.email || ""}, true, ${examDate}, ${!!doc.agreed}, ${!!doc.placed}, ${doc.done || 0}, ${JSON.stringify(progress)}::jsonb)
          ON CONFLICT (username) DO NOTHING
          RETURNING id
        `;

        if (!rows[0]) {
          result.skippedExisting++;
          continue;
        }
        const userId = rows[0].id;
        const skills = doc.skills || {};
        for (const skill of Object.keys(skills)) {
          const s = skills[skill] || {};
          await sql`
            INSERT INTO skills (user_id, skill, track, n, ok)
            VALUES (${userId}, ${skill}, 'qudrat', ${s.n || 0}, ${s.ok || 0})
            ON CONFLICT (user_id, skill) DO NOTHING
          `;
        }
        result.migrated++;
      } catch (e) {
        result.errors.push({ u: doc.u, error: e.message });
      }
    }
  } finally {
    await client.close();
  }
  res.status(200).json(result);
};
