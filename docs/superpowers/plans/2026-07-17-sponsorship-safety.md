# Sponsorship Program & Safety Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the sponsorship program (public `/sponsors/` page + `sponsor_inquiry` form into the portal inbox + board-editable sponsor grid) and safety publishing (board-editable "Safety & security" summary on `/about/` + the 2026 annual-meeting minutes PDF), per spec §6.2 and §7.

**Architecture:** Pure additive work on the existing stack. Backend: two allowlist extensions in `functions/api/_lib/validate.js` (a new form type; two new `site_content` keys, one with a 3-cell row shape) — the existing `POST /api/forms/submit`, `GET /api/content`, and `PUT /api/admin/content` endpoints then handle everything with zero new routes. Public site: one new Eleventy page (`src/sponsors/index.html`), one new section on `/about/`, and two new renderers in the existing live-content IIFE in `src/assets/js/site.js` (baked-in HTML stays the offline/API-down fallback, exactly like pool hours). Portal: the structured row editor in `src/portal/content.html` is generalized from hardcoded 2-column rows to N-column rows driven by each card's `fields` array, then gains two new cards — no new admin screen.

**Tech Stack:** Eleventy 3 (Nunjucks), Cloudflare Pages Functions + D1, vanilla ES5-style browser JS, vitest, eslint.

**Spec:** `docs/superpowers/specs/2026-07-17-saas-pricing-amenities-design.md` §6.2, §7 (facts from §2 [F5]; context §1, §8, §9, §10).

## Global Constraints

- Copy rules for ALL user-visible text: no em dashes; no governance/volunteer editorializing; page titles use the "Page | Woods of Parkview HOA" pipe style.
- Nothing tier/price/SaaS-commercial in public src/ pages.
- Dynamic DOM rendering uses textContent only (never innerHTML with user/db data); async DOM updates use the portal's isConnected/capture guards convention.
- WCAG 2.2 AA.
- TDD with vitest (suite currently 76 green: npm test); eslint clean (npm run lint); frequent commits.
- Eleventy build: src/ → _site via npm run build; public pages use the base.njk layout; portal pages use portal-base.njk with a pageKey front-matter key.
- Dev server ports 8200-8202 ONLY (Hyper-V reserves 8078-8177/8278-8777/8779-8978; workerd crashes on them).
- Branch redesign-experiment; commit messages follow the repo's existing conventional style (look at git log).

Additional standing rules for this plan:

- **Never push** `redesign-experiment` or `master` (docs/ holds board pricing). Commit locally only.
- **Explicit exclusions:** the §8 dues correction is already done (commit 207d8a9) — do not touch fee copy. Do NOT change the `/about/` "Security minded" camera card copy (the §6.4 "HOA-operated camera" line applies only after a future camera cutover). No sponsor dollar amounts anywhere: amounts are not board-approved; the page is form-first ("request the sponsorship packet").
- **The minutes PDF is never fabricated.** It arrives in Task 7 from the user's Google Drive (or the user places it manually). Tasks 3-6 build and pass without it because `tools/check-links.mjs` already treats `/documents/` misses as warnings (exit code 0), not failures.
- New sponsor/safety copy avoids en dashes too (use "to" in ranges) — simpler than auditing dash variants.
- New public copy avoids apostrophes only where it must also live in `seed.sql` string literals (keeps SQL quoting trivial and the baked-in fallback byte-identical to the seed).

## File Structure

```
functions/api/_lib/validate.js         MODIFIED  Task 1 (FORM_TYPES) + Task 2 (CONTENT_KEYS, per-key shapes)
functions/api/forms/submit.js          MODIFIED  Task 1 (SUBJECTS map)
src/portal/portal-shell.js             MODIFIED  Task 1 (TYPE_LABELS)
schema.sql                             MODIFIED  Task 1 (comment only)
eslint.config.mjs                      MODIFIED  Task 1 (URLSearchParams test global)
tests/forms-submit.test.js             NEW       Task 1
tests/validate.test.js                 MODIFIED  Tasks 1, 2
src/sponsors/index.html                NEW       Task 3
src/sponsors/sponsors.11tydata.js      NEW       Task 3
src/_includes/site-header.njk          MODIFIED  Task 3 (Community group)
src/_includes/site-footer.njk          MODIFIED  Task 3 (Do it online link)
src/sw.js                              MODIFIED  Task 3 (precache + cache bump)
src/assets/css/styles.css              MODIFIED  Task 3 (.sponsor-mark) + Task 5 (.report-list)
src/assets/js/site.js                  MODIFIED  Task 4 (sponsor grid) + Task 5 (safety fill)
src/about/index.html                   MODIFIED  Task 5 (Safety & security section, tint reflow)
seed.sql                               MODIFIED  Task 5 (safety_report row)
src/portal/content.html                MODIFIED  Task 6 (N-column editor + 2 new cards)
src/assets/css/portal.css              MODIFIED  Task 6 (.re-row--3)
docs/launch-checklist.md               MODIFIED  Task 6 (sponsor workflow) + Task 7 (minutes cadence)
src/documents/minutes/2026-02-22-annual-meeting.pdf   NEW  Task 7 (obtained, never fabricated)
```

**Key decisions locked here:**

- **Nav placement: Community ▾** (not About ▾). About holds governance/identity pages (neighborhood, board, documents, contact); sponsors are community life aimed at local businesses and residents, and Community currently has only 3 anchor items, so the group stays balanced. Footer gets "Become a sponsor" under "Do it online".
- **PDF filename: `2026-02-22-annual-meeting.pdf`** — NOT a new name. `/about/documents/` already links `/documents/minutes/2026-02-22-annual-meeting.pdf` (src/about/documents.html line 59), so matching it clears the pending-content warning with zero HTML edits.
- **Content keys:** `sponsors` (rows of 3 strings: name, url, blurb; 0-50 rows — empty list is valid because no sponsors exist yet) and `safety_report` (standard 2-string label/value rows, 1-50).
- **Sponsor "logo":** the grid renders a lettermark (first character of the business name) by default; if the webmaster later commits `src/assets/img/sponsors/<slug>.png`, the client swaps it in only after the image actually loads. No upload feature, no broken-image icons, graceful from day one.

## Baseline verification numbers (measured 2026-07-17 on this branch)

- `npm test` → **11 files, 76 tests**, all green.
- `node tools/check-links.mjs _site` → **17 pages scanned; 0 broken, 9 pending-content warnings** (all 9 are `/documents/minutes/*.pdf` in about/documents/index.html).
- After this plan: **12 files, 85 tests; 18 pages; 0 broken, 8 warnings** (the new /sponsors/ page is page 18; the 2026 PDF resolves its link on both /about/documents/ and /about/, removing 1 of 9 and not adding the new /about/ one; the other 8 minutes PDFs remain a board content task).

## Local manual-verification environment (used by Tasks 3-6)

The admin API is open on localhost (`functions/api/_lib/auth.js` returns `dev@localhost` for hostnames `localhost`/`127.0.0.1`), so the portal and admin PUTs work locally with no Access setup. To get a fresh seeded DB:

```powershell
try { Remove-Item -Recurse -Force .wrangler/state -Confirm:$false -ErrorAction Stop } catch {}
npm run db:schema
npm run db:seed
npm run dev
```

Then browse http://127.0.0.1:8200 . Leave the dev server running in the background during manual steps; stop it before running `npm run build` verification if ports conflict (they don't — build doesn't bind a port).

---

### Task 1: `sponsor_inquiry` form type end to end (validate → submit → inbox label)

