import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

const g = globalThis;
export const sql = g.__sql ?? (g.__sql = postgres(process.env.DATABASE_URL, { max: 10, onnotice: () => {} }));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS teachers(
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS wishes(
  id bigserial PRIMARY KEY,
  student_email text NOT NULL,
  teacher_id int REFERENCES teachers(id),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  status text NOT NULL CHECK (status IN ('pending','approved','rejected','hidden')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz
);
-- Ràng buộc cốt lõi: 1 lời chúc chung / sinh viên, 1 lời chúc riêng / (sinh viên, thầy cô). Lời bị từ chối không tính.
CREATE UNIQUE INDEX IF NOT EXISTS wishes_one_general ON wishes(student_email) WHERE teacher_id IS NULL AND status <> 'rejected';
CREATE UNIQUE INDEX IF NOT EXISTS wishes_one_per_teacher ON wishes(student_email, teacher_id) WHERE teacher_id IS NOT NULL AND status <> 'rejected';
CREATE INDEX IF NOT EXISTS wishes_status_idx ON wishes(status, created_at);
CREATE INDEX IF NOT EXISTS wishes_email_idx ON wishes(student_email, created_at);
`;

async function init() {
  await sql.unsafe(SCHEMA);
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM teachers`;
  if (n === 0) {
    const file = path.join(process.cwd(), "data", "teachers.txt");
    if (fs.existsSync(file)) {
      const names = fs.readFileSync(file, "utf8").split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
      if (names.length) await sql`INSERT INTO teachers ${sql(names.map((name) => ({ name })))} ON CONFLICT (name) DO NOTHING`;
    }
  }
}

/** Gọi trước mọi truy vấn: tạo bảng + nạp danh sách thầy cô lần đầu. */
export function db() {
  g.__dbReady ??= init().catch((e) => { g.__dbReady = null; throw e; });
  return g.__dbReady;
}
