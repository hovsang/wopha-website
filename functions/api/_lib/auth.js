// Cloudflare Access is the gate for /api/admin/* in production (set up in the
// launch checklist). This header check blocks unauthenticated *browsing* if the
// Access policy is missing, but the header is client-forgeable without Access
// in front — it is NOT real authentication on its own. Never load real
// resident data before the Access app exists (checklist section 7).
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export function adminEmailFor(request) {
  const url = new URL(request.url);
  if (LOCAL_HOSTS.includes(url.hostname)) return "dev@localhost";
  return request.headers.get("cf-access-authenticated-user-email") || null;
}
