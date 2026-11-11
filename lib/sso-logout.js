export function ssoLogoutUrl(token, { enabled, issuer, clientId, returnTo }) {
  if (!enabled || !token || token.authProvider === "dev") return returnTo;
  const account = token.ptit || { issuer, clientId };
  const url = new URL(`${account.issuer.replace(/\/+$/, "")}/protocol/openid-connect/logout`);
  url.searchParams.set("client_id", account.clientId);
  url.searchParams.set("post_logout_redirect_uri", returnTo);
  if (account.idToken) url.searchParams.set("id_token_hint", account.idToken);
  return url.href;
}
