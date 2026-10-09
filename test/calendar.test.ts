import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCalendar, serializeCalendar, readCalendar, occurrences, readRepeat, repeatText, EPOCH_DAY, EPOCH_MS, spanStartMs, type Span } from '../src/lib/calmodel.ts';
import { calendarToIcs } from '../src/apps/cal.def.ts';
import '../src/apps/index.ts';
import { appOf } from '../src/kit/core.ts';
import { toMarkdown, fromMarkdown } from '../src/lib/markdown.ts';
import { partsToUtc, utcToParts, offsetMinutes, ymdToDay, dayToYmd, zoneAbbr, isValidZone } from '../src/lib/tz.ts';

test('calendar round trip, sorted, with zone header', () => {
  const cal = {
    zone: 'America/New_York',
    spans: [
      { kind: 'd' as const, start: -5, dur: 1, label: '' },
      { kind: 'd' as const, start: 2000, dur: 3, label: 'Offsite' },
      { kind: 't' as const, start: 3_000_000, dur: 90, label: 'Call: with colon' },
      { kind: 't' as const, start: 3_000_000, dur: 600, label: 'Long' },
      { kind: 't' as const, start: 3_000_000 + 1080, dur: 240, label: 'Late' },
      { kind: 't' as const, start: 3_000_000 + 1080, dur: 0, label: 'Ping' },
    ],
  };
  const s = serializeCalendar(cal);
  assert.equal(s, '---\nzone: America/New_York\n---\n- 2019-12-27:\n- 2025-06-23 to 2025-06-25: Offsite\n- 2025-09-14 04:00-05:30: Call: with colon\n- 2025-09-14 04:00-14:00: Long\n- 2025-09-14 22:00 to 2025-09-15 02:00: Late\n- 2025-09-14 22:00: Ping');
  const back = parseCalendar(s);
  assert.equal(back.zone, 'America/New_York');
  assert.deepEqual(back.spans, cal.spans);
  assert.equal(serializeCalendar(back), s);
  // Without a zone, times are UTC.
  assert.equal(serializeCalendar({ zone: '', spans: [cal.spans[2]] }), '- 2025-09-14 08:00-09:30: Call: with colon');
});

test('calendar ignores what is not a span and clamps durations', () => {
  const c = parseCalendar('- someday: x\nA paragraph 2027-03-01\n- 2027-03-02 to 2027-03-01: Backwards\n- 2027-03-02 10:00-09:00: Overnight');
  assert.deepEqual(c.spans.map((s) => [s.kind, s.dur, s.label]), [['d', 1, 'Backwards'], ['t', 23 * 60, 'Overnight']]);
  assert.equal(serializeCalendar({ zone: 'UTC', spans: [] }), '');
});

