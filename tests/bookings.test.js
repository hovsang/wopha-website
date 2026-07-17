import { describe, it, expect } from "vitest";
import {
  FACILITY_IDS, facilityById, slotsFor, overlaps, etParts, dateRange, availability,
  weekBounds, windowError, limitError, validateBookingRequest, validateBlockout, bookingRules,
} from "../functions/api/_lib/bookings.js";
import { fakeDb } from "./helpers/fake-db.js";

describe("FACILITIES", () => {
  it("defines the five bookable facilities with unique ids", () => {
    expect(FACILITY_IDS).toEqual(["court-1", "court-2", "pickleball-2a", "pickleball-2b", "pavilion"]);
    expect(new Set(FACILITY_IDS).size).toBe(5);
    expect(facilityById("court-1").label).toBe("Tennis court 1");
    expect(facilityById("nope")).toBe(null);
  });
});

describe("slotsFor", () => {
  it("builds the court grid: 90-minute slots from 07:00, last slot 20:30 to 22:00", () => {
    const slots = slotsFor(facilityById("court-1"));
    expect(slots.length).toBe(10);
    expect(slots[0]).toEqual({ start: "07:00", end: "08:30" });
    expect(slots[9]).toEqual({ start: "20:30", end: "22:00" });
  });
  it("builds the pavilion grid: 3-hour slots from 09:00 to 21:00", () => {
    expect(slotsFor(facilityById("pavilion"))).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "12:00", end: "15:00" },
      { start: "15:00", end: "18:00" },
      { start: "18:00", end: "21:00" },
    ]);
  });
});

describe("overlaps", () => {
  it("detects overlapping ranges and allows touching ones", () => {
    expect(overlaps("07:00", "08:30", "08:00", "09:30")).toBe(true);
    expect(overlaps("07:00", "08:30", "08:30", "10:00")).toBe(false);
    expect(overlaps("08:00", "13:45", "08:30", "10:00")).toBe(true);
  });
});

describe("etParts", () => {
  it("renders an instant as an America/New_York wall-clock date and time", () => {
    expect(etParts(Date.UTC(2026, 6, 17, 16, 30))).toEqual({ date: "2026-07-17", time: "12:30" }); // EDT, UTC-4
    expect(etParts(Date.UTC(2026, 0, 15, 2, 0))).toEqual({ date: "2026-01-14", time: "21:00" });   // EST, UTC-5
  });
});

describe("dateRange", () => {
  it("lists every date from from to to inclusive, across month ends", () => {
    expect(dateRange("2026-07-30", "2026-08-01")).toEqual(["2026-07-30", "2026-07-31", "2026-08-01"]);
    expect(dateRange("2026-07-17", "2026-07-17")).toEqual(["2026-07-17"]);
  });
});

describe("availability", () => {
  // Friday 2026-07-17 11:00 ET (15:00 UTC); a 48-hour window ends Sunday 11:00 ET.
  const NOW = Date.UTC(2026, 6, 17, 15, 0);
  it("covers every ET date in the window and marks overlapping rows busy", () => {
    const days = availability(facilityById("court-1"), [
      { date: "2026-07-18", start_time: "08:30", end_time: "10:00" },  // a grid booking
      { date: "2026-07-18", start_time: "12:00", end_time: "16:00" },  // a block-out spanning slots
    ], NOW, 48);
    expect(days.map((d) => d.date)).toEqual(["2026-07-17", "2026-07-18", "2026-07-19"]);
    const sat = days[1].slots;
    expect(sat.find((s) => s.start === "08:30").busy).toBe(true);
    expect(sat.find((s) => s.start === "11:30").busy).toBe(true);  // 11:30-13:00 clips the block
    expect(sat.find((s) => s.start === "14:30").busy).toBe(true);  // 14:30-16:00 clips the block
    expect(sat.find((s) => s.start === "16:00").busy).toBe(false); // touching, not overlapping
    expect(sat.find((s) => s.start === "07:00").busy).toBe(false);
  });
  it("marks past and beyond-window slots not bookable, and carries no PII fields", () => {
    const days = availability(facilityById("court-1"), [], NOW, 48);
    const today = days[0].slots;
    expect(today.find((s) => s.start === "10:00").bookable).toBe(false); // starts before 11:00 now
    expect(today.find((s) => s.start === "11:30").bookable).toBe(true);
    const lastDay = days[2].slots;
    expect(lastDay.find((s) => s.start === "10:00").bookable).toBe(true);  // before the 11:00 cutoff
    expect(lastDay.find((s) => s.start === "11:30").bookable).toBe(false); // beyond the 48-hour window
    expect(Object.keys(today[0]).sort()).toEqual(["bookable", "busy", "end", "start"]);
  });
});

describe("weekBounds", () => {
  it("returns the Monday-to-Sunday week containing the date", () => {
    expect(weekBounds("2026-07-17")).toEqual({ start: "2026-07-13", end: "2026-07-19" }); // a Friday
    expect(weekBounds("2026-07-13")).toEqual({ start: "2026-07-13", end: "2026-07-19" }); // a Monday
    expect(weekBounds("2026-07-19")).toEqual({ start: "2026-07-13", end: "2026-07-19" }); // a Sunday
  });
});

