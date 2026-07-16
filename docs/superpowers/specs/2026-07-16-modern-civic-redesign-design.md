# WOPHA "Modern Civic" Redesign — Design Spec

**Date:** 2026-07-16 · **Branch:** `redesign-experiment` (local-only; branched from `master` savepoint `4c3b63a`)
**Scope:** visual + navigation redesign of the public site AND the board portal, a QuickBooks
link/export seam, and small additive backend changes. D1 remains the ledger of record.
**Full input proposals:** `2026-07-16-redesign-inputs/` (public site, portal, QuickBooks/backend —
this spec is authoritative where they differ).

## 1. Context & goals

The current site (public pages + board portal, Cloudflare Pages Functions/D1/Access) works and is
launch-ready, but its visual language leans decorative-craft (hand-drawn canopy SVG, warm cream,
two warm typefaces) and the 9-item nav reads as a list of pages rather than tasks. Goal: a clear
step up in polish toward a **credible, well-run small-institution feel** ("modern civic") while
keeping restrained neighborhood warmth — not corporate SaaS. Secondary goal: give the treasurer a
low-maintenance bridge to QuickBooks Online without compromising D1 as the source of truth.

**Locked decisions** (from product owner):
- QuickBooks = link + one-way export only. No two-way sync. D1 stays ledger of record.
- Deliverable order: spec → implementation plan (mockups may follow separately).
- Backend may be re-architected, but the verdict (§7) is: keep the shape, additive changes only.

## 2. Shared visual system

Both sites share one token set; the portal extends, never forks, the public tokens.

### Typography
- **Display (h1/h2 only):** Fraunces — kept but dialed back: weights 500–600, tighter tracking.
  Dropped from h3 down. In the portal, Fraunces appears only on page titles and KPI numbers.
- **Body & UI:** **Inter** (replaces Public Sans everywhere, portal included) — body, h3, labels,
  buttons, nav. Neutral, institutional, excellent numerals for dues/dates.
- Both are free Google Fonts; **self-host** them (drop the fonts.gstatic.com round-trip).

### Color tokens
| Token | Hex | Role |
|---|---|---|
| Pine | `#1F3D2B` | primary brand: header, footer, portal sidebar (kept) |
| Canopy | `#2E5940` | secondary green, panels (kept) |
| Fern | `#4C7A5B` | NEW mid-green: subtle fills, hover states |
| Poolwater | `#0E6E7A` | primary actions (deepened from `#17727F` for AA on light) |
| Sand | `#EDE7D6` | tint sections (replaces birch-dark) |
| Paper | `#FBFAF6` | page background (replaces birch cream; cooler) |
| Card | `#FFFFFF` | card surfaces (true white) |
| Ink | `#1E2A22` | body text (darker → AA headroom) |
| Ink-soft | `#4A543F` | secondary text (kept) |
| Clay | `#B4552D` | demoted: eyebrow accent + one highlight per page max |

Portal-only semantic status tokens (all fg/bg pairs must clear WCAG AA 4.5:1):
`--ok #2e7d4f/#e3f2e8` (paid/done) · `--warn #8a5a00/#fdf0d3` (new/pending) ·
`--info #17567f/#e2eef5` (in progress) · `--danger #a13324/#fbe7e2` (unpaid/errors).

### Layout, components, motion
- Container 68rem → **75rem**; `--container-narrow: 48rem` for prose pages. Systematic **4/8px
  spacing scale** as custom properties (`--space-1`…`--space-12`).
- **Retire the jagged canopy-polygon SVG divider.** Heroes become flat pine color blocks,
  optionally with duotone **real photography** (pool, courts, streets) — photography is the
  primary warmth vehicle. Solid color blocks where no photo exists; never clip-art.
- Cards: hairline 1px border + soft shadow + small line icon (replaces colored top-border +
  bounce hover). Buttons: radius 8px, darken on hover (no lift), 44px min target.
- Stat rows: Fraunces number + Inter uppercase micro-caps label.
- Motion: 150ms ease on hover/focus only; `prefers-reduced-motion` honored (already is).

## 3. Public site

### Navigation: 5 groups + persistent action
```
Amenities ▾    Membership    Community ▾    About ▾    [ Pay dues → ]
```
- **Amenities ▾** → Pool, Tennis, Swim Team + NEW `/amenities` overview landing.
- **Membership** — top-level, no dropdown (highest-intent page).
- **Community ▾** → Events & Calendar, Get Connected, Announcements (`/community` sections).
- **About ▾** → The Neighborhood, Board & Volunteers, Governing Documents, Contact & Report.
- **Pay dues →** — persistent primary button on every page.
- Dropdowns are keyboard-operable disclosure menus (`aria-expanded`, Esc closes) — not hover-only.
- Mobile: single-column accordion drawer.

