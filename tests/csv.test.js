import { describe, it, expect } from "vitest";
import { parseCsv, toCsv } from "../functions/api/_lib/csv.js";

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
