# WOPHA Board Portal (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Cloudflare-native board portal (announcements publishing, submissions inbox, dues ledger, site-content editing) to the existing static WOPHA site.

**Architecture:** The public site stays plain static HTML. Pages Functions in `functions/api/` provide the API; D1 (SQLite, binding `DB`) holds the data; Cloudflare Access protects `/portal/*` and `/api/admin/*` in production. Portal pages are static HTML in `/portal/` using the existing design system.

**Tech Stack:** Plain HTML/CSS/vanilla JS, Cloudflare Pages Functions (ES modules), D1, R2 (backups), wrangler (local dev), vitest (pure-logic tests only).

**Spec:** `docs/superpowers/specs/2026-07-10-board-portal-design.md`

## Global Constraints

- No frameworks, no build step. Public-page JS matches the existing style in `assets/js/site.js`: `var`, IIFEs, ES5-ish. Functions and tests use modern ES modules.
- D1 binding name is `DB`, database name `wopha`. The Web3Forms key lives in the secret env var `WEB3FORMS_KEY` (never in HTML).
- Money is integer cents. Dates are `YYYY-MM-DD` strings. Timestamps come from SQLite `datetime('now')`.
- Never render user-supplied content with `innerHTML` — always `textContent` / `createElement`.
- Cloudflare Access is the production gate for `/portal/*` and `/api/admin/*`; the admin middleware (Task 2) is defense-in-depth, not the primary control. No real resident data goes into the remote D1 until the Access policy exists (Task 14 checklist).
- The public site must degrade gracefully when the API is unreachable: announcement sections stay hidden, baked-in content remains.
- Git: work on `master` (local-only). NEVER push `master`. NEVER let `docs/board-proposal.md` or `docs/superpowers/` reach the `deploy` branch. Do not merge the form-action changes (Task 6) to `deploy` until Cloudflare Pages serves production — GitHub Pages cannot run functions, so repointed forms would 404 there.
- Commit at the end of every task with the message given in the task.
- All commands run from the repo root (`wopha-website/`) unless a task says otherwise. Windows: use `npx wrangler ...` (wrangler is a devDependency, not global).
- This machine reserves TCP ports 8078-8177, 8278-8777, 8779-8978 (Hyper-V excluded ranges) — binding them makes workerd abort with `std::terminate`. Dev servers use the free 8178-8277 window: pages dev on 8200, python checks on 8201, backup-worker test on 8202.

## File Structure

```
package.json                             dev tooling (wrangler, vitest)
wrangler.toml                            Pages config + D1 binding
schema.sql                               D1 schema (idempotent)
seed.sql                                 local/demo seed data
thanks.html                              post-form-submit landing page
functions/api/_lib/respond.js            json() response helper
functions/api/_lib/auth.js               admin identity resolution
functions/api/_lib/validate.js           input validation (pure, tested)
functions/api/_lib/csv.js                CSV parse/serialize (pure, tested)
functions/api/_lib/ledger.js             CSV import mapping + summary math (pure, tested)
functions/api/announcements.js           GET public announcements
functions/api/content.js                 GET public site content
functions/api/forms/submit.js            POST public form submissions
functions/api/admin/_middleware.js       auth gate for /api/admin/*
functions/api/admin/summary.js           GET dashboard numbers
functions/api/admin/announcements.js     GET list / POST create
functions/api/admin/announcements/[id].js  PUT update / DELETE soft-delete
functions/api/admin/submissions.js       GET inbox list
functions/api/admin/submissions/[id].js  PATCH status/notes
functions/api/admin/households.js        GET ledger rows / POST CSV import
functions/api/admin/payments.js          POST mark paid
functions/api/admin/payments/[id].js     DELETE undo payment
functions/api/admin/ledger-export.js     GET CSV download
functions/api/admin/content.js           PUT site content
functions/api/admin/export.js            GET full JSON data dump
portal/index.html                        dashboard
portal/announcements.html                announcements manager
portal/inbox.html                        submissions inbox
portal/ledger.html                       dues ledger
portal/content.html                      site-content editor
portal/portal.js                         shared portal fetch/error helpers
assets/css/portal.css                    portal-only styles
workers/backup/wrangler.toml             weekly backup worker config
workers/backup/index.js                  weekly D1 → R2 dump
tests/*.test.js                          vitest for _lib modules
```

Modified: `sw.js` (bypass /api/ + /portal/, cache bump), `assets/js/site.js` (announcements render, content swap), `index.html` (news strip, `id="season-glance"`, footer portal link), `community.html` (news archive), `pool.html` (`id="pool-hours-body"`), `contact.html` / `board.html` / `suggestions.html` (form repoint), `docs/launch-checklist.md`, `README.md`.

---

### Task 1: Tooling scaffold — package.json, wrangler.toml, schema, seed

**Files:**
- Create: `package.json`, `wrangler.toml`, `schema.sql`, `seed.sql`, `.gitignore`

**Interfaces:**
- Produces: D1 binding `env.DB` with tables `announcements`, `submissions`, `households`, `payments`, `site_content`; npm scripts `dev`, `db:schema`, `db:seed`, `test` used by every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "wopha-website",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler pages dev . --port 8200",
    "db:schema": "wrangler d1 execute wopha --local --file=schema.sql",
    "db:seed": "wrangler d1 execute wopha --local --file=seed.sql",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.0",
    "wrangler": "^4.24.0"
  }
}
```

- [ ] **Step 2: Create `wrangler.toml`**

```toml
name = "wopha-website"
compatibility_date = "2026-07-01"
pages_build_output_dir = "."

[[d1_databases]]
binding = "DB"
database_name = "wopha"
# PLACEHOLDER: replace with the real id after `npx wrangler d1 create wopha`
# at launch (Task 14). Local dev ignores this value.
database_id = "00000000-0000-0000-0000-000000000000"
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.wrangler/
```

- [ ] **Step 4: Create `schema.sql`**

```sql
-- WOPHA portal schema. Idempotent: safe to re-run.
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned_until TEXT,                -- YYYY-MM-DD or NULL
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_type TEXT NOT NULL,          -- contact_update | issue_report | suggestion | arc_request
  fields TEXT NOT NULL,             -- JSON object of submitted fields
  status TEXT NOT NULL DEFAULT 'new',  -- new | in_progress | done
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id),
  year INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,             -- stripe | zelle | check | other
  paid_on TEXT NOT NULL,            -- YYYY-MM-DD
  note TEXT NOT NULL DEFAULT '',
  UNIQUE(household_id, year)
);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,             -- season_glance | pool_hours
  value TEXT NOT NULL,              -- JSON array of [label, value] pairs
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
```

- [ ] **Step 5: Create `seed.sql`** (local dev + board demo data — fake households only)

```sql
INSERT INTO announcements (title, body, pinned_until) VALUES
  ('Pool opens May 17', 'Opening-day ice cream social starts at 2 p.m. Wristbands at the front gate.', NULL),
  ('Pine straw sale is on', 'Order by Friday; delivery is next weekend. Proceeds support the swim team.', date('now', '+14 days')),
  ('Clean-up day recap', 'Thanks to the 22 volunteers who came out — the entrance beds look great.', NULL);

INSERT INTO households (address, owner_name, email, phone) VALUES
  ('101 Planters Way', 'Alex Morgan', 'alex@example.com', ''),
  ('102 Planters Way', 'Sam Lee', 'sam@example.com', '770-555-0102'),
  ('103 Planters Way', 'Riley Chen', '', ''),
  ('104 Planters Way', 'Jordan Fox', 'jordan@example.com', ''),
  ('105 Planters Way', 'Casey Diaz', 'casey@example.com', '');

INSERT INTO payments (household_id, year, amount_cents, method, paid_on) VALUES
  (1, 2026, 53500, 'stripe', '2026-03-01'),
  (2, 2026, 53500, 'check', '2026-03-15');

INSERT INTO submissions (form_type, fields) VALUES
  ('issue_report', '{"location":"Pool area","message":"Gate latch sticks when it is hot out"}'),
  ('suggestion', '{"message":"More shade by the baby pool would be great"}');

INSERT INTO site_content (key, value) VALUES
  ('season_glance', '[["2026 annual dues","$535"],["Membership year","May 1, 2026 – Apr 30, 2027"],["Pool open","May 17 – Sep 20"],["Tennis courts","7 a.m. – 11 p.m. daily"],["Trash & recycling","Thursday mornings"],["Refer a new member","Earn $50"]]'),
  ('pool_hours', '[["Monday","11 a.m. – 8 p.m."],["Tuesday","11 a.m. – 8 p.m."],["Wednesday","11 a.m. – 8 p.m."],["Thursday","11 a.m. – 8 p.m."],["Friday","11 a.m. – 9 p.m."],["Saturday","10 a.m. – 9 p.m."],["Sunday","12 p.m. – 8 p.m."]]');
```

- [ ] **Step 6: Install and initialize the local database**

Run: `npm install`
Expected: installs wrangler + vitest with no errors.

Run: `npm run db:schema && npm run db:seed`
Expected: both commands report executed statements, no errors. (Local D1 state lives in `.wrangler/`, which is gitignored.)

- [ ] **Step 7: Verify the dev server serves the existing site**

Run: `npm run dev` (leave running in a second terminal from here on; restart it whenever a task adds a new function file)
Then: `curl -s http://127.0.0.1:8200/ | head -5`
Expected: the existing `index.html` doctype/head — the static site works under wrangler.

- [ ] **Step 8: Commit**

```bash
git add package.json wrangler.toml .gitignore schema.sql seed.sql
git commit -m "Portal scaffolding: wrangler + D1 schema and seed data"
```

---

### Task 2: Response helper + admin auth middleware

**Files:**
- Create: `functions/api/_lib/respond.js`, `functions/api/_lib/auth.js`, `functions/api/admin/_middleware.js`
- Test: `tests/auth.test.js`

