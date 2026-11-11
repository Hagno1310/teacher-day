import { test } from "node:test";
import assert from "node:assert/strict";
import { ssoLogoutUrl } from "./sso-logout.js";

const config = { enabled: true, issuer: "https://sso.example.test/realms/ptit", clientId: "public-client", returnTo: "http://localhost:3000/gui" };

test("logout SSO dùng ID token để kết thúc đúng phiên rồi quay về web", () => {
  const url = new URL(ssoLogoutUrl({ ptit: { issuer: config.issuer, clientId: config.clientId, idToken: "test-token+with/symbols=" } }, config));
  assert.equal(url.pathname, "/realms/ptit/protocol/openid-connect/logout");
  assert.equal(url.searchParams.get("id_token_hint"), "test-token+with/symbols=");
  assert.equal(url.searchParams.get("client_id"), "public-client");
  assert.equal(url.searchParams.get("post_logout_redirect_uri"), config.returnTo);
  assert.equal(url.searchParams.has("prompt"), false);
});

test("dùng issuer/client của phiên đã đăng nhập khi cấu hình web vừa thay đổi", () => {
  const url = new URL(ssoLogoutUrl({ ptit: { issuer: "https://old.example.test/realms/dev/", clientId: "dev-client", idToken: "old-token" } }, config));
  assert.equal(url.origin, "https://old.example.test");
  assert.equal(url.pathname, "/realms/dev/protocol/openid-connect/logout");
  assert.equal(url.searchParams.get("client_id"), "dev-client");
});

test("phiên cũ thiếu ID token vẫn được chuyển tới SSO để logout", () => {
  const url = new URL(ssoLogoutUrl({ email: "student@example.test" }, config));
  assert.equal(url.searchParams.get("client_id"), config.clientId);
  assert.equal(url.searchParams.has("id_token_hint"), false);
});

test("khách, tài khoản dev hoặc web tắt SSO chỉ quay về web", () => {
  assert.equal(ssoLogoutUrl(null, config), config.returnTo);
  assert.equal(ssoLogoutUrl({ authProvider: "dev" }, config), config.returnTo);
  assert.equal(ssoLogoutUrl({ authProvider: "ptit" }, { ...config, enabled: false }), config.returnTo);
});
