# Proposal & Pricing Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three-tier SaaS pricing as private board-facing content (proposal addendum + presentation artifact) plus the portal "Plan & billing" page, all rendered from one tier-data source so the numbers cannot drift, with hard gates keeping every price off the public site and off the open demo deploys.

**Architecture:** One JSON constants file (`src/_data/pricing.json`, an Eleventy global-data file that is baked into the billing page at build time and never emitted to `_site`) is the single source of tier truth. A vitest suite recomputes every net figure from the line items and greps the two docs deliverables for the tier names and gross prices, so any edit to the data flags every stale consumer. The billing page is a normal portal page (portal-base.njk + pageKey) with a tiny settings-pattern editor for a new `plan` key; the addendum and artifact are authored files under `docs/` (never deployed). A privacy gate script scans the built public pages for pricing markers, and the launch checklist gains the demo-deploy exclusion for `portal/billing.html`.

**Tech Stack:** Eleventy 3 (Nunjucks templates, global data), Cloudflare Pages Functions + D1 (existing settings API), vanilla JS portal scripts (`var` house style), vitest, eslint, Git Bash for grep gates.

**Spec:** `docs/superpowers/specs/2026-07-17-saas-pricing-amenities-design.md` §2 ([F1]-[F6], [V1]-[V3]), §3 (tiers), §4 (deliverables), §6.1 (Weebly), §6.4 (camera), §10 item 3/4.

**Coordination:** The booking-engine track adds a "Bookings" sidebar item before this track lands. This plan therefore inserts "Plan & billing" as the LAST item in the sidebar nav, never at a counted position. No other file collides with the other tracks (they own `/sponsors/`, `/about/` safety block, bookings API/pages).

## Global Constraints

- Copy rules for ALL user-visible text: no em dashes; no governance/volunteer editorializing; page titles use the "Page | Woods of Parkview HOA" pipe style.
- Nothing tier/price/SaaS-commercial in public src/ pages; billing page under /portal/ only, noindex inherited from the portal layout.
- Money is integer cents in code (existing convention) — the `plan` settings value and any tier-price data in code follow it; display formatting matches the portal's existing money helpers. (The `plan` value itself is a tier id string, not money; all `*_cents` fields in `pricing.json` are integers.)
- Dynamic DOM rendering uses textContent only (never innerHTML with user/db data); isConnected/capture guards convention.
- WCAG 2.2 AA.
- TDD with vitest for code tasks (suite currently 76 green: `npm test`); eslint clean; frequent commits.
- Eleventy: src/ → _site via `npm run build`; portal pages use portal-base.njk with pageKey front matter.
- Dev ports 8200-8202 ONLY (Hyper-V reserves 8078-8177/8278-8777/8779-8978).
- Branch `redesign-experiment`; commit style per git log (`feat:`/`docs:`/`chore:` prefixes).
- Never push `master` or `redesign-experiment`; `docs/` never reaches the `deploy` branch or any Pages deploy.

## Locked decisions

1. **Tier data source: `src/_data/pricing.json`.** Eleventy's default data directory is `_data` inside the input dir, so the file becomes global data `pricing` available to Nunjucks-rendered pages. Data files are NOT copied to `_site`, so the JSON itself never ships; only the billing page's baked HTML carries prices, and that page is portal-only. The addendum and artifact copy the same numbers by hand, enforced mechanically by `tests/pricing.test.js` (recomputed net math + docs grep).
2. **`plan` settings key:** added to `SETTING_KEYS` with allowlist validator `PLAN_KEYS = ["essentials", "amenities", "complete"]` (empty string clears, same as the other optional keys). `PLAN_KEYS` must equal the tier ids in `pricing.json`; a test enforces it. The plan editor UI lives ON the billing page (same capture-and-compare PUT pattern as the content.html settings card), keeping content.html untouched. One-way philosophy like the QuickBooks seam: no Stripe API, the board records the plan manually after subscribing.
3. **Billing-page privacy mitigation (the deployment caveat):** live demos (production `wopha-website.pages.dev` and `redesign-preview.wopha-website.pages.dev`) run with `DEMO_OPEN_ADMIN=1` and no Cloudflare Access; portal HTML is publicly served there. Therefore: **while any demo deploy runs without Access, `portal/billing.html` is deleted from the deploy staging copy's `public/` directory before `wrangler pages deploy`.** The sidebar link falls back to the index page on demos (the deploy has no 404.html; unknown paths serve index content), which leaks nothing. A launch-checklist §7 edit records both the exclusion and the post-Access re-inclusion step (Task 6). `docs/` is outside Eleventy's input dir, so the addendum and artifact can never reach `_site` by construction.
4. **Artifact flow:** `docs/pricing-artifact.html` is versioned in the repo (docs/ never deploys) and published PRIVATELY via the harness Artifact tool at execution time, exactly like the typeface-comparison artifact. No repo deployment, no public URL in the repo. If the task's implementation subagent lacks the Artifact tool, the orchestrating session performs the publish step itself.
5. **Verification items [V1]-[V3] are the user's job.** The proposal text marks those figures as pending and claims $0 until verified; nothing in this plan blocks on them.

## File structure

```
Created:
  src/_data/pricing.json                  single-source tier data (draft prices, line items, nets, Stripe link slots)
  tests/pricing.test.js                   shape + arithmetic + docs-sync tripwire
  src/portal/billing.html                 portal Plan & billing page (pageKey: billing)
  docs/board-proposal-addendum-2.md       the 3-tier proposal (never deployed)
  docs/pricing-artifact.html              board-meeting pricing one-pager (published privately via Artifact tool)
  tools/check-pricing-privacy.mjs         grep gate: no pricing markers on built public pages

Modified:
  functions/api/_lib/validate.js          SETTING_KEYS + PLAN_KEYS + plan branch in validateSetting
  functions/api/admin/settings.js         DEFAULTS gains plan: ""
  tests/validate.test.js                  plan validator cases
  tests/settings.test.js                  GET expectations gain plan: ""
  eleventy.config.js                      dollars filter (build-time money formatting)
  src/_includes/portal-shell.njk          "Plan & billing" as LAST sidenav item; pageKey comment
  src/assets/css/portal.css               .tier-price / .tier-current-badge (small append)
  docs/launch-checklist.md                §7: demo exclusion of billing.html + post-Access inclusion items
```

## Not in this track

