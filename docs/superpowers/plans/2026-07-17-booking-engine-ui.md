# Booking Engine — UI Implementation Plan (portal screen + public pages)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship every user-facing surface of the booking engine: the portal Bookings screen (list by day/facility, cancel/override, block-outs), the booking-rule settings inputs, the public availability-and-booking page, the cancel-link page, and the additive links from the tennis and pool pages — with ReserveMyCourt links kept until cutover.

**Architecture:** Portal pages follow the existing app-shell pattern (`portal-base.njk` + `pageKey`, inline page script using `portal-shell.js` globals `api()/el()/toast()/confirmDialog()/skeleton()/showError()`). Public pages use `base.njk` with page-specific lintable scripts in `src/assets/js/` (the `site.js` pattern). The availability calendar is a plain HTML `<table>` (row headers = times, column headers = days) whose cells hold native buttons — table semantics plus native controls deliver the WCAG keyboard/screen-reader obligations without custom grid code.

**Tech Stack:** Eleventy 3 (Nunjucks), vanilla ES5-style browser JS, the backend plan's `/api/bookings` + `/api/admin/bookings` endpoints, vitest (no new tests here — no DOM test infra exists and no new dependency is added; verification is build + lint + scripted dev-server smoke), ESLint.

**Spec:** `docs/superpowers/specs/2026-07-17-saas-pricing-amenities-design.md` §5.

**Prerequisite:** `docs/superpowers/plans/2026-07-17-booking-engine-backend.md` MUST be fully executed first — this plan consumes its API contract verbatim and its final suite state (118 tests on the 76-test baseline).

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
- NEVER push `master` or `redesign-experiment` (docs/ holds private board pricing).
- Sidebar coordination (locked): "Bookings" goes AFTER "Dues &amp; households" and BEFORE "Site content". Do NOT add anything after the last sidenav item — the proposal-pricing track appends "Plan &amp; billing" there.
- RMC stays: this plan ADDS booking UI next to the ReserveMyCourt links; removing RMC is a launch-checklist cutover item only (Task 5), never an edit in this plan.

## Interfaces consumed (from the backend plan — exact shapes)

- `GET /api/bookings?facility=<id>` → `{facilities:[{id,label}],facility,window_hours,days:[{date,slots:[{start,end,busy,bookable}]}]}` (times `"HH:MM"` 24h, dates `"YYYY-MM-DD"`; no PII).
- `POST /api/bookings` JSON `{facility,date,start,name,email,address,botcheck:""}` → `{ok:true,id,cancel_url}` | 400/409 `{error}`.
- `GET /api/bookings/cancel?id=N&token=T` → `{facility,label,date,start,end,status}` | 404 `{error}`.
- `POST /api/bookings/cancel` JSON `{id,token}` → `{ok:true}` | 404.
- `GET /api/admin/bookings` → `{from,days,facilities:[{id,label}],bookings:[{id,facility,date,start_time,end_time,name,email,address,status,created_at}]}` (status `booked`|`blocked`).
- `POST /api/admin/bookings` JSON `{facility:<id>|"all",date,start,end,reason}` → `{ok:true,created:n}` | 400.
- `DELETE /api/admin/bookings/:id` → `{ok:true}` | 404.
- `GET/PUT /api/admin/settings` with keys `booking_window_hours`, `booking_daily_limit`, `booking_weekly_limit` (string integers).

## File structure

```
Create:
src/portal/bookings.html               portal Bookings screen (Task 1)
src/amenities/book.html                public availability + booking page (Task 3)
src/assets/js/book.js                  booking page behavior (Task 3)
src/amenities/booking-cancel.html      cancel-link landing page (Task 4)
src/assets/js/booking-cancel.js        cancel page behavior (Task 4)

Modify:
src/_includes/portal-shell.njk         sidebar gains "Bookings" (Task 1)
src/portal/content.html                settings card gains the 3 booking rules (Task 2)
src/assets/css/styles.css              visually-hidden + booking calendar styles (Task 3)
eslint.config.mjs                      URLSearchParams in the browser globals (Task 3)
src/_includes/site-header.njk          Amenities menu gains "Book online" (Task 5)
src/amenities/tennis.html              booking button next to RMC (Task 5)
src/amenities/pool.html                pavilion reservation step links the calendar (Task 5)
docs/launch-checklist.md               RMC parallel-run cutover item (Task 5)
```

---

### Task 1: portal sidebar entry + Bookings screen

**Files:**
- Modify: `src/_includes/portal-shell.njk` (nav list + the pageKey comment)
- Create: `src/portal/bookings.html`

**Interfaces:**
- Consumes: `GET/POST /api/admin/bookings`, `DELETE /api/admin/bookings/:id`; portal-shell globals `api()`, `el()`, `toast()`, `confirmDialog()`, `skeleton()`, `showError()`, `clearError()`; portal CSS classes (`portal-card`, `portal-table`, `table-card`, `badge`, `btn btn--sm`, `field-error`, `field-help`, `empty-state`, `visually-hidden` — all exist in `src/assets/css/portal.css`).
- Produces: `/portal/bookings.html` with `pageKey: bookings`; sidebar order Dashboard, Announcements, Inbox, Dues &amp; households, **Bookings**, Site content (nothing after the last item — reserved).

- [ ] **Step 1: Add the sidebar link** — in `src/_includes/portal-shell.njk`, insert between the ledger and content links:

```njk
    <a href="/portal/bookings.html"{% if pageKey == "bookings" %} aria-current="page"{% endif %}>Bookings</a>
```

And update the comment at the top of the file to read:

```njk
{# Board portal app shell. Behavior in /portal/portal-shell.js (loaded at the
   end so the sidebar markup above it is already parsed). Pages set
   pageKey: dashboard | announcements | inbox | ledger | bookings | content. #}
```

- [ ] **Step 2: Create the page** — `src/portal/bookings.html`:

