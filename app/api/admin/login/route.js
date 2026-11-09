import { adminLogin } from "@/lib/admin";

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const r = await adminLogin(password);
  return Response.json(r, { status: r.ok ? 200 : 401 });
}
