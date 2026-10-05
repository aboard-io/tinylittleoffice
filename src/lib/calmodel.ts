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
 */
import { ymdToDay } from './tz.ts';

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
}

export interface Calendar {
  zone: string;
  spans: Span[];
}

const b36 = (n: number) => Math.round(n).toString(36);

export function parseCalendar(text: string): Calendar {
  const cal: Calendar = { zone: '', spans: [] };
  if (!text) return cal;
  for (const line of text.split('\n')) {
    if (line.startsWith('@')) {
      cal.zone = line.slice(1);
      continue;
    }
    const kind = line[0];
    if (kind !== 'd' && kind !== 't') continue;
    const parts = line.slice(1).split(',');
    if (parts.length < 2) continue;
    const start = parseInt(parts[0], 36);
    const dur = parseInt(parts[1], 36);
    if (!Number.isFinite(start) || !Number.isFinite(dur)) continue;
    cal.spans.push({ kind, start, dur: Math.max(kind === 'd' ? 1 : 0, dur), label: parts.slice(2).join(',') });
  }
  sortSpans(cal.spans);
  return cal;
}

export function serializeCalendar(cal: Calendar): string {
  const lines: string[] = [];
  if (cal.zone && cal.spans.length) lines.push('@' + cal.zone);
  for (const s of cal.spans) {
    const label = s.label.replace(/\n/g, ' ').slice(0, MAX_LABEL);
    lines.push(`${s.kind}${b36(s.start)},${b36(s.dur)}${label ? ',' + label : ''}`);
  }
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
