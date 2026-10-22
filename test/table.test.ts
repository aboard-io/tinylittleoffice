// A host's typed table, without a DOM (kit/ui/table-model.ts): each type's words and its order, a sort of several
// columns (stable, an empty cell last whichever way), the heading's clicks, the quick search, and what an edit typed in
// a cell means. The element that draws it is test/browser/table.test.ts's.
import { describe, expect, test } from 'vitest';
import { compareCells, sortRows as sortSheet } from '../src/doc/index.ts';
import {
  canEdit,
  cellWords,
  dateText,
  fits,
  inputOf,
  isEmpty,
  moneyWords,
  nextSort,
  recordOf,
  parseInput,
  sameValue,
  searchRows,
  sortKey,
  sortRows,
  timeOf,
  trackOf,
  type TableColumn,
  type TableRow,
} from '../src/kit/ui/table-model.ts';

interface Person extends TableRow {
  name: string;
  deal?: number | string | null;
  met?: string | null;
  seen?: string;
  vip?: boolean;
  stage?: string;
  tags?: string[];
  company?: { label: string; href?: string } | string;
}

const STAGES = [
  { value: 'lead', label: 'Lead', color: 'gray' },
  { value: 'won', label: 'Won', color: 'green' },
  { value: 'lost', label: 'Lost', color: 'red' },
];
const cols: TableColumn<Person>[] = [
  { key: 'name', label: 'Name' },
  { key: 'deal', label: 'Deal', type: 'money', currency: '$' },
  { key: 'met', label: 'Met', type: 'date' },
  { key: 'seen', label: 'Seen', type: 'datetime' },
  { key: 'vip', label: 'VIP', type: 'boolean' },
  { key: 'stage', label: 'Stage', type: 'enum', options: STAGES },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'company', label: 'Company', type: 'link', href: (r) => `/companies/${String(r.id)}` },
];
const col = (key: string) => cols.find((c) => c.key === key)!;
const ids = (rows: Person[]) => rows.map((r) => r.id).join(' ');

const people: Person[] = [
  { id: 'a', name: 'Item 10', deal: 1200, met: '2027-03-01', vip: true, stage: 'won', tags: ['pilot'] },
  { id: 'b', name: 'item 2', deal: '$950.50', met: '2026-12-31', vip: false, stage: 'lead' },
  { id: 'c', name: 'Émile', deal: null, met: null, stage: 'lost', company: 'Clear Channel' },
  { id: 'd', name: 'Zed', deal: 12000, met: '2027-01-15', stage: 'lead', tags: ['vip', 'pilot'] },
  { id: 'e', name: 'ann', deal: 950.5, met: '2027-03-01', vip: true, stage: 'new' },
];

describe('the Spreadsheet’s order of words, shared', () => {
  test('compareCells: numbers by value and before words, words as a reader orders them', () => {
    expect(compareCells('10', '9')).toBeGreaterThan(0);
    expect(compareCells('9', 'apple')).toBeLessThan(0);
    expect(compareCells('Item 2', 'item 10')).toBeLessThan(0);
    expect(compareCells('émile', 'Emile')).toBe(0);
  });
  test('the Spreadsheet’s sort orders as it did', () => {
    const g = { cols: [{ name: 'a', type: 'text' as const }], rows: [['b'], ['10'], ['A'], [''], ['9']] };
    expect(sortSheet(g, 0).values.map((r) => r[0])).toStrictEqual(['9', '10', 'A', 'b', '']);
  });
});

