import { describe, it, expect } from "vitest";
import { onRequestPost } from "../functions/api/forms/submit.js";
import { fakeDb } from "./helpers/fake-db.js";

function formRequest(entries) {
  // URLSearchParams body: request.formData() parses application/x-www-form-urlencoded,
  // matching a real no-JS <form method="POST"> submit.
  return new Request("http://127.0.0.1:8200/api/forms/submit", {
    method: "POST",
    body: new URLSearchParams(entries),
  });
}

describe("POST /api/forms/submit", () => {
  it("stores a sponsor_inquiry submission and redirects to /thanks.html", async () => {
    const db = fakeDb([{ match: "INSERT INTO submissions" }]);
    const res = await onRequestPost({
      request: formRequest({
        form_type: "sponsor_inquiry",
        business: "Lilburn Hardware",
        name: "Pat Doe",
        email: "pat@example.com",
      }),
      env: { DB: db },
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://127.0.0.1:8200/thanks.html");
    expect(db.calls.length).toBe(1);
    expect(db.calls[0].args[0]).toBe("sponsor_inquiry");
    expect(JSON.parse(db.calls[0].args[1])).toEqual({
      business: "Lilburn Hardware",
      name: "Pat Doe",
      email: "pat@example.com",
    });
  });

  it("rejects unknown form types with 400 and no insert", async () => {
    const db = fakeDb([{ match: "INSERT INTO submissions" }]);
    const res = await onRequestPost({
      request: formRequest({ form_type: "hack", message: "x" }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect(db.calls.length).toBe(0);
  });

  it("rejects a filled honeypot with 400 and no insert", async () => {
    const db = fakeDb([{ match: "INSERT INTO submissions" }]);
    const res = await onRequestPost({
      request: formRequest({ form_type: "sponsor_inquiry", business: "B", botcheck: "on" }),
      env: { DB: db },
    });
    expect(res.status).toBe(400);
    expect(db.calls.length).toBe(0);
  });
});
