import { MongoClient } from "mongodb";

/* اتصال واحد مُعاد استخدامه بين استدعاءات الدوال (مهم في بيئة Vercel) */
const g = globalThis;
g.__tibyan = g.__tibyan || { promise: null, db: null };

export async function getDb() {
  if (g.__tibyan.db) return g.__tibyan.db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI غير مضبوط في متغيّرات البيئة");
  if (!g.__tibyan.promise) {
    g.__tibyan.promise = new MongoClient(uri, { maxPoolSize: 5 })
      .connect()
      .then((c) => c.db(process.env.MONGODB_DB || "tibyan"));
  }
  g.__tibyan.db = await g.__tibyan.promise;
  return g.__tibyan.db;
}

export const col = async (name) => (await getDb()).collection(name);
