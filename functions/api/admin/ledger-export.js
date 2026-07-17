import { json } from "../_lib/respond.js";
import { safeCell, csvResponse } from "../_lib/csv.js";
import { duesCentsFor, settingValue } from "../_lib/ledger.js";
import { qboCustomerRows, qboInvoiceRows, qboPaymentRows } from "../_lib/qbo.js";

const FORMATS = ["board", "qbo-customers", "qbo-invoices", "qbo-payments"];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year")) || new Date().getFullYear();
  const onlyUnpaid = url.searchParams.get("only") === "unpaid";
  const format = url.searchParams.get("format") || "board";
  if (!FORMATS.includes(format)) return json({ error: "Unknown format" }, 400);

  if (format === "qbo-customers") {
    // Year-independent: seeds/refreshes QBO's customer list.
    const { results } = await env.DB.prepare(
      "SELECT address, owner_name, email, phone FROM households ORDER BY address"
    ).all();
    return csvResponse("wopha-qbo-customers.csv", qboCustomerRows(results));
  }

  if (format === "qbo-invoices") {
    // One invoice row per household for the year (accrual workflow).
    // only=unpaid supports "invoice only the households that still owe".
    const { results } = await env.DB.prepare(
      `SELECT h.id, h.address, p.id AS payment_id
       FROM households h
       LEFT JOIN payments p ON p.household_id = h.id AND p.year = ?
       ORDER BY h.address`
    ).bind(year).all();
    const households = results.filter((r) => (onlyUnpaid ? r.payment_id == null : true));
    const duesCents = await duesCentsFor(env);
    const dueDate = (await settingValue(env, "dues_due_date")) || year + "-01-01";
    return csvResponse("wopha-qbo-invoices-" + year + ".csv",
      qboInvoiceRows(households, year, duesCents, dueDate));
  }

  if (format === "qbo-payments") {
    // Reference list of the year's recorded payments (cash-basis workflow).
    const { results } = await env.DB.prepare(
      `SELECT h.address, p.amount_cents, p.method, p.paid_on, p.note
       FROM payments p JOIN households h ON h.id = p.household_id
       WHERE p.year = ?
       ORDER BY p.paid_on, h.address`
    ).bind(year).all();
    return csvResponse("wopha-qbo-payments-" + year + ".csv", qboPaymentRows(results, year));
  }

  // board (default) — output byte-identical to the pre-redesign exporter.
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
