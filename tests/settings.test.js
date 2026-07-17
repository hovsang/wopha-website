import { describe, it, expect } from "vitest";
import { onRequestGet, onRequestPut, DEFAULTS } from "../functions/api/admin/settings.js";
import { SETTING_KEYS } from "../functions/api/_lib/validate.js";
import { fakeDb } from "./helpers/fake-db.js";

function putReq(body) {
  return new Request("http://localhost:8200/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/admin/settings", () => {
  it("returns every allowlisted key as a string, with defaults, on an empty table", async () => {
    const db = fakeDb([{ match: "FROM settings", results: [] }]);
    const res = await onRequestGet({ env: { DB: db } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      dues_cents: "69300",
      dues_due_date: "",
      quickbooks_url: "",
      booking_window_hours: "48",
      booking_daily_limit: "1",
      booking_weekly_limit: "3",
    });
  });
  it("overlays stored rows and drops keys that are no longer allowlisted", async () => {
    const db = fakeDb([{ match: "FROM settings", results: [
      { key: "dues_cents", value: "60000" },
      { key: "quickbooks_url", value: "https://app.qbo.intuit.com/app/customers" },
      { key: "legacy_key", value: "x" },
    ] }]);
    const res = await onRequestGet({ env: { DB: db } });
    expect(await res.json()).toEqual({
      dues_cents: "60000",
      dues_due_date: "",
      quickbooks_url: "https://app.qbo.intuit.com/app/customers",
      booking_window_hours: "48",
      booking_daily_limit: "1",
      booking_weekly_limit: "3",
    });
  });
});

describe("PUT /api/admin/settings", () => {
  it("upserts a valid setting and returns ok", async () => {
    const db = fakeDb([{ match: "INSERT INTO settings" }]);
    const res = await onRequestPut({ request: putReq({ key: "dues_cents", value: "60000" }), env: { DB: db } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls[0].args).toEqual(["dues_cents", "60000"]);
  });
  it("returns 400 for bad keys, bad values, and malformed bodies", async () => {
    const db = fakeDb([]);
    expect((await onRequestPut({ request: putReq({ key: "nope", value: "1" }), env: { DB: db } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({ key: "dues_cents", value: "-5" }), env: { DB: db } })).status).toBe(400);
    expect((await onRequestPut({ request: putReq({ key: "quickbooks_url", value: "http://x.com" }), env: { DB: db } })).status).toBe(400);
    const bad = new Request("http://localhost:8200/api/admin/settings", { method: "PUT", body: "not json" });
    expect((await onRequestPut({ request: bad, env: { DB: db } })).status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
});

describe("DEFAULTS consistency", () => {
  it("has keys that match SETTING_KEYS", () => {
    expect(Object.keys(DEFAULTS).sort()).toEqual([...SETTING_KEYS].sort());
  });
});
