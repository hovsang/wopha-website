import { json } from "../_lib/respond.js";
import {
  FACILITIES, facilityById, availability, bookingRules, etParts,
  validateBookingRequest, windowError, limitError, weekBounds,
} from "../_lib/bookings.js";
import { cancelToken } from "../_lib/booking-token.js";

// Public availability: busy/free ONLY. No names, emails, or addresses ever
// leave this endpoint — residents see that a slot is taken, never by whom.
//
// Rate limiting, considered: the per-household booking limits enforced in the
// POST below ARE the meaningful cap (an email can never hold more slots than
// the daily/weekly rules allow; further attempts are 409s), plus the
// botcheck honeypot. IP-based limiting is deliberately out of scope this
// phase: it would need a per-request D1/KV counter for a neighborhood-scale
// site, and Cloudflare's edge WAF rate-limiting rules can be enabled with
// zero code changes if abuse ever shows up.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("facility") || FACILITIES[0].id;
  const facility = facilityById(id);
  if (!facility) return json({ error: "Unknown facility" }, 400);
  const rules = await bookingRules(env);
  const now = Date.now();
  const first = etParts(now).date;
  const last = etParts(now + rules.booking_window_hours * 3600000).date;
  const { results } = await env.DB.prepare(
    `SELECT date, start_time, end_time FROM bookings
     WHERE facility = ? AND status IN ('booked', 'blocked') AND date BETWEEN ? AND ?`
  ).bind(facility.id, first, last).all();
  return json({
    facilities: FACILITIES.map((f) => ({ id: f.id, label: f.label })),
    facility: facility.id,
    window_hours: rules.booking_window_hours,
    days: availability(facility, results, now, rules.booking_window_hours),
  });
}

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => null);
  if (!input) return json({ error: "Bad request" }, 400);
  if (input.botcheck) return json({ error: "Rejected" }, 400);
  const check = validateBookingRequest(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const b = check.value;
  const facility = facilityById(b.facility);
  const rules = await bookingRules(env);
  const now = Date.now();
  const winErr = windowError(b.date, b.start, now, rules.booking_window_hours);
  if (winErr) return json({ error: winErr }, 400);

  // Per-household limits: fetch the requester's active bookings from the
  // earlier of today / the requested week's Monday (weekly caps need the
  // whole week, pavilion caps need today-forward; limitError sorts it out).
  const today = etParts(now).date;
  const wk = weekBounds(b.date);
  const fromDate = wk.start < today ? wk.start : today;
  const mine = await env.DB.prepare(
    "SELECT facility, date FROM bookings WHERE email = ? AND status = 'booked' AND date >= ?"
  ).bind(b.email, fromDate).all();
  const limErr = limitError(facility, b.date, today, mine.results, rules);
  if (limErr) return json({ error: limErr }, 409);

  // Slot conflict: any active overlap (grid bookings or arbitrary blocks).
  const clash = await env.DB.prepare(
    `SELECT id FROM bookings
     WHERE facility = ? AND date = ? AND status IN ('booked', 'blocked')
       AND start_time < ? AND end_time > ?`
  ).bind(b.facility, b.date, b.end, b.start).first();
  if (clash) return json({ error: "That time was just taken. Pick another slot." }, 409);

  let id;
  try {
    const r = await env.DB.prepare(
      `INSERT INTO bookings (facility, date, start_time, end_time, name, email, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(b.facility, b.date, b.start, b.end, b.name, b.email, b.address).run();
    id = r.meta.last_row_id;
  } catch (_) {
    // The partial unique index caught a same-slot race.
    return json({ error: "That time was just taken. Pick another slot." }, 409);
  }

  const token = await cancelToken(env, id);
  const cancelUrl = new URL("/amenities/booking-cancel/?id=" + id + "&token=" + token, request.url).toString();

  // Best-effort notification, same degrade-gracefully contract as
  // forms/submit.js: the booking is already stored, so a Web3Forms outage or
  // an unset key must never fail the resident's request. The email goes to
  // the board inbox; replyto lets a dashboard-configured auto-response reach
  // the resident, and the UI shows the cancel link directly either way.
  if (env.WEB3FORMS_KEY) {
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject: "WOPHA facility booking",
          facility: facility.label,
          date: b.date,
          time: b.start + " to " + b.end,
          name: b.name,
          email: b.email,
          address: b.address,
          replyto: b.email,
          cancel_link: cancelUrl,
        }),
      });
    } catch (_) { /* ignore */ }
  }

  return json({ ok: true, id, cancel_url: cancelUrl });
}
