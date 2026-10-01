const { sql } = require("@vercel/postgres");

let ready = null;

/* ينشئ الجداول أول مرة فقط — آمن يتكرر (IF NOT EXISTS) */
async function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      name TEXT NOT NULL,
      class TEXT DEFAULT '',
      email TEXT DEFAULT '',
      email_verified BOOLEAN NOT NULL DEFAULT false,
      exam_date DATE,
      agreed BOOLEAN NOT NULL DEFAULT false,
      placed BOOLEAN NOT NULL DEFAULT false,
      done INT NOT NULL DEFAULT 0,
      progress JSONB NOT NULL DEFAULT '{"qudrat":{"todayDone":0,"streak":0,"goalHit":false,"lastLogDay":null},"tahsili":{"todayDone":0,"streak":0,"goalHit":false,"lastLogDay":null}}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    /* لتوافق قواعد بيانات أُنشئت بنسخة سابقة من الكود قبل إضافة الأقسام المنفصلة */
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT '{"qudrat":{"todayDone":0,"streak":0,"goalHit":false,"lastLogDay":null},"tahsili":{"todayDone":0,"streak":0,"goalHit":false,"lastLogDay":null}}'::jsonb`;

    await sql`CREATE TABLE IF NOT EXISTS skills (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill TEXT NOT NULL,
      track TEXT NOT NULL DEFAULT 'qudrat',
      n INT NOT NULL DEFAULT 0,
      ok INT NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, skill)
    )`;
    await sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'qudrat'`;

    await sql`CREATE TABLE IF NOT EXISTS misses (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill TEXT,
      question_text TEXT,
      choices JSONB,
      correct_idx INT,
      picked_idx INT,
      why TEXT,
      explanation TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS day_log (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      track TEXT NOT NULL DEFAULT 'qudrat',
      count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, log_date, track)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS email_codes (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS site_settings (
      id INT PRIMARY KEY DEFAULT 1,
      accent TEXT,
      principal_name TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`INSERT INTO site_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
    await sql`ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS principal_name TEXT`;

    await sql`CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      section TEXT NOT NULL,
      skill TEXT NOT NULL,
      passage TEXT,
      question_text TEXT NOT NULL,
      choices JSONB NOT NULL,
      correct_idx INT NOT NULL,
      explanation TEXT NOT NULL,
      hint TEXT,
      steps JSONB,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS channels (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT,
      area TEXT,
      url TEXT,
      why TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
  })();
  return ready;
}

module.exports = { sql, ensureSchema };
