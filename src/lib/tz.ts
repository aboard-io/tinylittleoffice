/**
 * Time zone helpers built on Intl, so no tz database ships with the app.
 * All instants are millisecond UTC timestamps; "parts" are civil date/time
 * fields in a named zone.
 */
export interface Parts {
  y: number;
  m: number; // 1-12
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
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
    });
    fmts.set(zone, f);
  }
  return f;
}

export function isValidZone(zone: string): boolean {
  try {
    fmt(zone);
    return true;
  } catch {
    return false;
  }
}

export const localZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const allZones = (): string[] => Array.from(new Set(['UTC', localZone(), ...Intl.supportedValuesOf('timeZone')])).sort();

/** Civil fields of an instant in a zone. */
export function utcToParts(ms: number, zone: string): Parts {
  const out: Parts = { y: 0, m: 0, d: 0, h: 0, min: 0, wd: 0 };
  for (const p of fmt(zone).formatToParts(new Date(ms))) {
    switch (p.type) {
      case 'year': out.y = +p.value; break;
      case 'month': out.m = +p.value; break;
      case 'day': out.d = +p.value; break;
      case 'hour': out.h = +p.value % 24; break;
      case 'minute': out.min = +p.value; break;
      case 'weekday': out.wd = WD[p.value] ?? 0; break;
    }
  }
  return out;
}

/** Offset of a zone from UTC at an instant, in minutes (east positive). */
export function offsetMinutes(ms: number, zone: string): number {
  const p = utcToParts(ms, zone);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000);
}

/** Instant for civil fields in a zone. Handles DST gaps and overlaps sanely. */
export function partsToUtc(y: number, m: number, d: number, h: number, min: number, zone: string): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off = offsetMinutes(guess, zone);
  let utc = guess - off * 60000;
  const off2 = offsetMinutes(utc, zone);
  if (off2 !== off) utc = guess - off2 * 60000;
  return utc;
}

/** Short zone name at an instant, e.g. "EST" or "GMT+2". */
export function zoneAbbr(ms: number, zone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date(ms));
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? zone;
  } catch {
    return zone;
  }
}

/** Day number (days since 1970-01-01) of a civil date, time zone free. */
export function ymdToDay(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function dayToYmd(day: number): { y: number; m: number; d: number; wd: number } {
  const dt = new Date(day * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const ymdString = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
/** "2027-03-01" for a day number (days since 1970-01-01). */
export function dayString(day: number): string {
  const { y, m, d } = dayToYmd(day);
  return ymdString(y, m, d);
}
/** "09:05" for the clock of some parts. */
export const clockString = (p: { h: number; min: number }) => `${pad2(p.h)}:${pad2(p.min)}`;
