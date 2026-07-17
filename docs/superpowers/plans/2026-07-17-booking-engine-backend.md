# Booking Engine — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete server side of the facility booking engine (spec 2026-07-17 §5): the `bookings` D1 table, facility/slot/limit logic, signed cancel tokens, the public `/api/bookings` endpoints (availability, book, cancel), and the Access-gated admin bookings API (list, block-out, cancel/override) — replacing ReserveMyCourt's backend role with zero resident accounts and zero payments.

**Architecture:** Everything follows the existing Cloudflare Pages Functions shape: file-routed handlers in `functions/api/` (public) and `functions/api/admin/` (auto-gated by the existing `_middleware.js`), pure logic in `functions/api/_lib/`, D1 (binding `DB`) as the store. Facilities are a code-constant allowlist (the same pattern as `CONTENT_KEYS`/`SETTING_KEYS`); the board tunes the booking RULES (window, per-household limits) through three new settings keys. Block-outs are ordinary `bookings` rows with `status = 'blocked'` — they render as busy publicly and conflict-check like bookings, so no second table or code path exists.

**Tech Stack:** Plain ES-module JS (Cloudflare Pages Functions), D1/SQLite, Web Crypto (HMAC-SHA256 cancel tokens), vitest with the existing `tests/helpers/fake-db.js` stub, ESLint, wrangler.

**Spec:** `docs/superpowers/specs/2026-07-17-saas-pricing-amenities-design.md` §5. The public/portal UI is the separate plan `docs/superpowers/plans/2026-07-17-booking-engine-ui.md`, which consumes the Interface contract below and must run AFTER this plan.

## Global Constraints

- Copy rules for ALL user-visible text: no em dashes; no governance/volunteer editorializing; page titles use the "Page | Woods of Parkview HOA" pipe style.
- Nothing tier/price/SaaS-commercial in public src/ pages.
- No money handling in this feature at all (bookings are free; pool-party fees stay offline in this phase).
- Dynamic DOM rendering uses textContent only (never innerHTML with user/db data); async DOM updates use the portal's isConnected/capture guards convention.
- WCAG 2.2 AA (the availability calendar must be keyboard-navigable and screen-reader usable).
- TDD with vitest (suite currently 76 green: npm test); eslint clean (npm run lint); frequent commits.
- Eleventy build: src/ → _site via npm run build; public pages use base.njk; portal pages use portal-base.njk with pageKey front matter.
- Dev server ports 8200-8202 ONLY (Hyper-V reserves 8078-8177/8278-8777/8779-8978; workerd crashes on them).
- Branch redesign-experiment; commit messages follow the repo's existing conventional style (see git log).
- New secrets/env vars and D1 changes get documented in docs/launch-checklist.md (read §6/§7 there) and applied to the remote D1 as an execution step.
- NEVER push `master` or `redesign-experiment` (docs/ holds private board pricing). All commands run from the repo root. Use `npx wrangler ...`, never a global install.
- The backup worker stays dependency-free: `workers/backup/index.js` never imports from `functions/`; its `TABLES` list is intentionally duplicated in `functions/api/admin/export.js` and the drift test in `tests/backup.test.js` is the tripwire.

**Cross-track note:** the `sponsorship-safety` and `proposal-pricing` plans also append to `SETTING_KEYS`/`FORM_TYPES`, `tests/settings.test.js` expectations, and `eslint.config.mjs` globals. All edits in this plan are written as ADDITIVE ("add these entries"), so they compose in any track order. Test-count totals below assume the 76-test baseline; if another track landed first, its added tests shift the absolute totals — the per-task DELTA is the number that must hold.

## Locked design decisions

