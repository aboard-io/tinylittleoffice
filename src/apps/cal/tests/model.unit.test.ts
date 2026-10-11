// Calendar's model under node: spans read from list items and written back canonically, repeats coming round,
// zones and clock changes, every command as operations (applied, undone by their inverse), the schedule's bars,
// the pages, the iCalendar and the CSV.
import { expect, test } from 'vitest';
import { applyAll, invertAll, parse, write, ymdToDay, type Doc, type Op } from '../../../doc/index.ts';
import { icsFold } from '../../../kit/ics.ts';
import {
  copyTasks,
  duplicateTasks,
  enterTask,
  joinTask,
  mapAt,
  moveTasks,
  pasteItems,
  setLabel,
  shiftTasks,
  toggleDone,
  ganttBars,
  ganttRange,
  itemBlock,
  moveItem,
  nameColor,
  newDraft,
  occurrences,
  openingDay,
  putItem,
  readCal,
  readWhen,
  removeSpan,
  repeatText,
  resizeItem,
  setGantt,
  spanStartMs,
  draftOf,
  writeZone,
  type Span,
} from '../model.ts';
import { calPages, calToCsv, calToIcs } from '../view.ts';
import { templates } from '../templates.ts';
import def from '../def.ts';
import { offsetMinutes, partsToUtc, utcToParts, zoneAbbr, isValidZone } from '../tz.ts';

const DOC = '---\nzone: Europe/London\ngreen: Sam\n---\n- 2027-03-01: Launch\n- 2027-03-01 to 2027-03-03: Offsite {color=green}\n- 2027-03-10 09:00-10:30: Retro {every=week times=6}\n';
/** A schedule: phases with their tasks, some done, some part done. */
const SITE_PLAN = `---
view: gantt
---
- 2027-03-01 to 2027-03-12: Discovery
  - [x] 2027-03-01 to 2027-03-03: Stakeholder interviews
  - [x] 2027-03-04 to 2027-03-05: Analytics review
  - 2027-03-08 to 2027-03-12: Content audit {done=60%}
- 2027-03-15 to 2027-04-02: Design
  - 2027-03-15 to 2027-03-19: Wireframes {done=20%}
  - 2027-03-22 to 2027-04-02: Visual design
- 2027-04-05 to 2027-04-23: Build
  - 2027-04-05 to 2027-04-16: Templates and pages {color=blue}
  - 2027-04-19 to 2027-04-23: Testing on phones {color=blue}
- 2027-04-26: Launch {color=red}
`;
const day = (y: number, m: number, d: number) => ymdToDay(y, m, d);
/** The ops applied, written; and undone by their inverse, the document as it was. */
function run(text: string, make: (doc: Doc) => Op[]): string {
  const doc = parse(text);
  const ops = make(doc);
  const after = applyAll(doc, ops);
  expect(applyAll(after, invertAll(doc, ops))).toStrictEqual(doc);
  return write(after);
}

test('a span an item: days, several days, a time, a time past midnight; the label is the words after the colon', () => {
  const v = readCal(
    parse(
      '- 2027-03-01: Launch\n- 2027-03-01 to 2027-03-03: Offsite\n- 2027-03-10 09:00-10:30: Retro\n- 2027-03-10 22:00 to 2027-03-11 01:00: Party\n- 2027-03-10 22:00-01:00: Late\n- 2027-03-12 08:00: Ping\n- someday: not a span\n\nA paragraph.\n',
    ),
  );
  expect(v.zone).toBe('');
  expect(v.items.map((i) => [i.kind, i.dur, i.words])).toEqual([
    ['d', 1, 'Launch'],
    ['d', 3, 'Offsite'],
    ['t', 90, 'Retro'],
    ['t', 180, 'Party'],
    ['t', 180, 'Late'],
    ['t', 0, 'Ping'],
  ]);
  expect(v.items[0].start).toBe(day(2027, 3, 1));
  // Without a zone, times are UTC.
  expect(spanStartMs(v.items[2])).toBe(Date.UTC(2027, 2, 10, 9, 0));
  expect(readWhen('2027-03-02 to 2027-03-01: Backwards', 'UTC')).toMatchObject({ kind: 'd', dur: 1 });
  expect(readWhen('2027-03-02 10:00-09:00: Overnight', 'UTC')).toMatchObject({ kind: 't', dur: 23 * 60 });
});

