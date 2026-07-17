# Board Portal "Modern Civic" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the five board-portal screens as a "Modern Civic" admin app: pine sidebar app shell with identity + inbox badge, KPI dashboard with a needs-attention queue, tabbed Dues & households (ledger with mark-paid popover + undo, roster with inline edit + import preview, exports with QuickBooks entry points), master–detail inbox with autosaving notes, list-first announcements with live public preview, and a structured site-content editor with a settings card — all static HTML + fetch on the existing `/api/admin/*` handlers.

**Architecture:** Portal pages are Eleventy-built static HTML (`src/portal/*.html` → `_site/portal/*.html`). Shared chrome lives in one partial (`src/_includes/portal-shell.njk`); shared behavior lives in one plain script (`src/portal/portal-shell.js`, passthrough-copied to `_site/portal/portal-shell.js`). `src/assets/css/portal.css` layers portal tokens/components on the shared `styles.css` token set — it extends, never forks. No framework, no bundler, no schema change. D1 stays the ledger of record; Cloudflare Access stays the gate.

**Tech Stack:** Plain HTML/CSS/vanilla JS (browser scripts: `var`-style, no modules), Eleventy (from the tooling plan), Cloudflare Pages Functions + D1 (unchanged by this track), vitest (existing suite), eslint.

**Spec:** `docs/superpowers/specs/2026-07-16-modern-civic-redesign-design.md` §2 (portal status tokens), §4 (portal), §5 (QuickBooks UI entry points), §8 (a11y), §10 (sequencing). Detailed input: `docs/superpowers/specs/2026-07-16-redesign-inputs/plan-portal.md`.

**Depends on:**

1. **Eleventy tooling plan** (2026-07-16 redesign track) — provides: layout `base.njk` consuming front matter `title`/`description`/`pageKey`; partial `src/_includes/portal-shell.njk` included by all five portal pages; pages relocated to `src/portal/*.html`; `npm run build` → `_site/`; `npm run dev` serving the built site with Functions on port 8200; ALL statics relocated under `src/` (`src/assets/**`, `src/portal/*.js`, `src/sw.js`) with passthrough copy into `_site/` — built URLs unchanged (`/assets/…`, `/portal/…`).
2. **Backend seam plan** (2026-07-16 redesign track) — provides: `adminEmail` (string) + `collectedCents` (integer) in the `/api/admin/summary` response; `GET /api/admin/settings` → `{"dues_cents":"53500","dues_due_date":"","quickbooks_url":""}` (flat object, **string** values); `PUT /api/admin/settings` `{"key","value"}` → `{"ok":true}`; `dues_cents` (integer) in the `GET /api/admin/households?year=` response (already present today; the seam re-points it at the settings table); `PUT /api/admin/households/:id` `{address?,owner_name?,email?,phone?}` → `{"ok":true}`; `updated_at` in the content GET; `GET /api/admin/ledger-export?year=Y&format=board|qbo-customers|qbo-invoices|qbo-payments` (plus `only=unpaid` for `board` and `qbo-invoices`).

Do not start this plan until both are merged to `redesign-experiment`. This plan **consumes** those contracts verbatim and never renames them.

## Interface contracts consumed (exact shapes)

| Endpoint | Shape this plan codes against |
|---|---|
| `GET /api/admin/summary` | `{year, households, paid, newSubmissions, latestAnnouncement: {title, created_at} \| null, adminEmail, collectedCents}` |
| `GET /api/admin/announcements` | `{announcements: [{id, title, body, pinned_until, created_at, updated_at}]}` newest first |
| `POST /api/admin/announcements` | body `{title, body, pinned_until}` → `{id}` 201; `PUT .../:id` → `{ok:true}`; `DELETE .../:id` → `{ok:true}` |
| `GET /api/admin/submissions[?status=]` | `{submissions: [{id, form_type, fields (object), status, notes, created_at}]}` |
| `PATCH /api/admin/submissions/:id` | body `{status?}` and/or `{notes?}` → `{ok:true}` |
| `GET /api/admin/households?year=Y` | `{year, dues_cents, summary: {total, paidCount, unpaidCount, collectedCents, outstandingCents}, households: [{id, address, owner_name, email, phone, payment_id, amount_cents, method, paid_on}]}` |
| `POST /api/admin/households` | body `{csv}` → `{imported, errors: []}` (upsert by address, never deletes) |
| `PUT /api/admin/households/:id` | body `{address?, owner_name?, email?, phone?}` → `{ok:true}` |
| `POST /api/admin/payments` | body `{household_id, year, amount_cents, method, paid_on, note}` → `{id}` 201; 409 `{"error":"Already marked paid for that year"}` |
| `DELETE /api/admin/payments/:id` | `{ok:true}` |
| `GET /api/admin/settings` | flat, strings: `{"dues_cents":"53500","dues_due_date":"","quickbooks_url":""}` |
| `PUT /api/admin/settings` | body `{key, value}` (value a string) → `{ok:true}` |
| `GET /api/content` (public) | `{season_glance: [[label,value],…], pool_hours: [[label,value],…], updated_at: {season_glance: "…", pool_hours: "…"}}` — the `updated_at` sibling is the backend seam's addition; the content page reads it through one accessor (`updatedAtFor`) so a different additive shape means changing one function |
| `PUT /api/admin/content` | body `{key, value: [[label,value],…]}` → `{ok:true}` |
| `GET /api/admin/ledger-export` | `?year=Y` (board CSV), `?year=Y&only=unpaid`, `?format=qbo-customers` (year-independent), `?year=Y&format=qbo-invoices[&only=unpaid]`, `?year=Y&format=qbo-payments` — all plain `<a href>` downloads (Access cookie rides along) |
| `GET /api/admin/export` | JSON dump download (unchanged) |

**CSS tokens available from `styles.css`** (public-site plan lands them before this executes): `--pine --canopy --fern --poolwater --sand --paper --card --ink --ink-soft --clay --radius` (8px) `--container --space-1…--space-12` (4px scale: `--space-N` = N x 0.25rem), `--body` = Public Sans (decision revised 2026-07-16: Inter rejected in the frontend-design review), `--display` = Fraunces. Portal CSS may reference only these plus its own portal-scoped additions.

**Shell-partial assumption (verify in Task 2 step 1):** the tooling plan's `portal-shell.njk` holds the chrome shared by all five pages (the eyebrow, the `.portal-nav` link bar, the `#error` div, and the `<script src>` for `portal.js`), while each page body keeps its own `<h1>` and content. Task 2 rewrites the partial's contents completely, so the only thing that matters is: (a) the partial is rendered exactly once per portal page, and (b) each page body still contains its own `<h1>` afterwards. Task 2 step 1 checks both and repairs (b) with literal one-line `<h1>` insertions if the tooling extraction moved titles into the partial.

## Global Constraints

