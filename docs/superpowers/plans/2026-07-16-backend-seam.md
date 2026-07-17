# Backend Seam (Settings + QuickBooks Export) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the operator-editable `settings` table, the QuickBooks one-way CSV export seam (`_lib/qbo.js` + format dispatch in `ledger-export.js`), and the small portal-support API additions (`adminEmail`/`collectedCents`, household PUT, content `updated_at`, settings-driven dues) — all additive, with the backup worker and drift test extended to match.

**Architecture:** Everything stays inside the existing Cloudflare Pages Functions shape: file-routed handlers under `functions/api/`, pure logic in `functions/api/_lib/`, D1 (binding `DB`) as the ledger of record, the standalone dependency-free backup worker in `workers/backup/`. New code is additive only — no framework, no TypeScript, no route reorganization; the QBO seam is a `format=` parameter on the existing Access-gated exporter plus one pure row-builder module.

**Tech Stack:** Plain ES-module JS (Cloudflare Pages Functions + Workers), D1/SQLite, R2, vitest (pure-logic + handler tests with a tiny fake-D1 stub), ESLint, wrangler for local dev.

**Spec:** `docs/superpowers/specs/2026-07-16-modern-civic-redesign-design.md` (§5 QuickBooks seam, §6 backend changes, §9 risks, §10 sequencing). Detailed rationale: `docs/superpowers/specs/2026-07-16-redesign-inputs/plan-quickbooks-backend.md`.

## Global Constraints

- **Git: local-only branches.** All work happens on `redesign-experiment`. NEVER push `master` or `redesign-experiment` — `docs/` contains board pricing documents that must not become public. Commit at the end of every task with the message given in the task.
- **Tests stay green and grow.** The existing vitest suite is 28 tests across 4 files (`tests/csv.test.js`, `tests/ledger.test.js`, `tests/validate.test.js`, `tests/auth.test.js`). Every task extends it; after the final code task the suite is 74 tests. Run `npm test` (that is `vitest run`) and `npm run lint` (that is `eslint .`) before every commit; both must be clean.
- **No new dependencies.** Runtime has none today and gains none. devDependencies stay exactly `eslint`, `vitest`, `wrangler`. The 11ty adoption belongs to the tooling track, not this plan.
- **D1 stays the ledger of record.** QuickBooks is link + one-way CSV export only. No Intuit credentials, no OAuth, no write path to QBO anywhere in this codebase.
- **Dev ports 8200–8202 only.** This Windows machine reserves large port ranges for Hyper-V (including the wrangler defaults 8788 and 8080); binding a reserved port makes workerd abort. `npm run dev` already pins 8200; anything else you start manually uses 8201/8202.
- **Money is integer cents everywhere.** Dollars appear only at the CSV boundary via `(cents / 100).toFixed(2)`. Dates are `YYYY-MM-DD` strings; timestamps come from SQLite `datetime('now')`.
- **All admin routes stay behind the existing gate.** Every new admin endpoint lives under `functions/api/admin/`, so `functions/api/admin/_middleware.js` (Cloudflare Access in production, `dev@localhost` locally, `DEMO_OPEN_ADMIN` for demos) applies automatically. No auth code changes in this plan.
- **Back-compat is a hard requirement.** `GET /api/admin/ledger-export?year=Y` with no `format` (and with `only=unpaid`) must produce byte-identical CSV output and the same filenames as today (`wopha-ledger-<year>.csv` / `wopha-ledger-<year>-unpaid.csv` — note the current code uses a hyphen before `unpaid`, and that is what back-compat preserves).
- **The backup worker stays dependency-free.** `workers/backup/index.js` never imports from `functions/` — it deploys as a separate Worker and must survive app refactors. The duplicated `TABLES` lists are deliberate; the drift test added in Task 10 is the tripwire.
- All commands run from the repo root (`C:\Users\hovsa\vaults\personal\wopha-website`). Windows: wrangler is a devDependency — use `npx wrangler ...`, never a global install.

## Interface contract

Later plans (portal track, public-site track) consume these EXACT shapes. Do not rename anything here.

- `GET /api/admin/settings` → 200, flat JSON object with ALL allowlisted keys always present as strings:
  `{"dues_cents":"53500","dues_due_date":"","quickbooks_url":""}`
- `PUT /api/admin/settings` body `{"key":"...","value":"..."}` → `{"ok":true}` | 400 on bad key/value.
- `duesCentsFor(env)` → `Promise<int>` (settings value, `DUES_CENTS` constant fallback).
- `csvResponse(filename, rows)` → `Response` with `text/csv; charset=utf-8` + `Content-Disposition: attachment`.
- `GET /api/admin/ledger-export?year=Y&format=board|qbo-customers|qbo-invoices|qbo-payments` (absent = `board`, byte-identical back-compat; `only=unpaid` applies to `board` and `qbo-invoices`). Filenames: `wopha-ledger-<year>[-unpaid].csv`, `wopha-qbo-customers.csv`, `wopha-qbo-invoices-<year>.csv`, `wopha-qbo-payments-<year>.csv`.
- `GET /api/admin/summary` response gains `"adminEmail"`: string, `"collectedCents"`: integer (sum of `payments.amount_cents` for the current year).
- `PUT /api/admin/households/:id` body = any subset of `{address, owner_name, email, phone}` → `{"ok":true}` | 400/404.
- Ledger year view (`GET /api/admin/households?year=Y`) response keeps its top-level `"dues_cents"`: integer — now settings-driven instead of the hardcoded constant.
- `GET /api/content` response gains a top-level `"updated_at"` object mapping each content key to its SQLite timestamp: `{"season_glance": [...], "pool_hours": [...], "updated_at": {"season_glance": "2026-07-01 10:00:00", "pool_hours": "..."}}`. Existing consumers read named keys only, so this is additive-safe.

## File structure

```
Create:
functions/api/admin/settings.js          GET all settings / PUT one (Task 2)
functions/api/admin/households/[id].js   PUT partial household update (Task 8)
functions/api/_lib/qbo.js                pure QBO CSV row-builders (Task 5)
tests/helpers/fake-db.js                 programmable D1 stub for handler tests (Task 2)
tests/settings.test.js                   (Task 2)
tests/households.test.js                 (Tasks 3, 8)
tests/ledger-export.test.js              (Tasks 4, 6)
tests/qbo.test.js                        (Task 5)
tests/summary.test.js                    (Task 7)
tests/content.test.js                    (Task 9)
tests/backup.test.js                     drift + retention tests (Task 10)
docs/quickbooks-export.md                QBO rationale + runbook (Task 11)

Modify:
schema.sql                               settings table (Task 1)
seed.sql                                 dues_cents seed row (Task 1)
functions/api/_lib/validate.js           validateSetting, validateHouseholdUpdate (Tasks 1, 8)
functions/api/_lib/ledger.js             settingValue, duesCentsFor (Task 3)
functions/api/_lib/csv.js                safeCell, csvResponse (Task 4)
functions/api/admin/households.js        settings-driven dues (Task 3)
functions/api/admin/ledger-export.js     refactor + format dispatch (Tasks 4, 6)
functions/api/admin/summary.js           adminEmail + collectedCents (Task 7)
functions/api/content.js                 updated_at map (Task 9)
functions/api/admin/export.js            settings in TABLES, export the list (Task 10)
workers/backup/index.js                  settings in TABLES, monthly retention (Task 10)
README.md                                link to docs/quickbooks-export.md (Task 11)
tests/validate.test.js                   extended (Tasks 1, 8)
tests/ledger.test.js                     extended (Task 3)
tests/csv.test.js                        extended (Task 4)
```

---

### Task 1: `settings` table — schema, seed, `validateSetting` allowlist

**Files:**
- Modify: `schema.sql`, `seed.sql`, `functions/api/_lib/validate.js`
- Test: `tests/validate.test.js`

**Interfaces:**
- Consumes: existing `DATE_RE` regex in `validate.js`.
- Produces: D1 table `settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`; seeded row `dues_cents = '53500'`; `SETTING_KEYS` array and `validateSetting(key, value) → {ok, value?|error}` exported from `_lib/validate.js` (value returned is the normalized string to store).

Note: backups do not include `settings` until Task 10 lands. That is fine — this whole plan ships as one branch, and the spec's "same commit" concern is covered by the drift test failing loudly the moment Task 10's test file exists.

- [ ] **Step 1: Write the failing tests** — append to `tests/validate.test.js` (add `validateSetting` to the existing import at the top of the file, then append the describe block at the end):

```js
import {
  validateSubmission,
  validateAnnouncement,
  validatePayment,
  validateContent,
  validateSetting,
} from "../functions/api/_lib/validate.js";
```

```js
describe("validateSetting", () => {
  it("accepts allowlisted keys with valid values", () => {
    expect(validateSetting("dues_cents", "53500")).toEqual({ ok: true, value: "53500" });
    expect(validateSetting("dues_due_date", "2026-04-30")).toEqual({ ok: true, value: "2026-04-30" });
    expect(validateSetting("quickbooks_url", "https://app.qbo.intuit.com/app/customers"))
      .toEqual({ ok: true, value: "https://app.qbo.intuit.com/app/customers" });
  });
  it("rejects unknown keys", () => {
    expect(validateSetting("theme", "dark").ok).toBe(false);
    expect(validateSetting("", "x").ok).toBe(false);
  });
  it("range-checks dues_cents as a positive integer number of cents", () => {
    expect(validateSetting("dues_cents", "0").ok).toBe(false);
    expect(validateSetting("dues_cents", "-100").ok).toBe(false);
    expect(validateSetting("dues_cents", "535.5").ok).toBe(false);
    expect(validateSetting("dues_cents", "1000001").ok).toBe(false);
    expect(validateSetting("dues_cents", "").ok).toBe(false);
  });
  it("requires YYYY-MM-DD for dues_due_date but allows empty to clear it", () => {
    expect(validateSetting("dues_due_date", "Apr 30").ok).toBe(false);
    expect(validateSetting("dues_due_date", "2026-4-30").ok).toBe(false);
    expect(validateSetting("dues_due_date", "")).toEqual({ ok: true, value: "" });
  });
  it("requires an https URL for quickbooks_url but allows empty to clear it", () => {
    expect(validateSetting("quickbooks_url", "http://app.qbo.intuit.com").ok).toBe(false);
    expect(validateSetting("quickbooks_url", "not a url").ok).toBe(false);
    expect(validateSetting("quickbooks_url", "https://" + "a".repeat(500)).ok).toBe(false);
    expect(validateSetting("quickbooks_url", "")).toEqual({ ok: true, value: "" });
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/validate.test.js` to fail to load with a syntax error like `The requested module '../functions/api/_lib/validate.js' does not provide an export named 'validateSetting'`. The other 3 test files (13 tests) still pass.

