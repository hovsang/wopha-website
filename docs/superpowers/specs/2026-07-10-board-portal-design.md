# WOPHA Board Portal — Phase 1 Design

**Date:** 2026-07-10
**Status:** Approved

## Goal

Add a login-gated board portal to the WOPHA site so the webmaster retainer is
defensible at ~$99/month against PayHOA's $199/month comparison. Phase 1 serves
the board only; a resident portal (private directory, per-household dues
status, gate PIN) is a later phase.

Ongoing platform cost must stay ~$0/month (domain renewal only) — this is a
core selling point of the board proposal.

## Architecture

Cloudflare-native, riding the hosting migration already planned in the launch
checklist (GitHub Pages → Cloudflare Pages, wopha.com DNS → Cloudflare):

- **Hosting:** Cloudflare Pages, connected to the existing GitHub repo.
  Deploys on push, same workflow as today. Public site stays plain static
  HTML with no build step.
- **Auth:** Cloudflare Access (free ≤50 users) protects `/portal/*` and
  `/api/admin/*`. Board members log in with an email one-time code or Google.
  The allowed-email list is managed in the Cloudflare dashboard; board
  turnover is an email-list edit.
- **Backend:** Pages Functions in `functions/api/` — one file per endpoint.
- **Database:** D1 (SQLite). Tables: `announcements`, `submissions`,
  `households`, `payments`, `site_content`.
- **Local dev:** `npx wrangler pages dev .` with a local D1 seeded from
  `schema.sql`.

Rejected alternatives: Decap CMS (git-backed; cannot do the submissions inbox
or ledger), Supabase (second vendor, self-built auth UI, free tier pauses
after ~7 idle days).

## Repo layout

```
/portal/              board-only pages, same design system as the site
  index.html          dashboard: outstanding dues, new submissions, latest news
  announcements.html  write / edit / pin announcements
  inbox.html          submissions with status workflow
  ledger.html         170-household dues grid
  content.html        pool hours & season dates editor
/functions/api/       Pages Functions
schema.sql            D1 schema + seed
```

## Permissions

One tier in phase 1: any Access-allowed board member sees everything,
including the ledger. (Treasurer-only ledger split deferred — 5-person
volunteer board, YAGNI.) Public endpoints (announcements feed, form submit)
require no login.

## Features

### Announcements

- Portal CRUD: title, body, optional "pin until" date.
- Public site: "Latest from the board" strip on the homepage, archive on the
  Community page, both fetched from `GET /api/announcements`.
- Failure mode: if the API is unreachable (or PWA offline), the section
  collapses; the static site never breaks because of the portal.
- Replaces mass announcement emails (fixes the open-CC leak problem).

### Submissions inbox

- The four existing public forms (issue report `contact.html#report`, ARC
  request `board.html#arc`, suggestion, contact update) repoint from Web3Forms
  to `POST /api/forms/submit`.
- The function stores the submission in D1 **and** forwards it to Web3Forms so
  the board still gets the email — no new email vendor.
- Portal inbox: per-submission status (new → in progress → done) and a
  private notes field. ARC requests tracked to a decision.

### Dues ledger

- One-time CSV import of the treasurer's spreadsheet (address, owner name,
  email) via the portal.
- Dues cycles per year; each household paid/unpaid; mark-paid records method
  (Stripe / Zelle / check), date, amount.
- Dashboard: "N of 170 paid — $X outstanding"; CSV export of the unpaid list.
- Phase 1 is manual mark-paid. Phase 2: Stripe webhook auto-records card/ACH
  payments.

### Content editing

- `site_content` table holds small structured blobs: pool hours, season
  dates, party fees.
- Public pages render baked-in HTML first, then fetch and swap live values if
  they differ. Baked-in content is the fallback — offline/PWA and API-down
  both degrade to today's behavior.
- Board edits in the portal go live on next page load, no deploy. (The
  retainer still covers doing edits for them; the feature existing is part of
  the value.)

## Error handling & data safety

- Functions validate input and return JSON errors; portal surfaces them
  plainly.
- The ledger contains resident PII: it lives only behind Access; no public
  endpoint touches `households` or `payments`.
- Backups: weekly scheduled Worker exports D1 to R2 (free), keeping the last
  8 weekly dumps; plus a manual "export data" button in the portal so the board can
  self-serve a copy anytime (supports the "Association owns its data"
  proposal term).

## Testing

- Small vitest suite for function logic (ledger math, input validation)
  against local D1.
- Manual checklist exercised on the `*.pages.dev` preview URL for portal
  flows and public-site degradation (API down, offline).

## Rollout

1. Build and demo on `wopha-portal.pages.dev` with fake ledger data.
2. Board sees the demo before committing.
3. Real cutover happens with the wopha.com DNS move already planned in the
   launch checklist. Access requires Cloudflare DNS, so the portal ships with
   (or after) the domain move. The live GitHub Pages site is untouched until
   then.

## Lock-in, acknowledged

The public site remains portable anywhere. The portal's auth (Access) and
database (D1) are Cloudflare-coupled; leaving would mean swapping auth and
rehosting the SQLite data. Accepted as low-risk at this scale.

## Proposal impact

Ongoing cost stays ~$12/year. Comparison line becomes: "PayHOA charges
$199/mo for a portal like this; the retainer is $99/mo and the association
owns everything."
