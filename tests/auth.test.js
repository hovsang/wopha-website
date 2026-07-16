import { describe, it, expect } from "vitest";
import { adminEmailFor } from "../functions/api/_lib/auth.js";

function req(url, headers) {
  return new Request(url, { headers: headers || {} });
}

describe("adminEmailFor", () => {
  it("allows local dev hosts without a header", () => {
    expect(adminEmailFor(req("http://localhost:8200/api/admin/summary"))).toBe("dev@localhost");
    expect(adminEmailFor(req("http://127.0.0.1:8200/api/admin/summary"))).toBe("dev@localhost");
  });

  it("returns the Access email on production hosts", () => {
    const r = req("https://wopha.com/api/admin/summary", {
      "cf-access-authenticated-user-email": "treasurer@wopha.com",
    });
    expect(adminEmailFor(r)).toBe("treasurer@wopha.com");
  });

  it("returns null on production hosts without the Access header", () => {
    expect(adminEmailFor(req("https://wopha.com/api/admin/summary"))).toBe(null);
  });

  it("opens admin to everyone only when DEMO_OPEN_ADMIN is exactly '1'", () => {
    const r = req("https://wopha-website.pages.dev/api/admin/summary");
    expect(adminEmailFor(r, { DEMO_OPEN_ADMIN: "1" })).toBe("demo@wopha.com");
    expect(adminEmailFor(r, { DEMO_OPEN_ADMIN: "true" })).toBe(null);
    expect(adminEmailFor(r, {})).toBe(null);
  });
});
