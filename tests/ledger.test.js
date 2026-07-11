import { describe, it, expect } from "vitest";
import { parseHouseholdsCsv, ledgerSummary, DUES_CENTS } from "../functions/api/_lib/ledger.js";

describe("parseHouseholdsCsv", () => {
  it("maps rows using the header, tolerating column order and case", () => {
    const r = parseHouseholdsCsv("Owner_Name,ADDRESS,email\nAlex,101 Planters Way,alex@x.com");
    expect(r.ok).toBe(true);
    expect(r.households).toEqual([
      { address: "101 Planters Way", owner_name: "Alex", email: "alex@x.com", phone: "" },
    ]);
    expect(r.errors).toEqual([]);
  });
  it("requires an address column", () => {
    expect(parseHouseholdsCsv("name,email\nAlex,a@x.com").ok).toBe(false);
  });
  it("reports rows with empty addresses but keeps the rest", () => {
    const r = parseHouseholdsCsv("address\n101 Planters Way\n\n102 Planters Way");
    expect(r.ok).toBe(true);
    expect(r.households.length).toBe(2);
    expect(r.errors.length).toBe(1);
  });
});

describe("ledgerSummary", () => {
  it("computes paid/unpaid counts and money totals", () => {
    const rows = [
      { paid: true, amount_cents: 53500 },
      { paid: true, amount_cents: 50000 },
      { paid: false, amount_cents: 0 },
    ];
    expect(ledgerSummary(rows, DUES_CENTS)).toEqual({
      total: 3,
      paidCount: 2,
      unpaidCount: 1,
      collectedCents: 103500,
      outstandingCents: 53500,
    });
  });
  it("handles an empty ledger", () => {
    expect(ledgerSummary([], DUES_CENTS)).toEqual({
      total: 0, paidCount: 0, unpaidCount: 0, collectedCents: 0, outstandingCents: 0,
    });
  });
});
