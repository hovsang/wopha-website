// Signed cancel tokens for resident bookings: hex HMAC-SHA256 over the
// booking id, keyed by BOOKING_TOKEN_SECRET (Pages secret; see the launch
// checklist). Unforgeable without the secret and needs no expiry — a token
// is worthless once its booking's date has passed. The fallback keeps local
// dev working with no env vars; production MUST set the real secret.
const FALLBACK_SECRET = "dev-only-secret";

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function cancelToken(env, id) {
  return hmacHex((env && env.BOOKING_TOKEN_SECRET) || FALLBACK_SECRET, "wopha-booking-cancel:" + id);
}

// Constant-time comparison: never leak HMAC prefixes through timing.
export async function verifyCancelToken(env, id, token) {
  const expected = await cancelToken(env, id);
  const given = String(token || "");
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
