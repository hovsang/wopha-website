import { describe, it, expect } from "vitest";
import {
  FACILITY_IDS, facilityById, slotsFor, overlaps, etParts, dateRange, availability,
} from "../functions/api/_lib/bookings.js";

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
