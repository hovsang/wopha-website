const TABLES = ["announcements", "submissions", "households", "payments", "site_content"];

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
