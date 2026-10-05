/** Calendar: what the shell knows about calendars. Format: lib/calmodel.ts. */
import { defineApp, utf8, listPage, type DownloadContext } from '../kit/core.ts';
import { parseCalendar, EPOCH_DAY, EPOCH_MS, type Span } from '../lib/calmodel.ts';
import { dayToYmd, pad2, ymdString, utcToParts } from '../lib/tz.ts';

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsDate = (day: number) => {
  const { y, m, d } = dayToYmd(day);
  return `${y}${pad2(m)}${pad2(d)}`;
};
const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

/** Content lines may not exceed 75 octets; longer ones continue on a line starting with a space. */
function icsFold(line: string): string {
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

export function calendarToIcs(body: string, ctx: DownloadContext): string {
  const cal = parseCalendar(body);
  const stamp = icsStamp(ctx.created ?? EPOCH_MS);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TinyOffice//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  cal.spans.forEach((s, i) => {
    lines.push('BEGIN:VEVENT', `UID:${s.kind}${s.start.toString(36)}-${s.dur.toString(36)}-${i}@tinyoffice`, `DTSTAMP:${stamp}`);
    if (s.kind === 'd') {
      // All-day spans are floating dates; DTEND is exclusive.
      lines.push(`DTSTART;VALUE=DATE:${icsDate(EPOCH_DAY + s.start)}`, `DTEND;VALUE=DATE:${icsDate(EPOCH_DAY + s.start + s.dur)}`);
    } else {
      lines.push(`DTSTART:${icsStamp(EPOCH_MS + s.start * 60000)}`, `DTEND:${icsStamp(EPOCH_MS + (s.start + s.dur) * 60000)}`);
    }
    lines.push(`SUMMARY:${icsText(s.label || 'Untitled')}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}


/** When a span happens, in words: floating dates as they are, instants in the calendar's own zone. */
export function when(s: Span, zone: string): string {
  const day = (n: number) => {
    const { y, m, d } = dayToYmd(n);
    return ymdString(y, m, d);
  };
  if (s.kind === 'd') return s.dur > 1 ? `${day(EPOCH_DAY + s.start)} to ${day(EPOCH_DAY + s.start + s.dur - 1)}` : day(EPOCH_DAY + s.start);
  const p = utcToParts(EPOCH_MS + s.start * 60000, zone || 'UTC');
  return `${ymdString(p.y, p.m, p.d)} ${pad2(p.h)}:${pad2(p.min)}${zone ? '' : ' UTC'}`;
}

const lines = (body: string) => {
  const cal = parseCalendar(body);
  return cal.spans.map((s) => `${when(s, cal.zone)}  ·  ${s.label || 'Untitled'}`);
};

export default defineApp({
  id: 'cal',
  name: 'Calendar',
  icon: 'cal',
  blurb: 'Labelled spans of time on a month grid, shown in any time zone.',
  title: () => '',
  outline: lines,
  view: (body) => [listPage('Calendar', lines(body))],
  downloads: [{ ext: 'ics', label: 'iCalendar', mime: 'text/calendar;charset=utf-8', build: (b, ctx) => utf8(calendarToIcs(b, ctx)) }],
});
