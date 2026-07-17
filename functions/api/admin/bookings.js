import { json } from "../_lib/respond.js";
import { FACILITIES, validateBlockout, etParts } from "../_lib/bookings.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 60;

// Board view: full booking details (the admin surface is Access-gated by
// functions/api/admin/_middleware.js, so PII is fine HERE and only here).
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from") || "";
  const from = DATE_RE.test(fromParam) ? fromParam : etParts(Date.now()).date;
  let days = Number(url.searchParams.get("days")) || 14;
  if (!Number.isInteger(days) || days < 1) days = 14;
  if (days > MAX_DAYS) days = MAX_DAYS;
  const to = new Date(Date.parse(from + "T00:00:00Z") + (days - 1) * 86400000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    `SELECT id, facility, date, start_time, end_time, name, email, address, status, created_at
     FROM bookings
     WHERE status IN ('booked', 'blocked') AND date BETWEEN ? AND ?
     ORDER BY date, start_time, facility`
  ).bind(from, to).all();
  return json({
    from,
    days,
    facilities: FACILITIES.map((f) => ({ id: f.id, label: f.label })),
    bookings: results,
  });
}

// Block-outs (swim meets, maintenance): rows with status 'blocked'. They show
// as busy on the public calendar and conflict-block new bookings; existing
// bookings in the window are NOT auto-cancelled (the board cancels them
// one by one from the list, each with the resident's email in view).
export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateBlockout(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const v = check.value;
  const stmts = v.facilities.map((fid) =>
    env.DB.prepare(
      `INSERT INTO bookings (facility, date, start_time, end_time, name, status)
       VALUES (?, ?, ?, ?, ?, 'blocked')`
    ).bind(fid, v.date, v.start, v.end, v.reason)
  );
  await env.DB.batch(stmts);
  return json({ ok: true, created: stmts.length });
}
