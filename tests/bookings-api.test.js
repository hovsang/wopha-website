import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet, onRequestPost } from "../functions/api/bookings/index.js";
import { fakeDb } from "./helpers/fake-db.js";

const NOW = Date.UTC(2026, 6, 17, 15, 0); // Fri 2026-07-17 11:00 ET

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function getReq(qs) {
  return new Request("http://localhost:8200/api/bookings" + (qs || ""));
}

describe("GET /api/bookings (public availability)", () => {
  it("returns the facility list and busy/free days with zero PII", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "FROM bookings", results: [
        { date: "2026-07-18", start_time: "08:30", end_time: "10:00" },
      ] },
    ]);
    const res = await onRequestGet({ request: getReq("?facility=court-1"), env: { DB: db } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.facility).toBe("court-1");
    expect(body.window_hours).toBe(48);
    expect(body.facilities[0]).toEqual({ id: "court-1", label: "Tennis court 1" });
    expect(body.days.map((d) => d.date)).toEqual(["2026-07-17", "2026-07-18", "2026-07-19"]);
    expect(body.days[1].slots.find((s) => s.start === "08:30").busy).toBe(true);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("email");
    expect(raw).not.toContain("address");
    expect(raw).not.toContain("Alex");
  });
  it("defaults to the first facility, rejects unknown ones, scopes SQL to the window", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "FROM bookings", results: [] },
    ]);
    const body = await (await onRequestGet({ request: getReq(""), env: { DB: db } })).json();
    expect(body.facility).toBe("court-1");
    expect(db.calls.find((c) => c.sql.includes("FROM bookings")).args)
      .toEqual(["court-1", "2026-07-17", "2026-07-19"]);
    expect((await onRequestGet({ request: getReq("?facility=gym"), env: { DB: fakeDb([]) } })).status).toBe(400);
  });
});

function postReq(body) {
  return new Request("http://localhost:8200/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GOOD = {
  facility: "court-1", date: "2026-07-18", start: "08:30",
  name: "Alex Morgan", email: "alex@example.com", address: "101 Planters Way",
};

function openDb() {
  // empty settings, no prior bookings for this email, free slot
  return fakeDb([
    { match: "FROM settings", results: [] },
    { match: "WHERE email = ?", results: [] },
    { match: "start_time < ?", first: null },
    { match: "INSERT INTO bookings", run: { meta: { changes: 1, last_row_id: 42 } } },
  ]);
}

describe("POST /api/bookings", () => {
  it("books a free slot and returns a signed cancel link", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = openDb();
    const res = await onRequestPost({ request: postReq(GOOD), env: { DB: db } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe(42);
    expect(body.cancel_url).toMatch(
      /^http:\/\/localhost:8200\/amenities\/booking-cancel\/\?id=42&token=[0-9a-f]{64}$/);
    const ins = db.calls.find((c) => c.sql.includes("INSERT INTO bookings"));
    expect(ins.args).toEqual(["court-1", "2026-07-18", "08:30", "10:00",
      "Alex Morgan", "alex@example.com", "101 Planters Way"]);
  });
  it("rejects honeypot hits and invalid input with 400, before any DB work", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([]);
    expect((await onRequestPost({ request: postReq({ ...GOOD, botcheck: "1" }), env: { DB: db } })).status).toBe(400);
    expect((await onRequestPost({ request: postReq({ ...GOOD, facility: "gym" }), env: { DB: db } })).status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
  it("rejects slots outside the booking window with 400", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([{ match: "FROM settings", results: [] }]);
    const past = await onRequestPost({
      request: postReq({ ...GOOD, date: "2026-07-17", start: "08:30" }), env: { DB: db } });
    expect(past.status).toBe(400);
    expect((await past.json()).error).toMatch(/already passed/);
    const far = await onRequestPost({
      request: postReq({ ...GOOD, date: "2026-07-19", start: "14:30" }), env: { DB: db } });
    expect(far.status).toBe(400);
    expect((await far.json()).error).toMatch(/not open yet/);
  });
  it("enforces the per-household daily limit with 409", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const db = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "WHERE email = ?", results: [{ facility: "court-2", date: "2026-07-18" }] },
    ]);
    const res = await onRequestPost({ request: postReq(GOOD), env: { DB: db } });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/per day/);
  });
  it("returns 409 when the slot is taken, including the insert race", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const clash = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "WHERE email = ?", results: [] },
      { match: "start_time < ?", first: { id: 9 } },
    ]);
    expect((await onRequestPost({ request: postReq(GOOD), env: { DB: clash } })).status).toBe(409);
    const race = fakeDb([
      { match: "FROM settings", results: [] },
      { match: "WHERE email = ?", results: [] },
      { match: "start_time < ?", first: null },
      { match: "INSERT INTO bookings",
        error: "UNIQUE constraint failed: bookings.facility, bookings.date, bookings.start_time" },
    ]);
    expect((await onRequestPost({ request: postReq(GOOD), env: { DB: race } })).status).toBe(409);
  });
  it("notifies via Web3Forms only when the key is set, and never fails the booking", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const calls = [];
    vi.stubGlobal("fetch", async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return new Response("ok");
    });
    let res = await onRequestPost({ request: postReq(GOOD), env: { DB: openDb(), WEB3FORMS_KEY: "k" } });
    expect(res.status).toBe(200);
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe("https://api.web3forms.com/submit");
    expect(calls[0].body.subject).toBe("WOPHA facility booking");
    expect(calls[0].body.replyto).toBe("alex@example.com");
    expect(calls[0].body.cancel_link).toContain("/amenities/booking-cancel/");
    calls.length = 0;
    res = await onRequestPost({ request: postReq(GOOD), env: { DB: openDb() } });
    expect(res.status).toBe(200);
    expect(calls.length).toBe(0); // no key, no call
    vi.stubGlobal("fetch", async () => { throw new Error("web3forms down"); });
    res = await onRequestPost({ request: postReq(GOOD), env: { DB: openDb(), WEB3FORMS_KEY: "k" } });
    expect(res.status).toBe(200); // outage never fails the stored booking
  });
});
