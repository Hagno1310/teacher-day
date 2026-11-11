const MESSAGES = {
  email: "Tài khoản SSO không có email hợp lệ hoặc email không thuộc tên miền được phép.",
  AccessDenied: "Tài khoản này không được phép đăng nhập gửi lời chúc.",
  OAuthSignin: "Chưa kết nối được với hệ thống SSO. Bạn thử lại sau ít phút nhé.",
  OAuthCallback: "Phiên đăng nhập SSO không còn hợp lệ. Bạn bấm đăng nhập lại để bắt đầu phiên mới nhé.",
  Callback: "Không hoàn tất được đăng nhập. Bạn thử lại nhé.",
  Configuration: "Đăng nhập SSO chưa được cấu hình đầy đủ. Vui lòng liên hệ ban tổ chức.",
  CredentialsSignin: "Email đăng nhập thử không hợp lệ hoặc không thuộc tên miền được phép.",
};
const AUTH_PARAMS = ["error", "loi", "code", "state", "session_state", "iss"];

export function authErrorFeedback(code) {
  const text = Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : "Đăng nhập không thành công, bạn thử lại nhé.";
  return { type: "bad", title: "Chưa đăng nhập được", text };
}

/** Đọc lỗi một lần và gỡ tham số SSO, giữ các tham số của trang và trạng thái Next.js. */
export function consumeAuthError(href, history) {
  const url = new URL(href);
  const code = url.searchParams.get("loi") || url.searchParams.get("error");
  const hasAuthParams = AUTH_PARAMS.some((key) => url.searchParams.has(key));
  if (hasAuthParams) {
    AUTH_PARAMS.forEach((key) => url.searchParams.delete(key));
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  }
  return code ? authErrorFeedback(code) : null;
}
