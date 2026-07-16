# WOPHA Board Portal Redesign — "Modern Civic" Admin

Design proposal for the private board portal (`/portal/*`). Planning only — no production code.
Grounded in the current implementation: `portal/*.html` + `portal/portal.js`, `assets/css/portal.css` on top of `assets/css/styles.css`, backed by `functions/api/admin/*` (D1 tables: `announcements`, `submissions`, `households`, `payments`, `site_content`; Cloudflare Access as the gate).

**Design intent in one line:** a volunteer who logs in twice a month should land, see what needs attention, do the one thing they came for in under a minute, and trust that nothing broke.

---

## 1. Portal IA / navigation

### App shell: persistent left sidebar (desktop), collapsing top bar (mobile)

Move from the current inline text-link bar to a real app shell. The shell instantly signals "you are in the admin tool, not the public site," gives every screen the same frame, and creates room for identity + sign-out.

```
┌──────────────┬──────────────────────────────────────────────┐
│  WOPHA        │  Page title            [Quick action button] │
│  Board portal │──────────────────────────────────────────────│
│               │                                              │
│  ⌂ Dashboard  │              page content                    │
│  ✎ Announce-  │                                              │
│    ments      │                                              │
│  ☷ Inbox (3)  │                                              │
│  $ Dues &     │                                              │
│    households │                                              │
│  ⚙ Site       │                                              │
│    content    │                                              │
│  ─────────────│                                              │
│  ↗ Public site│                                              │
│  jane@…       │                                              │
│  Sign out     │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

- **Sidebar:** Pine (`--pine #1F3D2B`) background, Birch/white text — mirrors the public site's dark header so the two products read as siblings. Active item gets a Poolwater left rail + tinted background. Width ~230px, fixed.
- **Badge counts** on Inbox (new submissions) — the one number that changes between visits. Sourced from the summary endpoint, cached per page load. No other badges; badge inflation kills trust.
- **Identity block** at the bottom: the signed-in email (Cloudflare Access provides `cf-access-authenticated-user-email`; the middleware already extracts it — expose it by adding `adminEmail` to the `/api/admin/summary` response or a tiny `/api/admin/whoami`). Sign out links to `/cdn-cgi/access/logout`. Volunteers share laptops; a visible "who am I / get me out" matters.
- **Mobile (<900px):** sidebar becomes a top app bar (portal wordmark + hamburger opening a full-height nav drawer). No bottom tab bar — five destinations plus utilities won't fit, and board members are mostly on laptops.

### Screen inventory (5 top-level destinations — unchanged count, one regrouped)

| Nav item | URL | What it holds |
|---|---|---|
| Dashboard | `/portal/` | KPIs, attention list, quick actions, backup/export |
| Announcements | `/portal/announcements.html` | Compose + published list |
| Inbox | `/portal/inbox.html` | Submissions triage (list + detail) |
| Dues & households | `/portal/ledger.html` | **Tabs:** Ledger · Households · Exports |
| Site content | `/portal/content.html` | Editable homepage/pool blocks |

**Decision: do NOT split Ledger into separate nav pages.** In this data model a "payment" is not a thing board members think about independently — it's the paid/unpaid state of a household for a year (the API enforces `UNIQUE(household_id, year)`). Splitting Households and Payments into separate nav items would force cross-navigation for the single most common task ("did 123 Planters Way pay? mark it paid"). Instead, one nav destination **"Dues & households"** with three in-page tabs:

1. **Ledger** (default) — the per-year paid/unpaid table with mark-paid actions. This is the money screen.
2. **Households** — the roster itself: view/edit contact info, CSV import. Roster maintenance is occasional; it shouldn't crowd the money view (today the import form sits awkwardly below the ledger table).
3. **Exports** — CSV downloads, QuickBooks entry points (see §5).

Tabs are real URL fragments (`ledger.html#households`) so links are shareable and back-button works.

**Rename "Inbox" stays** — it's the right metaphor. "Site content" stays last; it's the least-used screen.

