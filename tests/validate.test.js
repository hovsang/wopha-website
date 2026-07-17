import { describe, it, expect } from "vitest";
import {
  validateSubmission,
  validateAnnouncement,
  validatePayment,
  validateContent,
  validateSetting,
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
  it("rejects oversized field names", () => {
    const fields = {};
    fields["k".repeat(101)] = "x";
    expect(validateSubmission("suggestion", fields, "").ok).toBe(false);
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

describe("malformed top-level input", () => {
  it("rejects null/undefined/array fields in validateSubmission", () => {
    expect(validateSubmission("suggestion", null, "").ok).toBe(false);
    expect(validateSubmission("suggestion", undefined, "").ok).toBe(false);
    expect(validateSubmission("suggestion", ["x"], "").ok).toBe(false);
  });
  it("rejects null input in validateAnnouncement and validatePayment", () => {
    expect(validateAnnouncement(null).ok).toBe(false);
    expect(validatePayment(null).ok).toBe(false);
    expect(validateAnnouncement(undefined).ok).toBe(false);
    expect(validatePayment(undefined).ok).toBe(false);
  });
});

describe("validateSetting", () => {
  it("accepts allowlisted keys with valid values", () => {
    expect(validateSetting("dues_cents", "53500")).toEqual({ ok: true, value: "53500" });
    expect(validateSetting("dues_due_date", "2026-04-30")).toEqual({ ok: true, value: "2026-04-30" });
    expect(validateSetting("quickbooks_url", "https://app.qbo.intuit.com/app/customers"))
      .toEqual({ ok: true, value: "https://app.qbo.intuit.com/app/customers" });
  });
  it("rejects unknown keys", () => {
    expect(validateSetting("theme", "dark").ok).toBe(false);
    expect(validateSetting("", "x").ok).toBe(false);
  });
  it("range-checks dues_cents as a positive integer number of cents", () => {
    expect(validateSetting("dues_cents", "0").ok).toBe(false);
    expect(validateSetting("dues_cents", "-100").ok).toBe(false);
    expect(validateSetting("dues_cents", "535.5").ok).toBe(false);
    expect(validateSetting("dues_cents", "1000001").ok).toBe(false);
    expect(validateSetting("dues_cents", "").ok).toBe(false);
  });
  it("requires YYYY-MM-DD for dues_due_date but allows empty to clear it", () => {
    expect(validateSetting("dues_due_date", "Apr 30").ok).toBe(false);
    expect(validateSetting("dues_due_date", "2026-4-30").ok).toBe(false);
    expect(validateSetting("dues_due_date", "")).toEqual({ ok: true, value: "" });
  });
  it("requires an https URL for quickbooks_url but allows empty to clear it", () => {
    expect(validateSetting("quickbooks_url", "http://app.qbo.intuit.com").ok).toBe(false);
    expect(validateSetting("quickbooks_url", "not a url").ok).toBe(false);
    expect(validateSetting("quickbooks_url", "https://" + "a".repeat(500)).ok).toBe(false);
    expect(validateSetting("quickbooks_url", "")).toEqual({ ok: true, value: "" });
  });
});