```html
---
layout: portal-base.njk
title: "Bookings"
pageKey: bookings
---
  <main class="section" id="portal-main" tabindex="-1">
    <div class="container">
      <div class="portal-page-head">
        <h1>Bookings</h1>
      </div>
      <p class="lede">Court and pavilion reservations for the next two weeks. Cancel a booking, or block out times for swim meets and maintenance.</p>

      <section class="portal-card portal-section" aria-labelledby="block-heading">
        <h2 id="block-heading">Block out a time</h2>
        <p class="field-help">Blocked times show as unavailable on the public calendar and stop new bookings. Bookings that already exist in the window stay until you cancel them in the list below.</p>
        <form id="block-form">
          <div class="portal-grid portal-grid--2">
            <p>
              <label for="block-facility">Facility</label><br>
              <select id="block-facility" style="width:100%"><option value="all">All facilities</option></select>
            </p>
            <p>
              <label for="block-date">Date</label><br>
              <input type="date" id="block-date" required style="width:100%">
            </p>
            <p>
              <label for="block-start">From</label><br>
              <input type="time" id="block-start" required style="width:100%">
            </p>
            <p>
              <label for="block-end">To</label><br>
              <input type="time" id="block-end" required style="width:100%">
            </p>
          </div>
          <p>
            <label for="block-reason">Reason (shown only to the board)</label><br>
            <input type="text" id="block-reason" maxlength="200" required placeholder="Swim meet" style="width:100%">
          </p>
          <p>
            <button class="btn btn--primary" type="submit" id="block-btn">Block out</button>
            <span class="field-error" id="block-error" tabindex="-1" hidden></span>
          </p>
        </form>
      </section>

      <div class="portal-toolbar">
        <label class="visually-hidden" for="facility-filter">Filter by facility</label>
        <select id="facility-filter"><option value="">All facilities</option></select>
      </div>

      <div class="table-card">
        <table class="portal-table">
          <caption class="visually-hidden">Bookings for the next 14 days</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Time</th>
              <th scope="col">Facility</th>
              <th scope="col">Who</th>
              <th scope="col">Status</th>
              <th scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody id="booking-rows"></tbody>
        </table>
      </div>
    </div>
  </main>
  <script>
    (function () {
      var data = null;
      var labels = {};   // facility id → label
      var rowsEl = document.getElementById("booking-rows");
      var filterEl = document.getElementById("facility-filter");
      var blockFacilityEl = document.getElementById("block-facility");
      var blockError = document.getElementById("block-error");

      /* MIRROR of fmtTime in src/assets/js/book.js. Keep in sync. */
      function fmtTime(hhmm) {
        var h = Number(hhmm.slice(0, 2));
        var suffix = h >= 12 ? " p.m." : " a.m.";
        var h12 = h % 12 === 0 ? 12 : h % 12;
        return h12 + ":" + hhmm.slice(3, 5) + suffix;
      }

      function load() {
        clearError();
        rowsEl.textContent = "";
        for (var i = 0; i < 4; i++) {
          var tr = el("tr");
          var td = el("td");
          td.colSpan = 6;
          td.appendChild(skeleton(1));
          tr.appendChild(td);
          rowsEl.appendChild(tr);
        }
        api("/api/admin/bookings").then(function (d) {
          data = d;
          labels = {};
          d.facilities.forEach(function (f) { labels[f.id] = f.label; });
          fillFacilitySelects(d.facilities);
          render();
        }).catch(function (err) {
          rowsEl.textContent = ""; // don't strand the skeleton behind the error banner
          showError(err);
        });
      }

      var selectsFilled = false;
      function fillFacilitySelects(facilities) {
        if (selectsFilled) return; // options are static; only the list reloads
        selectsFilled = true;
        facilities.forEach(function (f) {
          var o1 = el("option", null, f.label);
          o1.value = f.id;
          filterEl.appendChild(o1);
          var o2 = el("option", null, f.label);
          o2.value = f.id;
          blockFacilityEl.appendChild(o2);
        });
      }

      function render() {
        rowsEl.textContent = "";
        var shown = data.bookings.filter(function (b) {
          return !filterEl.value || b.facility === filterEl.value;
        });
        if (!shown.length) {
          var tr = el("tr");
          var td = el("td", "empty-state", data.bookings.length
            ? "No bookings for this facility in the next 14 days."
            : "No bookings in the next 14 days.");
          td.colSpan = 6;
          tr.appendChild(td);
          rowsEl.appendChild(tr);
          return;
        }
        shown.forEach(function (b) { rowsEl.appendChild(buildRow(b)); });
      }

      function cellFor(label, text) {
        var td = el("td", null, text);
        td.setAttribute("data-label", label);
        return td;
      }

      function buildRow(b) {
        var tr = el("tr");
        tr.setAttribute("data-booking-id", b.id);
        tr.appendChild(cellFor("Date", b.date));
        tr.appendChild(cellFor("Time", fmtTime(b.start_time) + " to " + fmtTime(b.end_time)));
        tr.appendChild(cellFor("Facility", labels[b.facility] || b.facility));

        var who = b.status === "blocked"
          ? b.name
          : b.name + (b.address ? " (" + b.address + ")" : "");
        var whoTd = cellFor("Who", who);
        if (b.email) {
          whoTd.appendChild(el("br"));
          whoTd.appendChild(el("span", "field-help", b.email));
        }
        tr.appendChild(whoTd);

        var statusTd = el("td");
        statusTd.setAttribute("data-label", "Status");
        statusTd.appendChild(el("span",
          "badge " + (b.status === "blocked" ? "badge--unpaid" : "badge--paid"),
          b.status === "blocked" ? "blocked" : "booked"));
        tr.appendChild(statusTd);

        var actionTd = el("td");
        var btn = el("button", "btn btn--sm", b.status === "blocked" ? "Remove" : "Cancel");
        btn.type = "button";
        btn.addEventListener("click", function () {
          var what = b.status === "blocked"
            ? "Remove the block on " + (labels[b.facility] || b.facility) + " for " + b.date + "?"
            : "Cancel the " + (labels[b.facility] || b.facility) + " booking for " + b.name + " on " + b.date + "?";
          confirmDialog(what).then(function (yes) {
            if (yes) cancelBooking(b, tr);
          });
        });
        actionTd.appendChild(btn);
        tr.appendChild(actionTd);
        return tr;
      }

      function cancelBooking(b, tr) {
        api("/api/admin/bookings/" + b.id, { method: "DELETE" }).then(function () {
          data.bookings = data.bookings.filter(function (x) { return x.id !== b.id; });
          // Same stale-row guard class as the ledger: only splice in place
          // when the row is still connected, otherwise re-render the list.
          if (tr.isConnected) tr.remove();
          else render();
          toast(b.status === "blocked" ? "Block removed." : "Booking cancelled.");
        }).catch(function (err) {
          if (err.status === 404) { load(); return; } // already gone: resync
          showError(err);
        });
      }

      filterEl.addEventListener("change", function () { if (data) render(); });

      document.getElementById("block-form").addEventListener("submit", function (e) {
        e.preventDefault();
        blockError.hidden = true;
        var start = document.getElementById("block-start").value;
        var end = document.getElementById("block-end").value;
        if (start >= end) {
          blockError.textContent = "End time must be after the start time.";
          blockError.hidden = false;
          blockError.focus();
          return;
        }
        var btn = document.getElementById("block-btn");
        btn.disabled = true;
        api("/api/admin/bookings", {
          method: "POST",
          body: {
            facility: blockFacilityEl.value,
            date: document.getElementById("block-date").value,
            start: start,
            end: end,
            reason: document.getElementById("block-reason").value.trim(),
          },
        }).then(function () {
          document.getElementById("block-form").reset();
          toast("Time blocked out.");
          load();
        }).catch(function (err) {
          blockError.textContent = err.message;
          blockError.hidden = false;
          blockError.focus();
        }).finally(function () {
          if (btn.isConnected) btn.disabled = false;
        });
      });

      load();
    })();
  </script>
```

