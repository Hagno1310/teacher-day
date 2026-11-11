import { sql, db } from "@/lib/db";
import { studentEmail } from "@/lib/auth";
import { submitWish } from "@/lib/wishes";

export const dynamic = "force-dynamic";

// Công khai: chỉ lời chúc đã duyệt, KHÔNG trả về người gửi.
export async function GET(req) {
  await db();
  const t = Number(new URL(req.url).searchParams.get("teacher")) || null;
  const rows = await sql`
    SELECT w.id, w.content AS text, w.teacher_id AS "teacherId", t.name AS "teacherName", w.created_at AS "createdAt"
    FROM wishes w LEFT JOIN teachers t ON t.id = w.teacher_id
    WHERE w.status = 'approved' ${t ? sql`AND (w.teacher_id = ${t} OR w.teacher_id IS NULL)` : sql``}
    ORDER BY w.created_at DESC LIMIT 3000`;
  return Response.json(rows);
}

export async function POST(req) {
  const email = await studentEmail();
  if (!email) return Response.json({ error: "Bạn cần đăng nhập bằng tài khoản SLINK PTIT." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { code, ...rest } = await submitWish(email, body.text, body.teacherId ?? null);
  return Response.json(rest, { status: code });
}
