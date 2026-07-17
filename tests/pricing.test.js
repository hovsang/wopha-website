import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import pricing from "../src/_data/pricing.json";
import { PLAN_KEYS } from "../functions/api/_lib/validate.js";

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
  it("enforces the $0-floor: only F-tagged (verified) items may sit in verified_cancellations", () => {
    // The plan's honesty rule: V-tagged (unverified) items like RMC [V1], SwimTopia
    // [V2], and Weebly [V3] belong only in pending_cancellations. This makes the
    // tripwire real, not true-only-by-construction: it fails the moment a V-tagged
    // item lands in the verified array, not just when the literal word "swimtopia"
    // appears there.
    for (const t of pricing.tiers) {
      for (const c of t.verified_cancellations) {
        expect(c.source, `${t.id}: "${c.label}" is in verified_cancellations`).toMatch(/^F\d$/);
      }
    }
  });
  it("carries a source tag on both top-level figures (payhoa anchor, sponsor target)", () => {
    // Global Constraints: "each figure carries its [F#]/[V#] source tag." These two
    // top-level figures aren't tier line items and aren't F1-F6 minutes facts or
    // V1-V3 pending-subscription items, so they use their own M (market anchor) and
    // T (target, not verified income) prefixes. Still a real pattern check, not a
    // loosened non-empty-string check: malformed tags still fail.
    expect(pricing.payhoa_anchor_source).toMatch(/^[FVMT]\d$/);
    expect(pricing.sponsor_target_source).toMatch(/^[FVMT]\d$/);
  });
});

describe("plan settings key stays in lockstep with the tier data", () => {
  it("PLAN_KEYS equals the pricing.json tier ids", () => {
    expect(PLAN_KEYS).toEqual(pricing.tiers.map((t) => t.id));
  });
});

describe("docs stay in sync with pricing.json", () => {
  const addendum = readFileSync("docs/board-proposal-addendum-2.md", "utf8");
  it("addendum names every tier and shows its draft gross price and the PayHOA anchor", () => {
    for (const t of pricing.tiers) {
      expect(addendum).toContain(t.name);
      expect(addendum).toContain(fmt(t.gross_monthly_cents));
    }
    expect(addendum).toContain(fmt(pricing.payhoa_anchor_monthly_cents));
  });
  it("addendum contains no em dashes (copy rule)", () => {
    expect(addendum.includes("—")).toBe(false);
  });
  it("addendum carries the verification honesty markers", () => {
    for (const tag of ["[F1]", "[F4]", "[F6]", "[V1]", "[V2]", "[V3]"]) {
      expect(addendum).toContain(tag);
    }
  });
});
