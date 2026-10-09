/**
 * iCalendar (RFC 5545) as text, for a calendar's spans, a schedule's tasks
 * and a list's to-dos: one writer, so every file folds its lines the same
 * way (75 octets of UTF-8, a continuation line starting with a space) and
 * escapes the same characters.
 */
import { dayString } from './tz.ts';
import { EPOCH_DAY } from './calmodel.ts';

export const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** A day counted from 2020-01-01 as a DATE value: 20270301. */
export const icsDate = (day: number) => dayString(EPOCH_DAY + day).replace(/-/g, '');
/** An instant as a UTC DATE-TIME: 20270301T100000Z. */
export const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

/** Content lines may not exceed 75 octets; longer ones continue on a line starting with a space, never splitting a character. */
export function icsFold(line: string): string {
  const enc = new TextEncoder();
  let out = '';
  let width = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
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
export function vcalendar(components: string[][]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TinyLittleOffice//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...components.flat(), 'END:VCALENDAR'];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
