import { safeCell, csvResponse } from "../_lib/csv.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const onlyUnpaid = url.searchParams.get("only") === "unpaid";
  const { results } = await env.DB.prepare(
    `SELECT h.address, h.owner_name, h.email, h.phone,
            p.amount_cents, p.method, p.paid_on
     FROM households h
     LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
     ORDER BY h.address`
  ).bind(year).all();
  const rows = results
    .filter((r) => (onlyUnpaid ? r.paid_on == null : true))
    .map((r) => [
      safeCell(r.address), safeCell(r.owner_name), safeCell(r.email), safeCell(r.phone),
      r.paid_on ? "paid" : "unpaid",
      r.amount_cents != null ? (r.amount_cents / 100).toFixed(2) : "",
      r.method || "", r.paid_on || "",
    ]);
  const name = "wopha-ledger-" + year + (onlyUnpaid ? "-unpaid" : "") + ".csv";
  return csvResponse(name, [
    ["address", "owner_name", "email", "phone", "status", "amount", "method", "paid_on"],
    ...rows,
  ]);
}
