import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartOf, evaluateGrid, namesOf, parseGrid, pasteCells, serializeGrid, formatValue } from '../src/lib/formula.ts';

/** Cells as a spreadsheet's clipboard holds them, tabs between and lines down, put in at A1. */
const tabs = (text: string) => pasteCells(parseGrid(''), 0, 0, text).grid;
function grid(rows: string[][]) {
  return tabs(rows.map((r) => r.join('\t')).join('\n'));
}

test('arithmetic and precedence', () => {
  const g = grid([['=1+2*3'], ['=(1+2)*3'], ['=2^3^2'], ['=-2^2'], ['=10/4'], ['=50%']]);
  const v = evaluateGrid(g);
  assert.equal(v[0][0], 7);
  assert.equal(v[1][0], 9);
  assert.equal(v[2][0], 512);
  assert.equal(v[3][0], 4); // unary minus binds tighter than ^, as in Excel
  assert.equal(v[4][0], 2.5);
  assert.equal(v[5][0], 0.5);
});

test('refs, ranges and functions', () => {
  const g = grid([
    ['1', '2', '=A1+B1'],
    ['3', '4', '=SUM(A1:B2)'],
    ['5', 'x', '=AVG(A1:A3)'],
    ['', '', '=COUNT(A1:B3)'],
    ['', '', '=MAX(A1:A3)-MIN(A1:A3)'],
    ['', '', '=ROUND(SQRT(2),3)'],
    ['', '', '=MOD(7,3)+INT(2.9)+ABS(-1)'],
  ]);
  const v = evaluateGrid(g);
  assert.equal(v[0][2], 3);
  assert.equal(v[1][2], 10);
  assert.equal(v[2][2], 3);
  assert.equal(v[3][2], 5);
  assert.equal(v[4][2], 4);
  assert.equal(v[5][2], 1.414);
  assert.equal(v[6][2], 4);
});

test('errors', () => {
  const g = grid([['=1/0', '=A1+1', '=foo(1)'], ['=A2', '=A3', '=x'], ['=B2', '=Z9', 'hello'], ['=C3+1', '=(1', '=1 2']]);
  const v = evaluateGrid(g);
  assert.equal(v[0][0], '#DIV/0');
  assert.equal(v[0][1], '#DIV/0');
  assert.equal(v[0][2], '#NAME');
  assert.equal(v[1][0], '#CIRC');
  assert.equal(v[1][1], '#CIRC');
  assert.equal(v[1][2], '#NAME');
  assert.equal(v[2][0], '#CIRC');
  assert.equal(v[2][1], '#REF');
  assert.equal(v[3][0], '#VALUE');
  assert.equal(v[3][1], '#ERR');
  assert.equal(v[3][2], '#ERR');
});

test('empty cells count as zero in arithmetic', () => {
  const v = evaluateGrid(grid([['', '', '=A1+1']]));
  assert.equal(v[0][2], 1);
});

test('the document is one table: the names over the columns, then rows 1, 2, 3', () => {
  const text = 'Item | Cost\n--- | ---\nRent | 1200\n| |\n| | =SUM(B1:B2)';
  const g = parseGrid(text);
  assert.deepEqual(g.slice(0, 3).map((r) => r.slice(0, 2)), [['Rent', '1200'], ['', ''], ['', '=SUM(B1:B2)']]);
  assert.deepEqual(namesOf(text).slice(0, 3), ['Item', 'Cost', '']);
  assert.equal(evaluateGrid(g)[2][1], 1200);
  assert.equal(serializeGrid(g, '', [], namesOf(text)), text);
  assert.equal(serializeGrid(parseGrid('')), '');
  assert.equal(g.length, 1000);
  assert.equal(g[0].length, 6);
  // Columns that go by their letters are named for them, and read back as no name; a lone column is written with a second, so it reads as a table.
  assert.equal(serializeGrid(tabs('a\n\nb')), 'ColA | ColB\n--- | ---\na |\n| |\nb |');
  assert.deepEqual(namesOf(serializeGrid(tabs('a'))), ['', '', '', '', '', '']);
  // Pipes and line breaks in a cell are kept.
  assert.equal(parseGrid(serializeGrid(tabs('a|b\tc')))[0][0], 'a|b');
  // Past the sixth column, nothing is read.
  assert.equal(parseGrid('A | B | C | D | E | F | G\n--- | --- | --- | --- | --- | --- | ---\n1 | 2 | 3 | 4 | 5 | 6 | 7')[0].join(','), '1,2,3,4,5,6');
});

