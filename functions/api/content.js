import { json } from "./_lib/respond.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value, updated_at FROM site_content").all();
  const content = {};
  const updated = {};
  for (const r of results) {
    try {
      content[r.key] = JSON.parse(r.value);
      updated[r.key] = r.updated_at;
    } catch (_) { /* skip bad rows */ }
  }
  // Additive: consumers read named keys; CONTENT_KEYS can never collide.
  content.updated_at = updated;
  return json(content);
}