- [ ] **Step 3: Build and lint** — run `npm run build` (expect `_site/portal/bookings.html` to exist) and `npm run lint` (clean; the inline script is not linted, matching the other portal pages). Run `npm test`: count unchanged from the backend plan's final state (118 on the 76 baseline).

- [ ] **Step 4: Manual smoke** — with the local DB schema applied (`npm run db:schema`), start `npm run dev` (port 8200; localhost counts as an authorized admin). Seed one booking and one block from a second terminal:

```bash
curl -s "http://127.0.0.1:8200/api/bookings?facility=court-1"
# pick a "bookable": true slot from the response, then:
curl -s -X POST http://127.0.0.1:8200/api/bookings -H "Content-Type: application/json" -d "{\"facility\":\"court-1\",\"date\":\"<date>\",\"start\":\"<start>\",\"name\":\"Test Resident\",\"email\":\"test@example.com\",\"address\":\"101 Planters Way\"}"
```

Open http://127.0.0.1:8200/portal/bookings.html and verify: the sidebar shows Bookings highlighted between "Dues &amp; households" and "Site content"; the seeded booking lists date, time in a.m./p.m. form, facility label, name with address and email, a green "booked" badge; the facility filter narrows the list; "Block out a time" with facility "All facilities", tomorrow's date, 08:00-12:00, reason "Swim meet" succeeds with a toast and five new "blocked" rows; Cancel on the resident booking opens the confirm dialog and removes the row with a toast. Keyboard-only pass: every control reachable and operable by Tab/Enter/Escape.

- [ ] **Step 5: Commit**

```bash
git add src/_includes/portal-shell.njk src/portal/bookings.html
git commit -m "Portal bookings screen: day/facility list, cancel/override, block-outs"
```

---

### Task 2: booking rules in the portal settings card

**Files:**
- Modify: `src/portal/content.html` (settings card markup ~lines 41-63 and the settings script ~lines 279-354)

**Interfaces:**
- Consumes: `GET /api/admin/settings` (returns `booking_window_hours`/`booking_daily_limit`/`booking_weekly_limit` as string integers with defaults "48"/"1"/"3"); `PUT /api/admin/settings` `{key, value}`; the card's existing capture-and-compare save loop.
- Produces: three number inputs the board edits; unchanged keys never fire a PUT.

- [ ] **Step 1: Extend the card markup** — in `src/portal/content.html`, inside the `portal-grid portal-grid--3` div of the Portal settings card, append after the `set-qb` paragraph:

```html
          <p>
            <label for="set-window">Booking window (hours)</label><br>
            <input type="number" id="set-window" min="1" max="336" step="1" style="width:100%" aria-describedby="set-window-hint">
            <span class="field-help" id="set-window-hint">How far ahead residents can book a court or the pavilion.</span>
          </p>
          <p>
            <label for="set-daily">Court bookings per day</label><br>
            <input type="number" id="set-daily" min="1" max="50" step="1" style="width:100%" aria-describedby="set-daily-hint">
            <span class="field-help" id="set-daily-hint">Per household.</span>
          </p>
          <p>
            <label for="set-weekly">Court bookings per week</label><br>
            <input type="number" id="set-weekly" min="1" max="50" step="1" style="width:100%" aria-describedby="set-weekly-hint">
            <span class="field-help" id="set-weekly-hint">Per household, Monday to Sunday.</span>
          </p>
```

And extend the card's intro `field-help` paragraph by appending one sentence inside it: `The booking rules control the public court and pavilion calendar.`

- [ ] **Step 2: Wire the script** — in the `/* ---------------- Portal settings ---------------- */` section of the same file:

After the existing element lookups (`var qbEl = ...`), add:

```js
      var windowEl = document.getElementById("set-window");
      var dailyEl = document.getElementById("set-daily");
      var weeklyEl = document.getElementById("set-weekly");
```

In the `api("/api/admin/settings").then(function (s) { ... })` block, after `qbEl.value = s.quickbooks_url || "";`, add:

```js
        windowEl.value = s.booking_window_hours || "";
        dailyEl.value = s.booking_daily_limit || "";
        weeklyEl.value = s.booking_weekly_limit || "";
```

In the save handler, after the `if (qb !== (original.quickbooks_url || "")) updates.push(...)` line and BEFORE `if (!updates.length)`, add:

```js
        var ruleFields = [
          { el: windowEl, key: "booking_window_hours", label: "booking window" },
          { el: dailyEl, key: "booking_daily_limit", label: "daily court limit" },
          { el: weeklyEl, key: "booking_weekly_limit", label: "weekly court limit" },
        ];
        for (var r = 0; r < ruleFields.length; r++) {
          var rv = ruleFields[r].el.value.trim();
          if (!/^\d+$/.test(rv) || Number(rv) < 1) {
            settingsError.textContent = "Enter a whole number of at least 1 for the " + ruleFields[r].label + ".";
            settingsError.hidden = false;
            settingsError.focus();
            return;
          }
          if (rv !== original[ruleFields[r].key]) updates.push({ key: ruleFields[r].key, value: rv });
        }
```

- [ ] **Step 3: Build and lint** — `npm run build`, `npm run lint`: both clean. `npm test`: unchanged.

- [ ] **Step 4: Manual smoke** — `npm run dev`, open http://127.0.0.1:8200/portal/content.html. Verify the three inputs load "48", "1", "3" (defaults); change the window to 72 and Save → "Settings saved." toast; `curl -s http://127.0.0.1:8200/api/admin/settings` shows `"booking_window_hours":"72"`; `curl -s "http://127.0.0.1:8200/api/bookings?facility=court-1"` now returns `"window_hours":72` and 4 days. Set it back to 48 and Save. Saving with no changes → "No changes to save." (no PUTs fire). Entering `0` → inline error, focus moves to it.

- [ ] **Step 5: Commit**

```bash
git add src/portal/content.html
git commit -m "Portal settings: booking window and court limits (capture-and-compare)"
```

---

### Task 3: public booking page — availability calendar + booking form

**Files:**
- Create: `src/amenities/book.html`, `src/assets/js/book.js`
- Modify: `src/assets/css/styles.css` (append one section), `eslint.config.mjs` (browser globals)

