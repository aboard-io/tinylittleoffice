// Searching documents: every word somewhere, the best first, where each word is shown.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { search, termsOf, type Searchable } from '../src/kit/search.ts';

const DOCS: Searchable[] = [
  { id: 'budget', title: 'Budget 2027', app: 'Sheet', folder: 'Sheet', lines: ['Item Cost', 'Rent 1200', 'Café supplies 300'], at: 1 },
  { id: 'trip', title: 'Trip to Portugal', app: 'Trip', folder: 'Trip', lines: ['Lisbon | Pastel de nata first', 'Porto | Port cellars and the budget for wine'], at: 2 },
  {
    id: 'notes',
    title: 'Notes',
    app: 'Write',
    folder: 'Work',
    lines: ['We talked about the budget for a long time and then about the Lisbon office move which is happening in the spring of next year after the paperwork'],
    at: 3,
  },
];
const show = (q: string) => search(DOCS, q).map((f) => [f.id, f.title.map((s) => (s.hit ? `[${s.t}]` : s.t)).join(''), f.context.map((c) => c.map((s) => (s.hit ? `[${s.t}]` : s.t)).join(''))]);

test('a word in the title comes before one in the text; the newest wins a tie', () => {
  assert.deepEqual(
    show('budget').map((r) => r[0]),
    ['budget', 'notes', 'trip'],
  );
  assert.deepEqual(show('budget')[0][1], '[Budget] 2027');
});

test('every word must be there, in any order; quotes keep words together', () => {
  assert.deepEqual(
    show('lisbon budget').map((r) => r[0]),
    ['notes', 'trip'],
  );
  assert.deepEqual(show('"port cellars"'), [['trip', 'Trip to Portugal', ['Porto | [Port cellars] and the budget for wine']]]);
  assert.deepEqual(show('"cellars port"'), []);
  assert.deepEqual(termsOf('  a "b c"  d '), ['a', 'b c', 'd']);
});

test('case and accents do not matter, and the text is shown as written', () => {
  assert.deepEqual(show('CAFE'), [['budget', 'Budget 2027', ['[Café] supplies 300']]]);
});

test('a long line is cut to the part around its words', () => {
  const [, , [line]] = show('paperwork')[0] as [string, string, string[]];
  assert.ok(line.startsWith('…') && line.includes('[paperwork]') && line.length < 140, line);
});

test('the folder and the app are searched too', () => {
  assert.deepEqual(
    show('work').map((r) => r[0]),
    ['notes'],
  );
  assert.deepEqual(
    show('sheet').map((r) => r[0]),
    ['budget'],
  );
});

test("a document's lines come from the kernel: words without their marks, a table's rows, a document inside", async () => {
  const { linesOf } = await import('../src/kit/search.ts');
  const text = '---\ntitle: Plan\nzone: Europe/Lisbon\n---\n# The **launch**\n\n- [ ] Call *Dee*\n\n| Item | Cost:money |\n|---|---|\n| Rent | 1200 |\n\n```outline\n- Pack\n```\n';
  assert.deepEqual(linesOf(text), ['Europe/Lisbon', 'The launch', 'Call Dee', 'Rent · 1200', 'Pack']);
});
