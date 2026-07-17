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

## 2. Financial grounding (EXTRACTED from "WOPHA Annual Meeting 2.22.26.pdf", read 2026-07-17
from the user's Google Drive, file id 17UmBediok9POi-VT4Kj9LuYmA5pQsvxT)

**[F1] Budget & P&L.** 2026 budget: income $139,925, expenses $121,306.58, net operating
income $18,618.42. 2025 actual: income $123,050.33, expenses $118,812.85, net $4,237.48.
2024: net -$8,802.71. 2023: net -$3,956.16. (2026 is the first strongly positive budget;
driven by the approved 10% dues increase.)

**[F2] Membership & dues.** 171 homes: 138 full members, 25 social, 8 nonmembers, ~4 rentals;
~40 outside members in 2025; 7 delinquent (board actively collecting). Rate history (full):
$490 (2005-06), $525 (2007-23), $575 (2024), $630 (2025), **$693 approved for 2026**.
Social: $115 (2025) → $126 (2026). Outside: $505 (2025) → $535 (2026) plus $250 first-time
initiation. Pool party reservation: $125 (+$35/hr per lifeguard). Tennis leagues: $45 adult,
$30 junior/non-member. Dues income lines (2026 budget): full $101,000 + outside $27,500 +
social $2,625.

> **SITE CORRECTION REQUIRED (small fix, high priority):** the public site and the portal
> seed say "2026 annual dues $535". Per the approved minutes, $535 is the OUTSIDE
> (non-resident) rate; full-member dues are $693 for 2026. Correct the homepage season
> glance, the membership page rate tables (all three member types + pool party + tennis
> fees per the 2026 fee table above), and set the portal's dues_cents setting to 69300.
> The ledger's per-household amounts for real data must use the real rates.

**[F3] Reserves & bank (12/31/2025).** Checking (Swim_Tennis) $14,576.05; Reserve for
Capital Expenses $45,486.17; Treasury I-Bond $11,240; total bank $71,302.22 (2024:
$69,078.16; 2023: $85,351.83).

**[F4] Third-party service line items (annual).**
| Service | 2026 budget | 2025 actual | Notes |
|---|---|---|---|
| Camera - Entrance (the Flock unit) | $1,750 | $2,000 | The replaceable subscription; ~$146-167/mo |
| QuickBooks Payments fees | $700 | $503.66 | Payment processing (bank debit), not the QBO sub |
| Telephone | $820 | $746.33 | Clubhouse line; possible future VoIP saving, out of scope |
| ReserveMyCourt | not a line item | not a line item | UNVERIFIED [V1]: could hide inside Admin Misc or Professional Fees; RMC org plans run roughly $180-300/yr if paid |
| SwimTopia | not a line item | not a line item | UNVERIFIED [V2]: not visible in the HOA budget; commonly team-paid from swim-team fees, but confirm before excluding from tier math |
| Weebly/website hosting | not broken out | not broken out | UNVERIFIED [V3]: likely inside Admin Misc ($1,000/$907.23); estimate <=$300/yr |

> **[V1]-[V3] verification (owner: the user, before the proposal finalizes):** the P&L's
> category granularity can hide small subscriptions. Confirm each by any of: (a) asking the
> treasurer for the QuickBooks detail under Admin Misc / Professional Fees / Property
> Management Fees / Pool Expenses; (b) checking the RMC and SwimTopia account admin pages for
> plan and billing status; (c) scanning bank/QBO statements for their charges. Record actual
> amounts here when known. Tier math treats $0 as the conservative FLOOR: the consolidation
> pitch stands even at $0, and every verified dollar of subscription cost strengthens the
> Tier 2 savings column. Do not present RMC/SwimTopia savings as fact until verified.
Context lines: pool expenses $54,000; landscaping $15,000; swim/tennis electric $17,750;
insurance $6,503.70.

**[F5] Police & code enforcement (feeds §7).** Corporal Johnson (Lilburn PD): Neighborhood
Watch presentation; noted the well-kept neighborhood and the entrance camera both help
prevent crime; recommended well-lit homes and residential security cameras. Crime analysis
01/01/24-02/20/25 for the neighborhood streets: five minor incidents (two suspicious
vehicles, both cleared; two homeless-person calls at the pool, one given a courtesy ride to
a shelter; one suspicious-persons call, gone on arrival) plus 7 animal complaints. Officer
McCord (Code Enforcement): Feb 2025-Feb 2026 stats: high grass 7 cases, open/outdoor
storage 3, junk vehicle 4 (1 open), illegal construction 1 (1 open), trees 1, misc 3;
report via SeeClickFix (cityoflilburn.com/seeclickfix); residential contacts Officer
Charles (470) 307-6533, Officer McCord (470) 226-6180.