- **Local-only branches.** All work happens on `redesign-experiment` (branched from `master`). NEVER push `master` or `redesign-experiment`. NEVER let `docs/board-proposal*.md` or `docs/superpowers/` reach the `deploy` branch.
- **No frameworks.** Static HTML + `fetch`. Browser scripts stay in the house style (`var`, function declarations, `async/await` allowed as in today's `portal.js`, no modules, no `innerHTML` for user-supplied content — always `textContent`/`createElement`).
- **Schema untouched by this track.** No new tables, columns, or endpoints here — the backend seam plan owns all API changes. If a screen needs data no contract provides, record the gap and design around it; do not add backend code.
- **Vitest suite stays green:** `npm test` after every task. This track adds no `_lib` logic, so no new unit tests are expected — but the suite must never break.
- **`npm run lint` clean** after every task (warnings acceptable, errors are not; the eslint config update in Task 2 keeps the new shared globals recognized).
- **Dev ports 8200–8202 only.** This machine's Hyper-V reserves 8078-8177, 8278-8777, 8779-8978; binding a reserved port makes workerd abort. Pages dev = 8200, python static checks = 8201, backup-worker = 8202.
- **WCAG 2.2 AA** per spec §8: portal skip link, `nav aria-label` + `aria-current`, ARIA APG tabs/dialog/popover with focus return, toasts `role="status"`, autosave announced via live region, `th scope` + captions, all targets >= 44x44 CSS px, status never color-only, every fetch failure produces a visible focusable message with a retry path.
- **Never load real resident data while `DEMO_OPEN_ADMIN` is set.** All verification here uses the local D1 seed only.
- **Ship order** (spec §10): shell + dashboard → Dues & households → Inbox → Announcements → Site content. After Task 2, not-yet-rewritten pages must keep working inside the new shell — Task 1 keeps their legacy CSS classes alive until Task 8 removes them.
- Commit at the end of every task with the message given in the task. All commands run from the repo root.

## File structure

```
Created:
  src/portal/portal-shell.js            shared shell behavior + api/toast/confirmDialog/skeleton helpers

Rewritten (full replacement):
  src/assets/css/portal.css             tokens + shell + all portal components (~430 lines)
  src/_includes/portal-shell.njk        pine sidebar app shell (partial contents)
  src/portal/index.html                 dashboard
  src/portal/ledger.html                Dues & households (Ledger / Households / Exports tabs)
  src/portal/inbox.html                 master–detail inbox
  src/portal/announcements.html         list-first announcements + compose panel
  src/portal/content.html               structured content editor + portal settings card

Modified:
  eslint.config.mjs                     shared-global allowlist for portal-shell.js

Deleted (Task 8):
  src/portal/portal.js                  superseded by src/portal/portal-shell.js
```

## Shared verification procedures

**Reseed local D1** (destroys local dev data; the seed is the only data this plan ever uses):

```powershell
Remove-Item -Recurse -Force .wrangler\state -ErrorAction SilentlyContinue
npm run db:schema
npm run db:seed
```

(Both scripts exist in `package.json` today. After the backend seam plan, `schema.sql`/`seed.sql` also create and seed `settings` — same commands.)

**Dev server:** `npm run build` then `npm run dev` → `http://127.0.0.1:8200` (per the tooling contract the dev script serves the built `_site/` with Functions; if it does not watch `src/`, re-run `npm run build` after each source edit before re-checking the browser). Local auth resolves to `dev@localhost` (see `functions/api/_lib/auth.js`), so the identity block is testable locally.

**Screenshot procedure** (headless Edge on this machine renders at 1.26x device scale, so never trust `--window-size` for viewport width — pin the CSS viewport with a fixed-width iframe):

```powershell
$shots = "$env:TEMP\wopha-shots"
New-Item -ItemType Directory -Force $shots | Out-Null
# $page = portal path, e.g. "portal/" or "portal/ledger.html#households"; $w = 375 or 1280
@"
<!doctype html><meta charset="utf-8"><style>body{margin:0}iframe{border:0;display:block}</style>
<iframe src="http://127.0.0.1:8200/$page" width="$w" height="2400"></iframe>
"@ | Set-Content "$shots\frame.html"
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu `
  --force-device-scale-factor=1 --window-size=$($w + 40),2500 `
  --screenshot="$shots\shot-$w.png" "file:///$(($shots -replace '\\','/'))/frame.html"
```

Then Read the PNG and check the stated expectations. "Screenshot X at 375/1280" in verify steps below means: run this with `$page` = X and `$w` = 375, then `$w` = 1280.

---

### Task 1: Portal tokens & component CSS

**Files:**
- Rewrite: `src/assets/css/portal.css` (full replacement)

**Interfaces:**
- Produces: portal status tokens (`--ok/--warn/--info/--danger` + `-bg` pairs), app-shell layout classes (`.portal-sidebar`, `.portal-topbar`, body offsets), and every component class used by Tasks 2–7 (`.portal-card`, `.kpi`, `.portal-table` + mobile collapse, `.badge--*` recolor, `.portal-toast`, `.portal-tabs`, `.portal-popover`, `.portal-dialog`, `.skeleton-row`, `.segmented`, `.stepper`, `.inbox-split`, `.portal-dl`, `.row-editor`, `.btn--danger`, `.btn--sm`, `.visually-hidden`).
- Consumes: `styles.css` tokens (`--pine --canopy --fern --poolwater --sand --paper --card --ink --ink-soft --clay --radius --space-* --body --display`).
- Keeps alive until Task 8: legacy classes still referenced by not-yet-rewritten page bodies (`.portal-nav`, `.portal-actions`, `.portal-error:empty`).

- [ ] **Step 1: Replace `src/assets/css/portal.css` with the complete file below**

```css
/* ==========================================================================
   Board portal — "Modern Civic" app shell + admin components.
   Layers on styles.css; extends the shared token set, never forks it.
   Status tokens are portal-only; every fg/bg pair clears WCAG AA 4.5:1.
   ========================================================================== */

:root {
  --portal-nav-w: 230px;
  --portal-topbar-h: 56px;
  --poolwater-deep: #0a5560;            /* hover shade for --poolwater */
  --hairline: rgba(30, 42, 34, 0.16);   /* 1px card & table borders */
  --ok: #2e7d4f;      --ok-bg: #e3f2e8;     /* paid / done */
  --warn: #8a5a00;    --warn-bg: #fdf0d3;   /* new / pending */
  --info: #17567f;    --info-bg: #e2eef5;   /* in progress */
  --danger: #a13324;  --danger-bg: #fbe7e2; /* unpaid / errors */
}

/* ---- App shell ---------------------------------------------------------- */

body { background: var(--paper); }
@media (min-width: 900px) { body { padding-left: var(--portal-nav-w); } }

.portal-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--portal-nav-w);
  background: var(--pine);
  color: #fff;
  display: flex;
  flex-direction: column;
  z-index: 60;
  overflow-y: auto;
}

.portal-brand {
  display: flex;
  flex-direction: column;
  padding: var(--space-5) var(--space-4) var(--space-4);
}
.portal-brand strong { font-family: var(--display); font-weight: 600; font-size: 1.15rem; line-height: 1.2; }
.portal-brand span {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
}

.portal-sidenav { display: flex; flex-direction: column; gap: 2px; padding: 0 var(--space-2) var(--space-4) 0; }
.portal-sidenav a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 44px;
  padding: 0.55rem var(--space-3) 0.55rem var(--space-4);
  border-left: 4px solid transparent;
  border-radius: 0 6px 6px 0;
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
  text-decoration: none;
}
.portal-sidenav a:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.portal-sidenav a[aria-current="page"] {
  border-left-color: var(--poolwater);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.nav-count {
  background: #fff;
  color: var(--pine);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.05rem 0.5rem;
}

.portal-side-foot {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 0.9rem;
}
.portal-side-foot a { color: rgba(255, 255, 255, 0.88); font-weight: 600; min-height: 44px; display: inline-flex; align-items: center; }
.portal-side-foot a:hover { color: #fff; }
.portal-identity {
  color: rgba(255, 255, 255, 0.75);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.portal-topbar { display: none; }
.portal-menu-toggle {
  min-width: 44px;
  min-height: 44px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  color: #fff;
  font: 700 0.9rem var(--body);
  cursor: pointer;
}
.portal-scrim { position: fixed; inset: var(--portal-topbar-h) 0 0 0; background: rgba(0, 0, 0, 0.45); z-index: 55; }

@media (max-width: 899.98px) {
  body { padding-top: var(--portal-topbar-h); }
  .portal-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: fixed;
    top: 0; left: 0; right: 0;
    height: var(--portal-topbar-h);
    padding-inline: var(--space-4);
    background: var(--pine);
    color: #fff;
    z-index: 70;
  }
  .portal-topbar-brand { font-family: var(--display); font-weight: 600; }
  .portal-topbar-brand span { font-family: var(--body); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.75); margin-left: 0.4rem; }
  .portal-sidebar {
    top: var(--portal-topbar-h);
    width: min(320px, 85vw);
    transform: translateX(-100%);
    transition: transform 0.15s ease;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.35);
  }
  .portal-sidebar.open { transform: none; }
}

/* ---- Page scaffolding ---------------------------------------------------- */

.portal-page-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-5);
}
.portal-page-head h1 { margin: 0; }
.portal-section { margin-block: var(--space-6); }

.portal-error {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  margin: var(--space-4) 0;
  font-weight: 600;
}

/* ---- Cards, grids, KPIs -------------------------------------------------- */

.portal-grid { display: grid; gap: var(--space-4); margin-block: var(--space-4); }
@media (min-width: 720px) { .portal-grid--2 { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .portal-grid--3 { grid-template-columns: repeat(3, 1fr); } }

.portal-card {
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  box-shadow: 0 1px 3px rgba(31, 61, 43, 0.08);
  padding: var(--space-5);
}
.portal-card h2, .portal-card h3 { margin-top: 0; }
.portal-card > :last-child { margin-bottom: 0; }

.kpi { display: block; }
a.kpi { text-decoration: none; color: inherit; }
a.kpi:hover { border-color: var(--fern); }
.kpi-label {
  display: block;
  font: 700 0.75rem var(--body);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}
.kpi-number {
  display: block;
  font-family: var(--display);
  font-weight: 600;
  font-size: 2rem;
  line-height: 1.15;
  color: var(--pine);
  margin: var(--space-1) 0;
}
.kpi-number.is-alert { color: var(--clay); }
.kpi-sub { display: block; font-size: 0.9rem; color: var(--ink-soft); }

.progress {
  display: block;
  height: 5px;
  border-radius: 999px;
  background: var(--sand);
  overflow: hidden;
  margin: var(--space-2) 0;
}
.progress > span { display: block; height: 100%; background: var(--poolwater); }

/* ---- Data tables ---------------------------------------------------------- */

.table-card {
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  box-shadow: 0 1px 3px rgba(31, 61, 43, 0.08);
  margin-block: var(--space-4);
}
.portal-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.95rem; background: transparent; }
.portal-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--sand);
  font: 700 0.75rem var(--body);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--hairline);
}
@media (max-width: 899.98px) { .portal-table th { top: var(--portal-topbar-h); } }
.portal-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--hairline); vertical-align: top; }
.portal-table tbody tr:last-child td { border-bottom: none; }
.portal-table tbody tr:hover { background: rgba(76, 122, 91, 0.08); }
.portal-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.portal-table caption { text-align: left; padding: 0.6rem 0.75rem; font-weight: 700; }

@media (max-width: 719.98px) {
  .portal-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .portal-table, .portal-table tbody, .portal-table tr, .portal-table td, .portal-table caption { display: block; }
  .portal-table tr {
    border: 1px solid var(--hairline);
    border-radius: var(--radius);
    background: var(--card);
    margin: var(--space-3);
    padding: var(--space-2) 0;
  }
  .portal-table td { border: none; padding: 0.35rem var(--space-4); display: flex; justify-content: space-between; gap: var(--space-4); }
  .portal-table td[data-label]::before {
    content: attr(data-label);
    font: 700 0.75rem var(--body);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ink-soft);
    padding-top: 0.2rem;
  }
  .table-card { border: none; box-shadow: none; background: transparent; }
  .portal-table tbody tr:hover { background: var(--card); }
}

/* ---- Badges (text + color, never color alone) ----------------------------- */

.badge {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}
.badge--new { background: var(--warn-bg); color: var(--warn); }
.badge--in_progress { background: var(--info-bg); color: var(--info); }
.badge--done, .badge--paid { background: var(--ok-bg); color: var(--ok); }
.badge--unpaid { background: var(--danger-bg); color: var(--danger); }

.chip {
  display: inline-block;
  background: var(--sand);
  color: var(--ink);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.1rem 0.6rem;
  white-space: nowrap;
}

/* ---- Buttons (extends styles.css .btn) ------------------------------------ */

.btn--danger { background: var(--danger); color: #fff; border-color: transparent; }
.btn--danger:hover { background: #7f2318; color: #fff; }
.btn--sm { padding: 0.4rem 0.9rem; font-size: 0.875rem; min-height: 44px; }

/* ---- Toast ----------------------------------------------------------------- */

.portal-toast {
  position: fixed;
  left: var(--space-4);
  bottom: var(--space-4);
  z-index: 90;
  display: flex;
  align-items: center;
  gap: var(--space-4);
  max-width: min(90vw, 26rem);
  background: var(--pine);
  color: #fff;
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  padding: 0.75rem 1rem;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.portal-toast.show { opacity: 1; transform: none; pointer-events: auto; }
.portal-toast button {
  background: none;
  border: none;
  color: #f0c98f;
  font: 700 1rem var(--body);
  text-decoration: underline;
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
}

/* ---- Tabs (ARIA tablist, underline style) ---------------------------------- */

.portal-tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--hairline);
  margin-bottom: var(--space-5);
  overflow-x: auto;
}
.portal-tabs [role="tab"] {
  appearance: none;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 0.6rem 0.9rem;
  min-height: 44px;
  font: 600 1rem var(--body);
  color: var(--ink-soft);
  cursor: pointer;
  white-space: nowrap;
}
.portal-tabs [role="tab"]:hover { color: var(--ink); }
.portal-tabs [role="tab"][aria-selected="true"] {
  color: var(--pine);
  font-weight: 700;
  border-bottom-color: var(--poolwater);
}
.tab-count { color: var(--ink-soft); font-weight: 600; }

/* ---- Popover (anchored mini-form) ------------------------------------------ */

.popover-host { position: relative; }
.portal-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 40;
  width: min(20rem, calc(100vw - 2rem));
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  box-shadow: 0 6px 24px rgba(31, 61, 43, 0.22);
  padding: var(--space-4);
  text-align: left;
}
.portal-popover .form-row { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
.portal-popover label { font-size: 0.8rem; font-weight: 700; color: var(--ink-soft); }
.portal-popover input, .portal-popover select {
  min-height: 44px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  font: inherit;
  width: 100%;
}
.popover-actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); }

/* ---- Dialog (destructive confirms only) ------------------------------------ */

.portal-dialog {
  border: none;
  border-radius: var(--radius);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
  padding: var(--space-5);
  max-width: 26rem;
  width: calc(100vw - 2rem);
}
.portal-dialog::backdrop { background: rgba(30, 42, 34, 0.5); }
.portal-dialog p { margin: 0 0 var(--space-4); }
.portal-dialog form { display: flex; gap: var(--space-2); justify-content: flex-end; margin: 0; }

/* ---- Skeletons -------------------------------------------------------------- */

.skeleton-row {
  height: 1.1rem;
  border-radius: 6px;
  margin: 0.7rem 0;
  background: linear-gradient(90deg, var(--sand) 25%, #f6f2e6 37%, var(--sand) 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.2s ease infinite;
}
@keyframes skeleton-shimmer {
  from { background-position: 100% 0; }
  to { background-position: 0 0; }
}

/* ---- Controls: segmented filter, stepper, toolbar, search ------------------- */

.portal-toolbar { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; margin-block: var(--space-4); }
.portal-toolbar input[type="search"] {
  min-height: 44px;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  font: inherit;
  flex: 1 1 14rem;
  max-width: 22rem;
  background: var(--card);
}

.segmented { display: inline-flex; border: 1px solid var(--hairline); border-radius: var(--radius); overflow: hidden; padding: 0; margin: 0; }
.segmented legend { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.segmented label { position: relative; }
.segmented input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.segmented span {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 0.9rem;
  font-weight: 600;
  color: var(--ink-soft);
  background: var(--card);
  border-right: 1px solid var(--hairline);
}
.segmented label:last-child span { border-right: none; }
.segmented input:checked + span { background: var(--poolwater); color: #fff; }
.segmented input:focus-visible + span { outline: 3px solid var(--poolwater); outline-offset: -3px; }

.stepper { display: inline-flex; align-items: center; gap: var(--space-1); }
.stepper button {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--card);
  font-size: 1rem;
  cursor: pointer;
}
.stepper button:hover { background: var(--sand); }
.stepper output { font: 700 1.15rem var(--body); min-width: 4ch; text-align: center; }

.summary-strip { display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-6); align-items: end; margin-block: var(--space-4); }
.summary-strip .sum-item { min-width: 9rem; }
.summary-strip strong { font-family: var(--display); font-weight: 600; font-size: 1.35rem; color: var(--pine); display: block; }
.summary-strip span { font-size: 0.85rem; color: var(--ink-soft); }

/* ---- Inbox split view --------------------------------------------------------- */

.inbox-split { display: grid; gap: var(--space-4); align-items: start; }
@media (min-width: 900px) { .inbox-split { grid-template-columns: 360px 1fr; } }

.inbox-queue { list-style: none; margin: 0; padding: 0; }
.queue-item {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  padding: 0.6rem 0.75rem;
  margin-bottom: var(--space-2);
  font: inherit;
  cursor: pointer;
  min-height: 44px;
}
.queue-item:hover { border-color: var(--fern); }
.queue-item[aria-current="true"] { border-color: var(--poolwater); box-shadow: inset 3px 0 0 var(--poolwater); }
.qi-top { display: flex; justify-content: space-between; gap: var(--space-2); font-weight: 700; }
.qi-date { font-weight: 400; color: var(--ink-soft); font-size: 0.85rem; white-space: nowrap; }
.qi-sub { display: flex; justify-content: space-between; gap: var(--space-2); color: var(--ink-soft); font-size: 0.875rem; margin-top: 0.15rem; align-items: center; }

.detail-back { display: none; }
@media (max-width: 899.98px) {
  .inbox-detail { display: none; }
  .inbox-split.show-detail .inbox-queue-col { display: none; }
  .inbox-split.show-detail .inbox-detail { display: block; }
  .detail-back { display: inline-flex; margin-bottom: var(--space-3); }
}

.portal-dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.4rem var(--space-5); margin: 0 0 var(--space-4); }
.portal-dl dt {
  font: 700 0.75rem var(--body);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ink-soft);
  padding-top: 0.15rem;
  overflow-wrap: anywhere;
}
.portal-dl dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
@media (max-width: 479.98px) { .portal-dl { grid-template-columns: 1fr; gap: 0 } .portal-dl dd { margin-bottom: 0.5rem; } }

/* ---- Forms: helpers, counters, inline messages -------------------------------- */

.field-help { font-size: 0.875rem; color: var(--ink-soft); margin: 0.15rem 0 0; }
.char-count { display: block; font-size: 0.8rem; color: var(--ink-soft); text-align: right; }
.char-count.is-warn { color: var(--warn); font-weight: 700; }
.field-error, .row-error { color: var(--danger); font-weight: 600; font-size: 0.9rem; }
.saved-note { color: var(--ok); font-weight: 600; font-size: 0.9rem; }
.result-banner {
  background: var(--ok-bg);
  color: var(--ok);
  border-radius: var(--radius);
  padding: 0.6rem 0.9rem;
  font-weight: 600;
  margin-block: var(--space-3);
}
.result-banner:empty { display: none; }

/* ---- Misc lists ------------------------------------------------------------------ */

.attention-list { list-style: none; margin: 0; padding: 0; }
.attention-list li {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  align-items: center;
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  padding: 0.6rem 0.9rem;
  margin-bottom: var(--space-2);
}
.attention-list li strong { min-width: 12rem; }
.attention-list li .extract { flex: 1 1 14rem; }
.attention-list li a { margin-left: auto; }

.quick-actions { list-style: none; margin: 0; padding: 0; }
.quick-actions a {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-weight: 700;
  text-decoration: none;
  border-bottom: 1px solid var(--hairline);
}
.quick-actions li:last-child a { border-bottom: none; }
.quick-actions a:hover { color: var(--poolwater-deep); }

.ann-row {
  display: grid;
  grid-template-columns: 6.5rem 1fr auto;
  gap: var(--space-2) var(--space-4);
  align-items: start;
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-2);
}
.ann-row .ann-date { color: var(--ink-soft); font-size: 0.9rem; padding-top: 0.15rem; }
.ann-row .ann-excerpt { color: var(--ink-soft); font-size: 0.9rem; margin: 0.15rem 0 0; }
.ann-row .ann-actions { display: flex; gap: var(--space-2); }
@media (max-width: 639.98px) { .ann-row { grid-template-columns: 1fr; } }

.empty-state { text-align: center; color: var(--ink-soft); padding: var(--space-8) var(--space-4); }

.export-card p:first-of-type { margin-top: 0; }

/* ---- Row editor (site content) ------------------------------------------------ */

.row-editor { display: flex; flex-direction: column; gap: var(--space-2); margin-block: var(--space-3); }
.re-row { display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: var(--space-2); align-items: center; }
.re-row input {
  min-height: 44px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  font: inherit;
  width: 100%;
}
.icon-btn {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--hairline);
  border-radius: 6px;
  background: var(--card);
  font-size: 1rem;
  cursor: pointer;
}
.icon-btn:hover { background: var(--sand); }
@media (max-width: 639.98px) { .re-row { grid-template-columns: 1fr 1fr auto; } .re-row .icon-btn--up, .re-row .icon-btn--down { display: none; } }

.content-preview { border: 1px dashed var(--hairline); border-radius: var(--radius); padding: var(--space-4); margin-block: var(--space-3); background: var(--paper); }

/* ---- Utility -------------------------------------------------------------------- */

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

/* ==========================================================================
   LEGACY (pre-redesign page bodies) — DELETE THIS WHOLE BLOCK IN TASK 8.
   Keeps not-yet-rewritten pages usable while the shell ships first.
   ========================================================================== */
.portal-nav { display: flex; gap: 1rem 1.5rem; flex-wrap: wrap; margin: 1rem 0 2rem; }
.portal-nav a { font-weight: 600; }
.portal-error:empty { display: none; }
.portal-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: end; margin: 1rem 0; }
.portal-actions > div { display: flex; flex-direction: column; gap: 0.25rem; }
```

Note on mobile up/down buttons in `.re-row`: they are hidden below 640px to keep rows on one line; reordering stays available at desktop widths where content editing actually happens, and rows can still be removed/re-added on mobile. This is a deliberate scope call, not an omission.

- [ ] **Step 2: Verify old pages still render**

Run `npm run build`, start `npm run dev`, open `http://127.0.0.1:8200/portal/` and `http://127.0.0.1:8200/portal/ledger.html`. Expected: pages render with the old inline nav (legacy block), tables show the new badge colors (amber "new", green "paid", red-on-pink "unpaid" — text visible in every badge), no layout breakage. The sidebar does not exist yet (that is Task 2).

- [ ] **Step 3: Quality gates**

Run `npm test` (all pass) and `npm run lint` (no errors).

- [ ] **Step 4: Commit**

`git commit -am "Portal redesign: token layer + component CSS (shell, tables, badges, toast, tabs, popover, dialog, skeletons)"`

---

### Task 2: App shell — sidebar partial + shared behavior layer

**Files:**
- Rewrite: `src/_includes/portal-shell.njk` (full replacement of the partial's contents)
- Create: `src/portal/portal-shell.js`
- Modify: `eslint.config.mjs`
- Possibly modify (transition repair only): `src/portal/*.html` (remove stray `portal.js` script tags / re-add `<h1>`s — see steps 1 and 4)

**Interfaces:**
- Produces: the shell markup on every portal page (skip link, top app bar <900px, pine sidebar with 5 nav items + `aria-current` + inbox badge + public-site link + identity + sign-out, `#error` banner); global helpers `api()`, `portalSummary()`, `el()`, `dollars()`, `showError()`, `clearError()`, `toast()`, `confirmDialog()`, `skeleton()`, `initTabs()`, `TYPE_LABELS` — every later task consumes these.
- Consumes: `pageKey` front matter values `dashboard | announcements | inbox | ledger | content` (each page rewrite in Tasks 3–7 sets its own; step 4 aligns any that differ today); `GET /api/admin/summary` with `adminEmail`; `/cdn-cgi/access/logout`.
- Back-compat: `api`/`showError`/`clearError` keep their existing signatures so the four not-yet-rewritten page bodies keep working unmodified.

- [ ] **Step 1: Reconnaissance (no code yet)**

Read `src/_includes/portal-shell.njk` and all five `src/portal/*.html` as the tooling plan left them. Record: (a) whether the `<script src=...portal.js>` tag lives in the partial or in each page body; (b) whether each page body still contains its own `<h1>`; (c) the exact `pageKey` values in use. These determine the small repairs in step 4.

- [ ] **Step 2: Replace the contents of `src/_includes/portal-shell.njk` with:**

```njk
{# Board portal app shell. Behavior in /portal/portal-shell.js (loaded at the
   end so the sidebar markup above it is already parsed). Pages set
   pageKey: dashboard | announcements | inbox | ledger | content. #}
<a class="skip-link" href="#portal-main">Skip to main content</a>
<header class="portal-topbar">
  <span class="portal-topbar-brand">Woods of Parkview <span>Board portal</span></span>
  <button class="portal-menu-toggle" type="button" aria-expanded="false" aria-controls="portal-sidebar">Menu</button>
</header>
<div class="portal-scrim" hidden></div>
<aside class="portal-sidebar" id="portal-sidebar">
  <div class="portal-brand">
    <strong>Woods of Parkview</strong>
    <span>Board portal</span>
  </div>
  <nav class="portal-sidenav" aria-label="Portal">
    <a href="/portal/"{% if pageKey == "dashboard" %} aria-current="page"{% endif %}>Dashboard</a>
    <a href="/portal/announcements.html"{% if pageKey == "announcements" %} aria-current="page"{% endif %}>Announcements</a>
    <a href="/portal/inbox.html"{% if pageKey == "inbox" %} aria-current="page"{% endif %}>Inbox <span class="nav-count" id="nav-inbox-count" hidden>0</span></a>
    <a href="/portal/ledger.html"{% if pageKey == "ledger" %} aria-current="page"{% endif %}>Dues &amp; households</a>
    <a href="/portal/content.html"{% if pageKey == "content" %} aria-current="page"{% endif %}>Site content</a>
  </nav>
  <div class="portal-side-foot">
    <a href="/">&#8599; Public site</a>
    <span class="portal-identity" id="portal-identity"></span>
    <a href="/cdn-cgi/access/logout">Sign out</a>
  </div>
</aside>
<div id="error" class="portal-error" role="alert" tabindex="-1" hidden>
  <span id="error-message"></span>
  <button type="button" class="btn btn--sm" id="error-reload">Reload</button>
</div>
<script src="/portal/portal-shell.js"></script>
```

- [ ] **Step 3: Create `src/portal/portal-shell.js`** (served at `/portal/portal-shell.js` via the tooling plan's passthrough):

```js
// Shared board-portal layer: app-shell behavior + fetch/feedback helpers.
// Loaded synchronously by src/_includes/portal-shell.njk on every portal
// page, before any page script runs. Pages use:
//   api(), portalSummary(), el(), dollars(), TYPE_LABELS,
//   showError(), clearError(), toast(), confirmDialog(), skeleton(), initTabs()

/* ---- fetch --------------------------------------------------------------- */

async function api(path, options) {
  var opts = options || {};
  if (opts.body && typeof opts.body !== "string") {
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    opts.body = JSON.stringify(opts.body);
  }
  var res = await fetch(path, opts);
  var data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON (e.g. Access login page) */ }
  if (res.ok && data === null) {
    throw new Error("Your sign-in session expired — reload the page and sign in again.");
  }
  if (!res.ok) {
    var err = new Error((data && data.error) || "Request failed (" + res.status + "). Are you signed in?");
    err.status = res.status;
    throw err;
  }
  return data;
}

var _summaryPromise = null;
function portalSummary() {
  if (!_summaryPromise) _summaryPromise = api("/api/admin/summary");
  return _summaryPromise;
}

/* ---- small DOM/format helpers -------------------------------------------- */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function dollars(cents) {
  return "$" + (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

var TYPE_LABELS = {
  contact_update: "Contact update",
  issue_report: "Issue report",
  suggestion: "Suggestion",
  arc_request: "Exterior change request",
};

/* ---- page-top banner: fetch/auth failures only ---------------------------- */

function showError(err) {
  var box = document.getElementById("error");
  var msg = document.getElementById("error-message");
  if (!box || !msg) return;
  msg.textContent = err && err.message ? err.message : String(err);
  box.hidden = false;
  box.focus();
}

function clearError() {
  var box = document.getElementById("error");
  if (box) box.hidden = true;
}

/* ---- toast: one, bottom-left, role=status, 5 s, optional action ------------ */

var _toastTimer = null;
function toast(message, opts) {
  opts = opts || {};
  var host = document.getElementById("portal-toast");
  if (!host) {
    host = el("div", "portal-toast");
    host.id = "portal-toast";
    host.setAttribute("role", "status");
    document.body.appendChild(host);
  }
  function dismiss() {
    host.classList.remove("show");
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
  }
  host.textContent = "";
  host.appendChild(el("span", null, message));
  if (opts.actionLabel && opts.onAction) {
    var btn = el("button", null, opts.actionLabel);
    btn.type = "button";
    btn.addEventListener("click", function () {
      dismiss();
      opts.onAction();
    });
    host.appendChild(btn);
  }
  host.classList.add("show");
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(dismiss, 5000);
}

/* ---- confirm dialog: native <dialog>, destructive confirms only ------------ */
/* Native showModal() traps focus, closes on Esc, and returns focus to the
   trigger on close — the APG dialog obligations come free. */

function confirmDialog(message) {
  return new Promise(function (resolve) {
    var dlg = document.getElementById("portal-confirm");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "portal-confirm";
      dlg.className = "portal-dialog";
      dlg.appendChild(el("p"));
      var form = document.createElement("form");
      form.method = "dialog";
      var cancel = el("button", "btn", "Cancel");
      cancel.value = "cancel";
      var ok = el("button", "btn btn--danger", "Delete");
      ok.value = "confirm";
      form.appendChild(cancel);
      form.appendChild(ok);
      dlg.appendChild(form);
      document.body.appendChild(dlg);
    }
    dlg.querySelector("p").textContent = message;
    dlg.addEventListener("close", function onClose() {
      dlg.removeEventListener("close", onClose);
      resolve(dlg.returnValue === "confirm");
    });
    dlg.showModal();
  });
}

/* ---- skeleton rows ---------------------------------------------------------- */

function skeleton(rows) {
  var frag = document.createDocumentFragment();
  for (var i = 0; i < (rows || 3); i++) frag.appendChild(el("div", "skeleton-row"));
  return frag;
}

/* ---- ARIA tabs (APG pattern) with hash routing ------------------------------- */
/* Markup contract: buttons with role="tab", data-hash="<fragment>", and
   aria-controls="<panel id>" inside a role="tablist" element. Multiple tabs
   may share one panel (inbox filters). The FIRST tab is the default when the
   URL has no matching hash. Back/forward work because selection follows
   hashchange. */

function initTabs(tablist, onChange) {
  var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
  var panelIds = [];
  tabs.forEach(function (t) {
    var id = t.getAttribute("aria-controls");
    if (id && panelIds.indexOf(id) === -1) panelIds.push(id);
  });

  function select(tab, setHash) {
    tabs.forEach(function (t) {
      var active = t === tab;
      t.setAttribute("aria-selected", active ? "true" : "false");
      t.tabIndex = active ? 0 : -1;
    });
    panelIds.forEach(function (id) {
      var panel = document.getElementById(id);
      if (panel) panel.hidden = id !== tab.getAttribute("aria-controls");
    });
    if (setHash) {
      var hash = tab.getAttribute("data-hash") || "";
      if (location.hash.replace("#", "") !== hash) location.hash = hash;
    }
    if (onChange) onChange(tab);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { select(tab, true); });
    tab.addEventListener("keydown", function (e) {
      var j = null;
      if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = tabs.length - 1;
      if (j !== null) {
        e.preventDefault();
        tabs[j].focus();
        select(tabs[j], true);
      }
    });
  });

  function fromHash() {
    var hash = location.hash.replace("#", "");
    var match = null;
    tabs.forEach(function (t) { if (t.getAttribute("data-hash") === hash) match = t; });
    select(match || tabs[0], false);
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
  return { refresh: fromHash };
}

/* ---- app shell behavior ------------------------------------------------------- */

(function () {
  var toggle = document.querySelector(".portal-menu-toggle");
  var sidebar = document.getElementById("portal-sidebar");
  var scrim = document.querySelector(".portal-scrim");

  if (toggle && sidebar) {
    var setOpen = function (open) {
      sidebar.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (scrim) scrim.hidden = !open;
      if (open) {
        var first = sidebar.querySelector("a");
        if (first) first.focus();
      } else {
        toggle.focus();
      }
    };
    toggle.addEventListener("click", function () {
      setOpen(!sidebar.classList.contains("open"));
    });
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("open")) setOpen(false);
    });
  }

  var reload = document.getElementById("error-reload");
  if (reload) reload.addEventListener("click", function () { location.reload(); });

  portalSummary().then(function (s) {
    var count = document.getElementById("nav-inbox-count");
    if (count) {
      count.textContent = String(s.newSubmissions);
      count.hidden = s.newSubmissions === 0;
    }
    var who = document.getElementById("portal-identity");
    if (who && s.adminEmail) {
      who.textContent = s.adminEmail;
      who.title = s.adminEmail;
    }
  }).catch(showError);
})();
```

- [ ] **Step 4: Transition repairs (from step 1 recon)**

  - If any `src/portal/*.html` body still contains its own `<script src="portal.js"></script>` (or `<script src="/portal/portal.js"></script>`) line, delete that line — `portal-shell.js` now provides `api`/`showError`/`clearError` with identical signatures, so old inline page scripts run unchanged.
  - If any page body lost its `<h1>` to the old partial, insert the literal heading as the first line after the shell include / at the top of the page content: `<h1>Dashboard</h1>`, `<h1>Announcements</h1>`, `<h1>Inbox</h1>`, `<h1>Dues ledger</h1>`, `<h1>Site content</h1>` respectively.
  - If any page's front matter `pageKey` is not one of `dashboard | announcements | inbox | ledger | content`, change it to the matching value (the partial's `aria-current` conditionals depend on these exact strings).
  - Confirm the tooling plan's passthrough copies `src/portal/*.js` to `_site/portal/` (it must, since `portal.js` ships that way). If the passthrough is directory- or glob-based, the new `src/portal/portal-shell.js` lands in `_site/portal/` automatically on the next build; if it names files individually, add an entry for `src/portal/portal-shell.js`.

- [ ] **Step 5: Extend the tooling plan's `eslint.config.mjs`**

The tooling plan already rewrote this file for the `src/` layout (browser block on `src/assets/js/*.js` + `src/portal/*.js` + `src/sw.js`, the functions/workers/tests module block, a third module block for the Eleventy config files, `_site/**` ignored). Replace it with the version below, which is that config plus exactly two additions for `portal-shell.js`: the extra browser globals (`clearTimeout`, `localStorage`, `location`, `history`, `FileReader`) and the expanded `varsIgnorePattern` naming the new shared helpers. If the config on disk has picked up other details since (extra globals, rules), merge these two additions into it rather than dropping those — the two additions are the requirement.

```js
export default [
  { ignores: ["node_modules/**", "**/.wrangler/**", "docs/**", "_site/**"] },
  {
    files: ["src/assets/js/*.js", "src/portal/*.js", "src/sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly", window: "readonly", fetch: "readonly",
        navigator: "readonly", caches: "readonly", self: "readonly",
        URL: "readonly", confirm: "readonly", setTimeout: "readonly",
        clearTimeout: "readonly", localStorage: "readonly",
        location: "readonly", history: "readonly", FileReader: "readonly",
        Promise: "readonly", Object: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", {
        args: "none",
        caughtErrors: "none",
        varsIgnorePattern: "^(api|showError|clearError|portalSummary|el|dollars|TYPE_LABELS|toast|confirmDialog|skeleton|initTabs)$",
      }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
  {
    files: ["functions/**/*.js", "workers/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Response: "readonly", fetch: "readonly", URL: "readonly",
        Request: "readonly", console: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
  {
    files: ["eleventy.config.js", "src/*.11tydata.js", "tools/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly", process: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
];
```

- [ ] **Step 6: Verify the shell on every page (old bodies, new chrome)**

`npm run build`, `npm run dev`, then:

  - `http://127.0.0.1:8200/portal/` — pine sidebar at left (>=900px viewport): wordmark "Woods of Parkview / Board portal", five items, Dashboard has the poolwater left rail + tinted background, Inbox shows a white "2" badge (seed has 2 new submissions), "↗ Public site" link, identity shows `dev@localhost`, Sign out link present. Old dashboard stats still render in the content area.
  - Each of `announcements.html`, `inbox.html`, `ledger.html`, `content.html` — sidebar present, correct item highlighted, old page content works: publish an announcement (appears in table), change a submission status, mark household 3 paid then Undo, save pool hours. All succeed with no console errors.
  - Keyboard: Tab from the address bar — first stop is "Skip to main content" (visible on focus); on the rewritten pages of later tasks it must jump to `#portal-main` (old pages lack the id — acceptable until each is rewritten).
  - Narrow the window below 900px: top app bar appears with a Menu button; Menu opens the drawer (focus lands on Dashboard link), Esc closes it and returns focus to the Menu button; scrim click also closes.
  - Screenshot `portal/` at 375 and 1280 — at 375 the top bar + drawer-closed layout; at 1280 the fixed sidebar. No horizontal page scroll at 375.

- [ ] **Step 7: Quality gates**

`npm test` green; `npm run lint` no errors.

- [ ] **Step 8: Commit**

`git commit -am "Portal redesign: pine sidebar app shell + portal-shell.js shared layer"`

---

### Task 3: Dashboard

**Files:**
- Rewrite: `src/portal/index.html` (full replacement)

**Interfaces:**
- Consumes: `portalSummary()` (one shared summary request per page load — the shell badge and the KPIs ride the same fetch), `GET /api/admin/submissions?status=new` (client-side slice to 3), `GET /api/admin/export`, helpers from Task 2.
- Produces: deep links other screens must honor: `announcements.html#new`, `announcements.html#edit-latest` (Task 6), `ledger.html#households` (Task 4).

- [ ] **Step 1: Replace `src/portal/index.html` with:**

(Keep the front matter delimiters and the shell include exactly as the tooling plan wires them — if the shell is included by the layout rather than an in-body include line, drop the include line below; the shell must render exactly once.)

```html
---
title: Dashboard — WOPHA board portal
description: Board portal dashboard.
pageKey: dashboard
layout: base.njk
---
{% include "portal-shell.njk" %}
<main id="portal-main" class="section">
  <div class="container">
    <div class="portal-page-head">
      <h1>Dashboard</h1>
    </div>

    <div class="portal-grid portal-grid--3">
      <a class="portal-card kpi" href="ledger.html">
        <span class="kpi-label" id="kpi-dues-label">Dues</span>
        <span class="kpi-number" id="kpi-dues-number">–</span>
        <span class="progress" aria-hidden="true"><span id="kpi-dues-bar" style="width:0%"></span></span>
        <span class="kpi-sub" id="kpi-dues-sub"></span>
      </a>
      <a class="portal-card kpi" href="inbox.html">
        <span class="kpi-label">Inbox</span>
        <span class="kpi-number" id="kpi-inbox-number">–</span>
        <span class="kpi-sub" id="kpi-inbox-sub"></span>
      </a>
      <a class="portal-card kpi" href="ledger.html#households">
        <span class="kpi-label">Households</span>
        <span class="kpi-number" id="kpi-households-number">–</span>
        <span class="kpi-sub">on file — manage roster</span>
      </a>
    </div>

    <section class="portal-section" aria-labelledby="attention-heading">
      <h2 id="attention-heading">Needs attention</h2>
      <div id="attention"></div>
    </section>

    <div class="portal-grid portal-grid--2">
      <section class="portal-card" aria-labelledby="latest-heading">
        <h2 id="latest-heading">Latest announcement</h2>
        <div id="latest"></div>
      </section>
      <section class="portal-card" aria-labelledby="qa-heading">
        <h2 id="qa-heading">Quick actions</h2>
        <ul class="quick-actions">
          <li><a href="announcements.html#new">+ Post announcement</a></li>
          <li><a href="ledger.html">$ Record a payment</a></li>
          <li><a href="ledger.html#households">&#8595; Import households</a></li>
        </ul>
      </section>
    </div>

    <section class="portal-card portal-section" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup &amp; data</h2>
      <p>Everything the portal stores, in one file. Download one after big changes and keep it with the board records.</p>
      <p>
        <a class="btn btn--outline" id="backup-link" href="/api/admin/export">Download full data export (JSON)</a>
      </p>
      <p class="field-help" id="backup-last"></p>
    </section>
  </div>
</main>
<script>
  (function () {
    portalSummary().then(function (s) {
      document.getElementById("kpi-dues-label").textContent = "Dues " + s.year;
      document.getElementById("kpi-dues-number").textContent = s.paid + " / " + s.households + " paid";
      var pct = s.households ? Math.round((s.paid / s.households) * 100) : 0;
      document.getElementById("kpi-dues-bar").style.width = pct + "%";
      document.getElementById("kpi-dues-sub").textContent = dollars(s.collectedCents) + " collected";

      var inboxNum = document.getElementById("kpi-inbox-number");
      inboxNum.textContent = String(s.newSubmissions);
      if (s.newSubmissions > 0) inboxNum.classList.add("is-alert");
      document.getElementById("kpi-inbox-sub").textContent = s.newSubmissions === 0
        ? "Inbox is clear"
        : (s.newSubmissions === 1 ? "new item — triage it" : "new items — triage them");

      document.getElementById("kpi-households-number").textContent = String(s.households);

      var latest = document.getElementById("latest");
      latest.textContent = "";
      if (s.latestAnnouncement) {
        latest.appendChild(el("h3", null, s.latestAnnouncement.title));
        latest.appendChild(el("p", "field-help", "Posted " + s.latestAnnouncement.created_at.slice(0, 10)));
        var p = el("p");
        var edit = el("a", "btn btn--sm", "Edit");
        edit.href = "announcements.html#edit-latest";
        var view = el("a", "btn btn--sm btn--outline", "View on site ↗");
        view.href = "/";
        view.target = "_blank";
        view.rel = "noopener";
        p.appendChild(edit);
        p.appendChild(document.createTextNode(" "));
        p.appendChild(view);
        latest.appendChild(p);
      } else {
        latest.appendChild(el("p", "field-help", "No announcements yet. Post one and it appears on the homepage."));
      }
    }).catch(showError);

    var attention = document.getElementById("attention");
    attention.appendChild(skeleton(3));
    api("/api/admin/submissions?status=new").then(function (data) {
      attention.textContent = "";
      var items = data.submissions.slice(0, 3);
      if (!items.length) {
        attention.appendChild(el("p", "field-help", "Inbox zero — nothing new from residents."));
        return;
      }
      var ul = el("ul", "attention-list");
      items.forEach(function (s) {
        var li = el("li");
        li.appendChild(el("strong", null, TYPE_LABELS[s.form_type] || s.form_type));
        var extract = s.fields.message || "";
        if (!extract) {
          var keys = Object.keys(s.fields);
          for (var i = 0; i < keys.length; i++) {
            if (s.fields[keys[i]]) { extract = s.fields[keys[i]]; break; }
          }
        }
        if (extract.length > 90) extract = extract.slice(0, 90) + "…";
        li.appendChild(el("span", "field-help extract", extract));
        li.appendChild(el("span", "field-help", s.created_at.slice(0, 10)));
        var open = el("a", "btn btn--sm", "Open");
        open.href = "inbox.html";
        li.appendChild(open);
        ul.appendChild(li);
      });
      attention.appendChild(ul);
    }).catch(showError);

    var KEY = "wopha-backup-last-download";
    var lastEl = document.getElementById("backup-last");
    var last = localStorage.getItem(KEY);
    lastEl.textContent = last
      ? "Last downloaded from this browser: " + last + "."
      : "Never downloaded from this browser.";
    document.getElementById("backup-link").addEventListener("click", function () {
      var today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(KEY, today);
      lastEl.textContent = "Last downloaded from this browser: " + today + ".";
    });
  })();
</script>
```

- [ ] **Step 2: Verify against local dev**

Reseed, `npm run build`, `npm run dev`, open `http://127.0.0.1:8200/portal/`:

  - Dues card: "2 / 5 paid", progress bar ~40% filled, "$1,070 collected" (seed: two $535 payments). Card is a single link to `ledger.html`.
  - Inbox card: "2" in clay, sub-line "new items — triage them". Households card: "5", links to `ledger.html#households`.
  - Needs attention: two rows — "Issue report / Gate latch sticks when it is hot out…" and "Suggestion / More shade by the baby pool…", each with a date and an Open button to `inbox.html`.
  - Latest announcement: "Clean-up day recap" (or the newest seed row) with Edit → `announcements.html#edit-latest` and "View on site ↗" opening `/` in a new tab.
  - Quick actions: exactly three links with the exact targets above.
  - Backup card: says "Never downloaded from this browser." → click Download (JSON downloads) → text flips to "Last downloaded from this browser: <today>."; reload page → nudge persists.
  - Failure path: stop the dev server, reload the page (serve statically via `python -m http.server 8201` from `_site/`) — the red error banner appears with the message and a Reload button, and it receives focus.
  - Screenshot `portal/` at 375 and 1280: three KPI cards stack at 375, sit in one row at 1280; no horizontal scroll.

- [ ] **Step 3: Quality gates + commit**

`npm test` green, `npm run lint` no errors, then:
`git commit -am "Portal redesign: dashboard (KPI cards, needs-attention queue, quick actions, backup card)"`

---

### Task 4: Dues & households (Ledger · Households · Exports tabs)

**Files:**
- Rewrite: `src/portal/ledger.html` (full replacement)

**Interfaces:**
- Consumes: `GET /api/admin/households?year=` (one fetch feeds all three tabs: ledger rows, roster, import preview, summary, `dues_cents`), `POST/DELETE /api/admin/payments[…]`, `POST /api/admin/households` (CSV import + one-row add), `PUT /api/admin/households/:id` (inline edit), `GET /api/admin/settings` (`quickbooks_url` gate), `GET /api/admin/ledger-export` all five formats; `initTabs`/`toast`/`confirmDialog`/`skeleton`/`el`/`dollars` from Task 2.
- Produces: hash routes `#ledger` (default, also active with no hash), `#households`, `#exports` — the dashboard's `ledger.html#households` deep link lands on the Households tab.
- Client-side CSV mirror: `parseCsvLocal`/`parseHouseholdsCsvLocal`/`toCsvLocal` replicate `functions/api/_lib/csv.js` (`parseCsv`, `toCsv`) and `functions/api/_lib/ledger.js` (`parseHouseholdsCsv`) **exactly** — same quoting, same header mapping, same "empty address — skipped" rule — so the preview counts always match what the server will do. Each mirror carries a keep-in-sync comment naming its source.

- [ ] **Step 1: Replace `src/portal/ledger.html` with:**

```html
---
title: Dues & households — WOPHA board portal
description: Dues ledger, household roster, and exports.
pageKey: ledger
layout: base.njk
---
{% include "portal-shell.njk" %}
<main id="portal-main" class="section">
  <div class="container">
    <div class="portal-page-head">
      <h1>Dues &amp; households</h1>
    </div>

    <div class="portal-tabs" role="tablist" aria-label="Dues and households sections" id="ledger-tabs">
      <button type="button" role="tab" id="tab-ledger" data-hash="ledger" aria-controls="panel-ledger" aria-selected="true">Ledger</button>
      <button type="button" role="tab" id="tab-households" data-hash="households" aria-controls="panel-households" aria-selected="false" tabindex="-1">Households</button>
      <button type="button" role="tab" id="tab-exports" data-hash="exports" aria-controls="panel-exports" aria-selected="false" tabindex="-1">Exports</button>
    </div>

    <section id="panel-ledger" role="tabpanel" aria-labelledby="tab-ledger">
      <div class="portal-page-head">
        <div class="stepper" role="group" aria-label="Ledger year">
          <button type="button" id="year-prev" aria-label="Previous year">&#9664;</button>
          <output id="year-out">–</output>
          <button type="button" id="year-next" aria-label="Next year">&#9654;</button>
        </div>
        <a class="btn btn--outline" id="qb-link" href="#" target="_blank" rel="noopener" hidden>Open QuickBooks ↗</a>
      </div>

      <div class="summary-strip">
        <div class="sum-item">
          <strong id="sum-paid">–</strong>
          <span>households paid</span>
          <span class="progress" aria-hidden="true"><span id="sum-bar" style="width:0%"></span></span>
        </div>
        <div class="sum-item"><strong id="sum-collected">–</strong> <span>collected</span></div>
        <div class="sum-item"><strong id="sum-outstanding">–</strong> <span>outstanding</span></div>
      </div>

      <div class="portal-toolbar">
        <label class="visually-hidden" for="search">Search by address or owner</label>
        <input type="search" id="search" placeholder="Search address or owner…" autocomplete="off">
        <fieldset class="segmented">
          <legend>Filter by payment status</legend>
          <label><input type="radio" name="paidfilter" value="paid"><span>Paid</span></label>
          <label><input type="radio" name="paidfilter" value="unpaid"><span>Unpaid</span></label>
          <label><input type="radio" name="paidfilter" value="" checked><span>All</span></label>
        </fieldset>
      </div>

      <div class="table-card">
        <table class="portal-table">
          <caption class="visually-hidden" id="ledger-caption">Dues ledger</caption>
          <thead>
            <tr>
              <th scope="col">Address</th>
              <th scope="col">Owner</th>
              <th scope="col">Status</th>
              <th scope="col">Method</th>
              <th scope="col">Date</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody id="ledger-rows"></tbody>
        </table>
      </div>
    </section>

    <section id="panel-households" role="tabpanel" aria-labelledby="tab-households" hidden>
      <section class="portal-card portal-section" aria-labelledby="import-heading">
        <h2 id="import-heading">Import households</h2>
        <p>Pick the treasurer's CSV export (or paste it below). Required column: <code>address</code>; optional: <code>owner_name</code>, <code>email</code>, <code>phone</code>. <strong>Existing addresses are updated, new ones added. Nothing is ever deleted.</strong></p>
        <form id="import-form">
          <p>
            <label for="import-file">CSV file</label><br>
            <input type="file" id="import-file" accept=".csv,text/csv">
          </p>
          <p>
            <label for="import-csv">Or paste CSV</label><br>
            <textarea id="import-csv" rows="6" style="width:100%" placeholder="address,owner_name,email,phone&#10;101 Planters Way,Alex Morgan,alex@example.com,"></textarea>
          </p>
          <p class="field-help" id="import-preview" role="status"></p>
          <p><button class="btn btn--primary" type="submit" id="import-btn">Import</button></p>
          <div class="result-banner" id="import-result" role="status"></div>
        </form>
      </section>

      <section class="portal-card portal-section" aria-labelledby="add-heading">
        <h2 id="add-heading">+ Add household</h2>
        <form id="add-form">
          <div class="portal-grid portal-grid--2">
            <p><label for="add-address">Address (required)</label><br><input type="text" id="add-address" required style="width:100%"></p>
            <p><label for="add-owner">Owner name</label><br><input type="text" id="add-owner" style="width:100%"></p>
            <p><label for="add-email">Email</label><br><input type="email" id="add-email" style="width:100%"></p>
            <p><label for="add-phone">Phone</label><br><input type="text" id="add-phone" style="width:100%"></p>
          </div>
          <p><button class="btn btn--primary" type="submit" id="add-btn">Add household</button></p>
        </form>
      </section>

      <div class="table-card">
        <table class="portal-table">
          <caption class="visually-hidden">Household roster</caption>
          <thead>
            <tr>
              <th scope="col">Address</th>
              <th scope="col">Owner</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody id="roster-rows"></tbody>
        </table>
      </div>
    </section>

    <section id="panel-exports" role="tabpanel" aria-labelledby="tab-exports" hidden>
      <div class="portal-grid portal-grid--3">
        <section class="portal-card export-card" aria-labelledby="exp-board-h">
          <h3 id="exp-board-h">Ledger CSV</h3>
          <p class="field-help">Every household with paid/unpaid status for the year — the board spreadsheet.</p>
          <a class="btn btn--outline" id="exp-board" href="/api/admin/ledger-export">Download ledger CSV</a>
        </section>
        <section class="portal-card export-card" aria-labelledby="exp-unpaid-h">
          <h3 id="exp-unpaid-h">Unpaid households CSV</h3>
          <p class="field-help">Only households that have not paid — for reminder letters.</p>
          <a class="btn btn--outline" id="exp-unpaid" href="/api/admin/ledger-export?only=unpaid">Download unpaid CSV</a>
        </section>
        <section class="portal-card export-card" aria-labelledby="exp-qbo-h">
          <h3 id="exp-qbo-h">QuickBooks</h3>
          <p class="field-help">One-way exports for QuickBooks Online. The portal stays the ledger of record.</p>
          <ul class="quick-actions">
            <li><a id="exp-qbo-customers" href="/api/admin/ledger-export?format=qbo-customers">Customers CSV (one-time seed)</a></li>
            <li><a id="exp-qbo-invoices" href="/api/admin/ledger-export?format=qbo-invoices">Invoices CSV (once per year)</a></li>
            <li><a id="exp-qbo-payments" href="/api/admin/ledger-export?format=qbo-payments">Payments reference CSV</a></li>
          </ul>
          <p><label><input type="checkbox" id="qbo-unpaid-only"> Invoices: unpaid households only</label></p>
          <div class="popover-host">
            <button type="button" class="btn btn--sm" id="qbo-help" aria-expanded="false" aria-controls="qbo-runbook">How to import into QuickBooks</button>
            <div class="portal-popover" id="qbo-runbook" role="dialog" aria-label="QuickBooks import steps" hidden>
              <ol style="margin:0 0 0.75rem; padding-left:1.25rem">
                <li>One time: in QuickBooks go to Settings (gear) → Import data → Customers and upload <code>wopha-qbo-customers.csv</code>. Addresses become the customer names.</li>
                <li>Optional, once per year: Settings (gear) → Import data → Invoices and upload <code>wopha-qbo-invoices-&lt;year&gt;.csv</code>. Invoice numbers look like <code>WOPHA-2026-17</code>, so importing the same year twice shows up as duplicates you can skip.</li>
                <li>Recommended (cash basis): do not import payments at all — the QuickBooks bank feed already brings in Stripe, Zelle, and check deposits as income.</li>
                <li>Use <code>wopha-qbo-payments-&lt;year&gt;.csv</code> as a reference to categorize and memo those bank-feed deposits (who paid, which household, what year).</li>
                <li>If you imported invoices, match bank-feed deposits to them as payments received. Verify invoice import is available on the association's QuickBooks plan first.</li>
              </ol>
              <p class="row-error" style="margin:0 0 0.75rem">If your bank feed already brings in dues deposits, use the Payments file as a reference — don't import it as transactions.</p>
              <button type="button" class="btn btn--sm" id="qbo-help-close">Close</button>
            </div>
          </div>
        </section>
      </div>
      <p class="field-help" id="exports-year-note"></p>
    </section>
  </div>
</main>
<script>
  (function () {
    /* ================= CSV mirrors =================
       MIRROR of parseCsv in functions/api/_lib/csv.js — keep in sync. */
    function parseCsvLocal(text) {
      var rows = [];
      var row = [];
      var cell = "";
      var inQuotes = false;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
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
      while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
        rows.pop();
      }
      return rows;
    }

    /* MIRROR of parseHouseholdsCsv in functions/api/_lib/ledger.js — keep in sync. */
    function parseHouseholdsCsvLocal(text) {
      var rows = parseCsvLocal(String(text || "").trim());
      if (rows.length < 2) return { ok: false, error: "Need a header row plus at least one household" };
      var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
      var col = {
        address: header.indexOf("address"),
        owner_name: header.indexOf("owner_name"),
        email: header.indexOf("email"),
        phone: header.indexOf("phone"),
      };
      if (col.address === -1) return { ok: false, error: "Missing required 'address' column" };
      var households = [];
      var errors = [];
      rows.slice(1).forEach(function (r, i) {
        var get = function (idx) { return idx === -1 ? "" : String(r[idx] || "").trim(); };
        var address = get(col.address);
        if (!address) { errors.push("Row " + (i + 2) + ": empty address — skipped"); return; }
        households.push({
          address: address,
          owner_name: get(col.owner_name),
          email: get(col.email),
          phone: get(col.phone),
        });
      });
      return { ok: true, households: households, errors: errors };
    }

    /* MIRROR of toCsv in functions/api/_lib/csv.js — keep in sync. */
    function toCsvLocal(rows) {
      return rows.map(function (row) {
        return row.map(function (cell) {
          var s = String(cell);
          return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }).join(",");
      }).join("\n");
    }

    /* ================= state ================= */
    var year = new Date().getFullYear();
    var duesCents = 53500; // replaced by the API value on first load
    var data = null;       // last GET /api/admin/households?year= payload
    var currentPopover = null;

    var yearOut = document.getElementById("year-out");
    var searchEl = document.getElementById("search");
    var rowsEl = document.getElementById("ledger-rows");
    var rosterEl = document.getElementById("roster-rows");
    var importCsv = document.getElementById("import-csv");

    initTabs(document.getElementById("ledger-tabs"));

    /* ================= load & render ================= */
    function skeletonRow(tbody, cols) {
      tbody.textContent = "";
      for (var i = 0; i < 4; i++) {
        var tr = el("tr");
        var td = el("td");
        td.colSpan = cols;
        td.appendChild(skeleton(1));
        tr.appendChild(td);
        tbody.appendChild(tr);
      }
    }

    function load() {
      clearError();
      closePopover(false);
      yearOut.textContent = String(year);
      document.getElementById("ledger-caption").textContent = "Dues ledger for " + year;
      updateExportLinks();
      skeletonRow(rowsEl, 6);
      skeletonRow(rosterEl, 5);
      api("/api/admin/households?year=" + year).then(function (d) {
        data = d;
        duesCents = d.dues_cents;
        renderSummary();
        renderLedger();
        renderRoster();
        updateImportPreview();
      }).catch(showError);
    }

    function renderSummary() {
      var s = data.summary;
      document.getElementById("sum-paid").textContent = s.paidCount + " of " + s.total;
      var pct = s.total ? Math.round((s.paidCount / s.total) * 100) : 0;
      document.getElementById("sum-bar").style.width = pct + "%";
      document.getElementById("sum-collected").textContent = dollars(s.collectedCents);
      document.getElementById("sum-outstanding").textContent = dollars(s.outstandingCents);
    }

    function ledgerFilterPass(h) {
      var q = searchEl.value.trim().toLowerCase();
      if (q && (h.address + " " + (h.owner_name || "")).toLowerCase().indexOf(q) === -1) return false;
      var f = document.querySelector('input[name="paidfilter"]:checked').value;
      if (f === "paid" && h.payment_id == null) return false;
      if (f === "unpaid" && h.payment_id != null) return false;
      return true;
    }

    function renderLedger() {
      rowsEl.textContent = "";
      var shown = data.households.filter(ledgerFilterPass);
      if (!shown.length) {
        var tr = el("tr");
        var td = el("td", "empty-state", data.households.length
          ? "No households match the current search or filter."
          : "No households yet — import a CSV on the Households tab.");
        td.colSpan = 6;
        tr.appendChild(td);
        rowsEl.appendChild(tr);
        return;
      }
      shown.forEach(function (h) { rowsEl.appendChild(buildLedgerRow(h)); });
    }

    function cellFor(label, text) {
      var td = el("td", null, text);
      td.setAttribute("data-label", label);
      return td;
    }

    function buildLedgerRow(h) {
      var tr = el("tr");
      tr.appendChild(cellFor("Address", h.address));
      tr.appendChild(cellFor("Owner", h.owner_name || ""));

      var paid = h.payment_id != null;
      var statusTd = el("td");
      statusTd.setAttribute("data-label", "Status");
      statusTd.appendChild(el("span", "badge " + (paid ? "badge--paid" : "badge--unpaid"), paid ? "paid" : "unpaid"));
      tr.appendChild(statusTd);

      tr.appendChild(cellFor("Method", paid ? (h.method || "") : "—"));
      tr.appendChild(cellFor("Date", paid ? (h.paid_on || "") : "—"));

      var actionTd = el("td", "popover-host");
      var btn;
      if (paid) {
        btn = el("button", "btn btn--sm", "Undo");
        btn.type = "button";
        btn.addEventListener("click", function () {
          confirmDialog("Remove the " + year + " payment for " + h.address + "?").then(function (yes) {
            if (yes) undoPayment(h, tr);
          });
        });
      } else {
        btn = el("button", "btn btn--sm btn--primary", "Mark paid");
        btn.type = "button";
        btn.addEventListener("click", function () { openMarkPaid(h, actionTd, btn, tr); });
      }
      actionTd.appendChild(btn);
      var rowErr = el("div", "row-error");
      rowErr.hidden = true;
      rowErr.tabIndex = -1;
      actionTd.appendChild(rowErr);
      tr.appendChild(actionTd);
      return tr;
    }

    function refreshRow(h, oldTr, focusButton) {
      var newTr = buildLedgerRow(h);
      if (ledgerFilterPass(h)) {
        oldTr.replaceWith(newTr);
        if (focusButton) {
          var b = newTr.querySelector("button");
          if (b) b.focus();
        }
      } else {
        // Row no longer matches the active filter — per spec it still updates
        // in place (visible until the next filter change), so keep it but let
        // the next renderLedger() drop it.
        oldTr.replaceWith(newTr);
      }
    }

    function rowError(tr, message, withReload) {
      var box = tr.querySelector(".row-error");
      box.textContent = message + " ";
      if (withReload) {
        var re = el("button", "btn btn--sm", "Reload list");
        re.type = "button";
        re.addEventListener("click", load);
        box.appendChild(re);
      }
      box.hidden = false;
      box.focus();
    }

    /* ================= mark paid popover ================= */
    function closePopover(focusTrigger) {
      if (!currentPopover) return;
      var pop = currentPopover;
      currentPopover = null;
      document.removeEventListener("mousedown", pop.outsideHandler);
      pop.node.remove();
      if (focusTrigger && pop.trigger) pop.trigger.focus();
    }

    function openMarkPaid(h, hostTd, trigger, tr) {
      closePopover(false);
      var pop = el("div", "portal-popover");
      pop.setAttribute("role", "dialog");
      pop.setAttribute("aria-label", "Record payment for " + h.address);

      function fieldRow(labelText, input) {
        var wrap = el("div", "form-row");
        var label = el("label", null, labelText);
        var fid = "pp-" + labelText.toLowerCase().replace(/[^a-z]+/g, "-") + "-" + h.id;
        label.htmlFor = fid;
        input.id = fid;
        wrap.appendChild(label);
        wrap.appendChild(input);
        return wrap;
      }

      var amount = el("input");
      amount.type = "number";
      amount.step = "0.01";
      amount.min = "0.01";
      amount.value = (duesCents / 100).toFixed(2);
      pop.appendChild(fieldRow("Amount ($)", amount));

      var method = el("select");
      ["check", "zelle", "stripe", "other"].forEach(function (m) {
        var o = el("option", null, m.charAt(0).toUpperCase() + m.slice(1));
        o.value = m;
        method.appendChild(o);
      });
      pop.appendChild(fieldRow("Method", method));

      var date = el("input");
      date.type = "date";
      date.value = new Date().toISOString().slice(0, 10);
      pop.appendChild(fieldRow("Paid on", date));

      var note = el("input");
      note.type = "text";
      note.maxLength = 500;
      note.placeholder = "Optional note";
      pop.appendChild(fieldRow("Note", note));

      var errEl = el("p", "field-error", "");
      errEl.hidden = true;
      pop.appendChild(errEl);

      var actions = el("div", "popover-actions");
      var confirmBtn = el("button", "btn btn--sm btn--primary", "Confirm");
      confirmBtn.type = "button";
      var cancelBtn = el("button", "btn btn--sm", "Cancel");
      cancelBtn.type = "button";
      actions.appendChild(confirmBtn);
      actions.appendChild(cancelBtn);
      pop.appendChild(actions);

      cancelBtn.addEventListener("click", function () { closePopover(true); });
      pop.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.stopPropagation(); closePopover(true); }
      });

      confirmBtn.addEventListener("click", function () {
        var cents = Math.round(parseFloat(amount.value) * 100);
        if (!isFinite(cents) || cents <= 0) {
          errEl.textContent = "Enter an amount in dollars.";
          errEl.hidden = false;
          amount.focus();
          return;
        }
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        api("/api/admin/payments", {
          method: "POST",
          body: {
            household_id: h.id,
            year: year,
            amount_cents: cents,
            method: method.value,
            paid_on: date.value,
            note: note.value,
          },
        }).then(function (res) {
          h.payment_id = res.id;
          h.amount_cents = cents;
          h.method = method.value;
          h.paid_on = date.value;
          data.summary.paidCount += 1;
          data.summary.unpaidCount -= 1;
          data.summary.collectedCents += cents;
          data.summary.outstandingCents = data.summary.unpaidCount * duesCents;
          renderSummary();
          closePopover(false);
          refreshRow(h, tr, true);
          toast("Marked " + h.address + " paid.", {
            actionLabel: "Undo",
            onAction: function () { undoPayment(h, null); },
          });
        }).catch(function (err) {
          closePopover(false);
          if (err.status === 409) {
            rowError(tr, "Already marked paid for " + year + ".", true);
          } else {
            showError(err);
          }
        });
      });

      hostTd.appendChild(pop);
      currentPopover = {
        node: pop,
        trigger: trigger,
        outsideHandler: function (e) {
          if (!pop.contains(e.target) && e.target !== trigger) closePopover(false);
        },
      };
      document.addEventListener("mousedown", currentPopover.outsideHandler);
      amount.focus();
    }

    function undoPayment(h, tr) {
      var refundCents = h.amount_cents || duesCents;
      api("/api/admin/payments/" + h.payment_id, { method: "DELETE" }).then(function () {
        h.payment_id = null;
        h.amount_cents = null;
        h.method = null;
        h.paid_on = null;
        data.summary.paidCount -= 1;
        data.summary.unpaidCount += 1;
        data.summary.collectedCents -= refundCents;
        data.summary.outstandingCents = data.summary.unpaidCount * duesCents;
        renderSummary();
        if (tr && tr.isConnected) refreshRow(h, tr, true);
        else renderLedger();
        toast("Payment removed.");
      }).catch(function (err) {
        if (err.status === 404) { load(); return; } // already gone — resync
        showError(err);
      });
    }

    /* ================= roster (Households tab) ================= */
    function renderRoster() {
      rosterEl.textContent = "";
      if (!data.households.length) {
        var tr = el("tr");
        var td = el("td", "empty-state", "No households yet — import a CSV above.");
        td.colSpan = 5;
        tr.appendChild(td);
        rosterEl.appendChild(tr);
        return;
      }
      data.households.forEach(function (h) { rosterEl.appendChild(buildRosterRow(h)); });
    }

    function buildRosterRow(h) {
      var tr = el("tr");
      tr.appendChild(cellFor("Address", h.address));
      tr.appendChild(cellFor("Owner", h.owner_name || ""));
      tr.appendChild(cellFor("Email", h.email || ""));
      tr.appendChild(cellFor("Phone", h.phone || ""));
      var actionTd = el("td");
      var edit = el("button", "btn btn--sm", "Edit");
      edit.type = "button";
      edit.addEventListener("click", function () { editRosterRow(h, tr); });
      actionTd.appendChild(edit);
      tr.appendChild(actionTd);
      return tr;
    }

    function editRosterRow(h, tr) {
      tr.textContent = "";
      function inputCell(label, value) {
        var td = el("td");
        td.setAttribute("data-label", label);
        var input = el("input");
        input.type = label === "Email" ? "email" : "text";
        input.value = value || "";
        input.setAttribute("aria-label", label + " for " + h.address);
        input.style.width = "100%";
        input.style.minHeight = "44px";
        td.appendChild(input);
        tr.appendChild(td);
        return input;
      }
      var address = inputCell("Address", h.address);
      var owner = inputCell("Owner", h.owner_name);
      var email = inputCell("Email", h.email);
      var phone = inputCell("Phone", h.phone);

      var actionTd = el("td");
      var save = el("button", "btn btn--sm btn--primary", "Save");
      save.type = "button";
      var cancel = el("button", "btn btn--sm", "Cancel");
      cancel.type = "button";
      var err = el("div", "row-error");
      err.hidden = true;
      err.tabIndex = -1;
      actionTd.appendChild(save);
      actionTd.appendChild(document.createTextNode(" "));
      actionTd.appendChild(cancel);
      actionTd.appendChild(err);
      tr.appendChild(actionTd);
      address.focus();

      cancel.addEventListener("click", function () {
        var fresh = buildRosterRow(h);
        tr.replaceWith(fresh);
        fresh.querySelector("button").focus();
      });

      save.addEventListener("click", function () {
        if (!address.value.trim()) {
          err.textContent = "Address is required.";
          err.hidden = false;
          err.focus();
          return;
        }
        save.disabled = true;
        cancel.disabled = true;
        api("/api/admin/households/" + h.id, {
          method: "PUT",
          body: {
            address: address.value.trim(),
            owner_name: owner.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
          },
        }).then(function () {
          h.address = address.value.trim();
          h.owner_name = owner.value.trim();
          h.email = email.value.trim();
          h.phone = phone.value.trim();
          var fresh = buildRosterRow(h);
          tr.replaceWith(fresh);
          fresh.querySelector("button").focus();
          renderLedger(); // address/owner also show on the Ledger tab
          toast("Household saved.");
        }).catch(function (e2) {
          save.disabled = false;
          cancel.disabled = false;
          err.textContent = e2.message;
          err.hidden = false;
          err.focus();
        });
      });
    }

    /* ================= import (Households tab) ================= */
    function updateImportPreview() {
      var p = document.getElementById("import-preview");
      var text = importCsv.value.trim();
      if (!text) { p.textContent = ""; return; }
      var parsed = parseHouseholdsCsvLocal(text);
      if (!parsed.ok) { p.textContent = parsed.error + "."; return; }
      var existing = {};
      (data ? data.households : []).forEach(function (h) { existing[h.address] = true; });
      var seen = {};
      var adds = 0;
      var updates = 0;
      parsed.households.forEach(function (r) {
        if (existing[r.address] || seen[r.address]) updates++;
        else adds++;
        seen[r.address] = true;
      });
      p.textContent = "Will add " + adds + " new household" + (adds === 1 ? "" : "s") +
        ", update " + updates + " existing." +
        (parsed.errors.length
          ? " " + parsed.errors.length + " row" + (parsed.errors.length === 1 ? "" : "s") + " skipped (empty address)."
          : "");
    }

    document.getElementById("import-file").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        importCsv.value = String(reader.result);
        updateImportPreview();
      };
      reader.readAsText(file);
    });

    importCsv.addEventListener("input", updateImportPreview);

    document.getElementById("import-form").addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var btn = document.getElementById("import-btn");
      btn.disabled = true;
      api("/api/admin/households", { method: "POST", body: { csv: importCsv.value } })
        .then(function (r) {
          var msg = "Imported " + r.imported + " households.";
          if (r.errors.length) msg += " Skipped: " + r.errors.join("; ");
          document.getElementById("import-result").textContent = msg;
          load();
        })
        .catch(showError)
        .finally(function () { btn.disabled = false; });
    });

    document.getElementById("add-form").addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      var btn = document.getElementById("add-btn");
      btn.disabled = true;
      var csv = toCsvLocal([
        ["address", "owner_name", "email", "phone"],
        [
          document.getElementById("add-address").value.trim(),
          document.getElementById("add-owner").value.trim(),
          document.getElementById("add-email").value.trim(),
          document.getElementById("add-phone").value.trim(),
        ],
      ]);
      api("/api/admin/households", { method: "POST", body: { csv: csv } })
        .then(function () {
          document.getElementById("add-form").reset();
          toast("Household added.");
          load();
        })
        .catch(showError)
        .finally(function () { btn.disabled = false; });
    });

    /* ================= exports ================= */
    function updateExportLinks() {
      var invoicesUnpaid = document.getElementById("qbo-unpaid-only").checked;
      document.getElementById("exp-board").href = "/api/admin/ledger-export?year=" + year;
      document.getElementById("exp-unpaid").href = "/api/admin/ledger-export?year=" + year + "&only=unpaid";
      document.getElementById("exp-qbo-customers").href = "/api/admin/ledger-export?format=qbo-customers";
      document.getElementById("exp-qbo-invoices").href =
        "/api/admin/ledger-export?year=" + year + "&format=qbo-invoices" + (invoicesUnpaid ? "&only=unpaid" : "");
      document.getElementById("exp-qbo-payments").href = "/api/admin/ledger-export?year=" + year + "&format=qbo-payments";
      document.getElementById("exports-year-note").textContent =
        "Year-based exports follow the Ledger tab's year: " + year + ".";
    }
    document.getElementById("qbo-unpaid-only").addEventListener("change", updateExportLinks);

    var qboHelp = document.getElementById("qbo-help");
    var qboRunbook = document.getElementById("qbo-runbook");
    function setRunbook(open) {
      qboRunbook.hidden = !open;
      qboHelp.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) document.getElementById("qbo-help-close").focus();
      else qboHelp.focus();
    }
    qboHelp.addEventListener("click", function () { setRunbook(qboRunbook.hidden); });
    document.getElementById("qbo-help-close").addEventListener("click", function () { setRunbook(false); });
    qboRunbook.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); setRunbook(false); }
    });

    /* ================= wiring ================= */
    document.getElementById("year-prev").addEventListener("click", function () { year -= 1; load(); });
    document.getElementById("year-next").addEventListener("click", function () { year += 1; load(); });
    searchEl.addEventListener("input", function () { if (data) renderLedger(); });
    document.querySelectorAll('input[name="paidfilter"]').forEach(function (r) {
      r.addEventListener("change", function () { if (data) renderLedger(); });
    });

    api("/api/admin/settings").then(function (s) {
      if (s.quickbooks_url) {
        var qb = document.getElementById("qb-link");
        qb.href = s.quickbooks_url;
        qb.hidden = false;
      }
    }).catch(showError);

    load();
  })();
</script>
```

- [ ] **Step 2: Verify — Ledger tab**

Reseed, `npm run build`, `npm run dev`, open `http://127.0.0.1:8200/portal/ledger.html`:

  - Summary strip: "2 of 5 households paid" with a ~40% bar, "$1,070 collected", "$1,605 outstanding". Table shows 5 rows, 101/102 with green "paid" badges + method + date, others red "unpaid" with em-dashes.
  - Search: type `alex` → only 101 Planters Way remains; clear → 5 rows. Segmented filter Unpaid → 3 rows; All → 5.
  - Mark paid: on 103 Planters Way click "Mark paid" → popover opens anchored to the row, focus in the Amount field, prefilled `535.00` / Check / today; Esc closes it and focus returns to the Mark paid button. Reopen, type a note, Confirm → row flips to a green "paid" badge in place (no full reload), summary now "3 of 5", toast bottom-left "Marked 103 Planters Way paid." with an Undo action.
  - Undo via toast within 5 s → row flips back, summary "2 of 5", toast "Payment removed.".
  - Undo via row: mark 103 paid again, then click the row's Undo → native dialog "Remove the 2026 payment for 103 Planters Way?" with Cancel/Delete; Delete removes it; Esc/Cancel leaves it.
  - 409: open the page in two browser tabs; in tab A mark 104 paid; in tab B (stale) click Mark paid on 104 → Confirm → inline red message on the row "Already marked paid for 2026." with a "Reload list" button that resyncs. No page-top banner.
  - Year stepper: click ◀ → output reads the prior year, all rows unpaid, summary "0 of 5"; ▶ returns. URL hash routing: open `http://127.0.0.1:8200/portal/ledger.html#households` directly → Households tab is active; press the browser Back button after switching tabs → previous tab restores.
  - QuickBooks button: hidden by default. Run `curl -s -X PUT http://127.0.0.1:8200/api/admin/settings -H "Content-Type: application/json" -d "{\"key\":\"quickbooks_url\",\"value\":\"https://qbo.intuit.com/app/homepage\"}"`, reload → "Open QuickBooks ↗" outline button appears in the tab header and opens a new tab. Reset with the same PUT and `"value":""` → hidden again after reload.

- [ ] **Step 3: Verify — Households tab**

  - Roster shows 5 rows with email/phone. Click Edit on 103 Planters Way → row swaps to four inputs (focus in Address) + Save/Cancel; change owner to `Riley Chen-Park`, Save → row returns to view mode showing the change, toast "Household saved.", and the Ledger tab row also shows the new owner. Cancel path leaves data unchanged.
  - Import preview: paste
    ```
    address,owner_name,email,phone
    106 Planters Way,New Owner,new@example.com,
    101 Planters Way,Alex Morgan,alex@example.com,
    ,Nobody,,
    ```
    → preview line reads exactly "Will add 1 new household, update 1 existing. 1 row skipped (empty address)." Click Import → green result banner "Imported 2 households. Skipped: Row 4: empty address — skipped", roster now 6 rows, Ledger tab summary "… of 6".
  - File picker: save that CSV as a `.csv` file, pick it → textarea fills and the preview recomputes.
  - Bad CSV: paste `name,email` + one row → preview shows "Missing required 'address' column." and Import returns the same message via the error banner.
  - Add household: fill address `107 Planters Way, Unit "B"` (exercises comma+quote escaping), owner, submit → toast "Household added.", roster shows the address verbatim.

- [ ] **Step 4: Verify — Exports tab**

  - Five download links produce files named `wopha-ledger-<year>.csv`, `wopha-ledger-<year>-unpaid.csv`, `wopha-qbo-customers.csv`, `wopha-qbo-invoices-<year>.csv`, `wopha-qbo-payments-<year>.csv` (exact names come from the backend seam).
  - Check "Invoices: unpaid households only" → the invoices link href gains `&only=unpaid` (inspect via devtools); uncheck → it drops.
  - Step the Ledger year to 2025 then open Exports → note reads "…follow the Ledger tab's year: 2025." and year-based hrefs contain `year=2025`.
  - Help popover: click "How to import into QuickBooks" → popover with the 5-step runbook and the red warning sentence "If your bank feed already brings in dues deposits, use the Payments file as a reference — don't import it as transactions."; focus lands on Close; Esc closes and returns focus to the help button.

- [ ] **Step 5: Mobile + gates + commit**

Screenshot `portal/ledger.html` at 375 and 1280: at 375 the table collapses to stacked cards with bold uppercase `data-label` captions and the toolbar wraps; at 1280 the sticky header row stays visible while scrolling a long roster. `npm test` green, `npm run lint` no errors, then:
`git commit -am "Portal redesign: Dues & households — ledger popover + undo, roster inline edit + import preview, exports with QBO runbook"`

---

### Task 5: Inbox (master–detail split)

**Files:**
- Rewrite: `src/portal/inbox.html` (full replacement)

**Interfaces:**
- Consumes: `GET /api/admin/submissions` (unfiltered — one fetch powers all four filter tabs and their counts client-side), `PATCH /api/admin/submissions/:id` `{status}` / `{notes}` (unchanged contract); `initTabs`/`toast`/`skeleton`/`el`/`TYPE_LABELS` from Task 2.
- Produces: hash routes `#new` (default), `#in_progress`, `#done`, `#all`; keeps the shell's `#nav-inbox-count` badge in sync after status changes.
- Behavioral contract (spec §4): status changes update the row **in place** — the item stays visible in the current tab until the user switches tabs; the queue never reloads out from under the user; notes autosave on blur with a "Saved ✓" live region and no Save button.

- [ ] **Step 1: Replace `src/portal/inbox.html` with:**

```html
---
title: Inbox — WOPHA board portal
description: Resident submissions triage.
pageKey: inbox
layout: base.njk
---
{% include "portal-shell.njk" %}
<main id="portal-main" class="section">
  <div class="container">
    <div class="portal-page-head">
      <h1>Inbox</h1>
    </div>

    <div class="portal-tabs" role="tablist" aria-label="Filter submissions" id="inbox-tabs">
      <button type="button" role="tab" data-hash="new" data-status="new" aria-controls="inbox-panel" aria-selected="true">New <span class="tab-count" id="count-new"></span></button>
      <button type="button" role="tab" data-hash="in_progress" data-status="in_progress" aria-controls="inbox-panel" aria-selected="false" tabindex="-1">In progress <span class="tab-count" id="count-in_progress"></span></button>
      <button type="button" role="tab" data-hash="done" data-status="done" aria-controls="inbox-panel" aria-selected="false" tabindex="-1">Done <span class="tab-count" id="count-done"></span></button>
      <button type="button" role="tab" data-hash="all" data-status="" aria-controls="inbox-panel" aria-selected="false" tabindex="-1">All <span class="tab-count" id="count-all"></span></button>
    </div>

    <div id="inbox-panel" role="tabpanel" aria-label="Submissions">
      <div class="inbox-split" id="inbox-split">
        <div class="inbox-queue-col">
          <ul class="inbox-queue" id="queue"></ul>
          <p class="empty-state" id="queue-empty" hidden></p>
        </div>
        <section class="inbox-detail portal-card" id="detail" aria-labelledby="detail-heading">
          <button type="button" class="btn btn--sm detail-back" id="detail-back">&#8249; Back to list</button>
          <div id="detail-body">
            <h2 id="detail-heading" class="visually-hidden">Submission detail</h2>
            <p class="empty-state">Select an item from the queue to read it.</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</main>
<script>
  (function () {
    var all = [];
    var selectedId = null;
    var currentStatus = "new";
    var rowRefs = {}; // submission id -> { item: <button>, badge: <span> }

    var queue = document.getElementById("queue");
    var queueEmpty = document.getElementById("queue-empty");
    var detailBody = document.getElementById("detail-body");
    var split = document.getElementById("inbox-split");

    var EMPTY = {
      "new": "Inbox zero — nothing new from residents.",
      "in_progress": "Nothing in progress.",
      "done": "Nothing marked done yet.",
      "": "No submissions yet.",
    };

    initTabs(document.getElementById("inbox-tabs"), function (tab) {
      currentStatus = tab.getAttribute("data-status");
      renderQueue();
    });

    function counts() {
      var c = { "new": 0, in_progress: 0, done: 0 };
      all.forEach(function (s) { c[s.status] += 1; });
      return c;
    }

    function updateCounts() {
      var c = counts();
      document.getElementById("count-new").textContent = "(" + c["new"] + ")";
      document.getElementById("count-in_progress").textContent = "(" + c.in_progress + ")";
      document.getElementById("count-done").textContent = "(" + c.done + ")";
      document.getElementById("count-all").textContent = "(" + all.length + ")";
      var navBadge = document.getElementById("nav-inbox-count");
      if (navBadge) {
        navBadge.textContent = String(c["new"]);
        navBadge.hidden = c["new"] === 0;
      }
    }

    function extractOf(s) {
      var v = s.fields.name || s.fields.address || s.fields.location || "";
      if (!v) {
        var keys = Object.keys(s.fields);
        for (var i = 0; i < keys.length; i++) {
          if (s.fields[keys[i]]) { v = s.fields[keys[i]]; break; }
        }
      }
      if (v.length > 48) v = v.slice(0, 48) + "…";
      return v;
    }

    function badgeFor(s) {
      return el("span", "badge badge--" + s.status, s.status.replace("_", " "));
    }

    function renderQueue() {
      queue.textContent = "";
      rowRefs = {};
      var shown = currentStatus ? all.filter(function (s) { return s.status === currentStatus; }) : all;
      queueEmpty.hidden = shown.length > 0;
      queueEmpty.textContent = EMPTY[currentStatus];
      shown.forEach(function (s) {
        var li = el("li");
        var item = el("button", "queue-item");
        item.type = "button";
        item.setAttribute("aria-current", s.id === selectedId ? "true" : "false");

        var top = el("div", "qi-top");
        top.appendChild(el("span", null, TYPE_LABELS[s.form_type] || s.form_type));
        top.appendChild(el("span", "qi-date", s.created_at.slice(0, 10)));
        item.appendChild(top);

        var sub = el("div", "qi-sub");
        sub.appendChild(el("span", null, extractOf(s)));
        var badge = badgeFor(s);
        sub.appendChild(badge);
        item.appendChild(sub);

        item.addEventListener("click", function () { selectItem(s); });
        li.appendChild(item);
        queue.appendChild(li);
        rowRefs[s.id] = { item: item, badge: badge };
      });
    }

    function selectItem(s) {
      selectedId = s.id;
      Object.keys(rowRefs).forEach(function (id) {
        rowRefs[id].item.setAttribute("aria-current", Number(id) === s.id ? "true" : "false");
      });
      renderDetail(s);
      split.classList.add("show-detail"); // mobile push; no-op on desktop
      var heading = detailBody.querySelector("h2");
      if (heading) { heading.tabIndex = -1; heading.focus(); }
    }

    function updateRowBadge(s) {
      var ref = rowRefs[s.id];
      if (!ref) return;
      var fresh = badgeFor(s);
      ref.badge.replaceWith(fresh);
      ref.badge = fresh;
    }

    function setStatus(s, status, busyBtn) {
      if (busyBtn) busyBtn.disabled = true;
      api("/api/admin/submissions/" + s.id, { method: "PATCH", body: { status: status } })
        .then(function () {
          s.status = status;
          updateRowBadge(s);   // row updates in place — no queue reload
          updateCounts();
          renderDetail(s);
        })
        .catch(function (err) {
          if (busyBtn) busyBtn.disabled = false;
          showError(err);
        });
    }

    function renderDetail(s) {
      detailBody.textContent = "";

      var h2 = el("h2", null, TYPE_LABELS[s.form_type] || s.form_type);
      h2.id = "detail-heading";
      detailBody.appendChild(h2);

      var meta = el("p", "field-help");
      meta.appendChild(document.createTextNode("Submitted " + s.created_at.slice(0, 10) + " "));
      meta.appendChild(badgeFor(s));
      detailBody.appendChild(meta);

      var dl = el("dl", "portal-dl");
      Object.keys(s.fields).forEach(function (k) {
        dl.appendChild(el("dt", null, k.replace(/_/g, " ")));
        dl.appendChild(el("dd", null, s.fields[k]));
      });
      detailBody.appendChild(dl);

      var actions = el("p");
      if (s.status === "new") {
        var start = el("button", "btn btn--primary", "Start working on this");
        start.type = "button";
        start.addEventListener("click", function () { setStatus(s, "in_progress", start); });
        actions.appendChild(start);
      } else if (s.status === "in_progress") {
        var done = el("button", "btn btn--primary", "Mark done");
        done.type = "button";
        done.addEventListener("click", function () { setStatus(s, "done", done); });
        actions.appendChild(done);
        actions.appendChild(document.createTextNode(" "));
        var back = el("button", "btn btn--sm", "Move back to new");
        back.type = "button";
        back.addEventListener("click", function () { setStatus(s, "new", back); });
        actions.appendChild(back);
      } else {
        var reopen = el("button", "btn btn--sm", "Reopen — move back to in progress");
        reopen.type = "button";
        reopen.addEventListener("click", function () { setStatus(s, "in_progress", reopen); });
        actions.appendChild(reopen);
      }

      var email = "";
      Object.keys(s.fields).forEach(function (k) {
        if (!email && /email/i.test(k) && /@/.test(s.fields[k])) email = s.fields[k];
      });
      if (email) {
        actions.appendChild(document.createTextNode(" "));
        var reply = el("a", "btn btn--sm btn--outline", "Reply by email ↗");
        reply.href = "mailto:" + email + "?subject=" +
          encodeURIComponent("Re: your " + (TYPE_LABELS[s.form_type] || s.form_type).toLowerCase() + " to the WOPHA board");
        actions.appendChild(reply);
      }
      detailBody.appendChild(actions);

      var notesLabel = el("label", null, "Board notes (private)");
      notesLabel.htmlFor = "notes-" + s.id;
      detailBody.appendChild(notesLabel);
      var notes = el("textarea");
      notes.id = "notes-" + s.id;
      notes.rows = 3;
      notes.maxLength = 2000;
      notes.style.width = "100%";
      notes.value = s.notes;
      detailBody.appendChild(notes);

      var saved = el("p", "saved-note");
      saved.setAttribute("role", "status");
      detailBody.appendChild(saved);
      var noteErr = el("p", "field-error");
      noteErr.hidden = true;
      noteErr.tabIndex = -1;
      detailBody.appendChild(noteErr);

      function saveNotes() {
        if (notes.value === s.notes) return; // nothing changed — no request
        noteErr.hidden = true;
        api("/api/admin/submissions/" + s.id, { method: "PATCH", body: { notes: notes.value } })
          .then(function () {
            s.notes = notes.value;
            var t = new Date();
            saved.textContent = "Saved ✓ " +
              t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          })
          .catch(function () {
            noteErr.textContent = "Notes not saved. ";
            var retry = el("button", "btn btn--sm", "Retry");
            retry.type = "button";
            retry.addEventListener("click", saveNotes);
            noteErr.appendChild(retry);
            noteErr.hidden = false;
            noteErr.focus();
          });
      }
      notes.addEventListener("blur", saveNotes);
    }

    document.getElementById("detail-back").addEventListener("click", function () {
      split.classList.remove("show-detail");
      var ref = rowRefs[selectedId];
      if (ref) ref.item.focus();
    });

    queue.appendChild(el("li")).appendChild(skeleton(4));
    api("/api/admin/submissions").then(function (data) {
      all = data.submissions;
      updateCounts();
      renderQueue();
    }).catch(showError);
  })();
</script>
```

- [ ] **Step 2: Verify against local dev**

Reseed, `npm run build`, `npm run dev`, open `http://127.0.0.1:8200/portal/inbox.html`:

  - Tabs read "New (2) · In progress (0) · Done (0) · All (2)", New selected, queue shows the two seeded items (Issue report / Suggestion) with amber "new" badges; detail pane says "Select an item from the queue to read it."
  - Click the Issue report → detail shows heading, date + badge, a `<dl>` with "location: Pool area" and the message, a poolwater "Start working on this" button, and the notes textarea. Focus moves to the detail heading.
  - Click "Start working on this" → detail button becomes "Mark done" + "Move back to new"; the queue row's badge flips to blue "in progress" **without the list reloading or the item disappearing**; tab counts become "New (1) · In progress (1)"; the sidebar Inbox badge drops to 1. Switch to the In progress tab → the item is there; back to New → it is gone.
  - Notes autosave: type "Called the gate vendor", click elsewhere (blur) → "Saved ✓ <time>" appears (screen readers announce it — `role="status"`); no Save button exists anywhere. Reload the page → the note persisted.
  - Failure + retry: stop the dev server, edit the note, blur → red "Notes not saved." with a Retry button that receives focus flow; restart the server, click Retry → "Saved ✓".
  - Mailto: `curl -s -X POST http://127.0.0.1:8200/api/forms/submit -d "form_type=suggestion&message=Bench by the courts&email=res@example.com"` then reload → the new item's detail shows "Reply by email ↗" whose href starts `mailto:res@example.com?subject=Re:%20your%20suggestion`.
  - Stepper walk: take one item New → in progress → done; on Done tab it shows "Reopen — move back to in progress", which returns it to In progress.
  - Hash routing: open `http://127.0.0.1:8200/portal/inbox.html#done` directly → Done tab active. Arrow keys move between tabs (ArrowRight/ArrowLeft, Home/End), selection follows focus.
  - Mobile (375px window or devtools): queue fills the width; tapping an item replaces it with the detail + "‹ Back to list"; Back returns and focuses the row.
  - Screenshot `portal/inbox.html` at 375 and 1280.

- [ ] **Step 3: Quality gates + commit**

`npm test` green, `npm run lint` no errors, then:
`git commit -am "Portal redesign: inbox master-detail with filter tabs, status stepper, autosaving notes"`

---

### Task 6: Announcements (list-first + compose panel with live preview)

**Files:**
- Rewrite: `src/portal/announcements.html` (full replacement)

**Interfaces:**
- Consumes: `GET/POST /api/admin/announcements`, `PUT/DELETE /api/admin/announcements/:id`; `toast`/`confirmDialog`/`skeleton`/`el` from Task 2.
- Produces: hash behaviors the dashboard links to: `#new` opens the empty compose panel, `#edit-latest` opens the compose panel editing the newest announcement.
- The live preview mirrors the public announcement-card markup built in `src/assets/js/site.js` (`div.card` > `h3` title, `p` body, `p` date) — keep-in-sync comment included.

- [ ] **Step 1: Replace `src/portal/announcements.html` with:**

```html
---
title: Announcements — WOPHA board portal
description: Publish and edit homepage announcements.
pageKey: announcements
layout: base.njk
---
{% include "portal-shell.njk" %}
<main id="portal-main" class="section">
  <div class="container">
    <div class="portal-page-head">
      <h1>Announcements</h1>
      <button type="button" class="btn btn--primary" id="new-btn">New announcement</button>
    </div>

    <section class="portal-card portal-section" id="compose" aria-labelledby="compose-heading" hidden>
      <h2 id="compose-heading">New announcement</h2>
      <form id="compose-form">
        <input type="hidden" id="c-id" value="">
        <p>
          <label for="c-title">Title</label><br>
          <input type="text" id="c-title" maxlength="200" required style="width:100%" aria-describedby="c-title-count">
          <span class="char-count" id="c-title-count" hidden></span>
        </p>
        <p>
          <label for="c-body">Body</label><br>
          <textarea id="c-body" rows="5" maxlength="4000" required style="width:100%" aria-describedby="c-body-help c-body-count"></textarea>
          <span class="field-help" id="c-body-help">Plain text. Shown on the homepage and community page exactly as typed.</span>
          <span class="char-count" id="c-body-count" hidden></span>
        </p>
        <p>
          <label for="c-pin">Keep pinned at the top until</label><br>
          <input type="date" id="c-pin" aria-describedby="c-pin-help">
          <span class="field-help" id="c-pin-help">Optional — after this date it drops into normal order.</span>
        </p>
        <h3>Preview — how residents will see it</h3>
        <!-- MIRROR of the public announcement card built in src/assets/js/site.js
             (div.card > h3 title, p body, p date) — keep in sync. -->
        <div class="content-preview">
          <div class="card">
            <h3 id="pv-title">Title appears here</h3>
            <p id="pv-body">Body appears here.</p>
            <p id="pv-date"></p>
          </div>
        </div>
        <p>
          <button class="btn btn--primary" type="submit" id="c-save">Publish</button>
          <button class="btn" type="button" id="c-cancel">Cancel</button>
        </p>
      </form>
    </section>

    <h2 class="visually-hidden">Published announcements</h2>
    <div id="ann-list"></div>
  </div>
</main>
<script>
  (function () {
    var list = [];
    var lastTrigger = null;

    var compose = document.getElementById("compose");
    var composeHeading = document.getElementById("compose-heading");
    var form = document.getElementById("compose-form");
    var idEl = document.getElementById("c-id");
    var titleEl = document.getElementById("c-title");
    var bodyEl = document.getElementById("c-body");
    var pinEl = document.getElementById("c-pin");
    var saveBtn = document.getElementById("c-save");
    var newBtn = document.getElementById("new-btn");
    var listEl = document.getElementById("ann-list");

    function bindCounter(input, counter, max) {
      function update() {
        var n = input.value.length;
        counter.textContent = n + " / " + max;
        counter.hidden = n < max * 0.8;
        counter.classList.toggle("is-warn", n >= max);
      }
      input.addEventListener("input", update);
      return update;
    }
    var titleCount = bindCounter(titleEl, document.getElementById("c-title-count"), 200);
    var bodyCount = bindCounter(bodyEl, document.getElementById("c-body-count"), 4000);

    function updatePreview() {
      document.getElementById("pv-title").textContent = titleEl.value || "Title appears here";
      document.getElementById("pv-body").textContent = bodyEl.value || "Body appears here.";
    }
    titleEl.addEventListener("input", updatePreview);
    bodyEl.addEventListener("input", updatePreview);

    function openCompose(a, trigger) {
      lastTrigger = trigger || null;
      idEl.value = a ? String(a.id) : "";
      titleEl.value = a ? a.title : "";
      bodyEl.value = a ? a.body : "";
      pinEl.value = a ? (a.pinned_until || "") : "";
      composeHeading.textContent = a ? "Editing: " + a.title : "New announcement";
      saveBtn.textContent = a ? "Save changes" : "Publish";
      document.getElementById("pv-date").textContent =
        (a ? a.created_at : new Date().toISOString()).slice(0, 10);
      titleCount();
      bodyCount();
      updatePreview();
      compose.hidden = false;
      titleEl.focus();
    }

    function closeCompose() {
      compose.hidden = true;
      form.reset();
      idEl.value = "";
      if (lastTrigger) lastTrigger.focus();
      else newBtn.focus();
    }

    newBtn.addEventListener("click", function () { openCompose(null, newBtn); });
    document.getElementById("c-cancel").addEventListener("click", closeCompose);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError();
      saveBtn.disabled = true;
      var editing = idEl.value !== "";
      var payload = {
        title: titleEl.value,
        body: bodyEl.value,
        pinned_until: pinEl.value || null,
      };
      var req = editing
        ? api("/api/admin/announcements/" + idEl.value, { method: "PUT", body: payload })
        : api("/api/admin/announcements", { method: "POST", body: payload });
      req.then(function () {
        closeCompose();
        toast(editing ? "Saved — it's live on the site now." : "Published — it's live on the homepage now.", {
          actionLabel: "View on site ↗",
          onAction: function () { window.open("/", "_blank", "noopener"); },
        });
        load();
      }).catch(showError).finally(function () { saveBtn.disabled = false; });
    });

    function buildRow(a) {
      var row = el("div", "ann-row");
      row.appendChild(el("span", "ann-date", a.created_at.slice(0, 10)));

      var mid = el("div");
      var titleLine = el("div");
      titleLine.appendChild(el("strong", null, a.title));
      var today = new Date().toISOString().slice(0, 10);
      if (a.pinned_until && a.pinned_until >= today) {
        titleLine.appendChild(document.createTextNode(" "));
        titleLine.appendChild(el("span", "chip", "Pinned until " + a.pinned_until));
      }
      mid.appendChild(titleLine);
      var excerpt = a.body.length > 90 ? a.body.slice(0, 90) + "…" : a.body;
      mid.appendChild(el("p", "ann-excerpt", excerpt));
      row.appendChild(mid);

      var actions = el("div", "ann-actions");
      var edit = el("button", "btn btn--sm", "Edit");
      edit.type = "button";
      edit.addEventListener("click", function () { openCompose(a, edit); });
      var del = el("button", "btn btn--sm btn--danger", "Delete");
      del.type = "button";
      del.addEventListener("click", function () {
        confirmDialog("Delete \"" + a.title + "\"? It disappears from the public site immediately.")
          .then(function (yes) {
            if (!yes) return;
            api("/api/admin/announcements/" + a.id, { method: "DELETE" })
              .then(function () {
                toast("Deleted.");
                load();
              })
              .catch(showError);
          });
      });
      actions.appendChild(edit);
      actions.appendChild(del);
      row.appendChild(actions);
      return row;
    }

    function renderList() {
      listEl.textContent = "";
      if (!list.length) {
        var empty = el("div", "empty-state");
        empty.appendChild(el("p", null, "No announcements yet. Post one and it appears on the homepage."));
        var btn = el("button", "btn btn--primary", "New announcement");
        btn.type = "button";
        btn.addEventListener("click", function () { openCompose(null, btn); });
        empty.appendChild(btn);
        listEl.appendChild(empty);
        return;
      }
      list.forEach(function (a) { listEl.appendChild(buildRow(a)); });
    }

    var handledHash = false;
    function handleHash() {
      if (handledHash) return;
      handledHash = true;
      if (location.hash === "#new") openCompose(null, newBtn);
      else if (location.hash === "#edit-latest" && list.length) openCompose(list[0], newBtn);
    }

    function load() {
      listEl.textContent = "";
      listEl.appendChild(skeleton(3));
      api("/api/admin/announcements").then(function (data) {
        list = data.announcements;
        renderList();
        handleHash();
      }).catch(showError);
    }

    load();
  })();
</script>
```

- [ ] **Step 2: Verify against local dev**

Reseed, `npm run build`, `npm run dev`, open `http://127.0.0.1:8200/portal/announcements.html`:

  - List-first: no form visible; three seed rows newest-first, each with date, bold title, ~90-char muted excerpt; "Pine straw sale is on" carries a "Pinned until <date ~2 weeks out>" chip; Edit + Delete on every row.
  - Click "New announcement" → compose panel expands above the list, focus in Title, heading "New announcement", button "Publish". Type a 165-character title → the "165 / 200" counter appears; type a body → the preview card below updates live and matches the public card structure (title h3, body, date). Set a pin date. Publish → panel closes, toast "Published — it's live on the homepage now." with "View on site ↗" (opens `/` in a new tab where the new item shows in "Latest from the board"); list refreshes with the new row.
  - Edit: click Edit on the new row → heading "Editing: <title>", fields prefilled, button "Save changes", preview shows the stored date. Change the body, save → toast "Saved — it's live on the site now."; row excerpt updates.
  - Cancel: open Edit, press Cancel → panel closes, focus returns to that row's Edit button.
  - Delete: click Delete → native dialog "Delete "<title>"? It disappears from the public site immediately." with Cancel/Delete; Esc cancels; Delete removes the row, toast "Deleted.", and the item is gone from `http://127.0.0.1:8200/` after reload.
  - Deep links: `announcements.html#new` opens the empty compose on load; `announcements.html#edit-latest` opens compose editing the newest row (dashboard's Edit link).
  - Double-submit guard: on Publish the button disables until the request resolves.
  - Empty state: delete all announcements → centered "No announcements yet. Post one and it appears on the homepage." with a New announcement button. Reseed afterwards.
  - Screenshot `portal/announcements.html` at 375 and 1280 (rows stack to one column at 375).

- [ ] **Step 3: Quality gates + commit**

`npm test` green, `npm run lint` no errors, then:
`git commit -am "Portal redesign: announcements list-first compose with live public preview"`

---

### Task 7: Site content editor + Portal settings card

**Files:**
- Rewrite: `src/portal/content.html` (full replacement)

**Interfaces:**
- Consumes: `GET /api/content` (public shape + additive `updated_at` sibling — read only through `updatedAtFor()`), `PUT /api/admin/content` `{key, value: [[label,value],…]}`, `GET /api/admin/settings` / `PUT /api/admin/settings` `{key, value}` (string values); helpers from Task 2.
- Produces: nothing new — serializes to the exact `[[label,value],…]` JSON `validateContent` already enforces (1–50 rows, strings <= 200 chars). The settings card is the editing home for `dues_cents`, `dues_due_date`, `quickbooks_url`; changing dues immediately affects the ledger's prefill/outstanding math on next load, changing the URL toggles the ledger's "Open QuickBooks ↗" button.
- Previews mirror the public rendering: the `board-panel` list markup from `src/index.html` + `src/assets/js/site.js` `fill()` for `season_glance`; the `Day | Hours` table from `src/pool.html` for `pool_hours` (keep-in-sync comments included).

- [ ] **Step 1: Replace `src/portal/content.html` with:**

```html
---
title: Site content — WOPHA board portal
description: Edit the homepage season panel and pool hours.
pageKey: content
layout: base.njk
---
{% include "portal-shell.njk" %}
<main id="portal-main" class="section">
  <div class="container">
    <div class="portal-page-head">
      <h1>Site content</h1>
    </div>
    <p class="lede">Changes appear on the public site immediately — no deploy needed.</p>

    <section class="portal-card portal-section content-card" data-key="season_glance" aria-labelledby="cc-season">
      <h2 id="cc-season">Season at a glance</h2>
      <p class="field-help">Shown in the homepage "This season at a glance" panel.</p>
      <div class="row-editor"></div>
      <p><button type="button" class="btn btn--sm add-row">+ Add row</button></p>
      <h3>Preview — how residents will see it</h3>
      <div class="content-preview preview-slot"></div>
      <p>
        <button type="button" class="btn btn--primary save-btn">Save</button>
        <span class="field-error save-error" tabindex="-1" hidden></span>
      </p>
      <p class="field-help updated-note"></p>
    </section>

    <section class="portal-card portal-section content-card" data-key="pool_hours" aria-labelledby="cc-pool">
      <h2 id="cc-pool">Pool hours</h2>
      <p class="field-help">Shown in the pool page hours table.</p>
      <div class="row-editor"></div>
      <p><button type="button" class="btn btn--sm add-row">+ Add row</button></p>
      <h3>Preview — how residents will see it</h3>
      <div class="content-preview preview-slot"></div>
      <p>
        <button type="button" class="btn btn--primary save-btn">Save</button>
        <span class="field-error save-error" tabindex="-1" hidden></span>
      </p>
      <p class="field-help updated-note"></p>
    </section>

    <section class="portal-card portal-section" aria-labelledby="settings-heading">
      <h2 id="settings-heading">Portal settings</h2>
      <p class="field-help">Used by the portal itself. The dues amount drives the ledger's outstanding math and the mark-paid prefill; the QuickBooks link shows the "Open QuickBooks" button on the Dues screen when set.</p>
      <div class="portal-grid portal-grid--3">
        <p>
          <label for="set-dues">Annual dues ($)</label><br>
          <input type="number" id="set-dues" step="0.01" min="1" style="width:100%">
        </p>
        <p>
          <label for="set-due-date">Dues due date (optional)</label><br>
          <input type="date" id="set-due-date" style="width:100%">
        </p>
        <p>
          <label for="set-qb">QuickBooks URL (optional)</label><br>
          <input type="url" id="set-qb" placeholder="https://…" style="width:100%">
        </p>
      </div>
      <p>
        <button type="button" class="btn btn--primary" id="settings-save">Save settings</button>
        <span class="field-error" id="settings-error" tabindex="-1" hidden></span>
      </p>
    </section>
  </div>
</main>
<script>
  (function () {
    /* MIRROR of the public rendering: src/index.html .board-panel markup +
       src/assets/js/site.js fill() for #season-glance (li > span label +
       strong value) — keep in sync. */
    function renderGlancePreview(rows) {
      var panel = el("div", "board-panel");
      panel.appendChild(el("h3", null, "This season at a glance"));
      var ul = el("ul");
      rows.forEach(function (r) {
        var li = el("li");
        li.appendChild(el("span", null, r[0]));
        li.appendChild(document.createTextNode(" "));
        li.appendChild(el("strong", null, r[1]));
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      return panel;
    }

    /* MIRROR of src/pool.html's hours table + src/assets/js/site.js fill()
       for #pool-hours-body (tr > td day, td hours) — keep in sync. */
    function renderHoursPreview(rows) {
      var wrap = el("div", "table-wrap");
      var table = el("table");
      var thead = el("thead");
      var hr = el("tr");
      ["Day", "Hours"].forEach(function (t) {
        var th = el("th", null, t);
        th.scope = "col";
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el("tbody");
      rows.forEach(function (r) {
        var tr = el("tr");
        tr.appendChild(el("td", null, r[0]));
        tr.appendChild(el("td", null, r[1]));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      return wrap;
    }

    function updatedAtFor(content, key) {
      // Backend-seam contract: content GET gains per-key updated_at as an
      // additive sibling object: { …, updated_at: { season_glance: "…" } }.
      // If the seam shipped a different additive shape, change only this
      // accessor.
      if (content && content.updated_at && typeof content.updated_at === "object") {
        return content.updated_at[key] || null;
      }
      return null;
    }

    var cards = [
      { key: "season_glance", preview: renderGlancePreview },
      { key: "pool_hours", preview: renderHoursPreview },
    ];

    cards.forEach(function (card) {
      card.root = document.querySelector('.content-card[data-key="' + card.key + '"]');
      card.editor = card.root.querySelector(".row-editor");
      card.previewSlot = card.root.querySelector(".preview-slot");
      card.saveError = card.root.querySelector(".save-error");
      card.rows = [];

      card.root.querySelector(".add-row").addEventListener("click", function () {
        card.rows.push(["", ""]);
        renderEditor(card);
        renderPreview(card);
        var rowsEls = card.editor.querySelectorAll(".re-row input");
        if (rowsEls.length) rowsEls[rowsEls.length - 2].focus(); // new row's label input
      });

      card.root.querySelector(".save-btn").addEventListener("click", function () {
        var btn = this;
        card.saveError.hidden = true;
        var value = card.rows.filter(function (r) { return r[0].trim() || r[1].trim(); });
        if (!value.length) {
          card.saveError.textContent = "Add at least one row before saving.";
          card.saveError.hidden = false;
          card.saveError.focus();
          return;
        }
        btn.disabled = true;
        api("/api/admin/content", { method: "PUT", body: { key: card.key, value: value } })
          .then(function () {
            toast("Saved — live on the site now.");
          })
          .catch(function (err) {
            card.saveError.textContent = err.message;
            card.saveError.hidden = false;
            card.saveError.focus();
          })
          .finally(function () { btn.disabled = false; });
      });
    });

    function renderEditor(card) {
      card.editor.textContent = "";
      card.rows.forEach(function (row, i) {
        var r = el("div", "re-row");

        var label = el("input");
        label.type = "text";
        label.maxLength = 200;
        label.value = row[0];
        label.setAttribute("aria-label", "Row " + (i + 1) + " label");
        label.addEventListener("input", function () { row[0] = label.value; renderPreview(card); });

        var value = el("input");
        value.type = "text";
        value.maxLength = 200;
        value.value = row[1];
        value.setAttribute("aria-label", "Row " + (i + 1) + " value");
        value.addEventListener("input", function () { row[1] = value.value; renderPreview(card); });

        var up = el("button", "icon-btn icon-btn--up", "↑");
        up.type = "button";
        up.setAttribute("aria-label", "Move row " + (i + 1) + " up");
        up.disabled = i === 0;
        up.addEventListener("click", function () { moveRow(card, i, i - 1, "up"); });

        var down = el("button", "icon-btn icon-btn--down", "↓");
        down.type = "button";
        down.setAttribute("aria-label", "Move row " + (i + 1) + " down");
        down.disabled = i === card.rows.length - 1;
        down.addEventListener("click", function () { moveRow(card, i, i + 1, "down"); });

        var rm = el("button", "icon-btn", "×");
        rm.type = "button";
        rm.setAttribute("aria-label", "Remove row " + (i + 1));
        rm.addEventListener("click", function () {
          card.rows.splice(i, 1);
          renderEditor(card);
          renderPreview(card);
          card.root.querySelector(".add-row").focus();
        });

        r.appendChild(label);
        r.appendChild(value);
        r.appendChild(up);
        r.appendChild(down);
        r.appendChild(rm);
        card.editor.appendChild(r);
      });
    }

    function moveRow(card, i, j, dir) {
      var t = card.rows[i];
      card.rows[i] = card.rows[j];
      card.rows[j] = t;
      renderEditor(card);
      renderPreview(card);
      var moved = card.editor.querySelectorAll(".re-row")[j];
      var focusBtn = moved.querySelector(dir === "up" ? ".icon-btn--up" : ".icon-btn--down");
      if (focusBtn.disabled) focusBtn = moved.querySelector(".icon-btn");
      focusBtn.focus();
    }

    function renderPreview(card) {
      card.previewSlot.textContent = "";
      var rows = card.rows.filter(function (r) { return r[0].trim() || r[1].trim(); });
      if (!rows.length) {
        card.previewSlot.appendChild(el("p", "field-help", "Add a row to see the preview."));
        return;
      }
      card.previewSlot.appendChild(card.preview(rows));
    }

    cards.forEach(function (card) { card.editor.appendChild(skeleton(4)); });
    api("/api/content").then(function (content) {
      cards.forEach(function (card) {
        card.rows = (content[card.key] || []).map(function (r) { return [r[0], r[1]]; });
        renderEditor(card);
        renderPreview(card);
        var ts = updatedAtFor(content, card.key);
        card.root.querySelector(".updated-note").textContent = ts ? "Last updated " + ts + " (UTC)." : "";
      });
    }).catch(showError);

    /* ---------------- Portal settings ---------------- */
    var original = null;
    var duesEl = document.getElementById("set-dues");
    var dueDateEl = document.getElementById("set-due-date");
    var qbEl = document.getElementById("set-qb");
    var settingsError = document.getElementById("settings-error");

    api("/api/admin/settings").then(function (s) {
      original = s;
      duesEl.value = s.dues_cents ? (Number(s.dues_cents) / 100).toFixed(2) : "";
      dueDateEl.value = s.dues_due_date || "";
      qbEl.value = s.quickbooks_url || "";
    }).catch(showError);

    document.getElementById("settings-save").addEventListener("click", async function () {
      if (!original) return;
      var btn = this;
      settingsError.hidden = true;

      var cents = Math.round(parseFloat(duesEl.value) * 100);
      if (!isFinite(cents) || cents <= 0) {
        settingsError.textContent = "Enter the annual dues in dollars.";
        settingsError.hidden = false;
        settingsError.focus();
        return;
      }
      var qb = qbEl.value.trim();
      if (qb && qb.indexOf("https://") !== 0) {
        settingsError.textContent = "QuickBooks link must start with https://";
        settingsError.hidden = false;
        settingsError.focus();
        return;
      }

      var updates = [];
      if (String(cents) !== original.dues_cents) updates.push({ key: "dues_cents", value: String(cents) });
      if (dueDateEl.value !== (original.dues_due_date || "")) updates.push({ key: "dues_due_date", value: dueDateEl.value });
      if (qb !== (original.quickbooks_url || "")) updates.push({ key: "quickbooks_url", value: qb });
      if (!updates.length) {
        toast("No changes to save.");
        return;
      }

      btn.disabled = true;
      try {
        for (var i = 0; i < updates.length; i++) {
          await api("/api/admin/settings", { method: "PUT", body: updates[i] });
        }
        updates.forEach(function (u) { original[u.key] = u.value; });
        toast("Settings saved.");
      } catch (err) {
        settingsError.textContent = err.message;
        settingsError.hidden = false;
        settingsError.focus();
      }
      btn.disabled = false;
    });
  })();
</script>
```

- [ ] **Step 2: Verify against local dev**

Reseed, `npm run build`, `npm run dev`, open `http://127.0.0.1:8200/portal/content.html`:

  - Two cards render structured rows (six label/value pairs for the season panel, seven day/hours pairs for pool hours) — no pipe-syntax textareas anywhere. Below each editor sits a live preview: the season card shows the canopy-green board panel, the pool card a Day/Hours table, both matching the public pages' look.
  - Edit "2026 annual dues" value to `$550` → the preview's gold value updates as you type. Save → toast "Saved — live on the site now."; open `http://127.0.0.1:8200/` → the homepage panel shows $550. (Restore to $535 and save again.)
  - Reorder: click the ↓ on the first pool-hours row → row swaps with the second in the editor and the preview; focus stays on the moved row's ↓ button. Remove a row (×) then "+ Add row" and retype it; save; verify on `http://127.0.0.1:8200/pool.html`.
  - Validation: remove every row of a card, Save → inline "Add at least one row before saving." receives focus; no toast, no request.
  - Updated footer: after a save, reload the page → the card's footer reads "Last updated <timestamp> (UTC)." (requires the backend seam's `updated_at`; if the footer stays empty, check the actual GET shape against `updatedAtFor()` and record the discrepancy).
  - Portal settings: fields show `535.00`, empty date, empty URL (seeded values). Set dues to `550.00`, date to next March 31, URL to `https://qbo.intuit.com/app/homepage`, Save → toast "Settings saved.". Then: `http://127.0.0.1:8200/portal/ledger.html` → the mark-paid popover now prefills `550.00`, outstanding math uses $550, and "Open QuickBooks ↗" is visible. Clear the URL + restore dues to `535.00`, Save, confirm the button hides again.
  - Validation: dues `0` → inline "Enter the annual dues in dollars."; URL `http://insecure` → inline https message. Clicking Save with no changes → toast "No changes to save." and zero network requests (check devtools).
  - Screenshot `portal/content.html` at 375 and 1280 (row editor collapses to two columns + remove button at 375).

- [ ] **Step 3: Quality gates + commit**

`npm test` green, `npm run lint` no errors, then:
`git commit -am "Portal redesign: structured content editor with live previews + portal settings card"`

---

### Task 8: Retire portal.js, drop legacy CSS, accessibility sweep, final verification

**Files:**
- Delete: `src/portal/portal.js`
- Modify: `src/assets/css/portal.css` (remove the LEGACY block)

- [ ] **Step 1: Delete the superseded helper file**

```powershell
git rm src/portal/portal.js
```

Then confirm nothing references it: `git grep -n "portal.js" -- src` must return only `portal-shell.js` matches (the shell include's script tag and this file's own name; the root `portal/` and `assets/` directories no longer exist after the tooling plan). If the tooling plan's passthrough config names `src/portal/portal.js` explicitly, update that entry to `src/portal/portal-shell.js`.

- [ ] **Step 2: Remove the legacy CSS block**

In `src/assets/css/portal.css`, delete this entire block (added in Task 1; nothing renders these classes anymore):

```css
/* ==========================================================================
   LEGACY (pre-redesign page bodies) — DELETE THIS WHOLE BLOCK IN TASK 8.
   Keeps not-yet-rewritten pages usable while the shell ships first.
   ========================================================================== */
.portal-nav { display: flex; gap: 1rem 1.5rem; flex-wrap: wrap; margin: 1rem 0 2rem; }
.portal-nav a { font-weight: 600; }
.portal-error:empty { display: none; }
.portal-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: end; margin: 1rem 0; }
.portal-actions > div { display: flex; flex-direction: column; gap: 0.25rem; }
```

Confirm with `git grep -n "portal-nav\|portal-actions" -- src assets` → no matches.

- [ ] **Step 3: Accessibility sweep (spec §8, all five pages)**

With the dev server running, on each of `portal/`, `portal/announcements.html`, `portal/inbox.html`, `portal/ledger.html`, `portal/content.html`:

  - **Skip link:** Tab once from the address bar → "Skip to main content" is visible; Enter jumps focus/scroll to `#portal-main`.
  - **Sidebar:** `nav` has `aria-label="Portal"`; exactly one link carries `aria-current="page"` and it matches the page; the inbox badge is supplementary text ("Inbox 2"), not color-only.
  - **Keyboard-only pass (no mouse):** complete each page's primary workflow — dashboard: reach all three KPI links and the export button; ledger: step year, reach a Mark paid button, complete the popover with Enter/Tab, Esc from the popover returns focus to the trigger; inbox: arrow between tabs, select an item, advance status, type + blur notes; announcements: open compose, publish, open + Esc the delete dialog (focus returns to Delete); content: reorder rows, save.
  - **Live regions:** toasts (`#portal-toast`) have `role="status"`; the inbox "Saved ✓" note has `role="status"`; the import preview and result banner have `role="status"`; the page-top `#error` has `role="alert"` and receives focus when shown.
  - **Tables:** every `<table>` has a `caption` (visually hidden is fine) and `th scope="col"`; at <720px collapsed rows show their `data-label` text captions.
  - **Targets:** in devtools, spot-check computed heights of `.btn--sm`, `.icon-btn`, `.queue-item`, segmented options, stepper buttons — all >= 44px.
  - **No color-only status:** every badge shows its status word; paid rows are distinguishable by the badge text alone.
  - **Contrast spot-check** (devtools contrast tooltip): the four badge pairs (`--warn` on `--warn-bg`, `--info` on `--info-bg`, `--ok` on `--ok-bg`, `--danger` on `--danger-bg`) each report >= 4.5:1, as do sidebar text on pine and toast text on pine.
  - **Reduced motion:** with "prefers reduced motion" emulated, skeletons don't shimmer and the drawer doesn't animate (the global kill rule in `styles.css` covers both — just confirm it still applies).

- [ ] **Step 4: Full regression walk on seed data**

Reseed, `npm run build`, `npm run dev`, then in order: dashboard KPIs correct (2/5, $1,070, 2 new, 5 households) → quick action "Post announcement" lands in open compose → publish → homepage shows it → inbox: triage one item to done → dashboard "Needs attention" drops to one after reload → ledger: mark paid, undo via toast, import one household → exports: all five files download → content: edit + save pool hours, verify on `pool.html` → settings round-trip. The service worker must not interfere: `/portal/` and `/api/` are bypassed in `src/sw.js` (pre-existing behavior — verify portal pages always hit the network in devtools).

- [ ] **Step 5: Screenshot set**

Screenshot all five portal pages at 375 and 1280 (ten images) using the header procedure; check: no horizontal scroll at 375, tables collapsed to labeled cards, sidebar fixed at 1280, drawer closed by default at 375.

- [ ] **Step 6: Quality gates + commit**

`npm test` green (still the full suite — this track added no backend code), `npm run lint` no errors, `git status` shows only intended changes, then:
`git commit -am "Portal redesign: retire portal.js, drop legacy CSS, a11y sweep"`

---

## Decisions & known contract gaps (for reviewers)

1. **Summary lacks the latest announcement's `id`** — the contract adds only `adminEmail` + `collectedCents`, and `latestAnnouncement` stays `{title, created_at}`. The dashboard's Edit link therefore uses the `#edit-latest` hash, which the announcements page resolves against its own list (admin GET and summary use the same `created_at DESC` ordering, so they agree). No backend change requested.
2. **`updated_at` shape in the content GET is assumed** to be an additive sibling object (`{…, updated_at: {key: ts}}`) because the public site consumes `content[key]` directly and the backend track is additive-only; the assumption is isolated in `updatedAtFor()` and called out in Task 7's verify step.
3. **Import preview matches server semantics, not just parse rules:** duplicate addresses inside one CSV count as updates (server: insert + `ON CONFLICT` update on the second row), adds/updates split by exact-match (case-sensitive) address against the roster — mirroring SQLite's default BINARY collation on the `UNIQUE(address)` column.
4. **`.btn--sm` keeps 44px min-height** despite being "small" — spec §8's >= 44px target rule outranks visual density; smallness comes from padding/font-size.
5. **Mobile hides the row-editor's up/down buttons** (<640px) to keep rows usable; add/remove/edit still work. Reordering is a desktop task in practice.
6. **QBO runbook text** embeds the double-count warning verbatim from the spec's input proposal ("If your bank feed already brings in dues deposits, use the Payments file as a reference — don't import it as transactions") and the "once per year" invoice rule with the deterministic `WOPHA-<year>-<id>` rationale.
7. **Toast Undo re-renders the ledger tbody** (client-side only, no refetch) when the original row node is gone; direct row Undo replaces the single row in place.
8. **Settings failures on the ledger page surface via the page-top banner** rather than being swallowed — "every fetch failure produces a visible, focusable message" outranks the temptation to treat the QuickBooks button as optional chrome.

