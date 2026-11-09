import { sql, db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin";

// POST { names: ["Nguyễn Văn A", ...] } — thêm thầy cô (trùng tên thì bật lại nếu đang ẩn)
export async function POST(req) {
  if (!(await isAdmin())) return unauthorized();
  await db();
  const { names } = await req.json().catch(() => ({}));
  const list = [...new Set((Array.isArray(names) ? names : []).map((n) => String(n).normalize("NFC").trim()).filter(Boolean))];
  if (!list.length) return Response.json({ error: "Cần mảng names." }, { status: 400 });
  const rows = await sql`INSERT INTO teachers ${sql(list.map((name) => ({ name })))}
    ON CONFLICT (name) DO UPDATE SET active = true RETURNING id, name`;
  return Response.json(rows, { status: 201 });
}

// PATCH { id, active } — ẩn/hiện thầy cô trong danh sách chọn
export async function PATCH(req) {
  if (!(await isAdmin())) return unauthorized();
  await db();
  const { id, active } = await req.json().catch(() => ({}));
  const [row] = await sql`UPDATE teachers SET active = ${Boolean(active)} WHERE id = ${Number(id)} RETURNING id, name, active`;
  return row ? Response.json(row) : Response.json({ error: "Không tìm thấy." }, { status: 404 });
}
