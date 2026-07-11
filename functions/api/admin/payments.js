import { json } from "../_lib/respond.js";
import { validatePayment } from "../_lib/validate.js";

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validatePayment(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const v = check.value;
  try {
    const r = await env.DB.prepare(
      "INSERT INTO payments (household_id, year, amount_cents, method, paid_on, note) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(v.household_id, v.year, v.amount_cents, v.method, v.paid_on, v.note).run();
    return json({ id: r.meta.last_row_id }, 201);
  } catch (e) {
    const msg = String(e && e.message);
    if (msg.includes("UNIQUE")) return json({ error: "Already marked paid for that year" }, 409);
    if (msg.includes("FOREIGN KEY")) return json({ error: "Unknown household" }, 400);
    throw e;
  }
}
