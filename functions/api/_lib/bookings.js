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
