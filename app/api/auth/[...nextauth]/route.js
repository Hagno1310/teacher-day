import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const authenticate = NextAuth(authOptions);

async function handler(req, context) {
  const response = await authenticate(req, context);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export { handler as GET, handler as POST };
