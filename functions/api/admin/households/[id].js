import { json } from "../../_lib/respond.js";
import { validateHouseholdUpdate } from "../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Bad id" }, 400);
  const input = await request.json().catch(() => ({}));
  const check = validateHouseholdUpdate(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const fields = Object.keys(check.value);
  const sets = fields.map((f) => f + " = ?").join(", ");
  const binds = fields.map((f) => check.value[f]);
  binds.push(id);
  try {
    const r = await env.DB.prepare("UPDATE households SET " + sets + " WHERE id = ?")
      .bind(...binds).run();
    if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  } catch (e) {
    if (String(e && e.message).includes("UNIQUE")) {
      return json({ error: "That address is already on file" }, 400);
    }
    throw e;
  }
}
