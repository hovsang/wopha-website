# WOPHA Public Website — "Modern Civic" Redesign Proposal

**Prepared for:** the Woods of Parkview HOA volunteer board
**Scope:** the public-facing marketing/service site (index, membership, pool, tennis, swim-team, community, board, suggestions, contact, thanks). The authenticated `portal/` and the Cloudflare Functions/D1 backend are **out of scope** and unchanged.
**Direction:** a clear step up in polish toward a credible, well-run small-institution feel, keeping a restrained thread of neighborhood warmth. Not corporate SaaS, not craft-fair.

---

## 1. Information architecture & navigation

### The problem with today's nav
Nine top-level items (Home, Membership, Pool, Tennis, Swim Team, Community, Board & Docs, Suggestions, Contact) overflow the desktop bar into a cramped single row and force a two-column dropdown on mobile. It reads as a list of *pages* rather than a map of *what residents come to do*. Three of the nine (Pool, Tennis, Swim Team) are facets of one idea — "the amenities" — and two (Suggestions, Contact) are both "reach the board."

### Proposed primary nav — 5 items + one persistent action

```
Amenities ▾     Membership     Community ▾     About ▾     [ Pay dues → ]
```

- **Amenities ▾** — dropdown to Pool, Tennis, Swim Team (and future courts/pickleball). Landing page `/amenities` gives a one-screen overview with three cards deep-linking in.
- **Membership** — direct link, no dropdown. It is the single highest-intent page; it should never be one hover away from being missed.
- **Community ▾** — dropdown to Events & Calendar, Get Connected (groups/directory), Announcements. Landing `/community`.
- **About ▾** — dropdown to The Neighborhood, Board & Volunteers, Governing Documents, Contact & Report an Issue.
- **Pay dues →** — a persistent primary-colored button, right-aligned, on every page. The number-one task deserves a fixed home, not a menu slot.

Rationale: five groups is the comfortable ceiling for a horizontal bar; every label is a *destination residents recognize*, and the dropdowns keep depth without length. Suggestions and Contact both collapse under "reach the board," so they stop competing for top-level real estate. The standalone Pay-dues button means the site's core purpose is always one tap away, which is the strongest single signal of "well-run institution."

### Sitemap & page mapping (every current page has a home)

| Current page | New home |
|---|---|
| index.html | `/` Home (redesigned) |
| membership.html | `/membership` (top-level) |
| pool.html | `/amenities/pool` under Amenities |
| tennis.html | `/amenities/tennis` under Amenities |
| swim-team.html | `/amenities/swim-team` under Amenities |
| community.html | `/community` — split into Events, Connect, Announcements tabs/sections |
| board.html | Split: `/about/board` (people) + `/about/documents` (covenants, bylaws, minutes, ARC form) |
| suggestions.html | `/about/contact#suggestions` — merged into a unified "Reach the board" page |
| contact.html | `/about/contact` (absorbs suggestions + issue report) |
| thanks.html | `/thanks` (form-submission confirmation, unlinked in nav) |
| — new — | `/amenities` overview landing (index for the dropdown) |

Net: 10 public pages → **8** (Amenities overview added; Suggestions merged into Contact; Board & Docs stays one URL but is internally reorganized). Mobile nav becomes a clean single-column accordion instead of a 9-row two-column grid.

---

## 2. Page-by-page content model

**Home `/`** — see §4 (full top-to-bottom treatment).

**Amenities overview `/amenities`** (new) — hero strip; three feature cards (Pool / Tennis / Swim Team) each with a one-line status ("Open May 17–Sep 20", "7am–11pm daily", "Registration open"); a season-hours summary; CTA to Pay dues.

**Pool `/amenities/pool`** — hero; hours & season dates block; rules (collapsible `<details>` list); **Book a pool party** form/CTA (anchor `#party`); lifeguard/management note; guest policy; photo strip.

**Tennis `/amenities/tennis`** — hero; **Reserve a court** CTA (ReserveMyCourt, anchor `#reserve`); court hours; non-member seasonal fees; pickleball note; lighting info.

