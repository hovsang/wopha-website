import { describe, it, expect } from "vitest";
import { onRequestGet } from "../functions/api/content.js";
import { fakeDb } from "./helpers/fake-db.js";

describe("GET /api/content", () => {
  it("returns parsed content plus a per-key updated_at map", async () => {
    const db = fakeDb([{ match: "FROM site_content", results: [
      { key: "season_glance", value: '[["2026 annual dues","$535"]]', updated_at: "2026-07-01 10:00:00" },
      { key: "pool_hours", value: '[["Monday","11 a.m. - 8 p.m."]]', updated_at: "2026-07-02 09:00:00" },
    ] }]);
    const res = await onRequestGet({ env: { DB: db } });
    expect(await res.json()).toEqual({
      season_glance: [["2026 annual dues", "$535"]],
      pool_hours: [["Monday", "11 a.m. - 8 p.m."]],
      updated_at: {
        season_glance: "2026-07-01 10:00:00",
        pool_hours: "2026-07-02 09:00:00",
      },
    });
  });
  it("skips rows with bad JSON but keeps the rest", async () => {
    const db = fakeDb([{ match: "FROM site_content", results: [
      { key: "season_glance", value: "not json", updated_at: "2026-07-01 10:00:00" },
      { key: "pool_hours", value: '[["Monday","closed"]]', updated_at: "2026-07-02 09:00:00" },
    ] }]);
    expect(await (await onRequestGet({ env: { DB: db } })).json()).toEqual({
      pool_hours: [["Monday", "closed"]],
      updated_at: { pool_hours: "2026-07-02 09:00:00" },
    });
  });
});
