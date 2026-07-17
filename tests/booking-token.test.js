import { describe, it, expect } from "vitest";
import { cancelToken, verifyCancelToken } from "../functions/api/_lib/booking-token.js";

const ENV = { BOOKING_TOKEN_SECRET: "test-secret" };

describe("cancelToken / verifyCancelToken", () => {
  it("is deterministic 64-char hex for the same id and secret", async () => {
    const t = await cancelToken(ENV, 7);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(await cancelToken(ENV, 7)).toBe(t);
  });
  it("changes with the id and with the secret", async () => {
    const t = await cancelToken(ENV, 7);
    expect(await cancelToken(ENV, 8)).not.toBe(t);
    expect(await cancelToken({ BOOKING_TOKEN_SECRET: "other" }, 7)).not.toBe(t);
  });
  it("verifies matching tokens and rejects everything else", async () => {
    const t = await cancelToken(ENV, 7);
    expect(await verifyCancelToken(ENV, 7, t)).toBe(true);
    expect(await verifyCancelToken(ENV, 8, t)).toBe(false);
    const flipped = t.slice(0, 63) + (t[63] === "0" ? "1" : "0");
    expect(await verifyCancelToken(ENV, 7, flipped)).toBe(false);
    expect(await verifyCancelToken(ENV, 7, "")).toBe(false);
    expect(await verifyCancelToken(ENV, 7, null)).toBe(false);
  });
  it("falls back to a dev secret when BOOKING_TOKEN_SECRET is unset", async () => {
    const t = await cancelToken({}, 7);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyCancelToken({}, 7, t)).toBe(true);
    expect(t).not.toBe(await cancelToken(ENV, 7));
  });
});
