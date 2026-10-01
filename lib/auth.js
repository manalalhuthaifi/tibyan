const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET غير معرّف في متغيرات البيئة");
  return s;
}

function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}
function checkPassword(pw, hash) {
  return bcrypt.compareSync(pw, hash);
}
function signToken(payload) {
  return jwt.sign(payload, secret(), { expiresIn: "180d" });
}
/* يرجّع payload التوكن، أو null لو ماكو توكن صالح — ما يرمي استثناء */
function readUser(req) {
  const h = req.headers.authorization || "";
  const m = /^Bearer (.+)$/.exec(h);
  if (!m) return null;
  try {
    return jwt.verify(m[1], secret());
  } catch (e) {
    return null;
  }
}
async function requireAuth(req, res, role) {
  const u = readUser(req);
  if (!u) {
    res.status(401).json({ error: "لازم تسجّلي الدخول." });
    return null;
  }
  /* المديرة (principal) لها كل صلاحيات المعلمة، وزيادة إدارة حسابات المعلمات */
  const allowed = role === "teacher" ? u.role === "teacher" || u.role === "principal" : u.role === role;
  if (role && !allowed) {
    res.status(403).json({ error: "ما عندك صلاحية لهذا الإجراء." });
    return null;
  }
  /* الحساب المحذوف يفقد صلاحية الطلبات حتى لو بقي توكنه صالحًا. */
  if (u.role === "teacher" || u.role === "student") {
    const { sql } = require("./db");
    const { rows } = await sql`SELECT id FROM users WHERE id = ${u.id} AND role = ${u.role}`;
    if (!rows.length) {
      res.status(401).json({ error: "لازم تسجّلي الدخول." });
      return null;
    }
  }
  return u;
}

module.exports = { hashPassword, checkPassword, signToken, readUser, requireAuth };
