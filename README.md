# Woods of Parkview HOA — wopha.com

Static website for the Woods of Parkview Homeowners Association, Lilburn, GA.
Replaces the old Weebly site.

- Plain HTML + one shared stylesheet (`assets/css/styles.css`) + a few lines of
  JS for the mobile menu. No build step, no framework.
- Payments, bookings, and forms are handled by linked free services (Stripe
  Payment Links, ReserveMyCourt, SwimTopia, Google Forms/Calendar, Web3Forms) —
  the site never needs a backend.
- **To launch:** work through `docs/launch-checklist.md`. Placeholder spots are
  marked with `PLACEHOLDER:` comments in the HTML and visible "Board setup
  needed" boxes on the pages.
- Design decisions: `docs/superpowers/specs/2026-07-09-wopha-website-design.md`.

Preview locally: open `index.html`, or `python -m http.server 8080`.
