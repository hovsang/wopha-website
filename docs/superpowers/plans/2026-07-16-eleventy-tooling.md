# Eleventy Tooling Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce an Eleventy (11ty) build that assembles today's 15 HTML pages (9 public + thanks.html + 5 portal) from shared partials, with **byte-equivalent output**, so the later restyle tracks edit one partial instead of 10 duplicated files. No visual, nav, URL, or backend change of any kind.

**Architecture:** Page sources move to `src/` and are rendered by plain Eleventy (Nunjucks, zero plugins) into `_site/`, which becomes wrangler's `pages_build_output_dir`; `functions/` stays at the repo root and is picked up by `wrangler pages dev` from the cwd exactly as today. The 9 public pages share one layout (`src/_includes/base.njk`) plus `site-header.njk`/`site-footer.njk` partials keyed by a front-matter `pageKey`; the 5 portal pages keep their own structure and pull their identical chrome (head + eyebrow + h1 + nav + error div) from a `portal-shell.njk` include that the later portal-redesign plan will replace. **All static files (assets/, documents/, site.webmanifest, sw.js, portal/portal.js) move INTO `src/` and are passthrough-copied** — one rule ("everything under `src/` is the website; everything at root is tooling/backend"), and built URL paths (`/assets/...`, `/documents/...`, `/sw.js`, `/site.webmanifest`) are unchanged.

**Tech Stack:** Eleventy 3.x (`@11ty/eleventy`, the ONE new devDependency, no plugins), Nunjucks templates in `.html` page files, wrangler (unchanged), vitest (unchanged), eslint flat config (path updates only), Node built-ins for the equivalence checker.

**Spec:** `docs/superpowers/specs/2026-07-16-modern-civic-redesign-design.md` §7 (build & tooling), §9 (11ty bus-factor risk → plain partials only, no plugins, 3 commands in README), §10 step 2 (byte-identical output check).

## Global Constraints

