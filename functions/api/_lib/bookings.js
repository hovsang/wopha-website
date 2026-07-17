// Facility definitions + pure booking logic: slot grids, the booking window,
// availability, per-household limits, request validation. Times are "HH:MM"
// 24-hour strings and dates are "YYYY-MM-DD" — zero-padded, so plain string
// comparison orders them and no Date math touches slots. Wall-clock reasoning
// uses America/New_York (the neighborhood's clock; Workers run in UTC).
//
// The facility list is a code constant on purpose (the CONTENT_KEYS /
// SETTING_KEYS pattern): the board tunes the RULES via settings keys
// (booking_window_hours, booking_daily_limit, booking_weekly_limit), not the
// facility list. The pickleball lines are separate amenities that do not
// cross-block court-2, mirroring ReserveMyCourt's current setup.
export const FACILITIES = [
  { id: "court-1", label: "Tennis court 1", group: "court", open: "07:00", close: "23:00", slotMinutes: 90 },
  { id: "court-2", label: "Tennis court 2", group: "court", open: "07:00", close: "23:00", slotMinutes: 90 },
  { id: "pickleball-2a", label: "Pickleball 2A", group: "court", open: "07:00", close: "23:00", slotMinutes: 90 },
  { id: "pickleball-2b", label: "Pickleball 2B", group: "court", open: "07:00", close: "23:00", slotMinutes: 90 },
  { id: "pavilion", label: "Pavilion", group: "pavilion", open: "09:00", close: "21:00", slotMinutes: 180 },
];
export const FACILITY_IDS = FACILITIES.map((f) => f.id);

export function facilityById(id) {
  return FACILITIES.find((f) => f.id === id) || null;
}

function toMin(hhmm) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}
function toHhmm(min) {
  return String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");
}

// Fixed grid: slotMinutes-long slots from open; a slot must END by close.
// Courts: 07:00..20:30 starts (the 22:00-23:00 hour stays walk-on).
export function slotsFor(facility) {
  const out = [];
  const close = toMin(facility.close);
  for (let s = toMin(facility.open); s + facility.slotMinutes <= close; s += facility.slotMinutes) {
    out.push({ start: toHhmm(s), end: toHhmm(s + facility.slotMinutes) });
  }
  return out;
}

// Half-open ranges: touching slots (end == start) do not overlap.
export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Wall-clock date + time in America/New_York for an epoch-ms instant.
export function etParts(ms) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const p = {};
  for (const x of parts) p[x.type] = x.value;
  return { date: p.year + "-" + p.month + "-" + p.day, time: p.hour + ":" + p.minute };
}

