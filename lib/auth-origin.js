/** Cùng quy tắc origin với NextAuth: URL cố định nếu có, còn lại dùng host/protocol bên ngoài. */
export function authOrigin(request, configuredUrl = process.env.NEXTAUTH_URL) {
  if (configuredUrl) {
    const url = new URL(configuredUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid auth URL");
    return url.origin;
  }

  const incoming = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || incoming.host;
  const protocol = request.headers.get("x-forwarded-proto") || incoming.protocol.slice(0, -1);
  if (!host || /[\s,\\/?#@]/.test(host) || !["http", "https"].includes(protocol)) throw new Error("Invalid auth host");
  return new URL(`${protocol}://${host}`).origin;
}
