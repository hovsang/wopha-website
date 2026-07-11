import { json } from "../../_lib/respond.js";

export async function onRequestDelete({ env, params }) {
  const r = await env.DB.prepare("DELETE FROM payments WHERE id = ?")
    .bind(Number(params.id)).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
