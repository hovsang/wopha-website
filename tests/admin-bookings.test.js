import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/admin/bookings.js";
import { onRequestDelete } from "../functions/api/admin/bookings/[id].js";
import { FACILITY_IDS } from "../functions/api/_lib/bookings.js";
import { fakeDb } from "./helpers/fake-db.js";

afterEach(() => vi.restoreAllMocks());

function getReq(qs) {
  return new Request("http://localhost:8200/api/admin/bookings" + (qs || ""));
}
function postReq(body) {
  return new Request("http://localhost:8200/api/admin/bookings", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("GET /api/admin/bookings", () => {
  it("lists active rows for the range with full details for the board", async () => {
    const rows = [{
      id: 1, facility: "court-1", date: "2026-07-18", start_time: "08:30", end_time: "10:00",
      name: "Alex Morgan", email: "alex@example.com", address: "101 Planters Way",
      status: "booked", created_at: "2026-07-16 12:00:00",
    }];
    const db = fakeDb([{ match: "FROM bookings", results: rows }]);
    const body = await (await onRequestGet({ request: getReq("?from=2026-07-18&days=7"), env: { DB: db } })).json();
    expect(body.from).toBe("2026-07-18");
    expect(body.days).toBe(7);
    expect(body.bookings).toEqual(rows);
    expect(body.facilities.length).toBe(FACILITY_IDS.length);
    expect(db.calls[0].args).toEqual(["2026-07-18", "2026-07-24"]);
  });
  it("defaults to 14 days from today ET and caps the range at 60", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 6, 17, 15, 0)); // 2026-07-17 ET
    const db = fakeDb([{ match: "FROM bookings", results: [] }]);
    const body = await (await onRequestGet({ request: getReq(""), env: { DB: db } })).json();
    expect(body.from).toBe("2026-07-17");
    expect(db.calls[0].args).toEqual(["2026-07-17", "2026-07-30"]);
    const capped = fakeDb([{ match: "FROM bookings", results: [] }]);
    const b2 = await (await onRequestGet({ request: getReq("?from=2026-07-01&days=999"), env: { DB: capped } })).json();
    expect(b2.days).toBe(60);
  });
});

describe("POST /api/admin/bookings (block-outs)", () => {
  it("creates one blocked row per facility, expanding all, in one batch", async () => {
    const db = fakeDb([]);
    const res = await onRequestPost({
      request: postReq({ facility: "all", date: "2026-07-20", start: "08:00", end: "13:45", reason: "Swim meet" }),
      env: { DB: db },
    });
    expect(await res.json()).toEqual({ ok: true, created: FACILITY_IDS.length });
    expect(db.calls).toEqual([{ batch: FACILITY_IDS.length }]);
  });
  it("400s on validation failures without touching the DB", async () => {
    const db = fakeDb([]);
    const res = await onRequestPost({
      request: postReq({ facility: "gym", date: "2026-07-20", start: "08:00", end: "09:00", reason: "x" }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
});

describe("DELETE /api/admin/bookings/:id", () => {
  it("cancels bookings and block-outs, 404s when already gone", async () => {
    const db = fakeDb([{ match: "UPDATE bookings", run: { meta: { changes: 1 } } }]);
    expect(await (await onRequestDelete({ env: { DB: db }, params: { id: "5" } })).json()).toEqual({ ok: true });
    expect(db.calls[0].args).toEqual([5]);
    const gone = fakeDb([{ match: "UPDATE bookings", run: { meta: { changes: 0 } } }]);
    expect((await onRequestDelete({ env: { DB: gone }, params: { id: "5" } })).status).toBe(404);
  });
});
