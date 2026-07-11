// Input validation for everything that crosses the API boundary.
export const FORM_TYPES = ["contact_update", "issue_report", "suggestion", "arc_request"];
export const PAYMENT_METHODS = ["stripe", "zelle", "check", "other"];
export const CONTENT_KEYS = ["season_glance", "pool_hours"];

const MAX_FIELD_LENGTH = 4000;
const MAX_FIELDS = 20;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateSubmission(formType, fields, botcheck) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return { ok: false, error: "Bad submission" };
  if (botcheck) return { ok: false, error: "Rejected" };
  if (!FORM_TYPES.includes(formType)) return { ok: false, error: "Unknown form type" };
  const keys = Object.keys(fields);
  if (keys.length === 0) return { ok: false, error: "Empty submission" };
  if (keys.length > MAX_FIELDS) return { ok: false, error: "Too many fields" };
  for (const k of keys) {
    if (k.length > 100) return { ok: false, error: "Field name too long" };
    if (typeof fields[k] !== "string" || fields[k].length > MAX_FIELD_LENGTH) {
      return { ok: false, error: "Field too long: " + k };
    }
  }
  return { ok: true };
}

export function validateAnnouncement(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Bad input" };
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  const pinnedUntil = input.pinned_until || null;
  if (!title || title.length > 200) return { ok: false, error: "Title is required (max 200 characters)" };
  if (!body || body.length > MAX_FIELD_LENGTH) return { ok: false, error: "Body is required (max 4000 characters)" };
  if (pinnedUntil !== null && !DATE_RE.test(pinnedUntil)) {
    return { ok: false, error: "Pin date must be YYYY-MM-DD" };
  }
  return { ok: true, value: { title, body, pinned_until: pinnedUntil } };
}

export function validatePayment(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "Bad input" };
  const householdId = Number(input.household_id);
  const year = Number(input.year);
  const amountCents = Number(input.amount_cents);
  const method = input.method;
  const paidOn = String(input.paid_on || "");
  if (!Number.isInteger(householdId) || householdId <= 0) return { ok: false, error: "household_id is required" };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, error: "year out of range" };
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 1000000) {
    return { ok: false, error: "amount_cents must be a positive integer (max $10,000)" };
  }
  if (!PAYMENT_METHODS.includes(method)) {
    return { ok: false, error: "method must be one of: " + PAYMENT_METHODS.join(", ") };
  }
  if (!DATE_RE.test(paidOn)) return { ok: false, error: "paid_on must be YYYY-MM-DD" };
  return {
    ok: true,
    value: {
      household_id: householdId,
      year,
      amount_cents: amountCents,
      method,
      paid_on: paidOn,
      note: String(input.note || "").slice(0, 500),
    },
  };
}

export function validateContent(key, value) {
  if (!CONTENT_KEYS.includes(key)) return { ok: false, error: "Unknown content key" };
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return { ok: false, error: "Value must be a list of 1–50 rows" };
  }
  for (const row of value) {
    if (!Array.isArray(row) || row.length !== 2 ||
        typeof row[0] !== "string" || typeof row[1] !== "string" ||
        row[0].length > 200 || row[1].length > 200) {
      return { ok: false, error: "Each row must be a [label, value] pair of strings (max 200 chars)" };
    }
  }
  return { ok: true, value };
}
