import { json } from "../../_lib/respond.js";

// Board cancel/override: works on residents' bookings AND block-outs. Rows
// are never deleted — 'cancelled' keeps the audit trail and frees the slot
// (the partial unique index only covers status = 'booked').
export async function onRequestDelete({ env, params }) {
  const r = await env.DB.prepare(
    "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status IN ('booked', 'blocked')"
  ).bind(Number(params.id)).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