test('the label keeps its marks; colours, repeats, the legend and the zone come from attributes and the head', () => {
  const v = readCal(parse(DOC + '- 2027-03-11: **Big** [day](https://example.com) {color=r every=month until=2027-06-01}\n- 2027-03-12: odd {color=mauve every=fortnight}\n'));
  expect(v.zone).toBe('Europe/London');
  expect(v.legend).toEqual({ g: 'Sam' });
  expect(v.items[1].color).toBe('g');
  expect(v.items[2].repeat).toEqual({ every: 'w', count: 6 });
  expect(v.items[3].label).toEqual([{ t: 'Big', b: true }, { t: ' ' }, { t: 'day', href: 'https://example.com' }]);
  expect(v.items[3]).toMatchObject({ color: 'r', repeat: { every: 'm', until: day(2027, 6, 1) } });
  expect(v.items[4].color).toBe('');
  expect(v.items[4].repeat).toBeUndefined();
  // 9:00 in London in March is 9:00 UTC; in summer, 8:00.
  expect(spanStartMs(v.items[2])).toBe(Date.UTC(2027, 2, 10, 9, 0));
  expect(spanStartMs(readCal(parse('---\nzone: Europe/London\n---\n- 2027-07-10 09:00: x\n')).items[0])).toBe(Date.UTC(2027, 6, 10, 8, 0));
});

test('an item written back from its draft is the text it was read from', () => {
  const v = readCal(
    parse(
      DOC +
        '- [x] 2027-03-20: Done one {#id .x color=blue every=year note=keep}\n  - 2027-03-21 to 2027-03-22: Half {done=50%}\n- 2027-03-23 22:00 to 2027-03-24 01:00: Party\n- 2027-03-25 08:00: Ping\n- 2027-03-26:\n',
    ),
  );
  for (const i of v.items) expect(write({ head: {}, blocks: [itemBlock(draftOf(i), 'Europe/London', i.block)] })).toBe(write({ head: {}, blocks: [i.block] }));
  expect(v.items[3]).toMatchObject({ done: 100, color: 'b', depth: 0 });
  expect(v.items[4]).toMatchObject({ done: 50, depth: 1 });
});

