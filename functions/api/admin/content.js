import { json } from "../_lib/respond.js";
import { validateContent } from "../_lib/validate.js";

export async function onRequestPut({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateContent(input.key, input.value);
  if (!check.ok) return json({ error: check.error }, 400);
  await env.DB.prepare(
    `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(input.key, JSON.stringify(check.value)).run();
  return json({ ok: true });
}
