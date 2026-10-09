/**
 * Rows as a CSV, with the separator this person's spreadsheet expects: a semicolon where the decimal mark
 * is a comma (most of Europe, South America), as Excel there reads and writes; a comma elsewhere. Intl
 * knows the locale's decimal mark.
 */
export const csvSeparator = (): string => (new Intl.NumberFormat().formatToParts(1.5).find((p) => p.type === 'decimal')?.value === ',' ? ';' : ',');
const csvCell = (s: string, sep: string) => (s.includes(sep) || /["\r\n]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s);
/** Rows as CSV. With a semicolon between the cells, a plain number is written with the decimal comma that goes with it. */
export const csv = (rows: (string | number)[][], sep = ',') =>
  rows.length ? rows.map((r) => r.map((c) => csvCell(sep === ';' && /^-?\d+\.\d+$/.test(String(c)) ? String(c).replace('.', ',') : String(c), sep)).join(sep)).join('\r\n') + '\r\n' : '';
