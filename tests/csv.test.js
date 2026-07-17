import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, safeCell, csvResponse } from "../functions/api/_lib/csv.js";

describe("parseCsv", () => {
  it("parses plain rows", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("handles quoted fields with commas and escaped quotes", () => {
    expect(parseCsv('"101 Main St, Apt 2",Lee\n"say ""hi""",x'))
      .toEqual([["101 Main St, Apt 2", "Lee"], ['say "hi"', "x"]]);
  });
  it("handles CRLF line endings and skips trailing blank line", () => {
    expect(parseCsv("a,b\r\nc,d\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("toCsv", () => {
  it("round-trips values that need quoting", () => {
    const rows = [["addr, with comma", 'quote " inside'], ["plain", "x"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe("safeCell", () => {
  it("prefixes cells that spreadsheets would execute as formulas", () => {
    expect(safeCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(safeCell("+1")).toBe("'+1");
    expect(safeCell("-1")).toBe("'-1");
    expect(safeCell("@cmd")).toBe("'@cmd");
  });
  it("leaves ordinary values (and null/undefined) alone", () => {
    expect(safeCell("101 Planters Way")).toBe("101 Planters Way");
    expect(safeCell("")).toBe("");
    expect(safeCell(null)).toBe("");
    expect(safeCell(undefined)).toBe("");
  });
});

describe("csvResponse", () => {
  it("serializes rows with attachment headers", async () => {
    const res = csvResponse("test.csv", [["a", "b"], ["1", "with,comma"]]);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="test.csv"');
    expect(await res.text()).toBe('a,b\n1,"with,comma"');
  });
});
