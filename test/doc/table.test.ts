// A table block as a sheet: A1 addresses, the lock, formulas and the lock following rows and columns, and what
// copy, paste, fill, clear and sort write (the old formula and sheet-rows tests over the Table API).
import { expect, test } from 'vitest';
import {
  apply,
  applyAll,
  clearCells,
  copyCells,
  fillCells,
  isLocked,
  lockedRanges,
  lockText,
  movedIn,
  movedOut,
  parse,
  pasteCells,
  putCells,
  rangeOf,
  rangeRef,
  remapLock,
  seriesOf,
  shiftFormula,
  sortRows,
  tableAt,
  usedSize,
  withLock,
  withTable,
  write,
  type Doc,
  type Table,
} from '../../src/doc/index.ts';

/** A table with no names over its columns, from rows of cells. */
const grid = (rows: string[][], cols = Math.max(...rows.map((r) => r.length))): Table => ({
  cols: Array.from({ length: cols }, () => ({ name: '', type: 'text' })),
  rows: rows.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? '')),
  lock: [],
  chart: '',
});
/** Cells as a spreadsheet's clipboard holds them, tabs between and lines down. */
const tabs = (text: string, cols = 6) => {
  const t = grid([[]], cols);
  const { r, c, values } = pasteCells(t, 0, 0, text);
  return { ...t, rows: values.map((row) => Array.from({ length: cols }, (_, k) => (k >= c ? (row[k - c] ?? '') : ''))).concat(Array.from({ length: Math.max(0, r) }, () => [])) };
};

test('addresses and ranges', () => {
  expect(rangeRef(rangeOf([2, 1], [0, 0]))).toBe('A1:B3');
  expect(rangeRef(rangeOf([4, 2]))).toBe('C5');
  expect(shiftFormula('=A1+SUM(B2:C3)*2', 1, 1)).toBe('=B2+SUM(C3:D4)*2');
  expect(shiftFormula('=a1', 0, 5)).toBe('=F1');
  expect(shiftFormula('=A1', -1, 0)).toBe('=#REF');
  expect(shiftFormula('=1E5+ROUND(A1, 2)', 2, 0)).toBe('=1E5+ROUND(A3, 2)');
  expect(shiftFormula('A1 is not a formula', 3, 3)).toBe('A1 is not a formula');
  expect(shiftFormula('=A150+B9', 1, 0)).toBe('=A151+B10');
});

test('the lock: ranges read as cells, kept as written, moved as rows and columns move', () => {
  const doc = parse('---\nlock: C1:C3, E2\n---\na | b | c | d | e\n--- | --- | --- | --- | ---\n1 | 2 | =A1+B1 | 4 | 5\n');
  const t = tableAt(doc, 0)!;
  expect(lockText(t.lock)).toBe('C1:C3, E2');
  expect([isLocked(t.lock, 0, 2), isLocked(t.lock, 2, 2), isLocked(t.lock, 1, 4), isLocked(t.lock, 0, 0)]).toStrictEqual([true, true, true, false]);
  expect(lockText(withLock(t.lock, rangeOf([0, 0], [1, 0]), true))).toBe('C1:C3, E2, A1:A2');
  expect(lockText(withLock(t.lock, rangeOf([1, 2]), false))).toBe('E2');
  expect(lockedRanges('nonsense, AA9')).toStrictEqual([]);
  expect(lockText(remapLock(t.lock, movedIn(0, 2)))).toBe('C3:C5, E4');
  expect(lockText(remapLock(t.lock, movedIn(1, 1)))).toBe('C1:C4, E3');
  expect(lockText(remapLock(t.lock, movedOut(1, 1)))).toBe('C1:C2');
  expect(lockText(remapLock(t.lock, movedOut(0, 2)))).toBe('');
  expect(lockText(remapLock(t.lock, (r) => r, movedIn(0, 1)))).toBe('D1:D3, F2');
  expect(lockText(remapLock(lockedRanges('B1:D3, E2'), (r) => r, movedOut(2, 2)))).toBe('B1:C3, D2');
  expect(lockText(remapLock(t.lock, (r) => r, movedOut(2, 2)))).toBe('D2');
});

