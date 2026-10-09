/**
 * iCalendar (RFC 5545) as text, for any app with dates: one writer, so every file folds its lines the same
 * way (at most 75 octets of UTF-8 a line, a continuation starting with a space, never splitting a character),
 * escapes the same characters and ends its lines with CRLF. Ported from the old tree's lib/ics.ts; no DOM.
 */

/** TEXT values: a backslash, a semicolon and a comma escaped, a newline as \n. */
export const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** "2027-03-01" as a DATE value: 20270301. */
export const icsDate = (iso: string) => iso.replace(/-/g, '');
/** An instant as a UTC DATE-TIME: 20270301T100000Z. */
export const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

/** A content line folded: longer than the limit, it goes on in lines that start with a space. */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  let out = '';
  let width = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    // 73 leaves room on every line for the continuation's space and stays clear of 75 octets.
    if (width + n > 73) {
      out += '\r\n ';
      width = 1;
    }
    out += ch;
    width += n;
  }
  return out;
}

/** A calendar of components (each the lines of one VEVENT or VTODO, BEGIN to END), folded, with CRLF line ends. */
export function vcalendar(components: string[][], product = 'Calendar'): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//TinyLittleOffice//${product}//EN`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...components.flat(), 'END:VCALENDAR'];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
