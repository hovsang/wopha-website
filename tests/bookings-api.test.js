import { describe, it, expect, vi, afterEach } from "vitest";
import { onRequestGet } from "../functions/api/bookings/index.js";
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