**[F6] Technology/budget appetite.** The board considered a ~$15,000 pool key-fob access
system and deferred it (keypad + wristbands continue): tech budget exists but is deliberately
conservative. Major capital projects loom (full tennis-court rebuild, major pool repairs;
bank-loan exploration under way; special assessment would need a 2/3 member vote). Reading:
monthly SaaS spend in the low hundreds is easily inside budget (2026 net op income $18.6k),
but the pitch must respect the capital-projects backdrop: lead with net cost and savings,
not features. Access control (key fob) is a plausible FUTURE SaaS add-on to mention as a
roadmap item since the board already priced the problem at $15k.

**Board changes recorded (proposal audience):** Gio Vargas expected President; Amanda Tarpley
joined the board post-meeting; Peter Efremenko elected then stepped down; Seiji Ijuin
elected; one board seat unfilled. Address the proposal to the current board.

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
| **Gross monthly (DRAFT, user finalizes in proposal)** | $99 | $149 | $199 |
| **Minus cancelled subscriptions** | Weebly ~$17-25/mo (est) | + RMC $0 (free tier, §2 F4) | + camera line $146-167/mo (F4) |
| **Minus sponsorship revenue (target)** | | | ~$83/mo (4 sponsors x $250/yr, §6.2) |
| **Net monthly cost to WOPHA (draft)** | ~$78 | ~$128 | **~$43, potentially net-negative with sponsors** |

Draft-pricing notes (grounded in §2):
- The camera line is the only large hard saving ($1,750-2,000/yr). Tier 3's headline: for
  roughly the price of Tier 1 plus the camera bill the HOA already pays, they get everything,
  and with a modest sponsor program the whole stack can pay for itself.
- Tier 2's baseline pitch is capability and consolidation (booking built-in, one calendar,
  the hand-maintained pool-hours spreadsheet retired). Subscription savings for RMC/SwimTopia
  are pending [V1]/[V2] verification (§2): claim only verified amounts in the proposal; the
  $0 floor keeps the pitch honest, and any confirmed cost moves into the Tier 2 savings row.
- All gross prices stay well under the PayHOA $199/mo anchor at equal-or-better capability;
  annual totals ($1,188 / $1,788 / $2,388) are small next to the $121k expense budget and the
  $18.6k budgeted surplus, and the proposal must still respect the capital-projects backdrop
  (F6): net-cost table first, features second.
- One-time hardware for the Tier 3 camera (owned PoE LPR camera + small compute node):
  state a real quote in the proposal, order-of-magnitude $400-800, HOA-owned.
- The presentation always shows gross AND net columns; the "see what they're paying for"
  table IS the product of this section. Roadmap mention (not priced): pool access control,
  since the board already priced a key-fob system at ~$15k and deferred it (F6).

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
keys, plus a registration-interest form into the inbox. CAVEAT status: SwimTopia is not
visible in the HOA budget, but whether the HOA, the team, or nobody pays for it is [V2]
UNVERIFIED (§2). If team-paid: optional add-on negotiated with the team, no HOA tier savings.
If HOA-paid (hidden in a budget category): its cost joins the Tier 2 savings row. Either way
it stays listed in Tier 2/3 as included capability if the team wants it.

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

## 8. Small fixes

Done this session:
- Portal drawer no longer duplicates the "Woods of Parkview / Board portal" brand on mobile
  (topbar keeps it; drawer copy hidden below 900px). Commit 64b8b2b, deployed to the preview.

Queued for the next session (first task of the sponsorship-safety track, or a standalone
quick fix): the §2 dues correction. Site-wide: homepage season glance "$693" (full member),
membership page rate tables per the approved 2026 fee table (full $693, social $126, outside
$535 + $250 initiation, pool party $125 + $35/hr lifeguard, tennis league $45/$30), and the
portal settings dues_cents → 69300. Copy rules apply.

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
   UNBLOCKED: §2 is fully extracted; the user finalizes the draft prices during this track.
4. Camera offering has no repo build; it lives inside track 3's proposal text.
0. (first, small) the §8 dues-correction fix, either standalone or opening the
   sponsorship-safety track.

Handoff state: this spec committed on `redesign-experiment` with §2 COMPLETE (extracted from
the minutes PDF in the user's Drive); progress ledger `.superpowers/sdd/progress.md` current;
preview deploy live at redesign-preview.wopha-website.pages.dev; minutes PDF still needs to be
placed into src/documents/minutes/ during the sponsorship-safety track (download from Drive
file id 17UmBediok9POi-VT4Kj9LuYmA5pQsvxT or the original Gmail attachment).
