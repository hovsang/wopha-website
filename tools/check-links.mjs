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
