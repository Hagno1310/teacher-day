import { test } from "node:test";
import assert from "node:assert/strict";
import { hasBannedWords } from "./moderation.js";

test("chặn từ tục và teencode", () => {
  for (const s of ["môn này vl khó", "ĐM thầy", "đồ óc chó", "Đéo thích", "vcl!!!"]) assert.equal(hasBannedWords(s), true, s);
});

test("không chặn nhầm lời chúc bình thường", () => {
  for (const s of [
    "Chúc thầy cô luôn mạnh khỏe, hạnh phúc!",
    "Các thầy cô đã dạy em lớn khôn",
    "Cô đeo kính trông rất hiền",
    "Em ngủ quên nhưng vẫn nhớ chúc thầy",
    "Cảm ơn cô đã dạy em môn Đại số",
  ]) assert.equal(hasBannedWords(s), false, s);
});
