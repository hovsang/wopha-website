// Review gate (spec 2026-07-17 §4.4): nothing tier/price/SaaS-commercial may
// appear on PUBLIC pages. Scans every built .html outside _site/portal/ for
// pricing markers. Patterns derive from src/_data/pricing.json so a price
// change re-arms the gate. Portal pages are exempt: they are Access-gated in
// production and excluded from open demos (launch checklist §7).
// Tuning note: patterns are chosen to miss legit public copy (the HOA's own
// $693 dues figure and dues Stripe/"Payment Links" on membership.html, which
// are unrelated to the webmaster's SaaS pricing). If a future page trips
// this legitimately, tighten the pattern here and say why in a comment.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const ROOT = resolve(process.argv[2] || "_site");
const pricing = JSON.parse(readFileSync(resolve("src/_data/pricing.json"), "utf8"));

const fmt = (cents) =>
  "$" + (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const patterns = [
  ...pricing.tiers.map((t) => ({
    label: `${t.name} gross price ${fmt(t.gross_monthly_cents)}`,
    re: new RegExp(escapeRe(fmt(t.gross_monthly_cents)) + "(?![\\d,])"),
  })),
  { label: "SaaS", re: /saas/i },
  { label: "gross monthly", re: /gross monthly/i },
  { label: "net monthly", re: /net monthly/i },
  { label: "per-month price marker (/mo)", re: /\/mo\b/ },
  { label: "Subscribe monthly", re: /subscribe monthly/i },
  { label: "tier-named plan", re: /\b(Essentials|Amenities|Complete) (tier|plan)\b/ },
  { label: "PayHOA", re: /payhoa/i },
];

let bad = 0;
let files = 0;
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (relative(ROOT, p) === "portal") continue; // Access-gated surface; pricing allowed
      walk(p);
    } else if (entry.name.endsWith(".html")) {
      files++;
      const text = readFileSync(p, "utf8");
      for (const { label, re } of patterns) {
        if (re.test(text)) { bad++; console.log(`${relative(ROOT, p)}: ${label}`); }
      }
    }
  }
})(ROOT);
console.log(bad ? `${bad} pricing leak(s) on public pages` : `pricing privacy OK - ${files} public pages clean`);
process.exit(bad ? 1 : 0);
