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
