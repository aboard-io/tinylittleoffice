import { PALETTE } from './palette.ts';
import { ACCENT } from '../kit/core.ts';
/**
 * Calendar document model. The calendar is a TLO list (lib/tlo.ts), one
 * span an item: when it is, then what.
 *
 *   ---
 *   zone: Europe/London
 *   green: Sam
 *   ---
 *   - 2027-03-01: Launch                              a day, a floating date, the same everywhere
 *   - 2027-03-01 to 2027-03-03: Offsite {color=green}  several days
 *   - 2027-03-10 09:00-10:30: Retro {every=week}       a time, in the header's zone (UTC without one)
 *   - 2027-03-10 22:00 to 2027-03-11 01:00: Party       a time that runs past midnight
 *
 * The header's zone is the one the document was last edited in. A timed
 * span is an absolute instant: it is written as the clock in that zone
 * reads, and read back to the same instant.
 *
 * A span may have a colour, `color=green`, and the header may say what a
 * colour stands for ("green: Sam"; "indigo: Paul" names the default
 * colour), so two people sharing a calendar can each take one.
 *
 * A span may repeat: `every=day`, `week`, `month` or `year`, with
 * `times=9` (how many times in all) or `until=2027-06-01` (the last day it
 * may start on); with neither it goes on for ever. A timed span repeats at
 * the same time of day in the document's zone, so a weekly call stays at
 * nine o'clock across a clock change.
 */
import { parse, write, attr, type Block, type Head } from './tlo.ts';
import { clockString, dayString, dayToYmd, isValidZone, partsToUtc, utcToParts, ymdString, ymdToDay } from './tz.ts';

export const EPOCH_MS = Date.UTC(2020, 0, 1);
export const EPOCH_DAY = ymdToDay(2020, 1, 1);
export const MAX_LABEL = 60;

export type Every = 'd' | 'w' | 'm' | 'y';

export interface Repeat {
  every: Every;
  /** How many times in all, the first included. */
  count?: number;
  /** The last day (counted from EPOCH_DAY) a time of it may start on. Neither this nor `count`: for ever. */
  until?: number;
}

export interface Span {
  kind: 'd' | 't';
  /** 'd': day number since EPOCH_DAY. 't': minutes since EPOCH_MS (UTC). */
  start: number;
  /** 'd': whole days, at least 1. 't': minutes, at least 0. */
  dur: number;
  label: string;
  /** A key of CAL_COLORS; absent for the default. */
  color?: string;
  repeat?: Repeat;
}

export interface Calendar {
  zone: string;
  spans: Span[];
  /** What each colour stands for, by colour key ('' is the default colour). */
  legend?: Record<string, string>;
}

export const CAL_COLORS: Record<string, { name: string; hex: string }> = { '': { name: 'Indigo', hex: ACCENT }, r: PALETTE.r, o: PALETTE.o, g: PALETTE.g, b: PALETTE.b, p: PALETTE.p };

/** What each repeat letter means, as a noun: "every week". */
export const EVERY: Record<Every, string> = { d: 'day', w: 'week', m: 'month', y: 'year' };

/** A colour's key from its name ("green") or its letter ("g"); undefined for one that is not a calendar colour. */
const colorKey = (v: string | undefined): string | undefined => {
  const s = v?.trim().toLowerCase() ?? '';
  return Object.keys(CAL_COLORS).find((k) => (k && k === s) || CAL_COLORS[k].name.toLowerCase() === s);
};
const colorWord = (key: string) => CAL_COLORS[key].name.toLowerCase();

/** "2027-03-01" as days since 1970, or null. */
const dayOf = (s: string | undefined): number | null => {
  const m = /^(\d{4})-(\d\d?)-(\d\d?)$/.exec(s?.trim() ?? '');
  return m ? ymdToDay(+m[1], +m[2], +m[3]) : null;
};

/**
 * When a span is, as written at the start of its item, and the words after
 * it: "2027-03-01", "2027-03-01 to 2027-03-03", "2027-03-10 09:00",
 * "2027-03-10 09:00-10:30", "2027-03-10 22:00 to 2027-03-11 01:00". A
 * time that ends before it starts ends the next day.
 */
function readWhen(text: string, zone: string): [Omit<Span, 'label'>, string] | null {
  const date = /^(\d{4}-\d\d?-\d\d?)/.exec(text);
  if (!date) return null;
  const a = dayOf(date[1])!;
  let rest = text.slice(date[0].length);
  const t0 = /^\s+(\d\d?):(\d\d)/.exec(rest);
  if (t0) rest = rest.slice(t0[0].length);
  // The end: "to" or a dash, then a day, a time, or both.
  const end = /^\s*(?:to|–|-)\s*(?:(\d{4}-\d\d?-\d\d?)(?:\s+(\d\d?):(\d\d))?|(\d\d?):(\d\d))/.exec(rest);
  if (end) rest = rest.slice(end[0].length);
  const b = end?.[1] ? dayOf(end[1])! : a;
  const words = rest.replace(/^\s*:?\s*/, '');
  if (!t0) return [{ kind: 'd', start: a - EPOCH_DAY, dur: Math.max(1, b - a + 1) }, words];
  const from = clockMinutes(a, +t0[1], +t0[2], zone);
  const [h, min] = end?.[4] ? [+end[4], +end[5]] : end?.[2] ? [+end[2], +end[3]] : [+t0[1], +t0[2]];
  let to = clockMinutes(b, h, min, zone);
  if (end?.[4] && to < from) to = clockMinutes(b + 1, h, min, zone);
  return [{ kind: 't', start: from, dur: Math.max(0, to - from) }, words];
}

