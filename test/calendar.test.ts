import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendar, serializeCalendar, EPOCH_DAY, EPOCH_MS, spanStartMs } from '../src/lib/calmodel.ts';
import { partsToUtc, utcToParts, offsetMinutes, ymdToDay, dayToYmd, zoneAbbr, isValidZone } from '../src/lib/tz.ts';

test('calendar round trip, sorted, with zone header', () => {
  const cal = {
    zone: 'America/New_York',
    spans: [
      { kind: 't' as const, start: 3_000_000, dur: 90, label: 'Call, with comma' },
      { kind: 'd' as const, start: 2000, dur: 3, label: 'Offsite' },
      { kind: 'd' as const, start: -5, dur: 1, label: '' },
    ],
  };
  const s = serializeCalendar(cal);
  assert.equal(s, '@America/New_York\nt1satc,2i,Call, with comma\nd1jk,3,Offsite\nd-5,1');
  const back = parseCalendar(s);
  assert.equal(back.zone, 'America/New_York');
  assert.deepEqual(back.spans, [cal.spans[2], cal.spans[1], cal.spans[0]]);
});

test('calendar ignores junk and clamps durations', () => {
  const c = parseCalendar('x1,2\nd10\ndzz,0,Short day\nt10,-5,Neg');
  assert.deepEqual(c.spans, [
    { kind: 't', start: 36, dur: 0, label: 'Neg' },
    { kind: 'd', start: 1295, dur: 1, label: 'Short day' },
  ]);
  assert.equal(serializeCalendar({ zone: 'UTC', spans: [] }), '');
});

test('epochs line up', () => {
  assert.equal(spanStartMs({ kind: 'd', start: 0, dur: 1, label: '' }), EPOCH_MS);
  assert.equal(EPOCH_DAY * 86400000, EPOCH_MS);
});

test('zone conversions, including DST', () => {
  // 2026-01-15 09:00 New York = 14:00 UTC (EST). 2026-07-15 09:00 = 13:00 UTC (EDT).
  assert.equal(partsToUtc(2026, 1, 15, 9, 0, 'America/New_York'), Date.UTC(2026, 0, 15, 14, 0));
  assert.equal(partsToUtc(2026, 7, 15, 9, 0, 'America/New_York'), Date.UTC(2026, 6, 15, 13, 0));
  assert.equal(offsetMinutes(Date.UTC(2026, 0, 15), 'Asia/Kolkata'), 330);
  const p = utcToParts(Date.UTC(2026, 0, 15, 14, 0), 'Asia/Tokyo');
  assert.deepEqual(p, { y: 2026, m: 1, d: 15, h: 23, min: 0, wd: 4 });
  // Midnight stays hour 0, never 24.
  assert.equal(utcToParts(Date.UTC(2026, 0, 15, 0, 0), 'UTC').h, 0);
  // A time inside the spring-forward gap resolves to a real instant.
  const gap = partsToUtc(2026, 3, 8, 2, 30, 'America/New_York');
  assert.ok(Number.isFinite(gap));
  assert.equal(zoneAbbr(Date.UTC(2026, 0, 15), 'America/New_York'), 'EST');
  assert.ok(isValidZone('Europe/Berlin'));
  assert.ok(!isValidZone('Mars/Olympus'));
});

test('day numbers', () => {
  assert.equal(ymdToDay(1970, 1, 1), 0);
  assert.deepEqual(dayToYmd(ymdToDay(2026, 3, 1)), { y: 2026, m: 3, d: 1, wd: 0 });
});
