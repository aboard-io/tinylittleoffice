// What an op may be (ops.ts checkOp): `apply` and `invert` refuse an op of no kind the kernel has, one whose indices
// are no whole numbers or fall outside the document, and one whose content the text would not keep as it is given;
// `jsonDoc` refuses a document that does not read back as written; `diffLines` keeps the common ends and bounds its
// table; `cross` is `rebase` with what passes. An op from anyone (another's client over a shared document, a
// program) either does what it says or changes nothing (a review of 2026-10-17).
import { describe, expect, test } from 'vitest';
import { apply, applyAll, checkOp, cross, invert, keptDoc, MAX_DEPTH, parse, rebase, transform, write, type Doc, type Op } from '../../src/doc/index.ts';
import { jsonDoc } from '../../src/doc/json.ts';
import { diffLines } from '../../src/kit/text/diff.ts';

const DOC: Doc = parse('# Title\n\nHello world\n\nA | B:number | C\n--- | --- | ---\n1 | 2 | 3\n4 | 5 | 6\n');
const refused = (op: unknown, why: RegExp | string, doc = DOC) => {
  expect(() => apply(doc, op as Op), JSON.stringify(op)).toThrow(why);
  expect(() => invert(doc, op as Op), JSON.stringify(op)).toThrow(why);
};
const kept = (op: Op, doc = DOC) => expect(() => checkOp(doc, op), JSON.stringify(op)).not.toThrow();

