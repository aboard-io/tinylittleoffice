// The sheet as a view of the document, and each command as the ops it produces: under node, no DOM.
import { expect, test } from 'vitest';
import { applyAll, parse, tableAt, write, type Doc } from '../../../doc/index.ts';
import { chartData, suggestChart } from '../../../kit/chart.ts';
import { toExcelFormula } from '../../../kit/xlsx.ts';
import { addColumn, deleteRows, insertRows, putRect, readSheet, removable, removeColumn, rename, setCell, setChart, setLock, setType, sortBy } from '../model.ts';
import { chartOf, chartOfSheet, gridPage, sheetPages, sheetToCsv, tablePage } from '../view.ts';
import { templates } from '../templates.ts';
import def from '../def.ts';
import { fillCells, clearCells, sortRows } from '../../../doc/index.ts';

const SHEET = 'Item | Cost:money\n--- | ---\nRent | 1200\nFood | 450\nTotal | =SUM(B1:B2)\n';
const MODEL = '---\nchart: sankey\nlock: C1:C2\n---\nFrom | To | Amount:number | Assumption:name | Value:number\n--- | --- | --- | --- | ---\nVisitors | Signups | =visitors*rate/100 | Visitors | 1000\nVisitors | Bounced | =visitors-C1 | Rate | 10\n{big=Visitors}\n';

/** A document edited: the ops applied, the text written. */
const after = (text: string, ops: (doc: Doc) => (import('../../../doc/index.ts').Op[] | null)) => {
  const doc = parse(text);
  return write(applyAll(doc, ops(doc) ?? []));
};
const colA = (text: string) => tableAt(parse(text), 0)!.rows.map((r) => r[0]);

test('read: three columns at the least, values worked out, the headline by name', () => {
  const v = readSheet(parse(SHEET));
  expect(v.at).toBe(0);
  expect(v.cols.map((c) => c.name)).toEqual(['Item', 'Cost', 'ColC']);
  expect(v.table.cols).toHaveLength(2);
  expect(v.values[2][1]).toBe(1650);
  expect(v.used).toEqual({ rows: 3, cols: 2 });
  expect(v.big).toBeNull();
  const m = readSheet(parse(MODEL));
  expect(m.values[0][2]).toBe(100);
  expect(m.table.chart).toBe('sankey');
  expect(m.big).toEqual({ label: 'Visitors', value: '1,000' });
  expect(readSheet(parse('')).at).toBe(-1);
  expect(readSheet(parse('')).cols).toHaveLength(3);
});

test('a cell typed into a blank document makes the table: three columns named for their letters, nothing more than is needed', () => {
  expect(after('', (d) => setCell(d, 0, 2, 'four'))).toBe('ColA | ColB | ColC\n--- | --- | ---\n| |  | four\n');
  // Past the third column, columns are added out to the one typed into.
  expect(after('', (d) => setCell(d, 1, 3, 'x'))).toBe('ColA | ColB | ColC | ColD\n--- | --- | --- | ---\n| |  |  |\n| |  |  | x\n');
  // Clearing the last cell takes the trailing rows with it; clearing a cell past the rows held writes nothing.
  expect(after(SHEET, (d) => setCell(d, 2, 0, ''))).toBe('Item | Cost:money\n--- | ---\nRent | 1200\nFood | 450\n| | =SUM(B1:B2)\n');
  expect(setCell(parse(SHEET), 9, 0, '')).toEqual([]);
  expect(setCell(parse(SHEET), 0, 0, 'Rent')).toEqual([]);
  // The op is one `cells` rectangle (after any rows it needs).
  const ops = setCell(parse(SHEET), 3, 1, '=B3*2');
  expect(ops.map((o) => o.op)).toEqual(['rows', 'cells']);
});

