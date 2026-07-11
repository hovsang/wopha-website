// Weekly D1 → R2 backup. Keeps the most recent KEEP dumps.
const TABLES = ["announcements", "submissions", "households", "payments", "site_content"];
const KEEP = 8;

export default {
  async scheduled(controller, env) {
    const dump = {};
    for (const t of TABLES) {
      const { results } = await env.DB.prepare("SELECT * FROM " + t).all();
      dump[t] = results;
    }
    const date = new Date(controller.scheduledTime).toISOString().slice(0, 10);
    await env.BACKUPS.put("wopha-backup-" + date + ".json", JSON.stringify(dump));

    const list = await env.BACKUPS.list({ prefix: "wopha-backup-" });
    const keys = list.objects.map((o) => o.key).sort();
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP))) {
      await env.BACKUPS.delete(key);
    }
  },
};