describe('each type sorts by its own order, an empty cell last whichever way, ties as given', () => {
  test('words: case and accents aside, numbers inside them by value', () => {
    expect(ids(sortRows(people, cols, [{ key: 'name', dir: 'asc' }]))).toBe('e c b a d');
    expect(ids(sortRows(people, cols, [{ key: 'name', dir: 'desc' }]))).toBe('d a b c e');
  });
  test('money as numbers, words like "$950.50" read as the Spreadsheet reads them; empty last both ways', () => {
    expect(sortKey(col('deal'), people[1])).toBe(950.5);
    expect(ids(sortRows(people, cols, [{ key: 'deal', dir: 'asc' }]))).toBe('b e a d c');
    expect(ids(sortRows(people, cols, [{ key: 'deal', dir: 'desc' }]))).toBe('d a b e c');
  });
  test('dates as dates, not as words; an empty one last', () => {
    expect(ids(sortRows(people, cols, [{ key: 'met', dir: 'asc' }]))).toBe('b d a e c');
    expect(ids(sortRows(people, cols, [{ key: 'met', dir: 'desc' }]))).toBe('a e d b c');
  });
  test('a status by the order of its options, one it does not list after them', () => {
    expect(ids(sortRows(people, cols, [{ key: 'stage', dir: 'asc' }]))).toBe('b d a c e');
  });
  test('a box: unticked before ticked, none last', () => {
    expect(ids(sortRows(people, cols, [{ key: 'vip', dir: 'desc' }]))).toBe('a e b c d');
  });
  test('a second column breaks the first’s ties; equal rows stay in the order given', () => {
    expect(
      ids(
        sortRows(people, cols, [
          { key: 'met', dir: 'desc' },
          { key: 'name', dir: 'asc' },
        ]),
      ),
    ).toBe('e a d b c');
    expect(ids(sortRows(people, cols, [{ key: 'stage', dir: 'asc' }]).slice(0, 2))).toBe('b d');
    expect(ids(sortRows(people, cols, []))).toBe('a b c d e');
    expect(ids(sortRows(people, cols, [{ key: 'nothing', dir: 'asc' }]))).toBe('a b c d e');
  });
  test('a column of the page’s own order sorts by it', () => {
    const byLength: TableColumn<Person> = { key: 'name', label: 'Name', type: 'custom', compare: (a, b) => String(a).length - String(b).length };
    expect(ids(sortRows(people, [byLength], [{ key: 'name', dir: 'asc' }]))).toBe('d e c b a');
  });
  test('5,000 rows sort by two columns quickly', () => {
    const many: Person[] = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `Person ${(i * 7919) % 5000}`, deal: (i * 31) % 997, met: `2027-0${(i % 9) + 1}-1${i % 10}` }));
    const t0 = performance.now();
    const sorted = sortRows(many, cols, [
      { key: 'met', dir: 'desc' },
      { key: 'deal', dir: 'asc' },
    ]);
    expect(performance.now() - t0).toBeLessThan(500);
    for (let i = 1; i < sorted.length; i++) {
      const [x, y] = [sorted[i - 1], sorted[i]];
      expect(x.met! > y.met! || (x.met === y.met && Number(x.deal) <= Number(y.deal))).toBe(true);
    }
  });
});

describe('a heading’s clicks', () => {
  test('a click: ascending, descending, none; another column takes over', () => {
    expect(nextSort([], 'name')).toStrictEqual([{ key: 'name', dir: 'asc' }]);
    expect(nextSort([{ key: 'name', dir: 'asc' }], 'name')).toStrictEqual([{ key: 'name', dir: 'desc' }]);
    expect(nextSort([{ key: 'name', dir: 'desc' }], 'name')).toStrictEqual([]);
    expect(nextSort([{ key: 'name', dir: 'desc' }], 'deal')).toStrictEqual([{ key: 'deal', dir: 'asc' }]);
    expect(
      nextSort(
        [
          { key: 'name', dir: 'asc' },
          { key: 'deal', dir: 'desc' },
        ],
        'deal',
      ),
    ).toStrictEqual([{ key: 'deal', dir: 'asc' }]);
  });
  test('with Shift: added after the others, turned, then taken out, the others kept', () => {
    const one = [{ key: 'met', dir: 'desc' as const }];
    expect(nextSort(one, 'name', true)).toStrictEqual([...one, { key: 'name', dir: 'asc' }]);
    expect(nextSort([...one, { key: 'name', dir: 'asc' }], 'name', true)).toStrictEqual([...one, { key: 'name', dir: 'desc' }]);
    expect(nextSort([...one, { key: 'name', dir: 'desc' }], 'name', true)).toStrictEqual(one);
  });
});