test('a repeat comes round across the months, a 31st skipping the short ones, a timed one keeping its clock in the zone', () => {
  const d = (date: [number, number, number], dur: number, repeat: Span['repeat']): Span => ({ kind: 'd', start: day(...date), dur, color: '', repeat });
  const starts = (s: Span, from: [number, number, number], to: [number, number, number], zone = 'UTC') =>
    occurrences(s, day(...from), day(...to), zone).map((o) => new Date(spanStartMs(o)).toISOString().slice(0, o.kind === 'd' ? 10 : 16));
  const weekly = d([2026, 1, 5], 1, { every: 'w', count: 4 });
  expect(starts(weekly, [2026, 1, 1], [2026, 1, 31])).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
  expect(starts(weekly, [2026, 2, 1], [2026, 2, 28])).toEqual([]);
  expect(starts(weekly, [2026, 1, 20], [2026, 3, 31])).toEqual(['2026-01-26']);
  expect(starts(d([2026, 1, 5], 3, { every: 'w' }), [2026, 1, 7], [2026, 1, 7])).toEqual(['2026-01-05']);
  expect(starts(d([2026, 1, 5], 1, { every: 'w', until: day(2026, 1, 19) }), [2026, 1, 1], [2026, 12, 31])).toEqual(['2026-01-05', '2026-01-12', '2026-01-19']);
  expect(starts(d([2026, 1, 31], 1, { every: 'm', count: 3 }), [2026, 1, 1], [2026, 12, 31])).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  expect(starts(d([2024, 2, 29], 1, { every: 'y', count: 2 }), [2024, 1, 1], [2030, 12, 31])).toEqual(['2024-02-29', '2028-02-29']);
  expect(starts(d([2026, 1, 5], 2, undefined), [2026, 1, 7], [2026, 1, 9])).toEqual([]);
  // 9:00 in New York is 14:00 UTC in winter and 13:00 once the clocks go forward.
  const call: Span = { kind: 't', start: Date.UTC(2026, 2, 1, 14, 0) / 60000, dur: 30, color: '', repeat: { every: 'w', count: 3 } };
  expect(starts(call, [2026, 3, 1], [2026, 3, 31], 'America/New_York')).toEqual(['2026-03-01T14:00', '2026-03-08T13:00', '2026-03-15T13:00']);
  expect(repeatText({ every: 'w', count: 9 })).toBe('Every week, 9 times');
  expect(repeatText({ every: 'm', until: day(2027, 6, 1) })).toBe('Every month until 2027-06-01');
});

test('zones on Intl, with clock changes', () => {
  expect(partsToUtc(2026, 1, 15, 9, 0, 'America/New_York')).toBe(Date.UTC(2026, 0, 15, 14, 0));
  expect(partsToUtc(2026, 7, 15, 9, 0, 'America/New_York')).toBe(Date.UTC(2026, 6, 15, 13, 0));
  expect(offsetMinutes(Date.UTC(2026, 0, 15), 'Asia/Kolkata')).toBe(330);
  expect(utcToParts(Date.UTC(2026, 0, 15, 14, 0), 'Asia/Tokyo')).toEqual({ y: 2026, m: 1, d: 15, h: 23, min: 0, wd: 4 });
  expect(utcToParts(Date.UTC(2026, 0, 15, 0, 0), 'UTC').h).toBe(0);
  expect(Number.isFinite(partsToUtc(2026, 3, 8, 2, 30, 'America/New_York'))).toBe(true);
  expect(zoneAbbr(Date.UTC(2026, 0, 15), 'America/New_York')).toBe('EST');
  expect(isValidZone('Europe/Berlin')).toBe(true);
  expect(isValidZone('Mars/Olympus')).toBe(false);
});

test("a new span goes in date order; a time written into a calendar with no zone gives it the viewer's", () => {
  expect(run(DOC, (doc) => putItem(doc, readCal(doc), null, { ...newDraft(day(2027, 3, 5)), label: [{ t: 'Mid' }] }, 'Asia/Tokyo'))).toBe(
    DOC.replace('- 2027-03-10', '- 2027-03-05: Mid\n- 2027-03-10'),
  );
  expect(run(DOC, (doc) => putItem(doc, readCal(doc), null, newDraft(day(2027, 4, 1), day(2027, 4, 2), 'g'), 'UTC'))).toBe(DOC + '- 2027-04-01 to 2027-04-02: {color=green}\n');
  // A span of days is the same everywhere: no zone is written for it.
  expect(run('', (doc) => putItem(doc, readCal(doc), null, newDraft(day(2027, 4, 1)), 'Asia/Tokyo'))).toBe('- 2027-04-01:\n');
  const timed = { kind: 't' as const, start: Date.UTC(2027, 2, 1, 0, 0) / 60000, dur: 60, color: '', label: [{ t: 'Call' }], done: 0 };
  // Tokyo is nine hours on: midnight UTC is 9:00 there, and the head says so.
  expect(run('- 2027-03-01: a\n', (doc) => putItem(doc, readCal(doc), null, timed, 'Asia/Tokyo'))).toBe('---\nzone: Asia/Tokyo\n---\n- 2027-03-01: a\n- 2027-03-01 09:00-10:00: Call\n');
  // A calendar already holding times in UTC keeps writing them in UTC.
  const utc = '- 2027-03-01 12:00: a\n';
  expect(writeZone(readCal(parse(utc)), 'Asia/Tokyo')).toEqual({ zone: 'UTC', ops: [] });
  expect(run(utc, (doc) => putItem(doc, readCal(doc), null, timed, 'Asia/Tokyo'))).toBe('- 2027-03-01 00:00-01:00: Call\n' + utc);
});

