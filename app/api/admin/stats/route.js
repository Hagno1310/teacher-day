import { sql, db } from "@/lib/db";
import { isAdmin, unauthorized } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  await db();
  const [s] = await sql`
    SELECT count(*) FILTER (WHERE status = 'approved')::int AS approved,
           count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
           count(*) FILTER (WHERE status = 'pending')::int AS pending,
           count(*) FILTER (WHERE status = 'hidden')::int AS hidden,
           count(DISTINCT student_email) FILTER (WHERE status <> 'rejected')::int AS students
    FROM wishes`;
  return Response.json(s);
}
