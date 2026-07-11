import { describe, it, expect } from "vitest";
import {
  validateSubmission,
  validateAnnouncement,
  validatePayment,
  validateContent,
} from "../functions/api/_lib/validate.js";

describe("validateSubmission", () => {
  it("accepts a known form type with normal fields", () => {
    expect(validateSubmission("issue_report", { message: "gate broken" }, "").ok).toBe(true);
  });
  it("rejects when the honeypot is filled", () => {
    expect(validateSubmission("issue_report", { message: "x" }, "on").ok).toBe(false);
  });
  it("rejects unknown form types", () => {
    expect(validateSubmission("hack", { message: "x" }, "").ok).toBe(false);
  });
  it("rejects empty submissions and oversized fields", () => {
    expect(validateSubmission("suggestion", {}, "").ok).toBe(false);
    expect(validateSubmission("suggestion", { message: "a".repeat(4001) }, "").ok).toBe(false);
  });
});

describe("validateAnnouncement", () => {
  it("accepts and trims a valid announcement", () => {
    const r = validateAnnouncement({ title: " Pool opens ", body: "May 17.", pinned_until: null });
    expect(r.ok).toBe(true);
    expect(r.value.title).toBe("Pool opens");
    expect(r.value.pinned_until).toBe(null);
  });
  it("accepts a valid pin date and rejects a bad one", () => {
    expect(validateAnnouncement({ title: "t", body: "b", pinned_until: "2026-08-01" }).ok).toBe(true);
    expect(validateAnnouncement({ title: "t", body: "b", pinned_until: "next week" }).ok).toBe(false);
  });
  it("rejects missing title or body", () => {
    expect(validateAnnouncement({ title: "", body: "b" }).ok).toBe(false);
    expect(validateAnnouncement({ title: "t", body: "  " }).ok).toBe(false);
  });
});

describe("validatePayment", () => {
  const good = { household_id: 3, year: 2026, amount_cents: 53500, method: "check", paid_on: "2026-03-01" };
  it("accepts a valid payment", () => {
    const r = validatePayment(good);
    expect(r.ok).toBe(true);
    expect(r.value.amount_cents).toBe(53500);
  });
  it("coerces numeric strings from JSON", () => {
    expect(validatePayment({ ...good, household_id: "3", amount_cents: "53500" }).ok).toBe(true);
  });
  it("rejects bad method, date, amount", () => {
    expect(validatePayment({ ...good, method: "cash" }).ok).toBe(false);
    expect(validatePayment({ ...good, paid_on: "3/1/26" }).ok).toBe(false);
    expect(validatePayment({ ...good, amount_cents: 0 }).ok).toBe(false);
    expect(validatePayment({ ...good, amount_cents: 53500.5 }).ok).toBe(false);
  });
});

describe("validateContent", () => {
  it("accepts a known key with [label, value] pairs", () => {
    expect(validateContent("pool_hours", [["Monday", "11–8"]]).ok).toBe(true);
  });
  it("rejects unknown keys and malformed rows", () => {
    expect(validateContent("nope", [["a", "b"]]).ok).toBe(false);
    expect(validateContent("pool_hours", "not an array").ok).toBe(false);
    expect(validateContent("pool_hours", [["only one cell"]]).ok).toBe(false);
    expect(validateContent("pool_hours", [[1, 2]]).ok).toBe(false);
  });
});
