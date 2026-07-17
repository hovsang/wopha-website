import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/ledger-export.js";
import { fakeDb } from "./helpers/fake-db.js";

const LEDGER_ROWS = [
  { address: "101 Planters Way", owner_name: "Alex Morgan", email: "alex@x.com", phone: "",
    amount_cents: 53500, method: "stripe", paid_on: "2026-03-01" },
  { address: "=102 Planters Way", owner_name: "-Sam Lee", email: "", phone: "",
    amount_cents: null, method: null, paid_on: null },
];

function boardDb() {
  return fakeDb([{ match: "LEFT JOIN payments", results: LEDGER_ROWS }]);
}

function req(qs) {
  return new Request("http://localhost:8200/api/admin/ledger-export" + qs);
}

describe("GET /api/admin/ledger-export (board format, back-compat)", () => {
  it("produces the exact pre-redesign CSV bytes, filename, and headers", async () => {
    const res = await onRequestGet({ request: req("?year=2026"), env: { DB: boardDb() } });
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-ledger-2026.csv"');
    expect(await res.text()).toBe([
      "address,owner_name,email,phone,status,amount,method,paid_on",
      "101 Planters Way,Alex Morgan,alex@x.com,,paid,535.00,stripe,2026-03-01",
      "'=102 Planters Way,'-Sam Lee,,,unpaid,,,",
    ].join("\n"));
  });
  it("keeps only=unpaid filtering and the -unpaid filename suffix", async () => {
    const res = await onRequestGet({ request: req("?year=2026&only=unpaid"), env: { DB: boardDb() } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-ledger-2026-unpaid.csv"');
    expect(await res.text()).toBe([
      "address,owner_name,email,phone,status,amount,method,paid_on",
      "'=102 Planters Way,'-Sam Lee,,,unpaid,,,",
    ].join("\n"));
  });
});
