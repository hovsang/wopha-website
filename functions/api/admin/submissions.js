import { json } from "../_lib/respond.js";

const STATUSES = ["new", "in_progress", "done"];

export async function onRequestGet({ request, env }) {
  const status = new URL(request.url).searchParams.get("status");
  let stmt;
  if (status && STATUSES.includes(status)) {
    stmt = env.DB.prepare(
      "SELECT id, form_type, fields, status, notes, created_at FROM submissions WHERE status = ? ORDER BY created_at DESC, id DESC"
    ).bind(status);
  } else {
    stmt = env.DB.prepare(
      "SELECT id, form_type, fields, status, notes, created_at FROM submissions ORDER BY created_at DESC, id DESC"
    );
  }
  const { results } = await stmt.all();
  return json({
    submissions: results.map((r) => ({ ...r, fields: JSON.parse(r.fields) })),
  });
}
