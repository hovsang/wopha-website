# Public Site "Modern Civic" Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle and restructure the WOPHA public site to the "Modern Civic" visual system — new tokens, self-hosted Fraunces/Public Sans, the pine-ridge signature line, 5-group disclosure nav with a persistent Pay-dues button, and the 10→8 page IA (amenities section, about split, contact merge) — with old URLs preserved via `_redirects`.

**Architecture:** Pure static-site work on the Eleventy layer the tooling plan created: page sources in `src/*.html` (front matter: `title`, `description`, `pageKey`, plus explicit `permalink` where this plan moves a URL), shared chrome in `src/_includes/base.njk` + `site-header.njk` + `site-footer.njk`, output in `_site/`. A page source file contains front matter plus only the markup that goes **inside `<main id="main">`** — `base.njk` supplies doctype/head/skip-link/header/footer/`site.js`. All visual change is one stylesheet (`src/assets/css/styles.css`) plus partial markup; behavior stays in `src/assets/js/site.js` (ES5 style, no frameworks). **Statics live under `src/`** (the tooling plan moved `assets/`, `documents/`, `sw.js`, `site.webmanifest` into `src/` with passthrough copy) — built URLs are unchanged (`/assets/...`, `/sw.js`, `/site.webmanifest`). Backend (`functions/`), portal, and D1 are untouched.

**Tech Stack:** Eleventy (from the tooling plan), Nunjucks partials, plain CSS custom properties, vanilla ES5 JS, self-hosted woff2 fonts (Fontsource static builds), Cloudflare Pages `_redirects`.

**Spec:** `docs/superpowers/specs/2026-07-16-modern-civic-redesign-design.md` (§2, §3, §8, §9, §10) · Input proposal: `docs/superpowers/specs/2026-07-16-redesign-inputs/plan-public-site.md`

**Depends on:** `docs/superpowers/plans/2026-07-16-eleventy-tooling.md` — must be fully executed first. This plan consumes its interface contract exactly: sources `src/<page>.html` with front matter (`title`, `description`, `pageKey`); layout `src/_includes/base.njk`; partials `src/_includes/site-header.njk`, `src/_includes/site-footer.njk`; `npm run build` → `_site/`; `npm run dev` serves on port 8200; built asset URLs stay `/assets/...`.

## Global Constraints