describe("windowError", () => {
  const NOW = Date.UTC(2026, 6, 17, 15, 0); // Fri 2026-07-17 11:00 ET
  it("rejects past slots and slots beyond the window, allows the rest", () => {
    expect(windowError("2026-07-17", "08:30", NOW, 48)).toMatch(/already passed/);
    expect(windowError("2026-07-19", "14:30", NOW, 48)).toMatch(/not open yet/);
    expect(windowError("2026-07-18", "08:30", NOW, 48)).toBe(null);
    expect(windowError("2026-07-19", "10:00", NOW, 48)).toBe(null);
  });
});

describe("validateBookingRequest", () => {
  const good = {
    facility: "court-1", date: "2026-07-18", start: "08:30",
    name: "Alex Morgan", email: " Alex@Example.com ", address: "101 Planters Way",
  };
  it("accepts a grid slot and normalizes: derives end, lowercases and trims email", () => {
    expect(validateBookingRequest(good)).toEqual({ ok: true, value: {
      facility: "court-1", date: "2026-07-18", start: "08:30", end: "10:00",
      name: "Alex Morgan", email: "alex@example.com", address: "101 Planters Way",
    } });
  });
  it("rejects unknown facilities, off-grid times, and bad dates", () => {
    expect(validateBookingRequest({ ...good, facility: "court-9" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, start: "08:00" }).ok).toBe(false); // not on the court grid
    expect(validateBookingRequest({ ...good, start: "8:30" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, date: "07/18/2026" }).ok).toBe(false);
    expect(validateBookingRequest(null).ok).toBe(false);
  });
  it("requires name, a plausible email, and address", () => {
    expect(validateBookingRequest({ ...good, name: " " }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, email: "not-an-email" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, address: "" }).ok).toBe(false);
    expect(validateBookingRequest({ ...good, name: "x".repeat(201) }).ok).toBe(false);
  });
});

describe("validateBlockout", () => {
  const good = { facility: "pavilion", date: "2026-07-20", start: "08:00", end: "13:45", reason: "Swim meet" };
  it("accepts one facility or expands all, with any HH:MM range", () => {
    expect(validateBlockout(good)).toEqual({ ok: true, value: {
      facilities: ["pavilion"], date: "2026-07-20", start: "08:00", end: "13:45", reason: "Swim meet",
    } });
    expect(validateBlockout({ ...good, facility: "all" }).value.facilities).toEqual(FACILITY_IDS);
  });
  it("rejects bad ranges, unknown facilities, and missing reasons", () => {
    expect(validateBlockout({ ...good, start: "14:00" }).ok).toBe(false); // start >= end
    expect(validateBlockout({ ...good, facility: "gym" }).ok).toBe(false);
    expect(validateBlockout({ ...good, reason: "" }).ok).toBe(false);
    expect(validateBlockout({ ...good, end: "24:00" }).ok).toBe(false);
  });
});

describe("limitError", () => {
  const RULES = { booking_window_hours: 48, booking_daily_limit: 1, booking_weekly_limit: 3 };
  const court1 = facilityById("court-1");
  const pavilion = facilityById("pavilion");
  it("caps court bookings per day per household", () => {
    expect(limitError(court1, "2026-07-18", "2026-07-17", [{ facility: "court-2", date: "2026-07-18" }], RULES))
      .toMatch(/1 per day/);
    expect(limitError(court1, "2026-07-18", "2026-07-17", [{ facility: "court-2", date: "2026-07-17" }], RULES))
      .toBe(null);
  });
  it("caps court bookings per Monday-to-Sunday week", () => {
    const rows = [
      { facility: "court-1", date: "2026-07-13" },
      { facility: "court-2", date: "2026-07-15" },
      { facility: "pickleball-2a", date: "2026-07-16" },
    ];
    expect(limitError(court1, "2026-07-18", "2026-07-17", rows, RULES)).toMatch(/3 per week/);
    expect(limitError(court1, "2026-07-20", "2026-07-17", rows, RULES)).toBe(null); // next week
  });
  it("ignores pavilion rows for court limits and allows one upcoming pavilion booking", () => {
    expect(limitError(court1, "2026-07-18", "2026-07-17", [{ facility: "pavilion", date: "2026-07-18" }], RULES))
      .toBe(null);
    expect(limitError(pavilion, "2026-07-18", "2026-07-17", [{ facility: "pavilion", date: "2026-07-18" }], RULES))
      .toMatch(/pavilion/);
    expect(limitError(pavilion, "2026-07-18", "2026-07-17", [{ facility: "pavilion", date: "2026-07-16" }], RULES))
      .toBe(null); // a pavilion booking already in the past does not count
  });
});

describe("bookingRules", () => {
  it("prefers valid settings rows and falls back to defaults otherwise", async () => {
    const db = fakeDb([{ match: "FROM settings", results: [
      { key: "booking_window_hours", value: "72" },
      { key: "booking_daily_limit", value: "garbage" },
    ] }]);
    expect(await bookingRules({ DB: db })).toEqual({
      booking_window_hours: 72, booking_daily_limit: 1, booking_weekly_limit: 3,
    });
  });
  it("survives a missing settings table", async () => {
    const db = fakeDb([{ match: "FROM settings", error: "no such table: settings" }]);
    expect(await bookingRules({ DB: db })).toEqual({
      booking_window_hours: 48, booking_daily_limit: 1, booking_weekly_limit: 3,
    });
  });
});
