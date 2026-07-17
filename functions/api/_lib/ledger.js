import { parseCsv } from "./csv.js";

// 2026 annual dues. Update when dues change (drives the "outstanding" figure).
export const DUES_CENTS = 69300;

// Expected header: address[,owner_name][,email][,phone] — any order, any case.
export function parseHouseholdsCsv(text) {
  const rows = parseCsv(String(text || "").trim());
  if (rows.length < 2) return { ok: false, error: "Need a header row plus at least one household" };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = {
    address: header.indexOf("address"),
    owner_name: header.indexOf("owner_name"),
    email: header.indexOf("email"),
    phone: header.indexOf("phone"),
  };
  if (col.address === -1) return { ok: false, error: "Missing required 'address' column" };
  const households = [];
  const errors = [];
  rows.slice(1).forEach((r, i) => {
    const get = (idx) => (idx === -1 ? "" : String(r[idx] || "").trim());
    const address = get(col.address);
    if (!address) { errors.push("Row " + (i + 2) + ": empty address: skipped"); return; }
    households.push({
      address,
      owner_name: get(col.owner_name),
      email: get(col.email),
      phone: get(col.phone),
    });
  });
  return { ok: true, households, errors };
}

export function ledgerSummary(rows, duesCents) {
  const paid = rows.filter((r) => r.paid);
  return {
    total: rows.length,
    paidCount: paid.length,
    unpaidCount: rows.length - paid.length,
    collectedCents: paid.reduce((sum, r) => sum + r.amount_cents, 0),
    outstandingCents: (rows.length - paid.length) * duesCents,
  };
}

// Read one operator setting (see admin/settings.js) as a string. Returns ""
// when the key is unset — or when the settings table has not been deployed
// yet, so deploy order can never break the ledger.
export async function settingValue(env, key) {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
    return row ? String(row.value) : "";
  } catch (_) {
    return "";
  }
}

// Settings-driven dues figure with the code constant as the safety net.
export async function duesCentsFor(env) {
  const raw = await settingValue(env, "dues_cents");
  const n = Number(raw);
  if (/^\d+$/.test(raw) && n > 0 && n <= 1000000) return n;
  return DUES_CENTS;
}
