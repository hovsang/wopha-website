import { json } from "../_lib/respond.js";
import { facilityById } from "../_lib/bookings.js";
import { verifyCancelToken } from "../_lib/booking-token.js";

// Token-gated cancel path for residents (no accounts: the emailed/displayed
// link IS the credential). Returns only slot details — the token holder
// already knows who they are, so no name/email/address ever comes back.
// Bad token and missing row are the same 404, and block-outs are filtered
// out so the public path can never touch a board block.

const NOT_VALID = { error: "This cancel link is not valid" };

async function lookup(env, id) {
  return env.DB.prepare(
    "SELECT facility, date, start_time, end_time, status FROM bookings WHERE id = ? AND status != 'blocked'"
  ).bind(id).first();
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  const token = url.searchParams.get("token") || "";
  if (!Number.isInteger(id) || id <= 0 || !(await verifyCancelToken(env, id, token))) {
    return json(NOT_VALID, 404);
  }
  const row = await lookup(env, id);
  if (!row) return json(NOT_VALID, 404);
  const f = facilityById(row.facility);
  return json({
    facility: row.facility,
    label: f ? f.label : row.facility,
    date: row.date,
    start: row.start_time,
    end: row.end_time,
    status: row.status,
  });
}

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0 || !(await verifyCancelToken(env, id, input.token))) {
    return json(NOT_VALID, 404);
  }
  const row = await env.DB.prepare(
    "SELECT status FROM bookings WHERE id = ? AND status != 'blocked'"
  ).bind(id).first();
  if (!row) return json(NOT_VALID, 404);
  if (row.status === "booked") {
    await env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").bind(id).run();
  }
  return json({ ok: true }); // idempotent: already-cancelled stays cancelled
}
