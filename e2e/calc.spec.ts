/**
 * Calculator on the built site, under the site's own Content-Security-Policy (read from dist/_headers, so no
 * eval and no Function constructor may run): the keys and the line work out a sum, the mathjs chunk arrives and
 * converts units, the graph draws; the bar is one row and nothing is wider than the screen. Run on its own:
 *
 *   PW_PORT=4196 npx playwright test e2e/calc.spec.ts --workers=1
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

test('calc: keys and the line, units from the engine under the policy, a graph', async ({ page }) => {
  const policy = /Content-Security-Policy: (.+)/.exec(readFileSync(join(import.meta.dirname, '../dist/_headers'), 'utf8'))![1];
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const res = await route.fetch();
    return route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': policy } });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // A script the policy refused says so on the console.
  page.on('console', (m) => m.type() === 'error' && /Content Security Policy|Refused|unsafe-eval/i.test(m.text()) && errors.push(m.text()));
  await page.goto('/#/v1/calc');
  const display = page.locator('.calc-display');
  await expect(display).toBeVisible();
  for (const k of ['6', '×', '7']) await page.locator(`.calc-key[aria-label="${k}"]`).click();
  await expect(page.locator('.calc-live')).toHaveText('= 42');
  await page.locator('.calc-key[aria-label="="]').click();
  await expect(page.locator('.calc-ans')).toHaveText(['= 42']);
  await expect(page).toHaveURL(/#\/v1\/calc\/./);
  // The engine: its own chunk, run under a policy with no eval.
  await display.fill('3 inch to cm');
  await expect(page.locator('.calc-live')).toHaveText('= 7.62 cm');
  await display.press('Enter');
  await expect(page.locator('.calc-ans')).toHaveText(['= 42', '= 7.62 cm']);
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-calc-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { bar: bar.offsetHeight, rows: tops.size, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  const m = await measure();
  expect(m.rows).toBe(1);
  expect(m.bar).toBeLessThanOrEqual(56);
  expect(m.wide).toBeLessThanOrEqual(0);
  await page.locator('to-bar button[aria-label="Graph"]').click();
  await display.fill('sin(x)');
  await display.press('Enter');
  await expect(page.locator('.calc-graph svg path')).toHaveCount(1);
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
