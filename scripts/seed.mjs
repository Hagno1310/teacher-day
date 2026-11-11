// Nạp lời chúc mẫu để xem thử giao diện.
//   node scripts/seed.mjs           thêm dữ liệu mẫu (chạy lại không bị trùng)
//   node scripts/seed.mjs --reset   xóa dữ liệu mẫu
// Trong Docker: docker compose exec app node scripts/seed.mjs
// Mọi lời chúc mẫu dùng email @seed.local, nên xóa được mà không đụng dữ liệu thật.
import { sql, db } from "../lib/db.js";

const DOMAIN = "seed.local";
const N_STUDENTS = 40;

// Lời chúc chung chung: danh sách có cả cán bộ, nhân viên chứ không chỉ giảng viên, nên tránh nhắc bài giảng, đồ án...
const GENERAL = [
  "Chúc thầy cô luôn mạnh khỏe, hạnh phúc và tràn đầy niềm vui.",
  "Nhân ngày Nhà giáo Việt Nam 20/11, em kính chúc thầy cô dồi dào sức khỏe và thành công.",
  "Cảm ơn thầy cô đã luôn quan tâm, hỗ trợ và đồng hành cùng sinh viên chúng em.",
  "Chúc thầy cô một mùa 20/11 thật ấm áp, bình an và nhiều niềm vui.",
  "Mong thầy cô luôn khỏe mạnh, vui vẻ và giữ mãi nhiệt huyết với nghề.",
  "Em biết ơn thầy cô rất nhiều. Chúc thầy cô mọi điều tốt đẹp nhất!",
];
const PERSONAL = [
  "Em cảm ơn thầy/cô đã luôn tận tình giúp đỡ chúng em. Chúc thầy/cô luôn khỏe và vui!",
  "Chúc thầy/cô 20/11 thật ý nghĩa, gia đình hạnh phúc và công việc thuận lợi.",
  "Cảm ơn thầy/cô vì sự quan tâm và những lời động viên dành cho em. Em biết ơn thầy/cô nhiều.",
  "Kính chúc thầy/cô sức khỏe dồi dào, luôn bình an và tràn đầy niềm vui.",
  "Nhân ngày 20/11, em gửi lời tri ân tới thầy/cô. Chúc thầy/cô luôn giữ nụ cười thật tươi!",
  "Cảm ơn thầy/cô đã luôn sẵn lòng hỗ trợ sinh viên. Chúc thầy/cô mọi điều tốt đẹp.",
];
const REJECTED = ["asdfgh qwerty", "Môn này chán quá", "spam spam spam"];

const pick = (a, i) => a[i % a.length];
const daysAgo = (i) => new Date(Date.now() - ((i * 7919) % (5 * 24 * 60)) * 60_000); // rải trong 5 ngày gần đây
// Phần lớn đã duyệt, một ít chờ duyệt / bị ẩn
const status = (i) => (i % 11 === 0 ? "pending" : i % 17 === 0 ? "hidden" : "approved");

await db(); // tạo bảng + nạp thầy cô nếu chưa có

if (process.argv.includes("--reset")) {
  const r = await sql`DELETE FROM wishes WHERE student_email LIKE ${"%@" + DOMAIN}`;
  console.log(`Đã xóa ${r.count} lời chúc mẫu.`);
} else {
  const teachers = await sql`SELECT id FROM teachers WHERE active ORDER BY id`;
  const rows = [];
  for (let s = 0; s < N_STUDENTS; s++) {
    const email = `sv${String(s + 1).padStart(3, "0")}@${DOMAIN}`;
    rows.push({ email, teacher: null, content: pick(GENERAL, s), status: status(s) });
    for (let k = 0; k < s % 4 && teachers.length; k++) // 0–3 lời chúc riêng mỗi sinh viên
      rows.push({ email, teacher: teachers[(s * 7 + k * 13) % teachers.length].id, content: pick(PERSONAL, s + k), status: status(s + k + 1) });
    if (s % 9 === 0) rows.push({ email, teacher: null, content: pick(REJECTED, s), status: "rejected", reason: "Mẫu: nội dung không phù hợp" });
  }
  let added = 0;
  for (const [i, r] of rows.entries()) {
    const at = daysAgo(i);
    const res = await sql`
      INSERT INTO wishes (student_email, teacher_id, content, status, reason, created_at, moderated_at)
      SELECT ${r.email}::text, ${r.teacher}::int, ${r.content}::text, ${r.status}::text, ${r.reason ?? null}::text, ${at}::timestamptz, ${r.status === "pending" ? null : at}::timestamptz
      WHERE NOT EXISTS (SELECT 1 FROM wishes WHERE student_email = ${r.email} AND content = ${r.content})
      ON CONFLICT DO NOTHING`;
    added += res.count;
  }
  console.log(`Đã thêm ${added}/${rows.length} lời chúc mẫu (${teachers.length} thầy cô). Xóa: node scripts/seed.mjs --reset`);
}

await sql.end();
