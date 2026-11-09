import { sql, db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await db();
  const rows = await sql`
    SELECT t.id, t.name, count(w.id)::int AS count
    FROM teachers t LEFT JOIN wishes w ON w.teacher_id = t.id AND w.status = 'approved'
    WHERE t.active GROUP BY t.id ORDER BY t.name`;
  return Response.json(rows);
}