---

## 2. Screen-by-screen UX

### 2.1 Dashboard (see §3)

### 2.2 Announcements

**Layout:** list-first. The published list is the main content; composing is an action, not a permanent form squatting at the top of the page (today the empty form is the first thing you see even when you came to check what's posted).

- **Header:** "Announcements" + primary button **"New announcement"**.
- Clicking it (or Edit on a row) opens a **compose panel** — an inline card that expands above the list (not a modal; volunteers lose modals behind windows, and inline keeps the published list visible for reference). Same panel for new + edit, exactly like today's hidden-id pattern, but visually distinct: white card, Poolwater top border, "Editing: <title>" header when editing.
- **Compose fields:**
  - Title (200-char counter appears at 160+).
  - Body textarea (4000-char counter) with helper text *"Plain text. Shown on the homepage and community page exactly as typed."*
  - "Keep pinned at the top until" date input with helper *"Optional — after this date it drops into normal order."*
  - **Live preview** below the fields: renders the announcement in the public site's announcement-card style. This is the single highest-value addition for non-technical users — they see exactly what residents will see before they hit Publish.
  - Buttons: **Publish** (Poolwater primary) / **Save changes** when editing, Cancel.
- **Published list:** table → card-rows. Each row: date, title (bold), first ~90 chars of body in muted ink, "Pinned until Mar 15" chip when applicable, kebab-free explicit actions: **Edit** · **Delete**. Delete opens a small `<dialog>` confirm: *"Delete '<title>'? It disappears from the public site immediately."* (soft-delete on the backend already; still frame it as destructive).
- **Success feedback:** toast *"Published — it's live on the homepage now"* with an "View on site ↗" link. Closes the loop; today publishing gives no confirmation beyond the list refreshing.
- **Empty state:** "No announcements yet. Post one and it appears on the homepage." + New announcement button.

**Primary workflow — post an announcement:** land → New announcement → type title + body → glance at preview → Publish → toast. 4 interactions, no navigation.

### 2.3 Inbox

Today: a filter dropdown and a stack of cards, each with its own status `<select>` and notes textarea. Functional but noisy — every item shows editing chrome whether or not you're working it.

**New layout: split view (master–detail).**

- **Left column (~360px): the queue.** Compact rows: form-type label ("Exterior change request", "Suggestion"…), submitter name/address pulled from `fields` when present, date, status badge. Selected row highlighted.
- **Filter tabs above the queue** instead of a dropdown: **New (3) · In progress (1) · Done · All** — with counts. Default = New (matches current default). Counts come from a cheap client-side count on the unfiltered fetch, or a small `?counts=1` addition to the submissions endpoint.
- **Right column: the detail pane** for the selected item:
  - Header: type + date + status badge.
  - Submitted fields as a clean definition list (today's `<dl>`, styled: labels in small caps ink-soft, values in ink).
  - **Status stepper** — instead of a raw select, one contextual advance button: `New → [Start working on this]`, `In progress → [Mark done]`, plus a small "move back" link. The three-state pipeline is linear; give it linear controls. (Backend PATCH unchanged.)
  - **Board notes**: textarea with **autosave on blur** (PATCH `notes`) and a quiet "Saved ✓" timestamp. Kill the explicit Save button — it's the #1 lost-work risk today (type notes, forget to click Save).
  - Reply affordance: a `mailto:` **"Reply by email ↗"** button when the submission includes an email field — zero backend work, real value for triage.
- **Mobile:** queue is the screen; tapping an item pushes the detail (back button returns).
- **Empty states per tab:** New → "Inbox zero — nothing new from residents." Done → "Nothing marked done yet."

**Primary workflow — triage an item:** land on New tab → click item → read → "Start working on this" or type a note (autosaves) → next item. Status changes should NOT reload/refilter the whole list out from under you — update the row in place, keep selection, show the item moving tabs only on tab switch.

### 2.4 Dues & households

The most business-critical screen. Three tabs:

#### Tab: Ledger (default)

- **Header row:** Year selector (`◀ 2026 ▶` stepper + number input — a stepper beats a bare number field), then a compact **summary strip** styled as three inline stats: *42 of 61 paid · $22,470 collected · $10,165 outstanding* (data already in `households?year=` response). A slim progress bar under "paid" gives the at-a-glance read.
- **Toolbar:** search box (filters by address/owner as-you-type, client-side — the dataset is ~60–200 rows), and a **Paid / Unpaid / All** segmented filter. "Show unpaid" is the treasurer's real working view; make it one click.
- **The table:** Address · Owner · Status · Method · Date · [action]. Drop the Email column from this tab (it's roster data, lives in Households tab; today's 7-column table is the cramped one). Right-align nothing here (no numeric columns after amount moves into the popover); status badge column uses text + color.
- **Mark paid — the key interaction.** Replace today's "global defaults row + Mark paid button per row" (easy to not notice the defaults apply) with a **popover per row**: clicking **Mark paid** opens a small anchored popover pre-filled with *Amount $535.00 · Method: Check · Date: today* and a **Confirm** button. Defaults come from `dues_cents` in the API response (single source of truth — stop hardcoding 535.00 in the HTML). 90% of the time it's confirm-and-done (2 clicks); the other 10% (partial payment, Zelle, backdated) edit in place. A "note" field is in the popover too — the payments table has a `note` column the current UI never exposes.
- **Undo:** recorded payment → row flips to paid + **toast with "Undo" action** (calls DELETE). The explicit per-row "Undo" button remains for later reversals but moves behind the row's paid-status area with a confirm dialog (unchanged semantics, DELETE is destructive).
- **409 handling** ("Already marked paid for that year") surfaces as an inline row message, not a page-top banner.

**Primary workflow — record a payment:** open portal → Dues → find row (search "planters") → Mark paid → Confirm → toast. ~15 seconds.

#### Tab: Households

- Roster table: Address · Owner · Email · Phone · [Edit]. **Inline row edit** (row swaps to inputs, Save/Cancel) — needs a small backend addition (PUT `/api/admin/households/:id`) or reuse of the CSV upsert with a single row; flag for build.
- **Import households** as a card at the top, redesigned:
  - Two inputs: **file picker** (reads the CSV client-side into the textarea) *and* the paste textarea — treasurers email spreadsheets around; picking the file beats open-copy-paste.
  - **Preview before commit:** parse client-side (mirror of `parseHouseholdsCsv` logic) and show *"Will add 3 new households, update 58 existing. 1 row skipped (empty address)."* with the first few rows rendered. Then **Import** posts as today. The backend upsert-never-delete behavior is great — say it in the UI: *"Existing addresses are updated, new ones added. Nothing is ever deleted."*
  - Result banner repeats the server's imported/skipped counts.
- Add-single-household mini form ("+ Add household": address, owner, email, phone) — posting a one-row CSV works today with zero backend change.

#### Tab: Exports

Card list, each with a one-line explanation:
- **Ledger CSV (all households)** — `ledger-export?year=Y`
- **Unpaid households CSV** — `ledger-export?year=Y&only=unpaid` — *"for reminder letters"*
- **QuickBooks section** — see §5.
- Year follows the Ledger tab's year selector.

### 2.5 Site content

Today: two raw textareas in `label | value` line format. The pipe syntax is programmer UX — replace it.

- **One card per content key** (Season at a glance; Pool hours), each with:
  - **Structured row editor:** each row = two inputs `[label] [value]` + remove button; "+ Add row" appends; drag-handle ordering is *not* worth the complexity — up/down arrow buttons per row suffice.
  - **Live preview** of the actual public rendering (the canopy-green "board panel" for season_glance; the pool-hours table) so editors see the result.
  - Save button per card + toast *"Saved — live on the site now."* (The current copy "no deploy needed" is good; keep the reassurance: **"Changes appear on the public site immediately."**)
- Data model unchanged: the editor serializes to the same `[[label, value], …]` JSON the PUT endpoint validates.
- Footer note: last updated timestamp (`site_content.updated_at` — needs the GET to return it, or read from the admin export; small backend flag).

---

## 3. Dashboard design

The dashboard answers exactly three questions in five seconds: **Is anything waiting on me? How are dues doing? Is the site saying the right thing?** — then offers the fast paths.

```
┌────────────────────────────────────────────────────────────┐
│ Good morning. Here's where things stand.        [year 2026]│
│                                                            │
│ ┌───────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│ │ DUES 2026     │ │ INBOX        │ │ HOUSEHOLDS         │  │
│ │ 42 / 61 paid  │ │ 3 new items  │ │ 61 on file         │  │
│ │ ▓▓▓▓▓▓▓░░ 69% │ │ → Triage     │ │ → Manage roster    │  │
│ │ $22,470 in    │ │              │ │                    │  │
│ └───────────────┘ └──────────────┘ └────────────────────┘  │
│                                                            │
│ Needs attention                                            │
│ • Exterior change request — 123 Oak Ct — 2d ago   [Open]   │
│ • Suggestion — pool furniture — 5d ago            [Open]   │
│                                                            │
│ ┌ Latest announcement ─────────────┐ ┌ Quick actions ────┐ │
│ │ "Pool opens May 23" · Jul 2      │ │ + Post announcement│ │
│ │ pinned until Jul 20              │ │ $ Record a payment │ │
│ │ [Edit] [View on site ↗]          │ │ ⤓ Import households│ │
│ └──────────────────────────────────┘ └───────────────────┘ │
│                                                            │
│ Backup & data ─ Download full data export (JSON) ⤓         │
│ "Everything the portal stores, in one file. Download one   │
│  after big changes and keep it with board records."        │
└────────────────────────────────────────────────────────────┘
```

- **Three KPI cards** (from `/api/admin/summary`, one request):
  1. **Dues** — "42 / 61 paid for 2026" + progress bar + collected dollars. Requires adding `collectedCents` to summary (one query; flag for build). Card links to Ledger.
  2. **Inbox** — "3 new items" in Clay accent when >0, calm ink when 0 ("Inbox is clear"). Links to Inbox.
  3. **Households** — count on file, links to Households tab.
- **"Needs attention" list** — the 3 most recent `new` submissions (type, short extract, age). This converts the dashboard from a scoreboard into a to-do list. Needs either a `limit` param on submissions GET or just fetch `?status=new` and slice client-side (fine at this scale).
- **Latest announcement card** with Edit shortcut + public-site link — the "is the site saying the right thing?" check.
- **Quick actions card:** *Post announcement* (→ announcements with compose open, `#new` fragment), *Record a payment* (→ ledger), *Import households* (→ households tab). Exactly three; quick-action sprawl is how admin dashboards die.
- **Backup & data** — a full-width quiet card at the bottom, not a bare link: the JSON export button plus one sentence of purpose. Optionally show "last downloaded" via `localStorage` as a gentle nudge (no backend).

---

## 4. Component & visual system for admin

Principle: **the portal is the public site's back office, not a different brand.** Same palette, same type, same radius/shadow tokens — but denser, quieter, more utilitarian. Extend `styles.css` tokens in `portal.css`; never fork them.

### Token layer (added in portal.css)

```css
:root {
  --surface: var(--white);            /* cards, table bg */
  --surface-sunken: var(--birch);     /* page bg stays birch */
  --portal-density: 0.9;              /* admin type runs slightly smaller */
  --ok: #2e7d4f;      --ok-bg: #e3f2e8;      /* paid / done   (green, derived from canopy) */
  --warn: #8a5a00;    --warn-bg: #fdf0d3;    /* new / pending (amber) */
  --info: #17567f;    --info-bg: #e2eef5;    /* in progress   (poolwater-adjacent) */
  --danger: #a13324;  --danger-bg: #fbe7e2;  /* unpaid / errors (clay-adjacent) */
}
```

All fg/bg pairs chosen to clear WCAG AA (4.5:1) — the current badge colors (`#fde68a` etc. with default text) don't guarantee that.

- **Type:** Fraunces stays for the H1 page title and KPI numbers only (civic warmth where it counts). Everything else Public Sans. Base 1rem (vs public 1.0625) — admin is denser.
- **Poolwater remains the only action color** (buttons, links, active nav) per the existing stylesheet rule. Clay for the "needs attention" accent and eyebrows only.

### Components

| Component | Spec |
|---|---|
| **Data table** | White surface card containing the table; sticky header row (birch-dark bg, 0.75rem uppercase ink-soft labels); row hover tint; 0.5rem/0.75rem cell padding as today; numeric cells right-aligned tabular-nums; sortable columns are *not* needed at this scale except Ledger Address/Status. **Mobile:** rows collapse to stacked cards (`display:block` pattern with `data-label` pseudo-headers) — the current table is unusable on phones. |
| **Status badge** | Pill, `--*-bg` background + `--*` text, always with a text label (never color-only). Set: `new`(warn) `in progress`(info) `done`(ok) `paid`(ok) `unpaid`(danger). One shared `.badge` API as today, recolored. |
| **Forms** | Labels above fields (as today), helper text in ink-soft below label, error text in danger below field + `aria-describedby`. Character counters for maxlength fields. 44px min control height. |
| **Buttons** | Reuse `.btn`, `.btn--primary`, `.btn--outline`. Add `.btn--danger` (danger color, confirm-gated actions) and `.btn--sm` for in-table actions. One primary button per screen region. |
| **Toast** | Single bottom-left toast, `role="status"` `aria-live="polite"`, auto-dismiss 5s, optional action slot ("Undo", "View on site ↗"). Success + info only. |
| **Error banner** | Errors stay **inline near the action that failed** (row message, field error) when scoped; the page-top `#error` banner remains only for fetch/auth failures ("session expired — sign in again"), now with a Reload button. `role="alert"`. |
| **Modal vs inline** | Default to **inline panels and popovers**. `<dialog>` (native) reserved for destructive confirms only (delete announcement, remove payment). Never a modal for data entry. |
| **Popover** | Anchored mini-form (mark-paid). Escape closes, focus moves in on open and returns to trigger on close. |
| **Empty state** | Centered in the content region: one sentence + one CTA button. Every list screen has one. |
| **Loading** | Skeleton rows (3 shimmering bars) for tables/lists on first load; button spinners + `disabled` during mutations to prevent the double-submit the current UI allows. |
| **KPI card** | White card, small uppercase label, Fraunces number, optional progress bar (4px, poolwater on birch-dark) and sub-line. |
| **Tabs** | Underline style, poolwater active indicator, counts in parens; `role="tablist"` semantics; drives URL hash. |

---

## 5. QuickBooks touchpoint (entry points only)

Two homes, both in **Dues & households**:

1. **Ledger tab header, right side:** a quiet outline button **"Open QuickBooks ↗"** — external link (target `_blank`, rel noopener) to the association's QB account. It sits beside the export shortcut so the treasurer's two systems meet in one place. If a per-household QB customer link ever exists, the paid-row detail popover gets a "View in QuickBooks ↗" line — placeholder only for now.
2. **Exports tab:** a **QuickBooks card** alongside the CSV cards: **"Export for QuickBooks"** button (points at the future endpoint the sibling agent designs, e.g. `/api/admin/qb-export?year=Y`) with one line of copy: *"Payments for {year} formatted for QuickBooks import."* Dashboard's Backup card does **not** mention QB — keep the dashboard system-agnostic.

Nothing else. QuickBooks is the treasurer's tool; the portal offers a door, not an embassy.

---

## 6. Before → after, build notes, accessibility

### Key differences

| Area | Today | Proposed |
|---|---|---|
| Navigation | Inline text-link bar repeated per page | Persistent pine sidebar app shell w/ active state, inbox count, identity + sign-out |
| Identity | Invisible (Access only) | Signed-in email shown; sign-out link |
| Dashboard | 3 bare stats + latest title + export link | KPI cards w/ progress, "needs attention" queue, quick actions, framed backup card |
| Announcements | Always-open form above table | List-first; compose panel on demand; live public preview; toast w/ site link |
| Inbox | Card stack, per-card select + manual notes save | Split-view queue/detail, filter tabs w/ counts, one-click status stepper, autosaving notes, mailto reply |
| Ledger | One page: 7-col table + global defaults row + import form below | Tabbed: Ledger (search, paid/unpaid filter, per-row mark-paid popover w/ note field, undo toast) · Households (inline edit, import w/ preview, add-one) · Exports |
| Payment note field | Exists in schema, unreachable in UI | Editable in mark-paid popover |
| Dues amount | Hardcoded `535.00` in HTML | Read from API `dues_cents` |
| Site content | `label \| value` pipe-syntax textareas | Structured label/value row editor + live preview |
| Feedback | Page-top error div; "Saved ✓" text swaps | Toasts, inline errors, skeletons, disabled-while-saving |
| Mobile | Tables overflow, unusable | Nav drawer; tables collapse to cards; inbox master→detail push |
| Badges | Ad-hoc hex pastels | Semantic AA-compliant status tokens derived from palette |

### Migration / build notes

- **Keep static HTML + fetch. No framework.** The portal is 5 screens, one maintainer, no build step, and Cloudflare Pages static hosting. React/Vue would add a toolchain a future volunteer can't maintain. The right investment:
  - **`portal-shell.js`** (new, ~150 lines): injects the sidebar/app-bar from one template, sets active state, fetches summary once for the inbox badge + identity, and exports the shared `api()`, `toast()`, `confirmDialog()`, `skeleton()` helpers. Each page keeps its own inline (or per-page `.js`) logic — today's pattern, just with a real shared layer replacing copy-pasted nav markup in 5 files.
  - **`portal.css`** grows from 15 lines to ~350: shell, tokens, table, badge, toast, tabs, popover, dialog, skeleton, responsive collapse. Still layered on `styles.css`, still no preprocessor.
  - **`<template>` elements** in each page for repeated row markup; keeps the DOM-building JS readable without a templating lib.
- **Small backend additions** (each ~10 lines, keep the 27-test suite green and extend it): `adminEmail` + `collectedCents` in `summary.js`; optional `PUT /api/admin/households/:id` for inline roster edit; `updated_at` in content GET; the QB export endpoint arrives from the sibling workstream.
- **Sequencing:** ship the shell + dashboard first (visible win, zero data-logic risk) → ledger tabs + mark-paid popover → inbox split view → announcements compose/preview → content editor. Each step is one page, independently deployable; old and new pages coexist because they share auth and API.
- **No data migration.** Schema untouched.

### Accessibility (WCAG 2.2 AA)

- Keep the existing strengths: `:focus-visible` outline, `prefers-reduced-motion`, skip link (add one to portal pages — currently missing), semantic headings.
- Sidebar = `<nav aria-label="Portal">`, current page marked `aria-current="page"`.
- Tabs, dialogs, popovers per ARIA APG: focus trap in `<dialog>`, focus return to trigger, Escape everywhere.
- Toasts `role="status"`; error banners `role="alert"`; autosave confirmation announced via live region (invisible feedback is a screen-reader trap).
- Tables: `<th scope="col">`, captions (`visually-hidden` ok); card-collapsed mobile rows keep label association via `data-label` text, not CSS-only.
- Status never conveyed by color alone (badge text; paid rows are not merely tinted).
- All targets ≥ 44×44 CSS px incl. in-table buttons; type ≥ 16px base.
- Every fetch failure produces a visible, focusable message with a retry path — "silent nothing happened" is the worst accessibility bug the current portal has (e.g., expired Access session mid-edit).
