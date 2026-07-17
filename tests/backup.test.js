import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TABLES as workerTables, keysToDelete, monthFloor } from "../workers/backup/index.js";
import { TABLES as exportTables } from "../functions/api/admin/export.js";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const schemaTables = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)]
  .map((m) => m[1]).sort();

describe("backup/export table drift", () => {
  it("backup worker TABLES matches the CREATE TABLE names in schema.sql", () => {
    expect([...workerTables].sort()).toEqual(schemaTables);
  });
  it("admin export TABLES matches the CREATE TABLE names in schema.sql", () => {
    expect([...exportTables].sort()).toEqual(schemaTables);
  });
});

describe("monthFloor", () => {
  it("computes YYYY-MM n months back, across year boundaries", () => {
    expect(monthFloor("2026-07-20T06:00:00.000Z", 11)).toBe("2025-08");
    expect(monthFloor("2026-01-05T00:00:00.000Z", 11)).toBe("2025-02");
    expect(monthFloor("2026-01-05T00:00:00.000Z", 0)).toBe("2026-01");
  });
});

describe("keysToDelete retention", () => {
  const NOW = "2026-07-20T06:00:00.000Z";
  const RECENT_8 = [
    "wopha-backup-2026-06-01.json", "wopha-backup-2026-06-08.json",
    "wopha-backup-2026-06-15.json", "wopha-backup-2026-06-22.json",
    "wopha-backup-2026-06-29.json", "wopha-backup-2026-07-06.json",
    "wopha-backup-2026-07-13.json", "wopha-backup-2026-07-20.json",
  ];
  it("deletes nothing while there are 8 or fewer weeklies", () => {
    expect(keysToDelete(RECENT_8, NOW)).toEqual([]);
    expect(keysToDelete(RECENT_8.slice(0, 3), NOW)).toEqual([]);
  });
  it("prunes older weeklies but keeps the first backup of each of the last 12 months", () => {
    const keys = [
      ...RECENT_8,
      "wopha-backup-2026-05-04.json", // first of 2026-05 → kept (monthly)
      "wopha-backup-2026-05-11.json", // pruned
      "wopha-backup-2025-08-04.json", // first of 2025-08 (12-month edge) → kept
      "wopha-backup-2025-08-11.json", // pruned
      "wopha-backup-2025-07-07.json", // month older than 12 months → pruned
      "wopha-backup-2025-06-02.json", // pruned
    ];
    expect(keysToDelete(keys, NOW)).toEqual([
      "wopha-backup-2025-06-02.json",
      "wopha-backup-2025-07-07.json",
      "wopha-backup-2025-08-11.json",
      "wopha-backup-2026-05-11.json",
    ]);
  });
  it("never touches keys that do not match the dated-backup pattern", () => {
    expect(keysToDelete(["wopha-backup-manual.json", "wopha-backup-2020-01-01.json.bak"], NOW)).toEqual([]);
  });
});
