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
  // (The rectangle drawn is still in hand, so its sliders are under the stage and the slider may have scrolled into view: from here the page stays put.)
  const top = await page.evaluate(() => document.scrollingElement!.scrollTop);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => value(page)).toMatch(/\n\nShape \| Keys\n--- \| ---\n0 \| 0,0,0,0,1,0; 23,\d+,\d+,0,1,0\n$/);
  await expect(page.locator('.anim-keys .key')).toHaveCount(2);
  // A key dot is drawn 14px, and a finger reaches it 18px from its centre.
  const reached = await page.evaluate(() => {
    const dot = document.querySelector<HTMLElement>('.anim-keys .key')!;
    const r = dot.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2 + 18, r.top + r.height / 2) === dot;
  });
  expect(reached).toBe(await page.evaluate(() => matchMedia('(pointer: coarse)').matches));
  const after = await measure(page);
  expect(after.bar).toBe(first.bar);
  expect(after.pageTop).toBe(top);
  expect(after.wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('motion: a tap chooses a shape and its contextual bar comes up under it, 44px to the finger and inside the screen; two taps type its words; an empty stage lets a finger scroll', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/anim');
  const canvas = page.locator('to-anim-editor svg.draw-canvas');
  await expect(canvas).toBeVisible();
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.3 } });
  await expect(page).toHaveURL(/#\/v1\/anim\/[ryz]/);
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  const stage = page.locator('svg.anim-stage');
  await expect(stage).toBeVisible();
  expect(await stage.evaluate((el) => getComputedStyle(el).touchAction)).toBe('manipulation');
  const hit = stage.locator('g.hit > rect').first();
  await hit.click();
  const bar = page.locator('to-context.anim-context .to-context');
  await expect(bar).toBeVisible();
  const vw = page.viewportSize()!.width;
  const b = (await bar.boundingBox())!;
  const h = (await hit.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(vw);
  expect(b.y).toBeGreaterThanOrEqual(h.y + h.height - 1);
  // On a touch screen, the bar's buttons and the size handle reach a finger's 44px.
  const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (coarse) for (const btn of await bar.locator('button').all()) expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const reach = (await stage.locator('[data-handle] .reach').boundingBox())!;
  expect(reach.width).toBeGreaterThanOrEqual(coarse ? 43 : 8);
  // Two taps on the shape: its words, focused, in Draw's own editor.
  await page.waitForTimeout(500);
  await hit.click();
  await hit.click();
  const words = page.locator('to-anim-editor .draw-words');
  await expect(words).toBeVisible();
  await expect(words).toBeFocused();
  await page.keyboard.type('Go');
  await page.keyboard.press('Enter');
  await expect.poll(() => value(page)).toMatch(/\nr \| \d+ \| \d+ \| 12 \| 6 \| 0 \| Go\n/);
  expect(errors).toEqual([]);
});
