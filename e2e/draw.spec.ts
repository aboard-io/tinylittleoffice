/**
 * Draw on the built site, at desktop size in Chromium and at iPhone size in WebKit: a key and a click make a
 * shape that lands in the link, the bar is one row, nothing is wider than the screen; pixel mode paints a
 * square and "Use as background" writes the tile. Run on its own:
 *
 *   PW_PORT=4184 npx playwright test e2e/draw.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';

test('draw: a shape from a key and a click, then a pixel grid that becomes the background', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/draw');
  const canvas = page.locator('svg.draw-canvas');
  await expect(canvas).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-draw-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  const first = await measure();
  expect(first.rows).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect(first.wide).toBeLessThanOrEqual(0);
  // R, then a click: a rectangle of the default size, selected, and the link holds it.
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.2, y: box.height * 0.3 } });
  await expect(page).toHaveURL(/#\/v1\/draw\/[ryz]/);
  await expect(canvas.locator('.handle')).toBeVisible();
  const after = await measure();
  expect(after.bar).toBe(first.bar);
  expect(after.pageTop).toBe(0);
  // Pixel mode from the menu: a square painted, then the grid made the background.
  await page.locator('.draw-mode button').click();
  await page.getByRole('menuitemcheckbox', { name: 'Pixels, 8 by 8' }).click();
  const grid = page.locator('svg.draw-pixels');
  await expect(grid).toBeVisible();
  await page.getByRole('button', { name: 'Red' }).click();
  const g = (await grid.boundingBox())!;
  await grid.click({ position: { x: g.width / 16, y: g.height / 16 } });
  await page.getByRole('button', { name: 'Use as background' }).click();
  await expect(canvas).toBeVisible();
  await expect(canvas.locator('pattern#draw-tile')).toHaveCount(1);
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
