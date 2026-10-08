import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendar, serializeCalendar, occurrences, readRepeat, repeatText, EPOCH_DAY, EPOCH_MS, spanStartMs, type Span } from '../src/lib/calmodel.ts';
import { calendarToIcs, readCalendar } from '../src/apps/cal.def.ts';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { toMarkdown, fromMarkdown } from '../src/lib/markdown.ts';
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

const day = (y: number, m: number, d: number) => ymdToDay(y, m, d) - EPOCH_DAY;

test('repeats round trip, before the colour, and are read in words', () => {
  const cal = parseCalendar('d1jk,3*w.g,Offsite\nd1,1*m9,Rent\nt1satc,2i*d<2pi,Call\nd2,1*y0,Birthday');
  assert.deepEqual(cal.spans.map((s) => s.repeat), [{ every: 'm', count: 9 }, { every: 'y' }, { every: 'w' }, { every: 'd', until: parseInt('2pi', 36) }]);
  assert.equal(cal.spans[2].color, 'g');
  assert.equal(serializeCalendar(cal), 'd1,1*m9,Rent\nd2,1*y,Birthday\nd1jk,3*w.g,Offsite\nt1satc,2i*d<2pi,Call');
  // The plain form puts the rule after the label.
  assert.deepEqual(readRepeat('Standup every week, 9 times'), ['Standup', { every: 'w', count: 9 }]);
  assert.deepEqual(readRepeat('Rent every month until 2027-06-01'), ['Rent', { every: 'm', until: day(2027, 6, 1) }]);
  assert.deepEqual(readRepeat('Every day'), ['', { every: 'd' }]);
  assert.deepEqual(readRepeat('Sleeps every night'), ['Sleeps every night', undefined]);
  assert.equal(repeatText({ every: 'w', count: 9 }), 'every week, 9 times');
  assert.equal(repeatText({ every: 'm', until: day(2027, 6, 1) }), 'every month until 2027-06-01');
  const text = readCalendar('@America/New_York\n2027-03-01 Standup every week, 9 times\n2027-03-01 09:00-09:15 Call every month until 2027-06-01\n2027-03-02 Plain');
  const back = parseCalendar(text);
  assert.deepEqual(back.spans.map((s) => [s.label, s.repeat]), [['Standup', { every: 'w', count: 9 }], ['Call', { every: 'm', until: day(2027, 6, 1) }], ['Plain', undefined]]);
  assert.equal(text, `@America/New_York\nd${day(2027, 3, 1).toString(36)},1*w9,Standup\nt${back.spans[1].start.toString(36)},f*m<${day(2027, 6, 1).toString(36)},Call\nd${day(2027, 3, 2).toString(36)},1,Plain`);
});