test('format', () => {
  assert.equal(formatValue(0.1 + 0.2), '0.3');
  assert.equal(formatValue(null), '');
  assert.equal(formatValue('#ERR'), '#ERR');
  assert.equal(formatValue(1e20), '1.0000e+20');
});

test('comparisons, logic and business functions', () => {
  const g = tabs(['-1000\t300\t420\t680', '=IF(A1<0, 1, 1/0)\t=AND(B1>0, C1>=420)\t=OR(A1>0, D1<>680)\t=NOT(A1=-1000)', '=MEDIAN(A1:D1)\t=PRODUCT(B1:C1)\t=ROUNDUP(2.01, 0)\t=ROUNDDOWN(-2.99, 0)', '=NPV(0.1, B1:D1)\t=IRR(A1:D1)\t=PMT(0.05/12, 60, 20000)\t=FV(0.05, 10, -100)', '=PV(0.05, 10, -100)\t=IF(1=2, 5)\t=IRR(B1:D1)\t=E5+F30'].join('\n'));
  const v = evaluateGrid(g);
  assert.deepEqual(v[1].slice(0, 4), [1, 1, 0, 0]);
  assert.deepEqual(v[2].slice(0, 4), [360, 126000, 3, -2]);
  const near = (a: unknown, b: number) => assert.ok(typeof a === 'number' && Math.abs(a - b) < 0.005, `${a} vs ${b}`);
  near(v[3][0], 1130.73);
  near(v[3][1], 0.1634);
  near(v[3][2], -377.42);
  near(v[3][3], 1257.79);
  near(v[4][0], 772.17);
  assert.equal(v[4][1], 0);
  assert.equal(v[4][2], '#NUM');
  assert.equal(v[4][3], 0);
});

test('the chart is a setting in the header', () => {
  const text = '---\nchart: pie\n---\nWhat | Cost\n--- | ---\nRent | 1200\nFood | 600';
  assert.equal(chartOf(text), 'pie');
  assert.equal(parseGrid(text)[0][0], 'Rent');
  assert.equal(serializeGrid(parseGrid(text), 'pie', [], namesOf(text)), text);
  assert.equal(chartOf('---\nchart: Bar\n---\na | b\n--- | ---'), 'bar');
  assert.equal(chartOf('---\nchart: radar\n---\na | b\n--- | ---'), '');
  assert.equal(chartOf('a | b\n--- | ---\n1 | 2'), '');
  // A chart of nothing yet is a header alone.
  assert.equal(serializeGrid(parseGrid(''), 'bar'), '---\nchart: bar\n---');
});

