import { json } from "../../_lib/respond.js";

const STATUSES = ["new", "in_progress", "done"];

export async function onRequestPatch({ request, env, params }) {
  const id = Number(params.id);
  const input = await request.json().catch(() => ({}));
  const sets = [];
  const binds = [];
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) return json({ error: "Bad status" }, 400);
    sets.push("status = ?");
    binds.push(input.status);
  }
  if (input.notes !== undefined) {
    if (typeof input.notes !== "string" || input.notes.length > 2000) {
      return json({ error: "Notes must be text (max 2000 characters)" }, 400);
    }
    sets.push("notes = ?");
    binds.push(input.notes);
  }
  if (!sets.length) return json({ error: "Nothing to update" }, 400);
  binds.push(id);
  const r = await env.DB.prepare("UPDATE submissions SET " + sets.join(", ") + " WHERE id = ?")
    .bind(...binds).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
