// Open as another app: each hand-off a pure function from one app's document to another's, canonical as the
// kernel writes it (byte-stable through parse/write), read by the other app as it should be.
import { test, expect } from 'vitest';
import { parse, write } from '../src/doc/index.ts';
import { tripToCal } from '../src/apps/trip/convert.ts';
import { sheetToCal } from '../src/apps/sheet/convert.ts';
import { writeToDeck, writeToOutline, writeToSite } from '../src/apps/write/convert.ts';
import { slidesOf } from '../src/apps/deck/model.ts';
import { readOutline } from '../src/apps/outline/model.ts';
import { dayOf } from '../src/apps/cal/model.ts';
import { apps } from '../src/kit/apps.ts';

const stable = (s: string) => expect(write(parse(s))).toBe(s);

test('a trip on a calendar: a day a stop, from tomorrow, the note beside the name', () => {
  const trip = '| Place | Lat:number | Lon:number | Note |\n|---|---|---|---|\n| Lisbon | 38.7223 | -9.1393 | Nata in Belém |\n| Porto | 41.1579 | -8.6291 | |\n';
  const out = tripToCal(trip, dayOf('2027-04-09')!);
  expect(out).toBe('- 2027-04-10: Lisbon · Nata in Belém\n- 2027-04-11: Porto\n');
  stable(out);
});

test('a sheet on a calendar: the rows with a date, named by the first column of words, a second date the end', () => {
  const sheet = '| Task | Start:date | End:date | Cost:money |\n|---|---|---|---|\n| Design | 2027-03-15 | 2027-03-19 | 400 |\n| No date yet | | | 10 |\n| Launch | 2027-04-26 | | 0 |\n';
  const out = sheetToCal(sheet);
  expect(out).toBe('- 2027-03-15 to 2027-03-19: Design\n- 2027-04-26: Launch\n');
  stable(out);
  // Dates typed in a column of words still read; a sheet with none is an empty calendar.
  expect(sheetToCal('| When | What |\n|---|---|\n| 2027-01-02 | Party |\n')).toBe('- 2027-01-02: Party\n');
  expect(sheetToCal('| A | B |\n|---|---|\n| x | y |\n')).toBe('');
});

const TEXT = '# Launch plan {.title}\n\nWhy we are doing this.\n\n## Product\n\n- Pricing\n- Packaging\n\n> Say the numbers slowly\n\n### Details\n\nMore words.\n\n---\n\nAfter the break.\n';

test('a text as slides: a slide a heading, the title heading the title slide, a page break a new slide', () => {
  const out = writeToDeck(TEXT);
  expect(out).toBe(
    '---\ntitle: Launch plan\n---\n## Launch plan {.title}\n\nWhy we are doing this.\n\n---\n\n## Product\n\n- Pricing\n- Packaging\n\n> Say the numbers slowly\n\n**Details**\n\nMore words.\n\n---\n\nAfter the break.\n',
  );
  stable(out);
  expect(slidesOf(parse(out)).length).toBe(3);
});

test('a text as an outline: the headings a tree, what follows each under it', () => {
  const out = writeToOutline(TEXT);
  stable(out);
  const v = readOutline(parse(out));
  expect(v.loose).toBe(false);
  expect(v.items.map((i) => [i.depth, i.runs.map((r) => r.t).join('')])).toEqual([
    [0, 'Why we are doing this.'],
    [0, 'Product'],
    [1, 'Pricing'],
    [1, 'Packaging'],
    [1, 'Say the numbers slowly'],
    [1, 'Details'],
    [2, 'More words.'],
    [2, 'After the break.'],
  ]);
  expect(parse(out).head.title).toBe('Launch plan');
});

test('a text as a website: the title the site’s name, the sections, an aside a paragraph', () => {
  const out = writeToSite(TEXT);
  expect(out).toBe('# Launch plan\n\nWhy we are doing this.\n\n## Product\n\n- Pricing\n- Packaging\n\nSay the numbers slowly\n\n### Details\n\nMore words.\n\nAfter the break.\n');
  stable(out);
});

test('every app’s hand-offs go to apps that exist, each with a name', () => {
  const ids = new Set(apps().map((a) => a.id));
  const offered = apps().flatMap((a) => (a.handoffs ?? []).map((h) => `${a.id}→${h.to}`));
  for (const pair of offered) expect(ids.has(pair.split('→')[1])).toBe(true);
  expect(offered).toEqual(expect.arrayContaining(['write→deck', 'write→outline', 'write→site', 'trip→cal', 'sheet→cal', 'outline→deck', 'draw→anim', 'diagram→draw']));
  for (const a of apps()) for (const h of a.handoffs ?? []) expect(h.label().length).toBeGreaterThan(3);
});
