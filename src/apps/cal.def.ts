/** Calendar: what the shell knows about calendars. Format: lib/calmodel.ts. */
import { defineApp, utf8, text, rect, clip, FAINT, LINE, MUTED, SHADE, type DownloadContext, type Page } from '../kit/core.ts';
import { CAL_COLORS, clockMinutes, isoDay, occurrences, parseCalendar, readCalendar, repeatText, spanDays, spanStartMs, spanEndMs, EPOCH_DAY, EPOCH_MS, type Every, type Span } from '../lib/calmodel.ts';
import { clockString, dayToYmd, pad2, ymdString, ymdToDay, utcToParts } from '../lib/tz.ts';
import { icsDate, icsStamp, icsText, vcalendar } from '../lib/ics.ts';

const FREQ: Record<Every, string> = { d: 'DAILY', w: 'WEEKLY', m: 'MONTHLY', y: 'YEARLY' };

export function calendarToIcs(body: string, ctx: DownloadContext): string {
  const cal = parseCalendar(body);
  const stamp = icsStamp(ctx.created ?? EPOCH_MS);
  return vcalendar(cal.spans.map((s, i) => {
    const lines = ['BEGIN:VEVENT', `UID:${s.kind}${s.start.toString(36)}-${s.dur.toString(36)}-${i}@tinyoffice`, `DTSTAMP:${stamp}`];
    if (s.kind === 'd') {
      // All-day spans are floating dates; DTEND is exclusive.
      lines.push(`DTSTART;VALUE=DATE:${icsDate(s.start)}`, `DTEND;VALUE=DATE:${icsDate(s.start + s.dur)}`);
    } else {
      lines.push(`DTSTART:${icsStamp(spanStartMs(s))}`, `DTEND:${icsStamp(spanEndMs(s))}`);
    }
    if (s.repeat) {
      // UNTIL is of DTSTART's kind: a date, or the end of that day in the calendar's zone as an instant.
      const r = s.repeat;
      const until = r.until === undefined ? '' : s.kind === 'd' ? icsDate(r.until) : icsStamp(EPOCH_MS + clockMinutes(EPOCH_DAY + r.until, 23, 59, cal.zone || 'UTC') * 60000);
      lines.push(`RRULE:FREQ=${FREQ[r.every]}${r.count ? `;COUNT=${r.count}` : until ? `;UNTIL=${until}` : ''}`);
    }
    lines.push(`SUMMARY:${icsText(s.label || 'Untitled')}`, 'END:VEVENT');
    return lines;
  }));
}

/** When a span happens, in words: floating dates as they are, instants in the calendar's own zone. */
function when(s: Span, zone: string): string {
  if (s.kind === 'd') return s.dur > 1 ? `${isoDay(s.start)} to ${isoDay(s.start + s.dur - 1)}` : isoDay(s.start);
  const p = utcToParts(spanStartMs(s), zone || 'UTC');
  return `${ymdString(p.y, p.m, p.d)} ${clockString(p)}${zone ? '' : ' UTC'}`;
}

const lines = (body: string) => {
  const cal = parseCalendar(body);
  return cal.spans.map((s) => `${when(s, cal.zone)}${s.repeat ? ', ' + repeatText(s.repeat) : ''}  ·  ${s.label || 'Untitled'}`);
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CW = 100;
const CH = 84;

/**
 * The calendar as months: a page for each month that has something in it
 * (three at most), every span on the days it covers, a repeating span on
 * every day it comes round to. `upTo` spans of it while it builds.
 */
function months(body: string, upTo = Infinity): Page[] {
  const cal = parseCalendar(body);
  const zone = cal.zone || 'UTC';
  // The months with something in them: a repeat counts for its first hundred days, so the three shown stay near its start.
  const days = cal.spans.flatMap((s) => {
    const [a] = spanDays(s, zone);
    return occurrences(s, a, a + 100, zone).map((o) => spanDays(o, zone));
  });
  const keys = [...new Set(days.flatMap(([a, b]) => [a, b]).map((d) => dayToYmd(d)).map((p) => p.y * 12 + p.m - 1))].sort((a, b) => a - b).slice(0, 3);
  // With nothing in it, this month.
  if (!keys.length) keys.push(new Date().getFullYear() * 12 + new Date().getMonth());
  const used = Object.entries(cal.legend ?? {}).filter(([key]) => cal.spans.some((s) => (s.color ?? '') === key));
  return keys.map((key) => {
    const [y, m] = [Math.floor(key / 12), (key % 12) + 1];
    const start = ymdToDay(y, m, 1);
    const lead = dayToYmd(start).wd;
    const rows = Math.ceil((lead + ymdToDay(y, m + 1, 1) - start) / 7);
    // What falls on the grid of this month: each time of each span, with the days it covers.
    const chips = cal.spans.flatMap((s, k) => (k < upTo ? occurrences(s, start - lead, start - lead + rows * 7 - 1, zone).map((o) => ({ s: o, days: spanDays(o, zone) })) : []));
    let svg = text(24, 44, `${MONTHS[m - 1]} ${y}`, { px: 26, bold: true });
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((d, i) => (svg += text(24 + i * CW + 8, 76, d, { px: 12, fill: MUTED })));
    for (let i = 0; i < rows * 7; i++) {
      const day = start - lead + i;
      const p = dayToYmd(day);
      const [x, top] = [24 + (i % 7) * CW, 84 + Math.floor(i / 7) * CH];
      svg += rect(x, top, CW, CH, p.m === m ? 'none' : SHADE, `stroke="${LINE}"`) + text(x + 8, top + 18, String(p.d), { px: 12, fill: p.m === m ? MUTED : FAINT });
      let line = 0;
      chips.forEach(({ s, days: [a, b] }) => {
        if (day < a || day > b || line >= 3) return;
        const hex = CAL_COLORS[s.color ?? ''].hex;
        const starts = day === a;
        const p = s.kind === 't' && starts ? utcToParts(spanStartMs(s), zone) : null;
        const time = p ? `${p.h}:${pad2(p.min)} ` : '';
        const yy = top + 24 + line++ * 19;
        // A span over several days is one bar across them, named where it starts (and at each new week).
        svg += rect(x + (starts ? 4 : 0), yy, CW - (starts ? 4 : 0) - (day === b ? 4 : 0), 16, hex, `rx="${starts && day === b ? 4 : 0}" fill-opacity="${s.kind === 'd' ? 1 : 0.18}"`);
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