test('edit, move, resize, remove, legend and view, each as operations that undo exactly', () => {
  const edited = run(DOC, (doc) => {
    const v = readCal(doc);
    return putItem(doc, v, v.items[1], { ...draftOf(v.items[1]), label: [{ t: 'Away day', b: true }], repeat: { every: 'y' }, color: 'o' }, 'UTC');
  });
  expect(edited).toBe(DOC.replace('Offsite {color=green}', '**Away day** {color=orange every=year}'));
  expect(run(DOC, (doc) => moveItem(readCal(doc), readCal(doc).items[1], 2))).toBe(DOC.replace('2027-03-01 to 2027-03-03', '2027-03-03 to 2027-03-05'));
  // A timed span moved a day keeps its clock: 09:00 in London either side of the change to summer time.
  expect(run('---\nzone: Europe/London\n---\n- 2027-03-27 09:00-10:00: x\n', (doc) => moveItem(readCal(doc), readCal(doc).items[0], 1))).toBe(
    '---\nzone: Europe/London\n---\n- 2027-03-28 09:00-10:00: x\n',
  );
  expect(run(DOC, (doc) => resizeItem(readCal(doc), readCal(doc).items[0], 4))).toBe(DOC.replace('2027-03-01: Launch', '2027-03-01 to 2027-03-04: Launch'));
  expect(run(DOC, (doc) => removeSpan(doc, readCal(doc).items[0]))).toBe(DOC.replace('- 2027-03-01: Launch\n', ''));
  expect(run(DOC, () => nameColor('g', ''))).toBe(DOC.replace('green: Sam\n', ''));
  expect(run(DOC, () => nameColor('', 'Paul'))).toBe(DOC.replace('green: Sam\n', 'green: Sam\nindigo: Paul\n'));
  expect(run(DOC, (doc) => setGantt(readCal(doc), true))).toBe(DOC.replace('green: Sam\n', 'green: Sam\nview: gantt\n'));
  expect(setGantt(readCal(parse(DOC)), false)).toEqual([]);
  expect(moveItem(readCal(parse(DOC)), readCal(parse(DOC)).items[0], 0)).toEqual([]);
});

test('the schedule: a task with parts spans them and is as done as they are; a new task goes after the family it is added to', () => {
  const plan = SITE_PLAN;
  const v = readCal(parse(plan));
  expect(v.gantt).toBe(true);
  const bars = ganttBars(v);
  expect(bars.map((b) => [b.item.words, b.parent, b.days, b.done])).toEqual([
    ['Discovery', true, 12, Math.round((3 * 100 + 2 * 100 + 5 * 60) / 10)],
    ['Stakeholder interviews', false, 3, 100],
    ['Analytics review', false, 2, 100],
    ['Content audit', false, 5, 60],
    ['Design', true, 19, Math.round((5 * 20) / 17)],
    ['Wireframes', false, 5, 20],
    ['Visual design', false, 12, 0],
    ['Build', true, 19, 0],
    ['Templates and pages', false, 12, 0],
    ['Testing on phones', false, 5, 0],
    ['Launch', false, 1, 0],
  ]);
  expect(ganttRange(bars)).toEqual({ from: day(2027, 3, 1), to: day(2027, 4, 27) });
  expect(ganttRange([])).toBeNull();
  const after = run(plan, (doc) => {
    const w = readCal(doc);
    return putItem(doc, w, null, { ...newDraft(day(2027, 3, 13)), label: [{ t: 'Report' }] }, 'UTC', w.items[1]);
  });
  expect(after).toContain('  - [x] 2027-03-01 to 2027-03-03: Stakeholder interviews\n  - 2027-03-13: Report\n  - [x] 2027-03-04');
  // Taking out a phase brings its tasks out a level.
  expect(run(plan, (doc) => removeSpan(doc, readCal(doc).items[0]))).toMatch(/^---\nview: gantt\n---\n- \[x\] 2027-03-01 to 2027-03-03: Stakeholder interviews\n- \[x\]/);
});

