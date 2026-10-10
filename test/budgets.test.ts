// The built chunks within their budgets (budgets.json, scripts/budgets.ts). Runs on the build in dist/ when there is one
// (after `npm run build`, whose last step is the same check); with none it has nothing to weigh. Not part of `npm run
// lint`, which the build runs before it builds: a build from before would be weighed.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { measure, overBudget, readBudgets } from '../scripts/budgets.ts';

const dist = join(import.meta.dirname, '../dist');

test.skipIf(!existsSync(join(dist, 'assets')))('the build in dist/ is within the chunk budgets', () => {
  expect(overBudget(measure(dist), readBudgets())).toStrictEqual([]);
});
