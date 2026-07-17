import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/households.js";
import { onRequestPut } from "../functions/api/admin/households/[id].js";
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

function putReq(body) {
  return new Request("http://localhost:8200/api/admin/households/3", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PUT /api/admin/households/:id", () => {
  it("updates only the provided fields and returns ok", async () => {
    const db = fakeDb([{ match: "UPDATE households SET" }]);
    const res = await onRequestPut({
      request: putReq({ owner_name: "New Owner", email: "new@x.com" }),
      env: { DB: db }, params: { id: "3" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls[0].sql).toBe("UPDATE households SET owner_name = ?, email = ? WHERE id = ?");
    expect(db.calls[0].args).toEqual(["New Owner", "new@x.com", 3]);
  });
  it("404s on an unknown id", async () => {
    const db = fakeDb([{ match: "UPDATE households SET", run: { meta: { changes: 0 } } }]);
    const res = await onRequestPut({
      request: putReq({ owner_name: "X" }), env: { DB: db }, params: { id: "999" },
    });
    expect(res.status).toBe(404);
  });
  it("400s on bad ids, empty bodies, and empty addresses — without touching the DB", async () => {
    const db = fakeDb([]);
    expect((await onRequestPut({ request: putReq({ owner_name: "X" }), env: { DB: db }, params: { id: "abc" } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({}), env: { DB: db }, params: { id: "3" } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({ address: "" }), env: { DB: db }, params: { id: "3" } })).status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
  it("400s when the new address collides with another household", async () => {
    const db = fakeDb([{ match: "UPDATE households SET", error: "UNIQUE constraint failed: households.address" }]);
    const res = await onRequestPut({
      request: putReq({ address: "101 Planters Way" }), env: { DB: db }, params: { id: "3" },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("That address is already on file");
  });
});