test('rows put in and taken out: formulas follow; the names over the columns are no row', () => {
  const put = after(SHEET, (d) => insertRows(d, 1, 1));
  expect(colA(put)).toEqual(['Rent', '', 'Food', 'Total']);
  expect(tableAt(parse(put), 0)!.rows[3][1]).toBe('=SUM(B1:B3)');
  expect(put.startsWith('Item | Cost:money\n')).toBe(true);
  const gone = after(put, (d) => deleteRows(d, 0, 0));
  expect(colA(gone)).toEqual(['', 'Food', 'Total']);
  expect(tableAt(parse(gone), 0)!.rows[2][1]).toBe('=SUM(B1:B2)');
  // Past the rows held there is nothing to move or take out.
  expect(insertRows(parse(SHEET), 8, 2)).toEqual([]);
  expect(deleteRows(parse(SHEET), 8, 9)).toEqual([]);
  // Taking out the last row trims what is left blank above it too.
  expect(after('a | b\n--- | ---\n1 | 2\n| |\n3 | 4\n', (d) => deleteRows(d, 2, 2))).toBe('a | b\n--- | ---\n1 | 2\n');
});

test('columns: added after any, removed only when empty and never one of the last three; letter names follow their place', () => {
  const four = after('', (d) => setCell(d, 0, 3, 'four'));
  const a1 = after(four, (d) => setCell(d, 0, 0, '=D1'));
  const five = after(a1, (d) => addColumn(d, 2));
  const t = tableAt(parse(five), 0)!;
  expect(t.cols.map((c) => c.name)).toEqual(['ColA', 'ColB', 'ColC', 'ColD', 'ColE']);
  expect(t.rows[0]).toEqual(['=E1', '', '', '', 'four']);
  const v = readSheet(parse(five));
  expect(removable(v, 0)).toBe(false);
  expect(removable(v, 2)).toBe(true);
  const back = after(five, (d) => removeColumn(d, readSheet(d), 2));
  expect(tableAt(parse(back), 0)!.cols.map((c) => c.name)).toEqual(['ColA', 'ColB', 'ColC', 'ColD']);
  expect(tableAt(parse(back), 0)!.rows[0]).toEqual(['=D1', '', '', 'four']);
  // Three is the floor: a column of a three-column table stays, however empty.
  expect(removable(readSheet(parse(SHEET)), 2)).toBe(false);
  // A locked column moves with its neighbours.
  const locked = '---\nlock: C1\n---\nItem | Gap | Cost:money | Note\n--- | --- | --- | ---\nRent |  | =1200 | paid\n';
  const lv = readSheet(parse(locked));
  expect(removable(lv, 1)).toBe(true);
  expect(removable(lv, 0)).toBe(false);
  const out = after(locked, (d) => removeColumn(d, lv, 1));
  expect(out).toContain('lock: B1');
  expect(tableAt(parse(out), 0)!.cols.map((c) => `${c.name}:${c.type}`)).toEqual(['Item:text', 'Cost:money', 'Note:text']);
});

test('a column goes by what it holds until renamed; renamed, it keeps its name whatever it holds', () => {
  const dated = after(SHEET, (d) => setType(d, 2, 'date'));
  expect(dated.startsWith('Item | Cost:money | Date:date\n')).toBe(true);
  const named = after(dated, (d) => rename(d, 2, 'Paid on'));
  expect(named.startsWith('Item | Cost:money | Paid on:date\n')).toBe(true);
  const text = after(named, (d) => setType(d, 2, 'text'));
  expect(text.startsWith('Item | Cost:money | Paid on\n')).toBe(true);
  // Cleared, the name goes back to its default: the letter for text, the type's name otherwise.
  expect(after(text, (d) => rename(d, 2, '')).startsWith('Item | Cost:money | ColC\n')).toBe(true);
  expect(after(named, (d) => rename(d, 2, ' ')).startsWith('Item | Cost:money | Date:date\n')).toBe(true);
  // A second date column is "Date D".
  expect(after(dated, (d) => setType(d, 3, 'date')).startsWith('Item | Cost:money | Date:date | Date D:date\n')).toBe(true);
});