- [ ] **Step 3: Implement** — append to `functions/api/_lib/validate.js` (after `validateContent`):

```js
// Operator-editable settings (admin/settings.js). Stored as strings in the
// settings table; each key has its own validator. Empty string clears the
// optional keys; dues_cents must always be a valid amount.
export const SETTING_KEYS = ["dues_cents", "dues_due_date", "quickbooks_url"];

export function validateSetting(key, value) {
  if (!SETTING_KEYS.includes(key)) return { ok: false, error: "Unknown setting key" };
  const s = String(value === undefined || value === null ? "" : value).trim();
  if (key === "dues_cents") {
    const n = Number(s);
    if (!/^\d+$/.test(s) || n <= 0 || n > 1000000) {
      return { ok: false, error: "dues_cents must be a positive integer number of cents (max $10,000)" };
    }
    return { ok: true, value: String(n) };
  }
  if (key === "dues_due_date") {
    if (s === "") return { ok: true, value: "" };
    if (!DATE_RE.test(s)) return { ok: false, error: "dues_due_date must be YYYY-MM-DD" };
    return { ok: true, value: s };
  }
  // quickbooks_url
  if (s === "") return { ok: true, value: "" };
  if (s.length > 500) return { ok: false, error: "quickbooks_url too long (max 500 characters)" };
  let u;
  try { u = new URL(s); } catch (_) { return { ok: false, error: "quickbooks_url must be a valid https URL" }; }
  if (u.protocol !== "https:") return { ok: false, error: "quickbooks_url must be a valid https URL" };
  return { ok: true, value: s };
}
```

- [ ] **Step 4: Add the table to `schema.sql`** — insert after the `site_content` block, before the `CREATE INDEX` lines:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,             -- allowlisted in _lib/validate.js (SETTING_KEYS)
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 5: Seed the default dues** — append to `seed.sql`:

```sql
INSERT INTO settings (key, value) VALUES
  ('dues_cents', '53500');
```

- [ ] **Step 6: Verify** — run `npm test`: expect `Tests  33 passed (33)`. Run `npm run lint`: clean. Apply the schema locally and confirm the table exists:

```
npm run db:schema
npx wrangler d1 execute wopha --local --command "SELECT name FROM sqlite_master WHERE name = 'settings'"
```

Expect one row `settings`. (Do not re-run `npm run db:seed` on an existing local DB — the households INSERTs violate UNIQUE on re-run; seed only fresh DBs.)

- [ ] **Step 7: Commit**

```
git add schema.sql seed.sql functions/api/_lib/validate.js tests/validate.test.js
git commit -m "Settings table: schema, seed, validateSetting allowlist"
```

---

### Task 2: `GET/PUT /api/admin/settings` handler + fake-D1 test helper

**Files:**
- Create: `functions/api/admin/settings.js`, `tests/helpers/fake-db.js`, `tests/settings.test.js`

**Interfaces:**
- Consumes: `json()` from `_lib/respond.js`; `validateSetting`, `SETTING_KEYS` from `_lib/validate.js` (Task 1); `DUES_CENTS` from `_lib/ledger.js`; gate provided by existing `functions/api/admin/_middleware.js` (directory placement — no code needed).
- Produces: `GET /api/admin/settings` → 200 flat object, ALL allowlisted keys always present as strings (`{"dues_cents":"53500","dues_due_date":"","quickbooks_url":""}` on an empty table); `PUT /api/admin/settings` body `{"key","value"}` → `{"ok":true}` | 400. Also `fakeDb(routes)` helper used by every handler test in this plan.

- [ ] **Step 1: Create the shared fake-D1 helper** — `tests/helpers/fake-db.js` (test infrastructure, written alongside the failing test; vitest only collects `*.test.js`, so this file never runs as a test):

```js
// Minimal programmable stand-in for the D1 binding (env.DB). Handlers in this
// codebase only use prepare().bind().all()/.first()/.run() and batch().
// Routes are matched by SQL substring; first match wins. Each route may set:
//   results — array (or fn(bindArgs) → array) returned as { results } from all()
//   first   — row (or fn(bindArgs) → row) returned from first(); default null
//   run     — { meta } (or fn(bindArgs) → { meta }) returned from run();
//             default { meta: { changes: 1, last_row_id: 1 } }
//   error   — message string; makes all()/first()/run() throw
// Every executed statement is recorded on db.calls as { sql, args }.
export function fakeDb(routes) {
  const calls = [];
  function route(sql) {
    const r = routes.find((x) => sql.includes(x.match));
    if (!r) throw new Error("fakeDb: no route matches SQL: " + sql);
    return r;
  }
  function resolve(spec, args, fallback) {
    if (spec === undefined) return fallback;
    return typeof spec === "function" ? spec(args) : spec;
  }
  return {
    calls,
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async all() {
          const r = route(sql);
          calls.push({ sql, args });
          if (r.error) throw new Error(r.error);
          return { results: resolve(r.results, args, []) };
        },
        async first() {
          const r = route(sql);
          calls.push({ sql, args });
          if (r.error) throw new Error(r.error);
          return resolve(r.first, args, null);
        },
        async run() {
          const r = route(sql);
          calls.push({ sql, args });
          if (r.error) throw new Error(r.error);
          return resolve(r.run, args, { meta: { changes: 1, last_row_id: 1 } });
        },
      };
      return stmt;
    },
    async batch(stmts) {
      calls.push({ batch: stmts.length });
      return stmts.map(() => ({ meta: { changes: 1 } }));
    },
  };
}
```

- [ ] **Step 2: Write the failing tests** — `tests/settings.test.js`:

```js
import { describe, it, expect } from "vitest";
import { onRequestGet, onRequestPut } from "../functions/api/admin/settings.js";
import { fakeDb } from "./helpers/fake-db.js";

function putReq(body) {
  return new Request("http://localhost:8200/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/settings", () => {
  it("returns every allowlisted key as a string, with defaults, on an empty table", async () => {
    const db = fakeDb([{ match: "FROM settings", results: [] }]);
    const res = await onRequestGet({ env: { DB: db } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      dues_cents: "53500",
      dues_due_date: "",
      quickbooks_url: "",
    });
  });
  it("overlays stored rows and drops keys that are no longer allowlisted", async () => {
    const db = fakeDb([{ match: "FROM settings", results: [
      { key: "dues_cents", value: "60000" },
      { key: "quickbooks_url", value: "https://app.qbo.intuit.com/app/customers" },
      { key: "legacy_key", value: "x" },
    ] }]);
    const res = await onRequestGet({ env: { DB: db } });
    expect(await res.json()).toEqual({
      dues_cents: "60000",
      dues_due_date: "",
      quickbooks_url: "https://app.qbo.intuit.com/app/customers",
    });
  });
});

describe("PUT /api/admin/settings", () => {
  it("upserts a valid setting and returns ok", async () => {
    const db = fakeDb([{ match: "INSERT INTO settings" }]);
    const res = await onRequestPut({ request: putReq({ key: "dues_cents", value: "60000" }), env: { DB: db } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls[0].args).toEqual(["dues_cents", "60000"]);
  });
  it("returns 400 for bad keys, bad values, and malformed bodies", async () => {
    const db = fakeDb([]);
    expect((await onRequestPut({ request: putReq({ key: "nope", value: "1" }), env: { DB: db } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({ key: "dues_cents", value: "-5" }), env: { DB: db } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({ key: "quickbooks_url", value: "http://x.com" }), env: { DB: db } })).status).toBe(400);
    const bad = new Request("http://localhost:8200/api/admin/settings", { method: "PUT", body: "not json" });
    expect((await onRequestPut({ request: bad, env: { DB: db } })).status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
});
```

- [ ] **Step 3: Verify the tests fail** — run `npm test`. Expect `tests/settings.test.js` to fail to load with a module-resolution error mentioning `functions/api/admin/settings.js` (`Failed to resolve import` / `Cannot find module`). The rest of the suite: 33 passed.

