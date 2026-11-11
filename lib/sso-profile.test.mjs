import { test } from "node:test";
import assert from "node:assert/strict";
import { ssoDisplayName } from "./sso-profile.js";

test("hiển thị họ trước tên sau từ các trường SSO, giữ dấu tiếng Việt", () => {
  assert.equal(ssoDisplayName({ name: "Đạt Vũ Tiến", family_name: "Vũ Tiến", given_name: "Đạt" }), "Vũ Tiến Đạt");
  assert.equal(ssoDisplayName({ name: "Minh Anh Nguyễn Thị", family_name: "Nguyễn Thị", given_name: "Minh Anh" }), "Nguyễn Thị Minh Anh");
});

test("chuẩn hóa khoảng trắng và không phụ thuộc trường name", () => {
  assert.equal(ssoDisplayName({ family_name: "  Vũ   Tiến ", given_name: " Đạt " }), "Vũ Tiến Đạt");
});

test("thiếu dữ liệu họ tên thì giữ tên đầy đủ, không tự đảo từng từ", () => {
  assert.equal(ssoDisplayName({ name: "Vũ Tiến Đạt", given_name: "Đạt" }), "Vũ Tiến Đạt");
  assert.equal(ssoDisplayName({ name: "Đạt Vũ Tiến" }), "Đạt Vũ Tiến");
  assert.equal(ssoDisplayName({ family_name: "Vũ Tiến" }), "Vũ Tiến");
  assert.equal(ssoDisplayName({ given_name: "Đạt" }), "Đạt");
});

test("dữ liệu không hợp lệ dùng username hoặc để trống", () => {
  assert.equal(ssoDisplayName({ name: {}, family_name: [], given_name: 123, preferred_username: " student " }), "student");
  assert.equal(ssoDisplayName({}), null);
});
