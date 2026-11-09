import { sql, db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  await db();
  const rows = await sql`
    SELECT w.id, w.created_at, coalesce(t.name, 'Tất cả thầy cô') AS to_name, w.content, w.status, w.reason, w.student_email
    FROM wishes w LEFT JOIN teachers t ON t.id = w.teacher_id ORDER BY w.id`;
  const head = "id,thoi_gian,nguoi_nhan,noi_dung,trang_thai,ly_do,nguoi_gui";
  const body = rows.map((r) => [r.id, r.created_at.toISOString(), r.to_name, r.content, r.status, r.reason, r.student_email].map(q).join(","));
  // BOM để Excel đọc đúng tiếng Việt
  return new Response("﻿" + [head, ...body].join("\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="loi-chuc-20-11.csv"' },
  });
}