/** The spans of a text: its items, each from its date. Loosely, also lines that are not items, a repeat written after the label and "(3 days)". */
function readSpans(text: string, loose: boolean): Calendar {
  const doc = parse(text);
  const named = doc.head.zone ?? (loose ? /^\s*time ?zone:\s*(\S+)/im.exec(text)?.[1] : undefined) ?? '';
  const zone = isValidZone(named) ? named : '';
  const cal: Calendar = { zone, spans: [] };
  for (const key of Object.keys(CAL_COLORS)) {
    const name = doc.head[colorWord(key)]?.trim();
    if (name) (cal.legend ??= {})[key] = name;
  }
  const lines: { text: string; a?: Block['a'] }[] = doc.blocks.flatMap((b) => (b.k === 'li' ? [b] : loose && b.k === 'p' ? b.text.split('\n').map((t) => ({ text: t.trim() })) : []));
  for (const l of lines) {
    let line = l.text.replace(/\n/g, ' ');
    // "2027-03-01 (3 days): Offsite", as some write a span of days.
    if (loose) line = line.replace(/^(\d{4})-(\d\d?)-(\d\d?)\s*\((\d+) days?\)/, (_, y, m, d, n) => (+n > 1 ? `${y}-${m}-${d} to ${dayString(ymdToDay(+y, +m, +d) + +n - 1)}` : `${y}-${m}-${d}`));
    const read = readWhen(line, zone || 'UTC');
    if (!read) continue;
    const [when, words] = read;
    const [label, looseRepeat] = loose ? readRepeat(words) : [words, undefined];
    const span: Span = { ...when, label: label.slice(0, MAX_LABEL) };
    const color = colorKey(attr(l, 'color'));
    if (color) span.color = color;
    const every = (Object.keys(EVERY) as Every[]).find((k) => EVERY[k] === attr(l, 'every')?.toLowerCase() || k === attr(l, 'every'));
    if (every) {
      span.repeat = { every };
      const times = parseInt(attr(l, 'times') ?? '', 10);
      const until = dayOf(attr(l, 'until'));
      if (times > 0) span.repeat.count = times;
      else if (until !== null) span.repeat.until = until - EPOCH_DAY;
    } else if (looseRepeat) span.repeat = looseRepeat;
    cal.spans.push(span);
  }
  sortSpans(cal.spans);
  return cal;
}

export const parseCalendar = (text: string): Calendar => readSpans(text, false);

/**
 * A calendar as a person or a model writes it, made canonical: lines of
 * dates with or without a bullet, a "Time zone: Europe/London" line in
 * place of the header, a span of days as "2027-03-01 (3 days)", and a
 * repeat written after the label: "Standup every week, 9 times",
 * "Call every month until 2027-06-01".
 */
export const readCalendar = (text: string): string => serializeCalendar(readSpans(text, true));

/** When a span is, as its item starts: dates as they are, times as the clock reads in `zone`. */
function whenText(s: Span, zone: string): string {
  if (s.kind === 'd') return isoDay(s.start) + (s.dur > 1 ? ` to ${isoDay(s.start + s.dur - 1)}` : '');
  const a = utcToParts(spanStartMs(s), zone);
  const b = utcToParts(spanEndMs(s), zone);
  const [da, db] = [ymdString(a.y, a.m, a.d), ymdString(b.y, b.m, b.d)];
  const [ta, tb] = [clockString(a), clockString(b)];
  return !s.dur ? `${da} ${ta}` : da === db ? `${da} ${ta}-${tb}` : `${da} ${ta} to ${db} ${tb}`;
}

export function serializeCalendar(cal: Calendar): string {
  if (!cal.spans.length) return '';
  const zone = isValidZone(cal.zone) ? cal.zone : '';
  const head: Head = zone ? { zone } : {};
  // Only the names of colours in use are worth keeping.
  for (const [key, name] of Object.entries(cal.legend ?? {})) if (key in CAL_COLORS && name.trim() && cal.spans.some((s) => (s.color ?? '') === key)) head[colorWord(key)] = name.trim().replace(/\n/g, ' ');
  const blocks: Block[] = cal.spans.map((s) => {
    const r = s.repeat;
    const kv: Record<string, string> = {
      ...(s.color && s.color in CAL_COLORS ? { color: colorWord(s.color) } : {}),
      ...(r ? { every: EVERY[r.every], ...(r.count ? { times: String(r.count) } : r.until !== undefined ? { until: isoDay(r.until) } : {}) } : {}),
    };
    const label = s.label.replace(/\n/g, ' ').slice(0, MAX_LABEL);
    return { k: 'li', depth: 0, text: `${whenText(s, zone || 'UTC')}:${label ? ' ' + label : ''}`, ...(Object.keys(kv).length ? { a: { kv } } : {}) };
  });
  return write({ head, blocks }).trimEnd();
}

