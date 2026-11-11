export async function register() {
  // Import phải nằm trong khối if để webpack bỏ qua nó khi build cho edge runtime (lib/db.js dùng node:fs)
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL) {
    const { retryPending } = await import("./lib/wishes.js");
    // Khi Gemini có key/quota trở lại, để AI duyệt nốt lời chúc "chờ duyệt", 5 phút một lần
    setInterval(retryPending, 5 * 60_000);
  }
}
