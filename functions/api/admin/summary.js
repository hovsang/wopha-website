import { json } from "../_lib/respond.js";

export async function onRequestGet({ env, data }) {
  const year = new Date().getFullYear();
  const households = await env.DB.prepare("SELECT COUNT(*) AS n FROM households").first();
  const paid = await env.DB.prepare("SELECT COUNT(*) AS n FROM payments WHERE year = ?").bind(year).first();
  const collected = await env.DB.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) AS c FROM payments WHERE year = ?"
  ).bind(year).first();
  const newSubs = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'new'").first();
  const latest = await env.DB.prepare(
    "SELECT title, created_at FROM announcements WHERE deleted = 0 ORDER BY created_at DESC LIMIT 1"
  ).first();
  return json({
    year,
    households: households.n,
    paid: paid.n,
    collectedCents: collected.c,
    newSubmissions: newSubs.n,
    latestAnnouncement: latest || null,
    adminEmail: (data && data.adminEmail) || "",
  });
}
