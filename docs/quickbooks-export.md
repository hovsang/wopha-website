# QuickBooks export — rationale & treasurer runbook

**Decision (2026-07, redesign spec §5): QuickBooks integration is a link plus
one-way CSV export. D1 is the ledger of record. There is no sync.**

## What the portal provides

- **Open QuickBooks ↗** button (Ledger screen) — plain external link to the URL
  stored in the `quickbooks_url` setting (Portal → Settings). No URL, no button.
- Three CSV downloads on the Exports tab, all from
  `GET /api/admin/ledger-export?year=YYYY&format=...`:
  | Format | File | Use |
  |---|---|---|
  | `qbo-customers` | `wopha-qbo-customers.csv` | seed/refresh QBO's customer list (year-independent) |
  | `qbo-invoices` | `wopha-qbo-invoices-<year>.csv` | optional accrual workflow; supports `only=unpaid` |
  | `qbo-payments` | `wopha-qbo-payments-<year>.csv` | REFERENCE list for the cash workflow — never import as transactions |

## Why CSV — and why NOT the QBO API or IIF (do not relitigate)

- **IIF is a dead end:** QuickBooks *Online* cannot import IIF at all. It is a
  QuickBooks Desktop format, deprecated by Intuit since 2019.
- **The QBO API was rejected deliberately**, not overlooked: it requires an
  Intuit developer account, OAuth tokens that expire after ~100 days of
  inactivity, a production-key compliance review, an entity-ID mapping table,
  and dedupe logic. That is a standing operational liability that outlives
  every volunteer treasurer, to save minutes per year at ~170 payments.
  Silent failure modes (lapsed tokens, half-pushed batches) are the worst kind
  for a volunteer board. Nothing here forecloses the API later — if the board
  ever has ongoing dev help, revisit it; until then, CSV.
- CSV has zero external dependencies, no secrets to rotate, survives treasurer
  turnover (QBO's importer is a documented end-user feature), and fails loudly
  (QBO previews and reports row errors). One-way stays one-way structurally:
  no Intuit credentials exist anywhere in this codebase.

## The double-booking caveat (read before importing anything)

The treasurer's QBO bank feed already ingests Stripe payouts, Zelle deposits,
and deposited checks. **If you also import payment transactions, income is
booked twice.** Pick one workflow:

- **Cash-basis (recommended default):** the bank feed books income, exactly as
  today. Use `wopha-qbo-customers.csv` once to seed the customer list, and use
  `wopha-qbo-payments-<year>.csv` only as a *reference* to categorize and memo
  bank-feed deposits (who/what/when). Import nothing as transactions.
- **Accrual / A-R (optional):** import `wopha-qbo-invoices-<year>.csv` **once
  per year** via QBO's native invoice importer to get "who owes us" inside QBO;
  payments are then received against invoices via bank-feed matching. Verify
  the invoice-import feature exists on the association's QBO tier first.

## Import runbook (mirrored in the portal help popover)

1. In QBO: gear icon → **Import data** → **Customers** → upload
   `wopha-qbo-customers.csv` → map columns → import.
2. (Accrual only, once per year) gear icon → **Import data** → **Invoices** →
   upload `wopha-qbo-invoices-<year>.csv`. QBO auto-creates the service item
   `HOA Annual Dues <year>` and any missing customers.
3. Invoice numbers are deterministic (`WOPHA-<year>-<household_id>`), so an
   accidental re-import collides visibly in QBO instead of duplicating.
4. Never import `wopha-qbo-payments-<year>.csv` as transactions — see above.
5. Mark payments in the portal as they arrive; D1 stays the source of truth.

## Data mapping & known imperfect fits

- Customer display name = **street address** (unique in D1 and QBO; survives
  owner turnover). Owner name maps to Company Name. City/state/ZIP are
  whole-subdivision constants in `functions/api/_lib/qbo.js` — **confirm the
  ZIP (currently 30047) with the board before the first real import.**
- `DueDate` comes from the `dues_due_date` setting; unset falls back to Jan 1
  of the export year. Amounts come from the `dues_cents` setting.
- No partial payments: D1 stores one payment per household-year
  (`UNIQUE(household_id, year)`), so the export cannot represent installments.
  This stays until Stripe auto-reconciliation lands; the payments export
  iterates payment rows, so it survives that migration unchanged.
- Stripe fee netting stays a manual treasurer task (D1 records gross dues; the
  bank feed shows net payouts). Refunds/NSF = manual credit memos in QBO; the
  export never emits negative rows. QBO cannot CSV-import sales receipts —
  that is why the cash workflow uses the bank feed plus a reference list.
- **Residents pay via the planned Stripe flow, never through QBO payment
  links** — routing residents through QBO would move payment truth out of D1
  and break the ledger-of-record model.

## Security notes

- All export formats live behind the Cloudflare Access gate on
  `/api/admin/*`. `DEMO_OPEN_ADMIN` must be removed before real resident data
  exists (launch checklist §7) — these exports raise the stakes: they carry
  the full resident PII set.
- Every text cell in every format passes through `safeCell`
  (`functions/api/_lib/csv.js`) to neutralize spreadsheet formula injection.
