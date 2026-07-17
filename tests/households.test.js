import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/households.js";
import { fakeDb } from "./helpers/fake-db.js";

describe("GET /api/admin/households (ledger year view)", () => {
  it("drives dues_cents and outstanding math from settings, not the constant", async () => {
    const db = fakeDb([
      { match: "FROM settings", first: { value: "60000" } },
      { match: "LEFT JOIN payments", results: [
        { id: 1, address: "101 Planters Way", owner_name: "Alex", email: "", phone: "",
          payment_id: 11, amount_cents: 60000, method: "check", paid_on: "2026-03-01" },
        { id: 2, address: "102 Planters Way", owner_name: "Sam", email: "", phone: "",
          payment_id: null, amount_cents: null, method: null, paid_on: null },
      ] },
    ]);
    const res = await onRequestGet({
      request: new Request("http://localhost:8200/api/admin/households?year=2026"),
      env: { DB: db },
    });
    const body = await res.json();
    expect(body.year).toBe(2026);
    expect(body.dues_cents).toBe(60000);
    expect(body.summary).toEqual({
      total: 2, paidCount: 1, unpaidCount: 1,
      collectedCents: 60000, outstandingCents: 60000,
    });
    expect(body.households.length).toBe(2);
  });
});
