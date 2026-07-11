import { json } from "../_lib/respond.js";
import { parseHouseholdsCsv, ledgerSummary, DUES_CENTS } from "../_lib/ledger.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const { results } = await env.DB.prepare(
    `SELECT h.id, h.address, h.owner_name, h.email, h.phone,
            p.id AS payment_id, p.amount_cents, p.method, p.paid_on
     FROM households h
     LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
     ORDER BY h.address`
  ).bind(year).all();
  const summary = ledgerSummary(
    results.map((r) => ({ paid: r.payment_id != null, amount_cents: r.amount_cents || 0 })),
    DUES_CENTS
  );
  return json({ year, dues_cents: DUES_CENTS, summary, households: results });
}

export async function onRequestPost({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const parsed = parseHouseholdsCsv(input.csv);
  if (!parsed.ok) return json({ error: parsed.error }, 400);
  const stmts = parsed.households.map((h) =>
    env.DB.prepare(
      `INSERT INTO households (address, owner_name, email, phone) VALUES (?, ?, ?, ?)
       ON CONFLICT(address) DO UPDATE SET
         owner_name = excluded.owner_name, email = excluded.email, phone = excluded.phone`
    ).bind(h.address, h.owner_name, h.email, h.phone)
  );
  if (stmts.length) await env.DB.batch(stmts);
  return json({ imported: parsed.households.length, errors: parsed.errors });
}