- No public `/sponsors/` page, no booking engine, no safety block (other tracks).
- The camera has NO repo build (spec §10 item 4); it exists only as proposal/artifact text.
- Weebly retirement is a proposal savings line only (spec §6.1); the cutover itself is already on the launch checklist.
- No Stripe API integration of any kind; Payment Links are pasted URLs supplied by the user during execution (until then, the repo's visible PLACEHOLDER convention: an HTML `<!-- PLACEHOLDER: ... -->` comment plus a visible `.setup-note` box, as in `src/membership/index.html`).

## Shared verification procedures

**Full check battery** (run where a task says "run the battery"):

```bash
npm test          # zero failures (baseline 76 + this track's additions)
npm run lint      # zero errors
npm run build     # exits 0, writes _site/
```

**Reseed local D1** (destroys local dev data; only ever seed data here):

```powershell
Remove-Item -Recurse -Force .wrangler\state -ErrorAction SilentlyContinue
npm run db:schema
npm run db:seed
```

**Dev server:** `npm run dev` → http://127.0.0.1:8200 (builds then serves `_site` with Functions; re-run `npm run build` after source edits if the page looks stale). Local auth resolves to `dev@localhost`, so admin APIs work without Access.

**Screenshot procedure** (headless Edge on this machine renders at 1.26x device scale; pin the CSS viewport with a fixed-width iframe):

```powershell
$shots = "$env:TEMP\wopha-shots"
New-Item -ItemType Directory -Force $shots | Out-Null
# $page = e.g. "portal/billing.html"; $w = 375 or 1280
@"
<!doctype html><meta charset="utf-8"><style>body{margin:0}iframe{border:0;display:block}</style>
<iframe src="http://127.0.0.1:8200/$page" width="$w" height="2400"></iframe>
"@ | Set-Content "$shots\frame.html"
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless --disable-gpu `
  --force-device-scale-factor=1 --window-size=$($w + 40),2500 `
  --screenshot="$shots\shot-$w.png" "file:///$(($shots -replace '\\','/'))/frame.html"
```

**Em-dash gate** (copy rule; run on any authored file F): `grep -n "—" F` → expected: no output, exit 1.

## The numbers (derived once here; every task consumes these)

All from spec §2/§3. Draft gross prices ($99/$149/$199 monthly) are DATA the user finalizes in `pricing.json` during execution; one edit point, tests flag every stale consumer.

| cents | Essentials | Amenities | Complete | Source |
|---|---|---|---|---|
| gross_monthly | 9900 | 14900 | 19900 | §3 draft |
| verified cancellations | none | none | camera 14583/mo ($1,750/yr in the approved 2026 budget; 2025 actual $2,000 = $167/mo) | [F4] |
| net after verified | 9900 | 14900 | 5317 | derived |
| pending: Weebly | 1700-2500 | 1700-2500 | 1700-2500 | [V3] est ≤ $300/yr |
| pending: ReserveMyCourt | — | 1700-3000 | 1700-3000 | [V1] $200-360/yr likely, plan/payer unconfirmed |
| pending totals (low-high) | 1700-2500 | 3400-5500 | 3400-5500 | derived |
| net if pending confirms (low = most savings) | 7400-8200 | 9400-11500 | -183-1917 | derived: net_verified − pending_high … − pending_low |
| PayHOA anchor | | | | 19900/mo = $2,388/yr |
| Sponsor target (Complete only) | | | 8333/mo | 4 × $250/yr = $1,000/yr ≈ $83/mo |

SwimTopia is [V2] unverified and possibly team-paid: it appears in NO savings row anywhere, only as included capability. The $0-floor honesty rule: the "verified" row is the only row ever presented as fact; pending rows are always labeled estimates.

---

### Task 1: Single-source tier data + consistency tripwire

**Files:**
- Create: `src/_data/pricing.json`
- Create: `tests/pricing.test.js`

**Interfaces:**
- Produces: global data `pricing` for Nunjucks pages (`pricing.tiers[]` with `id`, `name`, `gross_monthly_cents`, `stripe_link`, `includes[]`, `verified_cancellations[]`, `verified_monthly_cents`, `pending_cancellations[]`, `pending_low_monthly_cents`, `pending_high_monthly_cents`, `net_verified_monthly_cents`, `net_confirmed_low_monthly_cents`, `net_confirmed_high_monthly_cents`; top-level `payhoa_anchor_monthly_cents`, `sponsor_target_monthly_cents`). Tier ids `essentials|amenities|complete` are consumed verbatim by Task 2's `PLAN_KEYS` and Task 3's badge ids.
- Produces: `tests/pricing.test.js` with an exported-in-file `fmt(cents)` helper; Tasks 4 and 5 append docs-sync describes to this same file.

- [ ] **Step 1: Write the failing test**

Create `tests/pricing.test.js`:

```js
import { describe, it, expect } from "vitest";
import pricing from "../src/_data/pricing.json";

// Mirrors the portal's dollars() formatting (portal-shell.js) and the Eleventy
// dollars filter: whole dollars stay whole, cents show when present, negatives
// lead with -$.
export function fmt(cents) {
  const abs = (Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return (cents < 0 ? "-$" : "$") + abs;
}

describe("pricing.json shape", () => {
  it("has exactly three tiers with the locked ids, in order", () => {
    expect(pricing.tiers.map((t) => t.id)).toEqual(["essentials", "amenities", "complete"]);
    expect(new Set(pricing.tiers.map((t) => t.name)).size).toBe(3);
  });
  it("keeps every money field an integer number of cents", () => {
    const moneyFields = [];
    const walk = (obj) => {
      for (const [k, v] of Object.entries(obj)) {
        if (k.endsWith("_cents")) moneyFields.push([k, v]);
        else if (Array.isArray(v)) v.forEach((x) => typeof x === "object" && walk(x));
        else if (v && typeof v === "object") walk(v);
      }
    };
    walk(pricing);
    expect(moneyFields.length).toBeGreaterThan(10);
    for (const [k, v] of moneyFields) {
      expect(Number.isInteger(v), `${k} must be integer cents, got ${v}`).toBe(true);
    }
    for (const t of pricing.tiers) expect(t.gross_monthly_cents).toBeGreaterThan(0);
  });
  it("cites a spec source tag on every cancellation line item", () => {
    for (const t of pricing.tiers) {
      for (const c of [...t.verified_cancellations, ...t.pending_cancellations]) {
        expect(c.source).toMatch(/^[FV]\d$/);
        expect(c.label.length).toBeGreaterThan(0);
      }
    }
  });
  it("derives every net figure from the line items (no hand-math drift)", () => {
    for (const t of pricing.tiers) {
      const verified = t.verified_cancellations.reduce((a, c) => a + c.monthly_cents, 0);
      const lo = t.pending_cancellations.reduce((a, c) => a + c.low_monthly_cents, 0);
      const hi = t.pending_cancellations.reduce((a, c) => a + c.high_monthly_cents, 0);
      expect(t.verified_monthly_cents, t.id).toBe(verified);
      expect(t.pending_low_monthly_cents, t.id).toBe(lo);
      expect(t.pending_high_monthly_cents, t.id).toBe(hi);
      expect(t.net_verified_monthly_cents, t.id).toBe(t.gross_monthly_cents - verified);
      expect(t.net_confirmed_low_monthly_cents, t.id).toBe(t.net_verified_monthly_cents - hi);
      expect(t.net_confirmed_high_monthly_cents, t.id).toBe(t.net_verified_monthly_cents - lo);
    }
  });
  it("never lists SwimTopia in any savings row (V2 unverified, possibly team-paid)", () => {
    for (const t of pricing.tiers) {
      for (const c of [...t.verified_cancellations, ...t.pending_cancellations]) {
        expect(c.label.toLowerCase()).not.toContain("swimtopia");
      }
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/pricing.test.js`
Expected: FAIL — cannot resolve `../src/_data/pricing.json`.

- [ ] **Step 3: Create `src/_data/pricing.json`**

```json
{
  "draft": true,
  "note": "DRAFT prices; the user finalizes gross_monthly_cents here before the proposal is presented. Single source for docs/board-proposal-addendum-2.md, docs/pricing-artifact.html, and src/portal/billing.html. tests/pricing.test.js enforces consistency; edit here first, then let failing tests point at stale consumers. stripe_link per tier is the webmaster's OWN business Stripe recurring Payment Link (monthly), entirely separate from the HOA dues Stripe; empty until the user supplies real links.",
  "payhoa_anchor_monthly_cents": 19900,
  "sponsor_target_monthly_cents": 8333,
  "sponsor_target_note": "4 sponsors x $250/yr = $1,000/yr, about $83/mo. A target, never counted as verified.",
  "tiers": [
    {
      "id": "essentials",
      "name": "Essentials",
      "gross_monthly_cents": 9900,
      "stripe_link": "",
      "includes": [
        "Redesigned public site and board portal",
        "Cloudflare hosting, weekly backups with monthly retention",
        "Dues ledger and QuickBooks CSV exports",
        "Content edits and updates, basic turnaround",
        "Weebly hosting retired after the wopha.com cutover"
      ],
      "verified_cancellations": [],
      "verified_monthly_cents": 0,
      "pending_cancellations": [
        {
          "label": "Weebly hosting",
          "low_monthly_cents": 1700,
          "high_monthly_cents": 2500,
          "source": "V3",
          "note": "Estimated at most $300/yr; exact amount unverified, likely inside Admin Misc"
        }
      ],
      "pending_low_monthly_cents": 1700,
      "pending_high_monthly_cents": 2500,
      "net_verified_monthly_cents": 9900,
      "net_confirmed_low_monthly_cents": 7400,
      "net_confirmed_high_monthly_cents": 8200
    },
    {
      "id": "amenities",
      "name": "Amenities",
      "gross_monthly_cents": 14900,
      "stripe_link": "",
      "includes": [
        "Everything in Essentials, standard turnaround",
        "Court booking built in, replaces ReserveMyCourt",
        "Pavilion and pool party booking calendar",
        "Swim team pages (optional)"
      ],
      "verified_cancellations": [],
      "verified_monthly_cents": 0,
      "pending_cancellations": [
        {
          "label": "Weebly hosting",
          "low_monthly_cents": 1700,
          "high_monthly_cents": 2500,
          "source": "V3",
          "note": "Estimated at most $300/yr; exact amount unverified, likely inside Admin Misc"
        },
        {
          "label": "ReserveMyCourt",
          "low_monthly_cents": 1700,
          "high_monthly_cents": 3000,
          "source": "V1",
          "note": "No free tier exists; $200-360/yr likely. Exact plan and who pays it (HOA or tennis coordinator) unconfirmed"
        }
      ],
      "pending_low_monthly_cents": 3400,
      "pending_high_monthly_cents": 5500,
      "net_verified_monthly_cents": 14900,
      "net_confirmed_low_monthly_cents": 9400,
      "net_confirmed_high_monthly_cents": 11500
    },
    {
      "id": "complete",
      "name": "Complete",
      "gross_monthly_cents": 19900,
      "stripe_link": "",
      "includes": [
        "Everything in Amenities, priority turnaround",
        "Sponsorship program management",
        "Self-hosted entrance camera (license plate recognition), maintained; replaces the Flock subscription",
        "Swim team pages included"
      ],
      "verified_cancellations": [
        {
          "label": "Camera - Entrance (Flock)",
          "monthly_cents": 14583,
          "source": "F4",
          "note": "$1,750 in the approved 2026 budget; 2025 actual $2,000 ($167/mo)"
        }
      ],
      "verified_monthly_cents": 14583,
      "pending_cancellations": [
        {
          "label": "Weebly hosting",
          "low_monthly_cents": 1700,
          "high_monthly_cents": 2500,
          "source": "V3",
          "note": "Estimated at most $300/yr; exact amount unverified, likely inside Admin Misc"
        },
        {
          "label": "ReserveMyCourt",
          "low_monthly_cents": 1700,
          "high_monthly_cents": 3000,
          "source": "V1",
          "note": "No free tier exists; $200-360/yr likely. Exact plan and who pays it unconfirmed"
        }
      ],
      "pending_low_monthly_cents": 3400,
      "pending_high_monthly_cents": 5500,
      "net_verified_monthly_cents": 5317,
      "net_confirmed_low_monthly_cents": -183,
      "net_confirmed_high_monthly_cents": 1917
    }
  ]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/pricing.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full battery**

Run: `npm test` then `npm run lint`
Expected: all green (76 baseline + 5 new), lint zero errors. (`npm run build` unaffected: data files emit nothing.)

- [ ] **Step 6: Commit**

```bash
git add src/_data/pricing.json tests/pricing.test.js
git commit -m "feat: single-source tier pricing data with consistency tripwire tests"
```

---

### Task 2: `plan` settings key

**Files:**
- Modify: `functions/api/_lib/validate.js` (SETTING_KEYS at ~line 86, validateSetting ~lines 88-110)
- Modify: `functions/api/admin/settings.js` (DEFAULTS, lines 8-12)
- Modify: `tests/validate.test.js` (validateSetting describe, ~lines 93-125)
- Modify: `tests/settings.test.js` (exact-object GET expectations, lines 19-23 and 32-36)
- Modify: `tests/pricing.test.js` (append lockstep test)

**Interfaces:**
- Consumes: tier ids from `src/_data/pricing.json` (Task 1).
- Produces: `SETTING_KEYS` includes `"plan"`; `export const PLAN_KEYS = ["essentials", "amenities", "complete"]`; `validateSetting("plan", v)` accepts PLAN_KEYS members and `""` (clear), rejects everything else; `GET /api/admin/settings` returns `plan: ""` by default. Task 3's billing page GETs/PUTs this key.

- [ ] **Step 1: Write the failing tests**

In `tests/validate.test.js`, extend the import to include `PLAN_KEYS` and add inside the existing `describe("validateSetting", ...)`:

```js
  it("accepts plan ids from the allowlist and empty to clear", () => {
    expect(validateSetting("plan", "essentials")).toEqual({ ok: true, value: "essentials" });
    expect(validateSetting("plan", "amenities")).toEqual({ ok: true, value: "amenities" });
    expect(validateSetting("plan", "complete")).toEqual({ ok: true, value: "complete" });
    expect(validateSetting("plan", "")).toEqual({ ok: true, value: "" });
    expect(validateSetting("plan", "  complete  ")).toEqual({ ok: true, value: "complete" });
  });
  it("rejects plan values outside the allowlist", () => {
    expect(validateSetting("plan", "gold").ok).toBe(false);
    expect(validateSetting("plan", "Essentials").ok).toBe(false);
    expect(validateSetting("plan", "essentials,complete").ok).toBe(false);
  });
```

Update the import at the top of the file:

```js
import {
  validateSubmission,
  validateAnnouncement,
  validatePayment,
  validateContent,
  validateSetting,
  validateHouseholdUpdate,
  PLAN_KEYS,
} from "../functions/api/_lib/validate.js";
```

and add a standalone assertion at the end of the validateSetting describe:

```js
  it("exports the PLAN_KEYS allowlist", () => {
    expect(PLAN_KEYS).toEqual(["essentials", "amenities", "complete"]);
  });
```

In `tests/pricing.test.js`, append at the end of the file:

```js
import { PLAN_KEYS } from "../functions/api/_lib/validate.js";

describe("plan settings key stays in lockstep with the tier data", () => {
  it("PLAN_KEYS equals the pricing.json tier ids", () => {
    expect(PLAN_KEYS).toEqual(pricing.tiers.map((t) => t.id));
  });
});
```

(vitest hoists imports; placing the import at the bottom of the file is legal ESM but move it to the top with the others for lint cleanliness.)

In `tests/settings.test.js`, add `plan: ""` to BOTH exact-object expectations:

```js
    expect(await res.json()).toEqual({
      dues_cents: "69300",
      dues_due_date: "",
      quickbooks_url: "",
      plan: "",
    });
```

and

```js
    expect(await res.json()).toEqual({
      dues_cents: "60000",
      dues_due_date: "",
      quickbooks_url: "https://app.qbo.intuit.com/app/customers",
      plan: "",
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/validate.test.js tests/settings.test.js tests/pricing.test.js`
Expected: FAIL — `PLAN_KEYS` is not exported; `validateSetting("plan", ...)` returns `{ ok: false, error: "Unknown setting key" }`; settings GET lacks `plan`; the DEFAULTS-consistency test in settings.test.js also fails once SETTING_KEYS changes (next step) until DEFAULTS follows.

- [ ] **Step 3: Implement**

In `functions/api/_lib/validate.js`, change line 86 and insert the plan branch BEFORE the `// quickbooks_url` fallthrough:

```js
export const SETTING_KEYS = ["dues_cents", "dues_due_date", "quickbooks_url", "plan"];
export const PLAN_KEYS = ["essentials", "amenities", "complete"];
```

and inside `validateSetting`, after the `dues_due_date` block and before the `// quickbooks_url` comment:

```js
  if (key === "plan") {
    if (s === "") return { ok: true, value: "" };
    if (!PLAN_KEYS.includes(s)) {
      return { ok: false, error: "plan must be one of: " + PLAN_KEYS.join(", ") + " (or empty to clear)" };
    }
    return { ok: true, value: s };
  }
```

(`s` is already trimmed by the shared `String(...).trim()` at the top of the function, which is why `"  complete  "` passes.)

In `functions/api/admin/settings.js`, add to DEFAULTS:

```js
export const DEFAULTS = {
  dues_cents: String(DUES_CENTS),
  dues_due_date: "",
  quickbooks_url: "",
  plan: "",
};
```

- [ ] **Step 4: Run the full battery**

Run: `npm test` then `npm run lint`
Expected: all green (the DEFAULTS-consistency test now passes with the new key), lint zero errors.

- [ ] **Step 5: Commit**

```bash
git add functions/api/_lib/validate.js functions/api/admin/settings.js tests/validate.test.js tests/settings.test.js tests/pricing.test.js
git commit -m "feat: plan settings key (tier id allowlist, defaults, lockstep test)"
```

---

### Task 3: Portal "Plan & billing" page + sidebar entry

**Files:**
- Create: `src/portal/billing.html`
- Modify: `src/_includes/portal-shell.njk` (nav block, lines 15-21; pageKey comment, lines 1-3)
- Modify: `eleventy.config.js` (add `dollars` filter)
- Modify: `src/assets/css/portal.css` (append two small rules)

**Interfaces:**
- Consumes: global data `pricing` (Task 1); `GET/PUT /api/admin/settings` with key `plan` (Task 2); portal-shell helpers `api()`, `el()`, `toast()`, `showError()` (existing `src/portal/portal-shell.js`); layout `portal-base.njk` (noindex inherited).
- Produces: pageKey `billing`; badge element ids `plan-badge-<tierId>`; the LAST sidenav item "Plan &amp; billing".

- [ ] **Step 1: Add the `dollars` Eleventy filter**

In `eleventy.config.js`, inside the exported function (after the passthrough copies):

```js
  // Build-time money formatting; mirrors dollars() in src/portal/portal-shell.js.
  // Money is integer cents everywhere in code; only display formats it.
  eleventyConfig.addFilter("dollars", (cents) => {
    const abs = (Math.abs(cents) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return (cents < 0 ? "-$" : "$") + abs;
  });
```

- [ ] **Step 2: Add the sidenav item (LAST, never a counted position)**

In `src/_includes/portal-shell.njk`, insert as the last `<a>` inside `<nav class="portal-sidenav" ...>`, immediately before `</nav>` (do NOT count existing items; the booking track may have added a "Bookings" link by now — this link goes after whatever is there):

```njk
    <a href="/portal/billing.html"{% if pageKey == "billing" %} aria-current="page"{% endif %}>Plan &amp; billing</a>
```

Update the comment at the top of the partial to list the new key, e.g.:

```njk
{# Board portal app shell. Behavior in /portal/portal-shell.js (loaded at the
   end so the sidebar markup above it is already parsed). Pages set
   pageKey: dashboard | announcements | inbox | ledger | content | billing
   (other tracks may add keys; keep "billing" last in the nav). #}
```

- [ ] **Step 3: Append billing styles to `src/assets/css/portal.css`**

At the end of the file:

```css
/* ---- Plan & billing ------------------------------------------------------ */

.tier-price {
  font-family: var(--display);
  font-size: 1.75rem;
  color: var(--pine);
  margin: 0 0 var(--space-3);
}
.tier-price .field-help { font-family: var(--body); font-size: 0.875rem; }
.tier-current-badge {
  display: inline-block;
  font-family: var(--body);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ok);
  background: var(--ok-bg);
  border-radius: 999px;
  padding: 2px 10px;
  margin-left: var(--space-2);
  vertical-align: middle;
}
```

- [ ] **Step 4: Create `src/portal/billing.html`**

Complete file (Nunjucks bakes the tier data at build; runtime JS touches only the `plan` setting; all dynamic DOM via textContent; copy has no em dashes):

```html
---
layout: portal-base.njk
title: "Plan &amp; billing"
pageKey: billing
---
  <main class="section" id="portal-main" tabindex="-1">
    <div class="container">
      <div class="portal-page-head">
        <h1>Plan &amp; billing</h1>
      </div>
      <p class="lede">The association's website service plan. Subscriptions are billed monthly through Stripe, which hosts checkout, receipts, and the customer portal for upgrades or cancellation. No payment details touch this website.</p>

      <div class="portal-grid portal-grid--3">
        {% for tier in pricing.tiers %}
        <section class="portal-card tier-card" aria-labelledby="tier-{{ tier.id }}">
          <h2 id="tier-{{ tier.id }}">{{ tier.name }} <span class="tier-current-badge" id="plan-badge-{{ tier.id }}" hidden>Current plan</span></h2>
          <p class="tier-price">{{ tier.gross_monthly_cents | dollars }}<span class="field-help">/month ({{ (tier.gross_monthly_cents * 12) | dollars }}/year)</span></p>
          <ul>
            {% for item in tier.includes %}
            <li>{{ item }}</li>
            {% endfor %}
          </ul>
          {% if tier.stripe_link %}
          <p><a class="btn btn--primary" href="{{ tier.stripe_link }}">Subscribe monthly</a></p>
          {% else %}
          <!-- PLACEHOLDER: the webmaster pastes the {{ tier.name }} tier's Stripe recurring Payment Link (his own business Stripe account, separate from the HOA dues Stripe) into stripe_link in src/_data/pricing.json, then rebuilds. -->
          <p><a class="btn btn--primary" href="#">Subscribe monthly</a></p>
          <div class="setup-note">
            <p>Setup needed: the {{ tier.name }} subscribe button activates when the webmaster's Stripe Payment Link is added to the site configuration.</p>
          </div>
          {% endif %}
        </section>
        {% endfor %}
      </div>

      <section class="portal-card portal-section" aria-labelledby="net-heading">
        <h2 id="net-heading">What each plan really costs</h2>
        <div class="table-wrap">
          <table>
            <caption class="visually-hidden">Gross and net monthly cost per plan</caption>
            <thead>
              <tr>
                <th scope="col">Line</th>
                {% for tier in pricing.tiers %}<th scope="col">{{ tier.name }}</th>{% endfor %}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Gross monthly</th>
                {% for tier in pricing.tiers %}<td>{{ tier.gross_monthly_cents | dollars }}</td>{% endfor %}
              </tr>
              <tr>
                <th scope="row">Cancelled subscriptions (verified)</th>
                {% for tier in pricing.tiers %}<td>{% if tier.verified_cancellations.length %}{% for c in tier.verified_cancellations %}{{ c.label }} {{ c.monthly_cents | dollars }}/mo{% endfor %}{% else %}none yet{% endif %}</td>{% endfor %}
              </tr>
              <tr>
                <th scope="row">Net after verified savings</th>
                {% for tier in pricing.tiers %}<td><strong>{{ tier.net_verified_monthly_cents | dollars }}</strong></td>{% endfor %}
              </tr>
              <tr>
                <th scope="row">Pending verification (estimates)</th>
                {% for tier in pricing.tiers %}<td>{% if tier.pending_cancellations.length %}{{ tier.pending_low_monthly_cents | dollars }} to {{ tier.pending_high_monthly_cents | dollars }}{% else %}none{% endif %}</td>{% endfor %}
              </tr>
              <tr>
                <th scope="row">Net if estimates confirm</th>
                {% for tier in pricing.tiers %}<td>{{ tier.net_confirmed_low_monthly_cents | dollars }} to {{ tier.net_confirmed_high_monthly_cents | dollars }}</td>{% endfor %}
              </tr>
            </tbody>
          </table>
        </div>
        <p class="field-help">Verified savings count only subscriptions in the approved 2026 budget (the entrance camera line, Complete plan). ReserveMyCourt and Weebly amounts are estimates pending the treasurer's confirmation and are never claimed as fact. The Complete plan's sponsorship program targets about {{ pricing.sponsor_target_monthly_cents | dollars }}/mo in offsetting revenue (4 sponsors at $250/yr); a target, not a commitment. Comparable HOA portal platforms run about {{ pricing.payhoa_anchor_monthly_cents | dollars }}/mo.</p>
      </section>

      <section class="portal-card portal-section" aria-labelledby="plan-heading">
        <h2 id="plan-heading">Current plan</h2>
        <p class="field-help">Set this after the board subscribes so the portal shows the active plan. It only changes what this page displays; the subscription itself is managed on Stripe's pages (the link is in every Stripe receipt email).</p>
        <p>
          <label for="set-plan">Plan</label><br>
          <select id="set-plan">
            <option value="">None yet</option>
            {% for tier in pricing.tiers %}
            <option value="{{ tier.id }}">{{ tier.name }}</option>
            {% endfor %}
          </select>
        </p>
        <p>
          <button type="button" class="btn btn--primary" id="plan-save">Save</button>
          <span class="field-error" id="plan-error" tabindex="-1" hidden></span>
        </p>
      </section>

      <section class="portal-card portal-section" aria-labelledby="howpay-heading">
        <h2 id="howpay-heading">How billing works</h2>
        <ul>
          <li>Subscriptions are paid to the webmaster's business Stripe account. It is entirely separate from the association's own Stripe account that collects member dues.</li>
          <li>Stripe hosts checkout, emails receipts, and provides the customer portal for changing or cancelling the subscription.</li>
          <li>Either side can end the arrangement with 30 days notice, per the proposal terms, with full handover.</li>
        </ul>
      </section>
    </div>
  </main>
  <script>
    (function () {
      var select = document.getElementById("set-plan");
      var planError = document.getElementById("plan-error");
      var original = null;

      function showBadge(plan) {
        var badges = document.querySelectorAll(".tier-current-badge");
        for (var i = 0; i < badges.length; i++) {
          badges[i].hidden = badges[i].id !== "plan-badge-" + plan;
        }
      }

      api("/api/admin/settings").then(function (s) {
        if (!select.isConnected) return;
        original = s;
        select.value = s.plan || "";
        showBadge(s.plan || "");
      }).catch(showError);

      document.getElementById("plan-save").addEventListener("click", function () {
        if (!original) return;
        var btn = this;
        planError.hidden = true;
        // Capture the value now; edits made while the PUT is in flight are never clobbered.
        var value = select.value;
        if (value === (original.plan || "")) {
          toast("No changes to save.");
          return;
        }
        btn.disabled = true;
        api("/api/admin/settings", { method: "PUT", body: { key: "plan", value: value } })
          .then(function () {
            original.plan = value;
            if (!select.isConnected) return;
            showBadge(value);
            toast("Plan saved.");
          })
          .catch(function (err) {
            if (!select.isConnected) return;
            planError.textContent = err.message;
            planError.hidden = false;
            planError.focus();
          })
          .finally(function () {
            if (btn.isConnected) btn.disabled = false;
          });
      });
    })();
  </script>
```

- [ ] **Step 5: Build and inspect the baked output**

```bash
npm run build
grep -c '\$99\|\$149\|\$199' _site/portal/billing.html
grep -n 'noindex' _site/portal/billing.html
grep -n 'Plan &amp; billing' _site/portal/index.html
grep -n "—" src/portal/billing.html
```

Expected: build exits 0; first grep ≥ 3 (prices baked); noindex present (from portal-base.njk); the sidebar of every portal page (index checked as representative) contains the new link as the last nav item; em-dash grep silent.

- [ ] **Step 6: Verify the live flow on the dev server**

Reseed local D1 (shared procedure), then `npm run dev`. At http://127.0.0.1:8200/portal/billing.html:

1. Three tier cards render with prices and the setup-note under each Subscribe button (stripe_link empty).
2. The cost table shows Complete's verified camera line and the "-$1.83 to $19.17" confirmed range.
3. Select "Complete", Save → toast "Plan saved.", the Complete card shows the "Current plan" badge.
4. Reload → select shows Complete, badge persists (round trip through D1).
5. Select "None yet", Save → badge disappears.
6. Keyboard-only pass: skip link → h1; select and Save reachable; after a forced error (stop the dev server, click Save) the error message receives focus.

- [ ] **Step 7: Screenshots**

Run the shared screenshot procedure with `$page = "portal/billing.html"` at `$w = 375` and `$w = 1280`; Read both PNGs. Expected: cards stack at 375 with no horizontal scroll; table scrolls inside `.table-wrap` if needed; sidebar shows "Plan & billing" highlighted (aria-current styling) as the last item.

- [ ] **Step 8: Run the full battery and commit**

Run: `npm test && npm run lint && npm run build`
Expected: all green.

```bash
git add src/portal/billing.html src/_includes/portal-shell.njk eleventy.config.js src/assets/css/portal.css
git commit -m "feat: portal Plan & billing page (tier table baked from pricing.json, plan setting editor, Stripe link seams)"
```

---

### Task 4: Board proposal addendum 2

**Files:**
- Create: `docs/board-proposal-addendum-2.md`
- Modify: `tests/pricing.test.js` (append docs-sync describe)

**Interfaces:**
- Consumes: every number from `src/_data/pricing.json` (Task 1) and the spec's [F1]-[F6]/[V1]-[V3] tags.
- Produces: the addendum the artifact (Task 5) restates visually.

Voice and format follow `docs/board-proposal.md` and `docs/board-proposal-addendum.md` (To/From/Date/Supersedes header, plain tables, short sections), EXCEPT: no em dashes anywhere (the copy rules bind new documents; the older docs predate the rule). Ranges use hyphens ("$17-25"). No editorializing beyond the sourced facts.

- [ ] **Step 1: Write the failing sync test**

Append to `tests/pricing.test.js`:

```js
import { readFileSync } from "node:fs";

describe("docs stay in sync with pricing.json", () => {
  const addendum = readFileSync("docs/board-proposal-addendum-2.md", "utf8");
  it("addendum names every tier and shows its draft gross price and the PayHOA anchor", () => {
    for (const t of pricing.tiers) {
      expect(addendum).toContain(t.name);
      expect(addendum).toContain(fmt(t.gross_monthly_cents));
    }
    expect(addendum).toContain(fmt(pricing.payhoa_anchor_monthly_cents));
  });
  it("addendum contains no em dashes (copy rule)", () => {
    expect(addendum.includes("—")).toBe(false);
  });
  it("addendum carries the verification honesty markers", () => {
    for (const tag of ["[F1]", "[F4]", "[F6]", "[V1]", "[V2]", "[V3]"]) {
      expect(addendum).toContain(tag);
    }
  });
});
```

(Move the `node:fs` import to the top of the file with the others.)

Run: `npx vitest run tests/pricing.test.js`
Expected: FAIL — ENOENT `docs/board-proposal-addendum-2.md`.

- [ ] **Step 2: Create `docs/board-proposal-addendum-2.md` with this content**

The text below is the deliverable; the executor copies it verbatim, then resolves the two bracketed EXECUTOR notes (camera quote, street address) as instructed after the document.

```markdown
# Addendum 2: Website Service Tiers, Amenity Replacements, and the Entrance Camera

**To:** The WOPHA Board of Directors: Gio Vargas (President), Amanda Tarpley,
Seiji Ijuin, and the director seat to be filled
**From:** Sang Ho, [street address], WOPHA member
**Date:** July 2026
**Supersedes:** the "What it would cost" sections of the July 2026 proposal
(Options A and B) and of Addendum 1 ($1,300 one-time + $99/year). Everything
else in those documents still applies: ownership, handover, the 30-day exit,
and the disclosure terms.
**Status: DRAFT. The monthly prices below are drafts and finalize before this
is presented.**

## Why the pricing changed, plainly

The original proposal priced a website plus a content retainer ($1,200 launch
+ $75/mo, or $0 + $140/mo). Addendum 1 ($1,300 one-time + $99/year) priced
self-service: the board portal made the board self-sufficient, and the annual
fee covered little beyond hosting, domain, and security upkeep.

Since then the scope has grown from a website into running services: built-in
court and pavilion booking that replaces ReserveMyCourt, swim team pages, a
sponsorship program, and operating the entrance camera in place of the Flock
subscription. Those are ongoing operations with real hours in them, so this
addendum prices the work as a monthly service in three tiers. Essentials is
the closest to the earlier arrangements: the original proposal's retainer
model with the portal included. The board picks the tier that matches what it
wants run.

## The bottom line first

The association is heading into major capital work: the tennis court rebuild
and pool repairs, with bank-loan exploration under way [F6]. So this proposal
leads with net cost, not features. Gross is the sticker price. Net is what
actually leaves the budget after the tier cancels subscriptions the
association already pays.

Three anchors:

- The 2026 budget already carries $1,750 a year (about $146/mo) for the
  entrance camera subscription; 2025 actual was $2,000 [F4].
- HOA portal platforms at our size run about $199/mo, which is $2,388 a year
  for a portal alone (PayHOA, cited in the original proposal).
- The approved 2026 budget projects income of $139,925, expenses of
  $121,307, and an operating surplus of $18,618 [F1].

### Cost table (DRAFT prices)

| | Essentials | Amenities | Complete |
|---|---|---|---|
| Gross monthly (draft) | $99 | $149 | $199 |
| Gross annual | $1,188 | $1,788 | $2,388 |
| Cancelled subscriptions, verified | none yet | none yet | camera $146/mo [F4] |
| **Net monthly after verified savings** | **$99** | **$149** | **$53** |
| Pending verification, estimates only | Weebly $17-25 [V3] | Weebly + ReserveMyCourt $34-55 [V1][V3] | Weebly + ReserveMyCourt $34-55 [V1][V3] |
| Net monthly if estimates confirm | $74-82 | $94-115 | -$2 to $19 |
| Sponsorship revenue at target | | | about $83/mo |
| Net monthly with 4 sponsors at $250/yr | | | at or below zero |

An honesty note on the pending rows: the P&L's category totals can hide small
subscriptions [V1][V2][V3]. Until the treasurer confirms what the association
actually pays for ReserveMyCourt, SwimTopia, and Weebly, this proposal treats
those savings as zero and claims only the camera line, which is in the
approved 2026 budget. Every confirmed dollar moves up into the verified row.
What is already known: ReserveMyCourt has no free tier; published plans run
$200-450 a year per amenity plus transaction fees, so the association or a
volunteer is paying something today [V1]. SwimTopia may be paid by the swim
team rather than the association [V2]; if so, it stays out of the savings
math entirely and remains an included capability instead.

## What each tier includes

Every tier includes what is already built and running: the redesigned public
site, the board portal (announcements, shared inbox, dues ledger, site
content editing), Cloudflare hosting, weekly backups with monthly retention,
QuickBooks CSV exports, and support.

| | Essentials | Amenities | Complete |
|---|---|---|---|
| Content edits and updates | basic turnaround | standard turnaround | priority turnaround |
| Court booking built in (replaces ReserveMyCourt) | | yes | yes |
| Pavilion and pool party booking calendar | | yes | yes |
| Swim team pages | | optional | yes |
| Sponsorship program management | | | yes |
| Self-hosted entrance camera, maintained (replaces Flock) | | | yes |

Notes:

- The booking calendar also retires the hand-maintained pool-hours
  spreadsheet the board currently coordinates in shared Google Sheets, on
  top of two paid tools. One place, one calendar, edited in the portal.
- For Amenities and Complete, the booking system runs alongside
  ReserveMyCourt for one month before the board cancels RMC.
- Amenities and Complete stay at or under the $199/mo platform anchor while
  including things those platforms do not do (booking tailored to our
  amenities, camera operations, sponsorship management).

## The entrance camera (Complete)

An operations offering, not a website feature. The association replaces the
Flock subscription with a camera system it owns:

- Hardware, owned by the association: a PoE license-plate-recognition camera
  at the entrance plus a small on-site computer running open-source plate
  recognition software. One-time hardware cost: [EXECUTOR: real quote here;
  order of magnitude $400-800].
- I set up the current Flock camera, so the operational handover path is
  known.
- The Flock line is $1,750 in the 2026 budget; 2025 actual was $2,000 [F4].
  Cancelling it is the single largest verified saving in this proposal.
- Ongoing maintenance, updates, and monitoring are included in the Complete
  tier's monthly price.

Commitments that come with it, recorded here so the board can hold me to
them:

- A written retention policy adopted by the board before cutover, with
  footage kept about 30 days and then deleted.
- Access limited to the board. No resident-facing footage ever appears on
  the website.
- A review of Georgia law on automated license plate readers and privacy
  before the system goes live.
- Plate data never mixes with the website's database. The camera system and
  the website stay physically and logically separate.
- The Flock subscription is cancelled only after the replacement is proven
  in service.

## Sponsorship revenue (Complete)

The Complete tier includes managing a small sponsorship program for local
businesses: a public sponsors page, sponsor placement (pool banner, website
logo, newsletter mention, at levels the board sets), and an inquiry form
that lands in the board's portal inbox. The target is four sponsors at
$250 a year: about $1,000 a year, or $83 a month, which offsets most or all
of the Complete tier's remaining net cost. This is a target, not a
commitment, and the cost table above never counts it as verified.

## Roadmap, not priced

Pool access control. The board priced a key-fob system at about $15,000 and
deferred it [F6]. A future phase of this service could take on access
control; it is out of scope here, carries no price in this addendum, and
nothing above depends on it.

## Terms and disclosure

Unchanged from the original proposal: the Association owns its content,
domain, accounts, and data; I retain template and tooling ownership with a
perpetual license to the Association; either side can end the arrangement
with 30 days notice, with full handover. Payment is a monthly subscription
through Stripe, with receipts and self-service cancellation on Stripe's
hosted pages; the subscription account is entirely separate from the
association's own Stripe account that collects dues, and no payment data
touches the website. I am a member proposing paid work to my own HOA: I ask
that the board vote on this, record the decision in the minutes, and I will
abstain from any member vote touching it.

## Ask

Pick a tier at the next board meeting. Essentials starts immediately.
Amenities adds the booking system with a one-month parallel run before
ReserveMyCourt is cancelled. Complete adds the sponsorship program and the
camera, which goes live only after the retention policy is adopted and the
legal review is done.
```

- [ ] **Step 3: Resolve the two bracketed items**

1. `[street address]` stays as-is (both existing proposal docs use the same placeholder; the user fills it before printing).
2. `[EXECUTOR: real quote here; order of magnitude $400-800]`: run a WebSearch for current street prices of (a) a PoE LPR-capable camera such as the Reolink RLC-811A or a Dahua/Hikvision entry LPR model and (b) a small N100-class mini PC, sum a realistic configuration, and replace the bracket with one sentence, e.g. "$X for the camera plus $Y for the compute node, about $Z total, association-owned" citing the configuration. If web search is unavailable in the execution environment, replace the bracket with "$400-800 depending on camera choice; exact quote to be attached before presentation [USER: attach quote]" and flag it in the task report so the user supplies it.

- [ ] **Step 4: Run the gates**

```bash
npx vitest run tests/pricing.test.js
grep -n "—" docs/board-proposal-addendum-2.md
grep -c "\[EXECUTOR" docs/board-proposal-addendum-2.md
```

Expected: tests PASS; em-dash grep silent (exit 1); EXECUTOR-bracket count 0.

- [ ] **Step 5: Run the full battery and commit**

Run: `npm test && npm run lint`
Expected: all green.

```bash
git add docs/board-proposal-addendum-2.md tests/pricing.test.js
git commit -m "docs: board proposal addendum 2 (three service tiers, verified-only net math, camera offering)"
```

---

### Task 5: Pricing artifact (private board-meeting one-pager)

**Files:**
- Create: `docs/pricing-artifact.html`
- Modify: `tests/pricing.test.js` (extend the docs-sync describe)

**Interfaces:**
- Consumes: the same numbers as Task 4 (from `pricing.json`; the sync test enforces it).
- Produces: a self-contained HTML file the harness Artifact tool publishes privately.

Rules for this file:

- **Artifact file format:** no `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags (the Artifact tool wraps the content at publish time). Start with `<title>Service tiers | Woods of Parkview HOA</title>` followed by one `<style>` block and the page markup. Browsers still render the raw file fine for local preview.
- **Self-contained:** no external requests of any kind (the artifact CSP blocks them). Brand fonts, if used, must be data URIs.
- **Brand:** the executor MUST load the `frontend-design` skill before styling, and reuse the site's Modern Civic palette and typography so the artifact reads as the same brand. Exact tokens (copied from `src/assets/css/styles.css`): pine `#1F3D2B`, pine-deep `#162D20`, canopy `#2E5940`, fern `#4C7A5B`, poolwater `#0E6E7A`, poolwater-dark `#0A525B`, sand `#EDE7D6`, paper `#FBFAF6`, ink `#1E2A22`, ink-soft `#4A543F`, clay-deep `#9C4623`. Display face Fraunces, body Public Sans, fallbacks Georgia / system sans. This page deliberately commits to the single light "paper" look (a printed-handout aesthetic), which the artifact guidelines permit for an intentional single-look design.
- **Fonts:** the repo self-hosts the WOFF2 files. Embed at most two faces to keep the file lean: `src/assets/fonts/fraunces-latin-600-normal.woff2` and `src/assets/fonts/public-sans-latin-400-normal.woff2`, via `@font-face` with `src: url(data:font/woff2;base64,<paste>)`. Generate each base64 string with: `base64 -w0 src/assets/fonts/fraunces-latin-600-normal.woff2` (Git Bash). If the executor judges the payload too heavy, dropping to the Georgia/system fallbacks is acceptable; the tokens matter more than the faces.
- **Copy rules:** no em dashes, no editorializing, title uses the pipe style.

- [ ] **Step 1: Extend the failing sync test**

In `tests/pricing.test.js`, inside the `docs stay in sync with pricing.json` describe, add:

```js
  const artifact = readFileSync("docs/pricing-artifact.html", "utf8");
  it("artifact names every tier and shows its draft gross price", () => {
    for (const t of pricing.tiers) {
      expect(artifact).toContain(t.name);
      expect(artifact).toContain(fmt(t.gross_monthly_cents));
    }
    expect(artifact).toContain(fmt(pricing.payhoa_anchor_monthly_cents));
  });
  it("artifact contains no em dashes and carries the DRAFT marker", () => {
    expect(artifact.includes("—")).toBe(false);
    expect(artifact).toContain("DRAFT");
  });
```

Run: `npx vitest run tests/pricing.test.js` → Expected: FAIL, ENOENT.

- [ ] **Step 2: Create `docs/pricing-artifact.html`**

Content requirements (the executor styles it after loading `frontend-design`; the copy and numbers below are fixed):

1. `<title>Service tiers | Woods of Parkview HOA</title>`.
2. Header band: "Woods of Parkview HOA" eyebrow, headline "Website service: three tiers", subline "Prepared for the board · July 2026 · DRAFT pricing", on paper `#FBFAF6` with a pine `#1F3D2B` accent rule.
3. Anchor strip (three stat blocks, factual, each with its small-print source):
   - "$1,750/yr — already in the 2026 budget for the entrance camera" → write WITHOUT an em dash, e.g. "$1,750/yr: the entrance camera line in the approved 2026 budget (2025 actual $2,000)".
   - "$199/mo: what PayHOA-class portals charge at our size, portal only".
   - "$18,618: the 2026 budgeted operating surplus".
4. Three tier cards (Essentials $99, Amenities $149, Complete $199 per month, annual $1,188 / $1,788 / $2,388), each listing its `includes` lines from `pricing.json`, Complete visually emphasized (pine card, paper text) with the line "For about the price of Essentials plus the camera bill the association already pays, everything is included."
5. The cost table, identical rows and figures to the addendum's Cost table (gross monthly, gross annual, verified cancellations with "camera $146/mo" under Complete only, net after verified in bold: $99 / $149 / $53, pending estimates row: $17-25 / $34-55 / $34-55, net if estimates confirm: $74-82 / $94-115 / "-$2 to $19", sponsorship target about $83/mo under Complete, net with sponsors "at or below zero").
6. An honesty footnote block, verbatim: "Verified savings count only the camera line in the approved 2026 budget. ReserveMyCourt, SwimTopia, and Weebly amounts are pending the treasurer's confirmation and are treated as zero until verified. Sponsorship revenue is a target, not a commitment."
7. A camera commitments strip (one line each): written 30-day retention policy before cutover; board-only access; no resident-facing footage on the website; Georgia ALPR and privacy review first; plate data never mixes with the website's database.
8. Footer: "Draft for board discussion. Not published on the association website." plus a small pine-ridge style accent if inexpensive to draw inline (a 1px fern treeline is the site's signature; optional).
9. Layout: max-width ~880px, responsive (cards stack under 720px), tables scroll inside an `overflow-x: auto` wrapper, WCAG AA contrast using the token pairs already validated on the site (ink on paper, paper on pine).

- [ ] **Step 3: Run the gates**

```bash
npx vitest run tests/pricing.test.js
grep -n "—" docs/pricing-artifact.html
grep -in "doctype\|<html\|<head>\|<body" docs/pricing-artifact.html
```

Expected: tests PASS; both greps silent (no em dashes; no document-skeleton tags).

- [ ] **Step 4: Visual check**

Open the raw file locally (`start docs/pricing-artifact.html` or the headless-Edge screenshot procedure pointed at the file path) at 375 and 1280 widths. Expected: readable, on-brand, no horizontal page scroll at 375.

- [ ] **Step 5: Publish privately via the Artifact tool**

Publish with: `file_path` = absolute path to `docs/pricing-artifact.html`, `favicon` = "🌲", `description` = "Three-tier website service pricing for the WOPHA board (draft)". Artifacts start private; do NOT share the URL anywhere in the repo. Record the artifact URL only in the task report / progress ledger (`.superpowers/sdd/progress.md` is fine; it never deploys). **If the implementing subagent lacks the Artifact tool, it reports the file ready and the orchestrating session runs the publish step.** When the user later finalizes prices, re-publish with the SAME file path (same URL) and the SAME favicon.

- [ ] **Step 6: Run the full battery and commit**

Run: `npm test && npm run lint`
Expected: all green.

```bash
git add docs/pricing-artifact.html tests/pricing.test.js
git commit -m "docs: board-meeting pricing artifact (private, single-source numbers)"
```

---

### Task 6: Public-page privacy gate + demo-deploy mitigation

**Files:**
- Create: `tools/check-pricing-privacy.mjs`
- Modify: `docs/launch-checklist.md` (§7 list)

**Interfaces:**
- Consumes: `src/_data/pricing.json` (patterns derive from the live tier data, so a price change re-arms the gate automatically); `_site/` build output.
- Produces: `node tools/check-pricing-privacy.mjs` exit 0/1, the repo's standing review gate (style matches `tools/check-redirects.mjs`).

- [ ] **Step 1: Create `tools/check-pricing-privacy.mjs`**

```js
// Review gate (spec 2026-07-17 §4.4): nothing tier/price/SaaS-commercial may
// appear on PUBLIC pages. Scans every built .html outside _site/portal/ for
// pricing markers. Patterns derive from src/_data/pricing.json so a price
// change re-arms the gate. Portal pages are exempt: they are Access-gated in
// production and excluded from open demos (launch checklist §7).
// Tuning note: patterns are chosen to miss legit public copy (the HOA's own
// dues figures, "Payment Links" on membership.html). If a future page trips
// this legitimately, tighten the pattern here and say why in a comment.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(process.argv[2] || "_site");
const pricing = JSON.parse(readFileSync(resolve("src/_data/pricing.json"), "utf8"));

const fmt = (cents) =>
  "$" + (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const patterns = [
  ...pricing.tiers.map((t) => ({
    label: `${t.name} gross price ${fmt(t.gross_monthly_cents)}`,
    re: new RegExp(escapeRe(fmt(t.gross_monthly_cents)) + "(?![\\d,])"),
  })),
  { label: "SaaS", re: /saas/i },
  { label: "gross monthly", re: /gross monthly/i },
  { label: "net monthly", re: /net monthly/i },
  { label: "per-month price marker (/mo)", re: /\/mo\b/ },
  { label: "Subscribe monthly", re: /subscribe monthly/i },
  { label: "tier-named plan", re: /\b(Essentials|Amenities|Complete) (tier|plan)\b/ },
];

let bad = 0;
let files = 0;
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (relative(ROOT, p) === "portal") continue; // Access-gated surface; pricing allowed
      walk(p);
    } else if (entry.name.endsWith(".html")) {
      files++;
      const text = readFileSync(p, "utf8");
      for (const { label, re } of patterns) {
        if (re.test(text)) { bad++; console.log(`${relative(ROOT, p)}: ${label}`); }
      }
    }
  }
})(ROOT);
console.log(bad ? `${bad} pricing leak(s) on public pages` : `pricing privacy OK - ${files} public pages clean`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 2: Run it against a fresh build (both directions)**

```bash
npm run build
node tools/check-pricing-privacy.mjs
```

Expected: `pricing privacy OK - <N> public pages clean`, exit 0.

Now prove the gate actually bites: temporarily append `<p>$99/mo SaaS</p>` to `_site/index.html` (the build output, not the source), re-run `node tools/check-pricing-privacy.mjs`, expect it to list index.html and exit 1. Then `npm run build` again to regenerate a clean `_site`. (Never edit `src/` for this check.)

- [ ] **Step 3: Record the demo-deploy mitigation in the launch checklist**

In `docs/launch-checklist.md` §7, insert two items immediately after the existing `DEMO_OPEN_ADMIN` item (the one at lines 118-120):

```markdown
- [ ] **While any demo deploy runs with `DEMO_OPEN_ADMIN` set (no Cloudflare
      Access):** delete `portal/billing.html` from the staging copy's
      `public/` directory before `wrangler pages deploy`. Demo portal pages
      are public static files; shipping the billing page there would publish
      the service pricing. The sidebar's "Plan & billing" link falls back to
      the index page on demos; that is expected until Access is live. Verify
      the exclusion by fetching `/portal/billing.html` on the deployed demo
      and checking the BODY is not the billing page (unknown paths serve
      index content with status 200, so check the body, not the status).
- [ ] **After Access is live on wopha.com and the pages.dev hostnames:**
      include `portal/billing.html` in deploys again, paste the webmaster's
      Stripe recurring Payment Links into `src/_data/pricing.json`
      (`stripe_link` per tier), rebuild, and set the current plan in
      Portal → Plan & billing once the board subscribes. Run
      `node tools/check-pricing-privacy.mjs` against every build before
      deploying it.
```

- [ ] **Step 4: Run the full battery and commit**

Run: `npm test && npm run lint && npm run build && node tools/check-pricing-privacy.mjs`
Expected: all green, gate exit 0.

```bash
git add tools/check-pricing-privacy.mjs docs/launch-checklist.md
git commit -m "chore: pricing privacy gate for public pages + billing-page demo-deploy exclusion"
```

---

## Execution notes for the orchestrator

- Task order is 1 → 2 → 3 → 4 → 5 → 6 (3 depends on 1+2; 4/5 extend the Task 1 test file; 6 needs the Task 3 page built to prove the gate ignores the portal dir). Tasks 4 and 5 could run after 6 if parallelism is wanted, but the file-level overlap in `tests/pricing.test.js` makes serial execution simpler.
- The user supplies during/after execution: final gross prices (edit `pricing.json`, follow failing tests to the stale docs), the three Stripe recurring Payment Links (his business Stripe, monthly), the street address in the addendum, and the [V1]-[V3] confirmations (which move pending rows to verified in `pricing.json` and both docs; the same failing-test breadcrumb applies).
- Do not deploy anything in this track. If the user asks for a preview refresh while this track is merged locally, the staging copy MUST follow the new launch-checklist exclusion (delete `public/portal/billing.html` before `wrangler pages deploy`).
- Total: 6 tasks. New tests: ~12 (pricing shape/arithmetic/lockstep/docs-sync + plan validator + settings defaults), keeping the suite green throughout.

## Self-review (done at planning time)

- Spec coverage: §3 tiers/net-math → Tasks 1/3/4/5; §4.1 addendum → Task 4; §4.2 artifact → Task 5; §4.3 billing page + plan key + sidebar → Tasks 2/3; §4.4 no-public-pricing → Task 6 gate; §6.1 Weebly savings line → addendum Tier 1 row (no build, correct); §6.4 camera text + policy obligations + one-time hardware quote step → Task 4 §"The entrance camera"; §10 item 4 (camera has no repo build) → honored, docs-only; [V1]-[V3] $0-floor honesty → pricing.json verified/pending split + addendum honesty note + SwimTopia-never-in-savings test; [F6] capital-projects framing → addendum leads with net cost; roadmap key-fob mention → addendum "Roadmap, not priced"; board audience → addendum To: line; PayHOA anchor → data + both docs + billing footnote; sponsorship ~$83/mo → data + docs; pricing-history honesty ($75/mo, $140/mo, $1,300 + $99/yr) → "Why the pricing changed" section; demo-deploy caveat → locked decision 3 + Task 6 checklist edit.
- Placeholder scan: the only bracketed items are the two EXECUTOR/user fill-ins in Task 4 (street address, camera quote), both with exact resolution instructions and a grep gate proving the EXECUTOR bracket is gone; the artifact's base64 slots have exact generation commands and an approved fallback. No TBD/TODO remain.
- Type consistency: tier ids `essentials|amenities|complete` used identically in pricing.json (Task 1), PLAN_KEYS (Task 2), badge ids `plan-badge-<id>` and option values (Task 3); `fmt`/`dollars` formatting identical in portal-shell.js, the Eleventy filter, the test helper, and the gate script; settings API shapes match the existing contract (flat string values, `{key, value}` PUT).
