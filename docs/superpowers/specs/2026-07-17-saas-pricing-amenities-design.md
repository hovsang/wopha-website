# WOPHA SaaS Pricing, Amenity Replacements, Sponsorship & Safety Publishing — Design Spec

**Date:** 2026-07-17 · **Branch:** `redesign-experiment` (local-only; pricing content stays off
the public deploy paths exactly like the existing board-proposal docs)
**Depends on:** the completed Modern Civic redesign (spec 2026-07-16, built and final-reviewed).
**Execution:** implementation plans to be written by subagents in a NEW session (see §10).

## 1. Context & goals

The webmaster arrangement becomes a productized monthly SaaS that WOPHA's board can buy in
three clear tiers. The pitch is anchored in the association's own numbers: each tier names the
third-party subscriptions it replaces (ReserveMyCourt, SwimTopia, the Flock camera, the old
Weebly hosting) and shows gross price vs net cost after cancelled subscriptions and new
sponsorship revenue. Alongside the commercial work, two content features ship on the site:
a sponsorship program (public page + inquiry form) and safety publishing (the annual-meeting
police report summary + meeting-minutes PDFs).

**User decisions locked (2026-07-17):**
- Pricing lives in the PRIVATE board-proposal docs (master-only convention) plus a presentable
  pricing artifact. Nothing product-commercial appears on the public site.
- Camera: self-hosted license-plate-recognition system, set up and maintained by the webmaster
  (the user), offered in the top tier; the HOA cancels the Flock subscription. (The user
  personally set up the current Flock camera, so operational handover is credible.)
- Sponsorship: tiered local-business sponsors, public page + become-a-sponsor form routed into
  the portal inbox, revenue framed as offsetting the SaaS cost.
- Replacement targets: ReserveMyCourt (tennis/pickleball booking), pool-party/pavilion booking,
  SwimTopia (swim-team pages; see caveat §6.3), and the old Weebly hosting.

**Standing copy rules (spec 2026-07-16 §2) apply to all new user-visible copy:** no em dashes;
no governance editorializing; titles use the "Page | Woods of Parkview HOA" pipe style.

## 2. Financial grounding (from the 2026-02-22 Annual Meeting minutes)

> **STATUS: PENDING EXTRACTION.** Source: "WOPHA Annual Meeting 2.22.26.pdf" (Gmail attachment,
> message id 19cb97a0ae116b71, sent 2026-03-04 by wophalilburn@gmail.com). The Gmail connector
> cannot download attachments; the user is saving the PDF to Google Drive, after which this
> section gets filled and the placeholder tokens below resolve. Until then, every `[F#]` token
> is a named unknown, not a guess.

To extract and record here:
- [F1] Total annual budget / expenses for 2025 and 2026 budget.
- [F2] Dues income (paid household count × $535) and delinquency.
- [F3] Reserves / bank balance.
- [F4] Line items for every third-party service: ReserveMyCourt, SwimTopia (if HOA-paid),
  Flock Safety subscription, Weebly/website hosting, plus any others (lawn, pool mgmt,
  insurance, utilities) for budget context.
- [F5] The police report section: what Lilburn PD reported (incidents, trends, contact
  guidance). This feeds §7 and must be summarized faithfully, not editorialized.
- [F6] Any stated appetite/discussion about technology spending, cameras, or the website.

**Pricing inputs derived:** replaceable-subscription total [R] = RMC + Flock + Weebly
(+ SwimTopia only if HOA-paid). Sponsorship revenue target [S] from §6.2 tiers. Net-cost
formula per tier: net = tier price − cancelled subs covered by that tier − [S] attributable.

## 3. The three tiers (structure; dollar amounts finalize after §2)

Market anchor: PayHOA-class portals run ~$199/mo (already cited in the existing board
proposal). All tiers include what is already built: the redesigned site + board portal,
Cloudflare hosting, weekly backups + monthly retention, QuickBooks CSV exports, support.

