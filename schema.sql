-- WOPHA portal schema. Idempotent: safe to re-run.
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned_until TEXT,                -- YYYY-MM-DD or NULL
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_type TEXT NOT NULL,          -- contact_update | issue_report | suggestion | arc_request | sponsor_inquiry
  fields TEXT NOT NULL,             -- JSON object of submitted fields
  status TEXT NOT NULL DEFAULT 'new',  -- new | in_progress | done
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS households (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL UNIQUE,
  owner_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  household_id INTEGER NOT NULL REFERENCES households(id),
  year INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL,             -- stripe | zelle | check | other
  paid_on TEXT NOT NULL,            -- YYYY-MM-DD
  note TEXT NOT NULL DEFAULT '',
  UNIQUE(household_id, year)
);

CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,             -- season_glance | pool_hours
  value TEXT NOT NULL,              -- JSON array of [label, value] pairs
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,             -- allowlisted in _lib/validate.js (SETTING_KEYS)
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