- **Local-only branches.** Work happens on `redesign-experiment` (branched from `master`). NEVER push `master` or `redesign-experiment` — `docs/` holds board pricing. Broken cross-links are tolerable *between* tasks of this plan (the branch never deploys mid-plan); the final link-check task gates completion.
- **Form contracts untouched.** Every form keeps `action="/api/forms/submit"` + its hidden `form_type` field + its exact field `name=` attributes (`validate.js` checks names). Element `id`/`for` attributes MAY change (they must, when two forms share a page); `name=` attributes may not. The backend's 303 target `/thanks.html` must keep resolving — `thanks.html` keeps its exact URL.
- **Built URLs only change where Task 7's `_redirects` covers them.** `/index.html`, `/thanks.html`, `/assets/...`, `/documents/...`, `/portal/...`, `/api/...` do not move.
- **Preserved verbatim:** the fraud-awareness notice (membership), the "never publishes resident info" notice (community), the seasonal hero-CTA logic in `site.js` (URL targets update, logic doesn't), the announcements/content fetch wiring and its element IDs (`#news-list`, `#news-archive-list`, `#season-glance`, `#pool-hours-body`, `#hero-cta`, `#app`, `#install-app`).
- **No runtime JS frameworks.** Public-page JS matches `src/assets/js/site.js` house style: `var`, IIFEs, ES5-ish, no `innerHTML` for user content.
- **Gates stay green:** `npm test` (the full suite passes — 28 tests before the backend-seam plan executes, 74 after; execution order between the tracks is not fixed) and `npm run lint` (eslint) after every task; `npm run build` must succeed in every task.
- **Dev ports 8200–8202 only** (Hyper-V reserves 8078-8177/8278-8777/8779-8978 — workerd/servers crash elsewhere). `npm run dev` = 8200; static checks = 8201.
- **WCAG 2.2 AA** throughout: 4.5:1 text, 3:1 non-text/UI, ≥44px targets, keyboard-complete disclosure menus, `prefers-reduced-motion` honored (existing global rule stays).
- Motion: 150ms ease on hover/focus only. No parallax, no lifts on buttons.
- Photography is a **board content task** — this plan ships documented placeholder blocks (solid color, `aria-hidden`), never clip-art or stock.
- Commit at the end of every task with the message given in the task.

## File Structure

```
src/assets/fonts/fraunces-latin-500-normal.woff2 NEW (Task 1)
src/assets/fonts/fraunces-latin-600-normal.woff2 NEW (Task 1)
src/assets/fonts/public-sans-latin-400-normal.woff2  NEW (Task 1)
src/assets/fonts/public-sans-latin-600-normal.woff2  NEW (Task 1)
src/assets/fonts/public-sans-latin-700-normal.woff2  NEW (Task 1)
src/assets/css/styles.css                        REWRITTEN (Tasks 1–3)
src/_includes/pine-ridge.njk                     NEW — signature element (Task 2)
src/_includes/base.njk                           MODIFIED head (Task 1)
src/_includes/site-header.njk                    REWRITTEN (Task 3)
src/_includes/site-footer.njk                    REWRITTEN (Task 3)
src/assets/js/site.js                            disclosure menus (Task 3), URL targets + SW path (Task 9)
src/index.html                                   REBUILT (Task 4)
src/amenities/index.html                         NEW (Task 5)
src/amenities/pool.html                          MOVED from src/pool.html (Task 5)
src/amenities/tennis.html                        MOVED from src/tennis.html (Task 5)
src/amenities/swim-team.html                     MOVED from src/swim-team.html (Task 5)
src/about/index.html                             NEW (Task 6)
src/about/board.html                             NEW, from board.html people half (Task 6)
src/about/documents.html                         NEW, from board.html docs half (Task 7)
src/about/contact.html                           NEW, contact.html + suggestions.html merged (Task 7)
src/board.html, src/suggestions.html, src/contact.html   DELETED (Task 7)
src/_redirects                                   NEW (Task 7)  + 1 passthrough line in the Eleventy config
src/community.html                               RESTRUCTURED (Task 8)
src/membership.html                              RETARGETED links + permalink (Task 8)
src/thanks.html                                  restyled, URL pinned to /thanks.html (Task 8)
src/sw.js                                        REWRITTEN precache (Task 9)
src/site.webmanifest                             scope/start_url normalized (Task 9)
tools/check-links.mjs                            NEW (Task 11)
tools/check-redirects.mjs                        NEW (Task 11)
tools/screenshot-pages.mjs                       NEW (Task 11)
```

## Verified contrast reference (WCAG 2.x math, computed for this plan)

Every task that picks a color uses these numbers. AA normal text = 4.5:1, large text / non-text UI = 3:1.

| Foreground on background | Ratio | Verdict | Used for |
|---|---|---|---|
| Poolwater `#0E6E7A` on Paper `#FBFAF6` | **5.70:1** | AA | links, card CTAs |
| Poolwater `#0E6E7A` on Card `#FFFFFF` | **5.95:1** | AA | links in cards |
| Poolwater `#0E6E7A` on Sand `#EDE7D6` | **4.82:1** | AA | links in tint sections |
| White `#FFFFFF` on Poolwater `#0E6E7A` | **5.95:1** | AA | primary button |
| White on Poolwater-dark `#0A525B` | **8.86:1** | AA | primary button hover |
| Poolwater-dark `#0A525B` on Paper | **8.48:1** | AA | outline-button label, visited-ish link tone |
| Ink `#1E2A22` on Paper / Sand / Card | **14.27 / 12.06 / 14.90** | AA | body text |
| Ink-soft `#4A543F` on Paper / Sand / Card | **7.64 / 6.46 / 7.98** | AA | secondary text |
| Clay `#B4552D` on Sand `#EDE7D6` | **3.97:1** | **FAILS normal text** | ⚠ decorative only on Sand |
| Clay-deep `#9C4623` on Paper / Sand / Card | **6.07 / 5.13 / 6.34** | AA | eyebrow text, `.person .role` |
| White on Pine `#1F3D2B` | **11.93:1** | AA | header/hero/footer text |
| White on Canopy `#2E5940` | **8.02:1** | AA | nav hover, season panel |
| Gold `#F0C98F` on Canopy | **5.14:1** | AA | season-panel values |
| Hero eyebrow `#D9A06B` on Pine | **5.22:1** | AA | hero eyebrow |
| Mint `#A8D5C2` on Pine | **7.36:1** | AA | footer links, `aria-current` indicator bar |
| Poolwater on Pine | **2.00:1** | **FAILS** | ⚠ never use poolwater as an indicator on the pine bar |
| Input border `#6E6852` on Card / Paper | **5.58 / 5.34** | ≥3:1 non-text | form field boundaries (WCAG 1.4.11) |
| Error `#A13324` on Paper / Card | **6.67 / 6.97** | AA | `:user-invalid` border + error text |
| White on Fern `#4C7A5B` | **4.95:1** | AA | fern fills carrying text |
| Ink on Fern | **3.01:1** | large only | ⚠ no body text on fern |

**Spec deviation (recorded):** the spec assigns Clay `#B4552D` as the eyebrow accent, but eyebrows are 13px bold (below WCAG "large") and sit on Sand tint sections where Clay measures 3.97:1. This plan adds a companion token `--clay-deep: #9C4623` for **text** uses of clay and keeps `--clay: #B4552D` (contract token, unchanged) for decorative uses (notice border, setup-note dashes). Same reasoning: the current-page indicator on the pine nav bar uses Mint `#A8D5C2` (7.36:1), not Poolwater (2.00:1 on Pine).

---

### Task 1: Design tokens, self-hosted fonts, base typography

**Files:**
- Create: `src/assets/fonts/*.woff2` (5 files)
- Modify: `src/assets/css/styles.css` (header comment through the Layout section, i.e. everything **before** `/* ---- Header / nav ---- */`)
- Modify: `src/_includes/base.njk` (head: font links, asset URL normalization)

**Interfaces:**
- Produces: the full token set (`--pine`, `--pine-deep`, `--canopy`, `--fern`, `--poolwater`, `--poolwater-dark`, `--sand`, `--paper`, `--card`, `--ink`, `--ink-soft`, `--clay`, `--clay-deep`, `--line`, `--line-strong`, `--display`, `--body`, `--radius`, `--shadow`, `--container`, `--container-narrow`, `--space-1/2/3/4/6/8/10/12`) consumed by every later task **and by the portal redesign plan — do not rename any of them**.
- Produces: `@font-face` for Fraunces 500/600 + Public Sans 400/600/700 at `/assets/fonts/`. (Decision revised 2026-07-16, spec §2: the body face stays **Public Sans** — the USWDS civic typeface, already the site's body face; Inter was rejected after a side-by-side review. Only the *delivery* changes here: self-hosted instead of Google Fonts, so existing pages keep rendering identically until the token rewrite lands.)

- [ ] **Step 1: Download the five woff2 files (Fontsource static latin builds, pinned to major v5)**

Run from the repo root (PowerShell):

```powershell
New-Item -ItemType Directory -Force src/assets/fonts | Out-Null
curl.exe -L -o src/assets/fonts/fraunces-latin-500-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5/files/fraunces-latin-500-normal.woff2
curl.exe -L -o src/assets/fonts/fraunces-latin-600-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/fraunces@5/files/fraunces-latin-600-normal.woff2
curl.exe -L -o src/assets/fonts/public-sans-latin-400-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/public-sans@5/files/public-sans-latin-400-normal.woff2
curl.exe -L -o src/assets/fonts/public-sans-latin-600-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/public-sans@5/files/public-sans-latin-600-normal.woff2
curl.exe -L -o src/assets/fonts/public-sans-latin-700-normal.woff2 https://cdn.jsdelivr.net/npm/@fontsource/public-sans@5/files/public-sans-latin-700-normal.woff2
Get-ChildItem src/assets/fonts | Select-Object Name, Length
```

Expected: 5 files, each roughly 15–50 KB. If any file is under 5 KB it is an error page, not a font — stop and re-download. (These are static instances, not the variable font — Fraunces headings render at fixed optical size, which is fine at h1/h2 scale.)

- [ ] **Step 2: Rename the legacy tokens across the whole stylesheet**

Order matters (`--birch-dark` before `--birch`):

```powershell
$css = Get-Content src/assets/css/styles.css -Raw
$css = $css -replace 'var\(--birch-dark\)', 'var(--sand)'
$css = $css -replace 'var\(--birch\)', 'var(--paper)'
$css = $css -replace 'var\(--white\)', 'var(--card)'
Set-Content src/assets/css/styles.css $css -NoNewline
```

Then confirm zero stragglers:

```powershell
Select-String -Path src/assets/css/styles.css -Pattern 'birch|--white'
```

Expected: no matches except the `:root` definitions you are about to delete in Step 3.

- [ ] **Step 3: Replace the file header, `:root`, and typography sections**

In `src/assets/css/styles.css`, replace everything from the opening `/* ====== ... ` comment block down to (and including) the `.lede` rule — i.e. the current lines 1–84 region ending with `.lede { ... }` — with:

```css
/* ==========================================================================
   Woods of Parkview HOA — shared stylesheet ("Modern Civic" system)
   Palette:  Pine #1F3D2B · Canopy #2E5940 · Fern #4C7A5B · Poolwater #0E6E7A
             Sand #EDE7D6 · Paper #FBFAF6 · Card #FFFFFF · Clay #B4552D
   Type:     Fraunces (display — h1/h2 ONLY) · Public Sans (body & everything else)
   Poolwater is reserved for actions (pay, book, reserve). Clay is decorative;
   text accents use --clay-deep (Clay itself fails AA on Sand). Keep it that way.
   Contrast receipts: docs/superpowers/plans/2026-07-16-public-site-redesign.md
   ========================================================================== */

/* ---- Self-hosted fonts (src/assets/fonts/, served at /assets/fonts/) ----- */

@font-face {
  font-family: "Fraunces";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("../fonts/fraunces-latin-500-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Fraunces";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("../fonts/fraunces-latin-600-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Public Sans";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../fonts/public-sans-latin-400-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Public Sans";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("../fonts/public-sans-latin-600-normal.woff2") format("woff2");
}
@font-face {
  font-family: "Public Sans";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("../fonts/public-sans-latin-700-normal.woff2") format("woff2");
}

/* ---- Tokens (shared contract with the portal plan — never rename) ------- */

:root {
  /* Color */
  --pine: #1F3D2B;
  --pine-deep: #162D20;
  --canopy: #2E5940;
  --fern: #4C7A5B;
  --poolwater: #0E6E7A;
  --poolwater-dark: #0A525B;
  --sand: #EDE7D6;
  --paper: #FBFAF6;
  --card: #FFFFFF;
  --ink: #1E2A22;
  --ink-soft: #4A543F;
  --clay: #B4552D;
  --clay-deep: #9C4623;   /* text-safe clay: 5.13:1 on Sand */
  --line: #E4DFD0;        /* hairline card borders (decorative) */
  --line-strong: #6E6852; /* form-field borders: 5.58:1 on Card (≥3:1 non-text) */
  /* Type */
  --display: "Fraunces", Georgia, serif;
  --body: "Public Sans", -apple-system, "Segoe UI", sans-serif;
  /* Shape & depth */
  --radius: 8px;
  --shadow: 0 1px 2px rgba(30, 42, 34, 0.05), 0 4px 12px rgba(30, 42, 34, 0.07);
  /* Layout */
  --container: 75rem;
  --container-narrow: 48rem;
  /* Spacing — 4/8px scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 3rem;
  --space-12: 6rem;
}

* { box-sizing: border-box; }

[hidden] { display: none !important; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: var(--body);
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ink);
  background: var(--paper);
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
}

/* ---- Typography --------------------------------------------------------- */
/* Fraunces is h1/h2 only, weights 500-600, tightened tracking. h3 down is Public Sans. */

h1, h2 {
  font-family: var(--display);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.12;
  color: var(--pine);
  margin: 0 0 0.5em;
}

h1 { font-size: clamp(2rem, 5vw, 3rem); }
h2 { font-size: clamp(1.5rem, 3.5vw, 2rem); font-weight: 500; }

h3 {
  font-family: var(--body);
  font-weight: 700;
  font-size: 1.125rem;
  line-height: 1.3;
  color: var(--pine);
  margin: 0 0 0.5em;
}

p { margin: 0 0 1em; }

a { color: var(--poolwater-dark); }
a:hover { color: var(--poolwater); }

:focus-visible {
  outline: 3px solid var(--poolwater);
  outline-offset: 2px;
  border-radius: 2px;
}

.eyebrow {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--clay-deep); /* 6.07:1 Paper · 5.13:1 Sand */
  margin-bottom: var(--space-2);
}

.lede { font-size: 1.1875rem; color: var(--ink-soft); max-width: 46rem; }
```

- [ ] **Step 4: Replace the Layout section**

Still in `styles.css`, replace the `/* ---- Layout ---- */` block (`.container` through `.skip-link:focus`) with:

```css
/* ---- Layout ------------------------------------------------------------- */

.container {
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--space-4);
}
@media (min-width: 768px) {
  .container { padding-inline: var(--space-6); }
}

.container--narrow { max-width: var(--container-narrow); }

.section { padding-block: var(--space-10); }
@media (min-width: 768px) { .section { padding-block: 4.5rem; } }

.section--tint { background: var(--sand); }

.skip-link {
  position: absolute;
  left: -999px;
  top: 0;
  background: var(--pine);
  color: var(--card);
  padding: var(--space-3) var(--space-4);
  z-index: 100;
}
.skip-link:focus { left: 0; }
```

(Desktop section rhythm is 4.5rem = 72px — on the 8px grid; `--space-12` (6rem) is reserved for the hero.)

- [ ] **Step 5: Swap the head of `base.njk` to self-hosted fonts**

The *family* does not change — Public Sans is already the site's body face; only its delivery changes (self-hosted, no fonts.gstatic.com round-trip), so existing pages keep rendering identically until the token rewrite in this task lands. `src/_includes/base.njk` carries the head extracted verbatim from the current pages. Delete these three lines:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;600;700&display=swap" rel="stylesheet">
```

and put these two in their place (preload the two above-the-fold faces; the rest lazy-load via `@font-face`):

```html
  <link rel="preload" href="/assets/fonts/fraunces-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/public-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
```

While in the head, normalize the remaining asset links to root-absolute (pages will soon live in subdirectories, where relative paths break):

```html
  <link rel="stylesheet" href="/assets/css/styles.css">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#1f3d2b">
  <link rel="icon" href="/assets/img/icon-192.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/img/icon-180.png">
```

(`theme-color` stays `#1f3d2b` — Pine is unchanged in the new palette. If the tooling plan already made these root-absolute, verify and move on.) Also root-absolute the script tag at the bottom of `base.njk`: `<script src="/assets/js/site.js"></script>`.

- [ ] **Step 6: Build and verify**

```powershell
npm run build
Select-String -Path _site/index.html -Pattern 'fonts.googleapis|fonts.gstatic|Public\+Sans'
Test-Path _site/assets/fonts/public-sans-latin-400-normal.woff2
```

Expected: build green; the Select-String finds nothing; Test-Path prints `True` — the tooling plan's `eleventy.config.js` passthrough copies `src/assets` → `_site/assets` wholesale, so the new `src/assets/fonts/` files land automatically. If `False`, that `src/assets` passthrough entry in the tooling plan's `eleventy.config.js` is missing or broken — fix it there rather than adding a second entry here.

Then `npm run dev`, open `http://localhost:8200/`, and check in DevTools → Network that no request leaves for `fonts.gstatic.com`, and in the Elements panel that `body` computes to "Public Sans" (served from `/assets/fonts/`, not Google) and `h1` to Fraunces. Background should now be the cooler `#FBFAF6`.

- [ ] **Step 7: Gates + commit**

```powershell
npm test
npm run lint
git add -A
git commit -m "redesign: modern-civic tokens + self-hosted Fraunces/Public Sans"
```

---

### Task 2: Component restyle + canopy retirement

**Files:**
- Modify: `src/assets/css/styles.css` (everything **after** the `/* ---- Header / nav ---- */` block — Hero through the end of file; the nav block itself is Task 3)
- Modify: all 10 page sources in `src/` (delete the inline `<svg class="canopy">` line)
- Create: `src/_includes/pine-ridge.njk` (the signature-element partial, Step 9)

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: classes used by later page tasks — `.btn`, `.btn--primary`, `.btn--outline`, `.card`, `.card--action`, `.card-icon`, `.card-cta`, `.card-status`, `.board-panel`, `.notice`, `.setup-note`, `.form-card`, `.form-grid`, `.stat-row`, `.pill-list`, `.action-links`, `.install-banner`, `.photo-duotone`, `.photo-duotone--pine`, `.photo-placeholder`, `.photo-strip`, `.hero`, `.hero--page`, `.hero-actions`, `.grid`, `.grid--2/3/4`, `.table-wrap`, `details.rule`, `.person`.
- Produces: the `pine-ridge.njk` partial + `.pine-ridge`, `.pine-ridge-strip`, `.pine-ridge-strip--prefooter`, `.pine-ridge--footer` classes — Task 3 wires the pre-footer divider and footer mark; Task 4 wires the homepage hero baseline.

- [ ] **Step 1: Delete the canopy polygon from every page source**

The jagged hand-drawn divider is the single most "craft" element — it goes entirely (spec §2). Nine of the ten page sources in `src/` (`index`, `membership`, `pool`, `tennis`, `swim-team`, `community`, `board`, `suggestions`, `contact`; `thanks` has none) carry one identical line starting `<svg class="canopy"`; the sweep below is safe to run over all of them:

```powershell
Get-ChildItem src/*.html | ForEach-Object {
  (Get-Content $_ -Raw) -replace '(?m)^\s*<svg class="canopy"[^\r\n]*\r?\n', '' | Set-Content $_ -NoNewline
}
Select-String -Path src/*.html -Pattern 'class="canopy"'
```

Expected: the Select-String finds nothing.

- [ ] **Step 2: Replace the Hero section in `styles.css`**

Replace the `/* ---- Hero ---- */` block (from `.hero {` through the `.section--tint + * .canopy, .canopy--tint` rule — the `.canopy` rules are deleted, not moved) with:

```css
/* ---- Hero — flat pine block, no divider ---------------------------------- */

.hero {
  background: var(--pine);
  color: #fff;
  padding-block: var(--space-12) var(--space-10);
}

.hero h1 { color: #fff; }
.hero .eyebrow { color: #d9a06b; } /* 5.22:1 on Pine */
.hero p { color: rgba(255, 255, 255, 0.88); max-width: 40rem; }

.hero--page { padding-block: var(--space-10) var(--space-8); }

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-6);
}
```

- [ ] **Step 3: Replace the Buttons section**

```css
/* ---- Buttons — radius 8, darken on hover, no lift, 44px targets ---------- */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font: 600 1rem var(--body);
  text-decoration: none;
  border-radius: var(--radius);
  padding: 0.7rem 1.4rem;
  min-height: 44px;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn--primary { background: var(--poolwater); color: #fff; }        /* 5.95:1 */
.btn--primary:hover { background: var(--poolwater-dark); color: #fff; } /* 8.86:1 */

.btn--outline { border-color: var(--poolwater); color: var(--poolwater-dark); background: transparent; }
.btn--outline:hover { background: var(--poolwater); color: #fff; }

.hero .btn--outline { border-color: rgba(255, 255, 255, 0.7); color: #fff; }
.hero .btn--outline:hover { background: #fff; color: var(--pine); border-color: #fff; }
```

- [ ] **Step 4: Replace the Cards section**

Replace `/* ---- Cards ---- */` (grid rules through `.card--action .card-cta`) with:

```css
/* ---- Cards — hairline border, soft shadow, line icon; no colored top bar -- */

.grid { display: grid; gap: var(--space-6); }
@media (min-width: 640px) { .grid--2 { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) {
  .grid--3 { grid-template-columns: repeat(3, 1fr); }
  .grid--4 { grid-template-columns: repeat(4, 1fr); }
}
@media (min-width: 640px) and (max-width: 899px) {
  .grid--3, .grid--4 { grid-template-columns: 1fr 1fr; }
}

.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-6);
}

.card h3 { margin-top: 0; }
.card > :last-child { margin-bottom: 0; }

.card--action {
  display: block;
  text-decoration: none;
  color: var(--ink);
  transition: border-color 0.15s ease;
}
.card--action:hover { border-color: var(--poolwater); color: var(--ink); }
.card--action:hover .card-cta { text-decoration: underline; }
.card-cta { color: var(--poolwater-dark); font-weight: 700; }

.card-icon {
  display: block;
  width: 28px;
  height: 28px;
  color: var(--fern);
  margin-bottom: var(--space-3);
}

.card-status {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--canopy);
  margin-bottom: var(--space-2);
}
```

- [ ] **Step 5: Replace the clubhouse board panel**

```css
/* ---- Clubhouse board — season-at-a-glance panel (Fern/Canopy, clean rules) */

.board-panel {
  background: var(--canopy);
  color: #fff;
  border: 1px solid var(--fern);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-6);
}
.board-panel h2, .board-panel h3 { color: #fff; }
.board-panel h2 { font-size: 1.375rem; }
.board-panel ul { list-style: none; margin: 0; padding: 0; }
.board-panel li {
  padding: var(--space-3) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}
.board-panel li:last-child { border-bottom: none; }
.board-panel strong {
  color: #f0c98f; /* 5.14:1 on Canopy */
  font-family: var(--display);
  font-weight: 500;
  font-variant-numeric: tabular-nums; /* dues/dates line up (spec §2 numeral discipline) */
}
```

- [ ] **Step 6: Replace Notices, Tables, Accordions, People**

Replace the `/* ---- Notices ---- */` through `/* ---- People ---- */` blocks with:

```css
/* ---- Notices ------------------------------------------------------------- */

.notice {
  background: var(--card);
  border: 1px solid var(--line);
  border-left: 4px solid var(--clay); /* decorative — text inside is Ink */
  border-radius: var(--radius);
  padding: var(--space-4) var(--space-6);
  margin-block: var(--space-6);
}
.notice > :last-child { margin-bottom: 0; }

.setup-note {
  background: repeating-linear-gradient(-45deg, #fdf6e3, #fdf6e3 12px, #faf0d7 12px, #faf0d7 24px);
  border: 2px dashed var(--clay);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  font-size: 0.9375rem;
  margin-block: var(--space-4);
}
.setup-note::before {
  content: "Board setup needed";
  display: block;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--clay-deep);
  margin-bottom: var(--space-1);
}

/* ---- Tables --------------------------------------------------------------- */

.table-wrap { overflow-x: auto; margin-block: var(--space-6); }

table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  font-size: 0.9375rem;
}

th, td { text-align: left; padding: var(--space-3) var(--space-4); }
td { font-variant-numeric: tabular-nums; } /* fee/date columns line up (spec §2) */
thead th { background: var(--pine); color: #fff; font-weight: 600; }
tbody tr:nth-child(even) { background: var(--paper); }

/* ---- Accordions (rules, FAQ) ----------------------------------------------- */

details.rule {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  margin-bottom: var(--space-3);
  padding: 0;
}

details.rule summary {
  cursor: pointer;
  font: 700 1rem var(--body);
  color: var(--pine);
  padding: var(--space-4) var(--space-6);
  list-style-position: outside;
  min-height: 44px;
}

details.rule[open] summary { border-bottom: 1px solid var(--line); }
details.rule .rule-body { padding: var(--space-4) var(--space-6); }
details.rule .rule-body > :last-child { margin-bottom: 0; }

/* ---- People (board roster) -------------------------------------------------- */

.person {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-4) var(--space-6);
}
.person .role {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--clay-deep);
}
.person h3 { margin: var(--space-1) 0; }
.person p { margin: 0; font-size: 0.9375rem; color: var(--ink-soft); }
```

- [ ] **Step 7: Replace Forms; add `.form-card` and validation states**

Replace the `/* ---- Forms ---- */` block with:

```css
/* ---- Forms — one shared system: .form-card container, labels above ------- */

.form-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-6);
  max-width: var(--container-narrow);
}

.form-grid { display: grid; gap: var(--space-4); max-width: 38rem; }

label { font-weight: 600; display: block; margin-bottom: var(--space-1); }

input, textarea, select {
  width: 100%;
  font: 400 1rem var(--body);
  color: var(--ink);
  background: var(--card);
  border: 1px solid var(--line-strong); /* 5.58:1 on Card — clears 1.4.11 */
  border-radius: var(--radius);
  padding: 0.7rem 0.9rem;
  min-height: 44px;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--poolwater);
  box-shadow: 0 0 0 3px rgba(14, 110, 122, 0.18);
}

/* Inline validation: browsers flag fields after user interaction */
input:user-invalid, textarea:user-invalid, select:user-invalid {
  border-color: #a13324; /* 6.97:1 on Card */
}
input:user-invalid:focus, textarea:user-invalid:focus, select:user-invalid:focus {
  box-shadow: 0 0 0 3px rgba(161, 51, 36, 0.15);
}

.field-note { font-size: 0.875rem; color: var(--ink-soft); margin: var(--space-1) 0 0; }
```

- [ ] **Step 8: Replace Footer and Misc; add the new component classes**

Replace `/* ---- Footer ---- */` through end of file with:

```css
/* ---- Footer ------------------------------------------------------------------ */

.site-footer {
  background: var(--pine);
  color: rgba(255, 255, 255, 0.85);
  padding-block: var(--space-10) var(--space-8);
  margin-top: 0; /* the pre-footer pine-ridge strip (Step 9) supplies the gap */
  font-size: 0.9375rem;
}

.site-footer .container { display: grid; gap: var(--space-6); }
@media (min-width: 768px) {
  .site-footer .container { grid-template-columns: 2fr 1fr 1fr; }
}

.site-footer h3 { color: #fff; font-size: 1.0625rem; }
.site-footer a { color: #a8d5c2; } /* 7.36:1 on Pine */
.site-footer a:hover { color: #fff; }
.site-footer ul { list-style: none; margin: 0; padding: 0; }
.site-footer li { padding-block: var(--space-1); }
.footer-note {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: var(--space-8);
  padding-top: var(--space-4);
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

/* ---- Stats — Fraunces number (tabular), Public Sans micro-caps label ----------- */

.stat-row { display: flex; flex-wrap: wrap; gap: var(--space-8); margin-block: var(--space-6); }
.stat-row .stat strong {
  display: block;
  font-family: var(--display);
  font-weight: 600;
  font-size: 1.875rem;
  line-height: 1.1;
  color: var(--pine);
  font-variant-numeric: tabular-nums;
}
.stat-row .stat span {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

/* ---- Quick-action secondary tier ------------------------------------------------ */

.action-links {
  list-style: none;
  margin: var(--space-4) 0 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-6);
}
.action-links a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
  color: var(--poolwater-dark);
}

/* ---- PWA install banner (compact card) ------------------------------------------- */

.install-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}
.install-banner h2 { font-family: var(--body); font-weight: 700; font-size: 1.125rem; margin: 0 0 var(--space-1); }
.install-banner p { margin: 0; color: var(--ink-soft); }

/* ---- Photography — duotone treatment + placeholder (never clip-art) --------------- */
/* Real photos (board supplies) go in .photo-duotone; until then, .photo-placeholder
   renders a solid green block. Placeholders are decorative: aria-hidden="true". */

.photo-duotone {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--poolwater);
}
.photo-duotone--pine { background: var(--pine); }
.photo-duotone img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0;
  filter: grayscale(1) contrast(1.05) brightness(1.05);
  mix-blend-mode: multiply; /* highlights take the panel color; shadows stay deep */
}

.photo-placeholder {
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--fern), var(--canopy));
  aspect-ratio: 3 / 2;
}

.photo-strip { display: grid; gap: var(--space-3); grid-template-columns: 1fr; }
@media (min-width: 640px) { .photo-strip { grid-template-columns: repeat(3, 1fr); } }

/* ---- Misc ---------------------------------------------------------------------- */

.pill-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.pill-list li {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
}

img { max-width: 100%; height: auto; border-radius: var(--radius); }

.gallery { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
```

- [ ] **Step 9: Create the pine-ridge signature partial + its CSS**

Spec §2 (added 2026-07-16, user-approved): **the pine-ridge line** — a single drafted 1px fern treeline, the same idea as the retired canopy executed precisely as a fine stroke, never a filled silhouette. It is the site's one bold element and appears in **exactly three places**: (a) the homepage hero's baseline rule, (b) a pre-footer divider, (c) a small footer mark. **Placement rule (stated for all later tasks): the full-bleed baseline appears under the tall homepage hero only — compact `hero--page` heroes stay flat; site-wide ridge presence comes from the footer partial. Do not use it anywhere else.**

Create `src/_includes/pine-ridge.njk` containing exactly this static SVG (path data is final — generated from the user-approved mockup; the viewBox intentionally clips the overshoot past x=1200):

```html
<svg class="pine-ridge" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true"><path fill="none" stroke="#4C7A5B" stroke-width="1.25" stroke-linejoin="round" vector-effect="non-scaling-stroke" d="M0 30 L0 30 L30.0 22.0 L45.0 23.5 L69.0 14.0 L96.0 20.4 L108.0 23.3 L150 30 L156 30 L180.0 17.9 L192.0 19.4 L211.2 8.0 L232.8 15.7 L242.4 19.7 L276 30 L280 30 L299.2 24.6 L308.8 26.1 L324.2 18.0 L341.4 23.4 L349.1 25.6 L376 30 L416 30 L444.0 20.0 L458.0 21.5 L480.4 10.0 L505.6 18.0 L516.8 21.6 L556 30 L564 30 L586.0 14.4 L597.0 15.9 L614.6 4.0 L634.4 11.8 L643.2 16.5 L674 30 L679 30 L696.6 24.4 L705.4 25.9 L719.5 16.0 L735.3 23.0 L742.4 25.5 L767 30 L823 30 L849.0 21.0 L862.0 22.5 L882.8 12.0 L906.2 19.2 L916.6 22.4 L953 30 L959 30 L979.8 16.8 L990.2 18.3 L1006.8 6.0 L1025.6 14.4 L1033.9 18.7 L1063 30 L1107 30 L1130.6 23.3 L1142.4 24.8 L1161.3 15.0 L1182.5 21.8 L1192.0 24.4 L1225 30 L1235 30 L1254.2 19.0 L1263.8 20.5 L1279.2 10.0 L1296.4 17.0 L1304.1 20.6 L1331 30 L1200 30"/></svg>
```

Then append this block to `src/assets/css/styles.css` (after the Photography block, before Misc):

```css
/* ---- Pine-ridge line — THE signature element (spec §2) -------------------- */
/* One drafted 1px fern treeline (src/_includes/pine-ridge.njk), used in
   exactly three places: homepage hero baseline, pre-footer divider, footer
   mark. This is the site's one bold element — do not use it anywhere else.
   Decorative: the svg carries aria-hidden; no contrast requirement. */

.pine-ridge { display: block; width: 100%; height: 40px; }

.pine-ridge-strip { line-height: 0; background: var(--paper); }
.pine-ridge-strip--prefooter { margin-top: var(--space-10); }

/* Footer mark: a 160px-wide slice of the same ridge at its natural 30:1
   proportions — the wrapper CROPS (overflow hidden) rather than squeezing
   1200 units into 160px, keeping the drafted line's rhythm. On pine the
   fern stroke reads as a quiet emboss — intentional. */
.pine-ridge--footer {
  width: 160px;
  overflow: hidden;
  margin-inline: auto;
  margin-bottom: var(--space-3);
  line-height: 0;
}
.pine-ridge--footer .pine-ridge { width: 480px; height: 16px; }
```

(The pre-footer strip now supplies the content-to-footer gap — which is why Step 8's `.site-footer` sets `margin-top: 0`. The ridge stays invisible until Tasks 3–4 wire its three placements.)

- [ ] **Step 10: Verify visually, then gates + commit**

```powershell
npm run build; npm run dev
```

Open `http://localhost:8200/` and `http://localhost:8200/pool.html` at both narrow and wide widths. Look for: no jagged canopy edge anywhere (heroes end in a flat pine edge); cards show a thin warm-gray border and a soft shadow, and hovering an action card changes only the border color — nothing moves; the season panel has solid, not dashed, dividers; buttons darken on hover without lifting. Then:

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: component restyle + pine-ridge signature partial (canopy retired)"
```

---

### Task 3: Header/footer partials, 5-group disclosure nav, Pay-dues button

**Files:**
- Rewrite: `src/_includes/site-header.njk`, `src/_includes/site-footer.njk`
- Modify: `src/assets/css/styles.css` (the `/* ---- Header / nav ---- */` block only)
- Modify: `src/assets/js/site.js` (append the disclosure IIFE after the existing nav-toggle IIFE)

**Interfaces:**
- Consumes: front-matter `pageKey` (from the tooling contract). Values this plan uses: `home`, `membership`, `amenities`, `amenities-pool`, `amenities-tennis`, `amenities-swim-team`, `community`, `about`, `about-board`, `about-documents`, `about-contact`. Also consumes `src/_includes/pine-ridge.njk` + its classes (Task 2 Step 9).
- Produces: nav markup classes `.nav-group`, `.nav-disclosure`, `.nav-menu`, `.nav-link`, `.nav-cta`, `.chev`, `.is-current-section` and the disclosure-menu JS behavior. **Note:** nav targets like `/amenities/` 404 until Tasks 5–7 create them; Task 11's link checker is the gate.

- [ ] **Step 1: Rewrite `src/_includes/site-header.njk`**

Full file (the chevron SVG is repeated inline three times on purpose — partials-within-partials would be the only 11ty feature the board ever has to learn otherwise):

```njk
<header class="site-header">
  <div class="container">
    <a class="brand" href="/">
      <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><path fill="#a8d5c2" d="M11 0 3 10h4L1 19h8v7h4v-7h8l-6-9h4L11 0z"/></svg>
      Woods of Parkview
    </a>
    <nav class="site-nav" id="site-nav" aria-label="Main">
      <ul>
        <li class="nav-group">
          <button type="button" class="nav-disclosure{% if pageKey in ['amenities', 'amenities-pool', 'amenities-tennis', 'amenities-swim-team'] %} is-current-section{% endif %}" aria-expanded="false" aria-controls="menu-amenities">
            Amenities
            <svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="nav-menu" id="menu-amenities">
            <li><a href="/amenities/"{% if pageKey == 'amenities' %} aria-current="page"{% endif %}>Overview</a></li>
            <li><a href="/amenities/pool/"{% if pageKey == 'amenities-pool' %} aria-current="page"{% endif %}>Pool</a></li>
            <li><a href="/amenities/tennis/"{% if pageKey == 'amenities-tennis' %} aria-current="page"{% endif %}>Tennis &amp; pickleball</a></li>
            <li><a href="/amenities/swim-team/"{% if pageKey == 'amenities-swim-team' %} aria-current="page"{% endif %}>Swim team</a></li>
          </ul>
        </li>
        <li><a class="nav-link" href="/membership/"{% if pageKey == 'membership' %} aria-current="page"{% endif %}>Membership</a></li>
        <li class="nav-group">
          <button type="button" class="nav-disclosure{% if pageKey == 'community' %} is-current-section{% endif %}" aria-expanded="false" aria-controls="menu-community">
            Community
            <svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="nav-menu" id="menu-community">
            <li><a href="/community/#events">Events &amp; calendar</a></li>
            <li><a href="/community/#connect">Get connected</a></li>
            <li><a href="/community/#announcements">Announcements</a></li>
          </ul>
        </li>
        <li class="nav-group">
          <button type="button" class="nav-disclosure{% if pageKey in ['about', 'about-board', 'about-documents', 'about-contact'] %} is-current-section{% endif %}" aria-expanded="false" aria-controls="menu-about">
            About
            <svg class="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="nav-menu" id="menu-about">
            <li><a href="/about/"{% if pageKey == 'about' %} aria-current="page"{% endif %}>The neighborhood</a></li>
            <li><a href="/about/board/"{% if pageKey == 'about-board' %} aria-current="page"{% endif %}>Board &amp; volunteers</a></li>
            <li><a href="/about/documents/"{% if pageKey == 'about-documents' %} aria-current="page"{% endif %}>Governing documents</a></li>
            <li><a href="/about/contact/"{% if pageKey == 'about-contact' %} aria-current="page"{% endif %}>Contact &amp; report</a></li>
          </ul>
        </li>
      </ul>
    </nav>
    <a class="btn btn--primary nav-cta" href="/membership/#pay">Pay dues <span aria-hidden="true">→</span></a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
  </div>
</header>
```

- [ ] **Step 2: Rewrite `src/_includes/site-footer.njk`**

Full file (unifies the two footer variants — the portal link now appears on every page). Two of the pine-ridge line's three placements live here: the pre-footer divider (on Paper, above the pine block) and the small footer mark (a cropped 160px slice centered above the © line — on Pine the fern stroke reads as a quiet emboss, which is intentional; both are decorative/`aria-hidden`):

```njk
<div class="pine-ridge-strip pine-ridge-strip--prefooter" aria-hidden="true">
  {% include "pine-ridge.njk" %}
</div>
<footer class="site-footer">
  <div class="container">
    <div>
      <h3>Woods of Parkview HOA</h3>
      <p>1 Planters Way<br>Lilburn, GA 30047</p>
      <p><a href="https://www.facebook.com/Woods-of-Parkview-Homeowners-Association-269242857122/" target="_blank" rel="noopener">Facebook page</a></p>
    </div>
    <div>
      <h3>Do it online</h3>
      <ul>
        <li><a href="/membership/#pay">Pay dues</a></li>
        <li><a href="/amenities/tennis/#reserve">Reserve a court</a></li>
        <li><a href="/amenities/pool/#party">Book a pool party</a></li>
        <li><a href="/about/contact/#suggestions">Suggestion box</a></li>
        <li><a href="/portal/">Board portal</a></li>
      </ul>
    </div>
    <div>
      <h3>Documents</h3>
      <ul>
        <li><a href="/about/documents/#documents">Covenants &amp; bylaws</a></li>
        <li><a href="/about/documents/#minutes">Meeting minutes</a></li>
        <li><a href="/about/contact/#update">Update your info</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-note">
    <div class="pine-ridge--footer" aria-hidden="true">
      {% include "pine-ridge.njk" %}
    </div>
    <p>© 2026 Woods of Parkview Homeowners Association · Lilburn, Georgia</p>
  </div>
</footer>
```

- [ ] **Step 3: Replace the Header/nav CSS block**

Replace the entire `/* ---- Header / nav ---- */` block in `styles.css` (from `.site-header {` through the closing `}` of the `@media (min-width: 960px)` nav block) with:

```css
/* ---- Header / nav — 5 groups + persistent Pay dues ----------------------- */

.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--pine);
  color: #fff;
  box-shadow: var(--shadow);
}

.site-header .container {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 3.75rem;
}

.brand {
  font-family: var(--display);
  font-weight: 600;
  font-size: 1.1875rem;
  color: #fff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-block: var(--space-2);
  margin-right: auto;
}
.brand:hover { color: #fff; }
.brand svg { flex: none; }

.nav-cta { padding: 0.45rem 0.9rem; font-size: 0.9375rem; white-space: nowrap; }

.nav-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius);
  color: #fff;
  font: 600 0.9375rem var(--body);
  padding: 0.5rem 0.875rem;
  min-height: 44px;
  cursor: pointer;
}

