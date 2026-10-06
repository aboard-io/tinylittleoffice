/** Calendar: what the shell knows about calendars. Format: lib/calmodel.ts. */
import { defineApp, utf8, text, rect, clip, FAINT, LINE, MUTED, SHADE, type DownloadContext, type Page } from '../kit/core.ts';
import { CAL_COLORS, parseCalendar, serializeCalendar, spanEndMs, spanStartMs, EPOCH_DAY, EPOCH_MS, type Span } from '../lib/calmodel.ts';
import { dayToYmd, pad2, ymdString, ymdToDay, utcToParts, partsToUtc } from '../lib/tz.ts';

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
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TinyLittleOffice//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
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

/**
 * A calendar written plainly, one span per line:
 *   2027-03-01 Offsite                      a day
 *   2027-03-01 to 2027-03-03 Offsite        several days
 *   2027-03-01 09:00-10:30 Call             a time, in the zone given by a first line "@Europe/London" (UTC without one)
 */
export function readCalendar(text: string): string {
  const lines = text.split('\n');
  const zone = lines.find((l) => l.startsWith('@'))?.slice(1).trim() ?? '';
  const spans: Span[] = [];
  let plain = false;
  for (const line of lines) {
    const m = /^(\d{4})-(\d\d)-(\d\d)(?:\s+(?:to\s+(\d{4})-(\d\d)-(\d\d)|(\d\d?):(\d\d)\s*-\s*(\d\d?):(\d\d)))?\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    plain = true;
    const day = ymdToDay(+m[1], +m[2], +m[3]);
    if (m[7]) {
      const start = partsToUtc(+m[1], +m[2], +m[3], +m[7], +m[8], zone || 'UTC');
      const end = partsToUtc(+m[1], +m[2], +m[3], +m[9], +m[10], zone || 'UTC');
      spans.push({ kind: 't', start: Math.round((start - EPOCH_MS) / 60000), dur: Math.max(0, Math.round((end - start) / 60000)), label: m[11] });
    } else spans.push({ kind: 'd', start: day - EPOCH_DAY, dur: m[4] ? Math.max(1, ymdToDay(+m[4], +m[5], +m[6]) - day + 1) : 1, label: m[11] });
  }
  return plain ? serializeCalendar({ zone, spans }) : text;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CW = 100;
const CH = 84;

/**
 * The calendar as months: a page for each month that has something in it
 * (three at most), every span on the days it covers. `upTo` spans of it
 * while it builds.
 */
function months(body: string, upTo = Infinity): Page[] {
  const cal = parseCalendar(body);
  const zone = cal.zone || 'UTC';
  // The days (counted from 1970) each span covers, in the calendar's own zone.
  const days = cal.spans.map((s) => {
    if (s.kind === 'd') return [EPOCH_DAY + s.start, EPOCH_DAY + s.start + s.dur - 1];
    const a = utcToParts(spanStartMs(s), zone);
    const b = utcToParts(Math.max(spanStartMs(s), spanEndMs(s) - 1), zone);
    return [ymdToDay(a.y, a.m, a.d), ymdToDay(b.y, b.m, b.d)];
  });
  const now = new Date();
  const first = days.length ? dayToYmd(Math.min(...days.map((d) => d[0]))) : { y: now.getFullYear(), m: now.getMonth() + 1 };
  const keys = [...new Set(days.flatMap(([a, b]) => [a, b]).map((d) => dayToYmd(d)).map((p) => p.y * 12 + p.m - 1))].sort((a, b) => a - b).slice(0, 3);
  if (!keys.length) keys.push(first.y * 12 + first.m - 1);
  const used = Object.entries(cal.legend ?? {}).filter(([key]) => cal.spans.some((s) => (s.color ?? '') === key));
  return keys.map((key) => {
    const [y, m] = [Math.floor(key / 12), (key % 12) + 1];
    const start = ymdToDay(y, m, 1);
    const lead = dayToYmd(start).wd;
    const rows = Math.ceil((lead + ymdToDay(y, m + 1, 1) - start) / 7);
    let svg = text(24, 44, `${MONTHS[m - 1]} ${y}`, { px: 26, bold: true });
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d, i) => (svg += text(24 + i * CW + 8, 76, d, { px: 12, fill: MUTED })));
    for (let i = 0; i < rows * 7; i++) {
      const day = start - lead + i;
      const p = dayToYmd(day);
      const [x, top] = [24 + (i % 7) * CW, 84 + Math.floor(i / 7) * CH];
      svg += rect(x, top, CW, CH, p.m === m ? 'none' : SHADE, `stroke="${LINE}"`) + text(x + 8, top + 18, String(p.d), { px: 12, fill: p.m === m ? MUTED : FAINT });
      let line = 0;
      cal.spans.forEach((s, k) => {
        if (k >= upTo || day < days[k][0] || day > days[k][1] || line >= 3) return;
        const hex = CAL_COLORS[s.color ?? ''].hex;
        const starts = day === days[k][0];
        const time = s.kind === 't' && starts ? `${utcToParts(spanStartMs(s), zone).h}:${pad2(utcToParts(spanStartMs(s), zone).min)} ` : '';
        const yy = top + 24 + line++ * 19;
        // A span over several days is one bar across them, named where it starts (and at each new week).
        svg += rect(x + (starts ? 4 : 0), yy, CW - (starts ? 4 : 0) - (day === days[k][1] ? 4 : 0), 16, hex, `rx="${starts && day === days[k][1] ? 4 : 0}" fill-opacity="${s.kind === 'd' ? 1 : 0.18}"`);
        if (starts || i % 7 === 0) svg += text(x + 8, yy + 12, clip(time + (s.label || 'Untitled'), CW - 12, 11), { px: 11, fill: s.kind === 'd' ? '#fff' : '#18181b' });
      });
    }
    let bottom = 84 + rows * CH;
    if (used.length) {
      // What the colours stand for.
      let x = 24;
      bottom += 28;
      for (const [k, name] of used) {
        svg += rect(x, bottom - 11, 12, 12, CAL_COLORS[k].hex, 'rx="6"') + text(x + 18, bottom, name, { px: 13 });
        x += 30 + name.length * 7.5;
      }
    }
    return { w: 48 + 7 * CW, h: bottom + 24, svg };
  });
}

export default defineApp({
  id: 'cal',
  group: 'Plan',
  name: 'Calendar',
  icon: 'cal',
  blurb: 'Labelled spans of time on a month grid, shown in any time zone.',
  title: () => '',
  outline: lines,
  view: (body, opts = {}) => (opts.embed ? months(body, opts.step).slice(0, 1) : months(body, opts.step)),
  // On a slide, the month is there and what happens in it arrives one thing at a time.
  steps: (body) => parseCalendar(body).spans.length,
  read: readCalendar,
  downloads: [{ ext: 'ics', label: 'iCalendar', mime: 'text/calendar;charset=utf-8', build: (b, ctx) => utf8(calendarToIcs(b, ctx)) }],
});