test('sort, fill, clear and paste write rectangles; a sort moves whole rows through the lock; the chart and the lock are head fields', () => {
  const sorted = after(SHEET, (d) => sortBy(d, 1, true));
  expect(colA(sorted)).toEqual(['Total', 'Rent', 'Food']);
  const m = after(MODEL, (d) => sortBy(d, 4, false));
  expect(tableAt(parse(m), 0)!.rows.map((r) => r[3])).toEqual(['Rate', 'Visitors']);
  // A fill down of the first row of a block.
  const doc = parse(SHEET);
  const filled = write(applyAll(doc, putRect(doc, fillCells(tableAt(doc, 0)!, { r0: 2, c0: 1, r1: 2, c1: 1 }, { r0: 2, c0: 1, r1: 4, c1: 1 }))));
  expect(tableAt(parse(filled), 0)!.rows.map((r) => r[1])).toEqual(['1200', '450', '=SUM(B1:B2)', '=SUM(B2:B3)', '=SUM(B3:B4)']);
  // A clear of the last rows trims them away.
  expect(write(applyAll(doc, putRect(doc, clearCells({ r0: 1, c0: 0, r1: 2, c1: 1 }))))).toBe('Item | Cost:money\n--- | ---\nRent | 1200\n');
  // A locked cell is left as it is by an ordinary write, and sortRows' rectangle is forced through.
  const model = parse(MODEL);
  expect(write(applyAll(model, putRect(model, { r: 0, c: 2, values: [['5']] })))).toContain('=visitors*rate/100');
  expect(write(applyAll(model, putRect(model, sortRows(tableAt(model, 0)!, 4), true)))).toContain('Rate | 10');
  expect(after(SHEET, (d) => setChart(d, 'bar'))).toBe('---\nchart: bar\n---\n' + SHEET);
  expect(setChart(parse(SHEET), 'bar')).toEqual([{ op: 'head', key: 'chart', value: 'bar' }]);
  expect(setLock(parse(SHEET), { r0: 2, c0: 1, r1: 2, c1: 1 }, true)).toEqual([{ op: 'head', key: 'lock', value: 'B3' }]);
  // A table that carries its chart as an attribute keeps it there (the kernel's rule: tableAt reads it from where it is).
  const attributed = parse('A | B:number\n--- | ---\nx | 1\n{chart=bar}\n');
  expect(write(applyAll(attributed, setChart(attributed, 'pie')))).toBe('A | B:number\n--- | ---\nx | 1\n{chart=pie}\n');
  expect(after(MODEL, (d) => setChart(d, ''))).not.toContain('chart:');
  expect(after(SHEET, (d) => setLock(d, { r0: 2, c0: 1, r1: 2, c1: 1 }, true))).toBe('---\nlock: B3\n---\n' + SHEET);
  expect(after(MODEL, (d) => setLock(d, { r0: 0, c0: 2, r1: 0, c1: 2 }, false))).not.toContain('lock:');
  // On a blank document a chart makes the table first.
  expect(after('', (d) => setChart(d, 'pie'))).toBe('---\nchart: pie\n---\nColA | ColB | ColC\n--- | --- | ---\n');
});

test('every template is a real document that round-trips byte for byte, and the headline is drawn', () => {
  const all = templates();
  expect(all.map((x) => x.id)).toEqual(['budget', 'expenses', 'training', 'tracker', 'loan', 'subscription', 'cafe', 'freelancer', 'fund', 'months']);
  for (const tpl of all) {
    expect(write(parse(tpl.doc)), tpl.id).toBe(tpl.doc);
    expect(tpl.doc.endsWith('\n')).toBe(true);
    const v = readSheet(parse(tpl.doc));
    expect(v.used.rows, tpl.id).toBeGreaterThan(2);
    // No cell of a template is an error.
    expect(v.values.flat().filter((x) => typeof x === 'string' && x.startsWith('#')), tpl.id).toEqual([]);
  }
  for (const id of ['subscription', 'cafe', 'freelancer', 'fund']) {
    const v = readSheet(parse(all.find((x) => x.id === id)!.doc));
    expect(v.big, id).not.toBeNull();
    expect(v.big!.value, id).not.toBe('');
    expect(v.table.chart).toBe('sankey');
    expect(tablePage(v).svg).toContain(v.big!.value);
    expect(sheetPages(all.find((x) => x.id === id)!.doc)).toHaveLength(2);
  }
  expect(def.blank()).toBe('');
  expect(def.title('---\ntitle: Rent\n---\n' + SHEET)).toBe('Rent');
  expect(def.retitle(SHEET, 'Rent')).toBe('---\ntitle: Rent\n---\n' + SHEET);
  expect(def.retitle('---\ntitle: Rent\n---\n' + SHEET, '')).toBe(SHEET);
});