/* Mobile: single-column accordion drawer below the bar */
.site-nav {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--pine);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 14px 24px rgba(22, 45, 32, 0.35);
  max-height: calc(100vh - 3.75rem);
  overflow-y: auto;
}
.site-nav.open { display: block; }

.site-nav > ul {
  list-style: none;
  margin: 0;
  padding: var(--space-3) var(--space-4) var(--space-6);
}

.nav-link, .nav-disclosure {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  min-height: 44px;
  padding: 0.6rem var(--space-2);
  color: #fff;
  text-decoration: none;
  font: 600 0.9375rem var(--body);
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}
.nav-link:hover, .nav-disclosure:hover,
.nav-link:focus-visible, .nav-disclosure:focus-visible {
  background: var(--canopy);
  color: #fff;
}

.chev { flex: none; margin-left: auto; transition: transform 0.15s ease; }
.nav-disclosure[aria-expanded="true"] .chev { transform: rotate(180deg); }

.nav-menu {
  display: none;
  list-style: none;
  margin: 0;
  padding: 0 0 var(--space-2) var(--space-4);
}
.nav-disclosure[aria-expanded="true"] + .nav-menu { display: block; }

.nav-menu a {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0.55rem var(--space-2);
  border-radius: 6px;
  color: #fff;
  text-decoration: none;
  font: 600 0.9375rem var(--body);
}
.nav-menu a:hover, .nav-menu a:focus-visible { background: var(--canopy); color: #fff; }

.nav-link[aria-current="page"], .nav-menu a[aria-current="page"] {
  background: var(--canopy);
  box-shadow: inset 3px 0 0 #a8d5c2; /* mint 7.36:1 on pine; poolwater is 2.0:1 — do not swap */
}

@media (min-width: 960px) {
  .nav-toggle { display: none; }
  .site-nav {
    display: block;
    position: static;
    background: transparent;
    border-top: 0;
    box-shadow: none;
    max-height: none;
    overflow: visible;
  }
  .site-nav > ul { display: flex; align-items: center; gap: var(--space-1); padding: 0; }
  .nav-group { position: relative; }
  .nav-link, .nav-disclosure { width: auto; padding: 0.6rem 0.7rem; white-space: nowrap; }
  .chev { margin-left: 0; }
  .nav-link[aria-current="page"] {
    background: transparent;
    box-shadow: inset 0 -3px 0 #a8d5c2;
    border-radius: 0;
  }
  .nav-disclosure.is-current-section {
    box-shadow: inset 0 -3px 0 #a8d5c2;
    border-radius: 0;
  }
  .nav-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 14rem;
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgba(30, 42, 34, 0.14);
    padding: var(--space-1);
    z-index: 60;
  }
  .nav-menu a { color: var(--ink); }
  .nav-menu a:hover, .nav-menu a:focus-visible { background: var(--sand); color: var(--ink); }
  .nav-menu a[aria-current="page"] {
    background: var(--sand);
    box-shadow: inset 3px 0 0 var(--poolwater); /* on Sand, poolwater is fine as a bar */
    color: var(--ink);
  }
}
```

- [ ] **Step 4: Add the disclosure-menu JS to `src/assets/js/site.js`**

Insert this IIFE directly **after** the existing nav-toggle IIFE (the `(function () { var toggle = ... })();` block — which stays exactly as is; it still drives the mobile drawer). Complete code:

```js
// Disclosure dropdown menus (Amenities / Community / About). ARIA APG
// disclosure-navigation pattern: button[aria-expanded] toggles its menu;
// Esc closes and refocuses the button; ArrowDown/ArrowUp walk the open
// menu; click-outside and focus-leaving close. Same markup drives the
// desktop dropdowns and the mobile accordion drawer.
(function () {
  var groups = document.querySelectorAll(".nav-group");
  if (!groups.length) return;

  function menuLinks(group) {
    return Array.prototype.slice.call(group.querySelectorAll(".nav-menu a"));
  }
  function setOpen(group, open) {
    group.querySelector(".nav-disclosure")
      .setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeAll(except) {
    Array.prototype.forEach.call(groups, function (g) {
      if (g !== except) setOpen(g, false);
    });
  }

  Array.prototype.forEach.call(groups, function (group) {
    var btn = group.querySelector(".nav-disclosure");

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      closeAll(group);
      setOpen(group, !open);
    });

    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        closeAll(group);
        setOpen(group, true);
        var links = menuLinks(group);
        if (links.length) links[0].focus();
      } else if (e.key === "Escape") {
        setOpen(group, false);
      }
    });

    group.addEventListener("keydown", function (e) {
      if (e.target === btn) return;
      var links = menuLinks(group);
      var i = links.indexOf(document.activeElement);
      if (i === -1) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (i < links.length - 1) links[i + 1].focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (i === 0) { setOpen(group, false); btn.focus(); }
        else links[i - 1].focus();
      } else if (e.key === "Escape") {
        setOpen(group, false);
        btn.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        links[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        links[links.length - 1].focus();
      }
    });

    // Close when keyboard focus leaves the group entirely (tabbing past it).
    group.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!group.contains(document.activeElement)) setOpen(group, false);
      }, 0);
    });
  });

  document.addEventListener("click", function (e) {
    var header = document.querySelector(".site-header");
    if (header && !header.contains(e.target)) closeAll(null);
  });
})();
```

- [ ] **Step 5: Keyboard + pointer verification**

`npm run build; npm run dev`, open `http://localhost:8200/` at ≥960px width:

