import { adminLogout } from "@/lib/admin";

export async function POST() {
  await adminLogout();
  return Response.json({ ok: true });
}
