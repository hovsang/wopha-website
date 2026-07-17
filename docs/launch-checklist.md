# WOPHA Website Launch Checklist

The site is a static site built with Eleventy: `npm run build` emits `_site/`. Every item the board must set up
is also marked in the HTML with a `PLACEHOLDER:` comment and a visible
"Board setup needed" box on the page.

## 0. Urgent (independent of the new site)

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

- [ ] Create ONE free **Web3Forms** access key (web3forms.com) routed to the
      board's email, and set it as the `WEB3FORMS_KEY` secret on the Pages
      project (Settings → Environment variables). The four site forms post to
      the portal API, which stores each submission in the board inbox and
      forwards a copy by email. No keys live in the HTML.
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
      Mar 2025). Save those attachments straight into `documents/minutes/`.

## 4b. Email hygiene (no site change needed)

- [ ] Send announcement emails with recipients in **BCC** or via a free
      newsletter tool: the May 2026 wristband email exposed 200+ resident
      addresses in open CC.
- [ ] Consider a Google Group or newsletter service for wophalilburn@gmail.com
      so "join the list" is self-service from the Contact page.

## 4c. Dues transparency (membership.html)

- [ ] Treasurer: replace the placeholder note in `membership.html#budget` with
      the current year's budget summary table from the annual-meeting
      presentation.

## 5. Pool hours (pool.html)

- [ ] Enter the current hours in the board portal (Site content → Pool hours);
      they appear on pool.html automatically. The rows baked into the HTML are
      the offline fallback: keep them roughly current once a season.

## 6. Hosting & domain

- [ ] Push this folder to a GitHub repository.
- [ ] Create a **Cloudflare Pages** project from the repo (free; build command
      `npm ci && npm run build`, output `_site`).
- [ ] Point **wopha.com** nameservers at Cloudflare (free DNS) and attach the
      domain to the Pages project. Weebly keeps serving the old site until DNS
      moves, so there's no downtime window to manage.
- [ ] Set up **Cloudflare Email Routing** for role addresses
      (`board@wopha.com`, `treasurer@wopha.com` → volunteers' real inboxes)
      so published contacts survive board turnover. Then update the addresses
      shown on `contact.html`.
- [ ] After launch, cancel the Weebly subscription (export/download anything
      still needed first: old photos, remaining minutes text).

## 7. Board portal (Cloudflare): replaces the "PayHOA later" plan

The portal (announcements, inbox, dues ledger, content editing) ships with
the site. Launch-time setup, in order:

- [ ] Create the **Cloudflare Pages** project from the GitHub repo
      (production branch: `deploy`, build command `npm ci && npm run build`,
      build output directory `_site`).
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
- [ ] Confirm `DEMO_OPEN_ADMIN` is NOT set on the production Pages project
      before importing real resident data (if it was set for a seed-data
      demo, unset it first, it bypasses admin auth entirely).
- [ ] Set the `WEB3FORMS_KEY` secret (section 2).
- [ ] Create the R2 bucket: `npx wrangler r2 bucket create wopha-backups`,
      then deploy the backup worker: `cd workers/backup && npx wrangler deploy`.
- [ ] Import the real household list: portal → Ledger → Import (CSV with
      address, owner_name, email, phone). Until Access is live, demo only
      with the fake seed data.
- [ ] Enable the Access policy on the project's `*.pages.dev` hostname too
      (Zero Trust → Access → Applications → add the pages.dev domain to the
      same app / same board-email policy): without this, portal pages and
      admin APIs 401 on pages.dev and the demo cannot work.
- [ ] Demo to the board on the free `*.pages.dev` URL (seed data) before the
      wopha.com DNS cutover in section 6.

## Local preview

`npm run dev` → http://127.0.0.1:8200 (site + portal + API). For the static
pages only: `npm run build`, then
`python -m http.server 8201 --directory _site` → http://localhost:8201
