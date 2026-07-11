import { json } from "../../_lib/respond.js";
import { validateAnnouncement } from "../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  const input = await request.json().catch(() => ({}));
  const check = validateAnnouncement(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const v = check.value;
  const r = await env.DB.prepare(
    `UPDATE announcements SET title = ?, body = ?, pinned_until = ?,
       updated_at = datetime('now')
     WHERE id = ? AND deleted = 0`
  ).bind(v.title, v.body, v.pinned_until, id).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const r = await env.DB.prepare(
    "UPDATE announcements SET deleted = 1, updated_at = datetime('now') WHERE id = ? AND deleted = 0"
  ).bind(Number(params.id)).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
