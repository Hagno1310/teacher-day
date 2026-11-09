import { sql, db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin";

// PATCH { status: "hidden" | "approved" } — ẩn hoặc hiện lại lời chúc
export async function PATCH(req, { params }) {
  if (!(await isAdmin())) return unauthorized();
  await db();
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!["hidden", "approved"].includes(status)) return Response.json({ error: "status phải là hidden hoặc approved" }, { status: 400 });
  const [row] = await sql`UPDATE wishes SET status = ${status} WHERE id = ${Number(id)} AND status IN ('approved','hidden') RETURNING id, status`;
  return row ? Response.json(row) : Response.json({ error: "Không tìm thấy lời chúc có thể ẩn/hiện." }, { status: 404 });
}
