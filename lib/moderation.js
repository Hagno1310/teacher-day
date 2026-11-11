// Lớp 1: lọc từ khóa (không tốn token). Chỉ chứa từ chắc chắn tục, tránh chặn nhầm "lớn", "các", "đeo"...
const BANNED_TOKENS = new Set([
  "đm", "dm", "đmm", "dmm", "đcm", "dcm", "vl", "vcl", "vkl", "clgt", "cmm", "đéo", "địt", "lồn", "buồi", "cặc", "đĩ", "đụ", "ngu", "fuck", "shit",
]);
const BANNED_PHRASES = ["óc chó", "mẹ mày", "bố mày", "con mẹ", "thằng ngu", "đồ ngu", "đần độn"];

export function hasBannedWords(text) {
  const tokens = text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.some((t) => BANNED_TOKENS.has(t))) return true;
  const joined = ` ${tokens.join(" ")} `;
  return BANNED_PHRASES.some((p) => joined.includes(` ${p} `));
}

export { aiModerate } from "./gemini.js";
