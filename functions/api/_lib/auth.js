// Cloudflare Access is the real gate for /api/admin/* in production (set up
// in the launch checklist). This check is defense-in-depth: if the Access
// policy is missing or misconfigured, the API still refuses to answer.
// Access sets Cf-Access-Authenticated-User-Email on validated requests.
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export function adminEmailFor(request) {
  const url = new URL(request.url);
  if (LOCAL_HOSTS.includes(url.hostname)) return "dev@localhost";
  return request.headers.get("cf-access-authenticated-user-email") || null;
}
