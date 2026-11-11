import KeycloakProvider from "next-auth/providers/keycloak";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { allowedEmail, ssoEmail } from "./student-email.js";
import { ssoDisplayName } from "./sso-profile.js";

export { allowedEmail };
export const devLogin = process.env.AUTH_DEV_LOGIN === "true";
// Mặc định dùng client PTIT công khai với PKCE; có thể đổi issuer/client sang dev RIPT qua .env.
export const ssoEnabled = process.env.PTIT_SSO !== "false";
export const ssoName = process.env.PTIT_SSO_NAME || "SLINK PTIT";
export const ssoIssuer = (process.env.PTIT_SSO_ISSUER || "https://gwdu.ptit.edu.vn/sso/realms/ptit").replace(/\/+$/, "");
export const ssoClientId = process.env.PTIT_SSO_CLIENT_ID || "ptit-ript-public";
const SSO_SECRET = process.env.PTIT_SSO_CLIENT_SECRET || "";

export const authOptions = {
  providers: [
    // next-auth tự lo PKCE + state, và xác minh chữ ký id_token bằng khoá công khai (JWKS) của Keycloak.
    // Redirect URI phải được Keycloak cho phép: {domain-web}/api/auth/callback/ptit
    ssoEnabled &&
      KeycloakProvider({
        id: "ptit",
        name: ssoName,
        issuer: ssoIssuer,
        clientId: ssoClientId,
        clientSecret: SSO_SECRET,
        client: { token_endpoint_auth_method: SSO_SECRET ? "client_secret_basic" : "none" },
        checks: ["pkce", "state"],
        authorization: { params: { scope: "openid email profile" } },
        profile: (p) => ({ id: p.sub, name: ssoDisplayName(p), email: ssoEmail(p) }),
      }),
    // Đăng nhập thử khi chưa có SSO. TẮT (AUTH_DEV_LOGIN=false) khi chạy thật.
    devLogin &&
      CredentialsProvider({
        id: "dev",
        name: "Đăng nhập thử",
        credentials: { email: { label: "Email", type: "email" } },
        authorize: (c) => {
          const email = typeof c?.email === "string" ? c.email.trim().toLowerCase() : "";
          return allowedEmail(email) ? { id: email, email, name: email } : null;
        },
      }),
  ].filter(Boolean),
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  callbacks: {
    signIn: ({ user }) => allowedEmail(user.email) || "/gui?loi=email",
    jwt: ({ token, account }) => {
      if (account) {
        token.authProvider = account.provider;
        if (account.provider === "ptit") token.ptit = { issuer: ssoIssuer, clientId: ssoClientId, idToken: account.id_token };
        else delete token.ptit;
      }
      // ID token chỉ lưu trong cookie JWT mã hóa/HttpOnly, không đưa vào session trả cho giao diện.
      return token;
    },
  },
  pages: { signIn: "/gui", error: "/gui" },
};

export async function studentEmail() {
  const s = await getServerSession(authOptions);
  const e = s?.user?.email?.trim().toLowerCase();
  return allowedEmail(e) ? e : null;
}