**Interfaces:**
- Produces: `json(data, status?)` → `Response` (from `respond.js`); `adminEmailFor(request)` → `string | null` (from `auth.js`); every `/api/admin/*` request that reaches a handler has passed the middleware and has `context.data.adminEmail` set.

- [ ] **Step 1: Write the failing test** — `tests/auth.test.js`

```js
import { describe, it, expect } from "vitest";
import { adminEmailFor } from "../functions/api/_lib/auth.js";

function req(url, headers) {
  return new Request(url, { headers: headers || {} });
}

describe("adminEmailFor", () => {
  it("allows local dev hosts without a header", () => {
    expect(adminEmailFor(req("http://localhost:8200/api/admin/summary"))).toBe("dev@localhost");
    expect(adminEmailFor(req("http://127.0.0.1:8200/api/admin/summary"))).toBe("dev@localhost");
  });

  it("returns the Access email on production hosts", () => {
    const r = req("https://wopha.com/api/admin/summary", {
      "cf-access-authenticated-user-email": "treasurer@wopha.com",
    });
    expect(adminEmailFor(r)).toBe("treasurer@wopha.com");
  });

  it("returns null on production hosts without the Access header", () => {
    expect(adminEmailFor(req("https://wopha.com/api/admin/summary"))).toBe(null);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `../functions/api/_lib/auth.js`.

- [ ] **Step 3: Implement `functions/api/_lib/respond.js`**

```js
// Shared JSON response helper for all API functions.
export function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
```

- [ ] **Step 4: Implement `functions/api/_lib/auth.js`**

```js
// Cloudflare Access is the real gate for /api/admin/* in production (set up
// in the launch checklist). This check is defense-in-depth: if the Access
// policy is missing or misconfigured, the API still refuses to answer.
// Access sets Cf-Access-Authenticated-User-Email on validated requests.
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export function adminEmailFor(request) {
  const url = new URL(request.url);
  if (LOCAL_HOSTS.includes(url.hostname)) return "dev@localhost";
  return request.headers.get("cf-access-authenticated-user-email") || null;
}
```

- [ ] **Step 5: Implement `functions/api/admin/_middleware.js`**

```js
import { json } from "../_lib/respond.js";
import { adminEmailFor } from "../_lib/auth.js";

