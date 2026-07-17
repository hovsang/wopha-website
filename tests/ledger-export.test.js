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

describe("GET /api/admin/ledger-export?format=qbo-*", () => {
  it("qbo-customers: year-independent customer import CSV with safeCell applied", async () => {
    const db = fakeDb([
      { match: "FROM households ORDER BY address", results: [
        { address: "101 Planters Way", owner_name: "Alex Morgan", email: "alex@x.com", phone: "" },
        { address: "=102 Planters Way", owner_name: "-Sam Lee", email: "", phone: "" },
      ] },
    ]);
    const res = await onRequestGet({ request: req("?format=qbo-customers"), env: { DB: db } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-qbo-customers.csv"');
    const lines = (await res.text()).split("\n");
    expect(lines[0]).toBe("Name,Company Name,Email,Phone,Street,City,State,ZIP");
    expect(lines[1]).toBe("101 Planters Way,Alex Morgan,alex@x.com,,101 Planters Way,Lilburn,GA,30047");
    expect(lines[2]).toBe("'=102 Planters Way,'-Sam Lee,,,'=102 Planters Way,Lilburn,GA,30047");
  });

  it("qbo-invoices: settings-driven dues and due date, deterministic invoice numbers", async () => {
    const db = fakeDb([
      { match: "p.id AS payment_id", results: [
        { id: 1, address: "101 Planters Way", payment_id: 11 },
        { id: 2, address: "102 Planters Way", payment_id: null },
      ] },
      { match: "FROM settings", first: (args) =>
        (args[0] === "dues_cents" ? { value: "60000" } : { value: "2026-04-30" }) },
    ]);
    const res = await onRequestGet({ request: req("?year=2026&format=qbo-invoices"), env: { DB: db } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-qbo-invoices-2026.csv"');
    const lines = (await res.text()).split("\n");
    expect(lines[0]).toBe("InvoiceNo,Customer,InvoiceDate,DueDate,Item(Product/Service),ItemDescription,ItemAmount");
    expect(lines[1]).toBe("WOPHA-2026-1,101 Planters Way,2026-01-01,2026-04-30,HOA Annual Dues 2026,Annual dues 2026: 101 Planters Way,600.00");
    expect(lines.length).toBe(3);
  });

  it("qbo-invoices honors only=unpaid and falls back to Jan 1 when dues_due_date is unset", async () => {
    const db = fakeDb([
      { match: "p.id AS payment_id", results: [
        { id: 1, address: "101 Planters Way", payment_id: 11 },
        { id: 2, address: "102 Planters Way", payment_id: null },
      ] },
      { match: "FROM settings", first: null },
    ]);
    const res = await onRequestGet({ request: req("?year=2026&format=qbo-invoices&only=unpaid"), env: { DB: db } });
    const lines = (await res.text()).split("\n");
    expect(lines.length).toBe(2);
    expect(lines[1]).toBe("WOPHA-2026-2,102 Planters Way,2026-01-01,2026-01-01,HOA Annual Dues 2026,Annual dues 2026: 102 Planters Way,535.00");
  });

  it("qbo-payments: reference rows for the year's paid households", async () => {
    const db = fakeDb([
      { match: "JOIN households h ON h.id = p.household_id", results: [
        { address: "101 Planters Way", amount_cents: 53500, method: "stripe", paid_on: "2026-03-01", note: "" },
        { address: "102 Planters Way", amount_cents: 50000, method: "check", paid_on: "2026-03-15", note: "check #204" },
      ] },
    ]);
    const res = await onRequestGet({ request: req("?year=2026&format=qbo-payments"), env: { DB: db } });
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="wopha-qbo-payments-2026.csv"');
    expect(await res.text()).toBe([
      "Date,Description,Amount",
      "2026-03-01,\"Dues 2026: 101 Planters Way, stripe\",535.00",
      "2026-03-15,\"Dues 2026: 102 Planters Way, check, check #204\",500.00",
    ].join("\n"));
  });

  it("format=board is byte-identical to no format at all", async () => {
    const a = await onRequestGet({ request: req("?year=2026"), env: { DB: boardDb() } });
    const b = await onRequestGet({ request: req("?year=2026&format=board"), env: { DB: boardDb() } });
    expect(await b.text()).toBe(await a.text());
    expect(b.headers.get("Content-Disposition")).toBe(a.headers.get("Content-Disposition"));
  });

  it("rejects unknown formats with 400", async () => {
    const res = await onRequestGet({ request: req("?format=qbo-everything"), env: { DB: fakeDb([]) } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Unknown format");
  });
});
