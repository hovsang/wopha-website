// Weekly D1 → R2 backup.
// Retention: the KEEP most recent weekly dumps, plus the first backup of each
// calendar month for the last MONTHS months — an annual dues cycle needs more
// than two months of history, and a year of monthlies is effectively free in R2.
// TABLES is duplicated in functions/api/admin/export.js ON PURPOSE — this
// worker deploys separately and must not import from functions/. The drift
// test in tests/backup.test.js keeps both lists equal to schema.sql.
export const TABLES = ["announcements", "submissions", "households", "payments", "site_content", "settings"];
const KEEP = 8;
const MONTHS = 12;

// "YYYY-MM" for the month n months before the given ISO datetime.
export function monthFloor(nowIso, n) {
  const y = Number(nowIso.slice(0, 4));
  const m = Number(nowIso.slice(5, 7));
  const total = y * 12 + (m - 1) - n;
  return String(Math.floor(total / 12)).padStart(4, "0") + "-" + String((total % 12) + 1).padStart(2, "0");
}

// Pure retention rule: which keys to prune. Only keys matching the dated
// backup pattern are ever considered — nothing else in the bucket is touched.
export function keysToDelete(keys, nowIso) {
  const dated = keys
    .filter((k) => /^wopha-backup-\d{4}-\d{2}-\d{2}\.json$/.test(k))
    .sort();
  const keep = new Set(dated.slice(-KEEP));
  const cutoff = monthFloor(nowIso, MONTHS - 1); // current month counts as one of the 12
  const seenMonth = new Set();
  for (const k of dated) {
    const month = k.slice(13, 20); // "wopha-backup-".length === 13 → "YYYY-MM"
    if (seenMonth.has(month)) continue;
    seenMonth.add(month);
    if (month >= cutoff) keep.add(k); // earliest backup of a recent month
  }
  return dated.filter((k) => !keep.has(k));
}

export default {
  async scheduled(controller, env) {
    const dump = {};
    for (const t of TABLES) {
      const { results } = await env.DB.prepare("SELECT * FROM " + t).all();
      dump[t] = results;
    }
    const now = new Date(controller.scheduledTime).toISOString();
    await env.BACKUPS.put("wopha-backup-" + now.slice(0, 10) + ".json", JSON.stringify(dump));

    const list = await env.BACKUPS.list({ prefix: "wopha-backup-" });
    for (const key of keysToDelete(list.objects.map((o) => o.key), now)) {
      await env.BACKUPS.delete(key);
    }
  },
};
