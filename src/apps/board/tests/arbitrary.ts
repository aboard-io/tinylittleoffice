/**
 * Boards for the properties (model.unit.test.ts, view.test.ts), made by fast-check: a document with a table somewhere among other
 * blocks, its head's `lanes:` and `lock:` sometimes there, biased to the cases a board's commands meet. Tiny Little
 * Office's own generators (its test/doc/tlo-grammar.ts) make every document the format can say; these make the ones a
 * board is read from: lane names drawn from a few, so lanes repeat and interleave; a name with a comma, a backslash or
 * a space at its end; a lane cell left empty (the nameless lane); a column named Status or Stage, or typed `option`, or
 * neither; formulas that point into rows a move takes out; and locked cells, in the head or on the table itself. They
 * are models, never texts: the commands are ops on a document, and nothing here is written or read as TLO. And words
 * a person types as a card's title (`arbitraryWords`), biased to those that would read as something else written as
 * they are: a number, a date, a formula, an amount, Markdown, an apostrophe of their own.
 */
import fc from 'fast-check';
import { COLUMN_TYPES, type Block, type Column, type ColType, type Doc, type TableBlock } from '../../../doc/index.ts';

/** How many runs a property makes: 200, or FUZZ_RUNS for a longer look (under Node; a page has no environment, and makes 200). */
export const RUNS = Number(globalThis.process?.env.FUZZ_RUNS) || 200;

const pick = <T>(xs: readonly T[]) => fc.constantFrom(...xs);

/** Lane names, few, so lanes repeat; one with a comma and one with a backslash, which `lanes:` escapes. */
const LANES = ['To do', 'Doing', 'Done', 'Won, finally', 'a\\b', 'Doing '];
const TYPES: ColType[] = ['text', 'option', 'number', 'money', 'date', 'rich', 'check'];
const NAMES = ['Task', 'Status', 'stage', 'Owner', 'Cost', 'Due', 'Kind', 'Note'];

const arbitraryColumn: fc.Arbitrary<Column> = fc.record({ name: pick(NAMES), type: pick(TYPES) });
const arbitraryCell = fc.oneof(
  { weight: 4, arbitrary: pick(LANES) },
  { weight: 3, arbitrary: pick(['', 'Write the brief', 'Ana', '12', '2026-11-02', 'x', ' ', 'two words']) },
  { weight: 1, arbitrary: pick(['=A1', '=B2*2', '=SUM(C1:C3)']) },
);

/** A table of one to `maxCols` columns and up to `maxRows` rows, its lock sometimes on itself (`{lock=…}`). */
export const arbitraryTable = (maxCols = 4, maxRows = 5): fc.Arbitrary<TableBlock> =>
  fc.integer({ min: 1, max: maxCols }).chain((n) =>
    fc
      .record({
        cols: fc.array(arbitraryColumn, { minLength: n, maxLength: n }),
        rows: fc.array(fc.array(arbitraryCell, { minLength: n, maxLength: n }), { maxLength: maxRows }),
        lock: fc.option(pick(['A1', 'B1:B3', 'A2, C1', 'A1:D5']), { nil: undefined }),
      })
      .map(({ cols, rows, lock }): TableBlock => ({ k: 'table', cols, rows, ...(lock ? { a: { kv: { lock } } } : {}) })),
  );

/** Words around the table: paragraphs and items, which a board never reads. */
const arbitraryOther: fc.Arbitrary<Block> = fc.oneof(
  pick(['Notes.', 'Two words', '']).map((t): Block => ({ k: 'p', runs: t ? [{ t }] : [] })),
  pick(['Milk', 'Eggs']).map((t): Block => ({ k: 'li', depth: 0, runs: [{ t }] })),
);

/** A board's document: words, the table, words; its head's `lanes:` (names in any order, some on no card) and `lock:` sometimes there. */
export const arbitraryBoard = (): fc.Arbitrary<Doc> =>
  fc
    .record({
      before: fc.array(arbitraryOther, { maxLength: 2 }),
      table: arbitraryTable(),
      after: fc.array(arbitraryOther, { maxLength: 2 }),
      lanes: fc.option(fc.uniqueArray(pick(LANES), { minLength: 1, maxLength: 4 }), { nil: undefined }),
      lock: fc.option(pick(['A1', 'B2:B4', 'A1, C2']), { nil: undefined }),
    })
    .map(({ before, table, after, lanes, lock }): Doc => {
      const head: Record<string, string> = {};
      if (lanes) head.lanes = lanes.map((n) => n.replace(/[\\,]/g, '\\$&')).join(', ');
      // The lock is kept in one place: the head's, unless the table carries its own.
      if (lock && !table.a) head.lock = lock;
      return { head, blocks: [...before, table, ...after] };
    });

/** Every type a column may have, as the kernel lists them. */
export const ALL_TYPES: ColType[] = COLUMN_TYPES.map((c) => c.id);

/** Words that would read as something else written as they are: a number, a date, a formula, an amount, a check, Markdown, an apostrophe. */
const LOOKALIKES = [
  '007',
  '0',
  '-3',
  '.5',
  '1e5',
  '1,000',
  '=1+1',
  '=SUM(1)',
  '=',
  "'007",
  "'Tis",
  "'",
  '2027-03-01',
  '3/1/2027',
  'today',
  '$5',
  '£1,200',
  '1200 GBP',
  '50%',
  'x',
  'yes',
  '#REF',
  '**bold**',
  '_it_',
  '`code`',
  '\\=x',
  'a | b',
  '[a](https://example.com)',
  'https://example.com',
  ' two  words ',
];

/** Words a person types as a title: lookalikes, any string, and lookalikes run together with other words. */
export const arbitraryWords = (): fc.Arbitrary<string> =>
  fc.oneof(
    { weight: 3, arbitrary: pick(LOOKALIKES) },
    { weight: 2, arbitrary: fc.string({ maxLength: 12 }) },
    { weight: 1, arbitrary: fc.string({ unit: 'grapheme', maxLength: 8 }) },
    { weight: 2, arbitrary: fc.tuple(pick(LOOKALIKES), fc.string({ maxLength: 6 }), pick(LOOKALIKES)).map(([a, b, c]) => a + b + c) },
  );
