// Minimal CSV support (RFC-4180 quoting) — enough for Google Sheets exports.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  // Remove only trailing blank lines, not empty rows in the middle of data
  while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows;
}

export function toCsv(rows) {
  return rows.map((row) =>
    row.map((cell) => {
      const s = String(cell);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")
  ).join("\n");
}

// Guard against spreadsheet formula injection: Excel/Sheets execute cells
// starting with = + - @. A leading apostrophe makes them inert text. Applied
// to every text cell in every export format (board CSV and all QBO formats).
export function safeCell(value) {
  const s = String(value || "");
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Standard CSV download response — every export format goes through here so
// the RFC-4180 quoting (toCsv) and attachment headers stay consistent.
export function csvResponse(filename, rows) {
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="' + filename + '"',
    },
  });
}
