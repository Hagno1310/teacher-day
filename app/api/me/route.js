import { getServerSession } from "next-auth";
import { authOptions, allowedEmail, devLogin } from "@/lib/auth";
import { db } from "@/lib/db";
import { studentState, windowState } from "@/lib/wishes";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getServerSession(authOptions);
  const email = s?.user?.email?.toLowerCase() || null;
  const base = { devLogin, sso: Boolean(process.env.AZURE_AD_CLIENT_ID), window: windowState() };
  if (!allowedEmail(email)) return Response.json({ ...base, user: null });
  await db();
  return Response.json({ ...base, user: email, ...(await studentState(email)) });
}
