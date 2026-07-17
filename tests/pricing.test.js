import { describe, it, expect } from "vitest";
import pricing from "../src/_data/pricing.json";

// Mirrors the portal's dollars() formatting (portal-shell.js) and the Eleventy
// dollars filter: whole dollars stay whole, cents show when present, negatives
// lead with -$.
export function fmt(cents) {
  const abs = (Math.abs(cents) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return (cents < 0 ? "-$" : "$") + abs;
}

describe("pricing.json shape", () => {
  it("has exactly three tiers with the locked ids, in order", () => {
    expect(pricing.tiers.map((t) => t.id)).toEqual(["essentials", "amenities", "complete"]);
    expect(new Set(pricing.tiers.map((t) => t.name)).size).toBe(3);
  });
  it("keeps every money field an integer number of cents", () => {
    const moneyFields = [];
    const walk = (obj) => {
      for (const [k, v] of Object.entries(obj)) {
        if (k.endsWith("_cents")) moneyFields.push([k, v]);
        else if (Array.isArray(v)) v.forEach((x) => typeof x === "object" && walk(x));
        else if (v && typeof v === "object") walk(v);
      }
    };
    walk(pricing);
    expect(moneyFields.length).toBeGreaterThan(10);
    for (const [k, v] of moneyFields) {
      expect(Number.isInteger(v), `${k} must be integer cents, got ${v}`).toBe(true);
    }
    for (const t of pricing.tiers) expect(t.gross_monthly_cents).toBeGreaterThan(0);
  });
  it("cites a spec source tag on every cancellation line item", () => {
    for (const t of pricing.tiers) {
      for (const c of [...t.verified_cancellations, ...t.pending_cancellations]) {
        expect(c.source).toMatch(/^[FV]\d$/);
        expect(c.label.length).toBeGreaterThan(0);
      }
    }
  });
  it("derives every net figure from the line items (no hand-math drift)", () => {
    for (const t of pricing.tiers) {
      const verified = t.verified_cancellations.reduce((a, c) => a + c.monthly_cents, 0);
      const lo = t.pending_cancellations.reduce((a, c) => a + c.low_monthly_cents, 0);
      const hi = t.pending_cancellations.reduce((a, c) => a + c.high_monthly_cents, 0);
      expect(t.verified_monthly_cents, t.id).toBe(verified);
      expect(t.pending_low_monthly_cents, t.id).toBe(lo);
      expect(t.pending_high_monthly_cents, t.id).toBe(hi);
      expect(t.net_verified_monthly_cents, t.id).toBe(t.gross_monthly_cents - verified);
      expect(t.net_confirmed_low_monthly_cents, t.id).toBe(t.net_verified_monthly_cents - hi);
      expect(t.net_confirmed_high_monthly_cents, t.id).toBe(t.net_verified_monthly_cents - lo);
    }
  });
  it("never lists SwimTopia in any savings row (V2 unverified, possibly team-paid)", () => {
    for (const t of pricing.tiers) {
      for (const c of [...t.verified_cancellations, ...t.pending_cancellations]) {
        expect(c.label.toLowerCase()).not.toContain("swimtopia");
      }
    }
  });
});