**Files:**
- Modify: `functions/api/_lib/validate.js:2`
- Modify: `functions/api/forms/submit.js:3-8`
- Modify: `src/portal/portal-shell.js:51-56`
- Modify: `schema.sql:14` (comment only)
- Modify: `eslint.config.mjs:34` (add `URLSearchParams` to the functions/tests globals)
- Modify: `tests/validate.test.js`
- Create: `tests/forms-submit.test.js`

**Interfaces:**
- Consumes: `validateSubmission(formType, fields, botcheck)` and `FORM_TYPES` from `functions/api/_lib/validate.js`; `fakeDb(routes)` from `tests/helpers/fake-db.js` (routes matched by SQL substring; calls recorded as `{ sql, args }`).
- Produces: `FORM_TYPES` includes `"sponsor_inquiry"`; `POST /api/forms/submit` accepts `form_type=sponsor_inquiry` (fields used by Task 3's form: `business`, `name`, `email`, `phone`, `message`), stores it in `submissions`, emails subject "WOPHA sponsorship inquiry", 303-redirects to `/thanks.html`; the portal inbox/dashboard label is "Sponsorship inquiry" via `TYPE_LABELS.sponsor_inquiry`.

- [ ] **Step 1: Write the failing validation test**

In `tests/validate.test.js`, inside `describe("validateSubmission", ...)`, after the `"accepts a known form type with normal fields"` test, add:

```js
  it("accepts the sponsor_inquiry form type", () => {
    expect(validateSubmission("sponsor_inquiry", {
      business: "Lilburn Hardware",
      name: "Pat Doe",
      email: "pat@example.com",
    }, "").ok).toBe(true);
  });
```

- [ ] **Step 2: Write the failing endpoint test**

Create `tests/forms-submit.test.js`:

```js
import { describe, it, expect } from "vitest";
import { onRequestPost } from "../functions/api/forms/submit.js";
import { fakeDb } from "./helpers/fake-db.js";

function formRequest(entries) {
  // URLSearchParams body: request.formData() parses application/x-www-form-urlencoded,
  // matching a real no-JS <form method="POST"> submit.
  return new Request("http://127.0.0.1:8200/api/forms/submit", {
    method: "POST",
    body: new URLSearchParams(entries),
  });
}

describe("POST /api/forms/submit", () => {
  it("stores a sponsor_inquiry submission and redirects to /thanks.html", async () => {
    const db = fakeDb([{ match: "INSERT INTO submissions" }]);
    const res = await onRequestPost({
      request: formRequest({
        form_type: "sponsor_inquiry",
        business: "Lilburn Hardware",
        name: "Pat Doe",
        email: "pat@example.com",
      }),
      env: { DB: db },
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://127.0.0.1:8200/thanks.html");
    expect(db.calls.length).toBe(1);
    expect(db.calls[0].args[0]).toBe("sponsor_inquiry");
    expect(JSON.parse(db.calls[0].args[1])).toEqual({
      business: "Lilburn Hardware",
      name: "Pat Doe",
      email: "pat@example.com",
    });
  });

  it("rejects unknown form types with 400 and no insert", async () => {
    const db = fakeDb([{ match: "INSERT INTO submissions" }]);
    const res = await onRequestPost({
      request: formRequest({ form_type: "hack", message: "x" }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect(db.calls.length).toBe(0);
  });

  it("rejects a filled honeypot with 400 and no insert", async () => {
    const db = fakeDb([{ match: "INSERT INTO submissions" }]);
    const res = await onRequestPost({
      request: formRequest({ form_type: "sponsor_inquiry", business: "B", botcheck: "on" }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
});
```

- [ ] **Step 3: Run the tests to verify the right ones fail**

Run: `npx vitest run tests/validate.test.js tests/forms-submit.test.js`
Expected: **2 failures** — `accepts the sponsor_inquiry form type` (validateSubmission returns `ok: false`, "Unknown form type") and `stores a sponsor_inquiry submission...` (status 400, not 303). The two rejection tests already pass.

- [ ] **Step 4: Implement the allowlist + subject + label**

`functions/api/_lib/validate.js` line 2 becomes:

```js
export const FORM_TYPES = ["contact_update", "issue_report", "suggestion", "arc_request", "sponsor_inquiry"];
```

`functions/api/forms/submit.js` — the `SUBJECTS` map becomes:

```js
const SUBJECTS = {
  contact_update: "WOPHA contact info update",
  issue_report: "WOPHA issue report",
  suggestion: "WOPHA suggestion",
  arc_request: "WOPHA exterior change request",
  sponsor_inquiry: "WOPHA sponsorship inquiry",
};
```

`src/portal/portal-shell.js` — the `TYPE_LABELS` map becomes:

```js
var TYPE_LABELS = {
  contact_update: "Contact update",
  issue_report: "Issue report",
  suggestion: "Suggestion",
  arc_request: "Exterior change request",
  sponsor_inquiry: "Sponsorship inquiry",
};
```

(The inbox and dashboard already fall back to the raw `form_type` for unknown labels — `TYPE_LABELS[s.form_type] || s.form_type` — so this map entry is the only portal change needed; the inbox detail pane, status stepper, and mailto Reply button all work generically.)

`schema.sql` line 14 comment becomes:

```sql
  form_type TEXT NOT NULL,          -- contact_update | issue_report | suggestion | arc_request | sponsor_inquiry
```

(Comment only; no migration — the column is free text.)

- [ ] **Step 5: Add the URLSearchParams eslint global**

In `eslint.config.mjs`, in the `files: ["functions/**/*.js", "workers/**/*.js", "tests/**/*.js"]` block, the globals object becomes:

```js
      globals: {
        Response: "readonly", fetch: "readonly", URL: "readonly",
        Request: "readonly", console: "readonly", URLSearchParams: "readonly",
      },
```

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test`
Expected: **12 files, 80 tests, all passing** (76 + 1 validate + 3 forms-submit).

Run: `npm run lint`
Expected: exit 0, no errors.

- [ ] **Step 7: Commit**

```bash
git add functions/api/_lib/validate.js functions/api/forms/submit.js src/portal/portal-shell.js schema.sql eslint.config.mjs tests/validate.test.js tests/forms-submit.test.js
git commit -m "feat(forms): sponsor_inquiry form type routed to the portal inbox"
```

---

### Task 2: `sponsors` + `safety_report` content keys with per-key row shapes

**Files:**
- Modify: `functions/api/_lib/validate.js:4,68-81`
- Modify: `tests/validate.test.js` (validateContent describe block)

**Interfaces:**
- Consumes: `validateContent(key, value)` (current contract: 2-string rows, 1-50 of them).
- Produces: `CONTENT_KEYS = ["season_glance", "pool_hours", "sponsors", "safety_report"]`. `validateContent("sponsors", v)` accepts arrays of `[name, url, blurb]` string triples, **including the empty array** (no sponsors yet). `validateContent("safety_report", v)` keeps the standard `[label, value]` pair shape, 1-50 rows. Existing keys are byte-for-byte unaffected. Consumed by: `PUT /api/admin/content` (already calls it), the Task 6 editor (`fields` arrays must match cell counts: 3 for sponsors, 2 for safety_report), and the Task 4/5 public renderers (`row[0]`=name/label, `row[1]`=url/value, `row[2]`=blurb).

- [ ] **Step 1: Write the failing tests**

In `tests/validate.test.js`, inside `describe("validateContent", ...)`, add:

```js
  it("accepts sponsors rows as [name, url, blurb] triples", () => {
    const r = validateContent("sponsors", [
      ["Lilburn Hardware", "https://lilburnhardware.example", "Family owned since 1979."],
    ]);
    expect(r.ok).toBe(true);
  });
  it("accepts an empty sponsors list (no sponsors yet)", () => {
    const r = validateContent("sponsors", []);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual([]);
  });
  it("rejects sponsors rows that are not exactly 3 strings", () => {
    expect(validateContent("sponsors", [["Name", "https://x.example"]]).ok).toBe(false);
    expect(validateContent("sponsors", [["a", "b", "c", "d"]]).ok).toBe(false);
    expect(validateContent("sponsors", [["a", "b", 3]]).ok).toBe(false);
  });
  it("accepts safety_report [label, value] pairs and rejects 3-cell rows there", () => {
    expect(validateContent("safety_report", [["Reported", "Annual meeting, February 22, 2026"]]).ok).toBe(true);
    expect(validateContent("safety_report", [["a", "b", "c"]]).ok).toBe(false);
  });
  it("still rejects empty lists for the 2-column keys", () => {
    expect(validateContent("pool_hours", []).ok).toBe(false);
    expect(validateContent("safety_report", []).ok).toBe(false);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/validate.test.js`
Expected: **4 failures** (the three sponsors tests and the safety_report test fail with "Unknown content key" / wrong shapes; the empty-lists test passes already for pool_hours but fails on safety_report being unknown — counted inside the 4th and 5th tests). Concretely: every new test except none passes; 5 new tests, at least 4 red.

- [ ] **Step 3: Implement per-key shapes**

In `functions/api/_lib/validate.js`, line 4 becomes:

```js
export const CONTENT_KEYS = ["season_glance", "pool_hours", "sponsors", "safety_report"];
```

and `validateContent` becomes:

```js
// Per-key row shape. Default: [label, value] string pairs, at least one row.
// sponsors rows are [name, url, blurb]; an empty list is valid (no sponsors
// yet) — the public page then shows its baked-in reserved-space message.
const CONTENT_SHAPES = { sponsors: { cells: 3, minRows: 0 } };
const DEFAULT_SHAPE = { cells: 2, minRows: 1 };

export function validateContent(key, value) {
  if (!CONTENT_KEYS.includes(key)) return { ok: false, error: "Unknown content key" };
  const shape = CONTENT_SHAPES[key] || DEFAULT_SHAPE;
  if (!Array.isArray(value) || value.length < shape.minRows || value.length > 50) {
    return { ok: false, error: `Value must be a list of ${shape.minRows}–50 rows` };
  }
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== shape.cells ||
        !row.every((cell) => typeof cell === "string" && cell.length <= 200)) {
      return { ok: false, error: `Each row must be ${shape.cells} strings (max 200 chars)` };
    }
  }
  return { ok: true, value };
}
```

(No changes to `GET /api/content` or `PUT /api/admin/content` — both are key-agnostic. No schema change: `site_content` stores JSON text. No backup-worker change: the `site_content` table is already in `TABLES`.)

- [ ] **Step 4: Run the full suite and lint**

Run: `npm test`
Expected: **12 files, 85 tests, all passing** (80 + 5).

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add functions/api/_lib/validate.js tests/validate.test.js
git commit -m "feat(content): sponsors + safety_report site_content keys with per-key row shapes"
```

---

### Task 3: Public `/sponsors/` page, nav + footer links, service-worker precache

**Files:**
- Create: `src/sponsors/index.html`
- Create: `src/sponsors/sponsors.11tydata.js`
- Modify: `src/_includes/site-header.njk:22-32` (Community group)
- Modify: `src/_includes/site-footer.njk:12-20` ("Do it online" list)
- Modify: `src/sw.js:4-34` (cache name + CORE list)
- Modify: `src/assets/css/styles.css` (sponsor styles, after the People section)

**Interfaces:**
- Consumes: `POST /api/forms/submit` with `form_type=sponsor_inquiry` (Task 1); base.njk layout contract (front matter `title`, `description`, `pageKey`, explicit `permalink`; page files contain only the inside-`<main>` markup); shared CSS classes `hero hero--page`, `eyebrow`, `lede`, `section`, `section--tint`, `grid grid--3`, `card`, `form-card form-grid`, `notice`, `btn btn--primary`, `hero-actions`.
- Produces: page at `/sponsors/` with element IDs consumed by Task 4: `#sponsors-grid` (empty `div.grid.grid--3`, `hidden`) and `#sponsors-empty` (the reserved-space paragraph). Anchor `#become` (form) used by the footer link and hero button. CSS classes `.sponsor-card`, `.sponsor-mark` used by Task 4's renderer and Task 6's preview. `pageKey: sponsors` participates in the Community nav group's `is-current-section`.

- [ ] **Step 1: Create the permalink passthrough**

Create `src/sponsors/sponsors.11tydata.js` (same pattern as `src/about/about.11tydata.js`):

```js
// The sponsors page uses a folder-style URL (/sponsors/) instead of the
// site-wide flat *.html permalink that src/src.11tydata.js computes for
// every page. This page sets its own `permalink` in front matter, so pass
// it through unchanged rather than flattening it.
export default {
  eleventyComputed: {
    permalink: (data) => data.permalink,
  },
};
```

- [ ] **Step 2: Create the page**

Create `src/sponsors/index.html` with exactly this content:

```html
---
layout: base.njk
title: Sponsors | Woods of Parkview HOA
description: "Sponsor Woods of Parkview: put your local business in front of 170 neighborhood households at the pool, on the website, and in neighborhood announcements."
pageKey: sponsors
permalink: /sponsors/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">Local businesses, neighborhood amenities</span>
    <h1>Sponsors</h1>
    <p class="lede">Woods of Parkview is 170 households with a busy pool, a summer swim team, and lighted tennis and pickleball courts. Sponsoring the neighborhood puts your business in front of the families who live here, all season long.</p>
    <div class="hero-actions">
      <a class="btn btn--primary" href="#become">Request the sponsorship packet</a>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="benefits-heading">
  <div class="container">
    <span class="eyebrow">What sponsors receive</span>
    <h2 id="benefits-heading">Where your name appears</h2>
    <div class="grid grid--3">
      <div class="card">
        <h3>At the pool</h3>
        <p>A sponsor banner at the pool, seen by member families every day of the swim season and by swim-meet visitors from across the county.</p>
      </div>
      <div class="card">
        <h3>On this website</h3>
        <p>Your logo, a link to your website, and a short blurb on this page, year round.</p>
      </div>
      <div class="card">
        <h3>In announcements</h3>
        <p>Thank-you mentions in neighborhood announcements and at community events through the year.</p>
      </div>
    </div>
    <p>Sponsorship levels are set for each season. Request the packet below and the board will send the current options.</p>
  </div>
</section>

<section class="section section--tint" id="current" aria-labelledby="current-heading">
  <div class="container">
    <span class="eyebrow">Thank you</span>
    <h2 id="current-heading">Our sponsors</h2>
    <p id="sponsors-empty">The sponsor program is just getting started, and this space is reserved. Your business could be the first name here.</p>
    <div class="grid grid--3" id="sponsors-grid" hidden></div>
  </div>
</section>

<section class="section" id="become" aria-labelledby="become-heading">
  <div class="container">
    <span class="eyebrow">Get the details</span>
    <h2 id="become-heading">Become a sponsor</h2>
    <p class="lede">Tell us a little about your business and the board will follow up with the sponsorship packet.</p>
    <form class="form-card form-grid" action="/api/forms/submit" method="POST">
      <input type="hidden" name="form_type" value="sponsor_inquiry">
      <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <div>
        <label for="sp-business">Business name</label>
        <input id="sp-business" name="business" type="text" required autocomplete="organization">
      </div>
      <div>
        <label for="sp-name">Contact name</label>
        <input id="sp-name" name="name" type="text" required autocomplete="name">
      </div>
      <div>
        <label for="sp-email">Email</label>
        <input id="sp-email" name="email" type="email" required autocomplete="email">
      </div>
      <div>
        <label for="sp-phone">Phone (optional)</label>
        <input id="sp-phone" name="phone" type="tel" autocomplete="tel">
      </div>
      <div>
        <label for="sp-message">Anything we should know? (optional)</label>
        <textarea id="sp-message" name="message" rows="4" placeholder="What your business does, and what you have in mind"></textarea>
      </div>
      <div>
        <button class="btn btn--primary" type="submit">Request the sponsorship packet</button>
      </div>
    </form>
    <div class="notice">
      <p>Sponsorship payments go to the homeowners association and support neighborhood amenities and events.</p>
    </div>
  </div>
</section>
```

(Copy notes: no dollar amounts anywhere; no em or en dashes; form field names `business`, `name`, `email`, `phone`, `message` match the Task 1 test and stay under the validator's 20-field/4000-char limits; "170 households" matches the existing site copy on /about/.)

- [ ] **Step 3: Add the nav item (Community ▾)**

In `src/_includes/site-header.njk`, the Community group (lines 22-32) becomes:

```njk
        <li class="nav-group">
          <button type="button" class="nav-disclosure{% if pageKey in ['community', 'sponsors'] %} is-current-section{% endif %}" aria-expanded="false" aria-controls="menu-community">
            Community
            <svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="nav-menu" id="menu-community">
            <li><a href="/community/#events">Events &amp; calendar</a></li>
            <li><a href="/community/#connect">Get connected</a></li>
            <li><a href="/community/#announcements">Announcements</a></li>
            <li><a href="/sponsors/"{% if pageKey == 'sponsors' %} aria-current="page"{% endif %}>Sponsors</a></li>
          </ul>
        </li>
```

- [ ] **Step 4: Add the footer link**

In `src/_includes/site-footer.njk`, the "Do it online" list becomes:

```html
      <ul>
        <li><a href="/membership/#pay">Pay dues</a></li>
        <li><a href="/amenities/tennis/#reserve">Reserve a court</a></li>
        <li><a href="/amenities/pool/#party">Book a pool party</a></li>
        <li><a href="/about/contact/#suggestions">Suggestion box</a></li>
        <li><a href="/sponsors/#become">Become a sponsor</a></li>
        <li><a href="/portal/">Board portal</a></li>
      </ul>
```

- [ ] **Step 5: Precache the new page**

In `src/sw.js`: line 4 becomes `var CACHE = "wopha-v4";` and in `CORE`, after `"/community/",` add:

```js
  "/sponsors/",
```

- [ ] **Step 6: Add the sponsor styles**

In `src/assets/css/styles.css`, immediately after the People section (after the `.person p { ... }` rule, before `/* ---- Forms ... */`), insert:

```css
/* ---- Sponsors (public /sponsors/ grid; portal preview reuses these) ------ */

.sponsor-card h3 { margin-block: var(--space-2) var(--space-1); }
.sponsor-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  background: var(--sand);
  color: var(--pine);
  font-family: var(--display);
  font-size: 1.5rem;
  font-weight: 600;
  overflow: hidden;
}
.sponsor-mark img { width: 100%; height: 100%; object-fit: contain; }
```

(The lettermark is decorative (`aria-hidden` set by the renderer); the business name is adjacent real text, so no contrast requirement applies to the mark, and pine-on-sand passes AA anyway.)

- [ ] **Step 7: Build and check**

Run: `npm run build`
Expected: exit 0; `_site/sponsors/index.html` exists.

Run: `node tools/check-links.mjs _site`
Expected: `18 pages scanned; 0 broken, 9 pending-content warnings, 5 runtime routes skipped.`

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 8: Manual verification (dev server)**

With the seeded dev server running (see "Local manual-verification environment"):

1. http://127.0.0.1:8200/sponsors/ renders; "Our sponsors" shows the reserved-space paragraph (grid hidden — no JS for it exists yet; the `hidden` attribute is baked in).
2. The header Community menu lists Sponsors; on /sponsors/ the Community button carries `is-current-section` and the menu item `aria-current="page"`. Keyboard: Tab to the Community button, ArrowDown opens the menu and walks to Sponsors, Esc closes.
3. Footer shows "Become a sponsor".
4. Submit the form (any business/name/email) → lands on /thanks.html; http://127.0.0.1:8200/portal/inbox.html shows a new item labeled **Sponsorship inquiry** with the fields in the detail pane.

- [ ] **Step 9: Commit**

```bash
git add src/sponsors/ src/_includes/site-header.njk src/_includes/site-footer.njk src/sw.js src/assets/css/styles.css
git commit -m "Sponsors: public /sponsors/ page with inquiry form, Community nav + footer links"
```

---

### Task 4: Live sponsor grid rendered from site_content

**Files:**
- Modify: `src/assets/js/site.js:169-207` (the live-content IIFE)

**Interfaces:**
- Consumes: `GET /api/content` → `{ sponsors: [[name, url, blurb], ...], ... }` (Task 2 shape); `#sponsors-grid` / `#sponsors-empty` from Task 3; CSS `.sponsor-card` / `.sponsor-mark` from Task 3.
- Produces: sponsor card DOM shape mirrored by Task 6's portal preview: `div.card.sponsor-card` > `span.sponsor-mark[aria-hidden]` (lettermark, optional img swap), `h3` (> `a[href]` only for https URLs), `p` blurb. Optional logo convention: `/assets/img/sponsors/<slug>.png` where slug = name lowercased, runs of non-alphanumerics collapsed to `-`, trimmed.

- [ ] **Step 1: Extend the live-content IIFE**

In `src/assets/js/site.js`, replace the final IIFE (the one beginning `// Live site content:`) with:

```js
// Live site content: board-edited values (pool hours, season glance, sponsors)
// fetched from the portal API. Baked-in HTML is the fallback: offline or
// API-down leaves the page exactly as authored.
(function () {
  var glance = document.getElementById("season-glance");
  var hours = document.getElementById("pool-hours-body");
  var sponsorsGrid = document.getElementById("sponsors-grid");
  if (!glance && !hours && !sponsorsGrid) return;
  fetch("/api/content").then(function (r) {
    if (!r.ok) throw new Error("bad status");
    return r.json();
  }).then(function (content) {
    function fill(el, rows, makeRow) {
      if (!el || !Array.isArray(rows) || !rows.length) return;
      el.textContent = "";
      rows.forEach(function (row) { el.appendChild(makeRow(row)); });
    }
    fill(glance, content.season_glance, function (row) {
      var li = document.createElement("li");
      var s = document.createElement("span");
      s.textContent = row[0];
      var st = document.createElement("strong");
      st.textContent = row[1];
      li.appendChild(s);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(st);
      return li;
    });
    fill(hours, content.pool_hours, function (row) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = row[0];
      var td2 = document.createElement("td");
      td2.textContent = row[1];
      tr.appendChild(td1);
      tr.appendChild(td2);
      return tr;
    });
    fill(sponsorsGrid, content.sponsors, function (row) {
      var name = row[0] || "";
      var url = row[1] || "";
      var blurb = row[2] || "";
      var card = document.createElement("div");
      card.className = "card sponsor-card";
      var mark = document.createElement("span");
      mark.className = "sponsor-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = name.charAt(0).toUpperCase();
      // Optional committed logo: /assets/img/sponsors/<slug>.png replaces the
      // lettermark only after it actually loads (no broken-image icon, no
      // layout jump; the mark box keeps its size either way).
      var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (slug) {
        var img = document.createElement("img");
        img.alt = "";
        img.addEventListener("load", function () {
          if (!mark.isConnected) return; // page content replaced while loading
          mark.textContent = "";
          mark.appendChild(img);
        });
        img.src = "/assets/img/sponsors/" + slug + ".png";
      }
      card.appendChild(mark);
      var h = document.createElement("h3");
      if (/^https:\/\//.test(url)) {
        var a = document.createElement("a");
        a.textContent = name;
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        h.appendChild(a);
      } else {
        h.textContent = name;
      }
      card.appendChild(h);
      if (blurb) {
        var p = document.createElement("p");
        p.textContent = blurb;
        card.appendChild(p);
      }
      return card;
    });
    if (sponsorsGrid && Array.isArray(content.sponsors) && content.sponsors.length) {
      var empty = document.getElementById("sponsors-empty");
      if (empty) empty.hidden = true;
      sponsorsGrid.hidden = false;
    }
  }).catch(function () { /* keep baked-in content */ });
})();
```

Notes on this rewrite:
- `fill`'s `makeRow` now takes the whole row (needed for 3-cell sponsor rows); the glance/hours renderers are updated in place to the new signature with identical output. Search the file for other `fill(` callers — there are none outside this IIFE.
- All text lands via `textContent`; the only attribute set from db data is `a.href`, gated to `https://` URLs (the portal validator caps cells at 200 chars; non-https text simply renders unlinked).
- Empty/missing `content.sponsors` leaves the baked-in reserved-space paragraph untouched.

- [ ] **Step 2: Lint and build**

Run: `npm run lint`
Expected: exit 0.

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Manual verification (dev server)**

With the seeded dev server running:

1. Load http://127.0.0.1:8200/sponsors/ — reserved-space message still shows (no sponsors key in the seed; the grid stays hidden).
2. Save a sponsor row through the admin API (open on localhost):

```powershell
curl.exe -X PUT http://127.0.0.1:8200/api/admin/content -H "Content-Type: application/json" -d '{\"key\":\"sponsors\",\"value\":[[\"Lilburn Hardware\",\"https://example.com\",\"Family owned since 1979.\"]]}'
```

Expected response: `{"ok":true}`.
3. Reload /sponsors/ — the grid appears: lettermark "L", "Lilburn Hardware" as a link opening example.com in a new tab, blurb below; the reserved-space paragraph is gone.
4. Regression: homepage season glance and /amenities/pool/ hours still render from the API (seed values).
5. Clear it back to the empty state and confirm the reserved-space message returns:

```powershell
curl.exe -X PUT http://127.0.0.1:8200/api/admin/content -H "Content-Type: application/json" -d '{\"key\":\"sponsors\",\"value\":[]}'
```

- [ ] **Step 4: Run the full suite (regression)**

Run: `npm test`
Expected: 12 files, 85 tests, all passing.

- [ ] **Step 5: Commit**

```bash
git add src/assets/js/site.js
git commit -m "Sponsors: live sponsor grid rendered from site_content with lettermark fallback"
```

---

### Task 5: `/about/` Safety & security section (board-editable summary)

**Files:**
- Modify: `src/about/index.html` (new section after the stats section; tint reflow on the two sections below it)
- Modify: `src/assets/js/site.js` (safety fill in the live-content IIFE)
- Modify: `src/assets/css/styles.css` (`.report-list`)
- Modify: `seed.sql` (safety_report row in the `site_content` INSERT)

**Interfaces:**
- Consumes: `safety_report` content key (Task 2, `[label, value]` pairs); the Task 4 IIFE structure (`fill(el, rows, makeRow)` where makeRow takes the whole row).
- Produces: `dl#safety-report.report-list` on `/about/` whose row DOM shape (`div` > `dt` + `dd`) is mirrored by Task 6's portal preview; seed rows that byte-match the baked-in HTML; the static link to `/documents/minutes/2026-02-22-annual-meeting.pdf` that Task 7 satisfies.

- [ ] **Step 1: Insert the section and reflow the tints**

In `src/about/index.html`, insert this section **between** the stats section (`</section>` after the photo-placeholder div, line 43) and the "Our streets" section:

```html
<section class="section section--tint" id="safety" aria-labelledby="safety-heading">
  <div class="container">
    <span class="eyebrow">What the police reported</span>
    <h2 id="safety-heading">Safety &amp; security</h2>
    <p class="lede">Each year the Lilburn Police Department and Lilburn Code Enforcement review neighborhood activity at the annual meeting. This is the most recent report, summarized as presented.</p>
    <dl class="report-list" id="safety-report">
      <div>
        <dt>Reported</dt>
        <dd>Annual meeting, February 22, 2026, by Cpl. Johnson (Lilburn Police Department) and Officer McCord (Lilburn Code Enforcement)</dd>
      </div>
      <div>
        <dt>Police calls, Jan 1, 2024 to Feb 20, 2025</dt>
        <dd>Five minor incidents on neighborhood streets, plus 7 animal complaints</dd>
      </div>
      <div>
        <dt>Suspicious vehicles</dt>
        <dd>Two calls; both cleared</dd>
      </div>
      <div>
        <dt>Calls at the pool</dt>
        <dd>Two calls involving homeless persons; one person was given a courtesy ride to a shelter</dd>
      </div>
      <div>
        <dt>Suspicious persons</dt>
        <dd>One call; the person was gone when officers arrived</dd>
      </div>
      <div>
        <dt>Code enforcement, Feb 2025 to Feb 2026</dt>
        <dd>High grass 7 cases, open or outdoor storage 3, junk vehicles 4 (1 open), illegal construction 1 (1 open), trees 1, miscellaneous 3</dd>
      </div>
      <div>
        <dt>Police guidance</dt>
        <dd>Keep homes well lit and consider residential security cameras. The entrance camera and neighborhood upkeep were both noted as helping deter crime.</dd>
      </div>
      <div>
        <dt>Report a code issue</dt>
        <dd>SeeClickFix at cityoflilburn.com/seeclickfix, Officer Charles (470) 307-6533, Officer McCord (470) 226-6180</dd>
      </div>
    </dl>
    <p>Full details are in the <a href="/documents/minutes/2026-02-22-annual-meeting.pdf">2026 annual meeting minutes (PDF)</a>. All minutes are on the <a href="/about/documents/#minutes">Governing documents</a> page.</p>
  </div>
</section>
```

Then keep the page's tint alternation by swapping the two sections below it:
- "Our streets" section: `class="section section--tint"` → `class="section"`.
- "Go deeper" section (`aria-labelledby="more-heading"`): `class="section"` → `class="section section--tint"`.

Resulting order: stats (plain) → safety (tint) → streets (plain) → go deeper (tint).

Copy fidelity notes (spec §2 [F5], all facts verbatim, neutral, dated; the summary must not editorialize beyond what the PD reported): five minor incidents = 2 suspicious vehicles (cleared) + 2 pool calls involving homeless persons (one courtesy ride to a shelter) + 1 suspicious-persons call (gone on arrival); 7 animal complaints; code stats Feb 2025 to Feb 2026 as listed; Cpl. Johnson recommended well-lit homes and residential security cameras and noted the entrance camera and neighborhood upkeep as crime deterrents; contacts as listed. Do NOT touch the existing "Security minded" card in the stats section.

- [ ] **Step 2: Add the report-list styles**

In `src/assets/css/styles.css`, immediately after the Sponsors block added in Task 3, insert:

```css
/* ---- Report list (annual safety summary on /about/) ---------------------- */

.report-list { margin-block: var(--space-6); max-width: 52rem; }
.report-list > div { padding-block: var(--space-3); border-bottom: 1px solid var(--line); }
.report-list > div:last-child { border-bottom: none; }
.report-list dt { font-weight: 700; }
.report-list dd { margin: var(--space-1) 0 0; color: var(--ink-soft); }
@media (min-width: 700px) {
  .report-list > div { display: grid; grid-template-columns: 18rem 1fr; gap: var(--space-4); }
  .report-list dd { margin-top: 0; }
}
```

(Contrast on the tint section: `--ink-soft` on `--sand` is 6.46:1, AA per the redesign plan's contrast table; the `--line` border is decorative.)

- [ ] **Step 3: Fill the list from the API**

In `src/assets/js/site.js`, in the live-content IIFE (Task 4's version):

1. After `var sponsorsGrid = ...` add:

```js
  var safety = document.getElementById("safety-report");
```

2. The gate becomes:

```js
  if (!glance && !hours && !sponsorsGrid && !safety) return;
```

3. After the `fill(sponsorsGrid, ...)` call (before the `if (sponsorsGrid && ...)` empty-state block), add:

```js
    fill(safety, content.safety_report, function (row) {
      var div = document.createElement("div");
      var dt = document.createElement("dt");
      dt.textContent = row[0];
      var dd = document.createElement("dd");
      dd.textContent = row[1];
      div.appendChild(dt);
      div.appendChild(dd);
      return div;
    });
```

4. Update the IIFE's leading comment to `// Live site content: board-edited values (pool hours, season glance, sponsors, safety summary)` (keep the rest of the comment).

- [ ] **Step 4: Seed the key**

In `seed.sql`, the `site_content` INSERT gains a third row (comma after the `pool_hours` row, then):

```sql
  ('safety_report', '[["Reported","Annual meeting, February 22, 2026, by Cpl. Johnson (Lilburn Police Department) and Officer McCord (Lilburn Code Enforcement)"],["Police calls, Jan 1, 2024 to Feb 20, 2025","Five minor incidents on neighborhood streets, plus 7 animal complaints"],["Suspicious vehicles","Two calls; both cleared"],["Calls at the pool","Two calls involving homeless persons; one person was given a courtesy ride to a shelter"],["Suspicious persons","One call; the person was gone when officers arrived"],["Code enforcement, Feb 2025 to Feb 2026","High grass 7 cases, open or outdoor storage 3, junk vehicles 4 (1 open), illegal construction 1 (1 open), trees 1, miscellaneous 3"],["Police guidance","Keep homes well lit and consider residential security cameras. The entrance camera and neighborhood upkeep were both noted as helping deter crime."],["Report a code issue","SeeClickFix at cityoflilburn.com/seeclickfix, Officer Charles (470) 307-6533, Officer McCord (470) 226-6180"]]');
```

(Values are byte-identical to the baked-in `dd` text — the API fill visibly changes nothing until the board edits. No apostrophes, so no SQL escaping. Every cell is under 200 chars. Do not seed a `sponsors` row: the empty state is the launch reality.)

- [ ] **Step 5: Lint, build, link check**

Run: `npm run lint` → exit 0.
Run: `npm run build` → exit 0.
Run: `node tools/check-links.mjs _site`
Expected: `18 pages scanned; 0 broken, 10 pending-content warnings, 5 runtime routes skipped.` (One MORE warning than Task 3: /about/ now links the 2026 minutes PDF, which arrives in Task 7. Warnings do not fail the check.)

- [ ] **Step 6: Manual verification (dev server, reseeded)**

Reset the local DB so the new seed row loads (see "Local manual-verification environment"), then:

1. http://127.0.0.1:8200/about/ shows Safety & security between the stats and streets sections; the list matches the seed; tints alternate plain/tint/plain/tint down the page.
2. Edit one value via the admin API and reload to see it change (this proves board-editable-without-deploy):

```powershell
curl.exe -X PUT http://127.0.0.1:8200/api/admin/content -H "Content-Type: application/json" -d '{\"key\":\"safety_report\",\"value\":[[\"Reported\",\"TEST EDIT\"]]}'
```

3. Restore by re-running the reset + reseed.
4. Zoom to 200% and narrow the window: the two-column rows stack; nothing truncates (WCAG 1.4.4/1.4.10).

- [ ] **Step 7: Run the full suite (regression)**

Run: `npm test` → 12 files, 85 tests, all passing.

- [ ] **Step 8: Commit**

```bash
git add src/about/index.html src/assets/js/site.js src/assets/css/styles.css seed.sql
git commit -m "About: board-editable Safety & security summary from the 2026 annual meeting"
```

---

### Task 6: Portal content editor: N-column rows + sponsor and safety cards

**Files:**
- Modify: `src/portal/content.html` (two new card sections + script generalization)
- Modify: `src/assets/css/portal.css` (`.re-row--3` after the `.re-row` rules, line ~585)
- Modify: `docs/launch-checklist.md` (sponsor workflow section)

**Interfaces:**
- Consumes: `PUT /api/admin/content` with `{key, value}` (Task 2 validation: sponsors = 3-cell rows, empty allowed; safety_report = 2-cell rows); `GET /api/content` per-key `updated_at` map; portal-shell globals `api()`, `el()`, `toast()`, `skeleton()`, `showError()`; public CSS `.sponsor-card`/`.sponsor-mark`/`.report-list` (portal-base.njk loads styles.css before portal.css, so previews inherit them).
- Produces: board-facing editing for both keys with live previews mirroring the public DOM. The editor's `card.fields` arrays define column labels: sponsors `["Business name", "Website (https)", "One-line blurb"]`, safety `["Label", "Detail"]`.

- [ ] **Step 1: Add the two card sections**

In `src/portal/content.html`, after the `pool_hours` section (line 39's `</section>`) and before the "Portal settings" section, insert:

```html
      <section class="portal-card portal-section content-card" data-key="sponsors" aria-labelledby="cc-sponsors">
        <h2 id="cc-sponsors">Current sponsors</h2>
        <p class="field-help">Shown in the sponsor grid on the public Sponsors page. Each row is one business: name, website (https), one-line blurb. Saving an empty list is fine; the page then shows its reserved-space message. Logos are optional: send the image file to the webmaster and the site shows a lettermark until it ships.</p>
        <div class="row-editor"></div>
        <p><button type="button" class="btn btn--sm add-row">+ Add row</button></p>
        <h3>Preview: how visitors will see it</h3>
        <div class="content-preview preview-slot"></div>
        <p>
          <button type="button" class="btn btn--primary save-btn">Save</button>
          <span class="field-error save-error" tabindex="-1" hidden></span>
        </p>
        <p class="field-help updated-note"></p>
      </section>

      <section class="portal-card portal-section content-card" data-key="safety_report" aria-labelledby="cc-safety">
        <h2 id="cc-safety">Safety report</h2>
        <p class="field-help">Shown in the Safety &amp; security section of the public About page. Update it after each annual meeting with what the police and code enforcement reported; keep it to the facts as presented at the meeting.</p>
        <div class="row-editor"></div>
        <p><button type="button" class="btn btn--sm add-row">+ Add row</button></p>
        <h3>Preview: how residents will see it</h3>
        <div class="content-preview preview-slot"></div>
        <p>
          <button type="button" class="btn btn--primary save-btn">Save</button>
          <span class="field-error save-error" tabindex="-1" hidden></span>
        </p>
        <p class="field-help updated-note"></p>
      </section>
```

- [ ] **Step 2: Add the preview renderers**

In the page script, after `renderHoursPreview` (line ~115), add:

```js
      /* MIRROR of the public sponsor grid in src/sponsors/index.html
         (div.grid.grid--3#sponsors-grid) plus site.js fill()'s card shape
         (div.card.sponsor-card > span.sponsor-mark lettermark, h3 name,
         p blurb). The preview shows the URL as plain text under the name;
         the public page links the name only for https URLs and can swap a
         committed logo image into the mark. Keep the shape in sync. */
      function renderSponsorsPreview(rows) {
        var grid = el("div", "grid grid--3");
        rows.forEach(function (r) {
          var card = el("div", "card sponsor-card");
          var mark = el("span", "sponsor-mark", (r[0] || "?").charAt(0).toUpperCase());
          mark.setAttribute("aria-hidden", "true");
          card.appendChild(mark);
          card.appendChild(el("h4", null, r[0]));
          if (r[1]) card.appendChild(el("p", "field-help", r[1]));
          if (r[2]) card.appendChild(el("p", null, r[2]));
          grid.appendChild(card);
        });
        return grid;
      }

      /* MIRROR of the safety list in src/about/index.html
         (dl.report-list#safety-report) plus site.js fill()'s row shape
         (div > dt label, dd value). Keep in sync. */
      function renderSafetyPreview(rows) {
        var dl = el("dl", "report-list");
        rows.forEach(function (r) {
          var div = el("div");
          div.appendChild(el("dt", null, r[0]));
          div.appendChild(el("dd", null, r[1]));
          dl.appendChild(div);
        });
        return dl;
      }
```

- [ ] **Step 3: Generalize the cards to N columns**

Still in the script, make these exact replacements:

1. The `cards` array becomes:

```js
      var cards = [
        { key: "season_glance", fields: ["Label", "Value"], preview: renderGlancePreview },
        { key: "pool_hours", fields: ["Day", "Hours"], preview: renderHoursPreview },
        { key: "sponsors", fields: ["Business name", "Website (https)", "One-line blurb"], allowEmpty: true, preview: renderSponsorsPreview },
        { key: "safety_report", fields: ["Label", "Detail"], preview: renderSafetyPreview },
      ];
```

2. In the add-row click handler, `card.rows.push(["", ""]);` becomes:

```js
          card.rows.push(card.fields.map(function () { return ""; }));
```

and the focus line `rowsEls[rowsEls.length - 2].focus();` becomes:

```js
          if (rowsEls.length) rowsEls[rowsEls.length - card.fields.length].focus(); // new row's first input
```

(replacing the whole existing two-line `var rowsEls ... focus()` block with the `var rowsEls` line kept as is).

3. In the save handler, the row filter becomes:

```js
          var value = card.rows.filter(function (r) {
            return r.some(function (cell) { return cell.trim(); });
          });
```

and the empty guard becomes:

```js
          if (!value.length && !card.allowEmpty) {
            card.saveError.textContent = "Add at least one row before saving.";
            card.saveError.hidden = false;
            card.saveError.focus();
            return;
          }
```

(An empty sponsors list is a valid save: the backend accepts `[]` for sponsors only, and the public page shows its reserved-space message.)

4. In `renderEditor`, replace the hardcoded two-input build (the block from `var label = el("input");` through `r.appendChild(value);`, including the two `appendChild` calls for label/value at the bottom of the row assembly) so the row loop reads:

```js
        card.rows.forEach(function (row, i) {
          var r = el("div", "re-row" + (card.fields.length === 3 ? " re-row--3" : ""));

          card.fields.forEach(function (fieldName, c) {
            var input = el("input");
            input.type = "text";
            input.maxLength = 200;
            input.value = row[c];
            input.setAttribute("aria-label", "Row " + (i + 1) + " " + fieldName.toLowerCase());
            input.addEventListener("input", function () { row[c] = input.value; renderPreview(card); });
            r.appendChild(input);
          });

          var up = el("button", "icon-btn icon-btn--up", "↑");
```

(The up/down/remove buttons and the rest of `renderEditor`, `moveRow` included, are untouched — they operate on whole rows.)

5. In `renderPreview`, the filter becomes the same `.some(...)` expression as the save handler, and the empty branch becomes:

```js
        if (!rows.length) {
          card.previewSlot.appendChild(el("p", "field-help",
            card.allowEmpty
              ? "No rows. The public page shows its reserved-space message."
              : "Add a row to see the preview."));
          return;
        }
```

6. In the initial load `.then(...)`, the row mapping becomes shape-tolerant:

```js
          card.rows = (content[card.key] || []).map(function (r) {
            return card.fields.map(function (_, c) { return typeof r[c] === "string" ? r[c] : ""; });
          });
```

- [ ] **Step 4: Add the 3-column row CSS**

In `src/assets/css/portal.css`, directly after the existing `.re-row input { ... }` rule block and before the `.icon-btn` rules, add:

```css
.re-row--3 { grid-template-columns: 1fr 1fr 1fr auto auto auto; }
```

and extend the existing small-screen media query (line ~604) to:

```css
@media (max-width: 639.98px) {
  .re-row { grid-template-columns: 1fr 1fr auto; }
  .re-row .icon-btn--up, .re-row .icon-btn--down { display: none; }
  .re-row--3 { grid-template-columns: 1fr 1fr auto; }
  .re-row--3 input:first-child { grid-column: 1 / -1; }
}
```

(Mobile: the business name gets its own full-width line; website + blurb + remove share the second line; reorder buttons are already hidden at this width.)

- [ ] **Step 5: Add the board's sponsor workflow to the launch checklist**

In `docs/launch-checklist.md`, after section "## 4c. Dues transparency (membership.html)", insert:

```markdown
## 4d. Sponsors (sponsors page)

- [ ] When a sponsorship is confirmed, add the business in the portal
      (Site content → Current sponsors: name, https website, one-line blurb).
      It appears on /sponsors/ immediately; no deploy needed.
- [ ] Optional logo: send the webmaster a square image. It ships as
      `src/assets/img/sponsors/<business-name-slug>.png` with the next
      deploy; until then the site shows a lettermark automatically.
```

- [ ] **Step 6: Lint and build**

Run: `npm run lint` → exit 0 (content.html's inline script is not linted; portal-shell.js already passed in Task 1).
Run: `npm run build` → exit 0.
Run: `npm test` → 12 files, 85 tests (no backend change in this task).

- [ ] **Step 7: Manual verification (dev server, seeded)**

Reset + reseed + `npm run dev`, then on http://127.0.0.1:8200/portal/content.html:

1. Four cards render. Season glance and Pool hours load their seed rows and behave exactly as before (regression: edit, reorder, save, toast).
2. **Current sponsors** loads empty; the preview slot says "No rows. The public page shows its reserved-space message." Add a row (3 inputs appear, labeled Business name / Website (https) / One-line blurb via aria-label); the preview shows the sponsor card with lettermark. Save → toast; /sponsors/ shows the grid.
3. Remove the row and Save again → saves cleanly (empty allowed); /sponsors/ shows the reserved-space message again.
4. **Safety report** loads the 8 seed rows; the preview mirrors the /about/ list. Edit a Detail cell, Save, confirm /about/ updates on reload.
5. Keyboard: Tab through a sponsors row (3 inputs, then up/down/remove buttons); reorder with the arrow buttons; focus lands per the existing moveRow behavior. Narrow the window below 640px: sponsor rows wrap with the name full-width.
6. `updated-note` under each new card shows "Last updated ... (UTC)." after its first save.

- [ ] **Step 8: Commit**

```bash
git add src/portal/content.html src/assets/css/portal.css docs/launch-checklist.md
git commit -m "portal: content editor cards for sponsors + safety report (N-column rows, empty-list save)"
```

---

### Task 7: Publish the 2026 annual-meeting minutes PDF

**Files:**
- Create: `src/documents/minutes/2026-02-22-annual-meeting.pdf` (obtained from the user's Google Drive — NEVER fabricated)
- Modify: `docs/launch-checklist.md` (section 4: mark 2026 done, add the annual cadence item)

**Interfaces:**
- Consumes: the pending links to `/documents/minutes/2026-02-22-annual-meeting.pdf` already present on `/about/documents/` (src/about/documents.html:59) and `/about/` (Task 5). `src/documents/` is already passthrough-copied by `eleventy.config.js`, so the file ships at `/documents/minutes/...` with no config change.
- Produces: the first real minutes entry; link-check pending-content warnings drop 10 → 8.

- [ ] **Step 1: Create the directory**

```powershell
New-Item -ItemType Directory -Force src/documents/minutes | Out-Null
```

- [ ] **Step 2: Obtain the PDF (strict rules)**

The file is "WOPHA Annual Meeting 2.22.26.pdf", Google Drive file id `17UmBediok9POi-VT4Kj9LuYmA5pQsvxT` (the user's Drive; also attached to a March 2026 board email from wophalilburn@gmail.com).

1. Load the Drive tool schema: ToolSearch query `select:mcp__claude_ai_Google_Drive__download_file_content` (fall back to `mcp__claude_ai_Google_Drive__read_file_content` / `get_file_metadata` to locate it if needed).
2. If the tool can deliver the actual PDF bytes (e.g. base64), write them to `src/documents/minutes/2026-02-22-annual-meeting.pdf`.
3. If the tool is unavailable, errors, or returns only **extracted text** instead of the PDF itself: **STOP. Do not reconstruct, regenerate, or placeholder the PDF.** Ask the user to save the file manually to `src/documents/minutes/2026-02-22-annual-meeting.pdf` and wait. All earlier tasks are already committed; nothing else in this plan depends on the file except this task's remaining steps.

- [ ] **Step 3: Verify it is a real PDF**

```powershell
Get-Item src/documents/minutes/2026-02-22-annual-meeting.pdf | Select-Object Name, Length
$bytes = Get-Content src/documents/minutes/2026-02-22-annual-meeting.pdf -AsByteStream -TotalCount 5
[System.Text.Encoding]::ASCII.GetString($bytes)
```

Expected: Length plausibly over 50 KB (a multi-page scanned/exported meeting document), and the header string `%PDF-`. If either fails, return to Step 2's stop rule.

- [ ] **Step 4: Build and confirm the warnings drop**

Run: `npm run build`
Expected: exit 0; `_site/documents/minutes/2026-02-22-annual-meeting.pdf` exists.

Run: `node tools/check-links.mjs _site`
Expected: `18 pages scanned; 0 broken, 8 pending-content warnings, 5 runtime routes skipped.` — the 2026 PDF line is gone from the warning list (it was referenced from both /about/documents/ and /about/); the remaining 8 warnings are the older minutes, still a board content task.

- [ ] **Step 5: Update the launch checklist**

In `docs/launch-checklist.md` section "## 4. Documents (board.html)", after the existing "Collect meeting minutes..." item, add:

```markdown
- [x] 2026 annual-meeting minutes published
      (`src/documents/minutes/2026-02-22-annual-meeting.pdf`, linked from
      /about/documents/ and the About page's Safety & security section).
- [ ] Each year after the annual meeting: save the minutes PDF into
      `src/documents/minutes/` as `YYYY-MM-DD-annual-meeting.pdf`, add its
      row to the minutes table on /about/documents/, update the PDF link in
      the About page's Safety & security section, and refresh that page's
      summary in the portal (Site content → Safety report).
```

- [ ] **Step 6: Commit**

```bash
git add src/documents/minutes/2026-02-22-annual-meeting.pdf docs/launch-checklist.md
git commit -m "docs: publish 2026-02-22 annual meeting minutes PDF + yearly minutes/safety cadence"
```

---

### Task 8: Final gates and spec-compliance sweep

**Files:**
- No planned modifications (fixes only if a gate fails).

**Interfaces:**
- Consumes: everything above.
- Produces: the track's done-state evidence.

- [ ] **Step 1: Full automated gates**

Run each and confirm:

```
npm test                              → 12 files, 85 tests, all passing
npm run lint                          → exit 0
npm run build                         → exit 0
node tools/check-links.mjs _site      → 18 pages scanned; 0 broken, 8 pending-content warnings
node tools/check-redirects.mjs _site  → _redirects OK — all destinations exist
```

- [ ] **Step 2: No-commercial-content grep (spec §9 review gate)**

Run (Git Bash):

```bash
grep -rniE '\$99|\$149|\$199|per month|/mo\b|tier [123]|payhoa|saas|essentials' src/
```

Expected: **no matches.** Any hit in public `src/` is a failure to fix before finishing (the SaaS tiers/pricing belong to the private proposal track only).

- [ ] **Step 3: Copy-rules sweep over the files this plan touched**

Run (Git Bash):

```bash
grep -rn '—' src/sponsors/ src/about/index.html src/portal/content.html src/_includes/site-header.njk src/_includes/site-footer.njk docs/launch-checklist.md
```

Expected: no matches (no em dashes in new copy). Also re-read the /sponsors/ page and the safety section once against the checklist: no dollar amounts on /sponsors/; safety summary states only [F5] facts, dated, no editorializing; titles use the pipe style ("Sponsors | Woods of Parkview HOA").

- [ ] **Step 4: Fix-and-commit if needed**

If any gate failed, fix minimally and commit:

```bash
git add -A
git commit -m "sponsorship-safety: final gate fixes"
```

Otherwise nothing to commit; the track is complete.

---

## Self-review (performed while writing this plan)

- **Spec coverage:** §6.2 public page → Task 3; §6.2 form_type + inbox triage → Task 1; §6.2 sponsor content key + row editor, no new admin screen → Tasks 2, 6; §6.2 nav decision (Community ▾) + footer → Task 3; §7 minutes PDF into src/documents/minutes/ + first real entry → Task 7 (filename matches the pre-existing link, so /about/documents/ needs no edit); §7 safety block on /about/, [F5]-faithful, dated, minutes-linked, board-editable via site_content → Tasks 2, 5, 6; §7 update cadence → checklist items in Tasks 6, 7. Exclusions honored: no dues copy touched, no camera-card copy touched, no amounts on the public page, empty sponsor grid handled.
- **Placeholder scan:** every code step carries the actual code; the only intentionally unfinished artifact is the PDF, which is an obtain-or-stop step by design, never generated.
- **Type consistency:** `fill(el, rows, makeRow(row))` signature changes in Task 4 and is consumed identically in Task 5; `card.fields` lengths (3/2) match `CONTENT_SHAPES` cells (Task 2) and both DOM mirrors; sponsor row order [name, url, blurb] is identical in validator tests, seed-less public renderer, editor field labels, and previews; the PDF path string is identical in src/about/documents.html (pre-existing), Task 5's link, and Task 7's file.
