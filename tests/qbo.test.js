import { describe, it, expect } from "vitest";
import { qboCustomerRows, qboInvoiceRows, qboPaymentRows } from "../functions/api/_lib/qbo.js";

const HOUSEHOLDS = [
  { id: 1, address: "101 Planters Way", owner_name: "Alex Morgan", email: "alex@x.com", phone: "770-555-0101" },
  { id: 2, address: "=102 Planters Way", owner_name: "-Sam Lee", email: "", phone: "" },
];

describe("qboCustomerRows", () => {
  it("builds a header plus one row per household with address as display name", () => {
    const rows = qboCustomerRows(HOUSEHOLDS);
    expect(rows.length).toBe(3);
    expect(rows[0]).toEqual(["Name", "Company Name", "Email", "Phone", "Street", "City", "State", "ZIP"]);
    expect(rows[1]).toEqual([
      "101 Planters Way", "Alex Morgan", "alex@x.com", "770-555-0101",
      "101 Planters Way", "Lilburn", "GA", "30047",
    ]);
  });
  it("guards every data cell with safeCell", () => {
    expect(qboCustomerRows(HOUSEHOLDS)[2]).toEqual([
      "'=102 Planters Way", "'-Sam Lee", "", "",
      "'=102 Planters Way", "Lilburn", "GA", "30047",
    ]);
  });
});

describe("qboInvoiceRows", () => {
  it("builds deterministic invoice numbers, the derived service item, and dollar amounts", () => {
    const rows = qboInvoiceRows(HOUSEHOLDS, 2026, 53500, "2026-04-30");
    expect(rows[0]).toEqual([
      "InvoiceNo", "Customer", "InvoiceDate", "DueDate",
      "Item(Product/Service)", "ItemDescription", "ItemAmount",
    ]);
    expect(rows[1]).toEqual([
      "WOPHA-2026-1", "101 Planters Way", "2026-01-01", "2026-04-30",
      "HOA Annual Dues 2026", "Annual dues 2026: 101 Planters Way", "535.00",
    ]);
    expect(rows[2][0]).toBe("WOPHA-2026-2");
    expect(rows[2][1]).toBe("'=102 Planters Way");
  });
  it("returns only the header for an empty household list", () => {
    expect(qboInvoiceRows([], 2026, 53500, "2026-04-30")).toEqual([[
      "InvoiceNo", "Customer", "InvoiceDate", "DueDate",
      "Item(Product/Service)", "ItemDescription", "ItemAmount",
    ]]);
  });
});

describe("qboPaymentRows", () => {
  it("builds Date/Description/Amount reference rows, appending the note when present", () => {
    const rows = qboPaymentRows([
      { address: "101 Planters Way", amount_cents: 53500, method: "stripe", paid_on: "2026-03-01", note: "" },
      { address: "102 Planters Way", amount_cents: 50000, method: "check", paid_on: "2026-03-15", note: "check #204" },
    ], 2026);
    expect(rows).toEqual([
      ["Date", "Description", "Amount"],
      ["2026-03-01", "Dues 2026: 101 Planters Way, stripe", "535.00"],
      ["2026-03-15", "Dues 2026: 102 Planters Way, check, check #204", "500.00"],
    ]);
  });
});
