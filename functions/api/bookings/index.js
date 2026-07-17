import { json } from "../_lib/respond.js";
import {
  FACILITIES, facilityById, availability, bookingRules, etParts,
} from "../_lib/bookings.js";

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