| | Tier 1 "Essentials" | Tier 2 "Amenities" | Tier 3 "Complete" |
|---|---|---|---|
| Site + portal + hosting + backups + support | ✔ | ✔ | ✔ |
| Content edits/updates SLA | basic | standard | priority |
| Court booking built-in (replaces ReserveMyCourt) | | ✔ | ✔ |
| Pavilion/pool-party booking calendar | | ✔ | ✔ |
| Swim-team pages (SwimTopia-lite, §6.3 caveat) | | optional | ✔ |
| Sponsorship program management (§6.2) | | | ✔ |
| Self-hosted LPR camera, maintained (§6.4; replaces Flock) | | | ✔ |
| **Gross monthly** | [P1] | [P2] | [P3] |
| **Minus cancelled subscriptions** | Weebly | + RMC | + Flock |
| **Minus sponsorship revenue** | | | [S] |
| **Net monthly cost to WOPHA** | [N1] | [N2] | [N3] |

Pricing principles: each tier's gross must stay below the PayHOA anchor; each tier's NET must
read as an obvious win (Tier 3 ideally nets near Tier 1's gross once Flock + sponsorships are
counted). The presentation always shows both columns; the "see what they're paying for" table
IS the product of this section.

## 4. Deliverables for the pricing (private)

1. **`docs/board-proposal-addendum-2.md`** (master-only, never deployed): the 3-tier proposal
   with the §2 numbers, the replacement math, the camera offering, and the sponsorship program.
2. **Pricing artifact**: a polished single-page web artifact (same private-artifact flow as the
   typeface comparison) presenting the three tiers with the gross/net table for the board
   meeting. No repo deployment.
3. No public /pricing page. Nothing in `src/` mentions tiers, prices, or the SaaS.

## 5. Booking engine (Tier 2's build; the one large new feature)

Replaces ReserveMyCourt and manual pavilion coordination. Scope for the plans phase:

- **Data:** new D1 tables `bookings` (id, facility, date, start/end, household name+email,
  status, created_at) and `facilities` config (court 1, court 2, pickleball lines, pavilion)
  via the settings/content pattern. Schema stays additive + idempotent; backup TABLES lists +
  drift test extended (same tripwire pattern as `settings`).
- **Resident flow (public, no accounts):** availability calendar per facility; book a slot with
  name + email + address; confirmation email via the existing Web3Forms path; a cancel link
  with a signed token (no resident logins in this phase). Court rules mirror RMC's current
  policy (48-hour window, per-household limits) configurable in portal settings.
- **Board flow (portal):** a Bookings screen (list by day/facility, cancel/override, block-out
  dates for swim meets/maintenance). Middleware-gated like every admin surface.
- **Public API:** `/api/bookings` endpoints with validation in `_lib/validate.js` conventions,
  rate limiting consideration, and no PII exposure (availability shows busy/free only).
- **Cutover:** run parallel with RMC for one month, then the HOA cancels RMC.
- **Pitch evidence:** the board currently coordinates the pool/swim-team calendar in shared
  Google Sheets (e.g. the "MAY-WOPHA" pool-hours calendar shared by a board member, read
  2026-07-17) on top of two paid tools (RMC, SwimTopia). The booking engine + the portal's
  existing content editor consolidate all of it in one place; say so in the proposal.
- All the redesign's house rules apply: integer-cents-free (no money here), textContent-only
  rendering, isConnected/capture guards, WCAG 2.2 AA, copy rules.

## 6. The other offerings

### 6.1 Weebly retirement
Already implicit in the wopha.com cutover (launch checklist). The proposal counts its cost as
a Tier 1 saving; no build work.

### 6.2 Sponsorship program
- **Public page `/sponsors/`**: tier explanation for local businesses (e.g. pool banner +
  website logo + newsletter mention at [tier levels TBD in proposal]), current-sponsors grid
  (logo, link, blurb), and a become-a-sponsor form (`form_type: sponsor_inquiry` added to the
  backend FORM_TYPES allowlist; submissions land in the portal inbox with the existing triage
  flow). Nav placement: under About ▾ or Community ▾ (decide in plans; footer link regardless).
- **Sponsor content management:** sponsors stored as a new `site_content` key edited with the
  existing structured row editor (name, url, tier per row), rendered client-side like the other
  dynamic content. No new admin screen needed.
