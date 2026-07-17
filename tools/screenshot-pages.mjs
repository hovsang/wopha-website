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