test('colours and what they stand for live in attributes and the header', () => {
  const text = '---\nzone: Europe/London\ngreen: Sam\nindigo: Paul\n---\n- 2027-03-01: Launch\n- 2027-03-02: Offsite {color=green}';
  const cal = parseCalendar(text);
  assert.deepEqual(cal.legend, { '': 'Paul', g: 'Sam' });
  assert.equal(cal.spans[1].color, 'g');
  assert.equal(serializeCalendar(cal), '---\nzone: Europe/London\nindigo: Paul\ngreen: Sam\n---\n- 2027-03-01: Launch\n- 2027-03-02: Offsite {color=green}');
  // A letter is read as its colour too; an unknown colour is no colour.
  assert.deepEqual(parseCalendar('- 2027-03-01: a {color=r}\n- 2027-03-02: b {color=mauve}').spans.map((s) => s.color), ['r', undefined]);
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

test('repeats round trip as attributes, and are read in words', () => {
  const cal = parseCalendar('- 2025-06-23 to 2025-06-25: Offsite {color=green every=week}\n- 2020-01-02: Rent {every=month times=9}\n- 2025-09-14 08:00-08:30: Call {every=day until=2027-06-01}\n- 2020-01-03: Birthday {every=year times=0}');
  assert.deepEqual(cal.spans.map((s) => s.repeat), [{ every: 'm', count: 9 }, { every: 'y' }, { every: 'w' }, { every: 'd', until: day(2027, 6, 1) }]);
  assert.equal(cal.spans[2].color, 'g');
  assert.equal(serializeCalendar(cal), '- 2020-01-02: Rent {every=month times=9}\n- 2020-01-03: Birthday {every=year}\n- 2025-06-23 to 2025-06-25: Offsite {color=green every=week}\n- 2025-09-14 08:00-08:30: Call {every=day until=2027-06-01}');
  // Loosely written, the rule goes after the label.
  assert.deepEqual(readRepeat('Standup every week, 9 times'), ['Standup', { every: 'w', count: 9 }]);
  assert.deepEqual(readRepeat('Rent every month until 2027-06-01'), ['Rent', { every: 'm', until: day(2027, 6, 1) }]);
  assert.deepEqual(readRepeat('Every day'), ['', { every: 'd' }]);
  assert.deepEqual(readRepeat('Sleeps every night'), ['Sleeps every night', undefined]);
  assert.equal(repeatText({ every: 'w', count: 9 }), 'every week, 9 times');
  assert.equal(repeatText({ every: 'm', until: day(2027, 6, 1) }), 'every month until 2027-06-01');
  const text = readCalendar('Time zone: America/New_York\n\n2027-03-01 Standup every week, 9 times\n- 2027-03-01 09:00-09:15 Call every month until 2027-06-01\n2027-03-02 (3 days): Offsite\n2027-03-05 22:00-01:00: Night');
  assert.equal(text, '---\nzone: America/New_York\n---\n- 2027-03-01: Standup {every=week times=9}\n- 2027-03-01 09:00-09:15: Call {every=month until=2027-06-01}\n- 2027-03-02 to 2027-03-04: Offsite\n- 2027-03-05 22:00 to 2027-03-06 01:00: Night');
  // The canonical text reads as itself, and a label in canonical text keeps its words.
  assert.equal(readCalendar(text), text);
  assert.equal(parseCalendar('- 2027-03-01: Standup every week').spans[0].label, 'Standup every week');
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
  const ics = calendarToIcs('---\nzone: America/New_York\n---\n- 2020-01-03 to 2020-01-04: Offsite {every=week times=9}\n- 2019-12-31 19:00-20:30: Call {every=month until=2020-01-04}\n- 2020-01-06: Birthday {every=year}\n- 2020-01-07: Once', ctx);
  assert.ok(ics.includes('DTEND;VALUE=DATE:20200105\r\nRRULE:FREQ=WEEKLY;COUNT=9\r\nSUMMARY:Offsite'));
  // UNTIL is of DTSTART's kind: the end of that day in the calendar's zone, as an instant.
  assert.ok(ics.includes('DTEND:20200101T013000Z\r\nRRULE:FREQ=MONTHLY;UNTIL=20200105T045900Z\r\nSUMMARY:Call'));
  assert.ok(ics.includes('RRULE:FREQ=YEARLY\r\nSUMMARY:Birthday'));
  assert.equal(ics.match(/RRULE/g)!.length, 3);
  assert.ok(calendarToIcs('- 2020-01-03: Daily {every=day until=2020-01-04}', ctx).includes('RRULE:FREQ=DAILY;UNTIL=20200104'));
  const def = appOf('cal')!;
  // Drawn: every Friday of January 2020, and the two months after, since it never ends.
  const weekly = '- 2020-01-03: Standup {every=week}';
  const nine = '- 2020-01-03: Standup {every=week times=9}';
  const pages = def.view(weekly);
  assert.equal(pages.length, 3);
  assert.equal(pages[0].svg.match(/>Standup<\/text>/g)!.length, 5);
  // February's grid begins on Sunday the 26th of January, so it holds five Fridays too.
  assert.ok(pages[1].svg.includes('>February 2020</text>') && pages[1].svg.match(/>Standup<\/text>/g)!.length === 5);
  // Nine times, then no more: it is over in February, so there is no page for March.
  assert.equal(def.view(nine).length, 2);
  assert.equal(def.view(nine, { embed: true, step: 0 })[0].svg.includes('Standup'), false);
  assert.deepEqual(def.outline(nine + '\n- 2020-01-04: Once'), ['2020-01-03, every week, 9 times  ·  Standup', '2020-01-04  ·  Once']);
  // Markdown is the text itself, and reads back as it went.
  const body = nine + '\n- 2020-01-04 to 2020-01-05: Once';
  const md = toMarkdown(body);
  assert.equal(md, body + '\n');
  assert.equal(fromMarkdown(def, md), body);
  assert.equal(fromMarkdown(def, '```markdown\n---\nzone: Europe/Paris\n---\n- 2020-01-03 09:00: Call\n```'), '---\nzone: Europe/Paris\n---\n- 2020-01-03 09:00: Call');
});
