/**
 * The quick look a visual change gets before it ships (scripts/deploy.mjs):
 * every app opens, its editor is drawn, nothing throws, and nothing is wider
 * than the screen, at desktop size and on a phone. The full suite is the
 * rest of e2e/, run with `npm run deploy -- --full` or `npx playwright test`.
 */
import { test, expect } from '@playwright/test';
import '../src/apps/index.ts';
import { apps } from '../src/kit/core.ts';

const ids = apps().map((a) => a.id);

test('every app opens, draws, throws nothing, and fits the screen', async ({ page }) => {
  test.setTimeout(ids.length * 4000);
  const errors: string[] = [];
  // (Playwright blocks the service worker, which the site registers when keeping things; that refusal is not ours.)
  page.on('pageerror', (e) => !/serviceWorker/.test(String(e)) && errors.push(`${page.url().split('#')[1]}: ${String(e).slice(0, 160)}`));
  for (const id of ids) {
    await page.goto(`/#/v0/${id}`);
    await expect(page.locator(`to-${id}`), id).toBeVisible();
    const example = page.getByRole('button', { name: 'Start from an example' });
    if (await example.count()) await example.first().click();
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, `${id} is wider than the screen`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});
