import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";

const DOMAINS = (process.env.STUDENT_EMAIL_DOMAINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const devLogin = process.env.AUTH_DEV_LOGIN === "true";

export function allowedEmail(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  return !DOMAINS.length || DOMAINS.some((d) => e.endsWith("@" + d));
}

export const authOptions = {
  providers: [
    // SSO Outlook của trường: điền AZURE_AD_* trong .env
    process.env.AZURE_AD_CLIENT_ID &&
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        tenantId: process.env.AZURE_AD_TENANT_ID,
        profile: (p) => ({ id: p.sub, name: p.name, email: (p.email || p.preferred_username || "").toLowerCase() }),
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