test('the pages: the table with the names shaded and numbers right; small, the grid; a chart when asked', () => {
  const v = readSheet(parse(SHEET));
  const page = tablePage(v);
  expect(page.svg).toContain('Total');
  expect(page.svg).toContain('$1,650.00');
  expect(page.alt).toContain('Rent, $1,200.00');
  const grid = gridPage(v);
  expect(grid.svg).toContain('>A<');
  expect(grid.svg).toContain('>5<');
  expect(sheetPages('', true)[0].alt).toBe('Empty sheet');
  expect(def.view(SHEET)).toHaveLength(1);
  expect(def.view('---\nchart: bar\n---\n' + SHEET)).toHaveLength(2);
  expect(chartOf(readSheet(parse('---\nchart: bar\n---\n' + SHEET)))!.svg).toContain('<rect');
  // Drawn small inside something else, a charted sheet is its chart.
  expect(def.view('---\nchart: pie\n---\n' + SHEET, { small: true })[0].svg).toContain('<path');
});

test('CSV and Excel: the names over the columns, then the values; formulas in Excel words with names as references', () => {
  expect(sheetToCsv(parse(SHEET), ',')).toBe('Item,Cost\r\nRent,"$1,200.00"\r\nFood,$450.00\r\nTotal,"$1,650.00"\r\n');
  expect(sheetToCsv(parse('a | b:number\n--- | ---\n1.5 | 2\n'), ';')).toBe('a;b\r\n1,5;2\r\n');
  expect(toExcelFormula('=AVG(A1:A3)')).toBe('AVERAGE(A1:A3)');
  const named = new Map([['VISITORS', [0, 4] as [number, number]]]);
  expect(toExcelFormula('=visitors*2', named, 1)).toBe('E2*2');
  const xlsx = def.exports!.find((x) => x.ext === 'xlsx')!.build(MODEL, { title: '', link: '' }) as Uint8Array;
  expect(xlsx.length).toBeGreaterThan(500);
  expect([xlsx[0], xlsx[1]]).toEqual([0x50, 0x4b]);
  const csv = def.exports!.find((x) => x.ext === 'csv')!.build(SHEET, { title: '', link: '' }) as Uint8Array;
  expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv).startsWith('\ufeffItem')).toBe(true);
  const svg = new TextDecoder().decode(def.exports!.find((x) => x.ext === 'chart.svg')!.build(MODEL, { title: '', link: '' }) as Uint8Array);
  expect(svg).toContain('<svg');
  expect(svg).toContain('<path');
});

test('charts: labels from the first column, a series a column of numbers, flows from From | To | Amount; the suggestion', () => {
  const v = readSheet(parse('Month | Sales:number | Costs:number\n--- | --- | ---\nJan | 10 | 4\nFeb | 12 | 5\nMar | 15 | 6\nApr | 11 | 4\n'));
  const d = chartOfSheet(v);
  expect(d.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
  expect(d.series.map((s) => s.name)).toEqual(['Sales', 'Costs']);
  expect(suggestChart(d)).toBe('line');
  expect(suggestChart(chartData([['a', 1], ['b', 2], ['c', 3]]))).toBe('pie');
  const m = chartOfSheet(readSheet(parse(MODEL)));
  expect(m.flows).toHaveLength(2);
  expect(suggestChart(chartData([['A', 'B', 5], ['B', 'C', 3]], ['From', 'To', 'Amount']))).toBe('sankey');
  expect(chartOf(readSheet(parse(MODEL)))!.svg.match(/<path/g)).toHaveLength(2);
});
