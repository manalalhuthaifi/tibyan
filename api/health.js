import { getDb } from "./_lib/db.js";

export default async function handler(req, res) {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.status(200).json({ ok: true, db: db.databaseName });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
}
