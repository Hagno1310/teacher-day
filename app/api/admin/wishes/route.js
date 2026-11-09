import { sql, db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";
const STATUSES = ["approved", "rejected", "pending", "hidden"];

// GET /api/admin/wishes?status=approved&limit=200&before=<id>
export async function GET(req) {
  if (!(await isAdmin())) return unauthorized();
  await db();
  const p = new URL(req.url).searchParams;
  const status = STATUSES.includes(p.get("status")) ? p.get("status") : null;
  const limit = Math.min(1000, Number(p.get("limit")) || 200);
  const before = Number(p.get("before")) || null;
  const rows = await sql`
    SELECT w.id, w.content AS text, w.teacher_id AS "teacherId", t.name AS "teacherName", w.status, w.reason,
           w.student_email AS "studentEmail", w.created_at AS "createdAt", w.moderated_at AS "moderatedAt"
    FROM wishes w LEFT JOIN teachers t ON t.id = w.teacher_id
    WHERE true ${status ? sql`AND w.status = ${status}` : sql``} ${before ? sql`AND w.id < ${before}` : sql``}
    ORDER BY w.id DESC LIMIT ${limit}`;
  return Response.json(rows);
}
