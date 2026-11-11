export async function register() {
  // Import phải nằm trong khối if để webpack bỏ qua nó khi build cho edge runtime (lib/db.js dùng node:fs)
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.DATABASE_URL) {
    const { retryPending } = await import("./lib/wishes.js");
    // Lời chúc "chờ duyệt" (khi hết key Gemini) được thử duyệt lại mỗi 5 phút
    setInterval(retryPending, 5 * 60_000);
  }
}