- [ ] **Step 4: Implement** — `functions/api/admin/settings.js` (modeled on `content.js`; Access-gated automatically by the directory's `_middleware.js`):

```js
import { json } from "../_lib/respond.js";
import { validateSetting, SETTING_KEYS } from "../_lib/validate.js";
import { DUES_CENTS } from "../_lib/ledger.js";

// Operator-editable configuration (dues amount, dues due date, QuickBooks
// link). GET always returns every allowlisted key so the portal can render a
// settings form without null checks; values are always strings.
const DEFAULTS = {
  dues_cents: String(DUES_CENTS),
  dues_due_date: "",
  quickbooks_url: "",
};

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const out = Object.assign({}, DEFAULTS);
  for (const r of results) {
    if (SETTING_KEYS.includes(r.key)) out[r.key] = String(r.value);
  }
  return json(out);
}

export async function onRequestPut({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateSetting(input.key, input.value);
  if (!check.ok) return json({ error: check.error }, 400);
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(input.key, check.value).run();
  return json({ ok: true });
}
```

- [ ] **Step 5: Verify** — run `npm test`: expect `Tests  37 passed (37)`. Run `npm run lint`: clean.

- [ ] **Step 6: Smoke-check through the real middleware** — `npm run dev` (port 8200), then in a second terminal:

```
curl -s http://127.0.0.1:8200/api/admin/settings
curl -s -X PUT http://127.0.0.1:8200/api/admin/settings -H "Content-Type: application/json" -d "{\"key\":\"quickbooks_url\",\"value\":\"https://app.qbo.intuit.com/app/customers\"}"
curl -s http://127.0.0.1:8200/api/admin/settings
```

Expect the first GET to include `"dues_cents":"53500"` (seed or default), the PUT to return `{"ok":true}`, and the second GET to echo the stored URL. Stop the dev server.

- [ ] **Step 7: Commit**

```
git add functions/api/admin/settings.js tests/helpers/fake-db.js tests/settings.test.js
git commit -m "Admin settings API: GET all / PUT one (allowlisted keys)"
```

---

### Task 3: `settingValue` + `duesCentsFor(env)` in `_lib/ledger.js`, wired into the ledger year view

**Files:**
- Modify: `functions/api/_lib/ledger.js`, `functions/api/admin/households.js`
- Test: `tests/ledger.test.js`, create `tests/households.test.js`

**Interfaces:**
- Consumes: `settings` table (Task 1); `fakeDb` (Task 2).
- Produces: `settingValue(env, key)` → `Promise<string>` (`""` when unset or the table is missing); `duesCentsFor(env)` → `Promise<int>` (settings value, `DUES_CENTS` constant fallback — deploy order can never break the ledger). `GET /api/admin/households?year=Y` keeps its top-level `dues_cents` integer field but it becomes settings-driven, and `summary.outstandingCents` uses the same figure. This is what lets the portal stop hardcoding $535.

Note: `households.js` is the only handler that imports `DUES_CENTS` today (verify with `grep -r DUES_CENTS functions/`); after this task the constant remains exported from `ledger.js` as the fallback default and as `settings.js`'s GET default.

- [ ] **Step 1: Write the failing pure-logic tests** — in `tests/ledger.test.js`, replace the imports at the top of the file with:

```js
import { describe, it, expect } from "vitest";
import { parseHouseholdsCsv, ledgerSummary, DUES_CENTS, settingValue, duesCentsFor } from "../functions/api/_lib/ledger.js";
import { fakeDb } from "./helpers/fake-db.js";
```

Append at the end of the file:

```js
describe("settingValue", () => {
  it("returns the stored value as a string", async () => {
    const db = fakeDb([{ match: "FROM settings", first: { value: "60000" } }]);
    expect(await settingValue({ DB: db }, "dues_cents")).toBe("60000");
    expect(db.calls[0].args).toEqual(["dues_cents"]);
  });
  it("returns '' when the key is missing or the table does not exist yet", async () => {
    expect(await settingValue({ DB: fakeDb([{ match: "FROM settings", first: null }]) }, "dues_cents")).toBe("");
    expect(await settingValue({ DB: fakeDb([{ match: "FROM settings", error: "no such table: settings" }]) }, "dues_cents")).toBe("");
  });
});

describe("duesCentsFor", () => {
  it("prefers the settings value and falls back to DUES_CENTS on missing or bad data", async () => {
    expect(await duesCentsFor({ DB: fakeDb([{ match: "FROM settings", first: { value: "60000" } }]) })).toBe(60000);
    expect(await duesCentsFor({ DB: fakeDb([{ match: "FROM settings", first: null }]) })).toBe(DUES_CENTS);
    expect(await duesCentsFor({ DB: fakeDb([{ match: "FROM settings", first: { value: "garbage" } }]) })).toBe(DUES_CENTS);
    expect(await duesCentsFor({ DB: fakeDb([{ match: "FROM settings", error: "no such table: settings" }]) })).toBe(DUES_CENTS);
  });
});
```

- [ ] **Step 2: Write the failing handler test** — create `tests/households.test.js`:

```js
import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/households.js";
import { fakeDb } from "./helpers/fake-db.js";

describe("GET /api/admin/households (ledger year view)", () => {
  it("drives dues_cents and outstanding math from settings, not the constant", async () => {
    const db = fakeDb([
      { match: "FROM settings", first: { value: "60000" } },
      { match: "LEFT JOIN payments", results: [
        { id: 1, address: "101 Planters Way", owner_name: "Alex", email: "", phone: "",
          payment_id: 11, amount_cents: 60000, method: "check", paid_on: "2026-03-01" },
        { id: 2, address: "102 Planters Way", owner_name: "Sam", email: "", phone: "",
          payment_id: null, amount_cents: null, method: null, paid_on: null },
      ] },
    ]);
    const res = await onRequestGet({
      request: new Request("http://localhost:8200/api/admin/households?year=2026"),
      env: { DB: db },
    });
    const body = await res.json();
    expect(body.year).toBe(2026);
    expect(body.dues_cents).toBe(60000);
    expect(body.summary).toEqual({
      total: 2, paidCount: 1, unpaidCount: 1,
      collectedCents: 60000, outstandingCents: 60000,
    });
    expect(body.households.length).toBe(2);
  });
});
```

- [ ] **Step 3: Verify the tests fail** — run `npm test`. Expect `tests/ledger.test.js` to fail to load (`does not provide an export named 'settingValue'`) and `tests/households.test.js` to fail (`dues_cents` still comes from the constant, so `expected 53500 to be 60000` once ledger.js exports exist — on this first run it may also fail at load through the households.js import chain; either red is acceptable). The other files still pass: 32 tests (csv 4, validate 20, auth 4, settings 4).

- [ ] **Step 4: Implement the helpers** — append to `functions/api/_lib/ledger.js`:

```js
// Read one operator setting (see admin/settings.js) as a string. Returns ""
// when the key is unset — or when the settings table has not been deployed
// yet, so deploy order can never break the ledger.
export async function settingValue(env, key) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
    return row ? String(row.value) : "";
  } catch (_) {
    return "";
  }
}

// Settings-driven dues figure with the code constant as the safety net.
export async function duesCentsFor(env) {
  const raw = await settingValue(env, "dues_cents");
  const n = Number(raw);
  if (/^\d+$/.test(raw) && n > 0 && n <= 1000000) return n;
  return DUES_CENTS;
}
```

- [ ] **Step 5: Wire it into the year view** — replace `functions/api/admin/households.js` in full (only the GET changes: the `DUES_CENTS` import becomes `duesCentsFor`, one `await` line is added, and the two usages swap; POST is unchanged):

```js
import { json } from "../_lib/respond.js";
import { parseHouseholdsCsv, ledgerSummary, duesCentsFor } from "../_lib/ledger.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const duesCents = await duesCentsFor(env);
  const { results } = await env.DB.prepare(
    `SELECT h.id, h.address, h.owner_name, h.email, h.phone,
            p.id AS payment_id, p.amount_cents, p.method, p.paid_on
     FROM households h
     LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
     ORDER BY h.address`
  ).bind(year).all();
  const summary = ledgerSummary(
    results.map((r) => ({ paid: r.payment_id != null, amount_cents: r.amount_cents || 0 })),
    duesCents
  );
  return json({ year, dues_cents: duesCents, summary, households: results });
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

- [ ] **Step 6: Verify** — run `npm test`: expect `Tests  41 passed (41)`. Run `npm run lint`: clean.

- [ ] **Step 7: Commit**

```
git add functions/api/_lib/ledger.js functions/api/admin/households.js tests/ledger.test.js tests/households.test.js
git commit -m "duesCentsFor(env): settings-driven dues with constant fallback"
```

---

### Task 4: `safeCell` → `_lib/csv.js`, add `csvResponse`, refactor the board export

**Files:**
- Modify: `functions/api/_lib/csv.js`, `functions/api/admin/ledger-export.js`
- Test: `tests/csv.test.js`, create `tests/ledger-export.test.js`

**Interfaces:**
- Consumes: `toCsv` (existing).
- Produces: `safeCell(value)` → string (formula-injection guard, moved verbatim from `ledger-export.js`) and `csvResponse(filename, rows)` → `Response` (`text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="..."`), both exported from `_lib/csv.js` so all four export formats share quoting and injection-guarding by construction. `GET /api/admin/ledger-export` output stays byte-identical (locked by a characterization test written before the refactor).

- [ ] **Step 1: Write the failing unit tests** — in `tests/csv.test.js`, replace the import line with:

```js
import { parseCsv, toCsv, safeCell, csvResponse } from "../functions/api/_lib/csv.js";
```

Append at the end of the file:

```js
describe("safeCell", () => {
  it("prefixes cells that spreadsheets would execute as formulas", () => {
    expect(safeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("-1")).toBe("'-1");
    expect(safeCell("@cmd")).toBe("'@cmd");
  });
  it("leaves ordinary values (and null/undefined) alone", () => {
    expect(safeCell("101 Planters Way")).toBe("101 Planters Way");
    expect(safeCell("")).toBe("");
    expect(safeCell(null)).toBe("");
    expect(safeCell(undefined)).toBe("");
  });
});

describe("csvResponse", () => {
  it("serializes rows with attachment headers", async () => {
    const res = csvResponse("test.csv", [["a", "b"], ["1", "with,comma"]]);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="test.csv"');
    expect(await res.text()).toBe('a,b\n1,"with,comma"');
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/csv.test.js` to fail to load: `does not provide an export named 'safeCell'`. Rest of the suite: 37 passed.

- [ ] **Step 3: Implement** — append to `functions/api/_lib/csv.js`:

```js
// Guard against spreadsheet formula injection: Excel/Sheets execute cells
// starting with = + - @. A leading apostrophe makes them inert text. Applied
// to every text cell in every export format (board CSV and all QBO formats).
export function safeCell(value) {
  const s = String(value || "");
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Standard CSV download response — every export format goes through here so
// the RFC-4180 quoting (toCsv) and attachment headers stay consistent.
export function csvResponse(filename, rows) {
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
    },
  });
}
```

- [ ] **Step 4: Verify they pass** — run `npm test`: expect `Tests  44 passed (44)`.

- [ ] **Step 5: Write the characterization tests for the board export** — create `tests/ledger-export.test.js`. These must PASS against the current, un-refactored handler — they lock today's bytes down before anything moves:

```js
import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/ledger-export.js";
import { fakeDb } from "./helpers/fake-db.js";

const LEDGER_ROWS = [
  { address: "101 Planters Way", owner_name: "Alex Morgan", email: "alex@x.com", phone: "",
    amount_cents: 53500, method: "stripe", paid_on: "2026-03-01" },
  { address: "=102 Planters Way", owner_name: "-Sam Lee", email: "", phone: "",
    amount_cents: null, method: null, paid_on: null },
];

function boardDb() {
  return fakeDb([{ match: "LEFT JOIN payments", results: LEDGER_ROWS }]);
}

function req(qs) {
  return new Request("http://localhost:8200/api/admin/ledger-export" + qs);
}

describe("GET /api/admin/ledger-export (board format, back-compat)", () => {
  it("produces the exact pre-redesign CSV bytes, filename, and headers", async () => {
    const res = await onRequestGet({ request: req("?year=2026"), env: { DB: boardDb() } });
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-ledger-2026.csv"');
    expect(await res.text()).toBe([
      "address,owner_name,email,phone,status,amount,method,paid_on",
      "101 Planters Way,Alex Morgan,alex@x.com,,paid,535.00,stripe,2026-03-01",
      "'=102 Planters Way,'-Sam Lee,,,unpaid,,,",
    ].join("\n"));
  });
  it("keeps only=unpaid filtering and the -unpaid filename suffix", async () => {
    const res = await onRequestGet({ request: req("?year=2026&only=unpaid"), env: { DB: boardDb() } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-ledger-2026-unpaid.csv"');
    expect(await res.text()).toBe([
      "address,owner_name,email,phone,status,amount,method,paid_on",
      "'=102 Planters Way,'-Sam Lee,,,unpaid,,,",
    ].join("\n"));
  });
});
```

- [ ] **Step 6: Verify they pass BEFORE the refactor** — run `npm test`: expect `Tests  46 passed (46)`. (This is a characterization step, not a red step — the point is that the next step cannot change behavior unnoticed.)

- [ ] **Step 7: Refactor the handler** — replace `functions/api/admin/ledger-export.js` in full (the local `safeCell` is deleted; output is identical):

```js
import { safeCell, csvResponse } from "../_lib/csv.js";

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
      safeCell(r.address), safeCell(r.owner_name), safeCell(r.email), safeCell(r.phone),
      r.paid_on ? "paid" : "unpaid",
      r.amount_cents != null ? (r.amount_cents / 100).toFixed(2) : "",
      r.method || "", r.paid_on || "",
    ]);
  const name = "wopha-ledger-" + year + (onlyUnpaid ? "-unpaid" : "") + ".csv";
  return csvResponse(name, [
    ["address", "owner_name", "email", "phone", "status", "amount", "method", "paid_on"],
    ...rows,
  ]);
}
```

- [ ] **Step 8: Verify** — run `npm test`: expect `Tests  46 passed (46)` — same count, still green, proving the refactor changed nothing observable. Run `npm run lint`: clean.

- [ ] **Step 9: Commit**

```
git add functions/api/_lib/csv.js functions/api/admin/ledger-export.js tests/csv.test.js tests/ledger-export.test.js
git commit -m "Move safeCell to _lib/csv.js, add csvResponse; refactor ledger-export"
```

---

### Task 5: `_lib/qbo.js` — pure QuickBooks row-builders

**Files:**
- Create: `functions/api/_lib/qbo.js`, `tests/qbo.test.js`

**Interfaces:**
- Consumes: `safeCell` from `_lib/csv.js` (Task 4).
- Produces (pure, array-of-arrays including header rows, no Workers runtime needed):
  - `qboCustomerRows(households)` — households have `{address, owner_name, email, phone}`; customer display name = address (unique in D1, unique in QBO, survives owner turnover).
  - `qboInvoiceRows(households, year, duesCents, dueDate)` — households have `{id, address}`; deterministic invoice numbers `WOPHA-<year>-<household_id>`; item name `HOA Annual Dues <year>`; `InvoiceDate` = Jan 1 of the year; `ItemAmount` = dollars with 2 decimals.
  - `qboPaymentRows(paymentRows, year)` — rows have `{address, amount_cents, method, paid_on, note}`; reference CSV `Date, Description, Amount`.
  - Every data cell passes through `safeCell` (formula-injection guard by construction).
- The dispatch that feeds these from D1 is Task 6.

Design notes carried from the spec (§5): the city/state/ZIP columns are whole-subdivision constants. City/state are known (Lilburn, GA — see README); the ZIP constant `30047` must be confirmed with the board before the first real import (flagged in the code comment and in `docs/quickbooks-export.md`, Task 11). When `dues_due_date` is unset, the caller passes Jan 1 of the export year (Task 6), so the column is never empty.

- [ ] **Step 1: Write the failing tests** — create `tests/qbo.test.js`:

```js
import { describe, it, expect } from "vitest";
import { qboCustomerRows, qboInvoiceRows, qboPaymentRows } from "../functions/api/_lib/qbo.js";

const HOUSEHOLDS = [
  { id: 1, address: "101 Planters Way", owner_name: "Alex Morgan", email: "alex@x.com", phone: "770-555-0101" },
  { id: 2, address: "=102 Planters Way", owner_name: "-Sam Lee", email: "", phone: "" },
];

describe("qboCustomerRows", () => {
  it("builds a header plus one row per household with address as display name", () => {
    const rows = qboCustomerRows(HOUSEHOLDS);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(["Name", "Company Name", "Email", "Phone", "Street", "City", "State", "ZIP"]);
    expect(rows[1]).toEqual([
      "101 Planters Way", "Alex Morgan", "alex@x.com", "770-555-0101",
      "101 Planters Way", "Lilburn", "GA", "30047",
    ]);
  });
  it("guards every data cell with safeCell", () => {
    expect(qboCustomerRows(HOUSEHOLDS)[2]).toEqual([
      "'=102 Planters Way", "'-Sam Lee", "", "",
      "'=102 Planters Way", "Lilburn", "GA", "30047",
    ]);
  });
});

describe("qboInvoiceRows", () => {
  it("builds deterministic invoice numbers, the derived service item, and dollar amounts", () => {
    const rows = qboInvoiceRows(HOUSEHOLDS, 2026, 53500, "2026-04-30");
    expect(rows[0]).toEqual([
      "InvoiceNo", "Customer", "InvoiceDate", "DueDate",
      "Item(Product/Service)", "ItemDescription", "ItemAmount",
    ]);
    expect(rows[1]).toEqual([
      "WOPHA-2026-1", "101 Planters Way", "2026-01-01", "2026-04-30",
      "HOA Annual Dues 2026", "Annual dues 2026 — 101 Planters Way", "535.00",
    ]);
    expect(rows[2][0]).toBe("WOPHA-2026-2");
    expect(rows[2][1]).toBe("'=102 Planters Way");
  });
  it("returns only the header for an empty household list", () => {
    expect(qboInvoiceRows([], 2026, 53500, "2026-04-30")).toEqual([[
      "InvoiceNo", "Customer", "InvoiceDate", "DueDate",
      "Item(Product/Service)", "ItemDescription", "ItemAmount",
    ]]);
  });
});

describe("qboPaymentRows", () => {
  it("builds Date/Description/Amount reference rows, appending the note when present", () => {
    const rows = qboPaymentRows([
      { address: "101 Planters Way", amount_cents: 53500, method: "stripe", paid_on: "2026-03-01", note: "" },
      { address: "102 Planters Way", amount_cents: 50000, method: "check", paid_on: "2026-03-15", note: "check #204" },
    ], 2026);
    expect(rows).toEqual([
      ["Date", "Description", "Amount"],
      ["2026-03-01", "Dues 2026 — 101 Planters Way — stripe", "535.00"],
      ["2026-03-15", "Dues 2026 — 102 Planters Way — check — check #204", "500.00"],
    ]);
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/qbo.test.js` to fail to load with a module-resolution error mentioning `functions/api/_lib/qbo.js`. Rest of the suite: 46 passed.

- [ ] **Step 3: Implement** — create `functions/api/_lib/qbo.js`:

```js
import { safeCell } from "./csv.js";

// Pure QuickBooks Online CSV row-builders — array-of-arrays in and out, so
// they are unit-testable without a Workers runtime. Every data cell passes
// through safeCell (spreadsheet formula-injection guard). The import runbook
// and the cash-vs-accrual double-booking guidance live in
// docs/quickbooks-export.md; the format dispatch lives in admin/ledger-export.js.

// Whole-subdivision address constants for the QBO customer address block.
// City/state per README (Lilburn, GA). Confirm the ZIP with the board before
// the first real import.
export const QBO_CITY = "Lilburn";
export const QBO_STATE = "GA";
export const QBO_ZIP = "30047";

// QBO: gear icon → Import data → Customers.
// Display name = address: unique in D1, unique in QBO, survives owner turnover.
export function qboCustomerRows(households) {
  return [
    ["Name", "Company Name", "Email", "Phone", "Street", "City", "State", "ZIP"],
    ...households.map((h) => [
      h.address, h.owner_name, h.email, h.phone,
      h.address, QBO_CITY, QBO_STATE, QBO_ZIP,
    ].map(safeCell)),
  ];
}

// QBO: gear icon → Import data → Invoices (accrual workflow; import once per
// year). Invoice numbers are deterministic (WOPHA-<year>-<household_id>) so a
// re-import collides on the number in QBO instead of silently duplicating.
export function qboInvoiceRows(households, year, duesCents, dueDate) {
  const amount = (duesCents / 100).toFixed(2);
  const item = "HOA Annual Dues " + year;
  return [
    ["InvoiceNo", "Customer", "InvoiceDate", "DueDate",
     "Item(Product/Service)", "ItemDescription", "ItemAmount"],
    ...households.map((h) => [
      "WOPHA-" + year + "-" + h.id,
      h.address,
      year + "-01-01",
      dueDate,
      item,
      "Annual dues " + year + " — " + h.address,
      amount,
    ].map(safeCell)),
  ];
}

// Payments REFERENCE list (cash-basis workflow): the treasurer uses it to
// categorize/memo bank-feed deposits in QBO. It is deliberately NOT a
// transaction import — the bank feed already books the income, and importing
// these as transactions would double-book it.
export function qboPaymentRows(paymentRows, year) {
  return [
    ["Date", "Description", "Amount"],
    ...paymentRows.map((p) => [
      p.paid_on,
      "Dues " + year + " — " + p.address + " — " + p.method + (p.note ? " — " + p.note : ""),
      (p.amount_cents / 100).toFixed(2),
    ].map(safeCell)),
  ];
}
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  51 passed (51)`. Run `npm run lint`: clean.

- [ ] **Step 5: Commit**

```
git add functions/api/_lib/qbo.js tests/qbo.test.js
git commit -m "_lib/qbo.js: pure QBO customer/invoice/payment row-builders"
```

---

### Task 6: format dispatch in `ledger-export.js` (`?format=board|qbo-customers|qbo-invoices|qbo-payments`)

**Files:**
- Modify: `functions/api/admin/ledger-export.js`
- Test: `tests/ledger-export.test.js`

**Interfaces:**
- Consumes: `qboCustomerRows`/`qboInvoiceRows`/`qboPaymentRows` (Task 5); `safeCell`/`csvResponse` (Task 4); `duesCentsFor`/`settingValue` (Task 3); `json` from `_lib/respond.js`.
- Produces: `GET /api/admin/ledger-export?year=Y&format=<f>` — the complete export surface later plans link to as plain `<a>` downloads (the Access cookie rides along; no fetch/blob plumbing needed in the portal):

| `format` | Output | Filename |
|---|---|---|
| absent / `board` | current board CSV, byte-identical | `wopha-ledger-<year>[-unpaid].csv` |
| `qbo-customers` | QBO Customers import CSV (year-independent) | `wopha-qbo-customers.csv` |
| `qbo-invoices` | QBO Invoices import CSV, 1 row/household; honors `only=unpaid` | `wopha-qbo-invoices-<year>.csv` |
| `qbo-payments` | payments reference CSV (paid rows only) | `wopha-qbo-payments-<year>.csv` |

Unknown `format` values → 400 `{"error":"Unknown format"}`. `qbo-invoices` uses `duesCentsFor(env)` for the amount and the `dues_due_date` setting for `DueDate`, falling back to `<year>-01-01` when unset.

- [ ] **Step 1: Write the failing dispatch tests** — append to `tests/ledger-export.test.js` (inside the file, after the existing describe block; `boardDb`/`req`/`LEDGER_ROWS` already exist at the top of the file):

```js
describe("GET /api/admin/ledger-export?format=qbo-*", () => {
  it("qbo-customers: year-independent customer import CSV with safeCell applied", async () => {
    const db = fakeDb([
      { match: "FROM households ORDER BY address", results: [
        { address: "101 Planters Way", owner_name: "Alex Morgan", email: "alex@x.com", phone: "" },
        { address: "=102 Planters Way", owner_name: "-Sam Lee", email: "", phone: "" },
      ] },
    ]);
    const res = await onRequestGet({ request: req("?format=qbo-customers"), env: { DB: db } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-qbo-customers.csv"');
    const lines = (await res.text()).split("\n");
    expect(lines[0]).toBe("Name,Company Name,Email,Phone,Street,City,State,ZIP");
    expect(lines[1]).toBe("101 Planters Way,Alex Morgan,alex@x.com,,101 Planters Way,Lilburn,GA,30047");
    expect(lines[2]).toBe("'=102 Planters Way,'-Sam Lee,,,'=102 Planters Way,Lilburn,GA,30047");
  });

  it("qbo-invoices: settings-driven dues and due date, deterministic invoice numbers", async () => {
    const db = fakeDb([
      { match: "p.id AS payment_id", results: [
        { id: 1, address: "101 Planters Way", payment_id: 11 },
        { id: 2, address: "102 Planters Way", payment_id: null },
      ] },
      { match: "FROM settings", first: (args) =>
        (args[0] === "dues_cents" ? { value: "60000" } : { value: "2026-04-30" }) },
    ]);
    const res = await onRequestGet({ request: req("?year=2026&format=qbo-invoices"), env: { DB: db } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-qbo-invoices-2026.csv"');
    const lines = (await res.text()).split("\n");
    expect(lines[0]).toBe("InvoiceNo,Customer,InvoiceDate,DueDate,Item(Product/Service),ItemDescription,ItemAmount");
    expect(lines[1]).toBe("WOPHA-2026-1,101 Planters Way,2026-01-01,2026-04-30,HOA Annual Dues 2026,Annual dues 2026 — 101 Planters Way,600.00");
    expect(lines.length).toBe(3);
  });

  it("qbo-invoices honors only=unpaid and falls back to Jan 1 when dues_due_date is unset", async () => {
    const db = fakeDb([
      { match: "p.id AS payment_id", results: [
        { id: 1, address: "101 Planters Way", payment_id: 11 },
        { id: 2, address: "102 Planters Way", payment_id: null },
      ] },
      { match: "FROM settings", first: null },
    ]);
    const res = await onRequestGet({ request: req("?year=2026&format=qbo-invoices&only=unpaid"), env: { DB: db } });
    const lines = (await res.text()).split("\n");
    expect(lines.length).toBe(2);
    expect(lines[1]).toBe("WOPHA-2026-2,102 Planters Way,2026-01-01,2026-01-01,HOA Annual Dues 2026,Annual dues 2026 — 102 Planters Way,535.00");
  });

  it("qbo-payments: reference rows for the year's paid households", async () => {
    const db = fakeDb([
      { match: "JOIN households h ON h.id = p.household_id", results: [
        { address: "101 Planters Way", amount_cents: 53500, method: "stripe", paid_on: "2026-03-01", note: "" },
        { address: "102 Planters Way", amount_cents: 50000, method: "check", paid_on: "2026-03-15", note: "check #204" },
      ] },
    ]);
    const res = await onRequestGet({ request: req("?year=2026&format=qbo-payments"), env: { DB: db } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-qbo-payments-2026.csv"');
    expect(await res.text()).toBe([
      "Date,Description,Amount",
      "2026-03-01,Dues 2026 — 101 Planters Way — stripe,535.00",
      "2026-03-15,Dues 2026 — 102 Planters Way — check — check #204,500.00",
    ].join("\n"));
  });

  it("format=board is byte-identical to no format at all", async () => {
    const a = await onRequestGet({ request: req("?year=2026"), env: { DB: boardDb() } });
    const b = await onRequestGet({ request: req("?year=2026&format=board"), env: { DB: boardDb() } });
    expect(await b.text()).toBe(await a.text());
    expect(b.headers.get("Content-Disposition")).toBe(a.headers.get("Content-Disposition"));
  });

  it("rejects unknown formats with 400", async () => {
    const res = await onRequestGet({ request: req("?format=qbo-everything"), env: { DB: fakeDb([]) } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown format");
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect 5 of the 6 new tests to fail: the handler ignores `format` today, so the qbo-* and unknown-format tests die inside `fakeDb` with `no route matches SQL: SELECT h.address, ...` (their route tables deliberately lack the board SQL). The `format=board is byte-identical` test already passes — it is a characterization of the back-compat requirement. Expect `52 passed | 5 failed`.

- [ ] **Step 3: Implement** — replace `functions/api/admin/ledger-export.js` in full:

```js
import { json } from "../_lib/respond.js";
import { safeCell, csvResponse } from "../_lib/csv.js";
import { duesCentsFor, settingValue } from "../_lib/ledger.js";
import { qboCustomerRows, qboInvoiceRows, qboPaymentRows } from "../_lib/qbo.js";

const FORMATS = ["board", "qbo-customers", "qbo-invoices", "qbo-payments"];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const onlyUnpaid = url.searchParams.get("only") === "unpaid";
  const format = url.searchParams.get("format") || "board";
  if (!FORMATS.includes(format)) return json({ error: "Unknown format" }, 400);

  if (format === "qbo-customers") {
    // Year-independent: seeds/refreshes QBO's customer list.
    const { results } = await env.DB.prepare(
      "SELECT address, owner_name, email, phone FROM households ORDER BY address"
    ).all();
    return csvResponse("wopha-qbo-customers.csv", qboCustomerRows(results));
  }

  if (format === "qbo-invoices") {
    // One invoice row per household for the year (accrual workflow).
    // only=unpaid supports "invoice only the households that still owe".
    const { results } = await env.DB.prepare(
      `SELECT h.id, h.address, p.id AS payment_id
       FROM households h
       LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
       ORDER BY h.address`
    ).bind(year).all();
    const households = results.filter((r) => (onlyUnpaid ? r.payment_id == null : true));
    const duesCents = await duesCentsFor(env);
    const dueDate = (await settingValue(env, "dues_due_date")) || year + "-01-01";
    return csvResponse("wopha-qbo-invoices-" + year + ".csv",
      qboInvoiceRows(households, year, duesCents, dueDate));
  }

  if (format === "qbo-payments") {
    // Reference list of the year's recorded payments (cash-basis workflow).
    const { results } = await env.DB.prepare(
      `SELECT h.address, p.amount_cents, p.method, p.paid_on, p.note
       FROM payments p JOIN households h ON h.id = p.household_id
       WHERE p.year = ?
       ORDER BY p.paid_on, h.address`
    ).bind(year).all();
    return csvResponse("wopha-qbo-payments-" + year + ".csv", qboPaymentRows(results, year));
  }

  // board (default) — output byte-identical to the pre-redesign exporter.
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
      safeCell(r.address), safeCell(r.owner_name), safeCell(r.email), safeCell(r.phone),
      r.paid_on ? "paid" : "unpaid",
      r.amount_cents != null ? (r.amount_cents / 100).toFixed(2) : "",
      r.method || "", r.paid_on || "",
    ]);
  const name = "wopha-ledger-" + year + (onlyUnpaid ? "-unpaid" : "") + ".csv";
  return csvResponse(name, [
    ["address", "owner_name", "email", "phone", "status", "amount", "method", "paid_on"],
    ...rows,
  ]);
}
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  57 passed (57)`. Run `npm run lint`: clean.

- [ ] **Step 5: Smoke-check the downloads against local seed data** — `npm run dev` (port 8200), then:

```
curl -s -i "http://127.0.0.1:8200/api/admin/ledger-export?year=2026"
curl -s "http://127.0.0.1:8200/api/admin/ledger-export?year=2026&format=qbo-customers"
curl -s "http://127.0.0.1:8200/api/admin/ledger-export?year=2026&format=qbo-invoices&only=unpaid"
curl -s "http://127.0.0.1:8200/api/admin/ledger-export?year=2026&format=qbo-payments"
```

Expect: the first response's headers still say `filename="wopha-ledger-2026.csv"` and the body is the unchanged board CSV; customers lists the 5 seed households; invoices (unpaid) lists 3 rows numbered `WOPHA-2026-3` through `WOPHA-2026-5` at `535.00`; payments lists the 2 seed payments at `535.00`. Stop the dev server.

- [ ] **Step 6: Commit**

```
git add functions/api/admin/ledger-export.js tests/ledger-export.test.js
git commit -m "ledger-export: QBO format dispatch (qbo-customers|qbo-invoices|qbo-payments)"
```

---

### Task 7: `summary.js` gains `adminEmail` + `collectedCents`

**Files:**
- Modify: `functions/api/admin/summary.js`
- Test: create `tests/summary.test.js`

**Interfaces:**
- Consumes: `context.data.adminEmail` (already set by `functions/api/admin/_middleware.js` on every admin request); `payments` table.
- Produces: `GET /api/admin/summary` response gains `"adminEmail"`: string (the signed-in board member's email — the portal sidebar identity block renders this) and `"collectedCents"`: integer (SUM of `payments.amount_cents` for the current year — the dashboard "$collected" KPI). Existing fields (`year`, `households`, `paid`, `newSubmissions`, `latestAnnouncement`) are unchanged.

- [ ] **Step 1: Write the failing tests** — create `tests/summary.test.js`:

```js
import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/summary.js";
import { fakeDb } from "./helpers/fake-db.js";

function summaryDb() {
  return fakeDb([
    { match: "COUNT(*) AS n FROM households", first: { n: 170 } },
    { match: "COUNT(*) AS n FROM payments", first: { n: 120 } },
    { match: "SUM(amount_cents)", first: { c: 6420000 } },
    { match: "FROM submissions", first: { n: 3 } },
    { match: "FROM announcements", first: { title: "Pool opens May 17", created_at: "2026-05-01 12:00:00" } },
  ]);
}

describe("GET /api/admin/summary", () => {
  it("adds collectedCents and adminEmail to the dashboard numbers", async () => {
    const res = await onRequestGet({ env: { DB: summaryDb() }, data: { adminEmail: "treasurer@wopha.com" } });
    const body = await res.json();
    expect(body.year).toBe(new Date().getFullYear());
    expect(body.households).toBe(170);
    expect(body.paid).toBe(120);
    expect(body.collectedCents).toBe(6420000);
    expect(body.newSubmissions).toBe(3);
    expect(body.latestAnnouncement).toEqual({ title: "Pool opens May 17", created_at: "2026-05-01 12:00:00" });
    expect(body.adminEmail).toBe("treasurer@wopha.com");
  });
  it("returns an empty-string adminEmail when middleware data is absent (defensive)", async () => {
    const res = await onRequestGet({ env: { DB: summaryDb() } });
    expect((await res.json()).adminEmail).toBe("");
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect both new tests to fail: today's handler runs its four queries fine against the fake (the SUM route just goes unused) but the response has no `collectedCents`, so the first test fails with `expected undefined to be 6420000` and the second with `expected undefined to be ''`. Expect `57 passed | 2 failed`.

- [ ] **Step 3: Implement** — replace `functions/api/admin/summary.js` in full:

```js
import { json } from "../_lib/respond.js";

export async function onRequestGet({ env, data }) {
  const year = new Date().getFullYear();
  const households = await env.DB.prepare("SELECT COUNT(*) AS n FROM households").first();
  const paid = await env.DB.prepare("SELECT COUNT(*) AS n FROM payments WHERE year = ?").bind(year).first();
  const collected = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) AS c FROM payments WHERE year = ?"
  ).bind(year).first();
  const newSubs = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'new'").first();
  const latest = await env.DB.prepare(
    "SELECT title, created_at FROM announcements WHERE deleted = 0 ORDER BY created_at DESC LIMIT 1"
  ).first();
  return json({
    year,
    households: households.n,
    paid: paid.n,
    collectedCents: collected.c,
    newSubmissions: newSubs.n,
    latestAnnouncement: latest || null,
    adminEmail: (data && data.adminEmail) || "",
  });
}
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  59 passed (59)`. Run `npm run lint`: clean.

- [ ] **Step 5: Commit**

```
git add functions/api/admin/summary.js tests/summary.test.js
git commit -m "summary: adminEmail + collectedCents for the portal dashboard"
```

---

### Task 8: `PUT /api/admin/households/:id` — partial household update

**Files:**
- Create: `functions/api/admin/households/[id].js`
- Modify: `functions/api/_lib/validate.js`
- Test: `tests/validate.test.js`, `tests/households.test.js`

**Interfaces:**
- Consumes: `json` from `_lib/respond.js`; `fakeDb` (Task 2); gate via directory `_middleware.js`.
- Produces: `validateHouseholdUpdate(input)` → `{ok, value?|error}` where `value` holds only the provided fields (trimmed); `PUT /api/admin/households/:id` body = any subset of `{address, owner_name, email, phone}` → `{"ok":true}` | 400 (bad input, empty body, address collision) | 404 (unknown id). This unblocks the portal's Households-tab inline row editing.

- [ ] **Step 1: Write the failing validator tests** — in `tests/validate.test.js`, add `validateHouseholdUpdate` to the import list at the top:

```js
import {
  validateSubmission,
  validateAnnouncement,
  validatePayment,
  validateContent,
  validateSetting,
  validateHouseholdUpdate,
} from "../functions/api/_lib/validate.js";
```

Append at the end of the file:

```js
describe("validateHouseholdUpdate", () => {
  it("accepts a partial update and trims the provided fields", () => {
    const r = validateHouseholdUpdate({ owner_name: " New Owner ", email: "new@x.com" });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ owner_name: "New Owner", email: "new@x.com" });
  });
  it("rejects an empty address, non-string fields, and oversized values", () => {
    expect(validateHouseholdUpdate({ address: "  " }).ok).toBe(false);
    expect(validateHouseholdUpdate({ phone: 5551234 }).ok).toBe(false);
    expect(validateHouseholdUpdate({ owner_name: "x".repeat(201) }).ok).toBe(false);
  });
  it("rejects empty or malformed bodies", () => {
    expect(validateHouseholdUpdate({}).ok).toBe(false);
    expect(validateHouseholdUpdate(null).ok).toBe(false);
    expect(validateHouseholdUpdate(["address"]).ok).toBe(false);
    expect(validateHouseholdUpdate({ unrelated: "x" }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Write the failing handler tests** — append to `tests/households.test.js`, and add the import at the top of the file:

```js
import { onRequestPut } from "../functions/api/admin/households/[id].js";
```

```js
function putReq(body) {
  return new Request("http://localhost:8200/api/admin/households/3", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/admin/households/:id", () => {
  it("updates only the provided fields and returns ok", async () => {
    const db = fakeDb([{ match: "UPDATE households SET" }]);
    const res = await onRequestPut({
      request: putReq({ owner_name: "New Owner", email: "new@x.com" }),
      env: { DB: db }, params: { id: "3" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls[0].sql).toBe("UPDATE households SET owner_name = ?, email = ? WHERE id = ?");
    expect(db.calls[0].args).toEqual(["New Owner", "new@x.com", 3]);
  });
  it("404s on an unknown id", async () => {
    const db = fakeDb([{ match: "UPDATE households SET", run: { meta: { changes: 0 } } }]);
    const res = await onRequestPut({
      request: putReq({ owner_name: "X" }), env: { DB: db }, params: { id: "999" },
    });
    expect(res.status).toBe(404);
  });
  it("400s on bad ids, empty bodies, and empty addresses — without touching the DB", async () => {
    const db = fakeDb([]);
    expect((await onRequestPut({ request: putReq({ owner_name: "X" }), env: { DB: db }, params: { id: "abc" } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({}), env: { DB: db }, params: { id: "3" } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({ address: "" }), env: { DB: db }, params: { id: "3" } })).status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
  it("400s when the new address collides with another household", async () => {
    const db = fakeDb([{ match: "UPDATE households SET", error: "UNIQUE constraint failed: households.address" }]);
    const res = await onRequestPut({
      request: putReq({ address: "101 Planters Way" }), env: { DB: db }, params: { id: "3" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That address is already on file");
  });
});
```

- [ ] **Step 3: Verify the tests fail** — run `npm test`. Expect `tests/validate.test.js` to fail to load (`does not provide an export named 'validateHouseholdUpdate'`) and `tests/households.test.js` to fail to load (module-resolution error for `households/[id].js`); their tests cannot run at all. The remaining 7 files pass: `Tests  38 passed (38)` (csv 7, ledger 8, auth 4, settings 4, qbo 5, summary 2, ledger-export 8), `Test Files  2 failed | 7 passed`.

- [ ] **Step 4: Implement the validator** — append to `functions/api/_lib/validate.js`:

```js
// Partial household update (admin/households/[id].js). Only the four editable
// columns are accepted; address may not be blanked (it is the natural key).
export function validateHouseholdUpdate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "Bad input" };
  const editable = ["address", "owner_name", "email", "phone"];
  const value = {};
  for (const f of editable) {
    if (input[f] === undefined) continue;
    if (typeof input[f] !== "string") return { ok: false, error: f + " must be text" };
    const s = input[f].trim();
    if (s.length > 200) return { ok: false, error: f + " too long (max 200 characters)" };
    if (f === "address" && !s) return { ok: false, error: "address cannot be empty" };
    value[f] = s;
  }
  if (Object.keys(value).length === 0) return { ok: false, error: "Nothing to update" };
  return { ok: true, value };
}
```

- [ ] **Step 5: Implement the handler** — create `functions/api/admin/households/[id].js` (SET clause built only from the validator's allowlisted field names — no user input reaches the SQL text; same pattern as `submissions/[id].js`):

```js
import { json } from "../../_lib/respond.js";
import { validateHouseholdUpdate } from "../../_lib/validate.js";

export async function onRequestPut({ request, env, params }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Bad id" }, 400);
  const input = await request.json().catch(() => ({}));
  const check = validateHouseholdUpdate(input);
  if (!check.ok) return json({ error: check.error }, 400);
  const fields = Object.keys(check.value);
  const sets = fields.map((f) => f + " = ?").join(", ");
  const binds = fields.map((f) => check.value[f]);
  binds.push(id);
  try {
    const r = await env.DB.prepare("UPDATE households SET " + sets + " WHERE id = ?")
      .bind(...binds).run();
    if (r.meta.changes === 0) return json({ error: "Not found" }, 404);
    return json({ ok: true });
  } catch (e) {
    if (String(e && e.message).includes("UNIQUE")) {
      return json({ error: "That address is already on file" }, 400);
    }
    throw e;
  }
}
```

- [ ] **Step 6: Verify** — run `npm test`: expect `Tests  66 passed (66)`. Run `npm run lint`: clean.

- [ ] **Step 7: Commit**

```
git add functions/api/admin/households/[id].js functions/api/_lib/validate.js tests/validate.test.js tests/households.test.js
git commit -m "PUT /api/admin/households/:id - partial household update"
```

---

### Task 9: content GET gains a per-key `updated_at` map

**Files:**
- Modify: `functions/api/content.js`
- Test: create `tests/content.test.js`

**Interfaces:**
- Consumes: `site_content.updated_at` column (already in the schema).
- Produces: `GET /api/content` response gains a top-level `"updated_at"` object mapping each content key to its SQLite timestamp. Additive-safe: both existing consumers (`assets/js/site.js` and `portal/content.html`) read named keys (`content.season_glance`, `content[data-key]`) and never iterate the object, and `CONTENT_KEYS` is allowlisted so no content key can ever be named `updated_at`. The portal's redesigned content editor renders "last updated" from this map.

- [ ] **Step 1: Write the failing tests** — create `tests/content.test.js`:

```js
import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/content.js";
import { fakeDb } from "./helpers/fake-db.js";

describe("GET /api/content", () => {
  it("returns parsed content plus a per-key updated_at map", async () => {
    const db = fakeDb([{ match: "FROM site_content", results: [
      { key: "season_glance", value: '[["2026 annual dues","$535"]]', updated_at: "2026-07-01 10:00:00" },
      { key: "pool_hours", value: '[["Monday","11 a.m. - 8 p.m."]]', updated_at: "2026-07-02 09:00:00" },
    ] }]);
    const res = await onRequestGet({ env: { DB: db } });
    expect(await res.json()).toEqual({
      season_glance: [["2026 annual dues", "$535"]],
      pool_hours: [["Monday", "11 a.m. - 8 p.m."]],
      updated_at: {
        season_glance: "2026-07-01 10:00:00",
        pool_hours: "2026-07-02 09:00:00",
      },
    });
  });
  it("skips rows with bad JSON but keeps the rest", async () => {
    const db = fakeDb([{ match: "FROM site_content", results: [
      { key: "season_glance", value: "not json", updated_at: "2026-07-01 10:00:00" },
      { key: "pool_hours", value: '[["Monday","closed"]]', updated_at: "2026-07-02 09:00:00" },
    ] }]);
    expect(await (await onRequestGet({ env: { DB: db } })).json()).toEqual({
      pool_hours: [["Monday", "closed"]],
      updated_at: { pool_hours: "2026-07-02 09:00:00" },
    });
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect both new tests to fail on the missing `updated_at` key (the deep-equal reports the object difference). Expect `66 passed | 2 failed`.

- [ ] **Step 3: Implement** — replace `functions/api/content.js` in full:

```js
import { json } from "./_lib/respond.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value, updated_at FROM site_content").all();
  const content = {};
  const updated = {};
  for (const r of results) {
    try {
      content[r.key] = JSON.parse(r.value);
      updated[r.key] = r.updated_at;
    } catch (_) { /* skip bad rows */ }
  }
  // Additive: consumers read named keys; CONTENT_KEYS can never collide.
  content.updated_at = updated;
  return json(content);
}
```

- [ ] **Step 4: Verify** — run `npm test`: expect `Tests  68 passed (68)`. Run `npm run lint`: clean. Public-page sanity check: `npm run dev`, load `http://127.0.0.1:8200/` and `http://127.0.0.1:8200/pool.html` — the season-glance list and pool-hours table still render from the API (baked-in HTML swap works). Stop the dev server.

- [ ] **Step 5: Commit**

```
git add functions/api/content.js tests/content.test.js
git commit -m "content GET: per-key updated_at map for the portal editor"
```

---

### Task 10: backup worker — `settings` in both TABLES lists, schema drift test, monthly retention

**Files:**
- Modify: `workers/backup/index.js`, `functions/api/admin/export.js`
- Test: create `tests/backup.test.js`

**Interfaces:**
- Consumes: `schema.sql` (parsed by the drift test via `node:fs` — tests run in Node, not workerd).
- Produces: `TABLES` exported from both `workers/backup/index.js` and `functions/api/admin/export.js`, now including `settings`; pure `keysToDelete(keys, nowIso)` and `monthFloor(nowIso, n)` exported from the worker; retention becomes "8 most recent weeklies PLUS the first backup of each calendar month for the last 12 months". The drift test makes a forgotten TABLES entry a loud test failure forever after.

Notes: the worker stays dependency-free — it must NOT import from `functions/` (it deploys as a separate Worker via `workers/backup/wrangler.toml`, which is unchanged: the cron stays weekly; monthly retention emerges from the weekly cadence because the first weekly dump landing in a new month becomes that month's keeper). Extra exports on a Pages Function module (`export.js`) and on a Worker module are inert at runtime. Behavior guardrail preserved from the current prune: keys that do not match `wopha-backup-YYYY-MM-DD.json` are never deleted.

- [ ] **Step 1: Write the failing tests** — create `tests/backup.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TABLES as workerTables, keysToDelete, monthFloor } from "../workers/backup/index.js";
import { TABLES as exportTables } from "../functions/api/admin/export.js";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const schemaTables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)]
  .map((m) => m[1]).sort();

describe("backup/export table drift", () => {
  it("backup worker TABLES matches the CREATE TABLE names in schema.sql", () => {
    expect([...workerTables].sort()).toEqual(schemaTables);
  });
  it("admin export TABLES matches the CREATE TABLE names in schema.sql", () => {
    expect([...exportTables].sort()).toEqual(schemaTables);
  });
});

describe("monthFloor", () => {
  it("computes YYYY-MM n months back, across year boundaries", () => {
    expect(monthFloor("2026-07-20T06:00:00.000Z", 11)).toBe("2025-08");
    expect(monthFloor("2026-01-05T00:00:00.000Z", 11)).toBe("2025-02");
    expect(monthFloor("2026-01-05T00:00:00.000Z", 0)).toBe("2026-01");
  });
});

describe("keysToDelete retention", () => {
  const NOW = "2026-07-20T06:00:00.000Z";
  const RECENT_8 = [
    "wopha-backup-2026-06-01.json", "wopha-backup-2026-06-08.json",
    "wopha-backup-2026-06-15.json", "wopha-backup-2026-06-22.json",
    "wopha-backup-2026-06-29.json", "wopha-backup-2026-07-06.json",
    "wopha-backup-2026-07-13.json", "wopha-backup-2026-07-20.json",
  ];
  it("deletes nothing while there are 8 or fewer weeklies", () => {
    expect(keysToDelete(RECENT_8, NOW)).toEqual([]);
    expect(keysToDelete(RECENT_8.slice(0, 3), NOW)).toEqual([]);
  });
  it("prunes older weeklies but keeps the first backup of each of the last 12 months", () => {
    const keys = [
      ...RECENT_8,
      "wopha-backup-2026-05-04.json", // first of 2026-05 → kept (monthly)
      "wopha-backup-2026-05-11.json", // pruned
      "wopha-backup-2025-08-04.json", // first of 2025-08 (12-month edge) → kept
      "wopha-backup-2025-08-11.json", // pruned
      "wopha-backup-2025-07-07.json", // month older than 12 months → pruned
      "wopha-backup-2025-06-02.json", // pruned
    ];
    expect(keysToDelete(keys, NOW)).toEqual([
      "wopha-backup-2025-06-02.json",
      "wopha-backup-2025-07-07.json",
      "wopha-backup-2025-08-11.json",
      "wopha-backup-2026-05-11.json",
    ]);
  });
  it("never touches keys that do not match the dated-backup pattern", () => {
    expect(keysToDelete(["wopha-backup-manual.json", "wopha-backup-2020-01-01.json.bak"], NOW)).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify the tests fail** — run `npm test`. Expect `tests/backup.test.js` to fail to load: `The requested module '../workers/backup/index.js' does not provide an export named 'TABLES'`. Rest of the suite: 68 passed.

- [ ] **Step 3: Implement the worker** — replace `workers/backup/index.js` in full:

```js
// Weekly D1 → R2 backup.
// Retention: the KEEP most recent weekly dumps, plus the first backup of each
// calendar month for the last MONTHS months — an annual dues cycle needs more
// than two months of history, and a year of monthlies is effectively free in R2.
// TABLES is duplicated in functions/api/admin/export.js ON PURPOSE — this
// worker deploys separately and must not import from functions/. The drift
// test in tests/backup.test.js keeps both lists equal to schema.sql.
export const TABLES = ["announcements", "submissions", "households", "payments", "site_content", "settings"];
const KEEP = 8;
const MONTHS = 12;

// "YYYY-MM" for the month n months before the given ISO datetime.
export function monthFloor(nowIso, n) {
  const y = Number(nowIso.slice(0, 4));
  const m = Number(nowIso.slice(5, 7));
  const total = y * 12 + (m - 1) - n;
  return String(Math.floor(total / 12)).padStart(4, "0") + "-" + String((total % 12) + 1).padStart(2, "0");
}

// Pure retention rule: which keys to prune. Only keys matching the dated
// backup pattern are ever considered — nothing else in the bucket is touched.
export function keysToDelete(keys, nowIso) {
  const dated = keys
    .filter((k) => /^wopha-backup-\d{4}-\d{2}-\d{2}\.json$/.test(k))
    .sort();
  const keep = new Set(dated.slice(-KEEP));
  const cutoff = monthFloor(nowIso, MONTHS - 1); // current month counts as one of the 12
  const seenMonth = new Set();
  for (const k of dated) {
    const month = k.slice(13, 20); // "wopha-backup-".length === 13 → "YYYY-MM"
    if (seenMonth.has(month)) continue;
    seenMonth.add(month);
    if (month >= cutoff) keep.add(k); // earliest backup of a recent month
  }
  return dated.filter((k) => !keep.has(k));
}

export default {
  async scheduled(controller, env) {
    const dump = {};
    for (const t of TABLES) {
      const { results } = await env.DB.prepare("SELECT * FROM " + t).all();
      dump[t] = results;
    }
    const now = new Date(controller.scheduledTime).toISOString();
    await env.BACKUPS.put("wopha-backup-" + now.slice(0, 10) + ".json", JSON.stringify(dump));

    const list = await env.BACKUPS.list({ prefix: "wopha-backup-" });
    for (const key of keysToDelete(list.objects.map((o) => o.key), now)) {
      await env.BACKUPS.delete(key);
    }
  },
};
```

- [ ] **Step 4: Implement the export-side list** — replace `functions/api/admin/export.js` in full:

```js
// Full-table JSON dump (the portal's "Backup & data" card).
// TABLES is duplicated in workers/backup/index.js ON PURPOSE — the backup
// worker deploys separately and must not import from functions/. The drift
// test in tests/backup.test.js keeps both lists equal to schema.sql.
export const TABLES = ["announcements", "submissions", "households", "payments", "site_content", "settings"];

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

- [ ] **Step 5: Verify** — run `npm test`: expect `Tests  74 passed (74)`. Run `npm run lint`: clean. Confirm the JSON export now carries settings: `npm run dev`, then `curl -s http://127.0.0.1:8200/api/admin/export` — the dump must contain a `"settings"` key with the seeded `dues_cents` row. Stop the dev server.

- [ ] **Step 6: Commit**

```
git add workers/backup/index.js functions/api/admin/export.js tests/backup.test.js
git commit -m "Backup: settings table, schema drift test, 12-month monthly retention"
```

---

### Task 11: docs — record the QBO rejection rationale and the accounting guidance

**Files:**
- Create: `docs/quickbooks-export.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: decisions from spec §5 and `docs/superpowers/specs/2026-07-16-redesign-inputs/plan-quickbooks-backend.md`.
- Produces: the permanent record that stops future maintainers from relitigating the QBO API/IIF decision, plus the cash-vs-accrual double-booking guidance the portal UI's help popover will summarize. (There is no `docs/dev/` directory in this repo; developer docs live in `README.md` + `docs/` — so this is a new `docs/quickbooks-export.md`, linked from the README. `docs/` never reaches the public `deploy` branch, so board-facing content is safe here.)

- [ ] **Step 1: Create `docs/quickbooks-export.md`** with exactly this content:

```markdown
# QuickBooks export — rationale & treasurer runbook

**Decision (2026-07, redesign spec §5): QuickBooks integration is a link plus
one-way CSV export. D1 is the ledger of record. There is no sync.**

## What the portal provides

- **Open QuickBooks ↗** button (Ledger screen) — plain external link to the URL
  stored in the `quickbooks_url` setting (Portal → Settings). No URL, no button.
- Three CSV downloads on the Exports tab, all from
  `GET /api/admin/ledger-export?year=YYYY&format=...`:
  | Format | File | Use |
  |---|---|---|
  | `qbo-customers` | `wopha-qbo-customers.csv` | seed/refresh QBO's customer list (year-independent) |
  | `qbo-invoices` | `wopha-qbo-invoices-<year>.csv` | optional accrual workflow; supports `only=unpaid` |
  | `qbo-payments` | `wopha-qbo-payments-<year>.csv` | REFERENCE list for the cash workflow — never import as transactions |

## Why CSV — and why NOT the QBO API or IIF (do not relitigate)

- **IIF is a dead end:** QuickBooks *Online* cannot import IIF at all. It is a
  QuickBooks Desktop format, deprecated by Intuit since 2019.
- **The QBO API was rejected deliberately**, not overlooked: it requires an
  Intuit developer account, OAuth tokens that expire after ~100 days of
  inactivity, a production-key compliance review, an entity-ID mapping table,
  and dedupe logic. That is a standing operational liability that outlives
  every volunteer treasurer, to save minutes per year at ~170 payments.
  Silent failure modes (lapsed tokens, half-pushed batches) are the worst kind
  for a volunteer board. Nothing here forecloses the API later — if the board
  ever has ongoing dev help, revisit it; until then, CSV.
- CSV has zero external dependencies, no secrets to rotate, survives treasurer
  turnover (QBO's importer is a documented end-user feature), and fails loudly
  (QBO previews and reports row errors). One-way stays one-way structurally:
  no Intuit credentials exist anywhere in this codebase.

## The double-booking caveat (read before importing anything)

The treasurer's QBO bank feed already ingests Stripe payouts, Zelle deposits,
and deposited checks. **If you also import payment transactions, income is
booked twice.** Pick one workflow:

- **Cash-basis (recommended default):** the bank feed books income, exactly as
  today. Use `wopha-qbo-customers.csv` once to seed the customer list, and use
  `wopha-qbo-payments-<year>.csv` only as a *reference* to categorize and memo
  bank-feed deposits (who/what/when). Import nothing as transactions.
- **Accrual / A-R (optional):** import `wopha-qbo-invoices-<year>.csv` **once
  per year** via QBO's native invoice importer to get "who owes us" inside QBO;
  payments are then received against invoices via bank-feed matching. Verify
  the invoice-import feature exists on the association's QBO tier first.

## Import runbook (mirrored in the portal help popover)

1. In QBO: gear icon → **Import data** → **Customers** → upload
   `wopha-qbo-customers.csv` → map columns → import.
2. (Accrual only, once per year) gear icon → **Import data** → **Invoices** →
   upload `wopha-qbo-invoices-<year>.csv`. QBO auto-creates the service item
   `HOA Annual Dues <year>` and any missing customers.
3. Invoice numbers are deterministic (`WOPHA-<year>-<household_id>`), so an
   accidental re-import collides visibly in QBO instead of duplicating.
4. Never import `wopha-qbo-payments-<year>.csv` as transactions — see above.
5. Mark payments in the portal as they arrive; D1 stays the source of truth.

## Data mapping & known imperfect fits

- Customer display name = **street address** (unique in D1 and QBO; survives
  owner turnover). Owner name maps to Company Name. City/state/ZIP are
  whole-subdivision constants in `functions/api/_lib/qbo.js` — **confirm the
  ZIP (currently 30047) with the board before the first real import.**
- `DueDate` comes from the `dues_due_date` setting; unset falls back to Jan 1
  of the export year. Amounts come from the `dues_cents` setting.
- No partial payments: D1 stores one payment per household-year
  (`UNIQUE(household_id, year)`), so the export cannot represent installments.
  This stays until Stripe auto-reconciliation lands; the payments export
  iterates payment rows, so it survives that migration unchanged.
- Stripe fee netting stays a manual treasurer task (D1 records gross dues; the
  bank feed shows net payouts). Refunds/NSF = manual credit memos in QBO; the
  export never emits negative rows. QBO cannot CSV-import sales receipts —
  that is why the cash workflow uses the bank feed plus a reference list.
- **Residents pay via the planned Stripe flow, never through QBO payment
  links** — routing residents through QBO would move payment truth out of D1
  and break the ledger-of-record model.

## Security notes

- All export formats live behind the Cloudflare Access gate on
  `/api/admin/*`. `DEMO_OPEN_ADMIN` must be removed before real resident data
  exists (launch checklist §7) — these exports raise the stakes: they carry
  the full resident PII set.
- Every text cell in every format passes through `safeCell`
  (`functions/api/_lib/csv.js`) to neutralize spreadsheet formula injection.
```

- [ ] **Step 2: Link it from the README** — in `README.md`, add this bullet to the top list, immediately after the "Payments, bookings, and forms..." bullet:

```markdown
- QuickBooks: the board portal exports QBO-ready CSVs (one-way; D1 stays the
  ledger of record) — rationale and treasurer runbook in
  `docs/quickbooks-export.md`.
```

- [ ] **Step 3: Verify** — run `npm test`: expect `Tests  74 passed (74)` (unchanged — docs only). Run `npm run lint`: clean (`docs/**` is ignored by `eslint.config.mjs`).

- [ ] **Step 4: Commit**

```
git add docs/quickbooks-export.md README.md
git commit -m "docs: QuickBooks export rationale, double-booking guidance, runbook"
```

---

## Final verification (after all tasks)

- [ ] `npm test` → `Test Files  11 passed (11)`, `Tests  74 passed (74)`.
- [ ] `npm run lint` → no errors, no warnings.
- [ ] `git log --oneline` shows the 11 task commits on `redesign-experiment`; `git status` clean; **nothing pushed**.
- [ ] Interface-contract spot check against the running dev server (`npm run dev`, seeded local D1):
  - `GET /api/admin/settings` → `{"dues_cents":"53500","dues_due_date":"","quickbooks_url":""}` (plus any values you PUT while testing).
  - `GET /api/admin/households?year=2026` → body has integer `dues_cents` and `summary.collectedCents`.
  - `GET /api/admin/summary` → has `adminEmail` (locally `"dev@localhost"`) and integer `collectedCents`.
  - `GET /api/content` → has the `updated_at` map; `GET /api/admin/export` → dump includes `"settings"`.
  - `GET /api/admin/ledger-export?year=2026` downloads exactly the same CSV as before this plan.
- [ ] Hand off: the portal track consumes the contract section verbatim; the QBO export UI copy (runbook popover, double-count warning) sources from `docs/quickbooks-export.md`.