**Interfaces:**
- Consumes: `GET /api/bookings?facility=`, `POST /api/bookings` (contract above); public CSS (`hero hero--page`, `section`, `section--tint`, `container`, `table-wrap`, `form-card form-grid`, `btn btn--primary/--outline`, `notice`, `field-note`, `eyebrow`, `lede`); the botcheck honeypot convention from `src/about/contact.html`.
- Produces: `/amenities/book/` (facility select + 3-day availability table + booking form + confirmation with cancel link); CSS classes `.visually-hidden`, `.slot-btn`, `.slot-status`, `.form-error`, `.booking-controls` in `styles.css` (Task 4's cancel page reuses `.form-error`/`.visually-hidden`).

**Accessibility design (the WCAG obligation, decided):** the calendar is a real `<table>` — `<th scope="row">` time ranges, `<th scope="col">` day headings, and each cell holds either a native `<button>` ("Book", with a full-context `aria-label`), or plain status text ("Reserved" / "Past" / "Not open yet"). Native buttons in a table need no roving tabindex, no ARIA grid, and give screen readers row+column context for free. Facility switching is a native `<select>`. Focus management: choosing a slot reveals the form section and focuses its heading (`tabindex="-1"`); success reveals the confirmation and focuses its heading; load state is announced through a `role="status"` element.

- [ ] **Step 1: Append the CSS** — at the end of `src/assets/css/styles.css`:

```css
/* ---- Facility booking (book.html, booking-cancel.html) ------------------ */

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

.booking-controls { max-width: 20rem; margin-bottom: var(--space-2); }

#avail-table caption { text-align: left; font-weight: 600; padding-block: var(--space-2); }
#avail-table th, #avail-table td { text-align: center; }
#avail-table th[scope="row"] { text-align: left; white-space: nowrap; }

.slot-btn { min-width: 5.5rem; }
.slot-status { color: var(--ink-soft); font-size: 0.9375rem; }

.form-error { color: #a13324; font-weight: 600; } /* 6.97:1 on Card, matches input:user-invalid */
```

- [ ] **Step 2: Add the eslint browser global** — in `eslint.config.mjs`, in the `files: ["src/assets/js/*.js", "src/portal/*.js", "src/sw.js"]` block, add to `globals` (skip if a sibling track already added it to this block):

```js
        URLSearchParams: "readonly",
```

- [ ] **Step 3: Create the page** — `src/amenities/book.html`:

```html
---
layout: base.njk
title: Book a court or the pavilion | Woods of Parkview HOA
description: "Check live availability and book a tennis court, pickleball court, or the pavilion at Woods of Parkview. Pick an open time and reserve it with your name and address."
pageKey: amenities-book
permalink: /amenities/book/index.html
---
    <section class="hero hero--page">
      <div class="container">
        <span class="eyebrow">Courts &amp; pavilion</span>
        <h1>Book a court or the pavilion</h1>
        <p class="lede">Pick a facility, find an open time, and reserve it with your name and address. No account needed.</p>
      </div>
    </section>

    <section class="section" id="availability" aria-labelledby="availability-heading">
      <div class="container">
        <h2 id="availability-heading">Availability</h2>
        <div class="booking-controls">
          <label for="facility-select">Facility</label>
          <select id="facility-select" aria-describedby="window-note"></select>
        </div>
        <p class="field-note" id="window-note"></p>
        <p class="field-note" id="calendar-status" role="status">Loading availability&hellip;</p>
        <div class="table-wrap">
          <table id="avail-table" hidden>
            <caption id="avail-caption"></caption>
            <thead id="avail-head"></thead>
            <tbody id="avail-body"></tbody>
          </table>
        </div>
        <noscript><p>The availability calendar needs JavaScript. If you can't use it, reach the board through the <a href="/about/contact/">contact page</a> to book a time.</p></noscript>
      </div>
    </section>

    <section class="section section--tint" id="book" aria-labelledby="book-heading" hidden>
      <div class="container">
        <h2 id="book-heading" tabindex="-1">Reserve this time</h2>
        <p class="lede" id="slot-summary"></p>
        <form class="form-card form-grid" id="book-form">
          <input type="checkbox" name="botcheck" id="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
          <div>
            <label for="book-name">First and last name</label>
            <input type="text" id="book-name" required autocomplete="name" maxlength="200">
          </div>
          <div>
            <label for="book-email">Email</label>
            <input type="email" id="book-email" required autocomplete="email" maxlength="200">
            <p class="field-note">Your cancel link is tied to this email. Court limits are per household.</p>
          </div>
          <div>
            <label for="book-address">Home address</label>
            <input type="text" id="book-address" required autocomplete="street-address" maxlength="200">
          </div>
          <p class="form-error" id="book-error" role="alert" hidden></p>
          <div>
            <button class="btn btn--primary" type="submit" id="book-btn">Book it</button>
            <button class="btn btn--outline" type="button" id="book-cancel-btn">Never mind</button>
          </div>
        </form>
      </div>
    </section>

    <section class="section" id="confirmation" aria-labelledby="confirm-heading" hidden>
      <div class="container">
        <h2 id="confirm-heading" tabindex="-1">You're booked</h2>
        <p class="lede" id="confirm-summary"></p>
        <div class="notice">
          <p><strong>Save your cancel link.</strong> If plans change, open <a id="confirm-cancel-link" href="#">your cancel link</a> to free the time for your neighbors. The board also gets a copy of your booking by email.</p>
        </div>
        <p><a class="btn btn--outline" href="/amenities/book/">Book another time</a></p>
      </div>
    </section>

    <script src="/assets/js/book.js"></script>
```

- [ ] **Step 4: Create the behavior** — `src/assets/js/book.js`:

```js
// Facility booking page (/amenities/book/). Fetches busy/free availability
// from /api/bookings and books grid slots with name + email + address. All
// dynamic text goes through textContent — never innerHTML. A load sequence
// counter (the capture-guard convention) keeps a slow response for one
// facility from clobbering a newer selection.
(function () {
  var facilitySelect = document.getElementById("facility-select");
  var statusEl = document.getElementById("calendar-status");
  var windowNote = document.getElementById("window-note");
  var table = document.getElementById("avail-table");
  var caption = document.getElementById("avail-caption");
  var thead = document.getElementById("avail-head");
  var tbody = document.getElementById("avail-body");
  var bookSection = document.getElementById("book");
  var confirmSection = document.getElementById("confirmation");
  var form = document.getElementById("book-form");
  var errorEl = document.getElementById("book-error");
  if (!facilitySelect || !table) return;

  var data = null;
  var chosen = null; // { facility, date, start, end }
  var labels = {};
  var loadSeq = 0;

  /* MIRROR of fmtTime in src/assets/js/booking-cancel.js and the portal
     bookings page. Keep in sync. */
  function fmtTime(hhmm) {
    var h = Number(hhmm.slice(0, 2));
    var suffix = h >= 12 ? " p.m." : " a.m.";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + hhmm.slice(3, 5) + suffix;
  }
  function fmtDate(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-US",
      { weekday: "short", month: "short", day: "numeric" });
  }
  function fmtDateLong(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("en-US",
      { weekday: "long", month: "long", day: "numeric" });
  }

  function load(facility) {
    var seq = ++loadSeq;
    statusEl.textContent = "Loading availability…";
    var qs = facility ? "?facility=" + encodeURIComponent(facility) : "";
    fetch("/api/bookings" + qs).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function (d) {
      if (seq !== loadSeq) return; // a newer load superseded this one
      data = d;
      labels = {};
      d.facilities.forEach(function (f) { labels[f.id] = f.label; });
      fillSelect(d.facilities, d.facility);
      windowNote.textContent = "Times open up " + d.window_hours + " hours ahead.";
      render();
      statusEl.textContent = "";
      table.hidden = false;
    }).catch(function () {
      if (seq !== loadSeq) return;
      table.hidden = true;
      statusEl.textContent = "Could not load availability. Please try again in a minute.";
    });
  }

  var selectFilled = false;
  function fillSelect(facilities, current) {
    if (!selectFilled) {
      selectFilled = true;
      facilities.forEach(function (f) {
        var o = document.createElement("option");
        o.value = f.id;
        o.textContent = f.label;
        facilitySelect.appendChild(o);
      });
    }
    facilitySelect.value = current;
  }

  function render() {
    caption.textContent = "Availability for " + (labels[data.facility] || data.facility);
    thead.textContent = "";
    tbody.textContent = "";

    var hr = document.createElement("tr");
    var timeTh = document.createElement("th");
    timeTh.scope = "col";
    timeTh.textContent = "Time";
    hr.appendChild(timeTh);
    data.days.forEach(function (day) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = fmtDate(day.date);
      hr.appendChild(th);
    });
    thead.appendChild(hr);

    // Earliest bookable slot, to tell "Past" apart from "Not open yet".
    var firstBookable = null;
    data.days.forEach(function (day) {
      day.slots.forEach(function (s) {
        var k = day.date + " " + s.start;
        if (s.bookable && (firstBookable === null || k < firstBookable)) firstBookable = k;
      });
    });

    data.days[0].slots.forEach(function (rowSlot, i) {
      var tr = document.createElement("tr");
      var th = document.createElement("th");
      th.scope = "row";
      th.textContent = fmtTime(rowSlot.start) + " to " + fmtTime(rowSlot.end);
      tr.appendChild(th);
      data.days.forEach(function (day) {
        var td = document.createElement("td");
        var s = day.slots[i];
        if (s.busy) {
          var busySpan = document.createElement("span");
          busySpan.className = "slot-status";
          busySpan.textContent = "Reserved";
          td.appendChild(busySpan);
        } else if (s.bookable) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn btn--outline slot-btn";
          btn.textContent = "Book";
          btn.setAttribute("aria-label", "Book " + (labels[data.facility] || data.facility) +
            ", " + fmtDateLong(day.date) + ", " + fmtTime(s.start) + " to " + fmtTime(s.end));
          btn.addEventListener("click", function () { choose(day.date, s); });
          td.appendChild(btn);
        } else {
          var muted = document.createElement("span");
          muted.className = "slot-status";
          muted.textContent = (firstBookable !== null && day.date + " " + s.start < firstBookable)
            ? "Past" : "Not open yet";
          td.appendChild(muted);
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function choose(date, slot) {
    chosen = { facility: data.facility, date: date, start: slot.start, end: slot.end };
    document.getElementById("slot-summary").textContent =
      (labels[data.facility] || data.facility) + ", " + fmtDateLong(date) +
      ", " + fmtTime(slot.start) + " to " + fmtTime(slot.end) + ".";
    errorEl.hidden = true;
    confirmSection.hidden = true;
    bookSection.hidden = false;
    document.getElementById("book-heading").focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!chosen) return;
    errorEl.hidden = true;
    var btn = document.getElementById("book-btn");
    btn.disabled = true;
    var booked = chosen; // capture: `chosen` may change while in flight
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility: booked.facility,
        date: booked.date,
        start: booked.start,
        name: document.getElementById("book-name").value.trim(),
        email: document.getElementById("book-email").value.trim(),
        address: document.getElementById("book-address").value.trim(),
        botcheck: document.getElementById("botcheck").checked ? "1" : "",
      }),
    }).then(function (r) {
      return r.json().then(function (body) { return { ok: r.ok, body: body }; });
    }).then(function (res) {
      btn.disabled = false;
      if (!res.ok) {
        errorEl.textContent = (res.body && res.body.error) || "Something went wrong. Try again.";
        errorEl.hidden = false;
        load(booked.facility); // the slot may have just been taken: refresh
        return;
      }
      form.reset();
      bookSection.hidden = true;
      document.getElementById("confirm-summary").textContent =
        (labels[booked.facility] || booked.facility) + " is yours on " + fmtDateLong(booked.date) +
        ", " + fmtTime(booked.start) + " to " + fmtTime(booked.end) + ".";
      document.getElementById("confirm-cancel-link").href = res.body.cancel_url;
      confirmSection.hidden = false;
      document.getElementById("confirm-heading").focus();
      chosen = null;
      load(booked.facility);
    }).catch(function () {
      btn.disabled = false;
      errorEl.textContent = "Could not reach the booking service. Try again in a minute.";
      errorEl.hidden = false;
    });
  });

  document.getElementById("book-cancel-btn").addEventListener("click", function () {
    bookSection.hidden = true;
    chosen = null;
    facilitySelect.focus();
  });

  facilitySelect.addEventListener("change", function () {
    bookSection.hidden = true;
    chosen = null;
    load(facilitySelect.value);
  });

  var params = new URLSearchParams(location.search);
  load(params.get("facility") || "");
})();
```

- [ ] **Step 5: Build and lint** — `npm run build`: expect `_site/amenities/book/index.html` and `_site/assets/js/book.js`. `npm run lint`: clean (book.js is inside the linted `src/assets/js/*.js` glob). `npm test`: unchanged.

- [ ] **Step 6: Manual smoke** — `npm run dev`, open http://127.0.0.1:8200/amenities/book/. Verify: facility select lists the five facilities; the table shows 3 day columns and the court grid rows (7:00 a.m. through 8:30 p.m. starts); earlier-today slots read "Past", end-of-window slots "Not open yet"; a busy slot (seeded or booked via curl) reads "Reserved"; clicking Book reveals the form with the slot summary and moves focus to its heading; submitting with name/email/address shows "You're booked", a working cancel link, and the slot flips to Reserved after the refresh; booking the same slot from a second tab shows the 409 message "That time was just taken. Pick another slot."; `?facility=pavilion` in the URL preselects the pavilion (4 rows). Keyboard-only pass: Tab reaches the select, every Book button (each announcing facility + day + time via its aria-label), the form, and the confirmation link; Enter activates.

- [ ] **Step 7: Commit**

```bash
git add src/amenities/book.html src/assets/js/book.js src/assets/css/styles.css eslint.config.mjs
git commit -m "Public booking page: accessible availability table + booking flow"
```

---

### Task 4: cancel-link landing page

**Files:**
- Create: `src/amenities/booking-cancel.html`, `src/assets/js/booking-cancel.js`

**Interfaces:**
- Consumes: `GET /api/bookings/cancel?id&token`, `POST /api/bookings/cancel {id, token}`; `.form-error` and public CSS from Task 3. The backend builds cancel URLs as `/amenities/booking-cancel/?id=<id>&token=<hex>` — this page's permalink must match exactly.
- Produces: `/amenities/booking-cancel/` — shows the booking, one-click cancel, friendly invalid-link state.

- [ ] **Step 1: Create the page** — `src/amenities/booking-cancel.html`:

```html
---
layout: base.njk
title: Cancel a booking | Woods of Parkview HOA
description: "Cancel a Woods of Parkview court or pavilion reservation using the cancel link from your booking confirmation."
pageKey: amenities-book
permalink: /amenities/booking-cancel/index.html
---
    <section class="hero hero--page">
      <div class="container">
        <h1>Cancel a booking</h1>
        <p class="lede" id="cancel-summary">Checking your booking&hellip;</p>
      </div>
    </section>

    <section class="section" aria-labelledby="cancel-action-heading">
      <div class="container">
        <h2 id="cancel-action-heading" class="visually-hidden">Confirm cancellation</h2>
        <p class="form-error" id="cancel-error" role="alert" hidden></p>
        <p id="cancel-actions" hidden>
          <button class="btn btn--primary" type="button" id="cancel-btn">Cancel this booking</button>
          <a class="btn btn--outline" href="/amenities/book/">Keep it</a>
        </p>
        <p id="cancel-done" tabindex="-1" hidden>The time is freed up. <a href="/amenities/book/">Book another time</a> whenever you like.</p>
        <noscript><p>Cancelling needs JavaScript. If you can't use it, reach the board through the <a href="/about/contact/">contact page</a>.</p></noscript>
      </div>
    </section>

    <script src="/assets/js/booking-cancel.js"></script>
```

- [ ] **Step 2: Create the behavior** — `src/assets/js/booking-cancel.js`:

```js
// Cancel-link landing page (/amenities/booking-cancel/?id=N&token=T).
// Token-gated lookup, then one-click cancel. All dynamic text uses
// textContent only.
(function () {
  var summary = document.getElementById("cancel-summary");
  var actions = document.getElementById("cancel-actions");
  var errorEl = document.getElementById("cancel-error");
  var done = document.getElementById("cancel-done");
  var btn = document.getElementById("cancel-btn");
  var heading = document.getElementById("cancel-action-heading");
  if (!summary || !btn) return;

  var params = new URLSearchParams(location.search);
  var id = params.get("id") || "";
  var token = params.get("token") || "";

  /* MIRROR of fmtTime in src/assets/js/book.js. Keep in sync. */
  function fmtTime(hhmm) {
    var h = Number(hhmm.slice(0, 2));
    var suffix = h >= 12 ? " p.m." : " a.m.";
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + ":" + hhmm.slice(3, 5) + suffix;
  }

  function invalid() {
    summary.textContent = "This cancel link is not valid.";
    errorEl.textContent = "Check the link from your booking confirmation, or reach the board through the contact page.";
    errorEl.hidden = false;
  }

  // Reveal the done state (booking cancelled, or already cancelled),
  // relabel the shared section heading so a heading-navigating screen
  // reader user doesn't hear the stale "Confirm cancellation" text, and
  // move focus to the done message so keyboard/screen reader users land
  // on the outcome instead of a disabled button.
  function showDone(headingText) {
    heading.textContent = headingText;
    done.hidden = false;
    done.focus();
  }

  fetch("/api/bookings/cancel?id=" + encodeURIComponent(id) + "&token=" + encodeURIComponent(token))
    .then(function (r) {
      if (!r.ok) throw new Error("bad status");
      return r.json();
    }).then(function (b) {
      if (b.status === "cancelled") {
        summary.textContent = b.label + " on " + b.date + " is already cancelled.";
        showDone("Booking already cancelled");
        return;
      }
      summary.textContent = "Your booking: " + b.label + " on " + b.date + ", " +
        fmtTime(b.start) + " to " + fmtTime(b.end) + ".";
      actions.hidden = false;
    }).catch(invalid);

  btn.addEventListener("click", function () {
    btn.disabled = true;
    errorEl.hidden = true;
    fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: Number(id), token: token }),
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      actions.hidden = true;
      summary.textContent = "Your booking is cancelled.";
      showDone("Booking cancelled");
    }).catch(function () {
      btn.disabled = false;
      errorEl.textContent = "Could not cancel right now. Try again in a minute.";
      errorEl.hidden = false;
    });
  });
})();
```

- [ ] **Step 3: Build and lint** — `npm run build`: expect `_site/amenities/booking-cancel/index.html` and `_site/assets/js/booking-cancel.js`. `npm run lint`: clean. `npm test`: unchanged.

- [ ] **Step 4: Manual smoke** — `npm run dev`. Book a slot via http://127.0.0.1:8200/amenities/book/ and open the confirmation's cancel link: the page shows facility, date, and time; "Cancel this booking" flips to the freed-up message; reloading the same link shows "already cancelled"; the slot is bookable again on the calendar; a tampered token (`...&token=0000`) shows the invalid-link message with no booking details.

- [ ] **Step 5: Commit**

```bash
git add src/amenities/booking-cancel.html src/assets/js/booking-cancel.js
git commit -m "Booking cancel page: token lookup, one-click cancel, invalid-link state"
```

---

### Task 5: amenity page links (RMC kept), nav entry, cutover checklist line

**Files:**
- Modify: `src/amenities/tennis.html` (reserve section), `src/amenities/pool.html` (party section), `src/_includes/site-header.njk` (Amenities menu), `docs/launch-checklist.md`

**Interfaces:**
- Consumes: `/amenities/book/` and `/amenities/book/?facility=pavilion` (Tasks 3); `pageKey: amenities-book`.
- Produces: additive links; ReserveMyCourt references remain untouched except where stated; the RMC removal is a checklist item only.

- [ ] **Step 1: Tennis page** — in `src/amenities/tennis.html`, replace the reserve section's lede + button lines:

```html
        <p class="lede">Reservations run through ReserveMyCourt. Book your slot, show up, and play.</p>
        <p><a class="btn btn--primary" href="https://www.reservemycourt.com" target="_blank" rel="noopener">Reserve on ReserveMyCourt</a></p>
```

with:

```html
        <p class="lede">Book your slot right here on the neighborhood site. ReserveMyCourt also keeps working side by side while we switch over.</p>
        <p>
          <a class="btn btn--primary" href="/amenities/book/">Check availability &amp; book</a>
          <a class="btn btn--outline" href="https://www.reservemycourt.com" target="_blank" rel="noopener">Reserve on ReserveMyCourt</a>
        </p>
```

And in the "How reservations work" list, replace the ReserveMyCourt-specific pickleball item:

```html
          <li>Playing pickleball? The pickleball courts are listed separately on ReserveMyCourt: pick a pickleball court (for example, "Pickleball 2A") when you book.</li>
```

with the system-neutral:

```html
          <li>Playing pickleball? The pickleball courts are listed separately: pick a pickleball court (for example, "Pickleball 2A") when you book.</li>
```

- [ ] **Step 2: Pool page** — in `src/amenities/pool.html`, replace the first pool-party card (the unfilled Google-Form placeholder):

```html
          <div class="card">
            <h3>1. Submit the request form</h3>
            <p>Fill out the Pool Party Request Form with your date, time, and guest count.</p>
            <!-- PLACEHOLDER: Board must create the Pool Party Request Form as a Google Form and paste the real URL into the button below. -->
            <p><a class="btn btn--primary" href="#">Pool Party Request Form</a></p>
            <div class="setup-note">
              Create the Pool Party Request Form as a Google Form (date, time, guest count, contact info) and paste its URL into the button above.
            </div>
          </div>
```

with:

```html
          <div class="card">
            <h3>1. Reserve a pavilion time</h3>
            <p>Check the pavilion calendar and reserve your date and time with your name and address.</p>
            <p><a class="btn btn--primary" href="/amenities/book/?facility=pavilion">Check availability &amp; reserve</a></p>
          </div>
```

(The fee table and coordinator step stay exactly as they are — fees are collected offline in this phase.)

- [ ] **Step 3: Nav entry** — in `src/_includes/site-header.njk`, add to the Amenities menu after the Tennis item:

```html
            <li><a href="/amenities/book/"{% if pageKey == 'amenities-book' %} aria-current="page"{% endif %}>Book online</a></li>
```

And add `'amenities-book'` to the Amenities disclosure's current-section list:

```njk
          <button type="button" class="nav-disclosure{% if pageKey in ['amenities', 'amenities-pool', 'amenities-tennis', 'amenities-swim-team', 'amenities-book'] %} is-current-section{% endif %}" aria-expanded="false" aria-controls="menu-amenities">
```

- [ ] **Step 4: Cutover checklist line** — in `docs/launch-checklist.md` §7, append after the booking-engine items the backend plan added:

```markdown
- [ ] Booking cutover: run the built-in booking side by side with
      ReserveMyCourt for one month after launch. Then remove the
      ReserveMyCourt button and the "side by side" sentence from
      `src/amenities/tennis.html`, and the HOA cancels the RMC subscription.
```

- [ ] **Step 5: Build, lint, verify links** — `npm run build`, `npm run lint`, then `node tools/check-links.mjs` → expect `MISSING` count 0 (the new `/amenities/book/` and `/amenities/booking-cancel/` targets exist in `_site`). `npm test`: unchanged.

- [ ] **Step 6: Manual smoke** — `npm run dev`: the tennis page shows both buttons (site booking primary, RMC outline); the pool party card links the pavilion calendar preselected; the header's Amenities menu lists "Book online" and marks it current on /amenities/book/.

- [ ] **Step 7: Commit**

```bash
git add src/amenities/tennis.html src/amenities/pool.html src/_includes/site-header.njk docs/launch-checklist.md
git commit -m "Amenity pages link built-in booking (RMC kept until cutover); nav entry"
```

---

### Task 6: final verification pass

**Files:** none (verification only; fix anything found, amend the relevant task's files, and commit fixes with a `fix(booking):` message).

- [ ] **Step 1: Full suite + lint + build**

```
npm test        → all green (118 on the 76 baseline; more if sibling tracks landed)
npm run lint    → exit 0
npm run build   → completes; _site contains portal/bookings.html,
                  amenities/book/index.html, amenities/booking-cancel/index.html,
                  assets/js/book.js, assets/js/booking-cancel.js
node tools/check-links.mjs → 0 MISSING
```

- [ ] **Step 2: End-to-end walkthrough** — `npm run dev`, then in one sitting: book a court slot on /amenities/book/, see it Reserved, see it (with name/email) on /portal/bookings.html, block out tomorrow morning for all facilities from the portal, confirm the public calendar shows those slots Reserved, cancel the resident booking via its cancel link, confirm the portal list dropped it after reload, and confirm `curl -s http://127.0.0.1:8200/api/bookings?facility=court-1` never contains a name, email, or address.

- [ ] **Step 3: Accessibility spot-check (WCAG 2.2 AA obligations of this plan)** — keyboard-only: complete a full booking and a full cancel without a mouse; verify focus lands on "Reserve this time" when choosing a slot and on "You're booked" after booking; verify every Book button's accessible name announces facility, day, and time; verify the availability table announces row (time) and column (day) headers when navigating cells with a screen reader (NVDA or VoiceOver quick pass); verify the portal block-out form's error is announced (focus moves to it) and the confirm dialog traps focus.

- [ ] **Step 4: Copy-rule grep** — `grep -rn "—" src/amenities/book.html src/amenities/booking-cancel.html src/portal/bookings.html src/assets/js/book.js src/assets/js/booking-cancel.js` → no matches (no em dashes anywhere in the new surfaces; the en dash in time ranges is fine). Confirm no tier/price/SaaS words appear in the new public pages: `grep -rniE "tier|pricing|\\$[0-9]|per month|saas" src/amenities/book.html src/amenities/booking-cancel.html` → no matches.

- [ ] **Step 5: Commit any fixes** and hand off per the executing skill's checkpoint flow.