test('a repeat comes round across the months', () => {
  const d = (date: [number, number, number], dur: number, repeat: Span['repeat']): Span => ({ kind: 'd', start: day(...date), dur, label: 'x', repeat });
  const starts = (s: Span, from: [number, number, number], to: [number, number, number], zone = 'UTC') => occurrences(s, ymdToDay(...from), ymdToDay(...to), zone).map((o) => (o.kind === 'd' ? isoOf(EPOCH_DAY + o.start) : new Date(spanStartMs(o)).toISOString().slice(0, 16)));
  const isoOf = (n: number) => { const p = dayToYmd(n); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
  const weekly = d([2026, 1, 5], 1, { every: 'w', count: 4 });
  assert.deepEqual(starts(weekly, [2026, 1, 1], [2026, 1, 31]), ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
  assert.deepEqual(starts(weekly, [2026, 2, 1], [2026, 2, 28]), []);
  assert.deepEqual(starts(weekly, [2026, 1, 20], [2026, 3, 31]), ['2026-01-26']);
  // A span over three days is there in a window that only touches its tail.
  assert.deepEqual(starts(d([2026, 1, 5], 3, { every: 'w' }), [2026, 1, 7], [2026, 1, 7]), ['2026-01-05']);
  assert.deepEqual(starts(d([2026, 1, 5], 1, { every: 'w', until: day(2026, 1, 19) }), [2026, 1, 1], [2026, 12, 31]), ['2026-01-05', '2026-01-12', '2026-01-19']);
  // The 31st skips the short months and only the months it happens in count; so does the 29th of February.
  assert.deepEqual(starts(d([2026, 1, 31], 1, { every: 'm', count: 3 }), [2026, 1, 1], [2026, 12, 31]), ['2026-01-31', '2026-03-31', '2026-05-31']);
  assert.deepEqual(starts(d([2024, 2, 29], 1, { every: 'y', count: 2 }), [2024, 1, 1], [2030, 12, 31]), ['2024-02-29', '2028-02-29']);
  assert.deepEqual(starts(d([2026, 1, 5], 1, { every: 'd' }), [2026, 3, 1], [2026, 3, 3]), ['2026-03-01', '2026-03-02', '2026-03-03']);
  // A plain span is itself when the window touches it and nothing otherwise.
  assert.deepEqual(starts(d([2026, 1, 5], 2, undefined), [2026, 1, 6], [2026, 1, 9]), ['2026-01-05']);
  assert.deepEqual(starts(d([2026, 1, 5], 2, undefined), [2026, 1, 7], [2026, 1, 9]), []);
  // A timed span keeps its time of day in the zone across a clock change: 9:00 New York is 14:00 UTC in winter, 13:00 in summer.
  const call: Span = { kind: 't', start: (Date.UTC(2026, 2, 1, 14, 0) - EPOCH_MS) / 60000, dur: 30, label: 'Call', repeat: { every: 'w', count: 3 } };
  assert.deepEqual(starts(call, [2026, 3, 1], [2026, 3, 31], 'America/New_York'), ['2026-03-01T14:00', '2026-03-08T13:00', '2026-03-15T13:00']);
  assert.deepEqual(starts(call, [2026, 3, 1], [2026, 3, 31], 'UTC'), ['2026-03-01T14:00', '2026-03-08T14:00', '2026-03-15T14:00']);
});

test('a repeat goes out as an RRULE, into the months drawn, the outline and Markdown', () => {
  const ctx = { created: Date.UTC(2026, 0, 2, 3, 4) };
  const ics = calendarToIcs('@America/New_York\nd2,2*w9,Offsite\ntgo,2i*m<3,Call\nd5,1*y,Birthday\nd6,1,Once', ctx);
  assert.ok(ics.includes('DTEND;VALUE=DATE:20200105\r\nRRULE:FREQ=WEEKLY;COUNT=9\r\nSUMMARY:Offsite'));
  // UNTIL is of DTSTART's kind: the end of that day in the calendar's zone, as an instant.
  assert.ok(ics.includes('DTEND:20200101T113000Z\r\nRRULE:FREQ=MONTHLY;UNTIL=20200105T045900Z\r\nSUMMARY:Call'));
  assert.ok(ics.includes('RRULE:FREQ=YEARLY\r\nSUMMARY:Birthday'));
  assert.equal(ics.match(/RRULE/g)!.length, 3);
  assert.ok(calendarToIcs('d2,1*d<3,Daily', ctx).includes('RRULE:FREQ=DAILY;UNTIL=20200104'));
  const def = appOf('cal')!;
  // Drawn: every Friday of January 2020, and the two months after, since it never ends.
  const pages = def.view('d2,1*w,Standup');
  assert.equal(pages.length, 3);
  assert.equal(pages[0].svg.match(/>Standup<\/text>/g)!.length, 5);
  // February's grid begins on Sunday the 26th of January, so it holds five Fridays too.
  assert.ok(pages[1].svg.includes('>February 2020</text>') && pages[1].svg.match(/>Standup<\/text>/g)!.length === 5);
  // Nine times, then no more: it is over in February, so there is no page for March.
  assert.equal(def.view('d2,1*w9,Standup').length, 2);
  assert.equal(def.view('d2,1*w9,Standup', { embed: true, step: 0 })[0].svg.includes('Standup'), false);
  assert.deepEqual(def.outline('d2,1*w9,Standup\nd3,1,Once'), ['2020-01-03, every week, 9 times  ·  Standup', '2020-01-04  ·  Once']);
  const md = toMarkdown(def, 'd2,1*w9,Standup\nd3,2,Once');
  assert.equal(md, '- 2020-01-03: Standup every week, 9 times\n- 2020-01-04 (2 days): Once\n');
  assert.equal(parseCalendar(fromMarkdown(def, md)).spans[0].repeat?.count, 9);
});