// Every calendar date from `from` to `to` inclusive (pure date strings, so
// UTC arithmetic is safe here).
export function dateRange(from, to) {
  const out = [];
  let t = Date.parse(from + "T00:00:00Z");
  const end = Date.parse(to + "T00:00:00Z");
  for (; t <= end; t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

// Availability for one facility across the whole booking window. activeRows
// are that facility's booked/blocked rows: [{date, start_time, end_time}].
// Output is busy/free ONLY — never any PII (spec §5 hard rule).
export function availability(facility, activeRows, nowMs, windowHours) {
  const now = etParts(nowMs);
  const last = etParts(nowMs + windowHours * 3600000);
  const grid = slotsFor(facility);
  return dateRange(now.date, last.date).map((date) => ({
    date,
    slots: grid.map((slot) => {
      const busy = activeRows.some((r) =>
        r.date === date && overlaps(slot.start, slot.end, r.start_time, r.end_time));
      const key = date + " " + slot.start;
      const bookable = !busy &&
        key >= now.date + " " + now.time &&
        key <= last.date + " " + last.time;
      return { start: slot.start, end: slot.end, busy, bookable };
    }),
  }));
}

// Board-tunable booking rules (portal settings keys) with code-constant
// fallbacks. The pavilion cap is fixed: PAVILION_LIMIT upcoming reservation(s)
// per household.
export const RULE_DEFAULTS = {
  booking_window_hours: 48,
  booking_daily_limit: 1,
  booking_weekly_limit: 3,
};
export const PAVILION_LIMIT = 1;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// One query for all three rules; a missing settings table means defaults, so
// deploy order can never break booking.
export async function bookingRules(env) {
  const out = Object.assign({}, RULE_DEFAULTS);
  try {
    const { results } = await env.DB.prepare(
      "SELECT key, value FROM settings WHERE key IN ('booking_window_hours', 'booking_daily_limit', 'booking_weekly_limit')"
    ).all();
    for (const r of results) {
      const s = String(r.value);
      if (/^\d+$/.test(s) && Number(s) > 0) out[r.key] = Number(s);
    }
  } catch (_) { /* settings table not deployed yet: defaults */ }
  return out;
}

// Residents book from now up to windowHours ahead (RMC's 48-hour policy).
export function windowError(date, start, nowMs, windowHours) {
  const now = etParts(nowMs);
  const last = etParts(nowMs + windowHours * 3600000);
  const key = date + " " + start;
  if (key < now.date + " " + now.time) return "That time has already passed.";
  if (key > last.date + " " + last.time) {
    return "Bookings open " + windowHours + " hours ahead. That time is not open yet.";
  }
  return null;
}

// Monday-to-Sunday calendar week containing the date (the same week the pool
// guest policy uses).
export function weekBounds(date) {
  const t = Date.parse(date + "T00:00:00Z");
  const sinceMonday = (new Date(t).getUTCDay() + 6) % 7;
  return {
    start: new Date(t - sinceMonday * 86400000).toISOString().slice(0, 10),
    end: new Date(t + (6 - sinceMonday) * 86400000).toISOString().slice(0, 10),
  };
}

// Per-household caps, keyed on email. rows = the requester's active
// (status='booked') bookings fetched from the week start / today onward:
// [{facility, date}]. Returns an error string or null. These caps double as
// the rate limit — one email can never hold more slots than the rules allow.
export function limitError(facility, date, todayDate, rows, rules) {
  if (facility.group === "pavilion") {
    const upcoming = rows.filter((r) => r.facility === "pavilion" && r.date >= todayDate);
    if (upcoming.length >= PAVILION_LIMIT) {
      return "One upcoming pavilion reservation per household. Cancel the existing one first.";
    }
    return null;
  }
  const courts = rows.filter((r) => {
    const f = facilityById(r.facility);
    return f && f.group === "court";
  });
  if (courts.filter((r) => r.date === date).length >= rules.booking_daily_limit) {
    return "Court bookings are limited to " + rules.booking_daily_limit + " per day per household.";
  }
  const wk = weekBounds(date);
  if (courts.filter((r) => r.date >= wk.start && r.date <= wk.end).length >= rules.booking_weekly_limit) {
    return "Court bookings are limited to " + rules.booking_weekly_limit + " per week per household.";
  }
  return null;
}

// Shape validation for POST /api/bookings (validate.js conventions: returns
// {ok, value|error}). The slot must sit on the facility's grid — the server
// derives the end time, so clients can never submit arbitrary ranges.
export function validateBookingRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Bad input" };
  const facility = facilityById(String(input.facility || ""));
  if (!facility) return { ok: false, error: "Unknown facility" };
  const date = String(input.date || "");
  if (!DATE_RE.test(date)) return { ok: false, error: "date must be YYYY-MM-DD" };
  const start = String(input.start || "");
  const slot = TIME_RE.test(start) ? slotsFor(facility).find((s) => s.start === start) : null;
  if (!slot) return { ok: false, error: "Pick a time from the schedule" };
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const address = String(input.address || "").trim();
  if (!name || name.length > 200) return { ok: false, error: "Name is required (max 200 characters)" };
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, error: "A valid email is required" };
  if (!address || address.length > 200) return { ok: false, error: "Address is required (max 200 characters)" };
  return { ok: true, value: { facility: facility.id, date, start: slot.start, end: slot.end, name, email, address } };
}

// Board block-outs: any HH:MM range (a swim meet can run 08:00-13:45, not
// grid-locked), one facility or "all".
export function validateBlockout(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Bad input" };
  const one = facilityById(String(input.facility || ""));
  const ids = input.facility === "all" ? FACILITY_IDS : one ? [one.id] : null;
  if (!ids) return { ok: false, error: "Unknown facility" };
  const date = String(input.date || "");
  if (!DATE_RE.test(date)) return { ok: false, error: "date must be YYYY-MM-DD" };
  const start = String(input.start || "");
  const end = String(input.end || "");
  if (!TIME_RE.test(start) || !TIME_RE.test(end) || start >= end) {
    return { ok: false, error: "start and end must be HH:MM with start before end" };
  }
  const reason = String(input.reason || "").trim();
  if (!reason || reason.length > 200) return { ok: false, error: "Reason is required (max 200 characters)" };
  return { ok: true, value: { facilities: ids, date, start, end, reason } };
}