- **Revenue framing:** proposal-side only. The public page never mentions the SaaS.

### 6.3 Swim-team pages (SwimTopia-lite)
Static schedule/roster/registration-info pages under /amenities/swim-team/ fed by site_content
keys, plus a registration-interest form into the inbox. CAVEAT recorded: SwimTopia may be paid
by the swim team's own budget, not the HOA; [F4] resolves this. If team-paid, this moves to
"optional add-on negotiated with the team" and drops out of the HOA tier math.

### 6.4 Camera replacement (Tier 3)
An operations offering, not a website feature:
- Hardware: owned PoE LPR-capable camera(s) at the entrance + a small on-prem or homelab
  compute node (the user's existing homelab practice) running open-source LPR (e.g. Frigate +
  an ALPR model). One-time hardware cost stated in the proposal; ops + maintenance folded into
  Tier 3's monthly.
- The HOA cancels the Flock subscription ([F4] states the amount; Flock ALPR subscriptions are
  typically $2,500-3,000/yr per camera, verify against the minutes).
- **Policy obligations recorded in the proposal:** written retention policy (e.g. 30 days),
  board-only access, no resident-facing footage on the site, Georgia ALPR/privacy review, and
  an explicit note that plate data never mixes with the website's D1 data.
- Website touchpoint: at most a factual line in the /about/ security card (already exists)
  saying the entrance camera system is HOA-operated.

## 7. Safety publishing (police report + minutes)

- **Minutes PDF published:** "WOPHA Annual Meeting 2.22.26.pdf" goes into
  `src/documents/minutes/` and the /about/documents/#minutes list gets its first real entry
  (this also clears the link-checker's pending-content warnings one by one as more minutes
  are added).
- **Police report section:** a "Safety & security" block on `/about/` (the neighborhood page
  already carries the security-camera card, so safety context lives there): a faithful,
  neutral summary of the Lilburn PD report from [F5] (incidents/trends/contacts), dated, with
  a link to the full minutes PDF. Update cadence: after each annual meeting via the same
  content pattern (structured site_content key so the board can edit it in the portal without
  a deploy).
- Copy rules apply; the summary must not editorialize beyond what the PD reported.

## 8. Small fixes (done this session)

- Portal drawer no longer duplicates the "Woods of Parkview / Board portal" brand on mobile
  (topbar keeps it; drawer copy hidden below 900px). Commit 64b8b2b, deployed to the preview.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Pricing built on stale/wrong numbers | §2 extracts from the actual minutes; every figure carries its [F#] source |
| Booking engine scope creep | §5 phase boundary: no resident accounts, no payments, busy/free-only public data |
| SwimTopia isn't the HOA's bill | [F4] check before it enters tier math; falls back to optional add-on |
| ALPR privacy/legal exposure | §6.4 policy obligations in the proposal; board adopts retention policy before cutover |
| Sponsor content becomes stale/broken logos | managed via portal content editor; sponsorship terms include asset requirements |
| Board sticker shock | net-cost table always shown next to gross; PayHOA anchor cited |
| Public site accidentally exposes commercial content | §4 rule: nothing tier/price/SaaS-related in src/; review gate greps for it |

## 10. Execution prep (next session)

Write plans via subagents (the redesign's SDD pattern), one per track:
1. `sponsorship-safety` (site + backend): /sponsors/ page + form_type + content key; /about/
   safety block + minutes PDF publishing. Small, independent, ships first.
2. `booking-engine` (backend + public UI + portal screen): §5. The big one; split backend/UI
   plans if the planner judges it too large for one.
3. `proposal-pricing` (docs + artifact): addendum-2 + pricing artifact from §2/§3 numbers.
   Blocked on §2 extraction; everything else can proceed.
4. Camera offering has no repo build; it lives inside track 3's proposal text.

Handoff state: this spec committed on `redesign-experiment`; §2 pending the PDF (extraction
instructions inline above); progress ledger `.superpowers/sdd/progress.md` current; preview
deploy live at redesign-preview.wopha-website.pages.dev.
