import { getToken } from "next-auth/jwt";
import { ssoEnabled, ssoIssuer, ssoClientId } from "@/lib/auth";
import { ssoLogoutUrl } from "@/lib/sso-logout";
import { authOrigin } from "@/lib/auth-origin";

export const dynamic = "force-dynamic";

// Chỉ chuẩn bị địa chỉ logout. Client vẫn dùng POST signOut có CSRF của NextAuth để xóa phiên web.
export async function GET(req) {
  const origin = authOrigin(req);
  const token = await getToken({ req, secureCookie: origin.startsWith("https://") });
  const returnTo = new URL("/gui", origin).href;
  const url = ssoLogoutUrl(token, { enabled: ssoEnabled, issuer: ssoIssuer, clientId: ssoClientId, returnTo });
  return Response.json({ url }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" } });
}
