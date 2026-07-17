import { describe, it, expect } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/bookings/cancel.js";
import { cancelToken } from "../functions/api/_lib/booking-token.js";
import { fakeDb } from "./helpers/fake-db.js";

const ENV = { BOOKING_TOKEN_SECRET: "test-secret" };
const ROW = { facility: "court-1", date: "2026-07-18", start_time: "08:30", end_time: "10:00", status: "booked" };

function getReq(id, token) {
  return new Request("http://localhost:8200/api/bookings/cancel?id=" + id + "&token=" + token);
}
function postReq(body) {
  return new Request("http://localhost:8200/api/bookings/cancel", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("GET /api/bookings/cancel", () => {
  it("returns slot details (no PII) for a valid token", async () => {
    const token = await cancelToken(ENV, 42);
    const db = fakeDb([{ match: "FROM bookings", first: ROW }]);
    const res = await onRequestGet({ request: getReq(42, token), env: { ...ENV, DB: db } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      facility: "court-1", label: "Tennis court 1",
      date: "2026-07-18", start: "08:30", end: "10:00", status: "booked",
    });
  });
  it("404s on a bad token (without touching the DB) or a missing booking", async () => {
    const db = fakeDb([{ match: "FROM bookings", first: ROW }]);
    expect((await onRequestGet({ request: getReq(42, "f".repeat(64)), env: { ...ENV, DB: db } })).status).toBe(404);
    expect(db.calls.length).toBe(0);
    const token = await cancelToken(ENV, 42);
    const gone = fakeDb([{ match: "FROM bookings", first: null }]);
    expect((await onRequestGet({ request: getReq(42, token), env: { ...ENV, DB: gone } })).status).toBe(404);
  });
});

describe("POST /api/bookings/cancel", () => {
  it("cancels a booked slot with a valid token, idempotently", async () => {
    const token = await cancelToken(ENV, 42);
    const db = fakeDb([
      { match: "SELECT status", first: { status: "booked" } },
      { match: "UPDATE bookings", run: { meta: { changes: 1 } } },
    ]);
    const res = await onRequestPost({ request: postReq({ id: 42, token }), env: { ...ENV, DB: db } });
    expect(await res.json()).toEqual({ ok: true });
    expect(db.calls.find((c) => c.sql.includes("UPDATE bookings")).args).toEqual([42]);
    const done = fakeDb([{ match: "SELECT status", first: { status: "cancelled" } }]);
    expect((await onRequestPost({ request: postReq({ id: 42, token }), env: { ...ENV, DB: done } })).status).toBe(200);
    expect(done.calls.some((c) => c.sql.includes("UPDATE"))).toBe(false);
  });
  it("404s on bad tokens and never reaches block-outs through the public path", async () => {
    const db = fakeDb([]);
    expect((await onRequestPost({ request: postReq({ id: 42, token: "nope" }), env: { ...ENV, DB: db } })).status).toBe(404);
    expect(db.calls.length).toBe(0);
    const token = await cancelToken(ENV, 43);
    const blocked = fakeDb([{ match: "SELECT status", first: null }]); // status != 'blocked' filter finds nothing
    expect((await onRequestPost({ request: postReq({ id: 43, token }), env: { ...ENV, DB: blocked } })).status).toBe(404);
  });
});
