import KeycloakProvider from "next-auth/providers/keycloak";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";

const DOMAINS = (process.env.STUDENT_EMAIL_DOMAINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const devLogin = process.env.AUTH_DEV_LOGIN === "true";
// SSO sinh viên PTIT (SLINK PTIT): Keycloak của trường, client công khai "ptit-connect" (không có client secret, dùng PKCE).
// Mặc định đã đúng với hạ tầng PTIT; đặt PTIT_SSO=false để tắt.
export const ssoEnabled = process.env.PTIT_SSO !== "false";
const SSO_ISSUER = process.env.PTIT_SSO_ISSUER || "https://gwdu.ptit.edu.vn/sso/realms/ptit";

/** Email sinh viên từ token SSO (vd datvt.b24cc062@stu.ptit.edu.vn). Không có email thì ghép username với đuôi email sinh viên. */
function ssoEmail(p) {
  const email = String(p.email || "").trim().toLowerCase();
  if (email) return email;
  const user = String(p.preferred_username || "").trim().toLowerCase();
  return user.includes("@") || !user || !DOMAINS[0] ? user : `${user}@${DOMAINS[0]}`;
}

export function allowedEmail(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  return !DOMAINS.length || DOMAINS.some((d) => e.endsWith("@" + d));
}

export const authOptions = {
  providers: [
    // next-auth tự lo PKCE + state, và xác minh chữ ký id_token bằng khoá công khai (JWKS) của Keycloak.
    // Redirect URI phải được Keycloak cho phép: {NEXTAUTH_URL}/api/auth/callback/ptit
    ssoEnabled &&
      KeycloakProvider({
        id: "ptit",
        name: "SLINK PTIT",
        issuer: SSO_ISSUER,
        clientId: process.env.PTIT_SSO_CLIENT_ID || "ptit-connect",
        clientSecret: "",
        client: { token_endpoint_auth_method: "none" }, // client công khai: không gửi secret khi đổi mã lấy token
        authorization: { params: { scope: "openid email profile" } },
        profile: (p) => ({ id: p.sub, name: p.name || p.preferred_username, email: ssoEmail(p) }),
      }),
    // Đăng nhập thử khi chưa có SSO. TẮT (AUTH_DEV_LOGIN=false) khi chạy thật.
    devLogin &&
      CredentialsProvider({
        id: "dev",
        name: "Đăng nhập thử",
        credentials: { email: { label: "Email", type: "email" } },
        authorize: (c) => (c?.email ? { id: c.email.toLowerCase(), email: c.email.toLowerCase(), name: c.email } : null),
      }),
  ].filter(Boolean),
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  callbacks: { signIn: ({ user }) => allowedEmail(user.email) || "/gui?loi=email" },
  pages: { signIn: "/gui", error: "/gui" },
};

export async function studentEmail() {
  const s = await getServerSession(authOptions);
  const e = s?.user?.email?.toLowerCase();
  return allowedEmail(e) ? e : null;
}
