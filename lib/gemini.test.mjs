import { test } from "node:test";
import assert from "node:assert/strict";
import { createAiModerator } from "./gemini.js";

const decision = (ok = true, reason = "", isWish = true) => Response.json({
  candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ isWish, ok, reason }) }] } }],
});
const make = (fetchImpl, options = {}) => createAiModerator({
  keys: ["test-key"], models: ["first", "second"], fetchImpl, log: () => {}, ...options,
});
const modelOf = (url) => url.match(/models\/([^:]+):/)[1];

test("thiếu key thì chờ duyệt, không gọi Google", async () => {
  const moderate = make(() => assert.fail("Không được gọi API"), { keys: [] });
  assert.equal((await moderate("Lời chúc thử")).status, "pending");
});

test("gửi schema và dữ liệu riêng; bỏ qua thought và ghép các phần JSON", async () => {
  const moderate = make(async (url, request) => {
    const body = JSON.parse(request.body);
    assert.equal(request.headers["x-goog-api-key"], "test-key");
    assert.equal(JSON.parse(body.contents[0].parts[0].text).loi_chuc, "Lời chúc thử");
    assert.equal(body.generationConfig.responseJsonSchema.properties.ok.type, "boolean");
    assert.equal(body.generationConfig.thinkingConfig.thinkingLevel, "MINIMAL");
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [
      { thought: true, text: "Không phải quyết định" }, { text: '{"ok":' }, { text: 'true,"isWish":true,"reason":""}' },
    ] } }] });
  }, { models: ["gemini-3.5-flash-lite"] });
  assert.equal((await moderate("Lời chúc thử")).status, "approved");
});

test("quyết định từ chối hợp lệ được giữ nguyên và giới hạn lý do", async () => {
  let calls = 0;
  const moderate = make(async () => { calls++; return decision(false, "x".repeat(300)); });
  const result = await moderate("Lời chúc thử");
  assert.equal(result.status, "rejected");
  assert.equal(result.reason.length, 200);
  assert.equal(calls, 1);
});

test("không duyệt lời chào hay nội dung không phải lời chúc dù AI trả ok=true", async () => {
  const moderate = make(async () => decision(true, "", false));
  const result = await moderate("Em đến lớp để kể một câu chuyện.");
  assert.equal(result.status, "rejected");
  assert.ok(result.reason.includes("chưa phải lời chúc"));
});

test("lời chào đơn thuần bị từ chối ngay cả khi thiếu key, không gọi Google", async () => {
  const moderate = make(() => assert.fail("Lời chào không được gọi API"), { keys: [] });
  for (const text of ["Xin chào thầy cô!", "Kính chào quý thầy cô ạ", "Chào cô. Chào mọi người ạ!", "Hello thầy cô", "HI, CÔ!"]) {
    assert.equal((await moderate(text)).status, "rejected", text);
  }
});

test("lời chúc có kèm lời chào vẫn được duyệt khi hai điều kiện đều hợp lệ", async () => {
  const moderate = make(async () => decision(true, "", true));
  assert.equal((await moderate("Chào cô, chúc cô luôn mạnh khỏe và hạnh phúc!")).status, "approved");
});

test("429 đổi model trên cùng key và tôn trọng Retry-After", async () => {
  let time = 100_000;
  const calls = [];
  const moderate = make(async (url) => {
    const model = modelOf(url); calls.push(model);
    return model === "first" && calls.length === 1
      ? Response.json({ error: {} }, { status: 429, headers: { "retry-after": "120" } })
      : decision();
  }, { keys: ["key-one", "key-two"], now: () => time });
  assert.equal((await moderate("Thử lần 1")).model, "second");
  time += 60_001;
  assert.equal((await moderate("Thử lần 2")).model, "second");
  time += 60_000;
  assert.equal((await moderate("Thử lần 3")).model, "first");
  assert.deepEqual(calls, ["first", "second", "second", "first"]);
});

test("đọc thời gian chờ RetryInfo từ Google", async () => {
  let time = 100_000, calls = 0;
  const moderate = make(async () => {
    calls++;
    return calls === 1 ? Response.json({ error: { details: [{ retryDelay: "90s" }] } }, { status: 429 }) : decision();
  }, { models: ["first"], now: () => time });
  assert.equal((await moderate("Thử lần 1")).status, "pending");
  time += 60_001;
  assert.equal((await moderate("Thử lần 2")).status, "pending");
  assert.equal(calls, 1);
  time += 30_000;
  assert.equal((await moderate("Thử lần 3")).status, "approved");
});

test("giữ lượt RPM trước await, dùng chung giới hạn cho nhiều key", async () => {
  const calls = [];
  const moderate = make(async (url) => { calls.push(modelOf(url)); return decision(); }, {
    keys: ["one", "two"], now: () => 100_000,
    limits: { first: { rpm: 2, rpd: 20 }, second: { rpm: 1, rpd: 20 } },
  });
  const results = await Promise.all(Array.from({ length: 6 }, () => moderate("Lời chúc thử")));
  assert.equal(results.filter((result) => result.status === "approved").length, 3);
  assert.equal(results.filter((result) => result.status === "pending").length, 3);
  assert.equal(calls.filter((model) => model === "first").length, 2);
  assert.equal(calls.filter((model) => model === "second").length, 1);
});

