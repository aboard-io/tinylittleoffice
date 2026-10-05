import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateGrid, parseGrid, serializeGrid, formatValue } from '../src/lib/formula.ts';

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
  assert.equal(g.length, 20);
  assert.equal(g[0].length, 3);
});

test('format', () => {
  assert.equal(formatValue(0.1 + 0.2), '0.3');
  assert.equal(formatValue(null), '');
  assert.equal(formatValue('#ERR'), '#ERR');
  assert.equal(formatValue(1e20), '1.0000e+20');
});
