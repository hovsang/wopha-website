// Full-table JSON dump (the portal's "Backup & data" card).
// TABLES is duplicated in workers/backup/index.js ON PURPOSE — the backup
// worker deploys separately and must not import from functions/. The drift
// test in tests/backup.test.js keeps both lists equal to schema.sql.
export const TABLES = ["announcements", "submissions", "households", "payments", "site_content", "settings"];

export async function onRequestGet({ env }) {
  const dump = {};
  for (const t of TABLES) {
    const { results } = await env.DB.prepare("SELECT * FROM " + t).all();
    dump[t] = results;
  }
  return new Response(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="wopha-data-export.json"',
    },
  });
}