test("RPD chỉ reset qua ngày Pacific, không reset lúc nửa đêm UTC", async () => {
  let time = Date.parse("2026-11-11T23:59:00Z"), calls = 0;
  const moderate = make(async () => { calls++; return decision(); }, {
    models: ["first"], now: () => time, limits: { first: { rpm: 10, rpd: 1 } },
  });
  assert.equal((await moderate("Lần 1")).status, "approved");
  time = Date.parse("2026-11-12T00:01:00Z");
  assert.equal((await moderate("Lần 2")).status, "pending");
  assert.equal(calls, 1);
  time = Date.parse("2026-11-12T08:01:00Z");
  assert.equal((await moderate("Lần 3")).status, "approved");
});

test("quota ngày từ Google không bị thử lại sau một phút", async () => {
  let time = Date.parse("2026-11-11T12:00:00Z"), calls = 0;
  const moderate = make(async () => {
    calls++;
    return Response.json({ error: { details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel" }] }] } }, { status: 429 });
  }, { models: ["first"], now: () => time });
  await moderate("Lần 1");
  time += 60_001;
  await moderate("Lần 2");
  assert.equal(calls, 1);
  time += 24 * 60 * 60_000;
  await moderate("Lần 3");
  assert.equal(calls, 2);
});

test("key hỏng chuyển key khác, không ghi key hoặc lời chúc vào log", async () => {
  const events = [], keys = [];
  const moderate = make(async (url, request) => {
    const key = request.headers["x-goog-api-key"]; keys.push(key);
    return key === "bad-key" ? Response.json({ error: { details: [{ reason: "API_KEY_INVALID" }] } }, { status: 400 }) : decision();
  }, { keys: ["bad-key", "good-key"], log: (event) => events.push(event) });
  assert.equal((await moderate("Nội dung riêng tư")).status, "approved");
  assert.equal((await moderate("Nội dung riêng tư")).status, "approved");
  assert.deepEqual(keys, ["bad-key", "good-key", "good-key"]);
  assert.ok(!JSON.stringify(events).includes("bad-key"));
  assert.ok(!JSON.stringify(events).includes("Nội dung riêng tư"));
});

test("lỗi 503, 404, timeout và JSON lỗi đều chuyển sang model tiếp theo", async () => {
  for (const failure of [503, 404, "timeout", "json"]) {
    const calls = [];
    const moderate = make(async (url) => {
      const model = modelOf(url); calls.push(model);
      if (model === "second") return decision();
      if (failure === "timeout") throw new DOMException("Request timed out", "TimeoutError");
      if (failure === "json") return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "broken" }] } }] });
      return Response.json({ error: {} }, { status: failure });
    });
    assert.equal((await moderate("Lời chúc thử")).status, "approved", String(failure));
    assert.deepEqual(calls, ["first", "second"]);
  }
});

test("JSON sai schema hoặc phản hồi bị cắt không tự duyệt hay từ chối", async () => {
  for (const [value, finishReason] of [[{}, "STOP"], [{ ok: "true", reason: "" }, "STOP"], [{ ok: false }, "STOP"], [{ ok: true, reason: "" }, "MAX_TOKENS"]]) {
    const moderate = make(async () => Response.json({ candidates: [{ finishReason, content: { parts: [{ text: JSON.stringify(value) }] } }] }));
    const result = await moderate("Lời chúc thử");
    assert.equal(result.status, "pending");
    assert.equal(result.skipped, true);
  }
});

test("SAFETY từ chối; lỗi chặn không rõ nguyên nhân để chờ duyệt", async () => {
  const blocked = make(async () => Response.json({ promptFeedback: { blockReason: "SAFETY" } }));
  assert.equal((await blocked("Lời chúc thử")).status, "rejected");
  const other = make(async () => Response.json({ promptFeedback: { blockReason: "OTHER" } }));
  assert.equal((await other("Lời chúc thử")).status, "pending");
});

test("giới hạn tổng thời gian và số lượt thử", async () => {
  let time = 100_000, calls = 0;
  const slow = make(async () => { calls++; time += 8000; throw new Error("Network error"); }, {
    models: ["one", "two", "three", "four"], now: () => time,
  });
  assert.equal((await slow("Lời chúc thử")).status, "pending");
  assert.equal(calls, 2);
  calls = 0;
  const invalid = make(async () => { calls++; return Response.json({}, { status: 401 }); }, {
    keys: ["one", "two", "three", "four"], maxAttempts: 2,
  });
  assert.equal((await invalid("Lời chúc thử")).status, "pending");
  assert.equal(calls, 2);
});