1. Click "Amenities" — menu opens as a white card; click again — closes; open it, click elsewhere on the page — closes.
2. Tab to "Amenities", press `ArrowDown` — menu opens AND focus lands on "Overview". `ArrowDown`/`ArrowUp` walk items; `ArrowUp` on the first item closes and returns focus to the button; `Esc` anywhere in the menu closes and refocuses the button.
3. Open "Amenities", then click "About" — Amenities closes, About opens (only one open at a time).
4. Tab through an open menu past its last item — the menu closes by itself.
5. "Pay dues →" button is visible in the bar at every width, including 375px.
6. Narrow to <960px: "Menu" opens the drawer; each group expands as a single-column accordion; chevrons flip.
7. Scroll to the bottom: a hairline fern treeline (the pine-ridge divider) sits on Paper directly above the pine footer, and a small 160px ridge mark sits centered above the © line — on every page.

- [ ] **Step 6: Gates + commit**

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: 5-group disclosure nav + persistent Pay dues"
```

---

### Task 4: Homepage rebuild

**Files:**
- Rewrite: `src/index.html`

**Interfaces:**
- Consumes: Task 2 component classes (incl. `pine-ridge.njk` — the `{% include %}` below relies on the tooling plan rendering `.html` templates through Nunjucks, `htmlTemplateEngine: "njk"`), Task 3 partials (via `base.njk`).
- Produces: preserved dynamic-behavior IDs `#hero-cta`, `#season-glance`, `#news` + `#news-list`, `#app` + `#install-app` — `site.js` targets these; do not rename. Also produces the pine-ridge line's third placement: the hero baseline (homepage only — per the Task 2 Step 9 rule, compact `hero--page` heroes stay flat).

- [ ] **Step 1: Replace `src/index.html` in full**

Spec §3 homepage order: hero → tiered quick actions + season panel → announcements → condensed about → compact PWA banner → community teaser. Full file:

```html
---
title: Woods of Parkview HOA — Lilburn, Georgia
description: Woods of Parkview is a 170-home swim and tennis neighborhood in Lilburn, Georgia. Pay dues, book the pool, reserve tennis courts, and see what's happening.
pageKey: home
permalink: /index.html
---
<section class="hero">
  <div class="container">
    <span class="eyebrow">Lilburn, Georgia · Est. mid-1980s</span>
    <h1>A swim &amp; tennis neighborhood under the pines</h1>
    <p class="lede">Woods of Parkview is 170 homes on half-acre wooded lots in the Parkview school cluster — with a six-lane pool, two lighted tennis courts, picnic areas, and neighbors who run all of it as volunteers.</p>
    <div class="hero-actions">
      <a class="btn btn--primary" id="hero-cta" href="/membership/#pay">Pay your dues</a>
      <a class="btn btn--outline" href="/community/">See what's happening</a>
    </div>
    <!-- PHOTO (board supplies): optional duotone pool photo. When available, add after .hero-actions:
         <figure class="photo-duotone" style="max-width:28rem;margin-top:2rem">
           <img src="/assets/img/pool-hero.jpg" alt="Swimmers in the six-lane pool on a summer afternoon">
         </figure> -->
  </div>
</section>
<div class="pine-ridge-strip" aria-hidden="true">{% include "pine-ridge.njk" %}</div>

<section class="section" aria-labelledby="actions-heading">
  <div class="container">
    <div class="grid grid--2">
      <div>
        <span class="eyebrow">Quick actions</span>
        <h2 id="actions-heading">What do you need to do?</h2>
        <div class="grid">
          <a class="card card--action" href="/membership/#pay">
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.5 9.5c-.5-.9-1.4-1.4-2.5-1.4-1.5 0-2.5.8-2.5 1.9s1 1.5 2.5 1.9 2.5.8 2.5 1.9-1 1.9-2.5 1.9c-1.1 0-2-.5-2.5-1.4"/></svg>
            <h3>Pay dues</h3>
            <p>Online, by bank transfer, or by check.</p>
            <span class="card-cta">Membership &amp; dues →</span>
          </a>
          <a class="card card--action" href="/amenities/tennis/#reserve">
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.5 6c3.5 2.5 3.5 9.5 0 12M18.5 6c-3.5 2.5-3.5 9.5 0 12"/></svg>
            <h3>Reserve a court</h3>
            <p>Book up to 48 hours ahead on ReserveMyCourt.</p>
            <span class="card-cta">Tennis &amp; pickleball →</span>
          </a>
          <a class="card card--action" href="/amenities/pool/#party">
            <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c5 0 9 3.2 9 7H3c0-3.8 4-7 9-7ZM12 10v7a2.5 2.5 0 0 0 5 0"/></svg>
            <h3>Book a pool party</h3>
            <p>Reserve the pavilion and a lifeguard.</p>
            <span class="card-cta">Pool parties →</span>
          </a>
        </div>
        <ul class="action-links">
          <li><a href="/about/contact/#report">Report an issue</a></li>
          <li><a href="/about/documents/#arc">Exterior change request</a></li>
          <li><a href="/about/contact/#suggestions">Make a suggestion</a></li>
        </ul>
      </div>
      <div class="board-panel">
        <h2 id="season-heading">This season at a glance</h2>
        <ul id="season-glance">
          <li><span>2026 annual dues</span> <strong>$535</strong></li>
          <li><span>Membership year</span> <strong>May 1, 2026 – Apr 30, 2027</strong></li>
          <li><span>Pool open</span> <strong>May 17 – Sep 20</strong></li>
          <li><span>Tennis courts</span> <strong>7 a.m. – 11 p.m. daily</strong></li>
          <li><span>Trash &amp; recycling</span> <strong>Thursday mornings</strong></li>
          <li><span>Refer a new member</span> <strong>Earn $50</strong></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section" id="news" hidden aria-labelledby="news-heading">
  <div class="container">
    <span class="eyebrow">Latest from the board</span>
    <h2 id="news-heading">Announcements</h2>
    <div class="grid grid--3" id="news-list"></div>
    <p><a href="/community/#news-archive">All announcements →</a></p>
  </div>
</section>

<section class="section section--tint" aria-labelledby="about-heading">
  <div class="container">
    <span class="eyebrow">The neighborhood</span>
    <h2 id="about-heading">Settled streets, tall trees, and a pool at the center</h2>
    <p class="lede">Built from the mid-1980s to the early 1990s, Woods of Parkview sits in Gwinnett County just outside downtown Lilburn. Ninety-five percent of homeowners are permanent members — people move here and stay.</p>
    <div class="stat-row">
      <div class="stat"><strong>170</strong> <span>homes</span></div>
      <div class="stat"><strong>½ acre</strong> <span>average lot</span></div>
      <div class="stat"><strong>6 lanes</strong> <span>pool + diving well + baby pool</span></div>
      <div class="stat"><strong>2</strong> <span>LED-lighted tennis courts</span></div>
    </div>
    <div class="grid grid--3">
      <div class="card">
        <h3>Parkview schools</h3>
        <p>Arcado Elementary, Trickum Middle, and Parkview High — one of Gwinnett County's most sought-after clusters.</p>
      </div>
      <div class="card">
        <h3>Amenities for every age</h3>
        <p>Pool with diving well and baby pool, clubhouse and pavilion, picnic tables, and lighted tennis until 11 p.m.</p>
      </div>
      <div class="card">
        <h3>Security minded</h3>
        <p>A camera system records every license plate entering the neighborhood, 24/7.</p>
      </div>
    </div>
    <p style="margin-top:1.5rem"><a href="/about/">More about the neighborhood →</a></p>
  </div>
</section>

<section class="section" id="app" aria-labelledby="app-heading">
  <div class="container">
    <div class="card install-banner">
      <div>
        <h2 id="app-heading">Install WOPHA on your home screen</h2>
        <p>Pool hours, court booking, and the party form — one tap from your pool chair. iPhone: open in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</p>
      </div>
      <button class="btn btn--primary" id="install-app" hidden>Install the app</button>
    </div>
  </div>
</section>

<section class="section section--tint" aria-labelledby="social-heading">
  <div class="container">
    <span class="eyebrow">Get connected</span>
    <h2 id="social-heading">Meet your neighbors</h2>
    <div class="grid grid--3">
      <div class="card">
        <h3>Parents &amp; kids</h3>
        <p>Picnic-table meetups, parent group chats, and the Parkview Poolcats swim team — the easiest ways for families to plug in.</p>
        <p><a href="/community/#connect">Find your group →</a></p>
      </div>
      <div class="card">
        <h3>Events &amp; traditions</h3>
        <p>Block parties, Yard of the Month, holiday lights, and the annual meeting every January.</p>
        <p><a href="/community/#events">See the calendar →</a></p>
      </div>
      <div class="card">
        <h3>Volunteer-run, always</h3>
        <p>No management company — neighbors keep WOP running. There's a job the size of whatever time you have.</p>
        <p><a href="/about/board/">Meet the board →</a></p>
      </div>
    </div>
  </div>
</section>
```

Notes: the old separate two-card PWA section is replaced by the single `install-banner` card (spec §3 item 7); the streets pill-list moved to `/about/` (Task 6); the "canopy" and old 6-equal-cards grid are gone. `#app` stays a `<section>` so the existing `site.js` standalone-mode hide keeps working.

- [ ] **Step 2: Verify**

`npm run build; npm run dev` → `http://localhost:8200/`. Check: the pine-ridge baseline renders as a fine fern treeline directly under the pine hero block (on Paper, full-bleed, crisp 1px stroke at any width); 3 primary action cards each show a green line icon; the 3 secondary text links sit under them; season panel to the right on desktop, below on mobile; announcements section absent (hidden, API-dependent); PWA banner is one compact card; DevTools console shows no errors from `site.js` (the seasonal-CTA IIFE still finds `#hero-cta`).

- [ ] **Step 3: Gates + commit**

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: homepage rebuild (tiered actions, compact PWA banner)"
```

---

### Task 5: Amenities section — overview page + pool/tennis/swim-team moves

**Files:**
- Create: `src/amenities/index.html`
- Move: `src/pool.html` → `src/amenities/pool.html`, `src/tennis.html` → `src/amenities/tennis.html`, `src/swim-team.html` → `src/amenities/swim-team.html` (then edit front matter + links)

**Interfaces:**
- Consumes: Task 2 classes (`.card-status`, `.photo-strip`, `.photo-placeholder`), Task 3 nav URLs.
- Produces: URLs `/amenities/`, `/amenities/pool/` (anchors `#hours`, `#party`, table body id `#pool-hours-body` — `site.js` fills it), `/amenities/tennis/` (anchor `#reserve`), `/amenities/swim-team/`. Task 7's `_redirects` maps the old URLs here.

- [ ] **Step 1: Create `src/amenities/index.html`** (content per input proposal §2: hero strip, three feature cards with one-line status, season-hours summary, pay-dues CTA)

