/**
 * Diagram on the built site, at desktop size in Chromium and at iPhone size in WebKit: a tap on the empty picture
 * opens a line to type the first idea, typing puts it in the link and on the picture, Enter types a branch; the bar
 * is one row, nothing is wider than the screen, axe finds nothing. Run on its own:
 *
 *   PW_PORT=4192 npx playwright test e2e/diagram.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('diagram: the first idea and a branch typed on the picture', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/diagram');
  const wrap = page.locator('to-diagram-editor .dg-wrap');
  await expect(wrap).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-diagram-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { rows: tops.size, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  expect(await measure()).toEqual({ rows: 1, wide: 0 });
  await wrap.click({ position: { x: 40, y: 40 } });
  const line = page.locator('.dg-pop to-text .tx');
  await expect(line).toBeVisible();
  await line.pressSequentially('Launch');
  await expect(page).toHaveURL(/#\/v1\/diagram\/[ryz]/);
  await expect(page.locator('.dg-pic g.dg-thing')).toHaveCount(1);
  await line.press('Enter');
  await line.pressSequentially('Pricing');
  await expect(page.locator('.dg-pic g.dg-thing[aria-label="Pricing"]')).toHaveCount(1);
  await line.press('Escape');
  await expect(page.locator('.dg-pop')).toBeHidden();
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).disableRules(['meta-viewport']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
