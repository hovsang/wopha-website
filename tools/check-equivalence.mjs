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
