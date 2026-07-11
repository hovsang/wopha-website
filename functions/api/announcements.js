import { json } from "./_lib/respond.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, pinned_until, created_at FROM announcements
     WHERE deleted = 0
     ORDER BY (pinned_until IS NOT NULL AND pinned_until >= date('now')) DESC,
              created_at DESC
     LIMIT 20`
  ).all();
  return json({ announcements: results });
}
