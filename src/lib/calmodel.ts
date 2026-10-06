import { PALETTE } from './palette.ts';
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
 */
import { dayToYmd, ymdString, ymdToDay } from './tz.ts';

export const EPOCH_MS = Date.UTC(2020, 0, 1);
export const EPOCH_DAY = ymdToDay(2020, 1, 1);
export const MAX_LABEL = 60;

export interface Span {
  kind: 'd' | 't';
  /** 'd': day number since EPOCH_DAY. 't': minutes since EPOCH_MS (UTC). */
  start: number;
  /** 'd': whole days, at least 1. 't': minutes, at least 0. */
  dur: number;
  label: string;
  /** A key of CAL_COLORS; absent for the default. */
  color?: string;
}

export interface Calendar {
  zone: string;
  spans: Span[];
  /** What each colour stands for, by colour key ('' is the default colour). */
  legend?: Record<string, string>;
}

export const CAL_COLORS: Record<string, { name: string; hex: string }> = { '': { name: 'Indigo', hex: '#4f46e5' }, r: PALETTE.r, o: PALETTE.o, g: PALETTE.g, b: PALETTE.b, p: PALETTE.p };

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
    const color = /\.([a-z])$/.exec(parts[1])?.[1];
    if (color && color in CAL_COLORS) span.color = color;
    cal.spans.push(span);
  }
  sortSpans(cal.spans);
  return cal;
}

export function serializeCalendar(cal: Calendar): string {
  const lines: string[] = [];
  if (cal.zone && cal.spans.length) lines.push('@' + cal.zone);
  for (const s of cal.spans) {
    const label = s.label.replace(/\n/g, ' ').slice(0, MAX_LABEL);
    lines.push(`${s.kind}${b36(s.start)},${b36(s.dur)}${s.color ? '.' + s.color : ''}${label ? ',' + label : ''}`);
  }
  // Only the names of colours in use are worth keeping.
  for (const [key, name] of Object.entries(cal.legend ?? {})) if (name.trim() && cal.spans.some((s) => (s.color ?? '') === key)) lines.push(`#${key}=${name.trim().replace(/\n/g, ' ')}`);
  return lines.join('\n');
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

/** "2026-03-01" for a day counted from 2020-01-01, the way todo and gantt count. */
export function isoDay(day: number): string {
  const { y, m, d } = dayToYmd(EPOCH_DAY + day);
  return ymdString(y, m, d);
}
