// Rows put in and taken out as in other spreadsheets, formulas following; columns with names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { columnName, deleteRows, insertRows, namesOf, parseGrid, pasteCells, serializeGrid, shiftFormula, typesOf, ROWS } from '../src/lib/formula.ts';

const col = (g: string[][], n = 8) => g.slice(0, n).map((r) => r[0]);
const SHEET = 'N:number | Note\n--- | ---\n1 |\n2 |\n3 |\n4 |\n=SUM(A1:A4) |\n=A4*2 |\n="A3"&A3 |';

test('a row put in pushes the rows below down, and formulas follow; a range around it grows', () => {
  assert.deepEqual(col(insertRows(parseGrid(SHEET), 2)!), ['1', '2', '', '3', '4', '=SUM(A1:A5)', '=A5*2', '="A3"&A4']);
  assert.deepEqual(col(insertRows(parseGrid(SHEET), 0, 2)!), ['', '', '1', '2', '3', '4', '=SUM(A3:A6)', '=A6*2']);
});

test('rows taken out bring the rows below up; a range shrinks; a reference to a row gone is #REF', () => {
  assert.deepEqual(col(deleteRows(parseGrid(SHEET), 1, 2)), ['1', '4', '=SUM(A1:A2)', '=A2*2', '="A3"&#REF', '', '', '']);
  assert.deepEqual(col(deleteRows(parseGrid(SHEET), 0, 3), 3), ['=SUM(#REF)', '=#REF*2', '="A3"&#REF']);
});

test('a full sheet takes no more rows', () => {
  const grid = parseGrid('');
  grid[ROWS - 1][0] = 'last';
  assert.equal(insertRows(grid, 0), null);
});

test('a filled formula moves references past row 99 too', () => {
  assert.equal(shiftFormula('=A150+B9', 1, 0), '=A151+B10');
});

test('columns go by what they hold until named; names and types are the header row', () => {
  const types = typesOf('a:date | b | c:date | d:money\n--- | --- | --- | ---');
  assert.deepEqual([0, 1, 2, 3, 4].map((c) => columnName(c, types)), ['Date', 'ColB', 'Date C', 'Money', 'ColE']);
  const x = pasteCells(parseGrid(''), 0, 0, 'x').grid;
  const text = serializeGrid(x, 'bar', types, ['', 'Notes']);
  assert.equal(text, '---\nchart: bar\n---\nDate:date | Notes | Date C:date | Money:money\n--- | --- | --- | ---\nx |  |  |');
  assert.equal(columnName(1, typesOf(text), namesOf(text)), 'Notes');
  assert.deepEqual(namesOf(text).slice(0, 4), ['', 'Notes', '', '']);
  // A sheet with no names says the letters' names.
  assert.equal(serializeGrid(x, '', [], ['Who']), 'Who | ColB\n--- | ---\nx |');
  assert.equal(serializeGrid(x), 'ColA | ColB\n--- | ---\nx |');
});
