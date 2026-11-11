import { sql, db } from "./db.js";
import { hasBannedWords, aiModerate } from "./moderation.js";

export const COOLDOWN_MS = 60_000;
const REJECT_WINDOW_MS = 10 * 60_000;
const REJECT_LIMIT = 5;

export function windowState(now = Date.now()) {
  const open = process.env.OPEN_AT ? Date.parse(process.env.OPEN_AT) : -Infinity;
  const close = process.env.CLOSE_AT ? Date.parse(process.env.CLOSE_AT) : Infinity;
  if (now < open) return { open: false, message: `Cổng gửi lời chúc mở lúc ${new Date(open).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.` };
  if (now > close) return { open: false, message: "Cổng gửi lời chúc đã đóng. Cảm ơn bạn đã ghé thăm!" };
  return { open: true };
}

/** Trạng thái lượt gửi của 1 sinh viên. */
export async function studentState(email, q = sql) {
  const rows = await q`
    SELECT teacher_id, status, created_at FROM wishes
    WHERE student_email = ${email} AND (status <> 'rejected' OR created_at > now() - make_interval(secs => ${REJECT_WINDOW_MS / 1000}))
    ORDER BY created_at`;
  const used = rows.filter((r) => r.status !== "rejected");
  const rejects = rows.filter((r) => r.status === "rejected");
  const lastUsed = used.at(-1)?.created_at?.getTime() ?? 0;
  const now = Date.now();
  return {
    sentGeneral: used.some((r) => r.teacher_id === null),
    sentTo: used.filter((r) => r.teacher_id !== null).map((r) => r.teacher_id),
    cooldownMs: Math.max(0, lastUsed + COOLDOWN_MS - now),
    lockMs: rejects.length >= REJECT_LIMIT ? Math.max(0, rejects[rejects.length - REJECT_LIMIT].created_at.getTime() + REJECT_WINDOW_MS - now) : 0,
  };
}

function blocker(st, teacherId) {
  if (st.lockMs) return { code: 429, error: "Bạn có quá nhiều lời chúc chưa được duyệt. Thử lại sau ít phút nhé.", retryMs: st.lockMs };
  if (teacherId === null && st.sentGeneral) return { code: 409, error: "Bạn đã gửi lời chúc chung rồi." };
  if (teacherId !== null && st.sentTo.includes(teacherId)) return { code: 409, error: "Bạn đã gửi lời chúc cho thầy cô này rồi." };
  if (st.cooldownMs) return { code: 429, error: "Cần cách 1 phút giữa hai lần gửi.", retryMs: st.cooldownMs };
  return null;
}

const reject = (email, teacherId, content, reason) =>
  sql`INSERT INTO wishes (student_email, teacher_id, content, status, reason, moderated_at) VALUES (${email}, ${teacherId}, ${content}, 'rejected', ${reason}, now())`;

/** @returns {Promise<{code:number, status?:string, error?:string, retryMs?:number}>} */
export async function submitWish(email, rawText, rawTeacherId) {
  await db();
  const w = windowState();
  if (!w.open) return { code: 403, error: w.message };

  const content = String(rawText ?? "").normalize("NFC").trim();
  const len = [...content].length;
  if (len < 10 || len > 300) return { code: 400, error: "Lời chúc cần từ 10 đến 300 ký tự." };

  let teacherId = null;
  if (rawTeacherId !== null && rawTeacherId !== undefined && rawTeacherId !== "") {
    teacherId = Number(rawTeacherId);
    const [t] = Number.isInteger(teacherId) ? await sql`SELECT id FROM teachers WHERE id = ${teacherId} AND active` : [];
    if (!t) return { code: 400, error: "Hãy chọn một thầy cô trong danh sách." };
  }

  const pre = blocker(await studentState(email), teacherId);
  if (pre) return pre;

  if (hasBannedWords(content)) {
    await reject(email, teacherId, content, "Lọc từ khóa: ngôn từ thô tục");
    return { code: 422, error: "Lời chúc có từ ngữ chưa phù hợp. Bạn sửa lại giúp nhé, bạn vẫn còn lượt gửi." };
  }

  const ai = await aiModerate(content);
  if (ai.status === "rejected") {
    await reject(email, teacherId, content, "AI: " + ai.reason);
    return { code: 422, error: ai.reason + " Bạn vẫn còn lượt gửi." };
  }

  try {
    return await sql.begin(async (tx) => {
      // khóa theo sinh viên để 2 request song song không cùng lọt qua cooldown
      await tx`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
      const again = blocker(await studentState(email, tx), teacherId);
      if (again) return again;
      await tx`INSERT INTO wishes (student_email, teacher_id, content, status, reason, moderated_at)
               VALUES (${email}, ${teacherId}, ${content}, ${ai.status}, ${ai.note ?? null}, ${ai.status === "approved" ? sql`now()` : null})`;
      return { code: 201, status: ai.status };
    });
  } catch (e) {
    if (e.code === "23505") return { code: 409, error: "Bạn đã dùng lượt gửi này rồi." };
    throw e;
  }
}

/** Job nền: khi Gemini có key/quota trở lại thì để AI duyệt nốt lời chúc đang chờ; vẫn hết thì để quản trị duyệt tay. */
let running = false;
export async function retryPending() {
  if (running) return;
  running = true;
  try {
    await db();
    const rows = await sql`SELECT id, content FROM wishes WHERE status = 'pending' ORDER BY id LIMIT 50`;
    for (const r of rows) {
      const ai = await aiModerate(r.content);
      if (ai.skipped) break; // vẫn chưa có key/quota: dừng, đợi lượt sau hoặc quản trị duyệt
      await sql`UPDATE wishes SET status = ${ai.status}, reason = ${ai.reason ? "AI: " + ai.reason : null}, moderated_at = now() WHERE id = ${r.id} AND status = 'pending'`;
    }
  } catch (e) {
    console.error("retryPending:", e.message);
  } finally {
    running = false;
  }
}
