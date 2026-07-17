# Woods of Parkview HOA — wopha.com

Static website for the Woods of Parkview Homeowners Association, Lilburn, GA.
Replaces the old Weebly site.

- Pages are assembled by [Eleventy](https://www.11ty.dev/) from `src/` into
  plain static HTML in `_site/`. One layout (`src/_includes/base.njk`) and
  three partials replace the old copy-pasted header/nav/footer. Plain
  Eleventy only — no plugins, no framework.
- Payments, bookings, and forms are handled by linked free services (Stripe
  Payment Links, ReserveMyCourt, SwimTopia, Google Forms/Calendar, Web3Forms).
  The board portal (`/portal/`) and its API run on Cloudflare Pages
  Functions + D1 (`functions/`, unchanged by the build step).
- QuickBooks: the board portal exports QBO-ready CSVs (one-way; D1 stays the
  ledger of record) — rationale and treasurer runbook in
  `docs/quickbooks-export.md`.
- **To launch:** work through `docs/launch-checklist.md`. Placeholder spots are
  marked with `PLACEHOLDER:` comments in the HTML and visible "Board setup
  needed" boxes on the pages.
- Design decisions: `docs/superpowers/specs/2026-07-09-wopha-website-design.md`
  and `docs/superpowers/specs/2026-07-16-modern-civic-redesign-design.md`.

## The three commands

```
npm install     # once after cloning — installs Eleventy, wrangler, vitest, eslint
npm run build   # build the site: src/ -> _site/
npm run dev     # build, then serve site + portal + API at http://127.0.0.1:8200
```

**Never edit files in `_site/`** — it is generated output, overwritten on every
build (and not in git). Edit `src/` instead.

## Local development

First time only: `npm run db:schema && npm run db:seed` creates local D1
tables with fake demo data (safe — no real residents).

- `npm run dev` — one-shot build + local server on port 8200.
- `npm run watch` — run in a **second terminal** to rebuild `_site/` whenever
  `src/` changes; refresh the browser to see edits.
- `npm run check` — build, then verify `_site/` still matches the pre-Eleventy
  page snapshots byte-for-byte (`tools/`). Delete the check + snapshots when
  the redesign intentionally changes page output.
- `npm test` — vitest for `functions/api/_lib` pure logic.
- `npm run lint` — eslint.

Dev servers on this machine must use ports **8200-8202** (Windows reserves
most of the 8000-8999 range for Hyper-V; binding 8080/8788 crashes workerd —
so never run bare `eleventy --serve`).

Portal auth: production is gated by Cloudflare Access; local dev on
127.0.0.1 is open by design (`functions/api/_lib/auth.js`).

## How to add a page

1. Copy an existing page, e.g. `src/pool.html` → `src/my-page.html`.
2. Edit the front matter block at the top between the `---` lines:
   `title` (browser tab), `description` (search snippet), and `pageKey`
   (which nav item is highlighted — use an existing key from
   `src/_includes/site-header.njk`, or any new word for no highlight).
3. Replace the content below the front matter. The `<head>`, header, nav,
   and footer come from the layout — do **not** paste them in.
4. Want it in the nav? Add ONE `<li>` line in
   `src/_includes/site-header.njk` — every page picks it up on the next build.
5. `npm run build`, then open `_site/my-page.html`. The page is served at
   `/my-page.html`.

Static files (images, PDFs, CSS, JS) live in `src/assets/` and
`src/documents/` and are copied to `_site/` unchanged.
