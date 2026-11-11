import { test } from "node:test";
import assert from "node:assert/strict";
import { consumeAuthError } from "./auth-feedback.js";

function browser(href) {
  return {
    href,
    state: { __NA: true, tree: ["gui"] },
    calls: 0,
    replaceState(state, title, target) {
      assert.equal(state, this.state);
      this.href = new URL(target, this.href).href;
      this.calls++;
    },
  };
}

test("lỗi SSO chỉ đọc một lần, giữ query của trang và history Next.js", () => {
  const history = browser("https://example.test/gui?error=OAuthCallback&mode=one#form");
  const error = consumeAuthError(history.href, history);
  assert.equal(error.type, "bad");
  assert.ok(error.text.includes("phiên mới"));
  assert.equal(history.href, "https://example.test/gui?mode=one#form");
  assert.equal(consumeAuthError(history.href, history), null);
  assert.equal(history.calls, 1);
});

test("gỡ mã callback, state và issuer cũ khỏi URL để không tái sử dụng", () => {
  const history = browser("https://example.test/gui?code=old-code&state=old-state&session_state=old-session&iss=https%3A%2F%2Fsso.example.test&keep=1");
  assert.equal(consumeAuthError(history.href, history), null);
  assert.equal(history.href, "https://example.test/gui?keep=1");
});

test("giữ thông báo email không được phép và bỏ cả hai tham số lỗi", () => {
  const history = browser("https://example.test/gui?loi=email&error=AccessDenied");
  const error = consumeAuthError(history.href, history);
  assert.ok(error.text.includes("email"));
  assert.equal(history.href, "https://example.test/gui");
});

test("không hiển thị nguyên văn mã lỗi không rõ nguồn gốc", () => {
  const history = browser("https://example.test/gui?error=%3Cscript%3Eprivate-data%3C%2Fscript%3E");
  const error = consumeAuthError(history.href, history);
  assert.ok(error.text.includes("không thành công"));
  assert.ok(!error.text.includes("private-data"));
  assert.equal(history.href, "https://example.test/gui");
});

test("tên thuộc tính JavaScript không được dùng làm thông báo lỗi", () => {
  for (const code of ["__proto__", "constructor", "toString"]) {
    const history = browser(`https://example.test/gui?error=${code}`);
    assert.equal(typeof consumeAuthError(history.href, history).text, "string");
  }
});

test("URL không có lỗi hoặc callback giữ nguyên, không sửa history", () => {
  const history = browser("https://example.test/gui?mode=one#form");
  assert.equal(consumeAuthError(history.href, history), null);
  assert.equal(history.calls, 0);
});