- **Local-only branches:** work on `redesign-experiment`. NEVER push `master` or `redesign-experiment`. NEVER let `docs/board-proposal*.md` or `docs/superpowers/` reach the public `deploy` branch.
- **THE ACCEPTANCE BAR — byte equivalence:** from Task 4 onward, `npm run check` (build + `tools/check-equivalence.mjs`) must exit 0. Normalization is exactly ONE rule: CRLF → LF on both sides of the page comparison (git `core.autocrlf=true` means checked-out originals are CRLF while files written during migration may be LF). Nothing else — no whitespace collapsing, no trailing-newline forgiveness. Passthrough static files are compared raw, byte for byte. If a diff is "only whitespace", fix the template — NEVER widen the normalization or edit the baseline.
- **No 11ty plugins** (spec §9). Also no custom filters, no shortcodes, no template inheritance (`{% extends %}`) — only front matter, one layout, and `{% include %}` / inline `{% if %}`. If something seems to need more, restructure the partial instead.
- **Existing vitest suite stays green:** `npm test` → all tests pass (28 if this plan runs before the backend-seam plan, 74 after it — the two tracks are order-independent; the invariant is the same count as the previous gate, all green). Do not touch `tests/`, `functions/`, `workers/`, `schema.sql`, `seed.sql`.
- **`npm run lint` stays clean.** `eslint.config.mjs` changes are limited to: path updates for moved files, `_site/**` ignore, one new block covering the build tooling files.
- **Dev ports 8200-8202 only.** This machine reserves most of the 8000-8999 range for Hyper-V (binding 8788/8080 aborts workerd with `std::terminate`). wrangler dev = 8200, ad-hoc static server = 8201, spare = 8202. Never run bare `eleventy --serve` (defaults to reserved 8080).
- **Built URL paths unchanged:** `/index.html`, `/pool.html`, …, `/thanks.html`, `/portal/index.html`, …, `/assets/**`, `/documents/**`, `/sw.js`, `/site.webmanifest`. URL/IA restructuring (`/amenities/pool` etc.) belongs to the later public-site plan, not this one.
- **Form contracts untouched:** every `action="/api/forms/submit"` + hidden `form_type` field stays byte-identical inside the page bodies (they live in the migrated content, which is copied verbatim — the equivalence check enforces this).
- **No restyling, no nav changes, no content edits.** The one known chrome inconsistency (only `index.html`'s footer has the "Board portal" link) is REPRODUCED, not fixed — flagged for the public-site plan.
- Commit at the end of every task with the message given. All commands run from the repo root. Steps that use heredocs/`sed` must run in **Git Bash** (not PowerShell).
- Nunjucks note: do NOT add `{# comment #}` lines to partials — the newline after the comment tag is emitted and breaks byte equivalence. Guidance lives in this plan and the README instead.

## Verified page-difference inventory (drives the partial design)

Measured against the working tree at plan time (branch `redesign-experiment`, clean at `4c3b63a`):

- **Public pages (9):** the chrome (everything outside `<main id="main">…</main>`) is byte-identical across all 9 pages EXCEPT: (a) `<title>` and `<meta name="description">` per page; (b) the `aria-current="page"` attribute sits on that page's own nav `<li>`; (c) **only `index.html`** has `<li><a href="portal/index.html">Board portal</a></li>` in the footer "Do it online" list. `theme-color` is `#1f3d2b` on all pages; there is no canonical link anywhere today.
- **thanks.html:** standalone — lowercase `<!doctype html>`, `noindex`, no fonts/manifest/icons, no header/nav/footer. Migrates verbatim with NO layout.
- **Portal pages (5):** lines 1-24 (doctype through `<div id="error" class="portal-error"></div>`) are byte-identical except `<title>` (line 7) and `<h1>` (line 15). Note `ledger.html` has title `Ledger` but h1 `Dues ledger`. Everything from line 25 to EOF is page-specific (content + inline script) and is kept verbatim in the page source. The portal nav has NO active-page marking today — reproduce exactly.
- No page contains `{{`, `{%`, or `{#`, so Nunjucks processing of the verbatim bodies is a no-op.
- Repo is `core.autocrlf=true`: git stores LF, working tree is CRLF. Hence the CRLF→LF normalization rule.
- `docs/dev*.md` does not exist; the dev workflow lives in `README.md` (updated in Task 5). Test count is 28 (spec §10 says "27-test suite" — minor spec drift, 28 is current reality).
- **Dry-run verified at plan time** (scratchpad, Eleventy 3.1.6, zero project changes): the exact `base.njk`/`site-header.njk`/`site-footer.njk`/`portal-shell.njk` contents and assembly commands in this plan were built against the real repo files — `index.html` (footer WITH portal link), `membership.html` (footer WITHOUT), `thanks.html` (verbatim, no layout), and `portal/ledger.html` (title ≠ h1) all came out **byte-equivalent** after CRLF→LF normalization, and the computed permalink produced flat `*.html` outputs. The templates are known-good as written; any execution-time `DIFFERS` means a transcription error, not a design problem.

## Interface contract (later plans consume these EXACT names — do not rename)

- **Layout:** `src/_includes/base.njk` — front matter vars: `title` (required), `description` (required), `pageKey` (required; drives nav active state), `bodyClass` (optional), plus optional `themeColor` (defaults `#1f3d2b`) and `canonical` (emitted only when set).
- **Partials:** `src/_includes/site-header.njk`, `src/_includes/site-footer.njk`, `src/_includes/portal-shell.njk` (portal chrome; consumes front matter `title` + `heading`).
- **Source layout:** `src/<page>.html`, `src/portal/<page>.html`, `src/assets/**` + `src/documents/**` + `src/site.webmanifest` + `src/sw.js` + `src/portal/portal.js` (passthrough). Assets live INSIDE `src/` (decision recorded in Architecture above); built URLs stay `/assets/...` etc.
- **Build output:** `_site/` (gitignored). **Commands:** `npm run build`, `npm run dev` (plus `npm run watch`, `npm run check`).
- Front-matter title/description values are copied **verbatim from the original HTML, entities included** (e.g. `Membership &amp; Dues`), always double-quoted YAML, and rendered with `| safe`. This is what makes the head byte-identical.

## File structure after migration

```
eleventy.config.js                 11ty config (input src/, output _site/, passthrough)
src/
  src.11tydata.js                  keeps today's flat *.html URLs (computed permalink)
  _includes/
    base.njk                       public-page layout (head + body skeleton)
    site-header.njk                public header + nav (aria-current via pageKey)
    site-footer.njk                public footer (portal link only when pageKey == home)
    portal-shell.njk               portal chrome lines 1-24 (title/heading templated)
  index.html … contact.html        9 public pages: front matter + <main> body verbatim
  thanks.html                      verbatim, no layout
  portal/
    index.html … content.html      5 portal pages: front matter + include + body verbatim
    portal.js                      passthrough (moved)
  assets/**                        passthrough (moved)
  documents/**                     passthrough (moved)
  site.webmanifest                 passthrough (moved)
  sw.js                            passthrough (moved)
tools/
  check-equivalence.mjs            the acceptance gate
  equivalence-baseline/            pre-migration snapshots of all 15 pages
_site/                             build output (gitignored)
functions/  workers/  tests/       UNCHANGED, stay at repo root
schema.sql  seed.sql  wrangler.toml (output dir only)  package.json  eslint.config.mjs
```

Suggested-order deviation, recorded: the orchestrator's outline put npm-scripts/wrangler/gitignore wiring after all page migrations, but moving `assets/` immediately breaks the current `wrangler pages dev . --port 8200`, so the wiring lands in Task 2 with the first migrated page to keep every task shippable. Between Tasks 2 and 4 the dev server serves only already-migrated pages; the equivalence checker tracks the remainder.

---

### Task 1: Pre-migration baseline + equivalence checker (TDD)

**Files:**
- Create: `tools/check-equivalence.mjs`
- Create: `tools/equivalence-baseline/` (snapshot copies of all 15 pages, committed)

**Interfaces:**
- Produces: `node tools/check-equivalence.mjs` — exit 0 ⇔ `_site/` is byte-equivalent (pages, CRLF→LF-normalized) and byte-identical (passthrough), with no unexpected files. Consumed by every later task's verify step and by `npm run check` (wired in Task 2). Also produces the frozen baseline that defines "equivalent".

- [ ] **Step 1: Write the checker first (red)** — create `tools/check-equivalence.mjs` with exactly this content:

```js
// tools/check-equivalence.mjs — acceptance gate for the 11ty migration
// (docs/superpowers/plans/2026-07-16-eleventy-tooling.md).
//
// Compares:
//   1. every page snapshot under tools/equivalence-baseline/ against the
//      built file at the same path under _site/. The ONLY normalization is
//      CRLF -> LF on both sides (git core.autocrlf=true: originals check
//      out CRLF, files written during the migration may be LF). No other
//      whitespace forgiveness — fix templates, never widen this rule.
//   2. every passthrough static file under src/ against its copy in _site/
//      — raw bytes, zero normalization.
//   3. the _site/ inventory against the expected set — extra files fail.
//
// Usage: npm run check   (or: npm run build && node tools/check-equivalence.mjs)
// Exit 0 = equivalent. Non-zero = not equivalent yet.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASELINE = "tools/equivalence-baseline";
const OUT = "_site";
const SRC = "src";

// Passthrough roots (walked recursively) and single files, relative to src/.
// Output lands at the same path under _site/.
const COPY_DIRS = ["assets", "documents"];
const COPY_FILES = ["portal/portal.js", "site.webmanifest", "sw.js"];

function walk(root, dir = "") {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(root, rel));
    else out.push(rel);
  }
  return out;
}

const lf = (buf) => buf.toString("utf8").split("\r\n").join("\n");

function firstDiff(a, b) {
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) {
      return `    first difference at line ${i + 1}\n    baseline: ${JSON.stringify(al[i])}\n    built:    ${JSON.stringify(bl[i])}`;
    }
  }
  return "    (no differing line found — check trailing bytes)";
}

let bad = 0;
const fail = (msg) => { bad += 1; console.error(msg); };

// 1. Pages: baseline vs built, CRLF->LF normalized.
const pages = walk(BASELINE).sort();
if (pages.length === 0) fail(`NO BASELINE — expected page snapshots in ${BASELINE}/`);
for (const rel of pages) {
  const built = join(OUT, rel);
  if (!existsSync(built)) { fail(`MISSING  ${rel}`); continue; }
  const a = lf(readFileSync(join(BASELINE, rel)));
  const b = lf(readFileSync(built));
  if (a === b) console.log(`ok       ${rel}`);
  else fail(`DIFFERS  ${rel}\n${firstDiff(a, b)}`);
}

// 2. Passthrough: src vs built, raw bytes.
const copies = [
  ...COPY_DIRS.flatMap((d) => walk(join(SRC, d)).map((rel) => `${d}/${rel}`)),
  ...COPY_FILES,
].sort();
for (const rel of copies) {
  const src = join(SRC, rel);
  const built = join(OUT, rel);
  if (!existsSync(src)) { fail(`NO SOURCE  src/${rel}`); continue; }
  if (!existsSync(built)) { fail(`MISSING  ${rel} (passthrough)`); continue; }
  if (readFileSync(src).equals(readFileSync(built))) console.log(`ok copy  ${rel}`);
  else fail(`DIFFERS  ${rel} (passthrough must be byte-identical)`);
}

// 3. Inventory: nothing unexpected in _site/.
if (existsSync(OUT)) {
  const expected = new Set([...pages, ...copies]);
  for (const rel of walk(OUT).sort()) {
    if (!expected.has(rel)) fail(`UNEXPECTED  ${rel} (not a known page or passthrough file)`);
  }
}

if (bad) {
  console.error(`\nFAIL: ${bad} problem(s) — _site/ is not equivalent to the pre-migration site.`);
  process.exit(1);
}
console.log("\nPASS: pages byte-equivalent (CRLF->LF normalized); passthrough files byte-identical; no extra output files.");
```

- [ ] **Step 2: Run it — expect the no-baseline failure (proves the gate can fail):**

```bash
node tools/check-equivalence.mjs; echo "exit: $?"
```

EXPECTED OUTPUT:

```
NO BASELINE — expected page snapshots in tools/equivalence-baseline/
NO SOURCE  src/portal/portal.js
NO SOURCE  src/site.webmanifest
NO SOURCE  src/sw.js

FAIL: 4 problem(s) — _site/ is not equivalent to the pre-migration site.
exit: 1
```

- [ ] **Step 3: Snapshot the 15 pages BEFORE anything moves** (Git Bash, repo root):

```bash
mkdir -p tools/equivalence-baseline/portal
cp index.html membership.html pool.html tennis.html swim-team.html \
   community.html board.html suggestions.html contact.html thanks.html \
   tools/equivalence-baseline/
cp portal/index.html portal/announcements.html portal/inbox.html \
   portal/ledger.html portal/content.html tools/equivalence-baseline/portal/
ls tools/equivalence-baseline tools/equivalence-baseline/portal
```

EXPECTED OUTPUT: 10 files listed in the baseline root, 5 under `portal/`. (Do NOT copy `portal/portal.js` — passthrough files are checked against `src/`, not the baseline.)

- [ ] **Step 4: Run the checker again — expect exactly 15 MISSING pages + 3 NO SOURCE:**

```bash
node tools/check-equivalence.mjs; echo "exit: $?"
```

EXPECTED OUTPUT:

```
MISSING  board.html
MISSING  community.html
MISSING  contact.html
MISSING  index.html
MISSING  membership.html
MISSING  pool.html
MISSING  portal/announcements.html
MISSING  portal/content.html
MISSING  portal/index.html
MISSING  portal/inbox.html
MISSING  portal/ledger.html
MISSING  suggestions.html
MISSING  swim-team.html
MISSING  tennis.html
MISSING  thanks.html
NO SOURCE  src/portal/portal.js
NO SOURCE  src/site.webmanifest
NO SOURCE  src/sw.js

FAIL: 18 problem(s) — _site/ is not equivalent to the pre-migration site.
exit: 1
```

- [ ] **Step 5: Confirm the pre-change gates still pass:** `npm test` → all tests pass (count per Global Constraints); `npm run lint` → no output, exit 0 (the checker file is not yet covered by an eslint block — that lands with the Task 2 eslint update; confirm `npx eslint tools/check-equivalence.mjs` prints a "no matching configuration" style warning or nothing, but `npm run lint` itself must exit 0).

- [ ] **Step 6: Commit:** `git add tools/ && git commit -m "Equivalence baseline + checker for 11ty migration"`

---

### Task 2: Eleventy scaffold, wiring, and the first migrated page (index.html)

**Files:**
- Create: `eleventy.config.js`, `src/src.11tydata.js`, `src/_includes/base.njk`, `src/_includes/site-header.njk`, `src/_includes/site-footer.njk`, `src/index.html`
- Move (git mv): `assets/` → `src/assets/`, `documents/` → `src/documents/`, `site.webmanifest` → `src/site.webmanifest`, `sw.js` → `src/sw.js`, `portal/portal.js` → `src/portal/portal.js`
- Delete: root `index.html` (content lives on in `src/index.html`)
- Modify: `package.json`, `package-lock.json` (via npm), `wrangler.toml`, `.gitignore`, `eslint.config.mjs`

**Interfaces:**
- Consumes: Task 1's checker.
- Produces: `npm run build` / `npm run dev` / `npm run watch` / `npm run check`; layout `base.njk` (vars `title`, `description`, `pageKey`, `bodyClass`, `themeColor`, `canonical`); partials `site-header.njk` + `site-footer.njk`; the passthrough pipeline. Tasks 3-4 only add pages; they change no config.

- [ ] **Step 1: Install Eleventy (the one new dependency, no plugins):**

```bash
npm install --save-dev @11ty/eleventy@^3.1.0
npx @11ty/eleventy --version
```

EXPECTED OUTPUT: a `3.x.x` version string. (Eleventy 3 is required — the repo is `"type": "module"` and the config is ESM.)

- [ ] **Step 2: Create `eleventy.config.js`** (repo root) with exactly:

```js
// Eleventy build for the WOPHA site. Plain Eleventy, NO plugins — the spec's
// bus-factor rule (spec §9): a future maintainer needs only front matter,
// one layout, and {% include %}. Pages live in src/, shared markup in
// src/_includes/, output goes to _site/ (gitignored; never edit it).
export default function (eleventyConfig) {
  // Static files shipped to _site/ unchanged (same URLs as today).
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/documents");
  eleventyConfig.addPassthroughCopy("src/site.webmanifest");
  eleventyConfig.addPassthroughCopy("src/sw.js");
  eleventyConfig.addPassthroughCopy("src/portal/portal.js");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    // Page sources are .html files; render them with Nunjucks so they can
    // use front matter, the base layout, and includes.
    htmlTemplateEngine: "njk",
  };
}
```

- [ ] **Step 3: Create `src/src.11tydata.js`** (directory data file — applies to every template under `src/`) with exactly:

```js
// Keep today's flat *.html URLs. Without this Eleventy would write
// pool.html to /pool/index.html ("cool URI" default). URL restructuring
// belongs to the public-site redesign plan, not the tooling migration.
export default {
  eleventyComputed: {
    permalink: (data) => `${data.page.filePathStem}.html`,
  },
};
```

- [ ] **Step 4: Move the static passthrough files into `src/`** (Git Bash):

```bash
mkdir -p src/portal
git mv assets src/assets
git mv documents src/documents
git mv site.webmanifest src/site.webmanifest
git mv sw.js src/sw.js
git mv portal/portal.js src/portal/portal.js
```

No content edits: `sw.js` registration (`navigator.serviceWorker.register("sw.js")` in `src/assets/js/site.js`) and the sw CORE list keep working because built URLs are unchanged.

- [ ] **Step 5: Create the three shared-markup files.** CRITICAL RULE for the two partials: each file ends immediately after its last visible character — **NO trailing newline**. The `{% include %}` tag's own line ending in `base.njk` supplies the newline, which is what makes output byte-identical. (`base.njk` itself DOES end with a normal trailing newline after `</html>`.)

`src/_includes/base.njk` — exactly (ends with a trailing newline after `</html>`):

```njk
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title | safe }}</title>
  <meta name="description" content="{{ description | safe }}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Public+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/styles.css">
  <link rel="manifest" href="site.webmanifest">
  <meta name="theme-color" content="{{ themeColor or '#1f3d2b' }}">
  <link rel="icon" href="assets/img/icon-192.png" type="image/png">
  <link rel="apple-touch-icon" href="assets/img/icon-180.png">{% if canonical %}
  <link rel="canonical" href="{{ canonical }}">{% endif %}
</head>
<body{% if bodyClass %} class="{{ bodyClass }}"{% endif %}>
  <a class="skip-link" href="#main">Skip to content</a>

{% include "site-header.njk" %}

  <main id="main">
{{ content | safe }}  </main>

{% include "site-footer.njk" %}

  <script src="assets/js/site.js"></script>
</body>
</html>
```

(Why it is byte-exact: `{% if canonical %}`/`{% endif %}` wrap the newline BEFORE the canonical line, so an unset `canonical` emits zero bytes; page `content` ends with `\n`, so `{{ content | safe }}  </main>` reproduces `  </main>` on its own line; title/description are front-matter strings copied verbatim with entities and printed with `| safe`, so autoescape never rewrites them.)

`src/_includes/site-header.njk` — exactly (ends right after `</header>`, NO trailing newline):

```njk
  <header class="site-header">
    <div class="container">
      <a class="brand" href="index.html">
        <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true"><path fill="#a8d5c2" d="M11 0 3 10h4L1 19h8v7h4v-7h8l-6-9h4L11 0z"/></svg>
        Woods of Parkview
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="site-nav" id="site-nav" aria-label="Main">
        <ul>
          <li><a href="index.html"{% if pageKey == "home" %} aria-current="page"{% endif %}>Home</a></li>
          <li><a href="membership.html"{% if pageKey == "membership" %} aria-current="page"{% endif %}>Membership</a></li>
          <li><a href="pool.html"{% if pageKey == "pool" %} aria-current="page"{% endif %}>Pool</a></li>
          <li><a href="tennis.html"{% if pageKey == "tennis" %} aria-current="page"{% endif %}>Tennis</a></li>
          <li><a href="swim-team.html"{% if pageKey == "swim-team" %} aria-current="page"{% endif %}>Swim Team</a></li>
          <li><a href="community.html"{% if pageKey == "community" %} aria-current="page"{% endif %}>Community</a></li>
          <li><a href="board.html"{% if pageKey == "board" %} aria-current="page"{% endif %}>Board &amp; Docs</a></li>
          <li><a href="suggestions.html"{% if pageKey == "suggestions" %} aria-current="page"{% endif %}>Suggestions</a></li>
          <li><a href="contact.html"{% if pageKey == "contact" %} aria-current="page"{% endif %}>Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>
```

`src/_includes/site-footer.njk` — exactly (ends right after `</footer>`, NO trailing newline). The `{% if %}` reproduces today's inconsistency — ONLY the homepage lists the Board-portal link (flagged for the public-site plan; do not "fix" it here):

```njk
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
          <li><a href="membership.html#pay">Pay dues</a></li>
          <li><a href="tennis.html#reserve">Reserve a court</a></li>
          <li><a href="pool.html#party">Book a pool party</a></li>
          <li><a href="suggestions.html">Suggestion box</a></li>{% if pageKey == "home" %}
          <li><a href="portal/index.html">Board portal</a></li>{% endif %}
        </ul>
      </div>
      <div>
        <h3>Documents</h3>
        <ul>
          <li><a href="board.html#documents">Covenants &amp; bylaws</a></li>
          <li><a href="board.html#minutes">Meeting minutes</a></li>
          <li><a href="contact.html">Update your info</a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-note">
      <p>© 2026 Woods of Parkview Homeowners Association · Lilburn, Georgia</p>
    </div>
  </footer>
```

- [ ] **Step 6: Assemble `src/index.html`** — front matter (values copied verbatim from the original head, entities included) + the original `<main>` body byte-for-byte. Use this exact Git Bash pipeline rather than retyping 180 lines (the `sed` range keeps everything between the `<main id="main">` line and the `  </main>` line, exclusive; the checker is the arbiter):

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Woods of Parkview HOA — Lilburn, Georgia"
description: "Woods of Parkview is a 170-home swim and tennis neighborhood in Lilburn, Georgia. Pay dues, book the pool, reserve tennis courts, and see what's happening."
pageKey: home
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' index.html | sed '1d;$d'; } > src/index.html
git rm -q index.html
git add src/index.html
head -8 src/index.html
```

EXPECTED OUTPUT (of the `head -8`):

```
---
layout: base.njk
title: "Woods of Parkview HOA — Lilburn, Georgia"
description: "Woods of Parkview is a 170-home swim and tennis neighborhood in Lilburn, Georgia. Pay dues, book the pool, reserve tennis courts, and see what's happening."
pageKey: home
---
    <section class="hero">
      <div class="container">
```

Sanity: the last line of `src/index.html` is `    </section>`. (Mixed CRLF/LF inside the assembled file is fine — the first commit normalizes to LF in git, and the checker normalizes anyway.)

- [ ] **Step 7: Update `package.json`** to exactly (adds `build`/`watch`/`check`, repoints `dev` at `_site`; `db:*`, `test`, `lint` untouched):

```json
{
  "name": "wopha-website",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "eleventy",
    "dev": "eleventy && wrangler pages dev _site --port 8200",
    "watch": "eleventy --watch",
    "check": "eleventy && node tools/check-equivalence.mjs",
    "db:schema": "wrangler d1 execute wopha --local --file=schema.sql",
    "db:seed": "wrangler d1 execute wopha --local --file=seed.sql",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.1.0",
    "eslint": "^9.39.5",
    "vitest": "^3.2.0",
    "wrangler": "^4.24.0"
  }
}
```

(Dev wiring rationale, verified against the repo's docs: `wrangler pages dev <dir>` serves static files from `<dir>` and picks up Pages Functions from `./functions` relative to the cwd — which stays the repo root — so `functions/` does not move. Port 8200 kept per the 8200-8202 window. There is deliberately NO concurrent watch+serve script: that would need a second dependency like `concurrently`, and the spec allows exactly one new dependency. Editing pages = `npm run watch` in a second terminal, refresh the browser.)

- [ ] **Step 8: Update `wrangler.toml`** to exactly:

```toml
name = "wopha-website"
compatibility_date = "2026-07-01"
pages_build_output_dir = "_site"

