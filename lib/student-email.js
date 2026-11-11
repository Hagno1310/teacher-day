const DOMAINS = (process.env.STUDENT_EMAIL_DOMAINS ?? "stu.ptit.edu.vn")
  .split(",").map((domain) => domain.trim().toLowerCase()).filter(Boolean);

export function allowedEmail(email) {
  if (typeof email !== "string") return false;
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const domain = value.slice(value.lastIndexOf("@") + 1);
  return !DOMAINS.length || DOMAINS.includes(domain);
}

export function ssoEmail(profile) {
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  if (email) return email;
  const username = typeof profile.preferred_username === "string" ? profile.preferred_username.trim().toLowerCase() : "";
  // Chỉ dùng username nếu SSO trả về địa chỉ email đầy đủ; không tự tạo email sinh viên.
  return username.includes("@") ? username : null;
}