describe('a cell’s words', () => {
  test('money in its currency, a date in the page’s language, an option’s label, tags, a link’s words, a box by its column', () => {
    expect(cellWords(col('deal'), people[0])).toBe('$1,200.00');
    expect(cellWords({ ...col('deal'), currency: 'EUR' }, people[0])).toMatch(/1,200\.00/);
    expect(cellWords(col('met'), people[0])).toBe('1 Mar 27');
    expect(cellWords(col('stage'), people[0])).toBe('Won');
    expect(cellWords(col('stage'), people[4])).toBe('new');
    expect(cellWords(col('tags'), people[3])).toBe('vip, pilot');
    expect(cellWords(col('company'), people[2])).toBe('Clear Channel');
    expect(cellWords(col('vip'), people[0])).toBe('VIP');
    expect(cellWords(col('vip'), people[1])).toBe('');
    expect(cellWords(col('deal'), people[2])).toBe('');
  });
  test('a day is a day wherever the page is; a moment has its time', () => {
    expect(timeOf('2027-03-01')).toStrictEqual({ ms: Date.UTC(2027, 2, 1), day: true });
    expect(timeOf('soon')).toBeNull();
    expect(timeOf(new Date(Number.NaN))).toBeNull();
    expect(dateText('2027-03-01', true)).toBe('Mar 1, 2027');
    expect(dateText(new Date(2027, 2, 1, 9, 30), true)).toMatch(/^Mar 1, 2027.*9:30/);
    expect(dateText('soon', false)).toBe('soon');
  });
  test('a cell’s date is short: the day, the month’s short name, the year’s two digits; a moment with its time', () => {
    expect(dateText('2026-11-08', false, true)).toBe('8 Nov 26');
    expect(dateText('2026-09-30', false, true)).toBe('30 Sep 26');
    expect(dateText(new Date(2026, 10, 8, 14, 5), true, true)).toBe('8 Nov 26, 14:05');
    // A day is the day it says wherever the page is, its time not drawn.
    expect(dateText('2026-11-08', true, true)).toBe('8 Nov 26');
    expect(dateText('soon', false, true)).toBe('soon');
    expect(cellWords({ key: 'seen', label: 'Seen', type: 'datetime' }, { id: 'x', seen: new Date(2026, 10, 8, 9, 5).toISOString() })).toBe('8 Nov 26, 09:05');
  });
  test('nothing in a cell is empty: null, spaces, an empty list', () => {
    expect([null, undefined, '  ', [], Number.NaN].every(isEmpty)).toBe(true);
    expect([0, false, 'x', ['a']].some(isEmpty)).toBe(false);
  });
});

describe('the quick search', () => {
  test('every word somewhere in the columns’ words, case and accents aside, in any order', () => {
    expect(ids(searchRows(people, cols, 'emile'))).toBe('c');
    expect(ids(searchRows(people, cols, 'pilot item'))).toBe('a');
    expect(ids(searchRows(people, cols, 'vip'))).toBe('a d e');
    expect(ids(searchRows(people, cols, '"clear channel"'))).toBe('c');
    expect(ids(searchRows(people, cols, '  '))).toBe('a b c d e');
    expect(ids(searchRows(people, [col('name')], 'pilot'))).toBe('');
  });
});

describe('an edit typed in a cell', () => {
  test('an amount as the Spreadsheet reads one, a day as the date field gives it, tags as a list; words where a number belongs are none', () => {
    expect(parseInput(col('deal'), '$1,200')).toBe(1200);
    expect(parseInput(col('deal'), '1200 GBP')).toBe(1200);
    expect(parseInput(col('deal'), 'lots')).toBeUndefined();
    expect(parseInput(col('deal'), '')).toBeNull();
    expect(parseInput(col('met'), '2027-04-02')).toBe('2027-04-02');
    expect(parseInput(col('met'), 'April')).toBeUndefined();
    expect(parseInput(col('seen'), '2027-04-02T09:30')).toBe('2027-04-02T09:30');
    expect(parseInput(col('tags'), 'a, b,, c ')).toStrictEqual(['a', 'b', 'c']);
    expect(parseInput(col('name'), ' Ada ')).toBe(' Ada ');
  });
  test('the editor starts with the plain value', () => {
    expect(inputOf(col('deal'), people[1])).toBe('950.5');
    expect(inputOf(col('met'), people[0])).toBe('2027-03-01');
    expect(inputOf(col('tags'), people[3])).toBe('vip, pilot');
    expect(inputOf(col('stage'), people[0])).toBe('won');
    expect(inputOf(col('seen'), { id: 'x', name: 'x', seen: new Date(2027, 2, 1, 9, 5).toISOString() })).toBe('2027-03-01T09:05');
  });
  test('an edit that changes nothing is nothing', () => {
    expect(sameValue(['a'], ['a'])).toBe(true);
    expect(sameValue('', null)).toBe(true);
    expect(sameValue(1, 2)).toBe(false);
  });
});