[[d1_databases]]
binding = "DB"
database_name = "wopha"
database_id = "0856504b-dae6-4887-98ac-01d46bfce135"
```

- [ ] **Step 9: Update `.gitignore`** to exactly:

```
node_modules/
.wrangler/
_site/
```

- [ ] **Step 10: Update `eslint.config.mjs`** to exactly (moved-path updates, `_site` ignore, and one new block so `eleventy.config.js`, `src/src.11tydata.js`, and `tools/*.mjs` are actually linted):

```js
export default [
  { ignores: ["node_modules/**", "**/.wrangler/**", "docs/**", "_site/**"] },
  {
    files: ["src/assets/js/*.js", "src/portal/*.js", "src/sw.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly", window: "readonly", fetch: "readonly",
        navigator: "readonly", caches: "readonly", self: "readonly",
        URL: "readonly", confirm: "readonly", setTimeout: "readonly",
        Promise: "readonly", Object: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^(api|showError|clearError)$" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
  {
    files: ["functions/**/*.js", "workers/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        Response: "readonly", fetch: "readonly", URL: "readonly",
        Request: "readonly", console: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
  {
    files: ["eleventy.config.js", "src/*.11tydata.js", "tools/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { console: "readonly", process: "readonly" },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", varsIgnorePattern: "^_" }],
      "eqeqeq": ["warn", "smart"],
      "no-redeclare": "error",
    },
  },
];
```

- [ ] **Step 11: Build and check — index must be byte-equivalent, 14 pages still missing:**

```bash
npm run build
```

EXPECTED OUTPUT ends with a line like `[11ty] Copied 12 files / Wrote 1 file in 0.1 seconds (v3.x.x)` — the assertions are **Copied 12** (2 css + 1 js + 4 img + 2 pdf + webmanifest + sw.js + portal.js) and **Wrote 1**.

```bash
node tools/check-equivalence.mjs; echo "exit: $?"
```

EXPECTED OUTPUT (page lines interleave alphabetically; the essentials):

```
MISSING  board.html
MISSING  community.html
MISSING  contact.html
ok       index.html
MISSING  membership.html
MISSING  pool.html
MISSING  portal/announcements.html
MISSING  portal/content.html
MISSING  portal/index.html
MISSING  portal/inbox.html
MISSING  portal/ledger.html
MISSING  suggestions.html
MISSING  swim-team.html
MISSING  tennis.html
MISSING  thanks.html
ok copy  assets/css/portal.css
ok copy  assets/css/styles.css
ok copy  assets/img/icon-180.png
ok copy  assets/img/icon-192.png
ok copy  assets/img/icon-512.png
ok copy  assets/img/wop-map.jpg
ok copy  assets/js/site.js
ok copy  documents/final_bylaws_copy.pdf
ok copy  documents/final_declaration_of_covenants.pdf
ok copy  portal/portal.js
ok copy  site.webmanifest
ok copy  sw.js

