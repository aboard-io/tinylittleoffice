/**
 * Time zones on Intl, so no zone database ships with the app (ported from the old tree's lib/tz.ts). An
 * instant is milliseconds UTC; "parts" are the civil date and clock in a named zone. Days are counted from
 * 1970-01-01, as the kernel counts them (ymdToDay, dayToYmd).
 */
import { dayToYmd, ymdString } from '../../doc/index.ts';

export interface Parts {
  y: number;
  /** 1–12 */
  m: number;
  d: number;
  h: number;
  min: number;
  /** 0 = Sunday … 6 = Saturday */
  wd: number;
}

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmts = new Map<string, Intl.DateTimeFormat>();

function fmt(zone: string): Intl.DateTimeFormat {
  let f = fmts.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' });
    fmts.set(zone, f);
  }
  return f;
}

export function isValidZone(zone: string): boolean {
  if (!zone) return false;
  try {
    fmt(zone);
    return true;
  } catch {
    return false;
  }
}

export const localZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Every zone this browser knows, the viewer's own and UTC among them, sorted. */
export const allZones = (): string[] => Array.from(new Set(['UTC', localZone(), ...Intl.supportedValuesOf('timeZone')])).sort();

/** The civil date and clock of an instant in a zone. */
export function utcToParts(ms: number, zone: string): Parts {
  const out: Parts = { y: 0, m: 0, d: 0, h: 0, min: 0, wd: 0 };
  for (const p of fmt(zone).formatToParts(new Date(ms))) {
    if (p.type === 'year') out.y = +p.value;
    else if (p.type === 'month') out.m = +p.value;
    else if (p.type === 'day') out.d = +p.value;
    else if (p.type === 'hour') out.h = +p.value % 24;
    else if (p.type === 'minute') out.min = +p.value;
    else if (p.type === 'weekday') out.wd = WD[p.value] ?? 0;
  }
  return out;
}

/** A zone's offset from UTC at an instant, in minutes (east positive). */
export function offsetMinutes(ms: number, zone: string): number {
  const p = utcToParts(ms, zone);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Math.floor(ms / 60000) * 60000) / 60000);
}

/** The instant a clock in a zone reads this date and time; a time in a clock change's gap lands on a real one. */
export function partsToUtc(y: number, m: number, d: number, h: number, min: number, zone: string): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off = offsetMinutes(guess, zone);
  let utc = guess - off * 60000;
  const off2 = offsetMinutes(utc, zone);
  if (off2 !== off) utc = guess - off2 * 60000;
  return utc;
}

/** A zone's short name at an instant: "EST", "GMT+2". */
export function zoneAbbr(ms: number, zone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? zone;
  } catch {
    return zone;
  }
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
/** "2027-03-01" for a day counted from 1970. */
export function dayString(day: number): string {
  const { y, m, d } = dayToYmd(day);
  return ymdString(y, m, d);
}
/** "09:05". */
export const clockString = (p: { h: number; min: number }) => `${pad2(p.h)}:${pad2(p.min)}`;
