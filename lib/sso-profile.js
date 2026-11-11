const clean = (value) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

export function ssoDisplayName(profile) {
  const family = clean(profile.family_name);
  const given = clean(profile.given_name);
  // Keycloak thường trả name theo thứ tự tên + họ; giao diện PTIT dùng họ + tên.
  if (family && given) return `${family} ${given}`;
  return clean(profile.name) || family || given || clean(profile.preferred_username) || null;
}
