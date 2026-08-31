import bcrypt from "bcryptjs";
import { col } from "../_lib/db.js";
import { sign, publicUser, fail } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "الطريقة غير مدعومة");
  const { u, pass } = req.body || {};
  if (!u || !pass) return fail(res, 400, "اكتبي اسم المستخدم وكلمة المرور.");

  const users = await col("users");
  const user = await users.findOne({ u });
  if (!user || !(await bcrypt.compare(String(pass), user.pass || "")))
    return fail(res, 401, "اسم المستخدم أو كلمة المرور غير صحيحة.");

  await users.updateOne({ _id: user._id }, { $set: { lastActive: new Date() } });
  user.lastActive = new Date();
  res.status(200).json({ token: sign(user), user: publicUser(user) });
}
