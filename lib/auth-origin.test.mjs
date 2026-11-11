import { test } from "node:test";
import assert from "node:assert/strict";
import { authOrigin } from "./auth-origin.js";

const request = (url, headers = {}) => new Request(url, { headers });

test("local giữ đúng host và cổng đang truy cập", () => {
  assert.equal(authOrigin(request("http://localhost:3000/api/auth/federated-logout")), "http://localhost:3000");
  assert.equal(authOrigin(request("http://127.0.0.1:3100/api/auth/session")), "http://127.0.0.1:3100");
  assert.equal(authOrigin(request("http://[::1]:3000/api/auth/session")), "http://[::1]:3000");
});

test("sau proxy HTTPS dùng domain công khai, không dùng host/cổng nội bộ", () => {
  assert.equal(authOrigin(request("http://localhost:3000/api/auth/federated-logout", {
    host: "localhost:3000", "x-forwarded-host": "tri-an.example.edu.vn", "x-forwarded-proto": "https",
  })), "https://tri-an.example.edu.vn");
  assert.equal(authOrigin(request("http://0.0.0.0:3000/api/auth/session", {
    host: "tri-an.example.edu.vn", "x-forwarded-proto": "https",
  })), "https://tri-an.example.edu.vn");
});

test("giữ cổng public khác mặc định, bỏ cổng HTTPS mặc định", () => {
  assert.equal(authOrigin(request("http://app:3000/api/auth/session", {
    "x-forwarded-host": "preview.example.test:8443", "x-forwarded-proto": "https",
  })), "https://preview.example.test:8443");
  assert.equal(authOrigin(request("http://app:3000", {
    "x-forwarded-host": "tri-an.example.test:443", "x-forwarded-proto": "https",
  })), "https://tri-an.example.test");
});

test("NEXTAUTH_URL tùy chọn cố định domain, đồng bộ với NextAuth khi cấu hình", () => {
  assert.equal(authOrigin(request("http://internal:3000/api/auth/session", {
    "x-forwarded-host": "other.example.test", "x-forwarded-proto": "http",
  }), "https://tri-an.example.edu.vn/"), "https://tri-an.example.edu.vn");
});

test("không nhận host/protocol sai cấu trúc hoặc URL có thông tin đăng nhập", () => {
  for (const host of ["example.test/path", "example.test?url=other", "user@example.test", "example.test,other.test", "example.test\\other"]) {
    assert.throws(() => authOrigin(request("http://internal:3000", { "x-forwarded-host": host })));
  }
  assert.throws(() => authOrigin(request("http://internal:3000", { "x-forwarded-proto": "javascript" })));
  assert.throws(() => authOrigin(request("http://internal:3000"), "https://user:password@example.test"));
});