- **Times** are `"HH:MM"` 24-hour strings, **dates** are `"YYYY-MM-DD"` — zero-padded, so plain string `<`/`>` comparisons order correctly and no Date math touches slots. All wall-clock reasoning uses **America/New_York** (the neighborhood's clock; Workers run UTC).
- **Facilities (5):** `court-1` "Tennis court 1", `court-2` "Tennis court 2", `pickleball-2a` "Pickleball 2A", `pickleball-2b` "Pickleball 2B" (RMC lists the pickleball lines as separate amenities, mirrored here; they do not cross-block court-2, matching RMC's current behavior), `pavilion` "Pavilion". Courts: 90-minute grid slots from 07:00, last slot 20:30-22:00 (the 22:00-23:00 hour stays walk-on, as on RMC today). Pavilion: 3-hour slots 09:00-21:00.
- **Block-outs** are rows with `status = 'blocked'`: arbitrary (non-grid) time ranges, reason stored in `name`, `email`/`address` empty. Public availability shows them as busy; they are excluded from the public cancel path.
- **Cancel token:** hex HMAC-SHA256 over `"wopha-booking-cancel:" + id`, secret `BOOKING_TOKEN_SECRET` (name locked by the orchestrator), Web Crypto, constant-time verify, dev-only fallback secret so local dev works unset. No expiry: a token dies with its booking date.
- **Rules** (settings keys, board-tunable): `booking_window_hours` (default 48 — mirrors RMC's "book up to 48 hours in advance"), `booking_daily_limit` (default 1 court slot/day/household), `booking_weekly_limit` (default 3/week, Monday-Sunday week — the same week definition the pool guest policy already uses). Pavilion: fixed 1 upcoming reservation per household (`PAVILION_LIMIT` constant). Limits key on lowercased email = "household".
- **Rate limiting, considered:** per-household caps ARE the rate limit — one email can never hold more than the daily/weekly rules allow, extra POSTs are 409s, and the honeypot rejects dumb bots. IP-based limiting is out of scope this phase: it needs a per-request D1/KV counter for a neighborhood-scale site, and Cloudflare's edge WAF rate-limiting rules can be enabled with zero code if abuse ever appears. This rationale lives as a comment in `functions/api/bookings/index.js`.
- **Double-booking race:** a partial UNIQUE index on `(facility, date, start_time) WHERE status = 'booked'` makes the second of two concurrent same-slot INSERTs fail; the handler maps that to 409. Cancelled rows free the slot; blocks (which can span many slots) are exempt.
- **Confirmation email:** the existing Web3Forms degrade-gracefully path (`functions/api/forms/submit.js` pattern). The notification goes to the board inbox with the resident's details and cancel link; `replyto` carries the resident's email so a dashboard-configured auto-response can reach them. No key set → no email, booking still succeeds, and the UI shows the cancel link directly.

## Interface contract (the UI plan consumes these EXACT shapes — do not rename)

- `FACILITIES` / `FACILITY_IDS` / `RULE_DEFAULTS` / `facilityById(id)` exported from `functions/api/_lib/bookings.js`.
- `GET /api/bookings?facility=<id>` (absent → first facility; unknown → 400) → 200:
  `{"facilities":[{"id":"court-1","label":"Tennis court 1"},...],"facility":"court-1","window_hours":48,"days":[{"date":"2026-07-17","slots":[{"start":"07:00","end":"08:30","busy":false,"bookable":false},...]},...]}` — days cover every ET date from today through now+window; NO PII fields ever.
- `POST /api/bookings` JSON `{facility,date,start,name,email,address,botcheck:""}` → 200 `{"ok":true,"id":42,"cancel_url":"https://.../amenities/booking-cancel/?id=42&token=<64-hex>"}` | 400 `{"error"}` (bad input, honeypot, outside window) | 409 `{"error"}` (slot taken, household limit).
- `GET /api/bookings/cancel?id=N&token=T` → 200 `{"facility","label","date","start","end","status"}` (status `booked`|`cancelled`; never name/email/address) | 404 `{"error":"This cancel link is not valid"}`.
- `POST /api/bookings/cancel` JSON `{id,token}` → 200 `{"ok":true}` (idempotent) | 404.
- `GET /api/admin/bookings?from=YYYY-MM-DD&days=N` (defaults: today ET, 14; max 60) → 200 `{"from","days","facilities":[{"id","label"}],"bookings":[{id,facility,date,start_time,end_time,name,email,address,status,created_at},...]}` — status `booked`|`blocked` only, ordered by date, start_time, facility.
- `POST /api/admin/bookings` JSON `{facility:<id>|"all",date,start,end,reason}` → 200 `{"ok":true,"created":n}` | 400.
- `DELETE /api/admin/bookings/:id` → 200 `{"ok":true}` | 404. Sets status to `cancelled` (bookings AND blocks; rows are never deleted).
- Settings: `GET /api/admin/settings` additionally returns `booking_window_hours` ("48"), `booking_daily_limit` ("1"), `booking_weekly_limit` ("3") as strings; `PUT` accepts them (whole numbers, 1..336 for the window, 1..50 for the limits).

## File structure

```
Create:
functions/api/_lib/bookings.js           facilities + slot grid + window + limits + validation (Tasks 2, 3)
functions/api/_lib/booking-token.js      HMAC cancel tokens (Task 4)
functions/api/bookings/index.js          public GET availability + POST book (Tasks 5, 6)
functions/api/bookings/cancel.js         token-gated GET lookup + POST cancel (Task 7)
functions/api/admin/bookings.js          board list + block-out create (Task 8)
functions/api/admin/bookings/[id].js     board cancel/override (Task 8)
tests/bookings.test.js                   pure-logic tests (Tasks 2, 3)
tests/booking-token.test.js              (Task 4)
tests/bookings-api.test.js               public handler tests (Tasks 5, 6)
tests/bookings-cancel.test.js            (Task 7)
tests/admin-bookings.test.js             (Task 8)

Modify:
schema.sql                               bookings table + indexes (Task 1)
seed.sql                                 demo bookings (Task 1)
workers/backup/index.js                  TABLES gains "bookings" (Task 1)
functions/api/admin/export.js            TABLES gains "bookings" (Task 1)
functions/api/_lib/validate.js           SETTING_KEYS + booking-rule branch (Task 3)
functions/api/admin/settings.js          DEFAULTS gains the three rule keys (Task 3)
tests/validate.test.js                   booking-rule settings test (Task 3)
tests/settings.test.js                   GET expectations gain the rule keys (Task 3)
eslint.config.mjs                        crypto + TextEncoder globals (Task 4)
docs/launch-checklist.md                 secret + remote-schema steps (Task 9)
```

---

### Task 1: `bookings` table — schema, seed, backup TABLES drift

**Files:**
- Modify: `schema.sql`, `seed.sql`, `workers/backup/index.js:8`, `functions/api/admin/export.js:5`
- Test: `tests/backup.test.js` (existing drift test is the tripwire — no new test code)

**Interfaces:**
- Consumes: the drift test in `tests/backup.test.js`, which regex-collects `CREATE TABLE IF NOT EXISTS (\w+)` names from `schema.sql` and compares against BOTH duplicated `TABLES` lists.
- Produces: D1 table `bookings (id, facility, date, start_time, end_time, name, email, address, status, created_at)`; partial unique index `idx_bookings_slot`; both `TABLES` lists include `"bookings"`; demo seed rows.

- [ ] **Step 1: Add the table to `schema.sql`** — append after the `settings` block, before the `CREATE INDEX` lines:

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility TEXT NOT NULL,           -- allowlisted in _lib/bookings.js (FACILITY_IDS)
  date TEXT NOT NULL,               -- YYYY-MM-DD
  start_time TEXT NOT NULL,         -- HH:MM, 24-hour
  end_time TEXT NOT NULL,           -- HH:MM, 24-hour
  name TEXT NOT NULL DEFAULT '',    -- household name; block-out reason when status = 'blocked'
  email TEXT NOT NULL DEFAULT '',   -- stored lowercased; '' for block-outs
  address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'booked',  -- booked | cancelled | blocked
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

And append to the index lines at the bottom of the file:

```sql
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
-- Same-slot double-booking guard: of two concurrent booking POSTs, the second
-- INSERT fails (handler maps it to 409). Only live resident bookings
-- participate: cancelled rows free the slot, and block-outs may span slots.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot
  ON bookings(facility, date, start_time) WHERE status = 'booked';
```

- [ ] **Step 2: Verify the drift test trips** — run `npm test`. Expect exactly the two `backup/export table drift` tests to FAIL (`expected [...] to deeply equal [..., 'bookings', ...]`) and everything else to pass (74 passed, 2 failed). This proves the tripwire works for `bookings` exactly as it did for `settings`.

- [ ] **Step 3: Extend BOTH duplicated TABLES lists** — in `workers/backup/index.js` line 8 AND `functions/api/admin/export.js` line 5 (the duplication is deliberate; the comments above each line explain why — leave them):

```js
export const TABLES = ["announcements", "submissions", "households", "payments", "site_content", "settings", "bookings"];
```

- [ ] **Step 4: Verify green** — run `npm test`: expect `Tests  76 passed (76)`. Run `npm run lint`: clean.

- [ ] **Step 5: Seed demo rows** — append to `seed.sql` (dynamic dates keep the demo near-future forever; seed only runs on fresh DBs):

```sql
INSERT INTO bookings (facility, date, start_time, end_time, name, email, address, status) VALUES
  ('court-1', date('now', '+1 day'), '17:30', '19:00', 'Alex Morgan', 'alex@example.com', '101 Planters Way', 'booked'),
  ('pavilion', date('now', '+1 day'), '12:00', '15:00', 'Casey Diaz', 'casey@example.com', '105 Planters Way', 'booked'),
  ('pavilion', date('now', '+2 day'), '09:00', '21:00', 'Swim meet', '', '', 'blocked');
```

- [ ] **Step 6: Apply the schema locally**

```
npm run db:schema
npx wrangler d1 execute wopha --local --command "SELECT name FROM sqlite_master WHERE name IN ('bookings', 'idx_bookings_slot')"
```

Expect two rows: `bookings` and `idx_bookings_slot`. (Do NOT re-run `npm run db:seed` on an existing local DB — the households INSERTs violate UNIQUE on re-run.)

- [ ] **Step 7: Commit**

```bash
git add schema.sql seed.sql workers/backup/index.js functions/api/admin/export.js
git commit -m "bookings table: schema + seed, backup/export TABLES extended (drift test green)"
```

---

### Task 2: facilities, slot grids, ET clock, availability (`_lib/bookings.js` part 1)

**Files:**
- Create: `functions/api/_lib/bookings.js`, `tests/bookings.test.js`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `FACILITIES` (array of `{id, label, group, open, close, slotMinutes}`), `FACILITY_IDS`, `facilityById(id) → facility|null`, `slotsFor(facility) → [{start, end}]`, `overlaps(aStart, aEnd, bStart, bEnd) → bool`, `etParts(ms) → {date, time}` (America/New_York wall clock), `dateRange(from, to) → [dates]`, `availability(facility, activeRows, nowMs, windowHours) → [{date, slots: [{start, end, busy, bookable}]}]`.

- [ ] **Step 1: Write the failing tests** — create `tests/bookings.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  FACILITY_IDS, facilityById, slotsFor, overlaps, etParts, dateRange, availability,
} from "../functions/api/_lib/bookings.js";

describe("FACILITIES", () => {
  it("defines the five bookable facilities with unique ids", () => {
    expect(FACILITY_IDS).toEqual(["court-1", "court-2", "pickleball-2a", "pickleball-2b", "pavilion"]);
    expect(new Set(FACILITY_IDS).size).toBe(5);
    expect(facilityById("court-1").label).toBe("Tennis court 1");
    expect(facilityById("nope")).toBe(null);
  });
});

describe("slotsFor", () => {
  it("builds the court grid: 90-minute slots from 07:00, last slot 20:30 to 22:00", () => {
    const slots = slotsFor(facilityById("court-1"));
    expect(slots.length).toBe(10);
    expect(slots[0]).toEqual({ start: "07:00", end: "08:30" });
    expect(slots[9]).toEqual({ start: "20:30", end: "22:00" });
  });
  it("builds the pavilion grid: 3-hour slots from 09:00 to 21:00", () => {
    expect(slotsFor(facilityById("pavilion"))).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "12:00", end: "15:00" },
      { start: "15:00", end: "18:00" },
      { start: "18:00", end: "21:00" },
    ]);
  });
});

describe("overlaps", () => {
  it("detects overlapping ranges and allows touching ones", () => {
    expect(overlaps("07:00", "08:30", "08:00", "09:30")).toBe(true);
    expect(overlaps("07:00", "08:30", "08:30", "10:00")).toBe(false);
    expect(overlaps("08:00", "13:45", "08:30", "10:00")).toBe(true);
  });
});

describe("etParts", () => {
  it("renders an instant as an America/New_York wall-clock date and time", () => {
    expect(etParts(Date.UTC(2026, 6, 17, 16, 30))).toEqual({ date: "2026-07-17", time: "12:30" }); // EDT, UTC-4
    expect(etParts(Date.UTC(2026, 0, 15, 2, 0))).toEqual({ date: "2026-01-14", time: "21:00" });   // EST, UTC-5
  });
});

describe("dateRange", () => {
  it("lists every date from from to to inclusive, across month ends", () => {
    expect(dateRange("2026-07-30", "2026-08-01")).toEqual(["2026-07-30", "2026-07-31", "2026-08-01"]);
    expect(dateRange("2026-07-17", "2026-07-17")).toEqual(["2026-07-17"]);
  });
});

describe("availability", () => {
  // Friday 2026-07-17 11:00 ET (15:00 UTC); a 48-hour window ends Sunday 11:00 ET.
  const NOW = Date.UTC(2026, 6, 17, 15, 0);
  it("covers every ET date in the window and marks overlapping rows busy", () => {
    const days = availability(facilityById("court-1"), [
      { date: "2026-07-18", start_time: "08:30", end_time: "10:00" },  // a grid booking
      { date: "2026-07-18", start_time: "12:00", end_time: "16:00" },  // a block-out spanning slots
    ], NOW, 48);
    expect(days.map((d) => d.date)).toEqual(["2026-07-17", "2026-07-18", "2026-07-19"]);
    const sat = days[1].slots;
    expect(sat.find((s) => s.start === "08:30").busy).toBe(true);
    expect(sat.find((s) => s.start === "11:30").busy).toBe(true);  // 11:30-13:00 clips the block
    expect(sat.find((s) => s.start === "14:30").busy).toBe(true);  // 14:30-16:00 clips the block
    expect(sat.find((s) => s.start === "16:00").busy).toBe(false); // touching, not overlapping
    expect(sat.find((s) => s.start === "07:00").busy).toBe(false);
  });
  it("marks past and beyond-window slots not bookable, and carries no PII fields", () => {
    const days = availability(facilityById("court-1"), [], NOW, 48);
    const today = days[0].slots;
    expect(today.find((s) => s.start === "10:00").bookable).toBe(false); // starts before 11:00 now
    expect(today.find((s) => s.start === "11:30").bookable).toBe(true);
    const lastDay = days[2].slots;
    expect(lastDay.find((s) => s.start === "10:00").bookable).toBe(true);  // before the 11:00 cutoff
    expect(lastDay.find((s) => s.start === "11:30").bookable).toBe(false); // beyond the 48-hour window
    expect(Object.keys(today[0]).sort()).toEqual(["bookable", "busy", "end", "start"]);
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/bookings.test.js` to fail to load with a module-resolution error mentioning `functions/api/_lib/bookings.js`. Rest of the suite: 76 passed.

- [ ] **Step 3: Implement** — create `functions/api/_lib/bookings.js`:

```js
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
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  84 passed (84)`. Run `npm run lint`: clean.

- [ ] **Step 5: Commit**

```bash
git add functions/api/_lib/bookings.js tests/bookings.test.js
git commit -m "_lib/bookings.js: facilities, slot grids, ET clock, busy/free availability"
```

---

### Task 3: booking validation, per-household limits, rule settings keys (`_lib/bookings.js` part 2)

**Files:**
- Modify: `functions/api/_lib/bookings.js`, `functions/api/_lib/validate.js`, `functions/api/admin/settings.js`
- Test: `tests/bookings.test.js`, `tests/validate.test.js`, `tests/settings.test.js`

**Interfaces:**
- Consumes: `FACILITY_IDS`, `facilityById`, `slotsFor`, `etParts` (Task 2); `fakeDb` from `tests/helpers/fake-db.js`.
- Produces:
  - `RULE_DEFAULTS = { booking_window_hours: 48, booking_daily_limit: 1, booking_weekly_limit: 3 }` and `PAVILION_LIMIT = 1`.
  - `bookingRules(env) → Promise<{booking_window_hours, booking_daily_limit, booking_weekly_limit}>` (integers; settings-driven with defaults; survives a missing settings table).
  - `windowError(date, start, nowMs, windowHours) → string|null`.
  - `weekBounds(date) → {start, end}` (Monday..Sunday).
  - `limitError(facility, date, todayDate, rows, rules) → string|null` — rows are the requester's active `{facility, date}` bookings.
  - `validateBookingRequest(input) → {ok, value:{facility,date,start,end,name,email,address}|error}` (derives `end` from the grid; lowercases/trims email).
  - `validateBlockout(input) → {ok, value:{facilities:[ids],date,start,end,reason}|error}` (`"all"` expands to `FACILITY_IDS`).
  - `SETTING_KEYS` includes the three `booking_*` keys; `validateSetting` accepts them (1..336 window, 1..50 limits); settings GET returns them with defaults.

- [ ] **Step 1: Write the failing pure-logic tests** — append to `tests/bookings.test.js`. First replace the import block at the top of the file with:

```js
import { describe, it, expect } from "vitest";
import {
  FACILITY_IDS, facilityById, slotsFor, overlaps, etParts, dateRange, availability,
  weekBounds, windowError, limitError, validateBookingRequest, validateBlockout, bookingRules,
} from "../functions/api/_lib/bookings.js";
import { fakeDb } from "./helpers/fake-db.js";
```

Then append at the end of the file:

```js
describe("weekBounds", () => {
  it("returns the Monday-to-Sunday week containing the date", () => {
    expect(weekBounds("2026-07-17")).toEqual({ start: "2026-07-13", end: "2026-07-19" }); // a Friday
    expect(weekBounds("2026-07-13")).toEqual({ start: "2026-07-13", end: "2026-07-19" }); // a Monday
    expect(weekBounds("2026-07-19")).toEqual({ start: "2026-07-13", end: "2026-07-19" }); // a Sunday
  });
});

describe("windowError", () => {
  const NOW = Date.UTC(2026, 6, 17, 15, 0); // Fri 2026-07-17 11:00 ET
  it("rejects past slots and slots beyond the window, allows the rest", () => {
    expect(windowError("2026-07-17", "08:30", NOW, 48)).toMatch(/already passed/);
    expect(windowError("2026-07-19", "14:30", NOW, 48)).toMatch(/not open yet/);
    expect(windowError("2026-07-18", "08:30", NOW, 48)).toBe(null);
    expect(windowError("2026-07-19", "10:00", NOW, 48)).toBe(null);
  });
});

describe("validateBookingRequest", () => {
  const good = {
    facility: "court-1", date: "2026-07-18", start: "08:30",
    name: "Alex Morgan", email: " Alex@Example.com ", address: "101 Planters Way",
  };
  it("accepts a grid slot and normalizes: derives end, lowercases and trims email", () => {
    expect(validateBookingRequest(good)).toEqual({ ok: true, value: {
      facility: "court-1", date: "2026-07-18", start: "08:30", end: "10:00",
      name: "Alex Morgan", email: "alex@example.com", address: "101 Planters Way",
    } });
  });
  it("rejects unknown facilities, off-grid times, and bad dates", () => {
    expect(validateBookingRequest({ ...good, facility: "court-9" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, start: "08:00" }).ok).toBe(false); // not on the court grid
    expect(validateBookingRequest({ ...good, start: "8:30" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, date: "07/18/2026" }).ok).toBe(false);
    expect(validateBookingRequest(null).ok).toBe(false);
  });
  it("requires name, a plausible email, and address", () => {
    expect(validateBookingRequest({ ...good, name: " " }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, email: "not-an-email" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, address: "" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, name: "x".repeat(201) }).ok).toBe(false);
  });
});

describe("validateBlockout", () => {
  const good = { facility: "pavilion", date: "2026-07-20", start: "08:00", end: "13:45", reason: "Swim meet" };
  it("accepts one facility or expands all, with any HH:MM range", () => {
    expect(validateBlockout(good)).toEqual({ ok: true, value: {
      facilities: ["pavilion"], date: "2026-07-20", start: "08:00", end: "13:45", reason: "Swim meet",
    } });
    expect(validateBlockout({ ...good, facility: "all" }).value.facilities).toEqual(FACILITY_IDS);
  });
  it("rejects bad ranges, unknown facilities, and missing reasons", () => {
    expect(validateBlockout({ ...good, start: "14:00" }).ok).toBe(false); // start >= end
    expect(validateBlockout({ ...good, facility: "gym" }).ok).toBe(false);
    expect(validateBlockout({ ...good, reason: "" }).ok).toBe(false);
    expect(validateBlockout({ ...good, end: "24:00" }).ok).toBe(false);
  });
});

describe("limitError", () => {
  const RULES = { booking_window_hours: 48, booking_daily_limit: 1, booking_weekly_limit: 3 };
  const court1 = facilityById("court-1");
  const pavilion = facilityById("pavilion");
  it("caps court bookings per day per household", () => {
    expect(limitError(court1, "2026-07-18", "2026-07-17", [{ facility: "court-2", date: "2026-07-18" }], RULES))
      .toMatch(/1 per day/);
    expect(limitError(court1, "2026-07-18", "2026-07-17", [{ facility: "court-2", date: "2026-07-17" }], RULES))
      .toBe(null);
  });
  it("caps court bookings per Monday-to-Sunday week", () => {
    const rows = [
      { facility: "court-1", date: "2026-07-13" },
      { facility: "court-2", date: "2026-07-15" },
      { facility: "pickleball-2a", date: "2026-07-16" },
    ];
    expect(limitError(court1, "2026-07-18", "2026-07-17", rows, RULES)).toMatch(/3 per week/);
    expect(limitError(court1, "2026-07-20", "2026-07-17", rows, RULES)).toBe(null); // next week
  });
  it("ignores pavilion rows for court limits and allows one upcoming pavilion booking", () => {
    expect(limitError(court1, "2026-07-18", "2026-07-17", [{ facility: "pavilion", date: "2026-07-18" }], RULES))
      .toBe(null);
    expect(limitError(pavilion, "2026-07-18", "2026-07-17", [{ facility: "pavilion", date: "2026-07-18" }], RULES))
      .toMatch(/pavilion/);
    expect(limitError(pavilion, "2026-07-18", "2026-07-17", [{ facility: "pavilion", date: "2026-07-16" }], RULES))
      .toBe(null); // a pavilion booking already in the past does not count
  });
});

describe("bookingRules", () => {
  it("prefers valid settings rows and falls back to defaults otherwise", async () => {
    const db = fakeDb([{ match: "FROM settings", results: [
      { key: "booking_window_hours", value: "72" },
      { key: "booking_daily_limit", value: "garbage" },
    ] }]);
    expect(await bookingRules({ DB: db })).toEqual({
      booking_window_hours: 72, booking_daily_limit: 1, booking_weekly_limit: 3,
    });
  });
  it("survives a missing settings table", async () => {
    const db = fakeDb([{ match: "FROM settings", error: "no such table: settings" }]);
    expect(await bookingRules({ DB: db })).toEqual({
      booking_window_hours: 48, booking_daily_limit: 1, booking_weekly_limit: 3,
    });
  });
});
```

- [ ] **Step 2: Write the failing settings tests** — in `tests/validate.test.js`, append inside the existing `describe("validateSetting", ...)` block:

```js
  it("range-checks the booking rule keys as positive whole numbers", () => {
    expect(validateSetting("booking_window_hours", "48")).toEqual({ ok: true, value: "48" });
    expect(validateSetting("booking_window_hours", "0").ok).toBe(false);
    expect(validateSetting("booking_window_hours", "337").ok).toBe(false);
    expect(validateSetting("booking_daily_limit", "2")).toEqual({ ok: true, value: "2" });
    expect(validateSetting("booking_weekly_limit", "51").ok).toBe(false);
    expect(validateSetting("booking_daily_limit", "1.5").ok).toBe(false);
  });
```

In `tests/settings.test.js`, add these three entries to BOTH exact-object GET expectations (keep every key already present, including any another track added):

```js
      booking_window_hours: "48",
      booking_daily_limit: "1",
      booking_weekly_limit: "3",
```

(The `overlays stored rows` test's expectation gains the same three lines — its stored rows don't include them, so defaults show through.)

- [ ] **Step 3: Verify the tests fail** — run `npm test`. Expect `tests/bookings.test.js` to fail to load (`does not provide an export named 'weekBounds'`), `tests/validate.test.js` to fail (`Unknown setting key`), and `tests/settings.test.js` to fail (missing keys in GET). Task 2's other files still pass.

- [ ] **Step 4: Implement the pure logic** — append to `functions/api/_lib/bookings.js`:

```js
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
```

- [ ] **Step 5: Add the settings keys** — in `functions/api/_lib/validate.js`, extend `SETTING_KEYS` by appending the three booking keys (keep any keys other tracks added):

```js
export const SETTING_KEYS = [
  "dues_cents", "dues_due_date", "quickbooks_url",
  "booking_window_hours", "booking_daily_limit", "booking_weekly_limit",
];
```

And in `validateSetting`, insert this branch AFTER the `dues_due_date` branch and BEFORE the `// quickbooks_url` fallthrough:

```js
  if (key === "booking_window_hours" || key === "booking_daily_limit" || key === "booking_weekly_limit") {
    const max = key === "booking_window_hours" ? 336 : 50;
    const n = Number(s);
    if (!/^\d+$/.test(s) || n < 1 || n > max) {
      return { ok: false, error: key + " must be a whole number from 1 to " + max };
    }
    return { ok: true, value: String(n) };
  }
```

- [ ] **Step 6: Surface the defaults** — in `functions/api/admin/settings.js`, add the import and extend `DEFAULTS` (keep any entries other tracks added):

```js
import { RULE_DEFAULTS } from "../_lib/bookings.js";
```

```js
export const DEFAULTS = {
  dues_cents: String(DUES_CENTS),
  dues_due_date: "",
  quickbooks_url: "",
  booking_window_hours: String(RULE_DEFAULTS.booking_window_hours),
  booking_daily_limit: String(RULE_DEFAULTS.booking_daily_limit),
  booking_weekly_limit: String(RULE_DEFAULTS.booking_weekly_limit),
};
```

- [ ] **Step 7: Verify** — run `npm test`: expect `Tests  97 passed (97)` (13 new: 12 in bookings.test.js, 1 in validate.test.js; settings.test.js back to green). Run `npm run lint`: clean.

- [ ] **Step 8: Commit**

```bash
git add functions/api/_lib/bookings.js functions/api/_lib/validate.js functions/api/admin/settings.js tests/bookings.test.js tests/validate.test.js tests/settings.test.js
git commit -m "booking rules: window/limits/validation + booking_* settings keys"
```

---

### Task 4: signed cancel tokens (`_lib/booking-token.js`)

**Files:**
- Create: `functions/api/_lib/booking-token.js`, `tests/booking-token.test.js`
- Modify: `eslint.config.mjs` (functions/workers/tests globals)

**Interfaces:**
- Consumes: `env.BOOKING_TOKEN_SECRET` (locked name; optional — dev fallback when unset). Web Crypto (`crypto.subtle`, available in Workers and in vitest's Node runtime).
- Produces: `cancelToken(env, id) → Promise<64-char lowercase hex>`; `verifyCancelToken(env, id, token) → Promise<boolean>` (constant-time comparison).

- [ ] **Step 1: Write the failing tests** — create `tests/booking-token.test.js`:

```js
import { describe, it, expect } from "vitest";
import { cancelToken, verifyCancelToken } from "../functions/api/_lib/booking-token.js";

const ENV = { BOOKING_TOKEN_SECRET: "test-secret" };

describe("cancelToken / verifyCancelToken", () => {
  it("is deterministic 64-char hex for the same id and secret", async () => {
    const t = await cancelToken(ENV, 7);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(await cancelToken(ENV, 7)).toBe(t);
  });
  it("changes with the id and with the secret", async () => {
    const t = await cancelToken(ENV, 7);
    expect(await cancelToken(ENV, 8)).not.toBe(t);
    expect(await cancelToken({ BOOKING_TOKEN_SECRET: "other" }, 7)).not.toBe(t);
  });
  it("verifies matching tokens and rejects everything else", async () => {
    const t = await cancelToken(ENV, 7);
    expect(await verifyCancelToken(ENV, 7, t)).toBe(true);
    expect(await verifyCancelToken(ENV, 8, t)).toBe(false);
    const flipped = t.slice(0, 63) + (t[63] === "0" ? "1" : "0");
    expect(await verifyCancelToken(ENV, 7, flipped)).toBe(false);
    expect(await verifyCancelToken(ENV, 7, "")).toBe(false);
    expect(await verifyCancelToken(ENV, 7, null)).toBe(false);
  });
  it("falls back to a dev secret when BOOKING_TOKEN_SECRET is unset", async () => {
    const t = await cancelToken({}, 7);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyCancelToken({}, 7, t)).toBe(true);
    expect(t).not.toBe(await cancelToken(ENV, 7));
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/booking-token.test.js` to fail to load with a module-resolution error mentioning `functions/api/_lib/booking-token.js`. Rest of the suite: 97 passed.

- [ ] **Step 3: Implement** — create `functions/api/_lib/booking-token.js`:

```js
// Signed cancel tokens for resident bookings: hex HMAC-SHA256 over the
// booking id, keyed by BOOKING_TOKEN_SECRET (Pages secret; see the launch
// checklist). Unforgeable without the secret and needs no expiry — a token
// is worthless once its booking's date has passed. The fallback keeps local
// dev working with no env vars; production MUST set the real secret.
const FALLBACK_SECRET = "dev-only-secret";

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function cancelToken(env, id) {
  return hmacHex((env && env.BOOKING_TOKEN_SECRET) || FALLBACK_SECRET, "wopha-booking-cancel:" + id);
}

// Constant-time comparison: never leak HMAC prefixes through timing.
export async function verifyCancelToken(env, id, token) {
  const expected = await cancelToken(env, id);
  const given = String(token || "");
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 4: Add the Web Crypto globals to eslint** — in `eslint.config.mjs`, in the `files: ["functions/**/*.js", "workers/**/*.js", "tests/**/*.js"]` block, add to `globals` (skip any already present — another track may have added `URLSearchParams`):

```js
        crypto: "readonly", TextEncoder: "readonly",
```

- [ ] **Step 5: Verify** — run `npm test`: expect `Tests  101 passed (101)`. Run `npm run lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add functions/api/_lib/booking-token.js tests/booking-token.test.js eslint.config.mjs
git commit -m "booking cancel tokens: HMAC-SHA256 via Web Crypto, constant-time verify"
```

---

### Task 5: `GET /api/bookings` — public availability (busy/free only)

**Files:**
- Create: `functions/api/bookings/index.js`, `tests/bookings-api.test.js`

**Interfaces:**
- Consumes: `json` from `_lib/respond.js`; `FACILITIES`, `facilityById`, `availability`, `bookingRules`, `etParts` (Tasks 2-3).
- Produces: `GET /api/bookings?facility=<id>` per the Interface contract. The window ride-along in SQL: only rows between today ET and the window's last ET date are fetched.

- [ ] **Step 1: Write the failing tests** — create `tests/bookings-api.test.js`:

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet } from "../functions/api/bookings/index.js";
import { fakeDb } from "./helpers/fake-db.js";

const NOW = Date.UTC(2026, 6, 17, 15, 0); // Fri 2026-07-17 11:00 ET

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function getReq(qs) {
  return new Request("http://localhost:8200/api/bookings" + (qs || ""));
}

describe("GET /api/bookings (public availability)", () => {
  it("returns the facility list and busy/free days with zero PII", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "FROM bookings", results: [
        { date: "2026-07-18", start_time: "08:30", end_time: "10:00" },
      ] },
    ]);
    const res = await onRequestGet({ request: getReq("?facility=court-1"), env: { DB: db } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facility).toBe("court-1");
    expect(body.window_hours).toBe(48);
    expect(body.facilities[0]).toEqual({ id: "court-1", label: "Tennis court 1" });
    expect(body.days.map((d) => d.date)).toEqual(["2026-07-17", "2026-07-18", "2026-07-19"]);
    expect(body.days[1].slots.find((s) => s.start === "08:30").busy).toBe(true);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("email");
    expect(raw).not.toContain("address");
    expect(raw).not.toContain("Alex");
  });
  it("defaults to the first facility, rejects unknown ones, scopes SQL to the window", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "FROM bookings", results: [] },
    ]);
    const body = await (await onRequestGet({ request: getReq(""), env: { DB: db } })).json();
    expect(body.facility).toBe("court-1");
    expect(db.calls.find((c) => c.sql.includes("FROM bookings")).args)
      .toEqual(["court-1", "2026-07-17", "2026-07-19"]);
    expect((await onRequestGet({ request: getReq("?facility=gym"), env: { DB: fakeDb([]) } })).status).toBe(400);
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/bookings-api.test.js` to fail to load with a module-resolution error mentioning `functions/api/bookings/index.js`. Rest: 101 passed.

- [ ] **Step 3: Implement** — create `functions/api/bookings/index.js` (GET only for now; Task 6 appends the POST):

```js
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
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  103 passed (103)`. Run `npm run lint`: clean.

- [ ] **Step 5: Commit**

```bash
git add functions/api/bookings/index.js tests/bookings-api.test.js
git commit -m "GET /api/bookings: public busy/free availability, zero PII"
```

---

### Task 6: `POST /api/bookings` — book a slot, cancel link, Web3Forms notification

**Files:**
- Modify: `functions/api/bookings/index.js`
- Test: `tests/bookings-api.test.js`

**Interfaces:**
- Consumes: `validateBookingRequest`, `windowError`, `limitError`, `weekBounds`, `bookingRules`, `etParts`, `facilityById` (Task 3); `cancelToken` (Task 4); `env.WEB3FORMS_KEY` best-effort path (same shape as `functions/api/forms/submit.js`).
- Produces: `POST /api/bookings` per the Interface contract. `cancel_url` points at `/amenities/booking-cancel/?id=<id>&token=<hex>` on the request's own origin (the UI plan builds that page).

- [ ] **Step 1: Write the failing tests** — append to `tests/bookings-api.test.js` (top of file: extend the handler import to `import { onRequestGet, onRequestPost } from "../functions/api/bookings/index.js";`):

```js
function postReq(body) {
  return new Request("http://localhost:8200/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GOOD = {
  facility: "court-1", date: "2026-07-18", start: "08:30",
  name: "Alex Morgan", email: "alex@example.com", address: "101 Planters Way",
};

function openDb() {
  // empty settings, no prior bookings for this email, free slot
  return fakeDb([
    { match: "FROM settings", results: [] },
    { match: "WHERE email = ?", results: [] },
    { match: "start_time < ?", first: null },
    { match: "INSERT INTO bookings", run: { meta: { changes: 1, last_row_id: 42 } } },
  ]);
}

describe("POST /api/bookings", () => {
  it("books a free slot and returns a signed cancel link", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = openDb();
    const res = await onRequestPost({ request: postReq(GOOD), env: { DB: db } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(42);
    expect(body.cancel_url).toMatch(
      /^http:\/\/localhost:8200\/amenities\/booking-cancel\/\?id=42&token=[0-9a-f]{64}$/);
    const ins = db.calls.find((c) => c.sql.includes("INSERT INTO bookings"));
    expect(ins.args).toEqual(["court-1", "2026-07-18", "08:30", "10:00",
      "Alex Morgan", "alex@example.com", "101 Planters Way"]);
  });
  it("rejects honeypot hits and invalid input with 400, before any DB work", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([]);
    expect((await onRequestPost({ request: postReq({ ...GOOD, botcheck: "1" }), env: { DB: db } })).status).toBe(400);
    expect((await onRequestPost({ request: postReq({ ...GOOD, facility: "gym" }), env: { DB: db } })).status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
  it("rejects slots outside the booking window with 400", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([{ match: "FROM settings", results: [] }]);
    const past = await onRequestPost({
      request: postReq({ ...GOOD, date: "2026-07-17", start: "08:30" }), env: { DB: db } });
    expect(past.status).toBe(400);
    expect((await past.json()).error).toMatch(/already passed/);
    const far = await onRequestPost({
      request: postReq({ ...GOOD, date: "2026-07-19", start: "14:30" }), env: { DB: db } });
    expect(far.status).toBe(400);
    expect((await far.json()).error).toMatch(/not open yet/);
  });
  it("enforces the per-household daily limit with 409", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "WHERE email = ?", results: [{ facility: "court-2", date: "2026-07-18" }] },
    ]);
    const res = await onRequestPost({ request: postReq(GOOD), env: { DB: db } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/per day/);
  });
  it("returns 409 when the slot is taken, including the insert race", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const clash = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "WHERE email = ?", results: [] },
      { match: "start_time < ?", first: { id: 9 } },
    ]);
    expect((await onRequestPost({ request: postReq(GOOD), env: { DB: clash } })).status).toBe(409);
    const race = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "WHERE email = ?", results: [] },
      { match: "start_time < ?", first: null },
      { match: "INSERT INTO bookings",
        error: "UNIQUE constraint failed: bookings.facility, bookings.date, bookings.start_time" },
    ]);
    expect((await onRequestPost({ request: postReq(GOOD), env: { DB: race } })).status).toBe(409);
  });
  it("notifies via Web3Forms only when the key is set, and never fails the booking", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const calls = [];
    vi.stubGlobal("fetch", async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return new Response("ok");
    });
    let res = await onRequestPost({ request: postReq(GOOD), env: { DB: openDb(), WEB3FORMS_KEY: "k" } });
    expect(res.status).toBe(200);
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe("https://api.web3forms.com/submit");
    expect(calls[0].body.subject).toBe("WOPHA facility booking");
    expect(calls[0].body.replyto).toBe("alex@example.com");
    expect(calls[0].body.cancel_link).toContain("/amenities/booking-cancel/");
    calls.length = 0;
    res = await onRequestPost({ request: postReq(GOOD), env: { DB: openDb() } });
    expect(res.status).toBe(200);
    expect(calls.length).toBe(0); // no key, no call
    vi.stubGlobal("fetch", async () => { throw new Error("web3forms down"); });
    res = await onRequestPost({ request: postReq(GOOD), env: { DB: openDb(), WEB3FORMS_KEY: "k" } });
    expect(res.status).toBe(200); // outage never fails the stored booking
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect the six new tests to fail with `onRequestPost is not a function` (or equivalent undefined-import errors). Rest: 103 passed.

- [ ] **Step 3: Implement** — append to `functions/api/bookings/index.js` (extend the existing `_lib/bookings.js` import to also pull `validateBookingRequest, windowError, limitError, weekBounds`, and add `import { cancelToken } from "../_lib/booking-token.js";`):

```js
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
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  109 passed (109)`. Run `npm run lint`: clean.

- [ ] **Step 5: Commit**

```bash
git add functions/api/bookings/index.js tests/bookings-api.test.js
git commit -m "POST /api/bookings: window+limit+conflict checks, cancel link, Web3Forms notify"
```

---

### Task 7: `/api/bookings/cancel` — token-gated lookup and cancel

**Files:**
- Create: `functions/api/bookings/cancel.js`, `tests/bookings-cancel.test.js`

**Interfaces:**
- Consumes: `verifyCancelToken` (Task 4), `facilityById` (Task 2), `json`.
- Produces: `GET /api/bookings/cancel?id=N&token=T` and `POST /api/bookings/cancel {id, token}` per the Interface contract. Block-outs are unreachable through this path; bad token and missing row are indistinguishable 404s.

- [ ] **Step 1: Write the failing tests** — create `tests/bookings-cancel.test.js`:

```js
import { describe, it, expect } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/bookings/cancel.js";
import { cancelToken } from "../functions/api/_lib/booking-token.js";
import { fakeDb } from "./helpers/fake-db.js";

const ENV = { BOOKING_TOKEN_SECRET: "test-secret" };
const ROW = { facility: "court-1", date: "2026-07-18", start_time: "08:30", end_time: "10:00", status: "booked" };

function getReq(id, token) {
  return new Request("http://localhost:8200/api/bookings/cancel?id=" + id + "&token=" + token);
}
function postReq(body) {
  return new Request("http://localhost:8200/api/bookings/cancel", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("GET /api/bookings/cancel", () => {
  it("returns slot details (no PII) for a valid token", async () => {
    const token = await cancelToken(ENV, 42);
    const db = fakeDb([{ match: "FROM bookings", first: ROW }]);
    const res = await onRequestGet({ request: getReq(42, token), env: { ...ENV, DB: db } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      facility: "court-1", label: "Tennis court 1",
      date: "2026-07-18", start: "08:30", end: "10:00", status: "booked",
    });
  });
  it("404s on a bad token (without touching the DB) or a missing booking", async () => {
    const db = fakeDb([{ match: "FROM bookings", first: ROW }]);
    expect((await onRequestGet({ request: getReq(42, "f".repeat(64)), env: { ...ENV, DB: db } })).status).toBe(404);
    expect(db.calls.length).toBe(0);
    const token = await cancelToken(ENV, 42);
    const gone = fakeDb([{ match: "FROM bookings", first: null }]);
    expect((await onRequestGet({ request: getReq(42, token), env: { ...ENV, DB: gone } })).status).toBe(404);
  });
});

describe("POST /api/bookings/cancel", () => {
  it("cancels a booked slot with a valid token, idempotently", async () => {
    const token = await cancelToken(ENV, 42);
    const db = fakeDb([
      { match: "SELECT status", first: { status: "booked" } },
      { match: "UPDATE bookings", run: { meta: { changes: 1 } } },
    ]);
    const res = await onRequestPost({ request: postReq({ id: 42, token }), env: { ...ENV, DB: db } });
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls.find((c) => c.sql.includes("UPDATE bookings")).args).toEqual([42]);
    const done = fakeDb([{ match: "SELECT status", first: { status: "cancelled" } }]);
    expect((await onRequestPost({ request: postReq({ id: 42, token }), env: { ...ENV, DB: done } })).status).toBe(200);
    expect(done.calls.some((c) => c.sql.includes("UPDATE"))).toBe(false);
  });
  it("404s on bad tokens and never reaches block-outs through the public path", async () => {
    const db = fakeDb([]);
    expect((await onRequestPost({ request: postReq({ id: 42, token: "nope" }), env: { ...ENV, DB: db } })).status).toBe(404);
    expect(db.calls.length).toBe(0);
    const token = await cancelToken(ENV, 43);
    const blocked = fakeDb([{ match: "SELECT status", first: null }]); // status != 'blocked' filter finds nothing
    expect((await onRequestPost({ request: postReq({ id: 43, token }), env: { ...ENV, DB: blocked } })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/bookings-cancel.test.js` to fail to load with a module-resolution error mentioning `functions/api/bookings/cancel.js`. Rest: 109 passed.

- [ ] **Step 3: Implement** — create `functions/api/bookings/cancel.js`:

```js
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
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  113 passed (113)`. Run `npm run lint`: clean.

- [ ] **Step 5: Commit**

```bash
git add functions/api/bookings/cancel.js tests/bookings-cancel.test.js
git commit -m "/api/bookings/cancel: token-gated lookup + idempotent cancel"
```

---

### Task 8: admin bookings API — list, block-out, cancel/override

**Files:**
- Create: `functions/api/admin/bookings.js`, `functions/api/admin/bookings/[id].js`, `tests/admin-bookings.test.js`

**Interfaces:**
- Consumes: `FACILITIES`, `validateBlockout`, `etParts` (Tasks 2-3); `json`; auth comes free from the existing `functions/api/admin/_middleware.js` (directory placement — no auth code here).
- Produces: `GET/POST /api/admin/bookings` and `DELETE /api/admin/bookings/:id` per the Interface contract.

- [ ] **Step 1: Write the failing tests** — create `tests/admin-bookings.test.js`:

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/admin/bookings.js";
import { onRequestDelete } from "../functions/api/admin/bookings/[id].js";
import { FACILITY_IDS } from "../functions/api/_lib/bookings.js";
import { fakeDb } from "./helpers/fake-db.js";

afterEach(() => vi.restoreAllMocks());

function getReq(qs) {
  return new Request("http://localhost:8200/api/admin/bookings" + (qs || ""));
}
function postReq(body) {
  return new Request("http://localhost:8200/api/admin/bookings", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("GET /api/admin/bookings", () => {
  it("lists active rows for the range with full details for the board", async () => {
    const rows = [{
      id: 1, facility: "court-1", date: "2026-07-18", start_time: "08:30", end_time: "10:00",
      name: "Alex Morgan", email: "alex@example.com", address: "101 Planters Way",
      status: "booked", created_at: "2026-07-16 12:00:00",
    }];
    const db = fakeDb([{ match: "FROM bookings", results: rows }]);
    const body = await (await onRequestGet({ request: getReq("?from=2026-07-18&days=7"), env: { DB: db } })).json();
    expect(body.from).toBe("2026-07-18");
    expect(body.days).toBe(7);
    expect(body.bookings).toEqual(rows);
    expect(body.facilities.length).toBe(FACILITY_IDS.length);
    expect(db.calls[0].args).toEqual(["2026-07-18", "2026-07-24"]);
  });
  it("defaults to 14 days from today ET and caps the range at 60", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 6, 17, 15, 0)); // 2026-07-17 ET
    const db = fakeDb([{ match: "FROM bookings", results: [] }]);
    const body = await (await onRequestGet({ request: getReq(""), env: { DB: db } })).json();
    expect(body.from).toBe("2026-07-17");
    expect(db.calls[0].args).toEqual(["2026-07-17", "2026-07-30"]);
    const capped = fakeDb([{ match: "FROM bookings", results: [] }]);
    const b2 = await (await onRequestGet({ request: getReq("?from=2026-07-01&days=999"), env: { DB: capped } })).json();
    expect(b2.days).toBe(60);
  });
});

describe("POST /api/admin/bookings (block-outs)", () => {
  it("creates one blocked row per facility, expanding all, in one batch", async () => {
    const db = fakeDb([]);
    const res = await onRequestPost({
      request: postReq({ facility: "all", date: "2026-07-20", start: "08:00", end: "13:45", reason: "Swim meet" }),
      env: { DB: db },
    });
    expect(await res.json()).toEqual({ ok: true, created: FACILITY_IDS.length });
    expect(db.calls).toEqual([{ batch: FACILITY_IDS.length }]);
  });
  it("400s on validation failures without touching the DB", async () => {
    const db = fakeDb([]);
    const res = await onRequestPost({
      request: postReq({ facility: "gym", date: "2026-07-20", start: "08:00", end: "09:00", reason: "x" }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
});

describe("DELETE /api/admin/bookings/:id", () => {
  it("cancels bookings and block-outs, 404s when already gone", async () => {
    const db = fakeDb([{ match: "UPDATE bookings", run: { meta: { changes: 1 } } }]);
    expect(await (await onRequestDelete({ env: { DB: db }, params: { id: "5" } })).json()).toEqual({ ok: true });
    expect(db.calls[0].args).toEqual([5]);
    const gone = fakeDb([{ match: "UPDATE bookings", run: { meta: { changes: 0 } } }]);
    expect((await onRequestDelete({ env: { DB: gone }, params: { id: "5" } })).status).toBe(404);
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/admin-bookings.test.js` to fail to load with module-resolution errors for the two new handler files. Rest: 113 passed.

- [ ] **Step 3: Implement the collection handler** — create `functions/api/admin/bookings.js`:

```js
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
```

- [ ] **Step 4: Implement the item handler** — create `functions/api/admin/bookings/[id].js`:

```js
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
```

- [ ] **Step 5: Verify** — run `npm test`: expect `Tests  118 passed (118)`. Run `npm run lint`: clean.

- [ ] **Step 6: Commit**

```bash
git add functions/api/admin/bookings.js "functions/api/admin/bookings/[id].js" tests/admin-bookings.test.js
git commit -m "admin bookings API: range list, block-outs, cancel/override"
```

---

### Task 9: launch checklist, local end-to-end smoke, wrap-up

**Files:**
- Modify: `docs/launch-checklist.md` (§7 list)

**Interfaces:**
- Consumes: everything above, running through the real wrangler dev server.
- Produces: documented production steps for `BOOKING_TOKEN_SECRET` and the remote D1 schema; a verified local end-to-end booking flow.

- [ ] **Step 1: Add the checklist items** — in `docs/launch-checklist.md`, section `## 7. Board portal (Cloudflare)`, append these items to the checklist (before the final "Demo to the board" item):

```markdown
- [ ] Booking engine: set the `BOOKING_TOKEN_SECRET` secret on the Pages
      project (Settings → Environment variables → add as Secret; generate a
      value with `openssl rand -hex 32`). Cancel links are signed with it;
      without it the code falls back to a dev-only value that must never
      serve real bookings.
- [ ] Booking engine: re-apply the schema remotely so the `bookings` table
      and its indexes exist:
      `npx wrangler d1 execute wopha --remote --file=schema.sql`
      (idempotent — safe to run on the existing database).
```

- [ ] **Step 2: End-to-end smoke through the real middleware** — apply schema locally if not done (`npm run db:schema`), then `npm run dev` (port 8200) and in a second terminal:

```bash
curl -s "http://127.0.0.1:8200/api/bookings?facility=court-1"
curl -s -X POST http://127.0.0.1:8200/api/bookings -H "Content-Type: application/json" -d "{\"facility\":\"court-1\",\"date\":\"<a bookable date from the first response>\",\"start\":\"<a bookable start>\",\"name\":\"Test Resident\",\"email\":\"test@example.com\",\"address\":\"101 Planters Way\"}"
curl -s "http://127.0.0.1:8200/api/admin/bookings"
curl -s "<the cancel_url from the POST response, with /amenities/booking-cancel/? changed to /api/bookings/cancel?>"
curl -s -X POST http://127.0.0.1:8200/api/bookings/cancel -H "Content-Type: application/json" -d "{\"id\":<id>,\"token\":\"<token>\"}"
curl -s -X POST http://127.0.0.1:8200/api/admin/bookings -H "Content-Type: application/json" -d "{\"facility\":\"all\",\"date\":\"<same date>\",\"start\":\"08:00\",\"end\":\"12:00\",\"reason\":\"Swim meet\"}"
curl -s "http://127.0.0.1:8200/api/bookings?facility=court-1"
```

Expect, in order: (1) availability JSON with `facilities` and 3 `days`, no PII; (2) `{"ok":true,"id":...,"cancel_url":...}`; (3) the booking listed with name/email; (4) the slot details without PII; (5) `{"ok":true}`; (6) `{"ok":true,"created":5}`; (7) the blocked morning slots now `"busy":true`. Stop the dev server.

- [ ] **Step 3: Final verification** — run `npm test` (118 passed) and `npm run lint` (clean).

- [ ] **Step 4: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "launch checklist: BOOKING_TOKEN_SECRET secret + remote bookings schema"
```
