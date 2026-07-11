import { json } from "./_lib/respond.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM site_content").all();
  const content = {};
  for (const r of results) {
    try { content[r.key] = JSON.parse(r.value); } catch (_) { /* skip bad rows */ }
  }
  return json(content);
}