test('blocks of cells: copy, paste, clear and fill', async () => {
  const { clearCells, copyCells, fillCells, pasteCells, rangeOf, rangeRef, shiftFormula } = await import('../src/lib/formula.ts');
  assert.equal(shiftFormula('=A1+SUM(B2:C3)*2', 1, 1), '=B2+SUM(C3:D4)*2');
  assert.equal(shiftFormula('=a1', 0, 5), '=F1');
  assert.equal(shiftFormula('=A1', -1, 0), '=#REF');
  assert.equal(shiftFormula('=1E5+ROUND(A1, 2)', 2, 0), '=1E5+ROUND(A3, 2)');
  assert.equal(shiftFormula('A1 is not a formula', 3, 3), 'A1 is not a formula');
  assert.equal(rangeRef(rangeOf([2, 1], [0, 0])), 'A1:B3');
  assert.equal(rangeRef(rangeOf([4, 2])), 'C5');

  const g = tabs('1\t10\t=A1+B1\n2\t20\t=A2+B2\nx\ty');
  const block = rangeOf([0, 0], [1, 2]);
  assert.equal(copyCells(g, block), '1\t10\t=A1+B1\n2\t20\t=A2+B2');
  // Pasting a copy three rows down moves its formulas with it; text from elsewhere goes in as it is.
  const pasted = pasteCells(g, 3, 0, copyCells(g, block), { dr: 3, dc: 0 });
  assert.equal(pasted.grid[3][2], '=A4+B4');
  assert.deepEqual(pasted.range, { r0: 3, c0: 0, r1: 4, c1: 2 });
  assert.equal(pasteCells(g, 3, 0, 'a\tb\r\nc\td\r\n').grid[4][1], 'd');
  assert.equal(pasteCells(g, 3, 0, '=A1').grid[3][0], '=A1');
  // One value over a selected block fills it, each copy pointing at its own neighbours.
  const spread = pasteCells(g, 0, 3, '=A1*2', { dr: 0, dc: 0 }, rangeOf([0, 3], [1, 4]));
  assert.deepEqual([spread.grid[0][3], spread.grid[1][3], spread.grid[1][4]], ['=A1*2', '=A2*2', '=B2*2']);
  // Nothing is written off the edge of the sheet.
  assert.deepEqual(pasteCells(g, 999, 5, 'a\tb\nc\td').range, { r0: 999, c0: 5, r1: 999, c1: 5 });
  assert.equal(copyCells(clearCells(g, rangeOf([0, 0], [1, 2])), rangeOf([0, 0], [2, 1])), '\t\n\t\nx\ty');

  // Fill down: numbers in step carry on, formulas follow, text repeats.
  const filled = fillCells(g, block, { ...block, r1: 4 });
  assert.deepEqual(filled.slice(2, 5).map((row) => row.slice(0, 3)), [['3', '30', '=A3+B3'], ['4', '40', '=A4+B4'], ['5', '50', '=A5+B5']]);
  const one = fillCells(tabs('7\tQ'), rangeOf([0, 0], [0, 1]), rangeOf([0, 0], [2, 1]));
  assert.deepEqual([one[1][0], one[2][0], one[2][1]], ['7', '7', 'Q']);
  // Fill right, and fill up.
  const right = fillCells(tabs('2\t4\n=A1*10'), rangeOf([0, 0], [1, 1]), rangeOf([0, 0], [1, 4]));
  assert.deepEqual(right[0].slice(0, 5), ['2', '4', '6', '8', '10']);
  assert.equal(right[1][2], '=C1*10');
  const up = fillCells(tabs('\n\n10\n20'), rangeOf([2, 0], [3, 0]), rangeOf([0, 0], [3, 0]));
  assert.deepEqual([up[0][0], up[1][0]], ['-10', '0']);
});