export async function onRequest(context) {
  const email = adminEmailFor(context.request);
  if (!email) return json({ error: "Not authorized" }, 401);
  context.data.adminEmail = email;
  return context.next();
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add functions/api/_lib/respond.js functions/api/_lib/auth.js functions/api/admin/_middleware.js tests/auth.test.js
git commit -m "API response helper and admin auth middleware"
```

---

### Task 3: Validation library

**Files:**
- Create: `functions/api/_lib/validate.js`
- Test: `tests/validate.test.js`

**Interfaces:**
- Produces: `FORM_TYPES`, `PAYMENT_METHODS`, `CONTENT_KEYS` (string arrays); `validateSubmission(formType, fields, botcheck)` → `{ok}` or `{ok:false, error}`; `validateAnnouncement(input)` → `{ok, value:{title, body, pinned_until}}` or error; `validatePayment(input)` → `{ok, value:{household_id, year, amount_cents, method, paid_on, note}}` or error; `validateContent(key, value)` → `{ok, value}` or error. Used by Tasks 4, 6, 11, 12.

- [ ] **Step 1: Write the failing tests** — `tests/validate.test.js`

```js
import { describe, it, expect } from "vitest";
import {
  validateSubmission,
  validateAnnouncement,
  validatePayment,
  validateContent,
} from "../functions/api/_lib/validate.js";

describe("validateSubmission", () => {
  it("accepts a known form type with normal fields", () => {
    expect(validateSubmission("issue_report", { message: "gate broken" }, "").ok).toBe(true);
  });
  it("rejects when the honeypot is filled", () => {
    expect(validateSubmission("issue_report", { message: "x" }, "on").ok).toBe(false);
  });
  it("rejects unknown form types", () => {
    expect(validateSubmission("hack", { message: "x" }, "").ok).toBe(false);
  });
  it("rejects empty submissions and oversized fields", () => {
    expect(validateSubmission("suggestion", {}, "").ok).toBe(false);
    expect(validateSubmission("suggestion", { message: "a".repeat(4001) }, "").ok).toBe(false);
  });
});

describe("validateAnnouncement", () => {
  it("accepts and trims a valid announcement", () => {
    const r = validateAnnouncement({ title: " Pool opens ", body: "May 17.", pinned_until: null });
    expect(r.ok).toBe(true);
    expect(r.value.title).toBe("Pool opens");
    expect(r.value.pinned_until).toBe(null);
  });
  it("accepts a valid pin date and rejects a bad one", () => {
    expect(validateAnnouncement({ title: "t", body: "b", pinned_until: "2026-08-01" }).ok).toBe(true);
    expect(validateAnnouncement({ title: "t", body: "b", pinned_until: "next week" }).ok).toBe(false);
  });
  it("rejects missing title or body", () => {
    expect(validateAnnouncement({ title: "", body: "b" }).ok).toBe(false);
    expect(validateAnnouncement({ title: "t", body: "  " }).ok).toBe(false);
  });
});

describe("validatePayment", () => {
  const good = { household_id: 3, year: 2026, amount_cents: 53500, method: "check", paid_on: "2026-03-01" };
  it("accepts a valid payment", () => {
    const r = validatePayment(good);
    expect(r.ok).toBe(true);
    expect(r.value.amount_cents).toBe(53500);
  });
  it("coerces numeric strings from JSON", () => {
    expect(validatePayment({ ...good, household_id: "3", amount_cents: "53500" }).ok).toBe(true);
  });
  it("rejects bad method, date, amount", () => {
    expect(validatePayment({ ...good, method: "cash" }).ok).toBe(false);
    expect(validatePayment({ ...good, paid_on: "3/1/26" }).ok).toBe(false);
    expect(validatePayment({ ...good, amount_cents: 0 }).ok).toBe(false);
    expect(validatePayment({ ...good, amount_cents: 53500.5 }).ok).toBe(false);
  });
});

describe("validateContent", () => {
  it("accepts a known key with [label, value] pairs", () => {
    expect(validateContent("pool_hours", [["Monday", "11–8"]]).ok).toBe(true);
  });
  it("rejects unknown keys and malformed rows", () => {
    expect(validateContent("nope", [["a", "b"]]).ok).toBe(false);
    expect(validateContent("pool_hours", "not an array").ok).toBe(false);
    expect(validateContent("pool_hours", [["only one cell"]]).ok).toBe(false);
    expect(validateContent("pool_hours", [[1, 2]]).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `validate.js`.

- [ ] **Step 3: Implement `functions/api/_lib/validate.js`**

```js
// Input validation for everything that crosses the API boundary.
export const FORM_TYPES = ["contact_update", "issue_report", "suggestion", "arc_request"];
export const PAYMENT_METHODS = ["stripe", "zelle", "check", "other"];
export const CONTENT_KEYS = ["season_glance", "pool_hours"];

const MAX_FIELD_LENGTH = 4000;
const MAX_FIELDS = 20;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateSubmission(formType, fields, botcheck) {
  if (botcheck) return { ok: false, error: "Rejected" };
  if (!FORM_TYPES.includes(formType)) return { ok: false, error: "Unknown form type" };
  const keys = Object.keys(fields);
  if (keys.length === 0) return { ok: false, error: "Empty submission" };
  if (keys.length > MAX_FIELDS) return { ok: false, error: "Too many fields" };
  for (const k of keys) {
    if (typeof fields[k] !== "string" || fields[k].length > MAX_FIELD_LENGTH) {
      return { ok: false, error: "Field too long: " + k };
    }
  }
  return { ok: true };
}

export function validateAnnouncement(input) {
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  const pinnedUntil = input.pinned_until || null;
  if (!title || title.length > 200) return { ok: false, error: "Title is required (max 200 characters)" };
  if (!body || body.length > MAX_FIELD_LENGTH) return { ok: false, error: "Body is required (max 4000 characters)" };
  if (pinnedUntil !== null && !DATE_RE.test(pinnedUntil)) {
    return { ok: false, error: "Pin date must be YYYY-MM-DD" };
  }
  return { ok: true, value: { title, body, pinned_until: pinnedUntil } };
}

export function validatePayment(input) {
  const householdId = Number(input.household_id);
  const year = Number(input.year);
  const amountCents = Number(input.amount_cents);
  const method = input.method;
  const paidOn = String(input.paid_on || "");
  if (!Number.isInteger(householdId) || householdId <= 0) return { ok: false, error: "household_id is required" };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "year out of range" };
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 1000000) {
    return { ok: false, error: "amount_cents must be a positive integer (max $10,000)" };
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return { ok: false, error: "method must be one of: " + PAYMENT_METHODS.join(", ") };
  }
  if (!DATE_RE.test(paidOn)) return { ok: false, error: "paid_on must be YYYY-MM-DD" };
  return {
    ok: true,
    value: {
      household_id: householdId,
      year,
      amount_cents: amountCents,
      method,
      paid_on: paidOn,
      note: String(input.note || "").slice(0, 500),
    },
  };
}

export function validateContent(key, value) {
  if (!CONTENT_KEYS.includes(key)) return { ok: false, error: "Unknown content key" };
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return { ok: false, error: "Value must be a list of 1–50 rows" };
  }
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 2 ||
        typeof row[0] !== "string" || typeof row[1] !== "string" ||
        row[0].length > 200 || row[1].length > 200) {
      return { ok: false, error: "Each row must be a [label, value] pair of strings (max 200 chars)" };
    }
  }
  return { ok: true, value };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all validate + auth tests).

- [ ] **Step 5: Commit**

```bash
git add functions/api/_lib/validate.js tests/validate.test.js
git commit -m "Validation library for submissions, announcements, payments, content"
```

---

### Task 4: Announcements API (public read + admin CRUD)

**Files:**
- Create: `functions/api/announcements.js`, `functions/api/admin/announcements.js`, `functions/api/admin/announcements/[id].js`

**Interfaces:**
- Consumes: `json()` (Task 2), `validateAnnouncement()` (Task 3), tables from Task 1.
- Produces: `GET /api/announcements` → `{announcements: [{id, title, body, pinned_until, created_at}]}` (pinned-and-current first, then newest, max 20); `GET /api/admin/announcements` → same shape plus `updated_at`, all non-deleted; `POST /api/admin/announcements` body `{title, body, pinned_until}` → `{id}` 201; `PUT /api/admin/announcements/:id` same body → `{ok:true}`; `DELETE /api/admin/announcements/:id` → `{ok:true}` (soft delete).

- [ ] **Step 1: Implement `functions/api/announcements.js`**

```js
import { json } from "./_lib/respond.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, pinned_until, created_at FROM announcements
     WHERE deleted = 0
     ORDER BY (pinned_until IS NOT NULL AND pinned_until >= date('now')) DESC,
              created_at DESC
     LIMIT 20`
  ).all();
  return json({ announcements: results });
}
```

- [ ] **Step 2: Implement `functions/api/admin/announcements.js`**

```js
import { json } from "../_lib/respond.js";
import { validateAnnouncement } from "../_lib/validate.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, pinned_until, created_at, updated_at
     FROM announcements WHERE deleted = 0 ORDER BY created_at DESC`
  ).all();
  return json({ announcements: results });
}

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateAnnouncement(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const v = check.value;
  const r = await env.DB.prepare(
    "INSERT INTO announcements (title, body, pinned_until) VALUES (?, ?, ?)"
  ).bind(v.title, v.body, v.pinned_until).run();
  return json({ id: r.meta.last_row_id }, 201);
}
```

- [ ] **Step 3: Implement `functions/api/admin/announcements/[id].js`**

```js
import { json } from "../../_lib/respond.js";
import { validateAnnouncement } from "../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  const input = await request.json().catch(() => ({}));
  const check = validateAnnouncement(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const v = check.value;
  const r = await env.DB.prepare(
    `UPDATE announcements SET title = ?, body = ?, pinned_until = ?,
       updated_at = datetime('now')
     WHERE id = ? AND deleted = 0`
  ).bind(v.title, v.body, v.pinned_until, id).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}

export async function onRequestDelete({ env, params }) {
  const r = await env.DB.prepare(
    "UPDATE announcements SET deleted = 1, updated_at = datetime('now') WHERE id = ? AND deleted = 0"
  ).bind(Number(params.id)).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
```

- [ ] **Step 4: Verify with curl** (restart `npm run dev` first so the new routes load)

Run: `curl -s http://127.0.0.1:8200/api/announcements`
Expected: JSON with the 3 seeded announcements; "Pine straw sale is on" (pinned) first.

Run: `curl -s -X POST http://127.0.0.1:8200/api/admin/announcements -H "Content-Type: application/json" -d "{\"title\":\"Test\",\"body\":\"Body\",\"pinned_until\":null}"`
Expected: `{"id":4}` with status 201.

Run: `curl -s -X PUT http://127.0.0.1:8200/api/admin/announcements/4 -H "Content-Type: application/json" -d "{\"title\":\"Test 2\",\"body\":\"Body\",\"pinned_until\":null}"`
Expected: `{"ok":true}`

Run: `curl -s -X DELETE http://127.0.0.1:8200/api/admin/announcements/4`
Expected: `{"ok":true}`; a second identical DELETE returns `{"error":"Not found"}`.

Run: `curl -s -X POST http://127.0.0.1:8200/api/admin/announcements -H "Content-Type: application/json" -d "{\"title\":\"\",\"body\":\"x\"}"`
Expected: `{"error":"Title is required (max 200 characters)"}` with status 400.

- [ ] **Step 5: Commit**

```bash
git add functions/api/announcements.js functions/api/admin/announcements.js "functions/api/admin/announcements/[id].js"
git commit -m "Announcements API: public feed + admin CRUD"
```

---

### Task 5: Public announcements UI + service-worker API bypass

**Files:**
- Modify: `sw.js`, `index.html`, `community.html`, `assets/js/site.js`

**Interfaces:**
- Consumes: `GET /api/announcements` (Task 4).
- Produces: `#news-list` grid on the homepage (top 3), `#news-archive-list` on Community (all 20); both sections hidden unless the API returns items.

- [ ] **Step 1: Update `sw.js`** — never cache or intercept API/portal requests, and bump the cache version so installed PWAs pick up the change.

Change line 4 from `var CACHE = "wopha-v1";` to:

```js
var CACHE = "wopha-v2";
```

In the `fetch` handler, immediately after `if (e.request.method !== "GET") return;`, add:

```js
  // API responses must always be live (or fail cleanly); portal pages are
  // login-gated and must never land in a shared cache.
  var path = new URL(e.request.url).pathname;
  if (path.indexOf("/api/") === 0 || path.indexOf("/portal/") === 0) return;
```

- [ ] **Step 2: Add the news strip to `index.html`** — insert immediately after the closing `</section>` of the quick-actions section (the section containing `id="season-heading"`, which ends right before `<section class="section section--tint" aria-labelledby="about-heading">`):

```html
    <section class="section" id="news" hidden aria-labelledby="news-heading">
      <div class="container">
        <span class="eyebrow">Latest from the board</span>
        <h2 id="news-heading">Announcements</h2>
        <div class="grid grid--3" id="news-list"></div>
        <p><a href="community.html#news-archive">All announcements →</a></p>
      </div>
    </section>
```

- [ ] **Step 3: Add the archive to `community.html`** — insert immediately after the closing `</section>` of the events section (`id="events"`):

```html
    <section class="section section--tint" id="news-archive" hidden aria-labelledby="news-archive-heading">
      <div class="container">
        <span class="eyebrow">Latest from the board</span>
        <h2 id="news-archive-heading">Announcements</h2>
        <div class="grid grid--3" id="news-archive-list"></div>
      </div>
    </section>
```

- [ ] **Step 4: Add the renderer to `assets/js/site.js`** (append at the end of the file):

```js
// Announcements: fetched from the portal API. If the API is unreachable
// (offline, or portal not yet deployed) the sections simply stay hidden.
(function () {
  var list = document.getElementById("news-list");
  var archive = document.getElementById("news-archive-list");
  var target = list || archive;
  if (!target) return;
  fetch("/api/announcements").then(function (r) {
    if (!r.ok) throw new Error("bad status");
    return r.json();
  }).then(function (data) {
    var items = (data && data.announcements) || [];
    if (list) items = items.slice(0, 3);
    if (!items.length) return;
    items.forEach(function (a) {
      var card = document.createElement("div");
      card.className = "card";
      var h = document.createElement("h3");
      h.textContent = a.title;
      var p = document.createElement("p");
      p.textContent = a.body;
      var d = document.createElement("p");
      d.textContent = a.created_at.slice(0, 10);
      card.appendChild(h);
      card.appendChild(p);
      card.appendChild(d);
      target.appendChild(card);
    });
    var section = target.closest("section");
    if (section) section.hidden = false;
  }).catch(function () { /* leave section hidden */ });
})();
```

- [ ] **Step 5: Verify in the browser**

With `npm run dev` running, open `http://127.0.0.1:8200/` — the "Latest from the board" section appears with the 3 seeded announcements, pinned first. Open `http://127.0.0.1:8200/community.html` — archive section appears.

Degradation check: `python -m http.server 8201` from the repo root (static only, no functions), open `http://localhost:8201/` — the news section stays hidden and the console shows no uncaught errors. Stop the python server.

- [ ] **Step 6: Commit**

```bash
git add sw.js index.html community.html assets/js/site.js
git commit -m "Homepage news strip + community archive fed by announcements API"
```

---

### Task 6: Forms pipeline — store in D1, forward to Web3Forms, repoint the four forms

**Files:**
- Create: `functions/api/forms/submit.js`, `thanks.html`
- Modify: `contact.html` (two forms), `board.html` (ARC form), `suggestions.html` (suggestion form)

**Interfaces:**
- Consumes: `validateSubmission()` (Task 3), `submissions` table (Task 1), secret `env.WEB3FORMS_KEY` (optional — skipped when unset, e.g. local dev).
- Produces: `POST /api/forms/submit` accepting standard form-encoded posts with hidden `form_type`; stores a row in `submissions` (status `new`), best-effort forwards to Web3Forms, then 303-redirects to `/thanks.html`. Task 9's inbox reads these rows.

- [ ] **Step 1: Implement `functions/api/forms/submit.js`**

```js
import { validateSubmission } from "../_lib/validate.js";

const SUBJECTS = {
  contact_update: "WOPHA contact info update",
  issue_report: "WOPHA issue report",
  suggestion: "WOPHA suggestion",
  arc_request: "WOPHA exterior change request",
};

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });

  const formType = String(form.get("form_type") || "");
  const botcheck = String(form.get("botcheck") || "");
  const fields = {};
  for (const [key, value] of form.entries()) {
    if (key === "form_type" || key === "botcheck") continue;
    if (typeof value !== "string" || value === "") continue; // skip files and empty optionals
    fields[key] = value;
  }

  const check = validateSubmission(formType, fields, botcheck);
  if (!check.ok) return new Response(check.error, { status: 400 });

  await env.DB.prepare("INSERT INTO submissions (form_type, fields) VALUES (?, ?)")
    .bind(formType, JSON.stringify(fields))
    .run();

  // Email notification is best-effort: the submission is already stored, so
  // a Web3Forms outage must not fail the resident's submit.
  if (env.WEB3FORMS_KEY) {
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject: SUBJECTS[formType],
          ...fields,
        }),
      });
    } catch (_) { /* ignore */ }
  }

  return Response.redirect(new URL("/thanks.html", request.url).toString(), 303);
}
```

- [ ] **Step 2: Create `thanks.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Got it — Woods of Parkview</title>
  <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">Thank you</span>
      <h1>Got it.</h1>
      <p class="lede">Your message is in the board's queue — a volunteer will see it in the board portal, and the board also gets an email copy. If you left an email address, you'll hear back there.</p>
      <p><a class="btn btn--primary" href="index.html">Back to the site</a></p>
    </div>
  </main>
</body>
</html>
```

- [ ] **Step 3: Repoint all four forms.** For each form below, make exactly these changes:

1. Change `action="https://api.web3forms.com/submit"` to `action="/api/forms/submit"`.
2. Delete the `<input type="hidden" name="access_key" ...>` line.
3. Delete the `<input type="hidden" name="subject" ...>` line if present (the endpoint sets subjects server-side).
4. Delete the `<!-- PLACEHOLDER: ... Web3Forms ... -->` comment and the adjacent `<div class="setup-note">...</div>` block for that form (the key is now one server secret, handled in the launch checklist).
5. Add these two lines right after the opening `<form ...>` tag (with the correct `form_type` value):

```html
          <input type="hidden" name="form_type" value="FORM_TYPE_HERE">
          <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
```

| File | Form | `form_type` value |
|---|---|---|
| `contact.html` | `#update` contact-info form | `contact_update` |
| `contact.html` | `#report` issue form | `issue_report` |
| `suggestions.html` | suggestion form | `suggestion` |
| `board.html` | `#arc` exterior change form | `arc_request` |

- [ ] **Step 4: Verify end-to-end locally**

With `npm run dev` restarted, open `http://127.0.0.1:8200/contact.html#report`, fill in the issue form, submit.
Expected: browser lands on `/thanks.html`.

Run: `npx wrangler d1 execute wopha --local --command "SELECT id, form_type, status FROM submissions ORDER BY id DESC LIMIT 1"`
Expected: the new row, `form_type = issue_report`, `status = new`.

Repeat the submit once for each of the other three forms (contact update, suggestion, ARC) and confirm a row appears for each `form_type`.

Bot check: `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8200/api/forms/submit -d "form_type=suggestion&message=spam&botcheck=on"`
Expected: `400`.

- [ ] **Step 5: Commit**

```bash
git add functions/api/forms/submit.js thanks.html contact.html board.html suggestions.html
git commit -m "Forms post to portal API: stored in D1, forwarded to Web3Forms"
```

---

### Task 7: Portal shell + dashboard

**Files:**
- Create: `assets/css/portal.css`, `portal/portal.js`, `portal/index.html`, `functions/api/admin/summary.js`

**Interfaces:**
- Consumes: middleware (Task 2), tables (Task 1).
- Produces: `GET /api/admin/summary` → `{year, households, paid, newSubmissions, latestAnnouncement: {title, created_at} | null}`; shared portal helpers `api(path, options)` (fetch wrapper: JSON-encodes non-string bodies, throws `Error` with the server's `error` message on non-2xx), `showError(err)` and `clearError()` (write/clear `#error`); the portal page skeleton (head links, `.portal-nav`, `#error` box) that Tasks 8, 9, 11, 12 copy.

- [ ] **Step 1: Create `assets/css/portal.css`**

```css
/* Board portal — small additions on top of the site design system. */
.portal-nav { display: flex; gap: 1rem 1.5rem; flex-wrap: wrap; margin: 1rem 0 2rem; }
.portal-nav a { font-weight: 600; }
.portal-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
.portal-table th, .portal-table td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(0, 0, 0, 0.12); vertical-align: top; }
.badge { display: inline-block; padding: 0.1rem 0.6rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
.badge--new { background: #fde68a; }
.badge--in_progress { background: #bfdbfe; }
.badge--done { background: #bbf7d0; }
.badge--paid { background: #bbf7d0; }
.badge--unpaid { background: #fecaca; }
.portal-error { background: #fee2e2; border: 1px solid #ef4444; padding: 0.75rem 1rem; border-radius: 8px; margin: 1rem 0; }
.portal-error:empty { display: none; }
.portal-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: end; margin: 1rem 0; }
.portal-actions > div { display: flex; flex-direction: column; gap: 0.25rem; }
```

- [ ] **Step 2: Create `portal/portal.js`**

```js
// Shared helpers for board portal pages.
async function api(path, options) {
  var opts = options || {};
  if (opts.body && typeof opts.body !== "string") {
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  var data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON (e.g. Access login page) */ }
  if (!res.ok) {
    throw new Error((data && data.error) || "Request failed (" + res.status + "). Are you signed in?");
  }
  return data;
}

function showError(err) {
  var box = document.getElementById("error");
  if (box) box.textContent = err && err.message ? err.message : String(err);
}

function clearError() {
  var box = document.getElementById("error");
  if (box) box.textContent = "";
}
```

- [ ] **Step 3: Create `portal/index.html`** — this file is also the skeleton for every other portal page (same `<head>`, `<nav>`, `#error` box; only the `<title>`, `<h1>`, content, and page script differ).

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Dashboard — WOPHA board portal</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="stylesheet" href="../assets/css/portal.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">WOPHA board portal</span>
      <h1>Dashboard</h1>
      <nav class="portal-nav">
        <a href="index.html">Dashboard</a>
        <a href="announcements.html">Announcements</a>
        <a href="inbox.html">Inbox</a>
        <a href="ledger.html">Ledger</a>
        <a href="content.html">Site content</a>
        <a href="../index.html">← Public site</a>
      </nav>
      <div id="error" class="portal-error"></div>
      <div class="stat-row">
        <div class="stat"><strong id="stat-paid">–</strong> <span id="stat-paid-label">households paid</span></div>
        <div class="stat"><strong id="stat-new">–</strong> <span>new inbox items</span></div>
        <div class="stat"><strong id="stat-households">–</strong> <span>households on file</span></div>
      </div>
      <h2>Latest announcement</h2>
      <p id="latest">–</p>
      <p><a class="btn" href="/api/admin/export">Download full data export (JSON)</a></p>
    </div>
  </main>
  <script src="portal.js"></script>
  <script>
    api("/api/admin/summary").then(function (s) {
      document.getElementById("stat-paid").textContent = s.paid + " / " + s.households;
      document.getElementById("stat-paid-label").textContent = "households paid for " + s.year;
      document.getElementById("stat-new").textContent = String(s.newSubmissions);
      document.getElementById("stat-households").textContent = String(s.households);
      document.getElementById("latest").textContent = s.latestAnnouncement
        ? s.latestAnnouncement.title + " (" + s.latestAnnouncement.created_at.slice(0, 10) + ")"
        : "No announcements yet.";
    }).catch(showError);
  </script>
</body>
</html>
```

(The export link 404s until Task 13 ships `export.js` — acceptable while building.)

- [ ] **Step 4: Implement `functions/api/admin/summary.js`**

```js
import { json } from "../_lib/respond.js";

export async function onRequestGet({ env }) {
  const year = new Date().getFullYear();
  const households = await env.DB.prepare("SELECT COUNT(*) AS n FROM households").first();
  const paid = await env.DB.prepare("SELECT COUNT(*) AS n FROM payments WHERE year = ?").bind(year).first();
  const newSubs = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'new'").first();
  const latest = await env.DB.prepare(
    "SELECT title, created_at FROM announcements WHERE deleted = 0 ORDER BY created_at DESC LIMIT 1"
  ).first();
  return json({
    year,
    households: households.n,
    paid: paid.n,
    newSubmissions: newSubs.n,
    latestAnnouncement: latest || null,
  });
}
```

- [ ] **Step 5: Verify**

Run: `curl -s http://127.0.0.1:8200/api/admin/summary` (restart dev server first)
Expected: `{"year":2026,"households":5,"paid":2,"newSubmissions":...}` — newSubmissions ≥ 2 (seeds plus Task 6 test submits).

Open `http://127.0.0.1:8200/portal/` in the browser: dashboard renders with those numbers, no error box.

- [ ] **Step 6: Commit**

```bash
git add assets/css/portal.css portal/portal.js portal/index.html functions/api/admin/summary.js
git commit -m "Portal shell and dashboard with summary endpoint"
```

---

### Task 8: Portal announcements manager

**Files:**
- Create: `portal/announcements.html`

**Interfaces:**
- Consumes: `api()`/`showError()`/`clearError()` (Task 7), admin announcements endpoints (Task 4), portal page skeleton (Task 7).

- [ ] **Step 1: Create `portal/announcements.html`** — Task 7's skeleton with this `<h1>`, content, and script:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Announcements — WOPHA board portal</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="stylesheet" href="../assets/css/portal.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">WOPHA board portal</span>
      <h1>Announcements</h1>
      <nav class="portal-nav">
        <a href="index.html">Dashboard</a>
        <a href="announcements.html">Announcements</a>
        <a href="inbox.html">Inbox</a>
        <a href="ledger.html">Ledger</a>
        <a href="content.html">Site content</a>
        <a href="../index.html">← Public site</a>
      </nav>
      <div id="error" class="portal-error"></div>

      <form class="form-grid" id="ann-form">
        <input type="hidden" id="ann-id" value="">
        <div>
          <label for="ann-title">Title</label>
          <input type="text" id="ann-title" maxlength="200" required>
        </div>
        <div>
          <label for="ann-body">Body (plain text; shown on the homepage)</label>
          <textarea id="ann-body" rows="4" maxlength="4000" required></textarea>
        </div>
        <div>
          <label for="ann-pin">Keep at the top until (optional)</label>
          <input type="date" id="ann-pin">
        </div>
        <div>
          <button class="btn btn--primary" type="submit" id="ann-save">Publish</button>
          <button class="btn" type="button" id="ann-cancel" hidden>Cancel edit</button>
        </div>
      </form>

      <h2>Published</h2>
      <table class="portal-table">
        <thead><tr><th>Date</th><th>Title</th><th>Pinned until</th><th></th></tr></thead>
        <tbody id="ann-rows"></tbody>
      </table>
    </div>
  </main>
  <script src="portal.js"></script>
  <script>
    var form = document.getElementById("ann-form");
    var idEl = document.getElementById("ann-id");
    var titleEl = document.getElementById("ann-title");
    var bodyEl = document.getElementById("ann-body");
    var pinEl = document.getElementById("ann-pin");
    var saveBtn = document.getElementById("ann-save");
    var cancelBtn = document.getElementById("ann-cancel");
    var rows = document.getElementById("ann-rows");

    function resetForm() {
      idEl.value = "";
      form.reset();
      saveBtn.textContent = "Publish";
      cancelBtn.hidden = true;
    }

    function load() {
      api("/api/admin/announcements").then(function (data) {
        rows.textContent = "";
        data.announcements.forEach(function (a) {
          var tr = document.createElement("tr");
          [a.created_at.slice(0, 10), a.title, a.pinned_until || "—"].forEach(function (text) {
            var td = document.createElement("td");
            td.textContent = text;
            tr.appendChild(td);
          });
          var actions = document.createElement("td");
          var edit = document.createElement("button");
          edit.className = "btn";
          edit.type = "button";
          edit.textContent = "Edit";
          edit.addEventListener("click", function () {
            idEl.value = String(a.id);
            titleEl.value = a.title;
            bodyEl.value = a.body;
            pinEl.value = a.pinned_until || "";
            saveBtn.textContent = "Save changes";
            cancelBtn.hidden = false;
            window.scrollTo(0, 0);
          });
          var del = document.createElement("button");
          del.className = "btn";
          del.type = "button";
          del.textContent = "Delete";
          del.addEventListener("click", function () {
            if (!confirm("Delete \"" + a.title + "\"? It disappears from the public site.")) return;
            api("/api/admin/announcements/" + a.id, { method: "DELETE" }).then(load).catch(showError);
          });
          actions.appendChild(edit);
          actions.appendChild(document.createTextNode(" "));
          actions.appendChild(del);
          tr.appendChild(actions);
          rows.appendChild(tr);
        });
      }).catch(showError);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var payload = {
        title: titleEl.value,
        body: bodyEl.value,
        pinned_until: pinEl.value || null,
      };
      var req = idEl.value
        ? api("/api/admin/announcements/" + idEl.value, { method: "PUT", body: payload })
        : api("/api/admin/announcements", { method: "POST", body: payload });
      req.then(function () { resetForm(); load(); }).catch(showError);
    });

    cancelBtn.addEventListener("click", resetForm);
    load();
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify in the browser**

Open `http://127.0.0.1:8200/portal/announcements.html`:
- Seeded announcements listed, newest first.
- Publish a new one → appears in the table AND on `http://127.0.0.1:8200/` homepage strip.
- Edit it (change title) → table and homepage update.
- Delete it → gone from both.
- Submit with empty title → red error box shows the validation message, nothing saved.

- [ ] **Step 3: Commit**

```bash
git add portal/announcements.html
git commit -m "Portal announcements manager"
```

---

### Task 9: Submissions inbox

**Files:**
- Create: `functions/api/admin/submissions.js`, `functions/api/admin/submissions/[id].js`, `portal/inbox.html`

**Interfaces:**
- Consumes: middleware (Task 2), `submissions` rows written by Task 6, portal helpers (Task 7).
- Produces: `GET /api/admin/submissions?status=new|in_progress|done` (omit for all) → `{submissions: [{id, form_type, fields: object, status, notes, created_at}]}` newest first; `PATCH /api/admin/submissions/:id` body `{status?, notes?}` → `{ok:true}`.

- [ ] **Step 1: Implement `functions/api/admin/submissions.js`**

```js
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
```

- [ ] **Step 2: Implement `functions/api/admin/submissions/[id].js`**

```js
import { json } from "../../_lib/respond.js";

const STATUSES = ["new", "in_progress", "done"];

export async function onRequestPatch({ request, env, params }) {
  const id = Number(params.id);
  const input = await request.json().catch(() => ({}));
  const sets = [];
  const binds = [];
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) return json({ error: "Bad status" }, 400);
    sets.push("status = ?");
    binds.push(input.status);
  }
  if (input.notes !== undefined) {
    if (typeof input.notes !== "string" || input.notes.length > 2000) {
      return json({ error: "Notes must be text (max 2000 characters)" }, 400);
    }
    sets.push("notes = ?");
    binds.push(input.notes);
  }
  if (!sets.length) return json({ error: "Nothing to update" }, 400);
  binds.push(id);
  const r = await env.DB.prepare("UPDATE submissions SET " + sets.join(", ") + " WHERE id = ?")
    .bind(...binds).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
```

- [ ] **Step 3: Create `portal/inbox.html`** — Task 7's skeleton with this content and script:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Inbox — WOPHA board portal</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="stylesheet" href="../assets/css/portal.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">WOPHA board portal</span>
      <h1>Inbox</h1>
      <nav class="portal-nav">
        <a href="index.html">Dashboard</a>
        <a href="announcements.html">Announcements</a>
        <a href="inbox.html">Inbox</a>
        <a href="ledger.html">Ledger</a>
        <a href="content.html">Site content</a>
        <a href="../index.html">← Public site</a>
      </nav>
      <div id="error" class="portal-error"></div>
      <div class="portal-actions">
        <div>
          <label for="filter">Show</label>
          <select id="filter">
            <option value="">Everything</option>
            <option value="new" selected>New</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <div id="items"></div>
    </div>
  </main>
  <script src="portal.js"></script>
  <script>
    var TYPE_LABELS = {
      contact_update: "Contact update",
      issue_report: "Issue report",
      suggestion: "Suggestion",
      arc_request: "Exterior change request",
    };
    var filter = document.getElementById("filter");
    var items = document.getElementById("items");

    function load() {
      clearError();
      var qs = filter.value ? "?status=" + filter.value : "";
      api("/api/admin/submissions" + qs).then(function (data) {
        items.textContent = "";
        if (!data.submissions.length) {
          var empty = document.createElement("p");
          empty.textContent = "Nothing here.";
          items.appendChild(empty);
          return;
        }
        data.submissions.forEach(function (s) {
          items.appendChild(renderItem(s));
        });
      }).catch(showError);
    }

    function renderItem(s) {
      var card = document.createElement("div");
      card.className = "card";

      var head = document.createElement("h3");
      head.textContent = (TYPE_LABELS[s.form_type] || s.form_type) + " — " + s.created_at.slice(0, 10);
      card.appendChild(head);

      var badge = document.createElement("span");
      badge.className = "badge badge--" + s.status;
      badge.textContent = s.status.replace("_", " ");
      card.appendChild(badge);

      var dl = document.createElement("dl");
      Object.keys(s.fields).forEach(function (k) {
        var dt = document.createElement("dt");
        dt.textContent = k;
        var dd = document.createElement("dd");
        dd.textContent = s.fields[k];
        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      card.appendChild(dl);

      var statusSel = document.createElement("select");
      ["new", "in_progress", "done"].forEach(function (st) {
        var o = document.createElement("option");
        o.value = st;
        o.textContent = st.replace("_", " ");
        if (st === s.status) o.selected = true;
        statusSel.appendChild(o);
      });
      statusSel.addEventListener("change", function () {
        api("/api/admin/submissions/" + s.id, { method: "PATCH", body: { status: statusSel.value } })
          .then(load).catch(showError);
      });
      card.appendChild(statusSel);

      var notes = document.createElement("textarea");
      notes.rows = 2;
      notes.placeholder = "Board notes (private)";
      notes.value = s.notes;
      card.appendChild(notes);

      var save = document.createElement("button");
      save.className = "btn";
      save.type = "button";
      save.textContent = "Save notes";
      save.addEventListener("click", function () {
        api("/api/admin/submissions/" + s.id, { method: "PATCH", body: { notes: notes.value } })
          .then(function () { save.textContent = "Saved ✓"; setTimeout(function () { save.textContent = "Save notes"; }, 1500); })
          .catch(showError);
      });
      card.appendChild(save);

      return card;
    }

    filter.addEventListener("change", load);
    load();
  </script>
</body>
</html>
```

- [ ] **Step 4: Verify**

Run: `curl -s "http://127.0.0.1:8200/api/admin/submissions?status=new"` (restart dev server first)
Expected: JSON including the seeded issue report and suggestion, `fields` as a nested object (not a string).

Run: `curl -s -X PATCH http://127.0.0.1:8200/api/admin/submissions/1 -H "Content-Type: application/json" -d "{\"status\":\"done\",\"notes\":\"Fixed by Joel\"}"`
Expected: `{"ok":true}`

In the browser, open `http://127.0.0.1:8200/portal/inbox.html`:
- Default "New" filter hides the item just marked done; "Everything" shows it with a green badge.
- Changing a status via the dropdown persists (reload the page to confirm).
- Notes save and survive reload.

- [ ] **Step 5: Commit**

```bash
git add functions/api/admin/submissions.js "functions/api/admin/submissions/[id].js" portal/inbox.html
git commit -m "Submissions inbox: admin endpoints + portal page"
```

---

### Task 10: Ledger logic library (CSV + summary math)

**Files:**
- Create: `functions/api/_lib/csv.js`, `functions/api/_lib/ledger.js`
- Test: `tests/csv.test.js`, `tests/ledger.test.js`

**Interfaces:**
- Produces: `parseCsv(text)` → `string[][]`; `toCsv(rows: string[][])` → `string` (quotes cells containing `"` `,` or newlines); `parseHouseholdsCsv(text)` → `{ok:true, households:[{address, owner_name, email, phone}], errors:string[]}` or `{ok:false, error}`; `ledgerSummary(rows: [{paid:boolean, amount_cents:number}], duesCents)` → `{total, paidCount, unpaidCount, collectedCents, outstandingCents}`; `DUES_CENTS = 53500`. Used by Task 11.

- [ ] **Step 1: Write the failing tests** — `tests/csv.test.js`

```js
import { describe, it, expect } from "vitest";
import { parseCsv, toCsv } from "../functions/api/_lib/csv.js";

describe("parseCsv", () => {
  it("parses plain rows", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('"101 Main St, Apt 2",Lee\n"say ""hi""",x'))
      .toEqual([["101 Main St, Apt 2", "Lee"], ['say "hi"', "x"]]);
  });
  it("handles CRLF line endings and skips trailing blank line", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("toCsv", () => {
  it("round-trips values that need quoting", () => {
    const rows = [["addr, with comma", 'quote " inside'], ["plain", "x"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
```

and `tests/ledger.test.js`:

```js
import { describe, it, expect } from "vitest";
import { parseHouseholdsCsv, ledgerSummary, DUES_CENTS } from "../functions/api/_lib/ledger.js";

describe("parseHouseholdsCsv", () => {
  it("maps rows using the header, tolerating column order and case", () => {
    const r = parseHouseholdsCsv("Owner_Name,ADDRESS,email\nAlex,101 Planters Way,alex@x.com");
    expect(r.ok).toBe(true);
    expect(r.households).toEqual([
      { address: "101 Planters Way", owner_name: "Alex", email: "alex@x.com", phone: "" },
    ]);
    expect(r.errors).toEqual([]);
  });
  it("requires an address column", () => {
    expect(parseHouseholdsCsv("name,email\nAlex,a@x.com").ok).toBe(false);
  });
  it("reports rows with empty addresses but keeps the rest", () => {
    const r = parseHouseholdsCsv("address\n101 Planters Way\n\n102 Planters Way");
    expect(r.ok).toBe(true);
    expect(r.households.length).toBe(2);
    expect(r.errors.length).toBe(1);
  });
});

describe("ledgerSummary", () => {
  it("computes paid/unpaid counts and money totals", () => {
    const rows = [
      { paid: true, amount_cents: 53500 },
      { paid: true, amount_cents: 50000 },
      { paid: false, amount_cents: 0 },
    ];
    expect(ledgerSummary(rows, DUES_CENTS)).toEqual({
      total: 3,
      paidCount: 2,
      unpaidCount: 1,
      collectedCents: 103500,
      outstandingCents: 53500,
    });
  });
  it("handles an empty ledger", () => {
    expect(ledgerSummary([], DUES_CENTS)).toEqual({
      total: 0, paidCount: 0, unpaidCount: 0, collectedCents: 0, outstandingCents: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `csv.js` / `ledger.js`.

- [ ] **Step 3: Implement `functions/api/_lib/csv.js`**

```js
// Minimal CSV support (RFC-4180 quoting) — enough for Google Sheets exports.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function toCsv(rows) {
  return rows.map((row) =>
    row.map((cell) => {
      const s = String(cell);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")
  ).join("\n");
}
```

- [ ] **Step 4: Implement `functions/api/_lib/ledger.js`**

```js
import { parseCsv } from "./csv.js";

// 2026 annual dues. Update when dues change (drives the "outstanding" figure).
export const DUES_CENTS = 53500;

// Expected header: address[,owner_name][,email][,phone] — any order, any case.
export function parseHouseholdsCsv(text) {
  const rows = parseCsv(String(text || "").trim());
  if (rows.length < 2) return { ok: false, error: "Need a header row plus at least one household" };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {
    address: header.indexOf("address"),
    owner_name: header.indexOf("owner_name"),
    email: header.indexOf("email"),
    phone: header.indexOf("phone"),
  };
  if (col.address === -1) return { ok: false, error: "Missing required 'address' column" };
  const households = [];
  const errors = [];
  rows.slice(1).forEach((r, i) => {
    const get = (idx) => (idx === -1 ? "" : String(r[idx] || "").trim());
    const address = get(col.address);
    if (!address) { errors.push("Row " + (i + 2) + ": empty address — skipped"); return; }
    households.push({
      address,
      owner_name: get(col.owner_name),
      email: get(col.email),
      phone: get(col.phone),
    });
  });
  return { ok: true, households, errors };
}

export function ledgerSummary(rows, duesCents) {
  const paid = rows.filter((r) => r.paid);
  return {
    total: rows.length,
    paidCount: paid.length,
    unpaidCount: rows.length - paid.length,
    collectedCents: paid.reduce((sum, r) => sum + r.amount_cents, 0),
    outstandingCents: (rows.length - paid.length) * duesCents,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 6: Commit**

```bash
git add functions/api/_lib/csv.js functions/api/_lib/ledger.js tests/csv.test.js tests/ledger.test.js
git commit -m "CSV and ledger math libraries"
```

---

### Task 11: Ledger API + portal page + CSV export

**Files:**
- Create: `functions/api/admin/households.js`, `functions/api/admin/payments.js`, `functions/api/admin/payments/[id].js`, `functions/api/admin/ledger-export.js`, `portal/ledger.html`

**Interfaces:**
- Consumes: Task 10 (`parseHouseholdsCsv`, `ledgerSummary`, `toCsv`, `DUES_CENTS`), `validatePayment` (Task 3), portal helpers (Task 7).
- Produces:
  - `GET /api/admin/households?year=2026` → `{year, dues_cents, summary, households: [{id, address, owner_name, email, phone, payment_id, amount_cents, method, paid_on}]}` (payment fields null when unpaid), sorted by address.
  - `POST /api/admin/households` with JSON `{csv: string}` → `{imported, errors: string[]}` (CSV import, upsert by address).
  - `POST /api/admin/payments` body `{household_id, year, amount_cents, method, paid_on, note?}` → `{id}` 201; 409 if that household+year is already paid.
  - `DELETE /api/admin/payments/:id` → `{ok:true}`.
  - `GET /api/admin/ledger-export?year=2026&only=unpaid|all` → `text/csv` attachment.

- [ ] **Step 1: Implement `functions/api/admin/households.js`**

```js
import { json } from "../_lib/respond.js";
import { parseHouseholdsCsv, ledgerSummary, DUES_CENTS } from "../_lib/ledger.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const { results } = await env.DB.prepare(
    `SELECT h.id, h.address, h.owner_name, h.email, h.phone,
            p.id AS payment_id, p.amount_cents, p.method, p.paid_on
     FROM households h
     LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
     ORDER BY h.address`
  ).bind(year).all();
  const summary = ledgerSummary(
    results.map((r) => ({ paid: r.payment_id != null, amount_cents: r.amount_cents || 0 })),
    DUES_CENTS
  );
  return json({ year, dues_cents: DUES_CENTS, summary, households: results });
}

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const parsed = parseHouseholdsCsv(input.csv);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const stmts = parsed.households.map((h) =>
    env.DB.prepare(
      `INSERT INTO households (address, owner_name, email, phone) VALUES (?, ?, ?, ?)
       ON CONFLICT(address) DO UPDATE SET
         owner_name = excluded.owner_name, email = excluded.email, phone = excluded.phone`
    ).bind(h.address, h.owner_name, h.email, h.phone)
  );
  if (stmts.length) await env.DB.batch(stmts);
  return json({ imported: parsed.households.length, errors: parsed.errors });
}
```

- [ ] **Step 2: Implement `functions/api/admin/payments.js`**

```js
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
```

- [ ] **Step 3: Implement `functions/api/admin/payments/[id].js`**

```js
import { json } from "../../_lib/respond.js";

export async function onRequestDelete({ env, params }) {
  const r = await env.DB.prepare("DELETE FROM payments WHERE id = ?")
    .bind(Number(params.id)).run();
  if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
  return json({ ok: true });
}
```

- [ ] **Step 4: Implement `functions/api/admin/ledger-export.js`**

```js
import { toCsv } from "../_lib/csv.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const onlyUnpaid = url.searchParams.get("only") === "unpaid";
  const { results } = await env.DB.prepare(
    `SELECT h.address, h.owner_name, h.email, h.phone,
            p.amount_cents, p.method, p.paid_on
     FROM households h
     LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
     ORDER BY h.address`
  ).bind(year).all();
  const rows = results
    .filter((r) => (onlyUnpaid ? r.paid_on == null : true))
    .map((r) => [
      r.address, r.owner_name, r.email, r.phone,
      r.paid_on ? "paid" : "unpaid",
      r.amount_cents != null ? (r.amount_cents / 100).toFixed(2) : "",
      r.method || "", r.paid_on || "",
    ]);
  const csv = toCsv([
    ["address", "owner_name", "email", "phone", "status", "amount", "method", "paid_on"],
    ...rows,
  ]);
  const name = "wopha-ledger-" + year + (onlyUnpaid ? "-unpaid" : "") + ".csv";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + name + '"',
    },
  });
}
```

- [ ] **Step 5: Create `portal/ledger.html`** — Task 7's skeleton with this content and script:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Ledger — WOPHA board portal</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="stylesheet" href="../assets/css/portal.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">WOPHA board portal</span>
      <h1>Dues ledger</h1>
      <nav class="portal-nav">
        <a href="index.html">Dashboard</a>
        <a href="announcements.html">Announcements</a>
        <a href="inbox.html">Inbox</a>
        <a href="ledger.html">Ledger</a>
        <a href="content.html">Site content</a>
        <a href="../index.html">← Public site</a>
      </nav>
      <div id="error" class="portal-error"></div>

      <div class="portal-actions">
        <div>
          <label for="year">Year</label>
          <input type="number" id="year" min="2020" max="2100" style="width:6rem">
        </div>
        <div>
          <label for="pay-method">Method</label>
          <select id="pay-method">
            <option value="check">Check</option>
            <option value="zelle">Zelle</option>
            <option value="stripe">Stripe</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label for="pay-date">Paid on</label>
          <input type="date" id="pay-date">
        </div>
        <div>
          <label for="pay-amount">Amount ($)</label>
          <input type="number" id="pay-amount" step="0.01" min="0" value="535.00" style="width:7rem">
        </div>
        <div>
          <a class="btn" id="export-all" href="#">Export CSV</a>
        </div>
        <div>
          <a class="btn" id="export-unpaid" href="#">Export unpaid</a>
        </div>
      </div>
      <p id="summary" class="lede">–</p>

      <table class="portal-table">
        <thead><tr><th>Address</th><th>Owner</th><th>Email</th><th>Status</th><th>Method</th><th>Date</th><th></th></tr></thead>
        <tbody id="ledger-rows"></tbody>
      </table>

      <h2>Import households</h2>
      <p>Paste a CSV export from the treasurer's spreadsheet. Required column: <code>address</code>; optional: <code>owner_name</code>, <code>email</code>, <code>phone</code>. Existing addresses are updated, new ones added; nothing is deleted.</p>
      <form class="form-grid" id="import-form">
        <div>
          <textarea id="import-csv" rows="6" placeholder="address,owner_name,email,phone&#10;101 Planters Way,Alex Morgan,alex@example.com,"></textarea>
        </div>
        <div>
          <button class="btn btn--primary" type="submit">Import</button>
          <span id="import-result"></span>
        </div>
      </form>
    </div>
  </main>
  <script src="portal.js"></script>
  <script>
    var yearEl = document.getElementById("year");
    var methodEl = document.getElementById("pay-method");
    var dateEl = document.getElementById("pay-date");
    var amountEl = document.getElementById("pay-amount");
    var rowsEl = document.getElementById("ledger-rows");
    var summaryEl = document.getElementById("summary");

    var today = new Date();
    yearEl.value = String(today.getFullYear());
    dateEl.value = today.toISOString().slice(0, 10);

    function dollars(cents) {
      return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 });
    }

    function load() {
      clearError();
      var year = yearEl.value;
      document.getElementById("export-all").href = "/api/admin/ledger-export?year=" + year;
      document.getElementById("export-unpaid").href = "/api/admin/ledger-export?year=" + year + "&only=unpaid";
      api("/api/admin/households?year=" + year).then(function (data) {
        var s = data.summary;
        summaryEl.textContent = s.paidCount + " of " + s.total + " households paid for " + data.year +
          " — " + dollars(s.collectedCents) + " collected, " + dollars(s.outstandingCents) + " outstanding.";
        rowsEl.textContent = "";
        data.households.forEach(function (h) {
          var tr = document.createElement("tr");
          [h.address, h.owner_name, h.email].forEach(function (text) {
            var td = document.createElement("td");
            td.textContent = text || "";
            tr.appendChild(td);
          });

          var statusTd = document.createElement("td");
          var badge = document.createElement("span");
          var paid = h.payment_id != null;
          badge.className = "badge " + (paid ? "badge--paid" : "badge--unpaid");
          badge.textContent = paid ? "paid" : "unpaid";
          statusTd.appendChild(badge);
          tr.appendChild(statusTd);

          var methodTd = document.createElement("td");
          methodTd.textContent = h.method || "";
          tr.appendChild(methodTd);
          var dateTd = document.createElement("td");
          dateTd.textContent = h.paid_on || "";
          tr.appendChild(dateTd);

          var actionTd = document.createElement("td");
          var btn = document.createElement("button");
          btn.className = "btn";
          btn.type = "button";
          if (paid) {
            btn.textContent = "Undo";
            btn.addEventListener("click", function () {
              if (!confirm("Remove the " + yearEl.value + " payment for " + h.address + "?")) return;
              api("/api/admin/payments/" + h.payment_id, { method: "DELETE" }).then(load).catch(showError);
            });
          } else {
            btn.textContent = "Mark paid";
            btn.addEventListener("click", function () {
              api("/api/admin/payments", {
                method: "POST",
                body: {
                  household_id: h.id,
                  year: Number(yearEl.value),
                  amount_cents: Math.round(parseFloat(amountEl.value) * 100),
                  method: methodEl.value,
                  paid_on: dateEl.value,
                },
              }).then(load).catch(showError);
            });
          }
          actionTd.appendChild(btn);
          tr.appendChild(actionTd);
          rowsEl.appendChild(tr);
        });
      }).catch(showError);
    }

    document.getElementById("import-form").addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      api("/api/admin/households", { method: "POST", body: { csv: document.getElementById("import-csv").value } })
        .then(function (r) {
          var msg = "Imported " + r.imported + " households.";
          if (r.errors.length) msg += " Skipped: " + r.errors.join("; ");
          document.getElementById("import-result").textContent = msg;
          load();
        }).catch(showError);
    });

    yearEl.addEventListener("change", load);
    load();
  </script>
</body>
</html>
```

- [ ] **Step 6: Verify**

Restart the dev server, then:

Run: `curl -s "http://127.0.0.1:8200/api/admin/households?year=2026"`
Expected: 5 seeded households sorted by address; summary `paidCount: 2`, `outstandingCents: 160500` (3 × 53500).

In the browser, open `http://127.0.0.1:8200/portal/ledger.html`:
- Summary line reads "2 of 5 households paid for 2026 — $1,035 collected, $1,605 outstanding."
- "Mark paid" on an unpaid household flips it to a green badge and updates the summary.
- Marking the same household again is impossible (button now "Undo"); "Undo" flips it back.
- Import: paste `address,owner_name\n106 Planters Way,New Owner` → "Imported 1 households." and the row appears unpaid.
- "Export unpaid" downloads a CSV whose rows are exactly the unpaid households.

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:8200/api/admin/payments -H "Content-Type: application/json" -d "{\"household_id\":1,\"year\":2026,\"amount_cents\":53500,\"method\":\"check\",\"paid_on\":\"2026-07-01\"}"`
Expected: `409` (household 1 is already paid for 2026 from the seed).

- [ ] **Step 7: Commit**

```bash
git add functions/api/admin/households.js functions/api/admin/payments.js "functions/api/admin/payments/[id].js" functions/api/admin/ledger-export.js portal/ledger.html
git commit -m "Dues ledger: households import, payments, CSV export, portal page"
```

---

### Task 12: Site-content editing (pool hours + season glance)

**Files:**
- Create: `functions/api/content.js`, `functions/api/admin/content.js`, `portal/content.html`
- Modify: `index.html` (add `id="season-glance"`), `pool.html` (add `id="pool-hours-body"`), `assets/js/site.js` (live swap)

**Interfaces:**
- Consumes: `validateContent`, `CONTENT_KEYS` (Task 3), `site_content` table (Task 1), portal helpers (Task 7).
- Produces: `GET /api/content` (public) → `{season_glance: [[label, value], ...], pool_hours: [...]}` (only keys that exist); `PUT /api/admin/content` body `{key, value}` → `{ok:true}`.

- [ ] **Step 1: Implement `functions/api/content.js`**

```js
import { json } from "./_lib/respond.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM site_content").all();
  const content = {};
  for (const r of results) {
    try { content[r.key] = JSON.parse(r.value); } catch (_) { /* skip bad rows */ }
  }
  return json(content);
}
```

- [ ] **Step 2: Implement `functions/api/admin/content.js`**

```js
import { json } from "../_lib/respond.js";
import { validateContent } from "../_lib/validate.js";

export async function onRequestPut({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateContent(input.key, input.value);
  if (!check.ok) return json({ error: check.error }, 400);
  await env.DB.prepare(
    `INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(input.key, JSON.stringify(check.value)).run();
  return json({ ok: true });
}
```

- [ ] **Step 3: Tag the live regions in the public pages.**

In `index.html`, the "This season at a glance" panel: change `<ul>` (the one inside `<div class="board-panel">`, directly under `<h2 id="season-heading">`) to:

```html
            <ul id="season-glance">
```

In `pool.html`, the hours table: change the `<tbody>` of the Day/Hours table to:

```html
            <tbody id="pool-hours-body">
```

Also delete the `<!-- PLACEHOLDER: Board must copy the 2026 daily hours ... -->` comment and the adjacent `<div class="setup-note">...</div>` below the table, replacing them with nothing (the portal now owns updates; the baked-in rows remain the offline fallback).

- [ ] **Step 4: Add the live swap to `assets/js/site.js`** (append at the end):

```js
// Live site content: board-edited values (pool hours, season glance) fetched
// from the portal API. Baked-in HTML is the fallback — offline or API-down
// leaves the page exactly as authored.
(function () {
  var glance = document.getElementById("season-glance");
  var hours = document.getElementById("pool-hours-body");
  if (!glance && !hours) return;
  fetch("/api/content").then(function (r) {
    if (!r.ok) throw new Error("bad status");
    return r.json();
  }).then(function (content) {
    function fill(el, rows, makeRow) {
      if (!el || !Array.isArray(rows) || !rows.length) return;
      el.textContent = "";
      rows.forEach(function (row) { el.appendChild(makeRow(row[0], row[1])); });
    }
    fill(glance, content.season_glance, function (label, value) {
      var li = document.createElement("li");
      var s = document.createElement("span");
      s.textContent = label;
      var st = document.createElement("strong");
      st.textContent = value;
      li.appendChild(s);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(st);
      return li;
    });
    fill(hours, content.pool_hours, function (label, value) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = label;
      var td2 = document.createElement("td");
      td2.textContent = value;
      tr.appendChild(td1);
      tr.appendChild(td2);
      return tr;
    });
  }).catch(function () { /* keep baked-in content */ });
})();
```

- [ ] **Step 5: Create `portal/content.html`** — Task 7's skeleton with this content and script:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Site content — WOPHA board portal</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="stylesheet" href="../assets/css/portal.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">WOPHA board portal</span>
      <h1>Site content</h1>
      <nav class="portal-nav">
        <a href="index.html">Dashboard</a>
        <a href="announcements.html">Announcements</a>
        <a href="inbox.html">Inbox</a>
        <a href="ledger.html">Ledger</a>
        <a href="content.html">Site content</a>
        <a href="../index.html">← Public site</a>
      </nav>
      <div id="error" class="portal-error"></div>
      <p class="lede">One row per line, in the form <code>label | value</code>. Changes appear on the public site on the next page load — no deploy needed.</p>

      <h2>Season at a glance (homepage panel)</h2>
      <form class="form-grid" data-key="season_glance">
        <div><textarea rows="7"></textarea></div>
        <div><button class="btn btn--primary" type="submit">Save</button> <span class="saved"></span></div>
      </form>

      <h2>Pool hours (pool page table)</h2>
      <form class="form-grid" data-key="pool_hours">
        <div><textarea rows="8"></textarea></div>
        <div><button class="btn btn--primary" type="submit">Save</button> <span class="saved"></span></div>
      </form>
    </div>
  </main>
  <script src="portal.js"></script>
  <script>
    var forms = document.querySelectorAll("form[data-key]");

    function toLines(rows) {
      return rows.map(function (r) { return r[0] + " | " + r[1]; }).join("\n");
    }
    function toRows(text) {
      return text.split("\n")
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length; })
        .map(function (line) {
          var i = line.indexOf("|");
          if (i === -1) return [line, ""];
          return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
        });
    }

    api("/api/content").then(function (content) {
      forms.forEach(function (form) {
        var rows = content[form.getAttribute("data-key")];
        if (rows) form.querySelector("textarea").value = toLines(rows);
      });
    }).catch(showError);

    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearError();
        var saved = form.querySelector(".saved");
        api("/api/admin/content", {
          method: "PUT",
          body: { key: form.getAttribute("data-key"), value: toRows(form.querySelector("textarea").value) },
        }).then(function () {
          saved.textContent = "Saved ✓";
          setTimeout(function () { saved.textContent = ""; }, 1500);
        }).catch(showError);
      });
    });
  </script>
</body>
</html>
```

- [ ] **Step 6: Verify**

Restart the dev server, then open `http://127.0.0.1:8200/portal/content.html`:
- Both textareas load the seeded rows as `label | value` lines.
- Change Friday's pool hours to `Friday | 11 a.m. – 10 p.m.`, save → open `http://127.0.0.1:8200/pool.html` and confirm the table shows the new value.
- Change a season-glance value, save → confirm on `http://127.0.0.1:8200/`.
- Save an empty textarea → red error box ("Value must be a list of 1–50 rows"), public page unchanged.

Degradation check: `python -m http.server 8201`, open `http://localhost:8201/pool.html` — the baked-in hours rows still show. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add functions/api/content.js functions/api/admin/content.js portal/content.html index.html pool.html assets/js/site.js
git commit -m "Board-editable site content: pool hours + season glance with static fallback"
```

---

### Task 13: Data export + weekly backup worker

**Files:**
- Create: `functions/api/admin/export.js`, `workers/backup/wrangler.toml`, `workers/backup/index.js`

**Interfaces:**
- Consumes: all five tables (Task 1); dashboard export link (Task 7) starts working.
- Produces: `GET /api/admin/export` → JSON attachment `{announcements: [...], submissions: [...], households: [...], payments: [...], site_content: [...]}`; a separate Worker `wopha-backup` that dumps the same shape to R2 every Monday 06:00 UTC and keeps the last 8.

- [ ] **Step 1: Implement `functions/api/admin/export.js`**

```js
const TABLES = ["announcements", "submissions", "households", "payments", "site_content"];

export async function onRequestGet({ env }) {
  const dump = {};
  for (const t of TABLES) {
    const { results } = await env.DB.prepare("SELECT * FROM " + t).all();
    dump[t] = results;
  }
  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="wopha-data-export.json"',
    },
  });
}
```

- [ ] **Step 2: Create `workers/backup/wrangler.toml`**

```toml
name = "wopha-backup"
main = "index.js"
compatibility_date = "2026-07-01"