**Swim Team `/amenities/swim-team`** — hero; Poolcats registration CTA; practice/meet schedule; coach & contact; open-to-non-residents note.

**Membership `/membership`** — hero with the headline dues figure as a stat; **How to pay** (three-way: online/Stripe, Zelle, check) with the fraud-awareness notice preserved verbatim (this is important safety content); Member types (Full / Social / Non-Resident); Referral $50; **Where your dues go** (budget transparency — upgrade to a real figure table when treasurer supplies it); "new to the neighborhood → get on the list" CTA.

**Community `/community`** — three clear sections: **Events & Calendar** (Google Calendar embed + "the year in WOP" event cards), **Get Connected** (Facebook group, GroupMe circles, opt-in family directory — all with the "never publishes resident info publicly" notice retained), **Announcements** (email-list explainer + dynamic board-announcement feed, currently JS-driven and hidden until populated).

**About → The Neighborhood `/about`** — history, stats row (170 homes, ½-acre, 6-lane pool, 2 courts), schools, security cameras, streets list. (This is today's homepage "about" + "meet your neighbors" content given a proper home.)

**About → Board & Volunteers `/about/board`** — board of directors cards, committee volunteers, "want to pitch in?" CTA.

**About → Documents `/about/documents`** — governing docs (covenants, bylaws PDFs), meeting-minutes table, **Exterior change request (ARC) form**, FAQ accordion.

**About → Contact `/about/contact`** (absorbs Suggestions) — **Update your contact info** form; **Who to reach** (role-based volunteer cards); **Report an issue** form; **Suggestion box** form (merged in from suggestions.html); "good to know" basics + neighborhood map.

**Thanks `/thanks`** — friendly confirmation, retained.

Removed/merged: standalone Suggestions page (merged), and the homepage's PWA-install and about content is redistributed (install becomes a compact footer-adjacent banner; about moves to `/about`).

---

## 3. Visual system

The current system (Fraunces + Public Sans, pine/birch/poolwater/clay, hand-drawn canopy SVG) is warm but leans decorative-craft. "Modern civic" keeps warmth in *color* and *tone* while making *structure and type* more disciplined.

### Typography
- **Display / headings: Fraunces** — **kept, but dialed back.** Fraunces is a genuinely good, characterful serif; retiring it would throw away recognizable identity. The move is to use it more sparingly (h1/h2 only), at slightly tighter weights (500–600, not 700), with tighter tracking, so it reads as *considered* rather than *crafty*. Drop it from h3 — see below.
- **Body & UI: Inter** (replacing Public Sans). Inter is the de-facto civic/institutional sans — neutral, superb at small sizes, excellent number legibility for dues/dates/stats. Use it for body, h3, labels, buttons, and nav. This creates a crisper serif-display / neutral-sans contrast than the current Public Sans (which is close enough to a serif in tone to muddy the pairing).
- Rationale: keeping one distinctive typeface (Fraunces) + swapping in a more neutral, institutional workhorse (Inter) is exactly the "polished but still ours" balance. Both are free Google Fonts; no licensing cost.

### Color palette
Evolve, don't discard. The greens are the neighborhood's equity — keep them, but modernize the accent and neutrals.

| Token | Hex | Role |
|---|---|---|
| Pine | `#1F3D2B` | primary brand, header, footer (kept) |
| Canopy | `#2E5940` | secondary green, panels (kept) |
| **Fern** | `#4C7A5B` | new mid-green for subtle fills, hover states |
| Poolwater | `#17727F` → **`#0E6E7A`** | primary actions (very slightly deepened for AA contrast on light) |
| **Sand** | `#EDE7D6` | tint sections (replaces birch-dark; calmer, less yellow) |
| Paper | `#FBFAF6` | page background (cooler, cleaner than current birch cream) |
| Card | `#FFFFFF` | card surfaces (was off-white; go true white for crispness) |
| Ink | `#1E2A22` | body text (slightly darker → higher contrast) |
| Ink-soft | `#4A543F` | secondary text (kept) |
| **Clay** | `#B4552D` → keep, **demote further** | reserved for the eyebrow accent and a single highlight per page only |

The civic-ness comes from: cooler, cleaner neutrals (Paper/Sand vs. warm cream), higher text contrast, and restraint on the clay accent. The warmth stays in the greens and the retained Fraunces headings.

### Spacing & layout grid
- Widen the container from `68rem` to **`75rem`** for a more contemporary, less letterbox feel; introduce a `--container-narrow: 48rem` for prose-heavy pages (documents, FAQ).
- Adopt a consistent **4/8px spacing scale** as CSS custom properties (`--space-1: 0.25rem` … `--space-12: 6rem`) so section rhythm is systematic rather than ad-hoc.
- Keep the 1/2/3-column responsive grid; add a **12-column implicit grid** option for asymmetric hero + sidebar layouts (e.g. season-glance beside quick actions).

### Key components
- **Buttons:** flatten and firm up. Slightly reduced radius (`--radius: 8px`), remove the 2px border on primary, keep the 44px min tap target. Add a subtle `:hover` lift only on cards, not buttons (buttons just darken). This reads more institutional than the current bouncy card+button motion.
- **Cards:** replace the coloured 4px top-border on action cards with a **hairline 1px border + very soft shadow**, and a small line icon per card. Crisper, less "sticker."
- **Stat row:** keep, but set the big number in Fraunces and the label in Inter uppercase micro-caps — the one place the serif/sans contrast really sings.
- **Hero:** **retire the hand-drawn canopy-polygon SVG divider.** It is the single most "craft" element and the biggest tell against "civic." Replace with a clean flat color-block hero, optionally a single tasteful pine-silhouette rule (1px, not a jagged polygon) or a subtle duotone photo of the actual pool/courts. This one change does the most to move the needle.
- **Forms:** consistent field styling with clear labels above inputs (already good), larger touch targets, inline validation states, and a shared `.form-card` container so ARC/contact/report/suggestion forms all look like one system.
- **The "clubhouse board" panel** (season-at-a-glance): keep the concept — it is charming and useful — but restyle to the new palette (Fern/Canopy) with cleaner dividers instead of dashed lines.

### Motion & imagery
- Motion: minimal and functional — 150ms ease on hover/focus, respect `prefers-reduced-motion` (already honored). No parallax, no scroll-jacking. Civic = calm.
- Imagery: introduce **real photography** (the pool, courts, tree-lined streets, an event) as the primary warmth vehicle, treated consistently (slight warm duotone or unfiltered, but pick one). Photos of the actual neighborhood are what make a volunteer HOA feel real and trustworthy — far more than illustration. Where no photo exists, fall back to solid color blocks, never clip-art.

---

## 4. Homepage, top to bottom

1. **Header** — Pine bar, wordmark + small refined tree glyph (keep the glyph, it's a nice mark), 5-item nav, persistent **Pay dues** button.
2. **Hero** — flat Pine block (no jagged canopy). Eyebrow "Lilburn, Georgia · Since the mid-1980s"; Fraunces h1 "A swim & tennis neighborhood under the pines"; one-sentence lede; two actions: **Pay your dues** (primary) + **See what's happening** (ghost). Optional: a duotone photo of the pool as a right-side or full-bleed background.
3. **Quick actions** — a clean 3-across (was 6 mixed) row of the true top tasks: **Pay dues · Reserve a court · Book a pool party**, with a secondary row of three smaller links (Report an issue · Exterior change request · Make a suggestion). Icon + label + one line each. This is the "what do you need to do?" block, tightened.
4. **Season at a glance** — the clubhouse-board panel, restyled, beside a short "opening this season" note. Dues, membership year, pool dates, court hours, trash day, referral.
5. **Announcements** — the dynamic board feed (JS-populated, hidden when empty), 3-card row, "all announcements →". Kept as-is functionally.
6. **The neighborhood (about)** — condensed: one paragraph + the **stat row** (170 / ½-acre / 6-lane / 2 courts) + three cards (Schools, Amenities, Security). Deep link to full `/about`.
7. **Add to home screen (PWA)** — compact single-card banner (not a full section): "Install WOPHA — pool hours and court booking, one tap from your chair," with the Android install button and a one-line iOS instruction. Slimmed from today's two-card section.
8. **Community teaser** — three cards (Families / Events & traditions / Volunteer-run) linking into `/community` and `/about/board`. Keeps the warmth close to the fold-out.
9. **Footer** — Pine, three columns (contact/address/Facebook · Do it online · Documents), plus board-portal link. Kept, restyled to new tokens.

---

## 5. Key differences: before → after

| | Today | Redesign |
|---|---|---|
| Nav | 9 flat items | 5 groups + persistent Pay-dues button |
| Type | Fraunces + Public Sans (both warm) | Fraunces (restrained) + Inter (neutral, civic) |
| Neutrals | Warm birch cream | Cooler Paper/Sand, higher contrast |
| Hero | Jagged hand-drawn canopy SVG | Flat color block / duotone photo |
| Action cards | Colored top-border, bounce hover | Hairline border, soft shadow, line icon |
| Warmth source | Illustration + craft type | Real photography + retained greens |
| Suggestions | Standalone page | Merged into Contact |
| Amenities | 3 sibling top-nav pages | Grouped under Amenities ▾ + overview |
| Homepage quick-actions | 6 equal-weight cards | 3 primary + 3 secondary, tiered |
| Container | 68rem, ad-hoc spacing | 75rem + systematic 4/8px scale |

---

## 6. Migration, build & accessibility notes

**Disruption: low-to-moderate.** The redesign is achievable within the existing static-HTML architecture — no framework required, which is the right call for a non-technical volunteer board that must be able to paste a Google Form URL into a page without a build step. Recommendations:

- **Keep static HTML.** Do *not* introduce React/a JS framework. The site is content, not an app.
- **Reduce copy-paste via lightweight includes.** The header/nav/footer are duplicated verbatim across all 10 pages today (a maintenance liability — every nav change is a 10-file edit). Introduce **one** of: (a) a tiny build step (Eleventy/11ty) that assembles partials at deploy time on Cloudflare Pages, or (b) a small JS include for header/footer. 11ty is preferred: it keeps authored files simple, outputs plain static HTML, and the board never sees the tooling. This is the single highest-value structural change.
- **Tokenize the CSS.** Convert the palette/spacing into the expanded custom-property set above; the redesign is then largely a stylesheet + partial-template change rather than a per-page rewrite.
- **Fonts:** swap the Google Fonts link to `Fraunces + Inter`; self-host both to drop the `fonts.gstatic.com` round-trip and improve privacy/perf (Cloudflare Pages makes this trivial).
- **Preserve all form `action="/api/forms/submit"` endpoints and `form_type` hidden fields** — the redesign must not touch the Functions contract. ARC, contact, report, and the merged suggestion form all keep their existing wiring.
- **Redirects:** `suggestions.html` → `/about/contact#suggestions`, and the amenity pages if URLs change; add these to Cloudflare Pages `_redirects` so old links/bookmarks/QR codes survive.

**Accessibility (maintain/improve on today's already-decent baseline):**
- Keep the skip-link, `aria-current`, `aria-labelledby` section headings, and `prefers-reduced-motion` handling — all present today and good.
- Dropdown nav must be **keyboard-operable and screen-reader-correct** (button `aria-expanded`, arrow-key movement, Esc to close) — the new grouping introduces the one real a11y risk; build it as a proper disclosure menu, not hover-only.
- Verify **WCAG AA contrast** on the deepened poolwater (`#0E6E7A`) against Paper and white — the reason for deepening it. Darker Ink helps body text clear AA comfortably.
- Real photos need **meaningful alt text**; decorative color blocks get `aria-hidden`.
- Maintain 44px tap targets (already in the button spec).

**Rollout:** stage on the `deploy` branch / a Cloudflare Pages preview, review on a phone (families visit on phones), then cut over — ideally aligned with the pending `wopha.com` cutover so the domain move and redesign land as one clean "new site" moment.
