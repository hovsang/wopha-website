import { safeCell } from "./csv.js";

// Pure QuickBooks Online CSV row-builders — array-of-arrays in and out, so
// they are unit-testable without a Workers runtime. Every data cell passes
// through safeCell (spreadsheet formula-injection guard). The import runbook
// and the cash-vs-accrual double-booking guidance live in
// docs/quickbooks-export.md; the format dispatch lives in admin/ledger-export.js.

// Whole-subdivision address constants for the QBO customer address block.
// City/state per README (Lilburn, GA). Confirm the ZIP with the board before
// the first real import.
export const QBO_CITY = "Lilburn";
export const QBO_STATE = "GA";
export const QBO_ZIP = "30047";

// QBO: gear icon → Import data → Customers.
// Display name = address: unique in D1, unique in QBO, survives owner turnover.
export function qboCustomerRows(households) {
  return [
    ["Name", "Company Name", "Email", "Phone", "Street", "City", "State", "ZIP"],
    ...households.map((h) => [
      h.address, h.owner_name, h.email, h.phone,
      h.address, QBO_CITY, QBO_STATE, QBO_ZIP,
    ].map(safeCell)),
  ];
}

// QBO: gear icon → Import data → Invoices (accrual workflow; import once per
// year). Invoice numbers are deterministic (WOPHA-<year>-<household_id>) so a
// re-import collides on the number in QBO instead of silently duplicating.
export function qboInvoiceRows(households, year, duesCents, dueDate) {
  const amount = (duesCents / 100).toFixed(2);
  const item = "HOA Annual Dues " + year;
  return [
    ["InvoiceNo", "Customer", "InvoiceDate", "DueDate",
     "Item(Product/Service)", "ItemDescription", "ItemAmount"],
    ...households.map((h) => [
      "WOPHA-" + year + "-" + h.id,
      h.address,
      year + "-01-01",
      dueDate,
      item,
      "Annual dues " + year + " — " + h.address,
      amount,
    ].map(safeCell)),
  ];
}

// Payments REFERENCE list (cash-basis workflow): the treasurer uses it to
// categorize/memo bank-feed deposits in QBO. It is deliberately NOT a
// transaction import — the bank feed already books the income, and importing
// these as transactions would double-book it.
export function qboPaymentRows(paymentRows, year) {
  return [
    ["Date", "Description", "Amount"],
    ...paymentRows.map((p) => [
      p.paid_on,
      "Dues " + year + " — " + p.address + " — " + p.method + (p.note ? " — " + p.note : ""),
      (p.amount_cents / 100).toFixed(2),
    ].map(safeCell)),
  ];
}
