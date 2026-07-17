# Woods of Parkview HOA — wopha.com

Static website for the Woods of Parkview Homeowners Association, Lilburn, GA.
Replaces the old Weebly site.

- Plain HTML + one shared stylesheet (`assets/css/styles.css`) + a few lines of
  JS for the mobile menu. No build step, no framework.
- Payments, bookings, and forms are handled by linked free services (Stripe
  Payment Links, ReserveMyCourt, SwimTopia, Google Forms/Calendar, Web3Forms) —
  the site never needs a backend.
- QuickBooks: the board portal exports QBO-ready CSVs (one-way; D1 stays the
  ledger of record) — rationale and treasurer runbook in
  `docs/quickbooks-export.md`.
- **To launch:** work through `docs/launch-checklist.md`. Placeholder spots are
  marked with `PLACEHOLDER:` comments in the HTML and visible "Board setup
  needed" boxes on the pages.
- Design decisions: `docs/superpowers/specs/2026-07-09-wopha-website-design.md`.

Preview locally: open `index.html`, or `python -m http.server 8201`.

## Local development

The public site is plain HTML — open `index.html` or run any static server.
The board portal (`/portal/`) and API need wrangler:

```
npm install
npm run db:schema   # create local D1 tables
npm run db:seed     # fake demo data (safe — no real residents)
npm run dev         # http://127.0.0.1:8200
npm test            # vitest for functions/api/_lib
```

Portal auth: production is gated by Cloudflare Access; local dev on
127.0.0.1 is open by design (`functions/api/_lib/auth.js`).