test('the calendar opens on what comes next, else the last thing, else today', () => {
  const v = readCal(parse(DOC));
  expect(openingDay(v, 'UTC', Date.UTC(2027, 2, 2))).toBe(day(2027, 3, 1));
  expect(openingDay(v, 'UTC', Date.UTC(2027, 2, 20))).toBe(day(2027, 3, 24));
  expect(openingDay(v, 'UTC', Date.UTC(2030, 0, 1))).toBe(day(2027, 3, 10));
  expect(openingDay(readCal(parse('')), 'UTC', Date.UTC(2030, 0, 1))).toBe(day(2030, 1, 1));
});

test('pages: months with every time a repeat comes round, the legend at the foot; a schedule as its chart', () => {
  const weekly = parse('- 2020-01-03: Standup {every=week}\n');
  const pages = calPages(weekly);
  expect(pages).toHaveLength(3);
  expect(pages[0].svg.match(/>Standup<\/text>/g)).toHaveLength(5);
  expect(pages[1].svg).toContain('>February 2020</text>');
  expect(calPages(parse('- 2020-01-03: Standup {every=week times=9}\n'))).toHaveLength(2);
  expect(calPages(weekly, true)).toHaveLength(1);
  expect(calPages(parse(DOC))[0].svg).toContain('>Sam</text>');
  expect(calPages(parse(DOC))[0].alt).toContain('1: Launch');
  const plan = calPages(parse(SITE_PLAN));
  expect(plan).toHaveLength(1);
  expect(plan[0].svg).toContain('>Discovery</text>');
  expect(plan[0].alt).toContain('Content audit: 2027-03-08, 5 days, 60%');
  expect(calPages(parse('---\nview: gantt\n---\n'))[0].svg).toContain('No tasks yet');
  // An empty calendar is this month.
  expect(def.view('')).toHaveLength(1);
});

