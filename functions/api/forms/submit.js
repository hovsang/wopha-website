import { validateSubmission } from "../_lib/validate.js";

const SUBJECTS = {
  contact_update: "WOPHA contact info update",
  issue_report: "WOPHA issue report",
  suggestion: "WOPHA suggestion",
  arc_request: "WOPHA exterior change request",
};

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return new Response("Bad request", { status: 400 });

  const formType = String(form.get("form_type") || "");
  const botcheck = String(form.get("botcheck") || "");
  const fields = {};
  for (const [key, value] of form.entries()) {
    if (key === "form_type" || key === "botcheck" || key === "access_key" || key === "subject") continue;
    if (typeof value !== "string" || value === "") continue; // skip files and empty optionals
    fields[key] = value;
  }

  const check = validateSubmission(formType, fields, botcheck);
  if (!check.ok) return new Response(check.error, { status: 400 });

  await env.DB.prepare("INSERT INTO submissions (form_type, fields) VALUES (?, ?)")
    .bind(formType, JSON.stringify(fields))
    .run();

  // Email notification is best-effort: the submission is already stored, so
  // a Web3Forms outage must not fail the resident's submit.
  if (env.WEB3FORMS_KEY) {
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject: SUBJECTS[formType],
          ...fields,
        }),
      });
    } catch (_) { /* ignore */ }
  }

  return Response.redirect(new URL("/thanks.html", request.url).toString(), 303);
}