FAIL: 14 problem(s) — _site/ is not equivalent to the pre-migration site.
exit: 1
```

`ok       index.html` is the load-bearing line: the layout + both partials + front matter reproduce the original homepage EXACTLY. If it says `DIFFERS`, the checker prints the first differing line — fix the template (usual suspects: a trailing newline snuck into a partial, or an entity got un-escaped in front matter). Do not proceed until index is `ok`.

- [ ] **Step 12: Gates + dev smoke test:**

```bash
npm test        # EXPECTED: all tests pass (count per Global Constraints)
npm run lint    # EXPECTED: exit 0, no errors
npm run db:schema && npm run db:seed
npm run dev     # leave running (or run in background)
```

In a second terminal:

```bash
curl -s http://127.0.0.1:8200/index.html | head -2          # EXPECTED: <!DOCTYPE html> / <html lang="en">
curl -s http://127.0.0.1:8200/api/announcements | head -c 60 # EXPECTED: {"announcements":[...  (JSON — proves functions/ pickup)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8200/assets/css/styles.css  # EXPECTED: 200
```

Stop the dev server.

- [ ] **Step 13: Commit:** `git add -A && git commit -m "Eleventy scaffold: build to _site, index.html from base layout + partials"`

---

### Task 3: Migrate the remaining 8 public pages + thanks.html

**Files:**
- Create: `src/membership.html`, `src/pool.html`, `src/tennis.html`, `src/swim-team.html`, `src/community.html`, `src/board.html`, `src/suggestions.html`, `src/contact.html`
- Move verbatim: `thanks.html` → `src/thanks.html`
- Delete: the 8 root originals

**Interfaces:**
- Consumes: `base.njk` + partials + checker from Tasks 1-2.
- Produces: all 10 public pages built from `src/`; `pageKey` values `membership|pool|tennis|swim-team|community|board|suggestions|contact` (plus Task 2's `home`) — the exact keys the public-site restyle plan will reuse.

Each page uses the SAME assembly as Task 2 Step 6: front matter (title/description copied verbatim from the original head, entities included, double-quoted) + the original `<main>` body extracted byte-for-byte. The forms on suggestions/contact/board (`action="/api/forms/submit"` + hidden `form_type`) live inside the extracted bodies and are therefore untouched by construction. Run all blocks in Git Bash from the repo root.

- [ ] **Step 1: membership.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Membership &amp; Dues — Woods of Parkview HOA"
description: "Pay your 2026 Woods of Parkview HOA dues ($535), learn about Full, Social, and Non-Resident memberships, and earn $50 for referring a new member."
pageKey: membership
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' membership.html | sed '1d;$d'; } > src/membership.html
git rm -q membership.html && git add src/membership.html
```

