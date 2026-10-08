import { PALETTE } from './palette.ts';
import { ACCENT } from '../kit/core.ts';
/**
 * Calendar document model.
 *
 * Format, one span per line, optionally preceded by "@Zone/Name" (the zone the
 * document was last edited in):
 *   d<start>,<days>,<label>      all-day span; start = days since 2020-01-01,
 *                                a floating civil date, the same everywhere
 *   t<start>,<minutes>,<label>   timed span; start = minutes since
 *                                2020-01-01T00:00Z, an absolute instant
 * Numbers are base 36 to keep them short.
 *
 * A span may have a colour: a letter after its length, set off by a full
 * stop ("d1,2.g,Offsite"). Lines "#<letter>=<name>" say what a colour stands
 * for ("#g=Sam"; "#=Paul" names the default colour), so two people sharing
 * a calendar can each take one.
 *
 * A span may repeat: a star and a letter after its length, before the colour
 * ("d1,2*w.g,Offsite"): *d every day, *w every week, *m every month, *y every
 * year. A number after the letter says how many times in all ("*w9"), or "<"
 * and a day count (since 2020-01-01, like a start) says the last day it may
 * start on ("*w<2pi"); with neither it goes on for ever. A timed span repeats
 * at the same time of day in the document's zone, so a weekly call stays at
 * nine o'clock across a clock change. A reader that knows nothing of repeats
 * still sees the first time, in its colour.
 */
import { dayToYmd, partsToUtc, utcToParts, ymdString, ymdToDay } from './tz.ts';

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

const b36 = (n: number) => Math.round(n).toString(36);

export function parseCalendar(text: string): Calendar {
  const cal: Calendar = { zone: '', spans: [] };
  if (!text) return cal;
  for (const line of text.split('\n')) {
    if (line.startsWith('@')) {
      cal.zone = line.slice(1);
      continue;
    }
    const key = /^#([a-z]?)=(.*)$/.exec(line);
    if (key) {
      if (key[1] in CAL_COLORS && key[2].trim()) (cal.legend ??= {})[key[1]] = key[2].trim();
      continue;
    }
    const kind = line[0];
    if (kind !== 'd' && kind !== 't') continue;
    const parts = line.slice(1).split(',');
    if (parts.length < 2) continue;
    const start = parseInt(parts[0], 36);
    const dur = parseInt(parts[1], 36);
    if (!Number.isFinite(start) || !Number.isFinite(dur)) continue;
    const span: Span = { kind, start, dur: Math.max(kind === 'd' ? 1 : 0, dur), label: parts.slice(2).join(',') };
    const rep = /\*([dwmy])(?:<(-?[0-9a-z]+)|([0-9a-z]+))?/.exec(parts[1]);
    if (rep) {
      span.repeat = { every: rep[1] as Every };
      if (rep[2]) span.repeat.until = parseInt(rep[2], 36);
      else if (rep[3] && parseInt(rep[3], 36) > 0) span.repeat.count = parseInt(rep[3], 36);
    }
    const color = /\.([a-z])$/.exec(parts[1])?.[1];
    if (color && color in CAL_COLORS) span.color = color;
    cal.spans.push(span);
  }
  sortSpans(cal.spans);
  return cal;
}

const repeatCode = (r: Repeat | undefined) => (r ? `*${r.every}${r.count ? b36(r.count) : r.until !== undefined ? '<' + b36(r.until) : ''}` : '');

export function serializeCalendar(cal: Calendar): string {
  const lines: string[] = [];
  if (cal.zone && cal.spans.length) lines.push('@' + cal.zone);
  for (const s of cal.spans) {
    const label = s.label.replace(/\n/g, ' ').slice(0, MAX_LABEL);
    lines.push(`${s.kind}${b36(s.start)},${b36(s.dur)}${repeatCode(s.repeat)}${s.color ? '.' + s.color : ''}${label ? ',' + label : ''}`);
  }
  // Only the names of colours in use are worth keeping.
  for (const [key, name] of Object.entries(cal.legend ?? {})) if (name.trim() && cal.spans.some((s) => (s.color ?? '') === key)) lines.push(`#${key}=${name.trim().replace(/\n/g, ' ')}`);
  return lines.join('\n');
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
    const { y, m, d } = dayToYmd(day);
    out.push({ ...s, start: t ? Math.round((partsToUtc(y, m, d, t.h, t.min, zone) - EPOCH_MS) / 60000) : day - EPOCH_DAY });
  }
  return out;
}

/** "2026-03-01" for a day counted from 2020-01-01, the way todo and gantt count. */
export function isoDay(day: number): string {
  const { y, m, d } = dayToYmd(EPOCH_DAY + day);
  return ymdString(y, m, d);
}