### Page mapping (10 → 8 pages)
| Current | New home |
|---|---|
| index.html | `/` (redesigned, §3 homepage) |
| membership.html | `/membership` |
| pool.html / tennis.html / swim-team.html | `/amenities/pool` · `/amenities/tennis` · `/amenities/swim-team` |
| — | NEW `/amenities` overview |
| community.html | `/community` (Events / Connect / Announcements sections) |
| board.html | split: `/about/board` (people) + `/about/documents` (covenants, bylaws, minutes, ARC form) |
| suggestions.html | merged → `/about/contact#suggestions` |
| contact.html | `/about/contact` (absorbs suggestions + issue report) |
| thanks.html | `/thanks` (kept, unlinked) |

Old URLs survive via Cloudflare Pages `_redirects` (esp. `suggestions.html`). URL restructure
lands with the wopha.com/Cloudflare cutover (redirects don't run on GitHub Pages).

### Homepage, top to bottom
1. Pine header: wordmark + tree glyph (kept), 5-item nav, Pay-dues button.
2. Hero: flat pine block (no canopy), eyebrow, Fraunces h1, lede, primary + ghost CTA; optional
   duotone pool photo.
3. Quick actions, tiered: 3 primary (Pay dues · Reserve a court · Book a pool party) + 3
   secondary links (Report issue · ARC request · Suggestion).
4. Season-at-a-glance panel (kept concept, restyled: clean dividers, Fern/Canopy).
5. Announcements feed (dynamic, hidden when empty — unchanged functionally).
6. Condensed about: paragraph + stat row + 3 cards, deep link to `/about`.
7. PWA install: compact single-card banner (slimmed from full section).
8. Community teaser: 3 cards → `/community`, `/about/board`.
9. Pine footer, 3 columns (kept, retokened).

**Contract preserved:** every form keeps `action="/api/forms/submit"` + its `form_type` hidden
field. The fraud-awareness notice on Membership and the "never publishes resident info" notice on
Community are retained verbatim.

## 4. Board portal

**Intent:** a volunteer who logs in twice a month lands, sees what needs attention, does the one
thing they came for in under a minute, and trusts nothing broke.

### App shell
- Persistent **pine sidebar** (~230px) on desktop: wordmark, 5 destinations, inbox new-count
  badge (the only badge), "↗ Public site" link, identity block (signed-in email from Access +
  Sign out → `/cdn-cgi/access/logout`). Active item: poolwater left rail + tinted bg.
- <900px: top app bar + full-height nav drawer (no bottom tabs).

### Screens (5 destinations)
| Nav | Content |
|---|---|
| Dashboard | 3 KPI cards (dues progress bar + $collected; inbox new count; households on file) · "Needs attention" list (3 newest `new` submissions) · latest-announcement card w/ Edit + view-on-site · exactly 3 quick actions · framed "Backup & data" JSON-export card |
| Announcements | list-first; on-demand inline compose panel (not modal) with char counters and **live public-style preview**; Publish/Save + Cancel; delete via native `<dialog>` confirm; success toast w/ "View on site ↗" |
| Inbox | **master–detail split**: queue left (type, name/address, date, badge) w/ filter tabs New/In-progress/Done/All + counts; detail right: fields as `<dl>`, **linear status-stepper button** (New → "Start working on this" → "Mark done", small move-back link), **autosaving notes** (PATCH on blur, "Saved ✓" live region — no Save button), `mailto:` reply when email present. Mobile: queue → detail push |
| Dues & households | one destination, three hash-routed tabs (shareable, back-button works): **Ledger** (default) · **Households** · **Exports** — detail below |
| Site content | one card per content key; **structured label/value row editor** (+ add row, up/down reorder) replacing pipe-syntax textareas; live preview of public rendering; per-card Save + toast "live on the site now". Serializes to the same `[[label,value],…]` JSON |

**Ledger tab:** year stepper (`◀ 2026 ▶`), inline summary strip (paid count + progress bar,
$collected, $outstanding), as-you-type search, Paid/Unpaid/All segmented filter. **Mark paid = per-
row anchored popover** prefilled Amount/Method/Date from API `dues_cents` (kills the hardcoded
$535 and the global-defaults row), exposes the schema's unused payment `note` field; Confirm →
row flips + toast with Undo (DELETE). 409 surfaces inline on the row. Header has a quiet
**"Open QuickBooks ↗"** outline button, rendered only when the `quickbooks_url` setting is set.

**Households tab:** roster table w/ inline row edit (needs `PUT /api/admin/households/:id`);
import card with file picker + paste textarea, **client-side preview** ("adds 3, updates 58,
1 skipped") before POST; "+ Add household" mini form (posts a one-row CSV — zero backend change).
UI states the upsert-never-delete behavior.

**Exports tab:** card list — Ledger CSV, Unpaid CSV ("for reminder letters"), and the QuickBooks
group (§5): 3 QBO format links + a help popover with the import runbook and double-count warning.

### Portal component system
Data tables in white cards w/ sticky headers, collapsing to stacked cards on mobile
(`data-label` pattern); status badges always text + color (semantic tokens); one bottom-left
toast `role="status"` w/ optional action slot; errors inline near the failed action (page-top
banner only for fetch/auth failures, `role="alert"`, with Reload); native `<dialog>` for
destructive confirms only — never modals for data entry; skeleton rows on first load; buttons
disabled-while-saving (fixes current double-submit); `<template>`-driven row markup.

## 5. QuickBooks seam

**Recommendation adopted: CSV export only.** IIF rejected (QBO cannot import it; deprecated
Desktop format). QBO API rejected for this pass (Intuit dev account, OAuth tokens that die after
~100 days idle, compliance review, ID-mapping/dedupe — a standing liability for a volunteer
board; saves minutes/year at ~170 payments). **These rejections are recorded here so future
maintainers don't relitigate.** Nothing forecloses the API later.

**Accounting caveat (drives the design):** the treasurer's QBO bank feed already ingests
Stripe/Zelle/check deposits. Importing payment *transactions* would double-book income. Two
documented workflows, chosen by the treasurer:
- **Cash-basis (default):** bank feed books income. Portal exports (1) Customers CSV to seed
  QBO's customer list, (2) a payments **reference** CSV used to categorize/memo bank-feed
  deposits — not imported as transactions.
- **Accrual (optional):** yearly Invoices CSV via QBO's native importer for A/R visibility;
  payments matched via bank feed. Verify invoice import on the association's QBO tier first.

**Endpoint:** extend `GET /api/admin/ledger-export?year=YYYY` with `format=`:
| `format` | Output | Filename |
|---|---|---|
| absent / `board` | current board CSV (back-compat, unchanged) | `wopha-ledger-<year>[.unpaid].csv` |
| `qbo-customers` | QBO Customers import CSV (year-independent) | `wopha-qbo-customers.csv` |
| `qbo-invoices` | QBO Invoices import CSV, 1 row per household; honors `only=unpaid` | `wopha-qbo-invoices-<year>.csv` |
| `qbo-payments` | payments reference CSV (paid rows only) | `wopha-qbo-payments-<year>.csv` |

Plain GET links work with the Access cookie — no fetch/blob plumbing in the UI.

**Data mapping:** households → Customers with **address as display name** (both unique; survives
owner turnover), owner_name → Company Name, city/state/ZIP synthesized constants. Dues → derived
Service item `HOA Annual Dues <year>`. Invoice numbers **deterministic `WOPHA-<year>-<household_id>`**
so re-imports collide in QBO instead of duplicating. Known imperfect fits (documented in UI/docs):
no partial payments (D1 `UNIQUE(household_id, year)`), Stripe fee netting stays manual, refunds =
manual credit memos, sales receipts not CSV-importable.

**Linking:** board-facing "Open QuickBooks ↗" only (URL from settings). QBO per-invoice payment
links are opaque tokens the portal can't compute without API sync — **residents pay via the
planned Stripe flow, never through QBO**, or D1 stops being the ledger of record.

**Runbook lives in the UI** (help popover next to the QB exports): 5-line QBO import steps +
"import invoices once per year" + the double-count warning. Treasurer turnover is the constraint.

## 6. Backend changes (additive only)

Assessment: current code is good — file-routed handlers <40 lines, centralized validation,
parameterized SQL, integer cents, best-effort email isolation, dependency-free backup worker.
**Keep the shape: no framework, no TypeScript, no reorg.** Changes:

1. **NEW `settings` table** — `key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at` — with
   allowlisted, validated keys: `dues_cents` (int, range), `dues_due_date` (YYYY-MM-DD),
   `quickbooks_url` (https). Handler `functions/api/admin/settings.js` (GET all / PUT one),
   modeled on `content.js`. `_lib/ledger.js` gains `duesCentsFor(env)` reading settings with the
   `DUES_CENTS` constant as fallback (deploy order can't break the ledger). Do NOT overload
   `site_content`. Seed `dues_cents=53500`.
2. **`_lib/qbo.js`** — pure row-builders (`qboCustomerRows`, `qboInvoiceRows`, `qboPaymentRows`),
   unit-testable without a Workers runtime; format dispatch inside `ledger-export.js`.
3. **`safeCell` moves to `_lib/csv.js`** + new `csvResponse(filename, rows)` helper so all four
   formats share quoting/injection-guard by construction.
4. **Backup worker:** keep its deliberate independence (no imports from `functions/`). Add
   `settings` to BOTH hardcoded `TABLES` lists (worker + `admin/export.js`) and add a **drift
   test** asserting both lists match the `CREATE TABLE` names in `schema.sql`. Extend the prune
   to retain first-of-month backups for 12 months alongside the 8 weeklies (two months of history
   is thin for an annual dues cycle; a year of monthlies is effectively free in R2).
5. **Small portal-driven additions:** `adminEmail` + `collectedCents` in `summary.js`;
   `PUT /api/admin/households/:id`; `updated_at` in content GET.
6. **Design notes, no code:** future resident portal gets its own `functions/api/me/*` directory
   with its own middleware + separate Access application. Payments `UNIQUE(household_id, year)`
   stays until Stripe auto-reconciliation lands (then: drop index, sum per household-year;
   QB payment export survives unchanged).
7. **Explicitly not doing:** pagination, framework/router, export/backup code consolidation,
   splitting `validate.js`.

## 7. Build & tooling

- **Adopt Eleventy (11ty)** — the one new dependency. Header/nav/footer (public) and the portal
  shell markup become partials; output is plain static HTML on Cloudflare Pages; the board never
  sees the tooling. Kills the 10-file copy-paste nav edit.
- **`portal-shell.js`** (~150 lines) keeps shared *behavior* only: summary fetch for badge +
  identity, `api()`, `toast()`, `confirmDialog()`, `skeleton()` helpers. Markup comes from
  partials, not JS injection.
- `portal.css` grows to ~350 lines (shell, tokens, tables, badges, toasts, tabs, popover,
  dialog, skeletons, responsive collapse). No preprocessor.
- No React/Vue anywhere. The public site is content; the portal is 5 screens.

## 8. Accessibility (WCAG 2.2 AA)

Keep existing strengths (skip link, `aria-current`, `:focus-visible`, reduced-motion). New
obligations: disclosure-menu keyboard semantics for the nav dropdowns (the one real public-site
risk); add the missing skip link to portal pages; ARIA APG patterns for tabs/dialog/popover with
focus return; autosave + toasts announced via live regions; tables with `scope`/captions and
label-bearing mobile card collapse; status never color-only; ≥44px targets; verify AA for
poolwater `#0E6E7A` and all badge pairs; meaningful alt text on photography; every fetch failure
produces a visible, focusable message with a retry path.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Double-booked income in QBO | cash-basis default; warning text in the export UI itself; payments file labeled "reference" |
| Duplicate QBO invoice imports | deterministic invoice numbers; "once per year" in runbook |
| PII in exports | Access-gated `/api/admin/*`; `DEMO_OPEN_ADMIN` must be removed before real data (checklist §7) — QB formats raise the stakes |
| CSV formula injection | shared `safeCell` on all text cells in all formats |
| Backup/export table drift | both lists updated with `settings` in the same commit + schema drift test |
| Dropdown nav a11y regression | build as disclosure menus, test keyboard + SR before cutover |
| URL moves break bookmarks/QR | `_redirects` on Cloudflare Pages; restructure lands with the wopha.com cutover, not before |
| 11ty knowledge bus-factor | plain partials only, no plugins; document the 3 commands in README |

## 10. Sequencing (for the implementation plan)

Backend and frontend tracks are independent; each step is shippable.
1. **Backend seam:** settings table + handler + tests → csv/safeCell refactor → `_lib/qbo.js` +
   format dispatch + golden-file tests → backup TABLES + drift test.
2. **Tooling:** 11ty scaffold, extract partials, byte-identical output check against current pages.
3. **Public site:** tokens + typography swap → nav/IA restructure + redirects → page-by-page
   restyle → photography pass.
4. **Portal:** shell + dashboard → Dues & households (tabs, popover) → inbox split view →
   announcements compose/preview → content editor.
5. Keep the 27-test suite green throughout; extend for every backend change.

**Out of scope:** two-way QBO sync, resident portal, Stripe checkout build-out (separate,
already-planned work), any change to the D1 ledger-of-record model, dropping the payments
UNIQUE constraint.