- [ ] **Step 2: pool.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Pool — Woods of Parkview HOA"
description: "The Woods of Parkview pool: 2026 season dates, hours, guest policy, and how to book a pool party at our six-lane pool with diving well, baby pool, and pavilion."
pageKey: pool
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' pool.html | sed '1d;$d'; } > src/pool.html
git rm -q pool.html && git add src/pool.html
```

- [ ] **Step 3: tennis.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Tennis &amp; Pickleball — Woods of Parkview HOA"
description: "Reserve one of Woods of Parkview's two LED-lighted tennis and pickleball courts on ReserveMyCourt, read the court rules, join an ALTA team, or play as a non-member for a seasonal fee."
pageKey: tennis
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' tennis.html | sed '1d;$d'; } > src/tennis.html
git rm -q tennis.html && git add src/tennis.html
```

- [ ] **Step 4: swim-team.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Swim Team — Woods of Parkview HOA"
description: "The Parkview Poolcats swim team, established 1986, welcomes swimmers ages 4–18 in the Gwinnett County Swim League. WOPHA membership not required — register on SwimTopia."
pageKey: swim-team
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' swim-team.html | sed '1d;$d'; } > src/swim-team.html
git rm -q swim-team.html && git add src/swim-team.html
```

- [ ] **Step 5: community.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Community &amp; Events — Woods of Parkview HOA"
description: "What's happening in Woods of Parkview: neighborhood events and traditions, parent group chats, the private Facebook group, and the opt-in family directory."
pageKey: community
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' community.html | sed '1d;$d'; } > src/community.html
git rm -q community.html && git add src/community.html
```