describe('checkOp: the kind, the numbers, the ranges', () => {
  test('an op of no kind the kernel has is refused by apply, invert and transform, never undefined', () => {
    refused({ op: 'zap', at: 0 }, /unknown op "zap"/);
    refused(null, /an op is an object/);
    expect(() => transform({ op: 'zap', at: 0 } as unknown as Op, { op: 'head', key: 'x' }, 'left')).toThrow(/unknown op/);
    expect(() => transform({ op: 'cells', at: 2, r: 0, c: 0, values: [['x']] }, { op: 'zap', at: 2 } as unknown as Op, 'right')).toThrow(/unknown op/);
    // A bogus op from a server never takes a client's pending ops with it.
    expect(() => rebase([{ op: 'cells', at: 2, r: 0, c: 0, values: [['x']] }], [{ op: 'zap', at: 2 } as unknown as Op])).toThrow(/unknown op/);
  });

  test('every index is a whole number: negatives, fractions, NaN, strings and huge counts are refused', () => {
    refused({ op: 'splice', at: 0, n: -1, blocks: [] }, /n is -1, not a whole number/);
    refused({ op: 'splice', at: -1, n: 0, blocks: [] }, /at is -1/);
    refused({ op: 'splice', at: NaN, n: 0, blocks: [] }, /at is NaN/);
    refused({ op: 'splice', at: 1.5, n: 0, blocks: [] }, /at is 1.5/);
    refused({ op: 'text', at: '1', from: 0, to: 0, runs: [] }, /at is "1"/);
    refused({ op: 'move', at: 0, n: -1, to: 1 }, /n is -1/);
    refused({ op: 'cells', at: 2, r: -1, c: 0, values: [['x']] }, /r is -1/);
    refused({ op: 'rows', at: 2, r: 0, n: -2 }, /n is -2/);
    refused({ op: 'cols', at: 2, c: 1, n: -2 }, /n is -2/);
    refused({ op: 'cols', at: 2, c: 20, n: -30 }, /n is -30/);
  });

  test('a range stays inside the document: blocks, characters, rows and columns', () => {
    refused({ op: 'splice', at: 3, n: 1, blocks: [] }, /past the 3 blocks/);
    refused({ op: 'splice', at: 4, n: 0, blocks: [] }, /past the 3 blocks/);
    kept({ op: 'splice', at: 3, n: 0, blocks: [{ k: 'p', runs: [{ t: 'end' }] }] });
    refused({ op: 'move', at: 2, n: 2, to: 0 }, /outside the 3 blocks/);
    refused({ op: 'move', at: 0, n: 1, to: 3 }, /outside the 3 blocks/);
    kept({ op: 'move', at: 0, n: 1, to: 2 });
    refused({ op: 'text', at: 1, from: 5, to: 2, runs: [] }, /\[5, 2\) is outside/);
    refused({ op: 'text', at: 1, from: 0, to: 12, runs: [] }, /\[0, 12\) is outside the block's 11/);
    refused({ op: 'text', at: 2, from: 0, to: 0, runs: [] }, /no text at 2/);
    kept({ op: 'text', at: 1, from: 11, to: 11, runs: [{ t: '!' }] });
    // A rectangle past the table's edge writes what fits (ops.test.ts): refused only where no table reaches.
    kept({ op: 'cells', at: 2, r: 3, c: 0, values: [['x']] });
    kept({ op: 'cells', at: 2, r: 0, c: 3, values: [['x']] });
    refused({ op: 'cells', at: 2, r: 0, c: 26, values: [['x']] }, /outside any table/);
    refused({ op: 'cells', at: 1, r: 0, c: 0, values: [['x']] }, /no table at 1/);
    refused({ op: 'rows', at: 2, r: 1, n: 2 }, /not the table's: it has 2/);
    refused({ op: 'rows', at: 2, r: 0, n: 0 }, /not the table's/);
    refused({ op: 'rows', at: 2, r: 3, rows: [['x']] }, /do not fit a table of 2/);
    refused({ op: 'cols', at: 2, c: 2, n: 2 }, /not the table's to take: it has 3/);
    refused({ op: 'cols', at: 2, c: 0, n: 3 }, /keeps a column/);
    refused({ op: 'cols', at: 2, c: 4, cols: [{ name: 'D', type: 'text' }] }, /do not fit a table of 3/);
    refused({ op: 'col', at: 2, c: 3, col: { name: 'D', type: 'text' } }, /no column 3 in a table of 3/);
  });

  test('the head: a key of lower-case letters, digits, dashes and underscores, never __proto__; a value the header reads back', () => {
    refused({ op: 'head', key: '__proto__', value: 'x' }, /is no head key/);
    refused({ op: 'head', key: '__proto__', value: { lock: 'A1' } }, /is no head key/);
    refused({ op: 'head', key: 'Title', value: 'x' }, /is no head key/);
    refused({ op: 'head', key: 'a b', value: 'x' }, /is no head key/);
    refused({ op: 'head', key: 'a', value: 7 }, /not a string/);
    refused({ op: 'head', key: 'a', value: 'two\nlines' }, /does not keep/);
    refused({ op: 'head', key: 'a', value: ' lead' }, /does not keep/);
    refused({ op: 'head', key: 'a', value: '"quoted"' }, /does not keep/);
    kept({ op: 'head', key: 'title', value: 'Budget: Q3' });
    kept({ op: 'head', key: 'title' });
    kept({ op: 'head', key: 'title', value: '' });
    const head = apply(DOC, { op: 'head', key: 'lock', value: 'A1' }).head;
    expect(Object.getPrototypeOf(head)).toBe(Object.prototype);
    expect(apply(apply(DOC, { op: 'head', key: 'lock', value: 'A1' }), { op: 'head', key: 'lock', value: '' }).head.lock).toBe('');
  });
});

describe('checkOp: what an op puts in is of the schema’s shape and within the kernel’s bounds', () => {
  test('a block of no kind, a list of no blocks, a depth or a table past the bounds', () => {
    refused({ op: 'splice', at: 0, n: 0, blocks: [{ k: 'zzz' }] }, /blocks\[0\]\.k is "zzz"/);
    refused({ op: 'splice', at: 0, n: 0, blocks: 'xy' }, /not a list/);
    refused({ op: 'splice', at: 0, n: 0, blocks: [{ k: 'li', depth: MAX_DEPTH + 1, runs: [] }] }, /depth is 65, not a whole number up to 64/);
    refused({ op: 'splice', at: 0, n: 0, blocks: [{ k: 'li', depth: 1e8, runs: [] }] }, /up to 64/);
    refused({ op: 'splice', at: 0, n: 0, blocks: [{ k: 'li', depth: -1, runs: [] }] }, /up to 64/);
    refused({ op: 'splice', at: 0, n: 0, blocks: [{ k: 'table', cols: [], rows: [] }] }, /a table of 0 columns/);
    refused({ op: 'splice', at: 0, n: 0, blocks: [{ k: 'table', cols: Array.from({ length: 27 }, () => ({ name: 'A', type: 'text' })), rows: [] }] }, /a table of 27 columns/);
    kept({
      op: 'splice',
      at: 0,
      n: 0,
      blocks: [{ k: 'li', depth: 3, runs: [{ t: 'deep' }] }, { k: 'p', runs: [] }, { k: 'p', runs: [{ t: 'a\nb' }] }, { k: 'hr' }, { k: 'quote', runs: [{ t: 'x' }] }],
    });
  });

  test('runs are runs, cells and rows are strings, a column has a type of the kernel’s', () => {
    refused({ op: 'text', at: 1, from: 0, to: 0, runs: [{ t: 5 }] }, /runs\[0\]\.t is 5/);
    refused({ op: 'text', at: 1, from: 0, to: 0, runs: 'x' }, /runs is "x"/);
    refused({ op: 'cells', at: 2, r: 0, c: 0, values: [[7]] }, /values\[0\] is not a row/);
    refused({ op: 'cells', at: 2, r: 0, c: 0, values: ['abc'] }, /values\[0\] is not a row/);
    refused({ op: 'cells', at: 2, r: 0, c: 0, values: [['x']], force: 1 }, /force is 1/);
    kept({ op: 'cells', at: 2, r: 2, c: 0, values: [['a|b', 'c\\d', ' lead', 'trail ', '']] });
    refused({ op: 'rows', at: 2, r: 0, n: 0, rows: [[7]] }, /rows\[0\] is not a row/);
    kept({ op: 'rows', at: 2, r: 0, n: 0, rows: [[], ['x', '=A1']] });
    refused({ op: 'col', at: 2, c: 0, col: { name: 'X', type: 'bogus' } }, /col\.type is "bogus"/);
    refused({ op: 'cols', at: 2, c: 0, n: 0, cols: [{ name: 'X' }] }, /cols\[0\]\.type is missing/);
    kept({ op: 'col', at: 2, c: 0, col: { name: '', type: 'money', currency: 'EUR' } });
    kept({ op: 'cols', at: 2, c: 3, n: 0, cols: [{ name: 'D|E', type: 'date' }] });
    expect(apply(DOC, { op: 'cells', at: 2, r: 1, c: 1, values: [['a|b']] }).blocks[2]).toMatchObject({
      rows: [
        ['1', '2', '3'],
        ['4', 'a|b', '6'],
      ],
    });
  });

  test('an op refused leaves the document the same object', () => {
    const doc = parse('# T\n\n- a\n');
    for (const op of [
      { op: 'splice', at: 0, n: 0, blocks: [{ k: 'li', depth: 1e8, runs: [] }] },
      { op: 'cells', at: 0, r: 0, c: 0, values: [[7]] },
      { op: 'head', key: '__proto__', value: 'x' },
    ])
      expect(() => applyAll(doc, [op as Op]), op.op).toThrow();
    expect(write(doc)).toBe('# T\n\n- a\n');
  });
});

describe('keptDoc: the document as the text keeps it, asked once an edit is whole', () => {
  test('an edit may pass through a block the text would not keep, and the document after it is asked instead', () => {
    // A heading of two lines: what joining the line after a heading into it makes, before the editor splits it (kit/text/textops.ts).
    const joined = apply(parse('# Title\n\nmore\n'), { op: 'text', at: 0, from: 5, to: 5, runs: [{ t: '\nmore' }] });
    expect(() => keptDoc(joined)).toThrow(/does not read back as it is written/);
    expect(() =>
      keptDoc(
        apply(joined, {
          op: 'splice',
          at: 0,
          n: 1,
          blocks: [
            { k: 'h', level: 1, runs: [{ t: 'Title' }] },
            { k: 'p', runs: [{ t: 'more' }] },
          ],
        }),
      ),
    ).not.toThrow();
    // (A quote in an attribute's value is written as an apostrophe, and the text read back writes the same: a replica
    // that applied the op and one that read the text write one document, so that is not refused.)
    for (const block of [
      { k: 'fence', lang: 'a b', body: 'x' },
      { k: 'edge', from: 'a\nz', to: 'b', dir: '--' },
      { k: 'li', depth: 1, runs: [{ t: 'x' }] },
    ])
      expect(() => keptDoc({ head: {}, blocks: [block as never] }), JSON.stringify(block)).toThrow(/does not read back/);
    // A cell holding "<br>" reads back as a line break, which writes "<br>" again: the same text from either, let be.
    expect(() => keptDoc(apply(DOC, { op: 'cells', at: 2, r: 0, c: 0, values: [['<br>']] }))).not.toThrow();
    expect(() => keptDoc(apply(DOC, { op: 'cells', at: 2, r: 0, c: 0, values: [['a|b', 'c\\d', ' lead']] }))).not.toThrow();
  });
});

describe('jsonDoc reads back only what the text keeps', () => {
  const json = (blocks: unknown[], head = {}) => JSON.stringify({ head, blocks });
  test('a list item’s depth is a whole number the writer can indent; a table has one to twenty-six columns; a head key is the header’s', () => {
    for (const depth of [-1, 1.5, 1e8]) expect(() => jsonDoc(json([{ k: 'li', depth, runs: [{ t: 'x' }] }])), String(depth)).toThrow(/Not a Tiny Little Office document/);
    expect(() => jsonDoc(json([{ k: 'table', cols: [], rows: [] }]))).toThrow(/Not a Tiny Little Office document/);
    expect(() => jsonDoc(json([{ k: 'p', runs: [{ t: 'x' }] }], { 'a b': 'c' }))).toThrow(/is no head key/);
    expect(() => jsonDoc(json([{ k: 'fence', lang: 'a b', body: 'x' }]))).toThrow(/does not read back/);
    expect(
      write(
        jsonDoc(
          json(
            [
              { k: 'li', depth: 0, runs: [{ t: 'x' }] },
              { k: 'li', depth: 1, runs: [{ t: 'y' }] },
            ],
            { title: 'T' },
          ),
        ),
      ),
    ).toBe('---\ntitle: T\n---\n- x\n  - y\n');
    // A depth no list leads to is not a document the text keeps: the reader would give it another.
    expect(() => jsonDoc(json([{ k: 'li', depth: 1, runs: [{ t: 'x' }] }]))).toThrow(/does not read back/);
  });
});

describe('diffLines keeps the common ends, and bounds its table', () => {
  test('one line changed among many costs nothing of the rest', () => {
    const x = Array.from({ length: 5000 }, (_, i) => `line ${i}`);
    const y = [...x.slice(0, 2500), 'changed', ...x.slice(2501)];
    const t = performance.now();
    const d = diffLines(x, y);
    expect(performance.now() - t).toBeLessThan(200);
    expect(d.filter((c) => c.kind !== ' ')).toEqual([
      { kind: '-', line: 'line 2500' },
      { kind: '+', line: 'changed' },
    ]);
    expect(d.filter((c) => c.kind === ' ')).toHaveLength(4999);
  });
  test('two lists with nothing in common at either end and too many cells to hold are taken as replaced whole, at once', () => {
    const x = Array.from({ length: 3000 }, (_, i) => `a${i}`);
    const y = Array.from({ length: 3000 }, (_, i) => `b${i}`);
    const t = performance.now();
    const d = diffLines(x, y);
    expect(performance.now() - t).toBeLessThan(200);
    expect(d.slice(0, 3000).every((c) => c.kind === '-') && d.slice(3000).every((c) => c.kind === '+')).toBe(true);
    // Within the bound the real subsequence is found.
    expect(diffLines(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual([
      { kind: '-', line: 'a' },
      { kind: ' ', line: 'b' },
      { kind: ' ', line: 'c' },
      { kind: '+', line: 'd' },
    ]);
  });
});

test('cross gives rebase’s ops and the others as they pass over them', () => {
  const mine: Op[] = [{ op: 'text', at: 1, from: 11, to: 11, runs: [{ t: '!' }] }];
  const theirs: Op[] = [{ op: 'splice', at: 0, n: 0, blocks: [{ k: 'p', runs: [{ t: 'Zero' }] }] }];
  const [moved, passed] = cross(mine, theirs);
  expect(moved).toEqual(rebase(mine, theirs));
  expect(moved).toEqual([{ op: 'text', at: 2, from: 11, to: 11, runs: [{ t: '!' }] }]);
  expect(passed).toEqual(theirs);
  expect(write(applyAll(applyAll(DOC, theirs), moved))).toBe(write(applyAll(applyAll(DOC, mine), passed)));
});
