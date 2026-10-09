/**
 * Motion on the built site, at desktop size in Chromium and at iPhone size in WebKit: a shape drawn in Draw mode
 * (Draw's own editor), then in Move mode at the last moment dragged somewhere else, which keys it there; the bar is
 * one row and nothing is wider than the screen. Run on its own:
 *
 *   PW_PORT=4193 npx playwright test e2e/anim.spec.ts --workers=1
 */
import { test, expect, type Page } from '@playwright/test';

const value = (page: Page) => page.evaluate(() => (document.querySelector('to-anim-editor') as HTMLElement & { value: string }).value);
const measure = (page: Page) =>
  page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('to-anim-editor to-bar')!;
    const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
    return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

test('motion: a shape drawn, then moved at the last moment, keys itself there', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/anim');
  // An empty stage opens in Draw mode, which is Draw itself.
  const canvas = page.locator('to-anim-editor svg.draw-canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.2, y: box.height * 0.3 } });
  await expect(page).toHaveURL(/#\/v1\/anim\/[ryz]/);
  expect(await value(page)).toMatch(/^Kind \| X \| Y \| W \| H \| Style \| Label\n--- \| --- \| --- \| --- \| --- \| --- \| ---\nr \| \d+ \| \d+ \| 12 \| 6 \| 0 \|\n$/);

  // Move mode: the last moment, then the rectangle dragged down and to the right.
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  const stage = page.locator('svg.anim-stage');
  await expect(stage).toBeVisible();
  const first = await measure(page);
  expect(first.rows).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect(first.wide).toBeLessThanOrEqual(0);
  await page.getByRole('slider', { name: 'Time' }).fill('23');
  const hit = stage.locator('g.hit rect').first();
  const h = (await hit.boundingBox())!;
  const [x, y] = [h.x + h.width / 2, h.y + h.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => value(page)).toMatch(/\n\nShape \| Keys\n--- \| ---\n0 \| 0,0,0,0,1,0; 23,\d+,\d+,0,1,0\n$/);
  await expect(page.locator('.anim-keys .key')).toHaveCount(2);
  const after = await measure(page);
  expect(after.bar).toBe(first.bar);
  expect(after.pageTop).toBe(0);
  expect(after.wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
