# WOPHA Website Launch Checklist

The site is a plain static site — no build step. Every item the board must set up
is also marked in the HTML with a `PLACEHOLDER:` comment and a visible
"Board setup needed" box on the page.

## 0. Urgent — independent of the new site

- [ ] **Take down the public resident directory.** The current site's Directory
      page links to a published Google Sheet with resident names/addresses that
      anyone on the internet can open. In Google Sheets: File → Share → Publish
      to web → **Stop publishing**. The new site replaces it with an opt-in
      family directory shared privately.

## 1. Payments (membership.html)

- [ ] Create a free **Stripe** account for the association (needs the HOA's EIN
      and bank account).
- [ ] Create two **Payment Links** for the $535 annual dues:
      one with **ACH/bank transfer** as the default method (fee ≈ $4–5),
      one card-enabled (fee ≈ $16). Optionally make them yearly subscriptions
      so renewal invoices go out automatically.
- [ ] Paste the two URLs into `membership.html` (search `PLACEHOLDER`).
- [ ] Confirm whether the HOA's bank supports **Zelle** on the association
      account; publish the Zelle address in `membership.html`, and require the
      property address in the memo.
- [ ] Paste the real **Member Information Form** (Google Form) URL.

## 2. Forms (suggestions.html, contact.html)

- [ ] Create free **Web3Forms** access keys (web3forms.com) routed to
      `wophatreasurer@gmail.com` (or a board alias) and replace
      `YOUR_WEB3FORMS_ACCESS_KEY` in all four forms: contact-info update
      (`contact.html#update`), suggestion box (`suggestions.html`), issue
      report (`contact.html#report`), and exterior change request
      (`board.html#arc`). Separate keys per form keeps the inboxes
      distinguishable; each form already sets its own email subject line.
- [ ] Create the **anonymous suggestion** Google Form (no required identity
      fields) and paste its link into `suggestions.html`.

## 3. Calendar & community (community.html)

- [ ] Create a shared **WOPHA Google Calendar**; paste its embed iframe into
      `community.html` (`#events`). Seed it with the known annual rhythm from
      the email archive: annual meeting (late Jan, Lilburn Police HQ), pine
      straw sale (spring + Dec), graduation-banner deadline (late Mar),
      clean-up day (May), opening-day ice cream social (mid-May), Summer Fun
      Series (trivia/karaoke), pool closing (mid-Sep), Harvest for the Hungry
      (Nov).
- [ ] Create the **GroupMe** circles (Parents of Littles, Playground Meetups,
      Swim Team Parents) and paste invite links.
- [ ] Create the **opt-in family directory** Google Form + private Sheet;
      paste the form link.
- [ ] Drop event photos into `assets/img/gallery/` and add them to the gallery.

## 4. Documents (board.html)

- [x] Covenants and bylaws PDFs migrated (`documents/`).
- [ ] Collect meeting minutes into `documents/minutes/` as dated PDFs
      (filenames are already referenced in `board.html`). Some minutes exist
      only as text on the old site's Meeting Minutes page. Shortcut: the
      2026 (2.22.26) and 2025 (2.23.25) annual-meeting minutes PDFs are
      attached to board emails from wophalilburn@gmail.com (sent Mar 2026 and
      Mar 2025) — save those attachments straight into `documents/minutes/`.

## 4b. Email hygiene (no site change needed)

- [ ] Send announcement emails with recipients in **BCC** or via a free
      newsletter tool — the May 2026 wristband email exposed 200+ resident
      addresses in open CC.
- [ ] Consider a Google Group or newsletter service for wophalilburn@gmail.com
      so "join the list" is self-service from the Contact page.

## 4c. Dues transparency (membership.html)

- [ ] Treasurer: replace the placeholder note in `membership.html#budget` with
      the current year's budget summary table from the annual-meeting
      presentation.

## 5. Pool hours (pool.html)

- [ ] Copy the 2026 hours from the board's Google Sheet into the hours table
      so they live on the page. Update in place when they change mid-season.

## 6. Hosting & domain

- [ ] Push this folder to a GitHub repository.
- [ ] Create a **Cloudflare Pages** project from the repo (free; no build
      command — it's plain HTML).
- [ ] Point **wopha.com** nameservers at Cloudflare (free DNS) and attach the
      domain to the Pages project. Weebly keeps serving the old site until DNS
      moves, so there's no downtime window to manage.
- [ ] Set up **Cloudflare Email Routing** for role addresses —
      `board@wopha.com`, `treasurer@wopha.com` → volunteers' real inboxes —
      so published contacts survive board turnover. Then update the addresses
      shown on `contact.html`.
- [ ] After launch, cancel the Weebly subscription (export/download anything
      still needed first — old photos, remaining minutes text).

## Later, if dues bookkeeping gets painful

PayHOA (~$99–199/mo at this community size, $2.45 ACH) provides owner ledgers,
auto-invoicing, and reminders, and coexists with this site — "Pay dues" would
just link to its portal instead of Stripe.

## Local preview

Open `index.html` in a browser, or from this folder run:
`python -m http.server 8080` → http://localhost:8080
