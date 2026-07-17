import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/admin/summary.js";
import { fakeDb } from "./helpers/fake-db.js";

function summaryDb() {
  return fakeDb([
    { match: "COUNT(*) AS n FROM households", first: { n: 170 } },
    { match: "COUNT(*) AS n FROM payments", first: { n: 120 } },
    { match: "SUM(amount_cents)", first: { c: 6420000 } },
    { match: "FROM submissions", first: { n: 3 } },
    { match: "FROM announcements", first: { title: "Pool opens May 17", created_at: "2026-05-01 12:00:00" } },
  ]);
}

describe("GET /api/admin/summary", () => {
  it("adds collectedCents and adminEmail to the dashboard numbers", async () => {
    const res = await onRequestGet({ env: { DB: summaryDb() }, data: { adminEmail: "treasurer@wopha.com" } });
    const body = await res.json();
    expect(body.year).toBe(new Date().getFullYear());
    expect(body.households).toBe(170);
    expect(body.paid).toBe(120);
    expect(body.collectedCents).toBe(6420000);
    expect(body.newSubmissions).toBe(3);
    expect(body.latestAnnouncement).toEqual({ title: "Pool opens May 17", created_at: "2026-05-01 12:00:00" });
    expect(body.adminEmail).toBe("treasurer@wopha.com");
  });
  it("returns an empty-string adminEmail when middleware data is absent (defensive)", async () => {
    const res = await onRequestGet({ env: { DB: summaryDb() } });
    expect((await res.json()).adminEmail).toBe("");
  });
});