# Mondays 06:00 UTC (≈ 1–2 a.m. Eastern)
[triggers]
crons = ["0 6 * * 1"]

[[d1_databases]]
binding = "DB"
database_name = "wopha"
# PLACEHOLDER: same id as the root wrangler.toml, set at launch (Task 14)
database_id = "00000000-0000-0000-0000-000000000000"

[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "wopha-backups"
```

- [ ] **Step 3: Create `workers/backup/index.js`**

```js
// Weekly D1 → R2 backup. Keeps the most recent KEEP dumps.
const TABLES = ["announcements", "submissions", "households", "payments", "site_content"];
const KEEP = 8;

export default {
  async scheduled(controller, env) {
    const dump = {};
    for (const t of TABLES) {
      const { results } = await env.DB.prepare("SELECT * FROM " + t).all();
      dump[t] = results;
    }
    const date = new Date(controller.scheduledTime).toISOString().slice(0, 10);
    await env.BACKUPS.put("wopha-backup-" + date + ".json", JSON.stringify(dump));

    const list = await env.BACKUPS.list({ prefix: "wopha-backup-" });
    const keys = list.objects.map((o) => o.key).sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP))) {
      await env.BACKUPS.delete(key);
    }
  },
};
```

- [ ] **Step 4: Verify**

Export: with the Pages dev server running, `curl -s http://127.0.0.1:8200/api/admin/export | head -3`
Expected: JSON starting with `{"announcements": [...` — and the dashboard's "Download full data export" link now works in the browser.

