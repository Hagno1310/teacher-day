import { test } from "node:test";
import assert from "node:assert/strict";

async function withDomains(domains, run) {
  const previous = process.env.STUDENT_EMAIL_DOMAINS;
  if (domains === undefined) delete process.env.STUDENT_EMAIL_DOMAINS;
  else process.env.STUDENT_EMAIL_DOMAINS = domains;
  try {
    const module = await import(`./student-email.js?domains=${encodeURIComponent(String(domains))}`);
    await run(module);
  } finally {
    if (previous === undefined) delete process.env.STUDENT_EMAIL_DOMAINS;
    else process.env.STUDENT_EMAIL_DOMAINS = previous;
  }
}

test("mặc định chỉ nhận email sinh viên PTIT và chuẩn hóa chữ hoa, khoảng trắng", async () => {
  await withDomains(undefined, ({ allowedEmail, ssoEmail }) => {
    assert.equal(allowedEmail(" Student@STU.PTIT.EDU.VN "), true);
    assert.equal(allowedEmail("staff@ptit.edu.vn"), false);
    assert.equal(allowedEmail("student@example.com"), false);
    assert.equal(ssoEmail({ email: " Student@STU.PTIT.EDU.VN " }), "student@stu.ptit.edu.vn");
  });
});

test("không tự tạo email sinh viên từ username hoặc nhận tên miền giả", async () => {
  await withDomains("stu.ptit.edu.vn", ({ allowedEmail, ssoEmail }) => {
    for (const email of [null, undefined, {}, "", "b24dccn001", "a@@stu.ptit.edu.vn", "a b@stu.ptit.edu.vn", "a@fake-stu.ptit.edu.vn", "a@stu.ptit.edu.vn.evil.com"]) {
      assert.equal(allowedEmail(email), false, String(email));
    }
    assert.equal(ssoEmail({ preferred_username: "staff001" }), null);
    assert.equal(ssoEmail({}), null);
    assert.equal(ssoEmail({ preferred_username: " Student@stu.ptit.edu.vn " }), "student@stu.ptit.edu.vn");
    assert.equal(allowedEmail(ssoEmail({ email: "staff@example.com", preferred_username: "student@stu.ptit.edu.vn" })), false);
  });
});

test("hỗ trợ nhiều tên miền và chế độ thử RIPT cho email hợp lệ", async () => {
  await withDomains("stu.ptit.edu.vn, RIPT.VN ", ({ allowedEmail }) => {
    assert.equal(allowedEmail("tester@ript.vn"), true);
    assert.equal(allowedEmail("student@stu.ptit.edu.vn"), true);
    assert.equal(allowedEmail("tester@example.com"), false);
  });
  await withDomains("", ({ allowedEmail }) => {
    assert.equal(allowedEmail("tester@example.com"), true);
    assert.equal(allowedEmail("not-an-email"), false);
  });
});