test('tableAt and withTable: lock and chart from the header for a sheet document, from the table itself anywhere else', () => {
  const sheet = parse('---\nchart: Pie\nlock: B1\n---\nWhat | Cost:money\n--- | ---\nRent | 1200\n');
  expect(tableAt(sheet, 0)).toStrictEqual({
    cols: [
      { name: 'What', type: 'text' },
      { name: 'Cost', type: 'money' },
    ],
    rows: [['Rent', '1200']],
    lock: [{ r0: 0, c0: 1, r1: 0, c1: 1 }],
    chart: 'pie',
  });
  expect(tableAt(parse('---\nchart: radar\n---\na | b\n--- | ---\n'), 0)!.chart).toBe('');
  expect(tableAt(sheet, 1)).toBeNull();
  const text = parse('# Notes\n\nWords.\n\na | b\n--- | ---\n1 | 2\n{chart=bar lock=A1}\n\nc | d\n--- | ---\n3 | 4\n');
  expect(tableAt(text, 2)!.chart).toBe('bar');
  expect(tableAt(text, 2)!.lock).toStrictEqual([{ r0: 0, c0: 0, r1: 0, c1: 0 }]);
  // A table in a text keeps its own lock even when it is the first table.
  expect(tableAt(text, 3)!.chart).toBe('');
  // Written back: to the header, or to the attributes.
  const t = tableAt(sheet, 0)!;
  const changed = applyAll(
    sheet,
    withTable(sheet, 0, {
      ...t,
      chart: 'bar',
      lock: [],
      rows: [
        ['Rent', '1300'],
        ['Food', '400'],
      ],
    }),
  );
  expect(write(changed)).toBe('---\nchart: bar\n---\nWhat | Cost:money\n--- | ---\nRent | 1300\nFood | 400\n');
  const second = applyAll(text, withTable(text, 3, { ...tableAt(text, 3)!, lock: [rangeOf([0, 1])], chart: 'line' }));
  expect(write(second)).toContain('c | d\n--- | ---\n3 | 4\n{lock=B1 chart=line}\n');
  const cleared = applyAll(text, withTable(text, 2, { ...tableAt(text, 2)!, lock: [], chart: '' }));
  expect(cleared.blocks[2].a).toBeUndefined();
});

test('blocks of cells: copy, paste, clear and fill', () => {
  const g = tabs('1\t10\t=A1+B1\n2\t20\t=A2+B2\nx\ty');
  const block = rangeOf([0, 0], [1, 2]);
  expect(copyCells(g, block)).toBe('1\t10\t=A1+B1\n2\t20\t=A2+B2');
  // Pasting a copy three rows down moves its formulas with it; text from elsewhere goes in as it is.
  const pasted = pasteCells(g, 3, 0, copyCells(g, block), { dr: 3, dc: 0 });
  expect(pasted.values[0][2]).toBe('=A4+B4');
  expect(pasted.range).toStrictEqual({ r0: 3, c0: 0, r1: 4, c1: 2 });
  expect(pasteCells(g, 3, 0, 'a\tb\r\nc\td\r\n').values[1][1]).toBe('d');
  expect(pasteCells(g, 3, 0, '=A1').values[0][0]).toBe('=A1');
  // One value over a selected block fills it, each copy pointing at its own neighbours.
  const spread = pasteCells(g, 0, 3, '=A1*2', { dr: 0, dc: 0 }, rangeOf([0, 3], [1, 4]));
  expect([spread.values[0][0], spread.values[1][0], spread.values[1][1]]).toStrictEqual(['=A1*2', '=A2*2', '=B2*2']);
  // Nothing is written off the edge of the table.
  expect(pasteCells(g, 999, 5, 'a\tb\nc\td').range).toStrictEqual({ r0: 999, c0: 5, r1: 999, c1: 5 });
  expect(clearCells(rangeOf([0, 0], [1, 2]))).toStrictEqual({
    r: 0,
    c: 0,
    values: [
      ['', '', ''],
      ['', '', ''],
    ],
  });

  // Fill down: numbers in step carry on, formulas follow, text repeats.
  const filled = fillCells(g, block, { ...block, r1: 4 });
  expect(filled.values.slice(2)).toStrictEqual([
    ['3', '30', '=A3+B3'],
    ['4', '40', '=A4+B4'],
    ['5', '50', '=A5+B5'],
  ]);
  const one = fillCells(tabs('7\tQ'), rangeOf([0, 0], [0, 1]), rangeOf([0, 0], [2, 1]));
  expect([one.values[1][0], one.values[2][0], one.values[2][1]]).toStrictEqual(['7', '7', 'Q']);
  // Fill right, and fill up.
  const right = fillCells(tabs('2\t4\n=A1*10'), rangeOf([0, 0], [1, 1]), rangeOf([0, 0], [1, 4]));
  expect(right.values[0]).toStrictEqual(['2', '4', '6', '8', '10']);
  expect(right.values[1][2]).toBe('=C1*10');
  const up = fillCells(tabs('\n\n10\n20'), rangeOf([2, 0], [3, 0]), rangeOf([0, 0], [3, 0]));
  expect([up.values[0][0], up.values[1][0]]).toStrictEqual(['-10', '0']);
  // What a paste writes is a cells op.
  const doc: Doc = { head: {}, blocks: [{ k: 'table', cols: g.cols, rows: g.rows }] };
  const after = applyAll(doc, putCells(doc, 0, pasted.r, pasted.c, pasted.values));
  expect(tableAt(after, 0)!.rows[4]).toStrictEqual(['2', '20', '=A5+B5', '', '', '']);
});