test('typed columns: dates are numbers, and each type reads and shows its own way', async () => {
  const { dateToSerial, formatCell, parseLiteral, serialToIso, typesOf } = await import('../src/lib/formula.ts');
  assert.equal(dateToSerial(1900, 3, 1), 61);
  assert.equal(serialToIso(dateToSerial(2027, 3, 1)), '2027-03-01');
  // Each column's type rides on its name; a column with a type and no name goes by the type's.
  const text = '---\nchart: line\n---\nWhen | Date:date | Cost:money | Share:percent | Link:url | Done:check\n--- | --- | --- | --- | --- | ---\nStart | 2027-03-01 | $1,200.5 | 12.5% | https://example.com/ | x\nEnd | 3/31/2027 | 80 | 7';
  assert.equal(chartOf(text), 'line');
  assert.deepEqual(typesOf(text), ['text', 'date', 'money', 'percent', 'url', 'check']);
  assert.deepEqual(typesOf('a | b\n--- | ---'), ['text', 'text', 'text', 'text', 'text', 'text']);
  assert.deepEqual(namesOf(text), ['When', '', 'Cost', 'Share', '', 'Done']);
  assert.equal(serializeGrid(parseGrid(text), 'line', typesOf(text), namesOf(text)), text.replace(/\| 7$/, '| 7 |  |'));
  assert.equal(serializeGrid(tabs('a'), '', ['text', 'date']), 'ColA | Date:date\n--- | ---\na |');
  // A type the sheet has no use for is text.
  assert.deepEqual(typesOf('a:time | b:icon\n--- | ---').slice(0, 2), ['text', 'text']);
  const types = typesOf(text);
  const v = evaluateGrid(parseGrid(text), types);
  assert.deepEqual(v[0].slice(1, 6), [dateToSerial(2027, 3, 1), 1200.5, 0.125, 'https://example.com/', 1]);
  assert.deepEqual(v[1].slice(1, 4), [dateToSerial(2027, 3, 31), 80, 0.07]);
  assert.deepEqual(v[0].map((x, c) => formatCell(x, types[c])).slice(0, 6), ['Start', '2027-03-01', '$1,200.50', '12.5%', 'https://example.com/', '☑']);
  assert.equal(formatCell(-3.5, 'money'), '-$3.50');
  assert.equal(formatCell(1234567.891, 'number'), '1,234,567.891');
  assert.equal(formatCell(0, 'check'), '☐');
  assert.equal(formatCell(null, 'check'), '');
  assert.equal(formatCell('#REF', 'date'), '#REF');
  // Text columns are left alone: what looks like money or a percentage stays as typed.
  assert.equal(parseLiteral('$5'), '$5');
  assert.equal(parseLiteral('50%'), '50%');
  assert.equal(parseLiteral('2027-03-01'), '2027-03-01');
  assert.equal(parseLiteral('12', 'number'), 12);
});

test('date math', async () => {
  const { dateToSerial, formatCell, todaySerial } = await import('../src/lib/formula.ts');
  const g = tabs(['2027-01-31\t2027-03-01\t=B1-A1\t=A1+30\t=EDATE(A1, 1)\t=DAYS(B1, A1)', '=DATE(2027, 12, 25)\t=YEAR(A2)\t=MONTH(A2)\t=DAY(A2)\t=WEEKDAY(A2)\t=WORKDAYS(A1, B1)', '=TODAY()\t=A3-TODAY()\t=EDATE(A2, -10)\t=WORKDAYS(B1, A1)\t=IF(B1>A1, 1, 0)'].join('\n'));
  const types = ['date', 'date', 'number', 'date', 'date', 'number'];
  const v = evaluateGrid(g, types);
  const shown = v.map((row) => row.map((x, c) => formatCell(x, types[c])));
  assert.deepEqual(shown[0], ['2027-01-31', '2027-03-01', '29', '2027-03-02', '2027-02-28', '29']);
  assert.deepEqual(v[1].slice(1, 5), [2027, 12, 25, 7]);
  assert.equal(v[1][0], dateToSerial(2027, 12, 25));
  assert.equal(v[1][5], 21);
  assert.equal(v[2][0], todaySerial());
  assert.deepEqual([v[2][1], v[2][3], v[2][4]], [0, -21, 1]);
  assert.equal(formatCell(v[2][2], 'date'), '2027-02-25');
});

test('sheet: rows sort by a column, numbers first, blanks last (the names over the columns are no row)', async () => {
  const { parseGrid, sortRows } = await import('../src/lib/formula.ts');
  const g = tabs('Pear\t3\nApple\t10\n\t\nFig\t\nBerry\t2');
  const rows = (x: string[][]) => x.filter((r) => r.some(Boolean)).map((r) => r.slice(0, 2).join(',')).join(' ');
  assert.equal(rows(sortRows(g, 1)), 'Berry,2 Pear,3 Apple,10 Fig,');
  assert.equal(rows(sortRows(g, 1, true)), 'Apple,10 Pear,3 Berry,2 Fig,');
  assert.equal(rows(sortRows(g, 0)), 'Apple,10 Berry,2 Fig, Pear,3');
  assert.deepEqual(sortRows(parseGrid(''), 0), parseGrid(''));
});
