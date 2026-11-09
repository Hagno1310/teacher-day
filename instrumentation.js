export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { retryPending } = await import("./lib/wishes.js");
  // Lời chúc "chờ duyệt" (khi hết key Gemini) được thử duyệt lại mỗi 5 phút
  setInterval(retryPending, 5 * 60_000);
}