- [ ] **Step 6: board.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Board &amp; Documents — Woods of Parkview HOA"
description: "Meet the volunteer board of Woods of Parkview HOA, read meeting minutes, and download the covenants and bylaws."
pageKey: board
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' board.html | sed '1d;$d'; } > src/board.html
git rm -q board.html && git add src/board.html
```

- [ ] **Step 7: suggestions.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Suggestion Box — Woods of Parkview HOA"
description: "Tell the Woods of Parkview board what would make the neighborhood better. Every suggestion is read, and you can send yours anonymously if you prefer."
pageKey: suggestions
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' suggestions.html | sed '1d;$d'; } > src/suggestions.html
git rm -q suggestions.html && git add src/suggestions.html
```

- [ ] **Step 8: contact.html**

```bash
{ cat <<'EOF'
---
layout: base.njk
title: "Contact — Woods of Parkview HOA"
description: "Update your contact information with the Woods of Parkview HOA, find the right board volunteer to reach, and get key neighborhood details."
pageKey: contact
---
EOF
sed -n '/<main id="main">/,/^  <\/main>/p' contact.html | sed '1d;$d'; } > src/contact.html
git rm -q contact.html && git add src/contact.html
```

- [ ] **Step 9: thanks.html — verbatim move, NO front matter, NO layout** (it is a standalone page with its own minimal head; it contains no Nunjucks syntax, so rendering is a no-op, and the directory data file gives it the `/thanks.html` permalink):