Backup worker (its own local sandbox — empty local D1/R2 is fine; we're verifying it runs):

```bash
cd workers/backup
npx wrangler d1 execute wopha --local --file=../../schema.sql
npx wrangler dev --test-scheduled --port 8202
```

In a second terminal: `curl -s "http://127.0.0.1:8202/__scheduled?cron=0+6+*+*+1"`
Expected: `Ran scheduled event` and no error in the worker log. Stop the worker, `cd ../..`.

- [ ] **Step 5: Commit**

```bash
git add functions/api/admin/export.js workers/backup/wrangler.toml workers/backup/index.js
git commit -m "Self-serve data export + weekly D1-to-R2 backup worker"
```

---

### Task 14: Docs, launch checklist, footer link

**Files:**
- Modify: `docs/launch-checklist.md`, `README.md`, `index.html` (footer link)

**Interfaces:**
- Consumes: everything above; documents the launch-time steps that turn placeholders (D1 id, Access policy, secret) into a live portal.

- [ ] **Step 1: Update `docs/launch-checklist.md`.**

In section **2. Forms**, replace the first checklist item (the one about creating Web3Forms keys and replacing `YOUR_WEB3FORMS_ACCESS_KEY` in all four forms) with:

```markdown
- [ ] Create ONE free **Web3Forms** access key (web3forms.com) routed to the
      board's email, and set it as the `WEB3FORMS_KEY` secret on the Pages
      project (Settings → Environment variables). The four site forms post to
      the portal API, which stores each submission in the board inbox and
      forwards a copy by email. No keys live in the HTML.
```

In section **5. Pool hours**, replace the item text with:

```markdown
- [ ] Enter the current hours in the board portal (Site content → Pool hours);
      they appear on pool.html automatically. The rows baked into the HTML are
      the offline fallback — keep them roughly current once a season.
```

Replace the entire **"Later, if dues bookkeeping gets painful"** section with:

```markdown
## 7. Board portal (Cloudflare) — replaces the "PayHOA later" plan

The portal (announcements, inbox, dues ledger, content editing) ships with
the site. Launch-time setup, in order:

- [ ] Create the **Cloudflare Pages** project from the GitHub repo
      (production branch: `deploy`, no build command, output `/`).
- [ ] `npx wrangler d1 create wopha` → paste the database id into BOTH
      `wrangler.toml` and `workers/backup/wrangler.toml`.
- [ ] Apply the schema remotely:
      `npx wrangler d1 execute wopha --remote --file=schema.sql`
- [ ] Bind the database to the Pages project (Settings → Functions →
      D1 bindings → `DB` → `wopha`) if the toml binding isn't picked up.
- [ ] **Cloudflare Access (required before any real data):** Zero Trust →
      Access → Applications → add a self-hosted app covering
      `wopha.com/portal/*` AND `wopha.com/api/admin/*`, policy = allow the
      board members' email addresses (one-time PIN is fine). Board turnover
      later = edit this email list.
- [ ] Set the `WEB3FORMS_KEY` secret (section 2).
- [ ] Create the R2 bucket: `npx wrangler r2 bucket create wopha-backups`,
      then deploy the backup worker: `cd workers/backup && npx wrangler deploy`.
- [ ] Import the real household list: portal → Ledger → Import (CSV with
      address, owner_name, email, phone). Until Access is live, demo only
      with the fake seed data.
- [ ] Demo to the board on the free `*.pages.dev` URL (seed data) before the
      wopha.com DNS cutover in section 6.
```

- [ ] **Step 2: Update `README.md`.** Add a development section (create the section if the README is minimal):

````markdown
## Local development

The public site is plain HTML — open `index.html` or run any static server.
The board portal (`/portal/`) and API need wrangler:

```
npm install
npm run db:schema   # create local D1 tables
npm run db:seed     # fake demo data (safe — no real residents)
npm run dev         # http://127.0.0.1:8200
npm test            # vitest for functions/api/_lib
```

Portal auth: production is gated by Cloudflare Access; local dev on
127.0.0.1 is open by design (`functions/api/_lib/auth.js`).
````

- [ ] **Step 3: Add the portal link to the `index.html` footer.** Find the footer quick-links list (the `<ul>` containing `<li><a href="tennis.html#reserve">Reserve a court</a></li>`) and add as its last item:

```html
          <li><a href="portal/index.html">Board portal</a></li>
```

- [ ] **Step 4: Full verification pass**

Run: `npm test`
Expected: all suites pass.

With the dev server running, click through every portal page and every public page once; no console errors, no red error boxes.

- [ ] **Step 5: Commit**

```bash
git add docs/launch-checklist.md README.md index.html
git commit -m "Portal launch steps in checklist, dev docs, footer link"
```

---

## Post-plan notes (not tasks)

- **Publishing:** nothing in this plan goes to the `deploy` branch until the Cloudflare Pages project exists — the repointed forms need Functions to work. The demo happens on `*.pages.dev` from a branch that excludes `docs/board-proposal.md` and `docs/superpowers/`.
- **Phase 2 candidates (out of scope):** Stripe webhook auto-recording payments; resident logins; treasurer-only ledger role.
