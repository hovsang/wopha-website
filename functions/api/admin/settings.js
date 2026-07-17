import { json } from "../_lib/respond.js";
import { validateSetting, SETTING_KEYS } from "../_lib/validate.js";
import { DUES_CENTS } from "../_lib/ledger.js";

// Operator-editable configuration (dues amount, dues due date, QuickBooks
// link). GET always returns every allowlisted key so the portal can render a
// settings form without null checks; values are always strings.
const DEFAULTS = {
  dues_cents: String(DUES_CENTS),
  dues_due_date: "",
  quickbooks_url: "",
};

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const out = Object.assign({}, DEFAULTS);
  for (const r of results) {
    if (SETTING_KEYS.includes(r.key)) out[r.key] = String(r.value);
  }
  return json(out);
}

export async function onRequestPut({ request, env }) {
  const input = await request.json().catch(() => ({}));
  const check = validateSetting(input.key, input.value);
  if (!check.ok) return json({ error: check.error }, 400);
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(input.key, check.value).run();
  return json({ ok: true });
}
