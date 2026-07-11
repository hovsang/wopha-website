import { json } from "../_lib/respond.js";
import { validateAnnouncement } from "../_lib/validate.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, pinned_until, created_at, updated_at
     FROM announcements WHERE deleted = 0 ORDER BY created_at DESC, id DESC`
  ).all();
  return json({ announcements: results });
}

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateAnnouncement(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const v = check.value;
  const r = await env.DB.prepare(
    "INSERT INTO announcements (title, body, pinned_until) VALUES (?, ?, ?)"
  ).bind(v.title, v.body, v.pinned_until).run();
  return json({ id: r.meta.last_row_id }, 201);
}
