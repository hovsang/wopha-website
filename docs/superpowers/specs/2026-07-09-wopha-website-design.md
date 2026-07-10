# WOPHA Website Redesign — Design Doc

Date: 2026-07-09
Replaces: https://www.wopha.com/ (Weebly, deprecated platform)

## Goal

A modern, mobile-first website for the Woods of Parkview Homeowners Association
(Lilburn, GA — ~170 homes, volunteer-run, self-managed). Residents should be able
to: pay HOA dues online, book pool parties and reserve tennis courts, submit
suggestions, see current events/hours/minutes, and find social groups (especially
parents with kids). Near-zero cost and near-zero maintenance for the volunteer board.

## Architecture decision

**Static multi-page site, plain HTML + one shared CSS file + minimal JS. No build
step, no framework, no CMS.** Rationale:

- Volunteer-maintainable: any board member with a text editor can update a date.
- Free hosting on Cloudflare Pages, attached to the existing wopha.com domain.
- All interactive needs (payments, bookings, forms) are handled by linked/embedded
  best-of-breed free services, so the site itself never needs a backend:

| Need | Service | Status |
|---|---|---|
| Dues payment | Stripe Payment Links (ACH-first) + Zelle + check | placeholder links — board creates Stripe account |
| Tennis courts | ReserveMyCourt (already in use — keep) | live link |
| Swim team | SwimTopia parkviewpoolcats.swimtopia.com (already in use — keep) | live link |
| Pool party / clubhouse | Google Form request → coordinator confirms | existing form, placeholder URL |
| Suggestion box | Web3Forms (named) + Google Form (anonymous) | placeholder access key / URL |
| Contact info update | Web3Forms → treasurer | placeholder access key |
| Events calendar | Embedded Google Calendar | placeholder calendar ID |
| Parents / social | Private Facebook group + opt-in GroupMe circles | links, some placeholder |

Alternatives considered: all-in-one HOA platforms (PayHOA $199/mo at this size,
HOA Express replaces the custom site) — rejected on cost/lock-in; noted as an
upgrade path if dues bookkeeping becomes painful. React/SSG frameworks — rejected;
no dynamic state justifies a toolchain.

## Site map (9 pages)

1. **index.html — Home**: hero, 4 quick actions (Pay Dues, Book the Pool, Reserve
   Tennis, What's Happening), community profile (170 homes, ½-acre lots, Parkview
   schools, security cameras), amenity highlights, current-season banner (pool
   dates, dues deadline).
2. **membership.html — Membership & Dues**: 2026 dues $535, period May 1 2026 –
   Apr 30 2027, member types (Full / Social / Annual non-resident) from FAQ, how
   to pay (Stripe buttons, Zelle, check), $50 referral, new-resident onboarding.
3. **pool.html — Pool**: season dates (May 17 – Sep 20, 2026), hours table
   (on-page, not a Google Sheet link), rules & guest policy (migrated verbatim),
   party booking flow + fee table ($100 reservation / $35/hr extra lifeguard /
   $50 maintenance fee 50+).
4. **tennis.html — Tennis**: ReserveMyCourt booking, court rules, ALTA teams,
   non-member fees ($35 adult / $25 junior), tennis director contact.
5. **swim-team.html — Swim Team**: Parkview Poolcats history, Gwinnett County Swim
   League, Junior Poolcats, SwimTopia registration links.
6. **community.html — Community & Events**: events calendar embed, parents groups
   (GroupMe circles: Parents of Littles, Playground Meetups, etc.), private
   Facebook group, opt-in family directory (Google Form), Yard of the Month
   revival, block-party photos.
7. **suggestions.html — Suggestions**: named suggestion form (Web3Forms) +
   anonymous option (Google Form), what happens to suggestions.
8. **board.html — Board & Documents**: board/committee roster, meeting minutes
   library (consistent, dated), covenants & bylaws PDFs, annual meeting info, FAQ.
9. **contact.html — Contact**: update-your-info form (feeds dues invoicing),
   role-based contacts, neighborhood map, trash day, streets/schools facts.

Fixes baked into the IA (from the site review):
- News/Updates/Events/Updates-changelog collapse into Home banner + Community page.
- **Resident directory is NOT published.** Replaced by explicit opt-in family
  directory shared privately. (Report flags the current public Google Sheet as a
  privacy incident the board should fix immediately.)
- Emails shown as role addresses (board@, treasurer@ via free Cloudflare Email
  Routing) with current volunteer names; no Cloudflare email obfuscation breakage.
- All current-season facts live on real pages, not external Google artifacts.

## Design language

Mobile-first, single shared `assets/css/styles.css`, CSS custom properties,
no CSS framework. Wooded-Georgia identity: deep forest green + warm cream +
sunlit accent; friendly but not childish; large touch targets; readable rule
text (the policy walls become scannable cards/accordions). System font stack
or self-hosted single family — no render-blocking font CDNs. Semantic HTML,
skip links, alt text, WCAG AA contrast. Nav: sticky header, hamburger on mobile
(pure CSS/JS-light).

## Placeholders

Anything the board must create (Stripe links, Web3Forms keys, calendar ID,
GroupMe invites) is marked `PLACEHOLDER` in an HTML comment and rendered as a
visibly-styled "board setup needed" note where user-facing, with a
`docs/launch-checklist.md` listing every one plus Cloudflare Pages deploy steps.

## Testing / verification

- Responsive check at 360px, 768px, 1280px widths.
- All internal links resolve; external links open in new tab.
- HTML validity spot check; Lighthouse-style basics (viewport meta, contrast,
  tap target size).