/** A repeat in words: "every week", "every week, 9 times", "every week until 2027-06-01". */
export function repeatText(r: Repeat): string {
  return `every ${EVERY[r.every]}${r.count ? `, ${r.count} times` : r.until !== undefined ? ` until ${isoDay(r.until)}` : ''}`;
}

/** The repeat written at the end of a label ("Standup every week, 9 times"), split off: the label, and the rule or none. */
export function readRepeat(label: string): [string, Repeat | undefined] {
  const m = /^(.*?)\s*\bevery (day|week|month|year)(?:,?\s+(\d+) times|\s+until (\d{4})-(\d\d)-(\d\d))?$/i.exec(label);
  if (!m) return [label, undefined];
  const r: Repeat = { every: m[2][0].toLowerCase() as Every };
  if (m[3] && +m[3] > 0) r.count = +m[3];
  else if (m[4]) r.until = ymdToDay(+m[4], +m[5], +m[6]) - EPOCH_DAY;
  return [m[1], r];
}

/** Absolute start instant in ms, for ordering. Day spans count from 00:00 UTC. */
export function spanStartMs(s: Span): number {
  return s.kind === 'd' ? (EPOCH_DAY + s.start) * 86400000 : EPOCH_MS + s.start * 60000;
}

export function spanEndMs(s: Span): number {
  return s.kind === 'd' ? (EPOCH_DAY + s.start + s.dur) * 86400000 : EPOCH_MS + (s.start + s.dur) * 60000;
}

export function sortSpans(spans: Span[]): Span[] {
  return spans.sort((a, b) => spanStartMs(a) - spanStartMs(b) || a.label.localeCompare(b.label));
}

/** The first and last civil days (counted from 1970) a span covers; a timed span's are taken in `zone`. */
export function spanDays(s: Span, zone: string): [number, number] {
  if (s.kind === 'd') return [EPOCH_DAY + s.start, EPOCH_DAY + s.start + s.dur - 1];
  const a = utcToParts(spanStartMs(s), zone);
  const b = utcToParts(Math.max(spanStartMs(s), spanEndMs(s) - 1), zone);
  return [ymdToDay(a.y, a.m, a.d), ymdToDay(b.y, b.m, b.d)];
}

/**
 * Every time a span happens between two days (counted from 1970, both
 * included): the span itself, or, when it repeats, the copies its rule
 * makes, each starting on its own day. A timed span repeats at the same
 * time of day in `zone`.
 */
export function occurrences(s: Span, fromDay: number, toDay: number, zone: string): Span[] {
  const r = s.repeat;
  const [a, b] = spanDays(s, zone);
  if (!r) return b >= fromDay && a <= toDay ? [s] : [];
  const out: Span[] = [];
  const t = s.kind === 't' ? utcToParts(spanStartMs(s), zone) : null;
  const p = t ?? dayToYmd(a);
  const step = r.every === 'd' ? 1 : r.every === 'w' ? 7 : 0;
  // Days and weeks are regular, so the times over before `fromDay` are skipped unvisited.
  // Months and years are walked from the start: a 31st skips the short months, and only the times that happen count.
  let n = step ? Math.max(0, Math.floor((fromDay - b) / step)) : 0;
  for (let seen = n; r.count === undefined || seen < r.count; n++) {
    const day = step ? a + n * step : ymdToDay(r.every === 'y' ? p.y + n : p.y, r.every === 'm' ? p.m + n : p.m, p.d);
    if (day > toDay || (r.until !== undefined && day > EPOCH_DAY + r.until)) break;
    if (!step && dayToYmd(day).d !== p.d) continue;
    seen++;
    if (day + b - a < fromDay) continue;
    out.push({ ...s, start: t ? clockMinutes(day, t.h, t.min, zone) : day - EPOCH_DAY });
  }
  return out;
}

/** "2026-03-01" for a day counted from 2020-01-01, the way todo and gantt count. */
export const isoDay = (day: number): string => dayString(EPOCH_DAY + day);

/** And back: "2026-03-01" as days since 2020-01-01, or null when it is not a date. */
export function fromIsoDay(s: string | undefined): number | null {
  const day = dayOf(s);
  return day === null ? null : day - EPOCH_DAY;
}

/** Today by the viewer's own clock, counted from 2020-01-01. */
export function today(): number {
  const n = new Date();
  return ymdToDay(n.getFullYear(), n.getMonth() + 1, n.getDate()) - EPOCH_DAY;
}

/** The time a clock in `zone` reads h:min on a day (counted from 1970), as a timed span counts it: minutes since EPOCH_MS. */
export function clockMinutes(day: number, h: number, min: number, zone: string): number {
  const { y, m, d } = dayToYmd(day);
  return Math.round((partsToUtc(y, m, d, h, min, zone) - EPOCH_MS) / 60000);
}