test('a column’s width: its own, else its type’s', () => {
  expect(trackOf({ type: 'money' })).toStrictEqual({ min: 7, track: 'minmax(7rem, 1fr)' });
  expect(trackOf({ type: 'boolean' })).toStrictEqual({ min: 5, track: '5rem' });
  expect(trackOf({ width: 'minmax(12rem, 3fr)' })).toStrictEqual({ min: 12, track: 'minmax(12rem, 3fr)' });
});

test('a column that fits its words, and one that wraps, keep their type’s least width until measured', () => {
  expect(fits({ fit: true })).toBe(true);
  expect(fits({ width: 'max-content' })).toBe(true);
  expect(fits({ width: '12rem' })).toBe(false);
  expect(trackOf({ type: 'text', width: 'max-content' })).toStrictEqual({ min: 10, track: 'minmax(10rem, 2fr)' });
});

test('money in whole units, and a number to its places', () => {
  const whole: TableColumn<Person> = { key: 'deal', label: 'Deal', type: 'money', currency: '$', decimals: 0 };
  expect(cellWords(whole, { id: 'a', name: 'a', deal: 12000 })).toBe('$12,000');
  expect(cellWords(whole, { id: 'a', name: 'a', deal: 950.5 })).toBe('$951');
  expect(cellWords(whole, { id: 'a', name: 'a', deal: -1200 })).toBe('-$1,200');
  expect(cellWords({ ...whole, currency: 'USD' }, { id: 'a', name: 'a', deal: 12000 })).toBe(moneyWords(12000, 'USD', 0));
  expect(moneyWords(12000, 'USD', 0)).not.toMatch(/\.00/);
  expect(moneyWords(1.5, '$')).toBe('$1.50');
  expect(cellWords({ key: 'deal', label: 'n', type: 'number', decimals: 2 }, { id: 'a', name: 'a', deal: 3 })).toBe('3.00');
  // The sort is by the amount, not its words.
  expect(sortKey(whole, { id: 'a', name: 'a', deal: 950.5 })).toBe(950.5);
});

test('a record’s cell: its words, its address, its id, and a row of its own that may not be edited', () => {
  interface Met extends TableRow {
    company?: { id: string; label: string; href?: string } | string | null;
    invite?: boolean;
  }
  const company: TableColumn<Met> = { key: 'company', label: 'Company', type: 'record', href: (r) => `/c/${String(r.id)}`, editable: (r) => !r.invite };
  const a: Met = { id: 'a', company: { id: 'c1', label: 'Clear Channel' } };
  const b: Met = { id: 'b', company: { id: 'c2', label: 'Aboard', href: '/aboard' }, invite: true };
  expect(recordOf(company, a)).toStrictEqual({ id: 'c1', label: 'Clear Channel', href: '/c/a' });
  expect(recordOf(company, b)!.href).toBe('/aboard');
  expect(recordOf(company, { id: 'c', company: null })).toBeNull();
  expect(recordOf(company, { id: 'd', company: 'c9' })).toStrictEqual({ id: 'c9', label: 'c9', href: '/c/d' });
  expect(cellWords(company, a)).toBe('Clear Channel');
  expect(inputOf(company, a)).toBe('Clear Channel');
  expect(ids(sortRows([a, b], [company], [{ key: 'company', dir: 'asc' }]) as Person[])).toBe('b a');
  expect(canEdit(company, a)).toBe(true);
  expect(canEdit(company, b)).toBe(false);
  expect(canEdit({ key: 'x', label: 'x', editable: true }, a)).toBe(true);
  expect(canEdit({ key: 'x', label: 'x' }, a)).toBe(false);
});
