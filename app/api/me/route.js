import { getServerSession } from "next-auth";
import { authOptions, allowedEmail, devLogin, ssoEnabled, ssoName } from "@/lib/auth";
import { db } from "@/lib/db";
import { studentState, windowState } from "@/lib/wishes";

export const dynamic = "force-dynamic";
const SESSION_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };

export async function GET() {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.trim().toLowerCase() || null;
  const base = { devLogin, sso: ssoEnabled, ssoName, window: windowState() };
  if (!allowedEmail(email)) return Response.json({ ...base, user: null }, { headers: SESSION_HEADERS });
  const identity = { user: email, userName: (typeof s.user.name === "string" && s.user.name.trim()) || email };
  try {
    await db();
    return Response.json({ ...base, ...identity, ...(await studentState(email)) }, { headers: SESSION_HEADERS });
  } catch (error) {
    console.error("GET /api/me: database unavailable", error.code || error.name);
    return Response.json({
      ...base,
      ...identity,
      error: "Bạn đã đăng nhập thành công nhưng chưa tải được dữ liệu gửi lời chúc. Vui lòng thử lại sau ít phút.",
    }, { status: 503, headers: SESSION_HEADERS });
  }
}