```bash
git mv thanks.html src/thanks.html
```

- [ ] **Step 10: Verify — all 10 public pages equivalent, only the 5 portal pages missing:**

```bash
npm run check; echo "exit: $?"
```

EXPECTED OUTPUT: `ok` for `board.html`, `community.html`, `contact.html`, `index.html`, `membership.html`, `pool.html`, `suggestions.html`, `swim-team.html`, `tennis.html`, `thanks.html`; `MISSING` for the 5 `portal/*.html` pages; all 12 `ok copy` lines; ending:

```
FAIL: 5 problem(s) — _site/ is not equivalent to the pre-migration site.
exit: 1
```

The build line should now read `Wrote 10 files`. Any `DIFFERS` on a page: the two known traps are (a) the footer portal-link conditional (only `index.html` may have the extra `<li>` — the checker's first-diff output will point at the footer if the `{% if %}` is wrong) and (b) an `&amp;` title transcribed as `&`.

- [ ] **Step 11: Gates:** `npm test` → all pass (count per Global Constraints); `npm run lint` → clean.

- [ ] **Step 12: Commit:** `git add -A && git commit -m "Migrate remaining public pages + thanks to src/"`

---

### Task 4: Portal pages on the portal-shell partial — full equivalence green

**Files:**
- Create: `src/_includes/portal-shell.njk`, `src/portal/index.html`, `src/portal/announcements.html`, `src/portal/inbox.html`, `src/portal/ledger.html`, `src/portal/content.html`
- Delete: the 5 `portal/*.html` originals (the now-empty root `portal/` dir disappears with them)

**Interfaces:**
- Consumes: checker; `src/portal/portal.js` (already moved in Task 2).
- Produces: `src/_includes/portal-shell.njk` (front matter vars: `title` = browser-tab name, `heading` = `<h1>` text — both required on every portal page). This partial deliberately reproduces today's inline portal nav EXACTLY (no active-state marking, temporary chrome); **the portal-redesign plan will replace its contents** while keeping the file name and the `{% include "portal-shell.njk" %}` seam.

Design note: portal pages do NOT use a layout. Each page is front matter + one include + the rest of the original file verbatim. The shared chrome is the original lines 1-24 (doctype through the error div), which were verified byte-identical across all 5 pages except `<title>`/`<h1>`. The per-page inline `<script>` blocks after `</main>` stay in each page's own source, exactly as today.

- [ ] **Step 1: Create `src/_includes/portal-shell.njk`** — exactly the block below, ending **immediately after the error-div `</div>` with NO trailing newline** (the include tag's line ending in each page supplies it):

```njk
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>{{ title | safe }} — WOPHA board portal</title>
  <link rel="stylesheet" href="../assets/css/styles.css">
  <link rel="stylesheet" href="../assets/css/portal.css">
</head>
<body>
  <main class="section">
    <div class="container">
      <span class="eyebrow">WOPHA board portal</span>
      <h1>{{ heading | safe }}</h1>
      <nav class="portal-nav">
        <a href="index.html">Dashboard</a>
        <a href="announcements.html">Announcements</a>
        <a href="inbox.html">Inbox</a>
        <a href="ledger.html">Ledger</a>
        <a href="content.html">Site content</a>
        <a href="../index.html">← Public site</a>
      </nav>
      <div id="error" class="portal-error"></div>
```

- [ ] **Step 2: Assemble the 5 portal pages** (Git Bash; `tail -n +25` keeps everything from original line 25 — the first line after the error div — to EOF, verbatim, including each page's closing tags and inline script):

```bash
{ cat <<'EOF'
---
title: "Dashboard"
heading: "Dashboard"
---
{% include "portal-shell.njk" %}
EOF
tail -n +25 portal/index.html; } > src/portal/index.html
git rm -q portal/index.html && git add src/portal/index.html

{ cat <<'EOF'
---
title: "Announcements"
heading: "Announcements"
---
{% include "portal-shell.njk" %}
EOF
tail -n +25 portal/announcements.html; } > src/portal/announcements.html
git rm -q portal/announcements.html && git add src/portal/announcements.html

{ cat <<'EOF'
---
title: "Inbox"
heading: "Inbox"
---
{% include "portal-shell.njk" %}
EOF
tail -n +25 portal/inbox.html; } > src/portal/inbox.html
git rm -q portal/inbox.html && git add src/portal/inbox.html

{ cat <<'EOF'
---
title: "Ledger"
heading: "Dues ledger"
---
{% include "portal-shell.njk" %}
EOF
tail -n +25 portal/ledger.html; } > src/portal/ledger.html
git rm -q portal/ledger.html && git add src/portal/ledger.html

{ cat <<'EOF'
---
title: "Site content"
heading: "Site content"
---
{% include "portal-shell.njk" %}
EOF
tail -n +25 portal/content.html; } > src/portal/content.html
git rm -q portal/content.html && git add src/portal/content.html
```

(Note `ledger.html` is the page where `title` ≠ `heading` — browser tab says "Ledger", the h1 says "Dues ledger", exactly as today.)

- [ ] **Step 3: THE ACCEPTANCE BAR — full equivalence run:**

```bash
npm run check; echo "exit: $?"
```

EXPECTED OUTPUT: build line `[11ty] Copied 12 files / Wrote 15 files ...`, then `ok` for ALL 15 pages (10 public incl. thanks + 5 portal), `ok copy` for all 12 passthrough files, no `UNEXPECTED` lines, and:

```
PASS: pages byte-equivalent (CRLF->LF normalized); passthrough files byte-identical; no extra output files.
exit: 0
```

This is the plan's acceptance criterion. Every later verify re-runs it.

- [ ] **Step 4: Dev smoke test (portal + admin API):** `npm run dev`, then in a second terminal:

```bash
curl -s http://127.0.0.1:8200/portal/index.html | head -2      # EXPECTED: <!doctype html> / <html lang="en">
curl -s http://127.0.0.1:8200/portal/ledger.html | grep -c "Dues ledger"   # EXPECTED: 1
curl -s http://127.0.0.1:8200/api/admin/summary | head -c 40   # EXPECTED: JSON with paid/households keys (local dev auth is open by design)
```

Stop the dev server.

- [ ] **Step 5: Gates:** `npm test` → all pass (count per Global Constraints); `npm run lint` → clean.

- [ ] **Step 6: Commit:** `git add -A && git commit -m "Portal pages on portal-shell partial; full byte-equivalence green"`

---

### Task 5: Documentation for the non-expert maintainer + final gate

**Files:**
- Modify: `README.md` (full rewrite of the build/dev sections), `docs/launch-checklist.md` (two build-related corrections)
- Keep: `tools/check-equivalence.mjs` + `tools/equivalence-baseline/` — they are the regression harness for the whole tooling-only phase. The FIRST restyle plan that intentionally changes page bytes deletes both (recorded here so nobody treats a red check as a bug then).

**Interfaces:**
- Consumes: everything above.
- Produces: README with the 3 commands + "how to add a page" in plain language (spec §9 bus-factor mitigation); launch checklist whose Cloudflare Pages settings match the new build.

- [ ] **Step 1: Replace `README.md`** with exactly:

````markdown
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
````

- [ ] **Step 2: Fix the two build-affected lines in `docs/launch-checklist.md`.** In section 7, change:

```
- [ ] Create the **Cloudflare Pages** project from the GitHub repo
      (production branch: `deploy`, no build command, output `/`).
```

to:

```
- [ ] Create the **Cloudflare Pages** project from the GitHub repo
      (production branch: `deploy`, build command `npm ci && npm run build`,
      build output directory `_site`).
```

And replace the "Local preview" section at the bottom:

```
## Local preview

Open `index.html` in a browser, or from this folder run:
`python -m http.server 8201` → http://localhost:8201
```

with:

```
## Local preview

`npm run dev` → http://127.0.0.1:8200 (site + portal + API). For the static
pages only: `npm run build`, then
`python -m http.server 8201 --directory _site` → http://localhost:8201
```

- [ ] **Step 3: Final full gate — run all five and record the output:**

```bash
npm run check; echo "exit: $?"   # EXPECTED: PASS ... exit: 0
npm test                          # EXPECTED: all tests pass (count per Global Constraints)
npm run lint                      # EXPECTED: exit 0
git status --short                # EXPECTED: only README.md / docs/launch-checklist.md modified
```

- [ ] **Step 4: Commit:** `git add -A && git commit -m "Docs: 11ty dev workflow, launch checklist build settings"`

---

## Out of scope (explicitly)

Restyling, tokens, typography (public-site plan); nav/IA and URL restructuring + `_redirects` (public-site plan); portal shell redesign, `portal-shell.js` behavior module, `portal.css` growth (portal plan); all backend changes incl. settings table and QBO exports (backend-seam plan); self-hosted fonts (public-site plan — the Google Fonts `<link>`s stay byte-identical here); deploy-branch/GitHub Pages changes (cutover work — the live site keeps serving the old flat files until then).

## Spec contradictions / drift found while planning

1. Spec §10 says "27-test suite"; the suite is 28 tests today — constraints use 28.
2. `README.md` said "No build step, no framework" — Task 5 rewrites it; the spec's §7 decision supersedes it.
3. `docs/launch-checklist.md` §7 said "no build command, output `/`" for the Cloudflare Pages project — contradicted by 11ty adoption; corrected in Task 5.
4. Footer inconsistency (Board-portal link on `index.html` only) is reproduced by conditional, not normalized — byte-equivalence wins; the public-site plan should unify it deliberately.
