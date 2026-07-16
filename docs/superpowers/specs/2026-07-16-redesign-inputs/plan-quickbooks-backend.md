# WOPHA Board Portal — QuickBooks Seam & Backend Architecture Proposal

**Scope constraints (fixed):** QuickBooks integration = link + one-way export only. Cloudflare D1 stays the ledger of record for households/dues/payments. No two-way sync. Backend may be re-architected where it earns its keep.

**Grounding:** based on reading `functions/api/**` (all 20 files), `schema.sql`, `wrangler.toml`, `workers/backup/*`. Key facts: ~170 households; `payments` is one row per `(household_id, year)` (annual dues, `UNIQUE` constraint); amounts stored as integer cents; dues constant `DUES_CENTS = 53500` in `functions/api/_lib/ledger.js`; existing exports are `functions/api/admin/ledger-export.js` (board CSV) and `functions/api/admin/export.js` (full JSON dump); admin APIs gated by Cloudflare Access via `functions/api/admin/_middleware.js` + `_lib/auth.js`.

---

# Part A — QuickBooks link + export seam

## A1. Export format options & recommendation

### The three realistic paths

| | (a) CSV import into QBO | (b) IIF files | (c) QBO API push (OAuth2) |
|---|---|---|---|
| Works with QuickBooks **Online** | Yes — native importers for Customers, Invoices, and bank transactions | **No.** QBO cannot import IIF at all; IIF is QuickBooks *Desktop* only, and Intuit has deprecated it there since 2019 | Yes |
| Dev/ops burden | One CSV-formatting function; no external accounts | n/a | Intuit developer account, app keys, OAuth2 token storage + refresh (refresh tokens rotate; die after ~100 days idle), production-key compliance questionnaire, an entity-ID mapping table in D1, dedupe logic, error handling when Intuit changes things |
| Treasurer turnover | New treasurer clicks the same buttons; import steps are QBO UI features Intuit documents for end users | n/a | New treasurer must re-authorize the OAuth connection; if it lapses >100 days, someone technical must re-link |
| Cost | $0 | n/a | $0 in fees, but real ongoing maintenance — exactly what a volunteer HOA with no dev team can't fund |
| Failure mode | Bad import → QBO shows row errors, treasurer fixes CSV or skips | n/a | Silent token expiry, half-pushed batches, orphaned QBO entities |

### Recommendation: **CSV, full stop.**

For ~170 payments **per year**, an API integration saves at most minutes annually and costs a standing OAuth liability that outlives every volunteer. IIF is a dead end for QBO. CSV export:

- has zero external dependencies (no Intuit developer account, no secrets to rotate),
- survives treasurer turnover (the import is a documented QBO end-user feature),
- fails loudly and locally (QBO's importer previews and reports row errors),
- keeps the one-way promise structurally — the portal literally cannot write to QBO.

**Record the rejection of (b) and (c) in `docs/` so future maintainers don't relitigate it.** If the board ever hires ongoing dev help, the API option can be revisited; nothing in this design forecloses it.

### One important accounting caveat: avoid double-booking

The treasurer's QBO almost certainly has a **bank feed** (Stripe payouts, Zelle deposits, deposited checks arrive automatically). If the portal also exports payment transactions and the treasurer imports them, income is booked **twice**. So the export design supports two workflows and the UI says which to pick:

- **Cash-basis workflow (recommended default):** QBO income comes from the bank feed as it does today. The portal exports are (1) a one-time **Customers** CSV to seed QBO's customer list and (2) a **payments reference** CSV the treasurer uses to *categorize and memo* bank-feed deposits (who/what/when), not to import as transactions. Zero double-count risk, zero new QBO mechanics to learn.
- **Accrual/A-R workflow (optional):** if the board wants "who owes us" visible inside QBO, export an **Invoices** CSV once per year (QBO natively imports invoices and auto-creates missing customers); payments are then *received* against invoices via the bank feed match. More QBO work, but proper A/R aging. Note: verify the invoice-import feature on the association's QBO tier before promising it.

Both are cheap once the CSV builder exists, so ship all three formats and let the treasurer's workflow decide.

## A2. Data mapping (D1 → QuickBooks entities)

### households → QBO **Customers**

QBO customer-import columns (Settings → Import data → Customers):

| QBO column | D1 source | Notes |
|---|---|---|
| Name (display name) | `households.address` | Address is `UNIQUE` in D1 and QBO requires unique display names — clean fit, and it's how the treasurer thinks ("123 Oak Ct"), robust to owner turnover |
| Company Name | `owner_name` | Or map to First/Last if preferred; owner name changes on sale, address doesn't |
| Email | `email` | |
| Phone | `phone` | |
| Street | `address` | City/State/ZIP are the same for the whole subdivision — synthesize as constants in the export (config, see B) or leave blank |

### dues concept → QBO **Product/Service item**

One Service item per year: **"HOA Annual Dues 2026"**, income account "Association Dues". The export's invoice rows reference it by name; QBO's importer creates it on first import. D1 has no item table — the item name is derived (`"HOA Annual Dues " + year`), which is fine.

### payments → QBO **Invoices** (accrual) or memo reference (cash)

QBO invoice-import row per household per year:

| QBO column | Value |
|---|---|
| InvoiceNo | `WOPHA-<year>-<household_id>` — **stable and deterministic**, so a re-import collides on the invoice number instead of silently duplicating |
| Customer | household address |
| InvoiceDate / DueDate | Jan 1 of year / the dues deadline (config) |
| Item(Product/Service) | `HOA Annual Dues <year>` |
| ItemDescription | `Annual dues <year> — <address>` |
| ItemAmount | dues for that year, dollars with 2 decimals |

Payments-reference CSV (cash workflow, also usable with QBO's 3-column bank import if someone insists): `Date (paid_on), Description ("Dues 2026 — 123 Oak Ct — zelle — note"), Amount`.

### Where the fit is imperfect (be honest with the board)

1. **One payment per household-year.** `UNIQUE(household_id, year)` means D1 cannot represent installments/partial payments, so neither can the export. Acceptable today (annual dues), flagged as the known ceiling (see B6).
2. **Stripe nets fees.** D1 records gross dues; the bank feed shows net Stripe payouts in batches. Fee expense booking stays a manual treasurer task (or Intuit's Stripe connector app) — out of scope, say so.
3. **Refunds/NSF.** D1 models this as deleting the payment row; QBO would want a credit memo/refund receipt. Manual in QBO; the export never emits negative rows.
4. **Sales Receipts can't be CSV-imported natively** in QBO (third-party importers only, ~$10–30/mo). That's why the cash workflow uses the bank feed + reference CSV instead of pretending sales-receipt import is free.
5. **Owner turnover mid-year:** D1 overwrites `owner_name` on household upsert; QBO customer history keeps the old name until the next Customers CSV import updates it. Cosmetic.

## A3. "View/Pay in QuickBooks" linking — what's realistic without sync

Facts first:

- QBO **invoice payment links** are per-invoice opaque-token URLs generated inside QBO (with QuickBooks Payments enabled). The portal **cannot compute or predict them** — capturing them would require reading from the QBO API, i.e., the sync we're explicitly not doing.
- There is no stable public per-customer QBO portal URL an outside site can deep-link residents into.

So, concretely:

1. **Board-facing "Open QuickBooks" (ship this):** a single external-link button on the Ledger screen pointing at the association's QBO company (e.g. `https://app.qbo.intuit.com/app/customers`). The URL is stored in portal settings (see B6), not hardcoded, so treasurers can point it wherever they actually work. This is the honest meaning of "View in QuickBooks" under one-way constraints.
2. **Resident-facing "pay" stays Stripe, not QBO.** The approved addendum already commits to Stripe checkout with auto-reconciliation into D1 (payment carries the property address). That is strictly better than QBO invoice links for residents: the portal controls it, D1 marks paid automatically, and QBO sees the money via bank feed. Recommend explicitly: **do not** route residents through QBO payment links — it would put payment truth in QBO and break "D1 is the ledger of record."
3. **If the treasurer wants to email QBO invoice links** for stragglers, they can, from inside QBO, using invoices created by the yearly CSV import. The portal is not in that loop and shouldn't pretend to be.

## A4. Endpoint & UI design

### Endpoint: extend the existing exporter, don't add a parallel one

`GET /api/admin/ledger-export?year=YYYY&format=<f>` in `functions/api/admin/ledger-export.js` (already Access-gated by `_middleware.js`; GET + `Content-Disposition` means plain `<a>` buttons work in the portal with the Access cookie — no fetch/blob plumbing).

| `format` | Output | Filename |
|---|---|---|
| *(absent)* / `board` | current board CSV, unchanged (back-compat) | `wopha-ledger-<year>[.unpaid].csv` |
| `qbo-customers` | Customers import CSV (year-independent) | `wopha-qbo-customers.csv` |
| `qbo-invoices` | Invoice import CSV, one row per household for `year` | `wopha-qbo-invoices-<year>.csv` |
| `qbo-payments` | Payments reference CSV (paid rows only) for `year` | `wopha-qbo-payments-<year>.csv` |

Existing `only=unpaid` continues to apply to `board` (and is meaningful for `qbo-invoices` too — "invoice only the unpaid" is a plausible treasurer ask; support it).

Row-building lives in a new pure module `functions/api/_lib/qbo.js` (`qboCustomerRows(households)`, `qboInvoiceRows(households, year, duesCents, dueDate)`, `qboPaymentRows(rows, year)`) — array-of-arrays in, `toCsv` out, unit-testable in the existing test suite without a Workers runtime. The `safeCell` formula-injection guard moves from `ledger-export.js` into `_lib/csv.js` and is applied to all text cells in every format.

### UI entry points (for the sibling UI agent — Ledger screen)

- An **Export** group/menu on the Ledger screen: "Board spreadsheet (CSV)" [existing], "QuickBooks — Customers", "QuickBooks — Invoices (year)", "QuickBooks — Payments (year)". All plain links to the endpoint above with the current year filter applied.
- An **"Open QuickBooks"** button (external link, new tab) rendered only when the `quickbooks_url` setting is non-empty.
- A **help popover/panel next to the QB exports** containing the 5-line import runbook ("In QuickBooks: gear → Import data → Customers / Invoices…") **and the double-count warning** ("If your bank feed already brings in dues deposits, use the Payments file as a reference — don't import it as transactions"). Treasurer turnover is the design constraint: the runbook must live in the UI, not only in `docs/`.
- Re-import guidance: import invoices once per year; the stable `WOPHA-<year>-<id>` invoice numbers make accidental re-imports detectable in QBO.

---

# Part B — Backend architecture

## B5. Assessment of the current Functions/D1 structure

**What's genuinely good — leave alone:**

- **File-based routing** (`functions/api/admin/payments.js`, `payments/[id].js`, …) maps 1:1 to REST resources; every handler is under ~40 lines and readable by a non-expert in one sitting. This is the single most maintenance-friendly property of the codebase.
- **`_lib` is right-sized:** `validate.js` centralizes every boundary check (allowlisted enums, length caps, date regex); `csv.js` is a correct minimal RFC-4180 parser/writer; `respond.js` keeps responses uniform; parameterized SQL everywhere; `households.js` uses batched upserts; `ledger-export.js` already guards CSV formula injection.
- **Auth model is appropriate:** Cloudflare Access in front of `/api/admin/*`, header read in one place (`_lib/auth.js`) with honest comments about its limits, single `_middleware.js` gate that stashes `adminEmail` in `context.data`.
- **Failure isolation:** `forms/submit.js` stores the submission before attempting the best-effort Web3Forms email — an outage can't lose resident input.
- **Backup worker:** dependency-free, hardened prune regex, weekly D1→R2, keeps 8.
- Integer cents throughout; no floating-point money. 27 tests, ESLint.

**What will strain under the redesign (new pages, QB export, resident portal later):**

1. **`DUES_CENTS` is a code constant** (`_lib/ledger.js`). Changing dues or the due date requires a deploy. The QB seam needs two more operator-editable values (`quickbooks_url`, dues due-date), and the redesign will keep finding more. This is the one real structural gap.
2. **Single admin role.** Any Access-authenticated email is a full admin. Fine for a 5-person board; a future resident portal needs a second tier. The seam exists (`context.data.adminEmail`, per-directory middleware) but should be stated as the plan so nobody bolts role checks into individual handlers.
3. **`UNIQUE(household_id, year)`** blocks installments/partials. Also the thing Stripe auto-reconciliation (addendum automation #2) is most likely to trip on (retries, duplicate webhooks).
4. **Table-list duplication:** `admin/export.js` and `workers/backup/index.js` each hardcode `TABLES`. When a table is added (as this proposal does), both must change — silent-drift risk: a forgotten entry means backups quietly omit a table.
5. **`safeCell` lives in one route file** and is about to be needed by four export formats.
6. **`DEMO_OPEN_ADMIN`** remains a standing footgun until launch checklist §7 removes it (acknowledged in `auth.js` comments; restated here because the QB exports contain the full resident PII set).
7. Non-issues at this scale, noted deliberately: no pagination (170 rows), no framework/router, no TypeScript, default 500s on unhandled exceptions. All fine; do not "fix."

## B6. Proposed architecture

**Headline: keep the shape. No framework (no Hono/itty-router), no TypeScript build step, no ORM, no route reorganization.** The Pages-Functions file router *is* the architecture, and it's the right one for a volunteer-maintained codebase. Changes are additive and small:

1. **New `settings` table** (the one schema addition):
   ```sql
   CREATE TABLE IF NOT EXISTS settings (
     key TEXT PRIMARY KEY,          -- allowlisted in validate.js
     value TEXT NOT NULL,
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
   Allowlisted keys with validators, mirroring the `validateContent` pattern: `dues_cents` (int, range-checked), `dues_due_date` (YYYY-MM-DD), `quickbooks_url` (https URL, host allowlist `*.intuit.com` optional). New handler `functions/api/admin/settings.js` (GET all / PUT one), same shape as `admin/content.js`. `_lib/ledger.js` keeps `DUES_CENTS` as the fallback default for one release; a `duesCentsFor(env)` helper reads settings first. Don't overload `site_content` — its validator is shaped for `[label,value]` display lists and public reads; settings are operator config, admin-only.
2. **QB export as a format dispatch inside `ledger-export.js`** + pure `_lib/qbo.js` (Part A4). No new route surface beyond the `format` param; the existing middleware, Access policy, and portal link pattern all apply unchanged.
3. **`safeCell` → `_lib/csv.js`**, plus a tiny `csvResponse(filename, rows)` helper (in `csv.js`, not `respond.js`) so all four formats share headers/quoting/injection-guard by construction.
4. **Backup worker: leave the duplication, add a tripwire.** Do *not* make `workers/backup` import from `functions/` — its dependency-freedom is a feature (it must survive app refactors, and it deploys as a separate Worker). Instead: add `settings` to both `TABLES` lists now, add a unit test that asserts both lists equal the tables in `schema.sql` (string-parse the `CREATE TABLE` names — cheap and effective), and leave a cross-reference comment in each file.
5. **Backup retention tweak (optional, cheap):** keep 8 weeklies *plus* retain the first backup of each month for 12 months (`wopha-backup-YYYY-MM-01…` style selection in the prune). Two months of history is thin for an annual dues cycle; a year of monthlies costs effectively $0 in R2. One small change to the prune loop.
6. **Roles: design note only, no code now.** When a resident portal happens, it gets its own directory (`functions/api/me/*`) with its own `_middleware.js` bound to a separate Access application/policy. Board stays under `/api/admin/*`. Per-directory middleware means the two tiers never share an auth path. Write this in `docs/` so the seam is the plan of record.
7. **Payments `UNIQUE` constraint: keep it for now, on purpose.** It currently *prevents* double-marking and keeps the UI simple. Revisit only when Stripe auto-reconciliation lands; at that point the migration is: drop the unique index, make `ledgerSummary` sum per household-year, and the QB payment export already iterates payment rows so it survives unchanged. Recording this here so it's a decision, not a surprise.
8. **Explicitly not doing:** JSON-export/backup consolidation into one code path (different deploy units, trivial code), pagination, framework adoption, splitting `validate.js`. Churn without payoff.

## B7. Risks & migration notes

| Risk | Mitigation |
|---|---|
| **Double-booked income** (bank feed + imported transactions) | Cash-basis workflow as the documented default; warning text lives in the export UI itself; payments file is named/labelled "reference" |
| **Duplicate invoice imports in QBO** | Deterministic `WOPHA-<year>-<household_id>` invoice numbers; runbook says "import once per year"; duplicates are visible/searchable in QBO by number |
| **PII leakage via exports** (emails, phones, addresses) | Exports stay behind Access-gated `/api/admin/*`; `DEMO_OPEN_ADMIN` must be removed before real data (checklist §7) — QB formats make this gate *more* critical, restated there; R2 backup bucket remains private |
| **CSV formula injection** into the treasurer's spreadsheet apps | `safeCell` applied to all text cells in all four formats via shared `csv.js` |
| **Backup/export table drift** when `settings` lands | Both `TABLES` lists updated in the same commit; new test asserts lists match `schema.sql` |
| **Settings migration** | Purely additive; `schema.sql` is already idempotent (`IF NOT EXISTS`); seed `dues_cents=53500` in `seed.sql`; code falls back to the constant if the row is missing, so deploy order can't break the ledger |
| **QBO product changes** (import UI moves, tier gating of invoice import) | CSV column sets are long-stable QBO end-user features, far more stable than the API surface; verify invoice import on the association's QBO tier during treasurer onboarding; worst case the customers + reference CSVs still work everywhere including a spreadsheet |
| **Treasurer turnover** | Runbook embedded in the portal UI; no OAuth connection to lapse; `quickbooks_url` editable in settings without a deploy |
| **Scope creep toward two-way sync** | Architecture makes it structurally impossible (no Intuit credentials exist anywhere); rejection rationale for API/IIF recorded in docs |

**Sequencing:** (1) `settings` table + handler + tests; (2) `safeCell`/`csvResponse` refactor into `csv.js`; (3) `_lib/qbo.js` + format dispatch in `ledger-export.js` + tests (golden-file CSVs); (4) backup `TABLES` + retention tweak + drift test; (5) UI buttons/help (sibling agent) once endpoint formats are fixed. Steps 1–4 are independent of the UI redesign and individually shippable.
