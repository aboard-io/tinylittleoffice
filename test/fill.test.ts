// The fill handle: a run of cells dragged on goes on as a series; what is no series repeats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillCells, seriesOf, parseGrid, pasteCells } from '../src/lib/formula.ts';

const run = (seed: string[], more: number) => {
  const grid = pasteCells(parseGrid(''), 0, 0, seed.join('\n')).grid;
  const out = fillCells(grid, { r0: 0, c0: 0, r1: seed.length - 1, c1: 0 }, { r0: 0, c0: 0, r1: seed.length - 1 + more, c1: 0 });
  return out.slice(seed.length, seed.length + more).map((r) => r[0]);
};

test('two dates a week apart go on a week at a time (the sheet that was reported repeating)', () => {
  assert.deepEqual(run(['2025-01-01', '2025-01-08'], 3), ['2025-01-15', '2025-01-22', '2025-01-29']);
  assert.deepEqual(run(['2025-12-30'], 3), ['2025-12-31', '2026-01-01', '2026-01-02']);
});

test('dates on the same day of the month go on a month at a time, kept to the month’s last day', () => {
  assert.deepEqual(run(['2025-01-15', '2025-02-15'], 3), ['2025-03-15', '2025-04-15', '2025-05-15']);
  assert.deepEqual(run(['2025-11-30', '2025-12-30'], 2), ['2026-01-30', '2026-02-28']);
});

test('numbers in even steps go on; a lone number is copied; uneven numbers repeat', () => {
  assert.deepEqual(run(['1', '2'], 3), ['3', '4', '5']);
  assert.deepEqual(run(['1,000', '2,000'], 1), ['3000']);
  assert.deepEqual(run(['5'], 2), ['5', '5']);
  assert.deepEqual(run(['1', '5', '6'], 3), ['1', '5', '6']);
});

test('numbered words, and month and weekday names, go on', () => {
  assert.deepEqual(run(['Week 1'], 2), ['Week 2', 'Week 3']);
  assert.deepEqual(run(['Q1', 'Q2'], 3), ['Q3', 'Q4', 'Q5']);
  assert.deepEqual(run(['Item 08', 'Item 09'], 2), ['Item 10', 'Item 11']);
  assert.deepEqual(run(['Nov'], 3), ['Dec', 'Jan', 'Feb']);
  assert.deepEqual(run(['January', 'March'], 2), ['May', 'July']);
  assert.deepEqual(run(['Friday'], 3), ['Saturday', 'Sunday', 'Monday']);
  assert.deepEqual(run(['MON'], 1), ['TUE']);
});

test('words and formulas are still carried as before', () => {
  assert.deepEqual(run(['Yes', 'No'], 3), ['Yes', 'No', 'Yes']);
  assert.deepEqual(run(['=A1*2'], 1), ['=A2*2']);
  assert.equal(seriesOf(['', '1']), null);
});