test('series: numbers in step, dates by days or months, names round the year and the week, words ending in a number', () => {
  expect(seriesOf(['1', '3'])!(2)).toBe('5');
  expect(seriesOf(['1,000', '2,000'])!(2)).toBe('3000');
  expect(seriesOf(['1', '2', '4'])).toBeNull();
  expect(seriesOf(['2027-01-31'])!(1)).toBe('2027-02-01');
  expect(seriesOf(['2027-01-31', '2027-02-28'])!(2)).toBe('2027-03-28');
  expect(seriesOf(['2027-01-15', '2027-02-15'])!(2)).toBe('2027-03-15');
  expect(seriesOf(['Jan', 'Feb'])!(11)).toBe('Dec');
  expect(seriesOf(['Jan', 'Feb'])!(12)).toBe('Jan');
  expect(seriesOf(['monday'])!(6)).toBe('sunday');
  expect(seriesOf(['MON', 'WED'])!(2)).toBe('FRI');
  expect(seriesOf(['Week 1'])!(3)).toBe('Week 4');
  expect(seriesOf(['Q1', 'Q3'])!(2)).toBe('Q5');
  expect(seriesOf(['Day 01'])!(9)).toBe('Day 10');
  expect(seriesOf(['=A1'])).toBeNull();
  expect(seriesOf(['a', 'b'])).toBeNull();
});

test('sort: rows by a column, numbers first, blanks last (the names over the columns are no row); what to write from the top', () => {
  const g = tabs('Pear\t3\nApple\t10\n\t\nFig\t\nBerry\t2');
  const rows = (x: { values: string[][] }) =>
    x.values
      .filter((r) => r.some(Boolean))
      .map((r) => r.slice(0, 2).join(','))
      .join(' ');
  expect(rows(sortRows(g, 1))).toBe('Berry,2 Pear,3 Apple,10 Fig,');
  expect(rows(sortRows(g, 1, true))).toBe('Apple,10 Pear,3 Berry,2 Fig,');
  expect(rows(sortRows(g, 0))).toBe('Apple,10 Berry,2 Fig, Pear,3');
  expect(sortRows(grid([[]], 2), 0)).toStrictEqual({ r: 0, c: 0, values: [] });
  expect(usedSize(g)).toStrictEqual({ rows: 5, cols: 2 });
  expect(
    usedSize({
      cols: [
        { name: '', type: 'text' },
        { name: '', type: 'date' },
        { name: 'Who', type: 'text' },
      ],
      rows: [],
    }),
  ).toStrictEqual({ rows: 0, cols: 3 });
});

const SHEET = parse('N:number | Note\n--- | ---\n1 |\n2 |\n3 |\n4 |\n=SUM(A1:A4) |\n=A4*2 |\n="A3"&A3 |\n');
const col = (d: Doc) => tableAt(d, 0)!.rows.map((r) => r[0]);

test('a row put in pushes the rows below down, and formulas follow; a range around it grows', () => {
  expect(col(apply(SHEET, { op: 'rows', at: 0, r: 2, n: 1, rows: [[]] }))).toStrictEqual(['1', '2', '', '3', '4', '=SUM(A1:A5)', '=A5*2', '="A3"&A4']);
  expect(col(apply(SHEET, { op: 'rows', at: 0, r: 0, n: 2, rows: [[], []] }))).toStrictEqual(['', '', '1', '2', '3', '4', '=SUM(A3:A6)', '=A6*2', '="A3"&A5']);
});

test('rows taken out bring the rows below up; a range shrinks; a reference to a row gone is #REF', () => {
  expect(col(apply(SHEET, { op: 'rows', at: 0, r: 1, n: 2 }))).toStrictEqual(['1', '4', '=SUM(A1:A2)', '=A2*2', '="A3"&#REF']);
  expect(col(apply(SHEET, { op: 'rows', at: 0, r: 0, n: 4 }))).toStrictEqual(['=SUM(#REF)', '=#REF*2', '="A3"&#REF']);
});
