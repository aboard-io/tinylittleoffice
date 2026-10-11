/**
 * Calendar drawn and written out, with no DOM: the month pages (or, for a schedule, the chart) for print,
 * PDF, PNG and thumbnails; the file a calendar app reads (iCalendar, RFC 5545, through the kit's writer) and
 * a CSV. Ported from the old tree's cal.def.ts and gantt.def.ts.
 */
import { dayToYmd, ymdToDay, type Doc } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { csv } from '../../kit/csv.ts';
import { ACCENT, FAINT, INK, LINE, MUTED, SHADE, clip, r, rect, text } from '../../kit/draw.ts';
import { language, t } from '../../kit/i18n.ts';
import { icsDate, icsStamp, icsText, vcalendar } from '../../kit/ics.ts';
import { CAL_COLORS, clockMinutes, ganttBars, ganttRange, occurrences, readCal, repeatText, spanDays, spanEndMs, spanStartMs, type CalView, type Every } from './model.ts';
import { clockString, dayString, pad2, utcToParts } from './tz.ts';

const CW = 100;
const CH = 84;
const monthName = (y: number, m: number) => new Intl.DateTimeFormat(language(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
const weekday = (wd: number) => new Intl.DateTimeFormat(language(), { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2023, 0, 1 + wd));

/**
 * The calendar as months: a page for each month that has something in it (`max` at most), every span on the
 * days it covers, a repeating span on every day it comes round to; what the colours stand for at the foot.
 */
export function monthPages(v: CalView, max = 3, now = new Date()): Page[] {
  const zone = v.tz;
  // The months with something in them: a repeat counts for its first hundred days, so the ones shown stay near its start.
  const days = v.items.flatMap((s) => {
    const [a] = spanDays(s, zone);
    return occurrences(s, a, a + 100, zone).map((o) => spanDays(o, zone));
  });
  const keys = [
    ...new Set(
      days
        .flatMap(([a, b]) => [a, b])
        .map((d) => dayToYmd(d))
        .map((p) => p.y * 12 + p.m - 1),
    ),
  ]
    .sort((a, b) => a - b)
    .slice(0, max);
  if (!keys.length) keys.push(now.getFullYear() * 12 + now.getMonth());
  const used = Object.entries(v.legend).filter(([key]) => v.items.some((s) => s.color === key));
  return keys.map((key) => {
    const [y, m] = [Math.floor(key / 12), (key % 12) + 1];
    const start = ymdToDay(y, m, 1);
    const lead = dayToYmd(start).wd;
    const rows = Math.ceil((lead + ymdToDay(y, m + 1, 1) - start) / 7);
    const chips = v.items.flatMap((s) => occurrences(s, start - lead, start - lead + rows * 7 - 1, zone).map((o) => ({ s: o, days: spanDays(o, zone) })));
    let svg = text(24, 44, monthName(y, m), { px: 26, bold: true });
    for (let i = 0; i < 7; i++) svg += text(24 + i * CW + 8, 76, weekday(i), { px: 12, fill: MUTED });
    const alt: string[] = [];
    for (let i = 0; i < rows * 7; i++) {
      const day = start - lead + i;
      const p = dayToYmd(day);
      const [x, top] = [24 + (i % 7) * CW, 84 + Math.floor(i / 7) * CH];
      svg += rect(x, top, CW, CH, p.m === m ? 'none' : SHADE, `stroke="${LINE}"`) + text(x + 8, top + 18, String(p.d), { px: 12, fill: p.m === m ? MUTED : FAINT });
      let line = 0;
      for (const {
        s,
        days: [a, b],
      } of chips) {
        if (day < a || day > b || line >= 3) continue;
        const hex = CAL_COLORS[s.color]?.hex ?? ACCENT;
        const starts = day === a;
        const q = s.kind === 't' && starts ? utcToParts(spanStartMs(s), zone) : null;
        const time = q ? `${q.h}:${pad2(q.min)} ` : '';
        const yy = top + 24 + line++ * 19;
        // A span over several days is one bar across them, named where it starts (and at each new week).
        svg += rect(x + (starts ? 4 : 0), yy, CW - (starts ? 4 : 0) - (day === b ? 4 : 0), 16, hex, `rx="${starts && day === b ? 4 : 0}" fill-opacity="${s.kind === 'd' ? 1 : 0.18}"`);
        if (starts || i % 7 === 0) svg += text(x + 8, yy + 12, clip(time + (s.words || t('Untitled')), CW - 12, 11), { px: 11, fill: s.kind === 'd' ? '#fff' : INK });
        if (starts && p.m === m) alt.push(`${p.d}: ${time}${s.words || t('Untitled')}`);
      }
    }
    let bottom = 84 + rows * CH;
    if (used.length) {
      let x = 24;
      bottom += 28;
      for (const [k, name] of used) {
        svg += rect(x, bottom - 11, 12, 12, CAL_COLORS[k].hex, 'rx="6"') + text(x + 18, bottom, name, { px: 13 });
        x += 30 + name.length * 7.5;
      }
    }
    return { w: 48 + 7 * CW, h: bottom + 24, svg, alt: `${monthName(y, m)}${alt.length ? ': ' + alt.join('; ') : ''}` };
  });
}

/** The schedule as a page: a task a row, a bar over its days, how far along it is filled in; a task with parts a bracket over them. */
export function ganttPage(v: CalView, max = Infinity): Page {
  const bars = ganttBars(v).slice(0, max);
  const range = ganttRange(bars);
  if (!range) return { w: 480, h: 120, svg: text(240, 66, t('No tasks yet'), { px: 16, fill: MUTED, anchor: 'middle' }) };
  const NAMES = 220;
  const ROW = 32;
  const days = range.to - range.from;
  const z = Math.max(4, Math.min(28, 640 / days));
  const w = NAMES + days * z + 48;
  let svg = rect(24 + NAMES, 24, days * z, bars.length * ROW + 28, SHADE);
  for (let d = 0; d <= days; d += Math.ceil(7 / Math.max(1, z / 12)))
    svg +=
      `<line x1="${r(24 + NAMES + d * z)}" y1="24" x2="${r(24 + NAMES + d * z)}" y2="${52 + bars.length * ROW}" stroke="${LINE}"/>` +
      text(24 + NAMES + d * z + 4, 42, dayString(range.from + d).slice(5), { px: 11, fill: MUTED });
  bars.forEach((s, i) => {
    const y = 52 + i * ROW;
    const left = 24 + NAMES + (s.start - range.from) * z;
    const depth = s.item.depth;
    const hex = CAL_COLORS[s.item.color]?.hex ?? ACCENT;
    svg += text(24 + depth * 16, y + 21, clip(s.item.words || t('Task'), NAMES - 12 - depth * 16, 14, s.parent), { px: 14, bold: s.parent });
    if (s.parent) svg += rect(left, y + 10, s.days * z, 6, INK) + `<path d="M${r(left)} ${y + 10}v12l6-6zM${r(left + s.days * z)} ${y + 10}v12l-6-6z" fill="${INK}"/>`;
    else svg += rect(left, y + 6, s.days * z, ROW - 12, hex, `rx="4" fill-opacity="0.18" stroke="${hex}"`) + (s.done ? rect(left, y + 6, (s.days * z * s.done) / 100, ROW - 12, hex, 'rx="4"') : '');
  });
  const alt = bars.map((s) => `${s.item.words || t('Task')}: ${dayString(s.start)}, ${t('{n|one day|# days}', { n: s.days })}${s.done ? `, ${s.done}%` : ''}`).join('; ');
  return { w, h: 76 + bars.length * ROW, svg, alt };
}

/** The document drawn: the schedule, or the months. Small, the first month or the first tasks. */
export function calPages(doc: Doc, small = false): Page[] {
  const v = readCal(doc);
  if (v.gantt) return [ganttPage(v, small ? 8 : Infinity)];
  return monthPages(v, small ? 1 : 3);
}

/* ---------- iCalendar and CSV ---------- */

const FREQ: Record<Every, string> = { d: 'DAILY', w: 'WEEKLY', m: 'MONTHLY', y: 'YEARLY' };

/** The calendar as events: an all-day span over floating dates (DTEND the day after), a timed one as UTC instants, a repeat as its RRULE, how far along in the description. */
export function calToIcs(doc: Doc, stampMs: number): string {
  const v = readCal(doc);
  const zone = v.tz;
  const stamp = icsStamp(stampMs);
  const events = v.items.map((s, i) => {
    const lines = ['BEGIN:VEVENT', `UID:${s.kind}${s.start.toString(36)}-${s.dur.toString(36)}-${i}@tinylittleoffice`, `DTSTAMP:${stamp}`];
    if (s.kind === 'd') lines.push(`DTSTART;VALUE=DATE:${icsDate(dayString(s.start))}`, `DTEND;VALUE=DATE:${icsDate(dayString(s.start + s.dur))}`);
    else lines.push(`DTSTART:${icsStamp(spanStartMs(s))}`, `DTEND:${icsStamp(spanEndMs(s))}`);
    if (s.repeat) {
      // UNTIL is of DTSTART's kind: a date, or the end of that day in the calendar's zone as an instant.
      const rp = s.repeat;
      const until = rp.until === undefined ? '' : s.kind === 'd' ? icsDate(dayString(rp.until)) : icsStamp(clockMinutes(rp.until, 23, 59, zone) * 60000);
      lines.push(`RRULE:FREQ=${FREQ[rp.every]}${rp.count ? `;COUNT=${rp.count}` : until ? `;UNTIL=${until}` : ''}`);
    }
    lines.push(`SUMMARY:${icsText(s.words || t('Untitled'))}`);
    if (s.done) lines.push(`DESCRIPTION:${icsText(t('{n}% done', { n: s.done }))}`);
    lines.push('END:VEVENT');
    return lines;
  });
  return vcalendar(events);
}

/** The calendar as rows for a spreadsheet: a schedule as its tasks (level, start, end, days, done), a calendar as its spans. */
export function calToCsv(doc: Doc, sep = ','): string {
  const v = readCal(doc);
  const zone = v.tz;
  if (v.gantt) {
    const bars = ganttBars(v);
    return csv(
      [
        [t('Task'), t('Level'), t('Start'), t('End'), t('Days'), t('Done %')],
        ...bars.map((b) => [b.item.words, b.item.depth + 1, dayString(b.start), dayString(b.start + b.days - 1), b.days, b.done]),
      ],
      sep,
    );
  }
  const at = (ms: number) => {
    const p = utcToParts(ms, zone);
    return `${dayString(ymdToDay(p.y, p.m, p.d))} ${clockString(p)}`;
  };
  return csv(
    [
      [t('What'), t('Start'), t('End'), t('Repeats'), t('Color')],
      ...v.items.map((s) => [
        s.words,
        s.kind === 'd' ? dayString(s.start) : at(spanStartMs(s)),
        s.kind === 'd' ? dayString(s.start + s.dur - 1) : at(spanEndMs(s)),
        s.repeat ? repeatText(s.repeat) : '',
        v.legend[s.color] ?? (s.color ? CAL_COLORS[s.color].name() : ''),
      ]),
    ],
    sep,
  );
}
