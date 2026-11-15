/**
 * CSV serialisation shared by the bulk exporters.
 *
 * Every field is quoted when it needs to be, and a payload that starts with
 * = + - @ is marked as text so a spreadsheet cannot evaluate it.
 */
export function csvCell(value: string | number | boolean) {
  let text = String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(values: (string | number | boolean)[]) {
  return values.map(csvCell).join(",");
}

export function csvDocument(rows: (string | number | boolean)[][]) {
  return `${rows.map((row) => csvRow(row)).join("\r\n")}\r\n`;
}