```html
---
title: Amenities — Woods of Parkview HOA
description: The Woods of Parkview amenities at a glance — six-lane pool with diving well, two LED-lighted tennis and pickleball courts, and the Parkview Poolcats swim team.
pageKey: amenities
permalink: /amenities/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">Pool · Tennis · Swim team</span>
    <h1>The amenities</h1>
    <p class="lede">A six-lane pool with diving well and baby pool, two LED-lighted courts for tennis and pickleball, and a swim team that's raced since 1986 — all of it run by your neighbors.</p>
  </div>
</section>

<section class="section" aria-labelledby="amenity-list-heading">
  <div class="container">
    <h2 id="amenity-list-heading">Pick your amenity</h2>
    <div class="grid grid--3">
      <a class="card card--action" href="/amenities/pool/">
        <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0M3 12c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0M8 12V6a2 2 0 0 1 4 0"/></svg>
        <span class="card-status">Open May 17 – Sep 20</span>
        <h3>The pool</h3>
        <p>Six lanes, a diving well, a baby pool, and the pavilion. Hours, rules, guests, and pool parties.</p>
        <span class="card-cta">Pool →</span>
      </a>
      <a class="card card--action" href="/amenities/tennis/">
        <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M5.5 6c3.5 2.5 3.5 9.5 0 12M18.5 6c-3.5 2.5-3.5 9.5 0 12"/></svg>
        <span class="card-status">Courts open 7 a.m. – 11 p.m. daily</span>
        <h3>Tennis &amp; pickleball</h3>
        <p>Two LED-lighted courts, online reservations, ALTA teams, and non-member seasonal fees.</p>
        <span class="card-cta">Tennis &amp; pickleball →</span>
      </a>
      <a class="card card--action" href="/amenities/swim-team/">
        <svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0M5 13l5-5 4 3 5-4"/><circle cx="18" cy="5" r="1.6"/></svg>
        <span class="card-status">Registration opens each spring on SwimTopia</span>
        <h3>Swim team</h3>
        <p>The Parkview Poolcats, est. 1986 — ages 4–18, and you don't have to be a member to join.</p>
        <span class="card-cta">Swim team →</span>
      </a>
    </div>
  </div>
</section>

<section class="section section--tint" aria-labelledby="season-summary-heading">
  <div class="container">
    <div class="grid grid--2">
      <div class="board-panel">
        <h2 id="season-summary-heading">Season hours at a glance</h2>
        <ul>
          <li><span>Pool season</span> <strong>May 17 – Sep 20</strong></li>
          <li><span>Pool hours</span> <strong>Posted at season opening</strong></li>
          <li><span>Tennis &amp; pickleball</span> <strong>7 a.m. – 11 p.m. daily</strong></li>
          <li><span>Swim team season</span> <strong>Early May – early July</strong></li>
        </ul>
      </div>
      <div>
        <span class="eyebrow">One membership covers it all</span>
        <h2>Paid up? Then it's all yours.</h2>
        <p>Your annual dues cover the pool, the courts, the pavilion, and everything in between. Pay once in the spring and you're set for the season.</p>
        <p><a class="btn btn--primary" href="/membership/#pay">Pay your dues</a></p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Move the three amenity pages**

```powershell
git mv src/pool.html src/amenities/pool.html
git mv src/tennis.html src/amenities/tennis.html
git mv src/swim-team.html src/amenities/swim-team.html
```

- [ ] **Step 3: Set front matter on the three moved pages**

Replace each page's existing front-matter block (the `---` fenced block the tooling plan added) with, respectively:

`src/amenities/pool.html`:
```yaml
---
title: Pool — Woods of Parkview HOA
description: "The Woods of Parkview pool: 2026 season dates, hours, guest policy, and how to book a pool party at our six-lane pool with diving well, baby pool, and pavilion."
pageKey: amenities-pool
permalink: /amenities/pool/index.html
---
```

`src/amenities/tennis.html`:
```yaml
---
title: Tennis & Pickleball — Woods of Parkview HOA
description: Reserve one of Woods of Parkview's two LED-lighted tennis and pickleball courts on ReserveMyCourt, read the court rules, join an ALTA team, or play as a non-member for a seasonal fee.
pageKey: amenities-tennis
permalink: /amenities/tennis/index.html
---
```

`src/amenities/swim-team.html`:
```yaml
---
title: Swim Team — Woods of Parkview HOA
description: The Parkview Poolcats swim team, established 1986, welcomes swimmers ages 4–18 in the Gwinnett County Swim League. WOPHA membership not required — register on SwimTopia.
pageKey: amenities-swim-team
permalink: /amenities/swim-team/index.html
---
```

- [ ] **Step 4: Retarget in-page links on the moved pages (exact old → new)**

`src/amenities/pool.html` — one link, in the "Occasional early closures" rule body:
- `href="community.html#events"` → `href="/community/#events"`

`src/amenities/tennis.html` — one link, the "See membership options" button in the "Not a member?" section:
- `href="membership.html"` → `href="/membership/"`
- Verify it was the only one: `Select-String -Path src/amenities/tennis.html -Pattern 'membership.html'` — expect 0 matches after the edit.

`src/amenities/swim-team.html` — one link:
- `href="community.html#parents"` → `href="/community/#connect"`

Then confirm no page-relative links remain on any of the three: `Select-String -Path src/amenities/*.html -Pattern 'href="(?!https?|/|#|mailto|tel)'` — expect no matches.

- [ ] **Step 5: Add the pool photo strip**

At the end of `src/amenities/pool.html`, after the closing `</section>` of the `#party` section, add:

```html
<section class="section section--tint" aria-labelledby="pool-photos-heading">
  <div class="container">
    <span class="eyebrow">Gallery</span>
    <h2 id="pool-photos-heading">Around the pool</h2>
    <!-- PHOTO (board supplies): replace each placeholder with
         <figure class="photo-duotone"><img src="/assets/img/pool-1.jpg" alt="Describe what the photo shows"></figure>
         Real photos get meaningful alt text; placeholders stay aria-hidden. -->
    <div class="photo-strip" aria-hidden="true">
      <div class="photo-placeholder"></div>
      <div class="photo-placeholder"></div>
      <div class="photo-placeholder"></div>
    </div>
  </div>
</section>
```

- [ ] **Step 6: Verify + commit**

```powershell
npm run build
Test-Path _site/amenities/index.html
Test-Path _site/amenities/pool/index.html
Test-Path _site/amenities/tennis/index.html
Test-Path _site/amenities/swim-team/index.html
```

All four `True`. `npm run dev` → `http://localhost:8200/amenities/` shows three status-labeled cards; `/amenities/pool/` renders with working nav (Amenities button shows the current-section underline; Pool has the menu `aria-current` mark). The pool page hours table still has `id="pool-hours-body"` (`Select-String -Path src/amenities/pool.html -Pattern 'pool-hours-body'` → 1 match).

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: amenities section (/amenities overview + pool/tennis/swim-team moves)"
```

---

### Task 6: About section — `/about/` neighborhood page + `/about/board/`

**Files:**
- Create: `src/about/index.html`, `src/about/board.html`
- (`src/board.html` is deleted in Task 7, after its second half moves to `/about/documents/`)

**Interfaces:**
- Produces: URLs `/about/`, `/about/board/`. `/about/` absorbs the homepage's neighborhood/about content per spec §3 ("NEW /about/ neighborhood page absorbing homepage about content"); `/about/board/` takes board.html's people half.

- [ ] **Step 1: Create `src/about/index.html`**

```html
---
title: The Neighborhood — Woods of Parkview HOA
description: The story and stats of Woods of Parkview — 170 homes on half-acre wooded lots in Lilburn, Georgia, in the Parkview school cluster, with a six-lane pool and two lighted courts.
pageKey: about
permalink: /about/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">About Woods of Parkview</span>
    <h1>The neighborhood</h1>
    <p class="lede">Settled streets, tall trees, and a pool at the center. Built from the mid-1980s to the early 1990s, Woods of Parkview sits in Gwinnett County just outside downtown Lilburn — and ninety-five percent of homeowners are permanent members. People move here and stay.</p>
  </div>
</section>

<section class="section" aria-labelledby="stats-heading">
  <div class="container">
    <h2 id="stats-heading">The neighborhood by the numbers</h2>
    <div class="stat-row">
      <div class="stat"><strong>170</strong> <span>homes</span></div>
      <div class="stat"><strong>½ acre</strong> <span>average lot</span></div>
      <div class="stat"><strong>6 lanes</strong> <span>pool + diving well + baby pool</span></div>
      <div class="stat"><strong>2</strong> <span>LED-lighted tennis courts</span></div>
    </div>
    <div class="grid grid--3">
      <div class="card">
        <h3>Parkview schools</h3>
        <p>Arcado Elementary, Trickum Middle, and Parkview High — one of Gwinnett County's most sought-after clusters.</p>
      </div>
      <div class="card">
        <h3>Amenities for every age</h3>
        <p>Pool with diving well and baby pool, clubhouse and pavilion, picnic tables, and lighted tennis until 11 p.m.</p>
      </div>
      <div class="card">
        <h3>Security minded</h3>
        <p>A camera system records every license plate entering the neighborhood, 24/7.</p>
      </div>
    </div>
    <!-- PHOTO (board supplies): a tree-lined street or entrance shot. Replace the placeholder with
         <figure class="photo-duotone photo-duotone--pine"><img src="/assets/img/streets.jpg" alt="Describe the scene"></figure> -->
    <div class="photo-placeholder" aria-hidden="true" style="margin-top:1.5rem"></div>
  </div>
</section>

<section class="section section--tint" aria-labelledby="streets-heading">
  <div class="container">
    <h2 id="streets-heading">Our streets</h2>
    <ul class="pill-list">
      <li>Bowers Brook Drive &amp; Court</li>
      <li>Planters Drive &amp; Court</li>
      <li>Amsterdam Drive &amp; Court</li>
      <li>Huntshire Lane</li>
    </ul>
    <p style="margin-top:1.5rem">Trash &amp; recycling pickup is Thursday mornings (Waste Management). The clubhouse is at 1 Planters Way, Lilburn, GA 30047.</p>
  </div>
</section>

<section class="section" aria-labelledby="more-heading">
  <div class="container">
    <h2 id="more-heading">Go deeper</h2>
    <div class="grid grid--3">
      <a class="card card--action" href="/about/board/">
        <h3>Board &amp; volunteers</h3>
        <p>No management company — meet the neighbors who run everything.</p>
        <span class="card-cta">Meet the board →</span>
      </a>
      <a class="card card--action" href="/about/documents/">
        <h3>Governing documents</h3>
        <p>Covenants, bylaws, meeting minutes, and the exterior-change request form.</p>
        <span class="card-cta">Documents →</span>
      </a>
      <a class="card card--action" href="/community/">
        <h3>Community &amp; events</h3>
        <p>Block parties, group chats, and traditions that go back decades.</p>
        <span class="card-cta">Get connected →</span>
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create `src/about/board.html`** (people half of the current `src/board.html`, roster carried verbatim; the pitch-in card's suggestion link retargets; a cross-link card covers old `board.html#arc` / `#minutes` bookmarks that land here via redirect)

```html
---
title: Board & Volunteers — Woods of Parkview HOA
description: Meet the volunteer board of directors and committee volunteers who run the Woods of Parkview HOA — no management company, just neighbors.
pageKey: about-board
permalink: /about/board/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">Self-managed, volunteer-run</span>
    <h1>Board &amp; volunteers</h1>
    <p class="lede">There's no management company — your neighbors run the HOA. Here's who they are and how to pitch in.</p>
  </div>
</section>

<section class="section" aria-labelledby="board-heading">
  <div class="container">
    <span class="eyebrow">Your volunteers</span>
    <h2 id="board-heading">Board of directors</h2>
    <div class="grid grid--3">
      <div class="person">
        <div class="role">President</div>
        <h3>Giovanni Vargas</h3>
        <p><a href="tel:+18502067639">850-206-7639</a></p>
      </div>
      <div class="person">
        <div class="role">Vice President</div>
        <h3>James Green</h3>
        <p><a href="tel:+17818580462">781-858-0462</a></p>
      </div>
      <div class="person">
        <div class="role">Treasurer</div>
        <h3>Seiji Ijuin</h3>
        <p><a href="tel:+17703805193">770-380-5193</a></p>
      </div>
      <div class="person">
        <div class="role">Secretary</div>
        <h3>Catherine Davidson</h3>
        <p><a href="tel:+14049315221">404-931-5221</a></p>
      </div>
      <div class="person">
        <div class="role">At-Large Director</div>
        <h3>Amanda Tarpley</h3>
        <p><a href="tel:+14046646990">404-664-6990</a></p>
      </div>
    </div>
    <h2 style="margin-top:2rem">Committee volunteers</h2>
    <div class="grid grid--2">
      <div class="person">
        <div class="role">Outside Membership &amp; Pool Party Reservations</div>
        <h3>Joel Tarpley</h3>
        <p><a href="tel:+14045787138">404-578-7138</a></p>
      </div>
      <div class="person">
        <div class="role">Tennis Director</div>
        <h3>Gretchen Hughes</h3>
        <p><a href="tel:+16788608026">678-860-8026</a></p>
      </div>
    </div>
  </div>
</section>

<section class="section section--tint" aria-labelledby="pitch-heading">
  <div class="container">
    <div class="grid grid--2">
      <div class="card">
        <h3 id="pitch-heading">Want to pitch in?</h3>
        <p>Everything at Woods of Parkview — the pool, the courts, the events, this website — runs on volunteers. There's a job the size of whatever time you have. Talk to any board member, or <a href="/about/contact/#suggestions">drop a note in the suggestion box</a> and tell us what you'd like to help with.</p>
      </div>
      <a class="card card--action" href="/about/documents/">
        <h3>Looking for the paperwork?</h3>
        <p>Covenants, bylaws, meeting minutes, and the exterior change request form moved to their own page.</p>
        <span class="card-cta">Governing documents →</span>
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Verify + commit**

```powershell
npm run build
Test-Path _site/about/index.html; Test-Path _site/about/board/index.html
npm test; npm run lint
git add -A
git commit -m "redesign: /about neighborhood + /about/board"
```

(`src/board.html` still exists and still builds at its old URL — it goes away in Task 7. `npm run dev` spot-check: `/about/` and `/about/board/` render; the About nav group shows the current-section underline on both.)

---

### Task 7: `/about/documents/` + contact merge + delete old pages + `_redirects`

**Files:**
- Create: `src/about/documents.html`, `src/about/contact.html`, `src/_redirects`
- Delete: `src/board.html`, `src/suggestions.html`, `src/contact.html`
- Modify: the Eleventy config (one passthrough line)

**Interfaces:**
- Consumes: ARC form from `board.html`, suggestion form from `suggestions.html`, contact/report forms from `contact.html` — `action`/`form_type`/`name=` attributes byte-identical; only `id`/`for` pairs on the suggestion form are renamed (they'd collide with the contact form's ids on the shared page).
- Produces: URLs `/about/documents/` (anchors `#documents`, `#minutes`, `#arc`), `/about/contact/` (anchors `#update`, `#reach`, `#report`, `#suggestions`, `#know`), and the `_redirects` file that keeps every retired URL alive on Cloudflare Pages.

- [ ] **Step 1: Create `src/about/documents.html`**

Docs half of `board.html`. The minutes table, covenants/bylaws cards, ARC form, and FAQ move verbatim except: PDF links become root-absolute (`documents/...` → `/documents/...`), and FAQ cross-links retarget. Full file:

```html
---
title: Governing Documents — Woods of Parkview HOA
description: Woods of Parkview HOA covenants and bylaws, meeting minutes, the exterior change request (ARC) form, and answers to common questions.
pageKey: about-documents
permalink: /about/documents/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">The rules of record</span>
    <h1>Governing documents</h1>
    <p class="lede">What the board decided, and the documents that govern the neighborhood — covenants, bylaws, meeting minutes, and the exterior change request form.</p>
  </div>
</section>

<section class="section" id="documents" aria-labelledby="documents-heading">
  <div class="container">
    <span class="eyebrow">The rules of record</span>
    <h2 id="documents-heading">Covenants &amp; bylaws</h2>
    <div class="grid grid--2">
      <div class="card">
        <h3>Declaration of Covenants</h3>
        <p>Revised September 2009. The covenants run with the land and govern what owners may do with their property.</p>
        <p><a class="btn btn--outline" href="/documents/final_declaration_of_covenants.pdf">Download the covenants (PDF)</a></p>
      </div>
      <div class="card">
        <h3>Bylaws</h3>
        <p>How the association itself operates — meetings, elections, and the duties of the board.</p>
        <p><a class="btn btn--outline" href="/documents/final_bylaws_copy.pdf">Download the bylaws (PDF)</a></p>
      </div>
    </div>
    <div class="notice">
      <p>Membership in the association is automatic and mandatory for property owners under the recorded covenants. Georgia law (OCGA 44-5-60) governs how covenants run with the land.</p>
    </div>
  </div>
</section>

<section class="section section--tint" id="minutes" aria-labelledby="minutes-heading">
  <div class="container">
    <span class="eyebrow">What the board decided</span>
    <h2 id="minutes-heading">Meeting minutes</h2>
    <p>The annual meeting is held each winter at the Lilburn Municipal Courtroom at Police HQ, 4600 Lawrenceville Hwy. Can't attend? The board circulates a proxy form ahead of the meeting — signed proxies count toward quorum, and the board can send yours by DocuSign on request. Minutes are posted here as PDFs.</p>

    <!-- PLACEHOLDER: Meeting minutes PDFs. Gather the minutes from the old site — some are pasted as text on pages, some are PDFs inside blog posts — convert each to a PDF, and save them in documents/minutes/ using the exact filenames linked in the table below. -->
    <div class="setup-note">
      <p>Gather the minutes from the old site (some are pasted as text on pages, some are PDFs attached to blog posts), convert each to a PDF, and save them in <code>documents/minutes/</code> using the exact filenames the table below links to.</p>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Meeting</th>
            <th scope="col">Link</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Feb 22, 2026</td><td>Annual meeting</td><td><a href="/documents/minutes/2026-02-22-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Feb 23, 2025</td><td>Annual meeting</td><td><a href="/documents/minutes/2025-02-23-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Jun 28, 2022</td><td>Board meeting (Pool Pavilion)</td><td><a href="/documents/minutes/2022-06-28-board-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>2020</td><td>Annual meeting</td><td><a href="/documents/minutes/2020-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Jan 26, 2019</td><td>Annual meeting</td><td><a href="/documents/minutes/2019-01-26-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Jan 24, 2018</td><td>Annual meeting (Lilburn City Hall)</td><td><a href="/documents/minutes/2018-01-24-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Jan 31, 2016</td><td>Annual meeting</td><td><a href="/documents/minutes/2016-01-31-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Jan 26, 2014</td><td>Annual meeting</td><td><a href="/documents/minutes/2014-01-26-annual-meeting.pdf">Minutes (PDF)</a></td></tr>
          <tr><td>Nov 5, 2013</td><td>Enhancement Projects letter</td><td><a href="/documents/minutes/2013-11-05-enhancement-projects-letter.pdf">Letter (PDF)</a></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>

<section class="section" id="arc" aria-labelledby="arc-heading">
  <div class="container">
    <span class="eyebrow">Before you build, paint, or fence</span>
    <h2 id="arc-heading">Exterior change request</h2>
    <p class="lede">The covenants require board approval before exterior changes — fences, paint colors, roofs, additions, major landscaping. Send your request here and get a written answer before work starts; it protects you at resale.</p>
    <form class="form-card form-grid" action="/api/forms/submit" method="POST">
      <input type="hidden" name="form_type" value="arc_request">
      <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <div>
        <label for="arc-name">Your name</label>
        <input id="arc-name" name="name" type="text" required autocomplete="name">
      </div>
      <div>
        <label for="arc-address">Property address</label>
        <input id="arc-address" name="address" type="text" required autocomplete="street-address">
      </div>
      <div>
        <label for="arc-email">Email</label>
        <input id="arc-email" name="email" type="email" required autocomplete="email">
      </div>
      <div>
        <label for="arc-type">Type of change</label>
        <select id="arc-type" name="project_type" required>
          <option value="">Choose one…</option>
          <option>Fence</option>
          <option>Exterior paint</option>
          <option>Roof</option>
          <option>Addition or structure</option>
          <option>Major landscaping / tree removal</option>
          <option>Something else</option>
        </select>
      </div>
      <div>
        <label for="arc-desc">Describe the project</label>
        <textarea id="arc-desc" name="message" rows="5" required placeholder="What you're changing, materials and colors, and roughly when work would start"></textarea>
      </div>
      <div>
        <button class="btn btn--primary" type="submit">Submit for board review</button>
      </div>
    </form>
    <div class="notice">
      <p>Have drawings, paint chips, or photos? After submitting, email them to the board referencing your address. The board reviews requests at its next meeting and replies in writing.</p>
    </div>
  </div>
</section>

<section class="section section--tint" aria-labelledby="faq-heading">
  <div class="container">
    <span class="eyebrow">Common questions</span>
    <h2 id="faq-heading">FAQ</h2>
    <details class="rule">
      <summary>Is HOA membership optional?</summary>
      <div class="rule-body">
        <p>No. Membership is automatic and mandatory — it comes with the property under the recorded covenants. There are three member types: Full, Social, and Annual non-resident. See <a href="/membership/">Membership</a> for what each includes.</p>
      </div>
    </details>
    <details class="rule">
      <summary>What's the difference between covenants and bylaws?</summary>
      <div class="rule-body">
        <p>The covenants govern the land — what owners may do with their property. The bylaws govern how the association itself operates: meetings, elections, and the duties of the board.</p>
      </div>
    </details>
    <details class="rule">
      <summary>When is the annual meeting?</summary>
      <div class="rule-body">
        <p>Usually late January (weather can push it later — the 2026 meeting moved to February 22 for an ice storm), at the Lilburn Municipal Courtroom at Police HQ, 4600 Lawrenceville Hwy. If you can't attend, sign a proxy so the meeting makes quorum. Watch the calendar on the <a href="/community/#events">Community</a> page for the exact date.</p>
      </div>
    </details>
    <details class="rule">
      <summary>Can non-residents use the pool or courts?</summary>
      <div class="rule-body">
        <p>Yes, in a few ways: a limited number of <a href="/membership/">Annual non-resident memberships</a>, seasonal <a href="/amenities/tennis/">tennis fees</a>, and open <a href="/amenities/swim-team/">swim-team registration</a>.</p>
      </div>
    </details>
  </div>
</section>
```

- [ ] **Step 2: Create `src/about/contact.html`** (contact.html + suggestions.html merged)

The contact-update and issue-report forms move byte-identical. The suggestion form moves with its `name=` attributes byte-identical but its `id`/`for` pairs renamed `name→sugg-name`, `email→sugg-email`, `street→sugg-street`, `suggestion→sugg-text` (they would collide with the update form's ids). Full file:

```html
---
title: Contact & Report — Woods of Parkview HOA
description: Reach the Woods of Parkview board — update your contact info, report a neighborhood issue, drop a suggestion in the box, and find the right volunteer to call.
pageKey: about-contact
permalink: /about/contact/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">Volunteers, not a call center</span>
    <h1>Contact &amp; report</h1>
    <p class="lede">Update your contact information, report something broken, drop an idea in the suggestion box, and find the right neighbor to reach — all in one place.</p>
  </div>
</section>

<section class="section" id="update" aria-labelledby="update-heading">
  <div class="container">
    <span class="eyebrow">Stay in the loop</span>
    <h2 id="update-heading">Update your contact information</h2>
    <p class="lede">We use this to send your annual dues invoice and infrequent important announcements — nothing else.</p>
    <form class="form-card form-grid" action="/api/forms/submit" method="POST">
      <input type="hidden" name="form_type" value="contact_update">
      <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <div>
        <label for="address">Home address</label>
        <input type="text" id="address" name="address" required autocomplete="street-address">
      </div>
      <div>
        <label for="name">First and last name</label>
        <input type="text" id="name" name="name" required autocomplete="name">
      </div>
      <div>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email">
      </div>
      <div>
        <label for="phone">Phone (optional)</label>
        <input type="tel" id="phone" name="phone" autocomplete="tel">
      </div>
      <div>
        <label for="comments">Comments (optional)</label>
        <textarea id="comments" name="comments" rows="4"></textarea>
      </div>
      <div>
        <button class="btn btn--primary" type="submit">Send my info</button>
      </div>
    </form>
  </div>
</section>

<section class="section section--tint" id="reach" aria-labelledby="reach-heading">
  <div class="container">
    <span class="eyebrow">Volunteers, not a call center</span>
    <h2 id="reach-heading">Who to reach</h2>
    <div class="grid grid--3">
      <div class="person">
        <span class="role">Membership &amp; pool party reservations</span>
        <h3>Joel Tarpley</h3>
        <p><a href="tel:+14045787138">(404) 578-7138</a><br><a href="mailto:JTarpley40@yahoo.com">JTarpley40@yahoo.com</a></p>
      </div>
      <div class="person">
        <span class="role">Tennis director</span>
        <h3>Gretchen Hughes</h3>
        <p><a href="tel:+16788608026">678-860-8026</a></p>
      </div>
      <div class="person">
        <span class="role">Treasurer / dues questions</span>
        <h3>Treasurer</h3>
        <p><a href="mailto:wophatreasurer@gmail.com">wophatreasurer@gmail.com</a></p>
      </div>
      <div class="person">
        <span class="role">Board / announcements</span>
        <h3>WOPHA Board</h3>
        <p><a href="mailto:wophalilburn@gmail.com">wophalilburn@gmail.com</a><br>Neighborhood announcements come from this address — add it to your contacts.</p>
      </div>
    </div>
    <div class="setup-note">
      <p>Recommended: create role email addresses (board@wopha.com, treasurer@wopha.com) with free Cloudflare Email Routing and forward them to the current volunteers — contact addresses then survive volunteer turnover without editing this page. Also: send announcement emails with recipients in <strong>BCC</strong> (or via a free newsletter tool) — recent announcements have exposed 200+ resident addresses in open CC.</p>
    </div>
  </div>
</section>

<section class="section" id="report" aria-labelledby="report-heading">
  <div class="container">
    <span class="eyebrow">See something broken?</span>
    <h2 id="report-heading">Report a neighborhood issue</h2>
    <p class="lede">Burned-out court light, gate that won't latch, pool problem, damaged picnic table — tell us and the right volunteer gets on it.</p>
    <form class="form-card form-grid" action="/api/forms/submit" method="POST">
      <input type="hidden" name="form_type" value="issue_report">
      <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <div>
        <label for="issue-where">Where is the problem?</label>
        <select id="issue-where" name="location" required>
          <option value="">Choose a location…</option>
          <option>Pool area</option>
          <option>Tennis / pickleball courts</option>
          <option>Clubhouse or pavilion</option>
          <option>Picnic tables</option>
          <option>Entrance or common grounds</option>
          <option>Somewhere else</option>
        </select>
      </div>
      <div>
        <label for="issue-what">What's wrong?</label>
        <textarea id="issue-what" name="message" rows="4" required placeholder="What you saw, and when"></textarea>
      </div>
      <div>
        <label for="issue-name">Your name (optional)</label>
        <input id="issue-name" name="name" type="text" autocomplete="name">
      </div>
      <div>
        <label for="issue-email">Email (optional — if you'd like an update)</label>
        <input id="issue-email" name="email" type="email" autocomplete="email">
      </div>
      <div>
        <button class="btn btn--primary" type="submit">Send report</button>
      </div>
    </form>
  </div>
</section>

<section class="section section--tint" id="suggestions" aria-labelledby="suggestions-heading">
  <div class="container">
    <span class="eyebrow">Your neighborhood, your ideas</span>
    <h2 id="suggestions-heading">Suggestion box</h2>
    <p class="lede">Tell the board what would make Woods of Parkview better. Every submission is read, goes on the table at the board's next meeting, and ideas that need budget go on the agenda for the annual meeting each January. Name and email are optional — include them only if you'd like a reply.</p>
    <form class="form-card form-grid" action="/api/forms/submit" method="POST">
      <input type="hidden" name="form_type" value="suggestion">
      <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <div>
        <label for="sugg-name">Your name (optional)</label>
        <input type="text" id="sugg-name" name="name" autocomplete="name">
      </div>
      <div>
        <label for="sugg-email">Email (optional — only if you'd like a reply)</label>
        <input type="email" id="sugg-email" name="email" autocomplete="email">
      </div>
      <div>
        <label for="sugg-street">Street (optional)</label>
        <select id="sugg-street" name="street">
          <option value="">Choose a street</option>
          <option>Bowers Brook Drive</option>
          <option>Bowers Brook Court</option>
          <option>Planters Drive</option>
          <option>Planters Court</option>
          <option>Amsterdam Drive</option>
          <option>Amsterdam Court</option>
          <option>Huntshire Lane</option>
        </select>
      </div>
      <div>
        <label for="sugg-text">Suggestion</label>
        <textarea id="sugg-text" name="suggestion" rows="6" required></textarea>
      </div>
      <div>
        <button class="btn btn--primary" type="submit">Send suggestion</button>
      </div>
    </form>
    <div class="card" style="margin-top:1.5rem;max-width:48rem">
      <h3>Prefer to stay anonymous?</h3>
      <p>Use our anonymous Google Form instead. It asks for nothing but your suggestion — no name, no email, no address.</p>
      <!-- PLACEHOLDER: Anonymous Google Form. Create a Google Form with a single suggestion field and no required identity fields, then paste its link below. -->
      <div class="setup-note">
        <p>Create a Google Form with no required identity fields (just a suggestion box) and paste its share link into the button below, replacing the <code>#</code> placeholder.</p>
      </div>
      <p><a class="btn btn--outline" href="#">Open the anonymous form</a></p>
    </div>
  </div>
</section>

<section class="section" id="know" aria-labelledby="know-heading">
  <div class="container">
    <span class="eyebrow">The basics</span>
    <h2 id="know-heading">Good to know</h2>
    <div class="grid grid--3">
      <div class="card">
        <h3>Clubhouse</h3>
        <p>1 Planters Way<br>Lilburn, GA 30047</p>
      </div>
      <div class="card">
        <h3>Trash &amp; recycling</h3>
        <p>Pickup is Thursday mornings (Waste Management).</p>
      </div>
      <div class="card">
        <h3>Schools</h3>
        <p>Arcado Elementary, Trickum Middle, and Parkview High.</p>
      </div>
    </div>
    <h3>Neighborhood map</h3>
    <img src="/assets/img/wop-map.jpg" alt="Street map of the Woods of Parkview subdivision">
  </div>
</section>
```

- [ ] **Step 3: Delete the superseded page sources**

```powershell
git rm src/board.html src/suggestions.html src/contact.html
```

- [ ] **Step 4: Create `src/_redirects`** (Cloudflare Pages format: `source destination status`, one per line; fragments are allowed in destinations)

```
# Old flat URLs → Modern Civic IA. Runs on Cloudflare Pages only —
# GitHub Pages ignores this file, so the restructure lands with the
# wopha.com/Cloudflare cutover (spec §9). /thanks.html did NOT move:
# it is the backend's post-submit 303 target.
/membership.html   /membership/                  301
/pool.html         /amenities/pool/              301
/tennis.html       /amenities/tennis/            301
/swim-team.html    /amenities/swim-team/         301
/community.html    /community/                   301
/board.html        /about/board/                 301
/suggestions.html  /about/contact/#suggestions   301
/contact.html      /about/contact/               301
/index.html        /                             301
```

(Fragment sources like `board.html#arc` can't be server-redirected — fragments never reach the server; browsers re-apply them after the redirect, which is why `/about/board/` carries the "Looking for the paperwork?" cross-link card from Task 6.)

- [ ] **Step 5: Make the build copy `_redirects` to the output root**

In `eleventy.config.js` (created by the tooling plan), add alongside its existing passthrough lines:

```js
eleventyConfig.addPassthroughCopy({ "src/_redirects": "_redirects" });
```

- [ ] **Step 6: Verify + commit**

```powershell
npm run build
Test-Path _site/about/documents/index.html
Test-Path _site/about/contact/index.html
Test-Path _site/_redirects
Test-Path _site/board.html; Test-Path _site/suggestions.html; Test-Path _site/contact.html
```

First three `True`, last three `False`. Then confirm the four form contracts survived intact:

```powershell
Select-String -Path _site/about/documents/index.html, _site/about/contact/index.html -Pattern 'form_type" value="(arc_request|contact_update|issue_report|suggestion)"' | Measure-Object
```

Expected count: 4. And zero duplicate ids on the contact page:

```powershell
(Select-String -Path _site/about/contact/index.html -Pattern 'id="(name|email)"' -AllMatches).Matches.Count
```

Expected: 2 (one `id="name"`, one `id="email"` — the update form only).

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: /about/documents + contact merge + _redirects"
```

---

### Task 8: Community restructure + membership retarget + thanks

**Files:**
- Rewrite: `src/community.html` (three spec sections: Events / Connect / Announcements)
- Modify: `src/membership.html` (front matter + 2 link retargets — content otherwise untouched)
- Rewrite: `src/thanks.html` (restyled, URL pinned)

**Interfaces:**
- Produces: `/community/` with anchors `#events`, `#connect` (plus legacy `#parents` anchor), `#announcements`, `#news-archive` + list `#news-archive-list` (`site.js` renders the announcement archive there); `/membership/` with unchanged anchors `#pay`, `#types`, `#referral`, `#budget`; `/thanks.html` at its exact old URL (backend 303 target).
- Preserved verbatim: the community "never publishes resident info" notice and the membership fraud-awareness notice.

- [ ] **Step 1: Rewrite `src/community.html` in full**

Content is today's page reorganized into the spec's three sections; the "year in WOP" cards, group cards, and notices carry over word-for-word. The old `#parents` id becomes an inner anchor inside `#connect` so pre-redesign deep links keep landing right. The gallery block folds into the Events section. Full file:

```html
---
title: Community & Events — Woods of Parkview HOA
description: "What's happening in Woods of Parkview: neighborhood events and traditions, parent group chats, the private Facebook group, and the opt-in family directory."
pageKey: community
permalink: /community/index.html
---
<section class="hero hero--page">
  <div class="container">
    <span class="eyebrow">Get connected</span>
    <h1>Community &amp; events</h1>
    <p class="lede">Block parties, group chats, and traditions that go back decades. This is where you find out what's happening — and find your people.</p>
  </div>
</section>

<section class="section" id="events" aria-labelledby="events-heading">
  <div class="container">
    <span class="eyebrow">Events &amp; calendar</span>
    <h2 id="events-heading">What's happening</h2>
    <!-- PLACEHOLDER: WOPHA Google Calendar embed goes here. -->
    <div class="setup-note">
      <p>Create a shared WOPHA Google Calendar (free with any Google account), then use its "Integrate calendar" settings to copy the embed <code>&lt;iframe&gt;</code> and paste it here in a responsive wrapper. The calendar updates itself whenever a board member adds an event, and it shows up fine on phones.</p>
    </div>
    <h3>The year in Woods of Parkview</h3>
    <div class="grid grid--2">
      <div class="card">
        <h3>Annual meeting <span style="font-weight:400">· late January</span></h3>
        <p>Held at the Lilburn Municipal Courtroom at Police HQ, 4600 Lawrenceville Hwy. Hear the year's plans, vote, and meet the board. Can't make it? Ask the board for a proxy form — they can even send it by DocuSign.</p>
      </div>
      <div class="card">
        <h3>Pine straw &amp; mulch sale <span style="font-weight:400">· spring &amp; December</span></h3>
        <p>Group-order pine straw and mulch, delivered and spread — a neighborhood tradition and the easiest yard win of the season. Watch for the order form each spring.</p>
      </div>
      <div class="card">
        <h3>Graduation banner <span style="font-weight:400">· submissions due late March</span></h3>
        <p>Every May, a banner at the neighborhood entrance on Rockbridge Road celebrates our graduating seniors. Submit your student's name and school by the spring deadline.</p>
      </div>
      <div class="card">
        <h3>Clean-up day <span style="font-weight:400">· May</span></h3>
        <p>One Saturday morning to spruce up the common areas together — sign up for a specific job through the SignUpGenius link in the spring welcome email.</p>
      </div>
      <div class="card">
        <h3>Opening day ice cream social <span style="font-weight:400">· mid-May</span></h3>
        <p>The pool opens for the season with ice cream for everyone. Drop in any time during the evening.</p>
      </div>
      <div class="card">
        <h3>Summer Fun Series <span style="font-weight:400">· all summer</span></h3>
        <p>Poolside trivia nights, karaoke, and more at the pool throughout the season — a new tradition that started in 2026.</p>
      </div>
      <div class="card">
        <h3>Yard of the Month <span style="font-weight:400">· growing season</span></h3>
        <p>Two winners every month — one on the East side, one on the West — announced through the summer. Winners get the sign and the glory.</p>
      </div>
      <div class="card">
        <h3>Harvest for the Hungry <span style="font-weight:400">· November</span></h3>
        <p>A food drive benefiting Lunches of Love, coordinated by our own Cub Scout Pack 564. Holiday lights follow in December — take an evening drive through and enjoy.</p>
      </div>
    </div>
    <h3 style="margin-top:2rem">Photos</h3>
    <p>Block-party and event photos will live here — check back after the next gathering.</p>
    <!-- PLACEHOLDER: Event photos go here. -->
    <div class="setup-note">
      <p>Drop event photos into <code>src/assets/img/gallery/</code>, then add an <code>&lt;img&gt;</code> for each inside a <code>&lt;div class="gallery"&gt;</code> grid here. Give every photo meaningful alt text (who/what/where), and use <code>&lt;figure class="photo-duotone"&gt;</code> only if the duotone treatment is wanted — event photos may read better unfiltered.</p>
    </div>
    <p><a href="/about/contact/#suggestions">Have an idea for an event? Put it in the suggestion box →</a></p>
  </div>
</section>

<section class="section section--tint" id="connect" aria-labelledby="connect-heading">
  <div class="container">
    <span id="parents"></span>
    <span class="eyebrow">Get connected</span>
    <h2 id="connect-heading">Parents &amp; families</h2>
    <p class="lede">We're making a real push to help parents with kids meet each other — because the neighborhood is better when the kids down the street aren't strangers.</p>
    <div class="grid grid--3">
      <div class="card">
        <h3>Private Facebook group</h3>
        <p>The neighborhood's main channel for news, questions, and chatter. Joining requires confirming your address.</p>
        <p><a href="https://www.facebook.com/Woods-of-Parkview-Homeowners-Association-269242857122/" target="_blank" rel="noopener">Join the Facebook group →</a></p>
      </div>
      <div class="card">
        <h3>Group chats</h3>
        <p>Opt-in GroupMe circles for day-to-day plans: <strong>WOP Parents of Littles</strong>, <strong>Picnic &amp; Pool Meetups</strong>, and <strong>WOP Swim Team Parents</strong>.</p>
        <!-- PLACEHOLDER: GroupMe invite links and QR codes go here. -->
        <div class="setup-note">
          <p>Create the three GroupMe groups (WOP Parents of Littles, Picnic &amp; Pool Meetups, WOP Swim Team Parents), then paste each group's invite link and/or QR code here.</p>
        </div>
      </div>
      <div class="card">
        <h3>Opt-in family directory</h3>
        <p>Share your family's info — kids' ages, street, contact — with other opted-in WOP families via a short Google Form. The resulting list is shared only with families who opted in.</p>
        <!-- PLACEHOLDER: Google Form link for the opt-in family directory goes here. -->
        <div class="setup-note">
          <p>Create a Google Form (kids' ages, street, contact info) feeding a private Google Sheet, then link the form here. Share the resulting sheet only with families who opted in.</p>
        </div>
      </div>
    </div>
    <div class="notice">
      <p>The HOA never publishes resident information publicly.</p>
    </div>
  </div>
</section>

<section class="section" id="announcements" aria-labelledby="announce-heading">
  <div class="container">
    <span class="eyebrow">Stay in the loop</span>
    <h2 id="announce-heading">Neighborhood announcements</h2>
    <div class="grid grid--2">
      <div class="card">
        <h3>The email list</h3>
        <p>Board announcements — pool openings and closures, meeting notices, event reminders — go out by email from <strong>wophalilburn@gmail.com</strong>. Add it to your contacts so nothing lands in spam, and <a href="/about/contact/#update">update your info</a> to make sure you're on the list.</p>
      </div>
      <div class="card">
        <h3>Lost pets, found things, free stuff</h3>
        <p>Missing cat? Package delivered to the wrong porch? Giving away a wheelbarrow? Post it in the <a href="https://www.facebook.com/Woods-of-Parkview-Homeowners-Association-269242857122/" target="_blank" rel="noopener">Facebook group</a> where neighbors see it fastest, or email <a href="mailto:wophalilburn@gmail.com">wophalilburn@gmail.com</a> and the board can pass it along.</p>
      </div>
    </div>
  </div>
</section>

<section class="section section--tint" id="news-archive" hidden aria-labelledby="news-archive-heading">
  <div class="container">
    <span class="eyebrow">Latest from the board</span>
    <h2 id="news-archive-heading">Announcements from the board</h2>
    <div class="grid grid--3" id="news-archive-list"></div>
  </div>
</section>
```

- [ ] **Step 2: Retarget `src/membership.html`**

Replace its front-matter block with:

```yaml
---
title: Membership & Dues — Woods of Parkview HOA
description: Pay your 2026 Woods of Parkview HOA dues ($535), learn about Full, Social, and Non-Resident memberships, and earn $50 for referring a new member.
pageKey: membership
permalink: /membership/index.html
---
```

Then exactly two link edits (nothing else on the page changes — the fraud-awareness notice, setup-notes, Stripe placeholder buttons, and all section ids stay byte-identical):

- `href="tennis.html"` → `href="/amenities/tennis/"` (the "Tennis fees and court reservations →" link)
- `href="contact.html"` → `href="/about/contact/#update"` (the "Send us your contact info" action card)

Verify the notice is untouched:

```powershell
git diff -- src/membership.html | Select-String 'Know what a real WOPHA invoice'
```

Expected: no output (the notice line appears in no diff hunk).

- [ ] **Step 3: Rewrite `src/thanks.html`**

Its URL must stay exactly `/thanks.html` — `functions/api/forms/submit.js` 303s there and the backend is out of scope. It keeps `noindex` and stays chrome-less (no nav needed on a confirmation page), so it bypasses the layout. Full file:

```html
---
permalink: thanks.html
layout: false
---
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Got it — Woods of Parkview</title>
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">Thank you</span>
      <h1>Got it.</h1>
      <p class="lede">Your message is in the board's queue — a volunteer will see it in the board portal, and the board also gets an email copy. If you left an email address, you'll hear back there.</p>
      <p><a class="btn btn--primary" href="/">Back to the site</a></p>
    </div>
  </main>
</body>
</html>
```

(If the tooling plan applies the layout via a directory data file rather than per-page front matter, `layout: false` still overrides it — that is standard Eleventy data-cascade behavior.)

- [ ] **Step 4: Verify + commit**

```powershell
npm run build
Test-Path _site/community/index.html; Test-Path _site/membership/index.html; Test-Path _site/thanks.html
Select-String -Path _site/community/index.html -Pattern 'never publishes resident information publicly'
Select-String -Path _site/membership/index.html -Pattern 'Know what a real WOPHA invoice looks like'
Select-String -Path _site/community/index.html -Pattern 'id="news-archive-list"'
```

All `True` / all three Select-Strings match. `npm run dev`: `/community/` shows the three nav-linked sections in order; `/membership/` renders with `#pay` reachable from the header Pay-dues button.

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: community sections + membership/thanks retarget"
```

---

### Task 9: Behavior wiring — `site.js` URL targets, `sw.js` precache, manifest

**Files:**
- Modify: `src/assets/js/site.js` (service-worker registration path + seasonal CTA URLs — logic unchanged)
- Rewrite: `src/sw.js` (new precache list, cache bump — passthrough-copied to `/sw.js`)
- Modify: `src/site.webmanifest` (absolute scope/start_url — passthrough-copied to `/site.webmanifest`)

**Interfaces:**
- Consumes: the final URL map from Tasks 4–8.
- Produces: a PWA that installs and precaches the new URLs. The announcements/content fetch IIFEs in `site.js` are **not touched** — their element IDs were preserved by Tasks 4, 5, 8.

- [ ] **Step 1: Root-absolute the service-worker registration in `src/assets/js/site.js`**

Pages now live in subdirectories; a relative `"sw.js"` would resolve to `/amenities/pool/sw.js` (404) and scope the worker wrongly. Change the first lines of the file from:

```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
```

to:

```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

- [ ] **Step 2: Retarget the seasonal hero CTA (logic verbatim, URLs updated)**

Replace the seasonal-CTA IIFE with (only the two `href` strings and one comment word differ from today):

```js
// Seasonal hero button: dues season (Jan-Apr, invoices due Mar 31) shows the
// default "Pay your dues"; pool season and meeting season swap it out.
(function () {
  var cta = document.getElementById("hero-cta");
  if (!cta) return;
  var m = new Date().getMonth(); // 0 = January
  if (m >= 4 && m <= 8) {
    cta.textContent = "Pool hours & booking";
    cta.href = "/amenities/pool/";
  } else if (m >= 9) {
    cta.textContent = "Annual meeting & minutes";
    cta.href = "/about/documents/#minutes";
  }
})();
```

- [ ] **Step 3: Rewrite `src/sw.js`**

New precache list (root-absolute, directory URLs match how navigations request them), fonts added, cache name bumped so old flat-URL caches purge on activate. Full file:

```js
// Woods of Parkview — service worker.
// Network-first so updates always show when online; cache fallback offline.
// Bump the cache name when shipping big changes.
var CACHE = "wopha-v3";

var CORE = [
  "/",
  "/membership/",
  "/amenities/",
  "/amenities/pool/",
  "/amenities/tennis/",
  "/amenities/swim-team/",
  "/community/",
  "/about/",
  "/about/board/",
  "/about/documents/",
  "/about/contact/",
  "/thanks.html",
  "/assets/css/styles.css",
  "/assets/js/site.js",
  "/assets/img/wop-map.jpg",
  "/assets/img/icon-192.png",
  "/assets/fonts/fraunces-latin-500-normal.woff2",
  "/assets/fonts/fraunces-latin-600-normal.woff2",
  "/assets/fonts/public-sans-latin-400-normal.woff2",
  "/assets/fonts/public-sans-latin-600-normal.woff2",
  "/assets/fonts/public-sans-latin-700-normal.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  // API responses must always be live (or fail cleanly); portal pages are
  // login-gated and must never land in a shared cache.
  var path = new URL(e.request.url).pathname;
  if (path.indexOf("/api/") === 0 || path.indexOf("/portal/") === 0) return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r.ok && e.request.url.indexOf(self.location.origin) === 0) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});
```

(If `addAll` hits a 404 the install fails silently and the OLD worker keeps serving — that's why this rewrite happens only now, after every URL in CORE exists.)

- [ ] **Step 4: Normalize `src/site.webmanifest`**

Change `"start_url": "./"` → `"start_url": "/"` and `"scope": "./"` → `"scope": "/"`. `theme_color`/`background_color` stay `#1f3d2b` (Pine is unchanged). Everything else stays.

- [ ] **Step 5: Verify the PWA end-to-end**

```powershell
npm run build
Test-Path _site/sw.js; Test-Path _site/site.webmanifest
```

Both `True` — the tooling plan's `eleventy.config.js` passthrough copies `src/sw.js` → `/sw.js` and `src/site.webmanifest` → `/site.webmanifest`; if either is `False`, fix that passthrough entry there. Then `npm run dev`, open `http://localhost:8200/` in Edge/Chrome, DevTools → Application → Service Workers: `wopha-v3` installs with no red "install failed" state; Application → Cache Storage → `wopha-v3` lists 21 entries. Navigate to `/amenities/pool/` and confirm the page's console has no SW registration error.

- [ ] **Step 6: Gates + commit**

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: PWA + JS wiring for new URLs (sw precache, seasonal CTA)"
```

---

### Task 10: Accessibility verification pass (WCAG 2.2 AA, spec §8)

**Files:**
- Modify: none expected — this is a verification task; fix in place anything it catches.

**Interfaces:**
- Consumes: everything built in Tasks 1–9.

- [ ] **Step 1: Contrast audit against the table at the top of this plan**

Grep the stylesheet for raw hexes and confirm each text/background pairing appears in the "Verified contrast reference" table with an AA verdict:

```powershell
Select-String -Path src/assets/css/styles.css -Pattern '#[0-9a-fA-F]{3,6}' -AllMatches
```

Specifically re-confirm in the browser (DevTools color picker shows the ratio):
- `.eyebrow` on a `.section--tint` background → `#9C4623` on `#EDE7D6` = 5.13:1 ✔
- `.btn--primary` label → white on `#0E6E7A` = 5.95:1 ✔; hover white on `#0A525B` = 8.86:1 ✔
- `.board-panel strong` → `#F0C98F` on `#2E5940` = 5.14:1 ✔
- desktop `.nav-menu a` → `#1E2A22` on `#FFFFFF` = 14.90:1 ✔; hover on `#EDE7D6` = 12.06:1 ✔
- links inside tint sections → `#0A525B` on `#EDE7D6` (darker than the 4.82:1 measured for `#0E6E7A`) ✔
- If ANY clay `#B4552D` is found used as a text color, replace it with `var(--clay-deep)` — `#B4552D` is decorative-only.

- [ ] **Step 2: Disclosure-menu keyboard + screen-reader semantics**

With `npm run dev` on 8200, on `/` at desktop width, verify the full APG disclosure contract (this repeats Task 3 Step 5 deliberately — now against final pages):

1. Every `.nav-disclosure` is a real `<button>` with `aria-expanded` toggling `false`/`true` and `aria-controls` pointing at its menu's id (inspect in DevTools).
2. `Esc` inside an open menu closes it AND returns focus to its button.
3. `ArrowDown` on a closed button opens + focuses the first item; `ArrowUp` from the first item closes + refocuses the button; `Home`/`End` jump.
4. Only one menu open at a time; click-outside closes; tabbing past the last item closes.
5. Windows Narrator (Win+Ctrl+Enter) or NVDA if installed: the button announces "Amenities, button, collapsed/expanded"; menu items announce as links; the current page's link announces "current page".
6. Mobile width: the `Menu` toggle still announces expanded/collapsed; the drawer is a single column; every group accordion works by keyboard.

- [ ] **Step 3: Target sizes (≥44px)**

In DevTools, hover-inspect and confirm computed height ≥44px for: header `Pay dues` button, `Menu` toggle, every `.nav-link`/`.nav-disclosure`/`.nav-menu a`, every `.btn`, every form `input`/`select`, `.action-links a`, `details.rule summary`. All have `min-height: 44px` in CSS — this step confirms nothing overrides it.

- [ ] **Step 4: Alt text and decorative-graphics rules**

```powershell
Get-ChildItem src -Recurse -Include *.html, *.njk | Select-String -Pattern '<img(?![^>]*alt=)'
Get-ChildItem src -Recurse -Include *.html, *.njk | Select-String -Pattern 'photo-placeholder(?![^>]*aria-hidden)'
Get-ChildItem src -Recurse -Include *.html, *.njk | Select-String -Pattern '<svg(?![^>]*aria-hidden)'
```

Expected: no matches for any of the three. Rules going forward (also stated in the pool-page photo comment): real photography gets meaningful alt (who/what/where — e.g. "Swimmers in the six-lane pool on a summer afternoon", never "pool photo"); `.photo-placeholder` divs and `.photo-strip` wrappers are `aria-hidden="true"`; all inline icon SVGs (`.card-icon`, `.chev`, brand tree) carry `aria-hidden="true"`. The **pine-ridge line is decorative** — its svg (in `pine-ridge.njk`) and its wrapper divs are `aria-hidden="true"`, so the fern-on-Paper (and fern-on-Pine footer mark) stroke has **no contrast requirement**; the svg grep above covers the partial too.

- [ ] **Step 5: Structure checks**

- Skip link: first focusable element on every page, lands on `#main` (`base.njk` — unchanged by this plan; confirm once in the browser).
- `aria-current="page"` renders on exactly one nav element per page (spot-check `/membership/`, `/amenities/pool/`, `/about/contact/`).
- Every `<section>` keeps its `aria-labelledby` pairing: `Get-ChildItem src -Recurse -Include *.html | Select-String -Pattern '<section(?![^>]*aria-labelledby)'` — expect matches only for the hero sections (heroes are labeled by their `h1` implicitly; adding `aria-labelledby` to them is optional polish, not a failure).
- `prefers-reduced-motion` global kill-switch still present in `src/assets/css/styles.css` (one grep).
- Tables keep `scope="col"` headers (pool hours, party fees, ALTA, minutes — carried verbatim; grep `scope="col"` in `_site/amenities/pool/index.html` → ≥2 matches).

- [ ] **Step 6: Commit (only if fixes were needed)**

```powershell
npm test; npm run lint
git add -A
git commit -m "redesign: accessibility pass (contrast, keyboard, targets)"
```

---

### Task 11: Verification tooling — link check, redirects validation, screenshot sweep

**Files:**
- Create: `tools/check-links.mjs`, `tools/check-redirects.mjs`, `tools/screenshot-pages.mjs`
- Modify: `.gitignore` (add `shots/`)

**Interfaces:**
- Consumes: the complete `_site/` build.
- Produces: repeatable verification commands for this and future content changes.

- [ ] **Step 1: Create `tools/check-links.mjs`**

```js
// Static link checker for the built site: every internal href/src must
// resolve to a file in _site (directory URLs resolve via index.html).
// Skips external/mailto/tel and the runtime-only /api/ + /portal/ paths.
// /documents/ misses are warnings, not failures — gathering the minutes
// PDFs is a board content task (see the setup-note on /about/documents/).
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";

const ROOT = resolve(process.argv[2] || "_site");
const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".html")) htmlFiles.push(p);
  }
})(ROOT);

let bad = 0;
let warn = 0;
const attr = /(?:href|src)="([^"#]+)(?:#[^"]*)?"/g;
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const [, url] of html.matchAll(attr)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    if (/^\/(api|portal)\//.test(url)) continue;
    const target = url.startsWith("/") ? join(ROOT, url) : join(dirname(file), url);
    const ok = [target, join(target, "index.html")].some((c) => existsSync(c));
    if (!ok) {
      const where = file.slice(ROOT.length + 1);
      if (url.startsWith("/documents/")) {
        warn++;
        console.log(`WARN (board content task)  ${url}  (in ${where})`);
      } else {
        bad++;
        console.log(`MISSING  ${url}  (in ${where})`);
      }
    }
  }
}
console.log(`\n${htmlFiles.length} pages scanned; ${bad} broken, ${warn} pending-content warnings.`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 2: Create `tools/check-redirects.mjs`**

```js
// Validates _site/_redirects: Cloudflare Pages syntax ("source dest [status]",
// source starts with /, status in 200/301/302/303/307/308) and that every
// internal destination exists in the build.
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.argv[2] || "_site");
const lines = readFileSync(join(ROOT, "_redirects"), "utf8").split(/\r?\n/);
let bad = 0;
let rules = 0;
lines.forEach((line, i) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  rules++;
  const parts = t.split(/\s+/);
  if (parts.length < 2 || parts.length > 3) {
    bad++; console.log(`line ${i + 1}: expected "source destination [status]"`); return;
  }
  const [src, dest, status = "302"] = parts;
  if (!src.startsWith("/")) { bad++; console.log(`line ${i + 1}: source must start with /`); }
  if (!/^(200|30[12378])$/.test(status)) { bad++; console.log(`line ${i + 1}: bad status ${status}`); }
  const destPath = dest.replace(/#.*$/, "");
  if (destPath.startsWith("/")) {
    const ok = [join(ROOT, destPath), join(ROOT, destPath, "index.html")].some(existsSync);
    if (!ok) { bad++; console.log(`line ${i + 1}: destination ${destPath} not found in _site`); }
  }
});
console.log(bad ? `${bad} problem(s) in ${rules} rules` : `_redirects OK — ${rules} rules, all destinations exist`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 3: Create `tools/screenshot-pages.mjs`**

No screenshot approach is documented in `docs/` yet — this script becomes it. **Machine quirk:** headless Edge here reports a 1.26× DPI-scaled viewport, so `--window-size` alone produces clipped/mis-scaled captures. The workaround: render each page inside a fixed-width `<iframe>` in a wrapper file and oversize the outer window — the iframe, not the window, controls layout width.

```js
// Screenshot every page at 375px and 1280px via headless Edge.
// Wraps each page in a fixed-width iframe because this machine's headless
// Edge applies a 1.26x DPI scale to the outer window (see plan Task 11).
// Prereq: a static server on port 8201 (see the run step below).
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = "http://127.0.0.1:8201";
const OUT = resolve("shots");
const PAGES = [
  "/", "/membership/", "/amenities/", "/amenities/pool/", "/amenities/tennis/",
  "/amenities/swim-team/", "/community/", "/about/", "/about/board/",
  "/about/documents/", "/about/contact/", "/thanks.html",
];

mkdirSync(OUT, { recursive: true });
for (const page of PAGES) {
  for (const width of [375, 1280]) {
    const name = page === "/" ? "home" : page.replace(/^\/|\/$/g, "").replace(/[/.]/g, "-");
    const wrapper = join(OUT, `_wrap-${name}-${width}.html`);
    writeFileSync(wrapper, [
      "<!doctype html><meta charset=\"utf-8\"><body style=\"margin:0\">",
      `<iframe src="${BASE}${page}" style="width:${width}px;height:2400px;border:0"></iframe>`,
    ].join("\n"));
    execFileSync(EDGE, [
      "--headless=new",
      "--disable-gpu",
      "--force-device-scale-factor=1",
      `--window-size=${width + 100},2500`,
      `--screenshot=${join(OUT, `${name}-${width}.png`)}`,
      wrapper,
    ], { stdio: "ignore" });
    console.log(`${name}-${width}.png`);
  }
}
console.log(`\nDone -> ${OUT}`);
```

Add `shots/` on its own line to `.gitignore`.

Do **not** touch `eslint.config.mjs` for these scripts — the tooling plan's eslint config already carries a block covering `tools/**/*.mjs` (module sourceType, `console`/`process` globals), so `npm run lint` passes over them as-is.

- [ ] **Step 4: Run the checks**

```powershell
npm run build
node tools/check-links.mjs _site
node tools/check-redirects.mjs _site
```

Expected: link checker exits 0 with `0 broken` (the 9 `/documents/minutes/*.pdf` + 2 covenants/bylaws links may appear as WARN lines if the PDFs are not yet gathered — those are the board's content task, not a plan failure). Redirects checker prints `_redirects OK — 9 rules, all destinations exist`.

- [ ] **Step 5: Screenshot sweep at 375px and 1280px**

Terminal 1 (port 8201 is inside the safe window):

```powershell
python -m http.server 8201 --directory _site
```

Terminal 2:

```powershell
node tools/screenshot-pages.mjs
```

Expected: 24 PNGs in `shots/`. Review every one against this checklist:

| Check | Where to look |
|---|---|
| Flat pine hero, zero jagged *filled* canopy edges (before→after: jagged filled polygon → flat color block + pine-ridge baseline rule) | every page, both widths |
| Pine-ridge line: fine 1px fern treeline under the home hero, as the pre-footer divider, and as the small 160px footer mark — crisp stroke (non-scaling), never a filled silhouette, nowhere else | home hero + any page footer, 375 and 1280 |
| Fraunces only on h1/h2; h3, nav, buttons, labels all Public Sans | any page — compare letterforms |
| Header shows 4 groups + Pay dues at 1280; brand + Pay dues + Menu at 375 | all pages |
| 3 primary action cards w/ green line icons + 3 text links, panel beside/below | home |
| Season panel: solid dividers, gold Fraunces values on canopy | home, amenities |
| Cards: 1px hairline + soft shadow, no colored top bar | home, amenities, about |
| Status lines on the three amenity cards | amenities |
| Forms sit inside white `.form-card` containers, labels above fields | about/contact (×3 forms), about/documents (ARC) |
| Fraud notice present and readable | membership |
| "never publishes resident info" notice present | community |
| Compact single-card PWA banner (not a two-card section) | home |
| Green gradient photo placeholders (no broken-image icons, no clip-art) | home comment slot, about, amenities/pool |
| Tint sections read as Sand, page background as Paper (cooler than the old cream) | any two adjacent sections |
| No horizontal scrollbar at 375px | all 375 shots |

- [ ] **Step 6: Full gates + final commit**

```powershell
npm run build; npm test; npm run lint
node tools/check-links.mjs _site; node tools/check-redirects.mjs _site
git add -A
git commit -m "redesign: verification tooling (link check, redirects check, screenshots)"
```

All green = the public-site track is complete. Hand off to the portal redesign plan, which builds on the Task 1 tokens.

---

## Spec-coverage self-review (for the executing agent's reviewer)

| Spec requirement | Task |
|---|---|
| §2 token set + 75rem container + 4/8px scale | 1 |
| §2 Fraunces 500–600 h1/h2 only, Public Sans everywhere else, self-hosted, tabular-nums discipline | 1, 2 |
| §2 pine-ridge signature line (one partial, exactly three placements) | 2 (partial+CSS), 3 (pre-footer+mark), 4 (hero baseline) |
| §2 retire canopy SVG; flat pine heroes; duotone photo treatment; placeholder-not-clip-art | 2 |
| §2 cards hairline+shadow+icon; buttons r8/darken/44px; stat rows; motion 150ms hover only | 2 |
| §3 five-group nav + persistent Pay dues; accessible disclosure menus; mobile accordion | 3 |
| §3 homepage items 1–9 | 4 (+3 header, footer) |
| §3 page mapping: /amenities overview + 3 moves | 5 |
| §3 board split (people / documents+ARC), suggestions→contact merge | 6, 7 |
| §3 `_redirects` for every retired URL | 7 |
| §3 community sections; membership top-level; thanks kept | 8 |
| §3 form contracts + fraud + resident-info notices verbatim | 7, 8 (+ global constraint) |
| PWA precache/manifest updated for moved paths; announcements IDs kept | 9 |
| §8 contrast (with measured ratios), keyboard/SR disclosure, alt rules, 44px, skip/aria-current | 10 (numbers at plan top) |
| §9 risks: dropdown a11y (10), URL moves (7+11), redirects only on CF (noted in `_redirects` header) | — |
| Verification: build green, link check, redirects syntax, 375/1280 screenshots w/ iframe DPI workaround | 11 |

**Known deviations from spec (intentional, documented):** `--clay-deep` companion token added because Clay fails AA on Sand (contrast table); mint `#A8D5C2` used for the nav current-page indicator because Poolwater is 2.0:1 on Pine; `/thanks.html` keeps its extension because the form handler 303s to it (form contract is frozen); `board.html#arc`/`#minutes` fragment bookmarks land on `/about/board/` (fragments can't be server-redirected) and are caught by that page's cross-link card.





