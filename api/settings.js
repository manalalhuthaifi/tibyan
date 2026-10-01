const { sql, ensureSchema } = require("../lib/db");
const { requireAuth } = require("../lib/auth");

/* إعدادات عامة للموقع (لون التمييز، واسم المديرة المعروض) — عامة للقراءة، وللمديرة فقط للتعديل */
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    if (req.method === "GET") {
      const { rows } = await sql`SELECT accent, principal_name FROM site_settings WHERE id = 1`;
      const row = rows[0] || {};
      return res.status(200).json({ accent: row.accent || null, principalName: row.principal_name || null });
    }
    if (req.method === "PATCH") {
      const u = await requireAuth(req, res, "principal");
      if (!u) return;
      const b = req.body || {};

      if (b.accent !== undefined) {
        const accent = b.accent === null ? null : String(b.accent || "").trim();
        if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
          return res.status(400).json({ error: "صيغة اللون غير صحيحة." });
        }
        await sql`UPDATE site_settings SET accent = ${accent}, updated_at = now() WHERE id = 1`;
      }
      if (b.principalName !== undefined) {
        const name = b.principalName === null ? null : String(b.principalName || "").trim().slice(0, 80);
        if (name !== null && !name) return res.status(400).json({ error: "اكتبي اسمًا." });
        await sql`UPDATE site_settings SET principal_name = ${name}, updated_at = now() WHERE id = 1`;
      }

      const { rows } = await sql`SELECT accent, principal_name FROM site_settings WHERE id = 1`;
      const row = rows[0] || {};
      return res.status(200).json({ accent: row.accent || null, principalName: row.principal_name || null });
    }
    res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "خطأ بالخادم: " + e.message });
  }
};
