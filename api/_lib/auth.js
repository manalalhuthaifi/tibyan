import jwt from "jsonwebtoken";
import { col } from "./db.js";
import { ObjectId } from "mongodb";

const SECRET = () => process.env.JWT_SECRET || "tibyan-dev-secret";

export function sign(user) {
  return jwt.sign({ uid: String(user._id), role: user.role }, SECRET(), { expiresIn: "30d" });
}

export function readToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/* يُرجع وثيقة المستخدم أو null */
export async function currentUser(req) {
  const t = readToken(req);
  if (!t) return null;
  try {
    const p = jwt.verify(t, SECRET());
    const users = await col("users");
    return await users.findOne({ _id: new ObjectId(p.uid) });
  } catch {
    return null;
  }
}

/* تنظيف الوثيقة قبل إرسالها للواجهة (بدون كلمة المرور) */
export function publicUser(u) {
  if (!u) return null;
  const { pass, ...rest } = u;
  return { ...rest, id: String(u._id), _id: undefined };
}

export function fail(res, code, msg) {
  res.status(code).json({ error: msg });
}

export async function requireRole(req, res, roles) {
  const u = await currentUser(req);
  if (!u) { fail(res, 401, "الجلسة منتهية، سجّلي الدخول من جديد."); return null; }
  if (roles && !roles.includes(u.role)) { fail(res, 403, "لا تملكين صلاحية هذا الإجراء."); return null; }
  return u;
}
