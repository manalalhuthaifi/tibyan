const { sql, ensureSchema } = require("../lib/db");
const { requireAuth } = require("../lib/auth");

function toItem(r) {
  return { id: r.id, name: r.name, plat: r.platform, area: r.area, url: r.url || "", why: r.why };
}

module.exports = async (req, res) => {
  if (req.query.__r === "laws") return require("../lib/routes/laws")(req, res);
  try {
    await ensureSchema();
    if (req.method === "GET") {
      const { rows } = await sql`SELECT * FROM channels ORDER BY created_at DESC`;
      return res.status(200).json({ channels: rows.map(toItem) });
    }
    if (req.method === "DELETE") {
      const u = await requireAuth(req, res, "teacher");
      if (!u) return;
      const id = Number(req.query.id);
      if (!id) return res.status(400).json({ error: "معرّف غير صحيح." });
      await sql`DELETE FROM channels WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }
    if (req.method === "POST") {
      const u = await requireAuth(req, res, "teacher");
      if (!u) return;
      const b = req.body || {};
      const name = String(b.name || "").trim();
      const why = String(b.why || "").trim();
      const url = String(b.url || "").trim();
      const plat = String(b.plat || "").slice(0, 40);
      const area = String(b.area || "").slice(0, 40);
      if (!name || !why) return res.status(400).json({ error: "لازم اسم القناة وسبب الترشيح." });
      if (url && !/^https?:\/\//.test(url)) return res.status(400).json({ error: "الرابط لازم يبدأ بـ https://" });
      const { rows } = await sql`
        INSERT INTO channels (name, platform, area, url, why, created_by)
        VALUES (${name}, ${plat}, ${area}, ${url || null}, ${why}, ${u.username})
        RETURNING *
      `;
      return res.status(200).json({ channel: toItem(rows[0]) });
    }
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
