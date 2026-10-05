import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartOf, evaluateGrid, parseGrid, serializeGrid, formatValue } from '../src/lib/formula.ts';

function grid(rows: string[][]) {
  return parseGrid(rows.map((r) => r.join('\t')).join('\n'));
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

test('serialize trims trailing blanks', () => {
  const g = parseGrid('a\tb\n\n\tc');
  assert.equal(serializeGrid(g), 'a\tb\n\n\tc');
  assert.equal(serializeGrid(parseGrid('')), '');
  assert.equal(g.length, 30);
  assert.equal(g[0].length, 6);
});

test('format', () => {
  assert.equal(formatValue(0.1 + 0.2), '0.3');
  assert.equal(formatValue(null), '');
  assert.equal(formatValue('#ERR'), '#ERR');
  assert.equal(formatValue(1e20), '1.0000e+20');
});

test('comparisons, logic and business functions', () => {
  const g = parseGrid(['-1000\t300\t420\t680', '=IF(A1<0, 1, 1/0)\t=AND(B1>0, C1>=420)\t=OR(A1>0, D1<>680)\t=NOT(A1=-1000)', '=MEDIAN(A1:D1)\t=PRODUCT(B1:C1)\t=ROUNDUP(2.01, 0)\t=ROUNDDOWN(-2.99, 0)', '=NPV(0.1, B1:D1)\t=IRR(A1:D1)\t=PMT(0.05/12, 60, 20000)\t=FV(0.05, 10, -100)', '=PV(0.05, 10, -100)\t=IF(1=2, 5)\t=IRR(B1:D1)\t=E5+F30'].join('\n'));
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

test('a chart directive rides on the first line', () => {
  const text = '!pie\nRent\t1200\nFood\t600';
  assert.equal(chartOf(text), 'pie');
  assert.equal(parseGrid(text)[0][0], 'Rent');
  assert.equal(serializeGrid(parseGrid(text), 'pie'), text);
  assert.equal(serializeGrid(parseGrid(text)), 'Rent\t1200\nFood\t600');
  assert.equal(chartOf('Rent\t1200'), '');
  // A first cell that looks like a directive is protected by an empty one.
  const tricky = parseGrid('x');
  tricky[0][0] = '!bar';
  assert.equal(serializeGrid(tricky), '!\n!bar');
  assert.equal(parseGrid('!\n!bar')[0][0], '!bar');
  assert.equal(chartOf('!\n!bar'), '');
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

  const g = parseGrid('1\t10\t=A1+B1\n2\t20\t=A2+B2\nx\ty');
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
  assert.deepEqual(pasteCells(g, 29, 5, 'a\tb\nc\td').range, { r0: 29, c0: 5, r1: 29, c1: 5 });
  assert.equal(serializeGrid(clearCells(g, block)), '\n\nx\ty');

  // Fill down: numbers in step carry on, formulas follow, text repeats.
  const filled = fillCells(g, block, { ...block, r1: 4 });
  assert.deepEqual(filled.slice(2, 5).map((row) => row.slice(0, 3)), [['3', '30', '=A3+B3'], ['4', '40', '=A4+B4'], ['5', '50', '=A5+B5']]);
  const one = fillCells(parseGrid('7\tQ'), rangeOf([0, 0], [0, 1]), rangeOf([0, 0], [2, 1]));
  assert.deepEqual([one[1][0], one[2][0], one[2][1]], ['7', '7', 'Q']);
  // Fill right, and fill up.
  const right = fillCells(parseGrid('2\t4\n=A1*10'), rangeOf([0, 0], [1, 1]), rangeOf([0, 0], [1, 4]));
  assert.deepEqual(right[0].slice(0, 5), ['2', '4', '6', '8', '10']);
  assert.equal(right[1][2], '=C1*10');
  const up = fillCells(parseGrid('\n\n10\n20'), rangeOf([2, 0], [3, 0]), rangeOf([0, 0], [3, 0]));
  assert.deepEqual([up[0][0], up[1][0]], ['-10', '0']);
});