test('iCalendar: floating days, instants, repeats as RRULEs, lines folded at 75 octets', () => {
  const ics = calToIcs(
    parse(
      '---\nzone: America/New_York\n---\n- 2020-01-03 to 2020-01-04: Offsite {every=week times=9}\n- 2019-12-31 19:00-20:30: Call {every=month until=2020-01-04}\n- 2020-01-06: Birthday {every=year}\n- 2020-01-07: Once, with; marks\n- 2020-01-08: Half {done=50%}\n',
    ),
    Date.UTC(2026, 0, 2, 3, 4),
  );
  expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//TinyLittleOffice//Calendar//EN\r\n')).toBe(true);
  expect(ics).toContain('DTSTAMP:20260102T030400Z');
  expect(ics).toContain('DTSTART;VALUE=DATE:20200103\r\nDTEND;VALUE=DATE:20200105\r\nRRULE:FREQ=WEEKLY;COUNT=9\r\nSUMMARY:Offsite');
  expect(ics).toContain('DTSTART:20200101T000000Z\r\nDTEND:20200101T013000Z\r\nRRULE:FREQ=MONTHLY;UNTIL=20200105T045900Z\r\nSUMMARY:Call');
  expect(ics).toContain('RRULE:FREQ=YEARLY\r\nSUMMARY:Birthday');
  expect(ics).toContain('SUMMARY:Once\\, with\; marks');
  expect(ics).toContain('DESCRIPTION:50% done');
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(5);
  expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  // Folding: no line over 75 octets, a character never split, the continuation a space.
  const long = icsFold('SUMMARY:' + 'é'.repeat(60));
  const enc = new TextEncoder();
  for (const line of long.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
  expect(
    long
      .split('\r\n')
      .slice(1)
      .every((l) => l.startsWith(' ')),
  ).toBe(true);
  expect(long.replace(/\r\n /g, '')).toBe('SUMMARY:' + 'é'.repeat(60));
});

test("CSV: a calendar's spans, a schedule's tasks with their level", () => {
  expect(calToCsv(parse(DOC))).toBe(
    'What,Start,End,Repeats,Colour\r\nLaunch,2027-03-01,2027-03-01,,\r\nOffsite,2027-03-01,2027-03-03,,Sam\r\nRetro,2027-03-10 09:00,2027-03-10 10:30,"Every week, 6 times",\r\n',
  );
  const plan = calToCsv(parse(SITE_PLAN), ';');
  expect(plan.split('\r\n').slice(0, 3)).toEqual(['Task;Level;Start;End;Days;Done %', 'Discovery;1;2027-03-01;2027-03-12;12;80', 'Stakeholder interviews;2;2027-03-01;2027-03-03;3;100']);
});

test('the templates are canonical, and the definition names its exports', async () => {
  for (const tpl of templates()) expect(write(parse(tpl.doc))).toBe(tpl.doc);
  expect((await def.templates()).map((x) => x.id)).toEqual([
    'family',
    'school',
    'bills',
    'rota',
    'holidays',
    'fixtures',
    'garden',
    'content',
    'editorial',
    'training',
    'project',
    'conference',
    'festival',
  ]);
  expect(def.exports!.map((e) => e.ext)).toEqual(['ics', 'csv']);
  expect(def.retitle(DOC, 'Team')).toBe(DOC.replace('green: Sam\n', 'green: Sam\ntitle: Team\n'));
  expect(def.title(def.retitle(DOC, 'Team'))).toBe('Team');
});

test('every template is a real calendar: a title, a name and a blurb, every list item a span with words, every colour named, and a page that draws', () => {
  for (const tpl of templates()) {
    const doc = parse(tpl.doc);
    const v = readCal(doc);
    expect([def.title(tpl.doc), tpl.name, tpl.blurb].every(Boolean), tpl.id).toBe(true);
    expect(
      doc.blocks.every((b) => b.k === 'li'),
      tpl.id,
    ).toBe(true);
    expect(v.items, tpl.id).toHaveLength(doc.blocks.length);
    expect(
      v.items.every((i) => i.words.length > 2),
      tpl.id,
    ).toBe(true);
    // A colour written on an item is a calendar colour, and (on a calendar) the head says what it stands for.
    for (const i of v.items) if (i.block.a?.kv?.color) expect(v.gantt || !!v.legend[i.color], `${tpl.id}: ${i.words}`).toBe(true);
    // A time needs the zone it is in.
    if (v.items.some((i) => i.kind === 't')) expect(v.zone, tpl.id).not.toBe('');
    const [page] = calPages(doc, true);
    expect(page.svg.length, tpl.id).toBeGreaterThan(500);
    expect(page.svg, tpl.id).not.toContain('No tasks yet');
  }
  // The schedules are the training plan and the project; the rest are months.
  expect(
    templates()
      .filter((x) => readCal(parse(x.doc)).gantt)
      .map((x) => x.id),
  ).toEqual(['training', 'project']);
  // The training plan is part way through: two weeks ticked, the third most of the way.
  const run = ganttBars(readCal(parse(templates().find((x) => x.id === 'training')!.doc)));
  expect(run.slice(1, 4).map((b) => b.done)).toEqual([100, 100, 70]);
  expect(run.at(-1)!.item.words).toBe('Race day: 9 am start, 1:55 the goal');
});

const PLAN = '---\nview: gantt\n---\n- 2027-03-01 to 2027-03-05: Design\n  - 2027-03-01 to 2027-03-02: Sketch {done=50%}\n  - 2027-03-03 to 2027-03-05: Draw\n- 2027-03-08 to 2027-03-10: Build\n';
const item = (doc: Doc, at: number) => readCal(doc).items.find((i) => i.at === at)!;

test('tasks as rows: a span moved past its neighbour, nested and brought out, duplicated, copied to the margin', () => {
  expect(run(PLAN, (d) => moveTasks(d, { from: 0, to: 3 }, 1)!)).toBe(
    '---\nview: gantt\n---\n- 2027-03-08 to 2027-03-10: Build\n- 2027-03-01 to 2027-03-05: Design\n  - 2027-03-01 to 2027-03-02: Sketch {done=50%}\n  - 2027-03-03 to 2027-03-05: Draw\n',
  );
  expect(moveTasks(parse(PLAN), { from: 0, to: 3 }, -1)).toBeNull();
  // A part moves among its siblings only.
  expect(moveTasks(parse(PLAN), { from: 2, to: 3 }, 1)).toBeNull();
  expect(run(PLAN, (d) => shiftTasks(d, { from: 3, to: 4 }, 1)!)).toBe(PLAN.replace('- 2027-03-08', '  - 2027-03-08'));
  expect(shiftTasks(parse(PLAN), { from: 0, to: 3 }, 1)).toBeNull();
  expect(shiftTasks(parse(PLAN), { from: 0, to: 3 }, -1)).toBeNull();
  expect(run(PLAN, (d) => shiftTasks(d, { from: 1, to: 3 }, -1)!)).toBe(PLAN.replace('  - 2027-03-01 to 2027-03-02', '- 2027-03-01 to 2027-03-02').replace('  - 2027-03-03', '- 2027-03-03'));
  expect(run(PLAN, (d) => duplicateTasks(d, { from: 3, to: 4 }).ops)).toBe(PLAN + '- 2027-03-08 to 2027-03-10: Build\n');
  expect(duplicateTasks(parse(PLAN), { from: 1, to: 2 }).at).toBe(2);
  expect(write({ head: {}, blocks: copyTasks(parse(PLAN), { from: 1, to: 3 }) })).toBe('- 2027-03-01 to 2027-03-02: Sketch {done=50%}\n- 2027-03-03 to 2027-03-05: Draw\n');
  expect(mapAt([{ op: 'move', at: 0, n: 3, to: 1 }], 3)).toBe(0);
  expect(mapAt([{ op: 'splice', at: 0, n: 1, blocks: [] }], 0)).toBe(-1);
});

test("a task's words in place: set, ticked and unticked, Enter at the start, end and middle, Backspace and Delete joining, an empty task taken away", () => {
  const doc = parse(PLAN);
  const v = readCal(doc);
  expect(run(PLAN, (d) => setLabel(v, item(d, 3), [{ t: 'Ship', b: true }]))).toBe(PLAN.replace(': Build', ': **Ship**'));
  expect(run(PLAN, (d) => toggleDone(v, item(d, 1)))).toBe(PLAN.replace('  - 2027-03-01 to 2027-03-02: Sketch {done=50%}', '  - [x] 2027-03-01 to 2027-03-02: Sketch'));
  const ticked = PLAN.replace('  - 2027-03-03', '  - [x] 2027-03-03');
  expect(run(ticked, (d) => toggleDone(readCal(d), item(d, 2)))).toBe(PLAN);
  // Enter: at the end the next task, on the same days; with parts, the first of them.
  const end = enterTask(doc, v, item(doc, 3), 5);
  expect(write(applyAll(doc, end.ops))).toBe(PLAN + '- 2027-03-08 to 2027-03-10:\n');
  expect([end.at, end.offset]).toEqual([4, 0]);
  expect(write(applyAll(doc, enterTask(doc, v, item(doc, 0), 6).ops))).toBe(PLAN.replace('Design\n', 'Design\n  - 2027-03-01 to 2027-03-05:\n'));
  const start = enterTask(doc, v, item(doc, 3), 0);
  expect(write(applyAll(doc, start.ops))).toBe(PLAN.replace('- 2027-03-08 to 2027-03-10: Build', '- 2027-03-08 to 2027-03-10:\n- 2027-03-08 to 2027-03-10: Build'));
  expect(start.at).toBe(4);
  const mid = enterTask(doc, v, item(doc, 3), 2);
  expect(write(applyAll(doc, mid.ops))).toBe(PLAN.replace(': Build', ': Bu\n- 2027-03-08 to 2027-03-10: ild'));
  // Backspace at the start joins to the task before; its parts stay where they are.
  const back = joinTask(doc, v, item(doc, 3), 'back')!;
  expect(run(PLAN, () => back.ops)).toBe('---\nview: gantt\n---\n- 2027-03-01 to 2027-03-05: Design\n  - 2027-03-01 to 2027-03-02: Sketch {done=50%}\n  - 2027-03-03 to 2027-03-05: DrawBuild\n');
  expect([back.at, back.offset]).toEqual([2, 4]);
  const fwd = joinTask(doc, v, item(doc, 0), 'forward')!;
  expect(run(PLAN, () => fwd.ops)).toBe('---\nview: gantt\n---\n- 2027-03-01 to 2027-03-05: DesignSketch\n  - 2027-03-03 to 2027-03-05: Draw\n- 2027-03-08 to 2027-03-10: Build\n');
  expect(joinTask(doc, v, item(doc, 0), 'back')).toBeNull();
  // An empty task goes; its parts come out a level.
  const empty = PLAN.replace(': Design', ':');
  const gone = joinTask(parse(empty), readCal(parse(empty)), item(parse(empty), 0), 'back')!;
  expect(run(empty, () => gone.ops)).toBe('---\nview: gantt\n---\n- 2027-03-01 to 2027-03-02: Sketch {done=50%}\n- 2027-03-03 to 2027-03-05: Draw\n- 2027-03-08 to 2027-03-10: Build\n');
  expect([gone.at, gone.offset]).toEqual([0, 0]);
});

test('pasted items: dated ones keep their dates or move to the day pasted on, words alone are an event that day; in date order on a calendar, in place on a schedule', () => {
  const doc = parse(DOC);
  const v = readCal(doc);
  const blocks = parse('- 2027-03-01 to 2027-03-03: Fair {color=green}\nPicnic\n').blocks;
  const onDay = pasteItems(doc, v, blocks, null, 0, day(2027, 3, 20))!;
  expect(run(DOC, () => onDay.ops)).toBe(DOC + '- 2027-03-20 to 2027-03-22: Fair {color=green}\n- 2027-03-20: Picnic\n');
  const own = pasteItems(doc, v, parse('- 2027-03-02: Lunch\n').blocks, null, 0)!;
  expect(run(DOC, () => own.ops)).toBe(DOC.replace('- 2027-03-10', '- 2027-03-02: Lunch\n- 2027-03-10'));
  expect(own.from).toBe(2);
  const plan = parse(PLAN);
  const swap = pasteItems(plan, readCal(plan), parse('- 2027-04-01: A\n  - 2027-04-02: B\n').blocks, { from: 3, to: 4 }, 0)!;
  expect(run(PLAN, () => swap.ops)).toBe(PLAN.replace('- 2027-03-08 to 2027-03-10: Build\n', '- 2027-04-01: A\n  - 2027-04-02: B\n'));
  expect([swap.from, swap.to]).toEqual([3, 5]);
  expect(pasteItems(doc, v, [], null, 0)).toBeNull();
});
