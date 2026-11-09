import crypto from "node:crypto";
import { cookies, headers } from "next/headers";

const COOKIE = "admin_session";
const secret = () => `${process.env.ADMIN_PASSWORD}|${process.env.NEXTAUTH_SECRET}`;
const sign = () => crypto.createHmac("sha256", secret()).update("admin").digest("hex");
const h = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(h(a), h(b));

/** Trang /admin dùng cookie; web quản trị chung sau này dùng header Authorization: Bearer ADMIN_API_TOKEN. */
export async function isAdmin() {
  const token = process.env.ADMIN_API_TOKEN;
  const auth = (await headers()).get("authorization") || "";
  if (token && auth.startsWith("Bearer ") && same(auth.slice(7), token)) return true;
  const c = (await cookies()).get(COOKIE)?.value;
  return Boolean(process.env.ADMIN_PASSWORD && c && same(c, sign()));
}

// Chống dò mật khẩu: tối đa 10 lần sai / 15 phút / IP. ponytail: lưu trong RAM, đủ cho 1 container.
const fails = new Map();
export async function adminLogin(password) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const f = (fails.get(ip) || []).filter((t) => now - t < 15 * 60_000);
  if (f.length >= 10) return { ok: false, error: "Sai quá nhiều lần, thử lại sau 15 phút." };
  if (!process.env.ADMIN_PASSWORD || !same(String(password || ""), process.env.ADMIN_PASSWORD)) {
    fails.set(ip, [...f, now]);
    return { ok: false, error: "Mật khẩu không đúng." };
  }
  fails.delete(ip);
  const proto = (await headers()).get("x-forwarded-proto") || "";
  (await cookies()).set(COOKIE, sign(), { httpOnly: true, sameSite: "strict", path: "/", maxAge: 12 * 3600, secure: proto === "https" });
  return { ok: true };
}

export async function adminLogout() {
  (await cookies()).delete(COOKIE);
}

export const unauthorized = () => Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
