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
    return {
      bar: Math.round(bar.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16)),
      rows: tops.size,
      pageTop: document.querySelector('.to-main')!.scrollTop,
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

test('motion: a shape drawn, then moved at the last moment, keys itself there', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/anim');
  // An empty stage opens in Draw mode, which is Draw itself.
  const canvas = page.locator('to-anim-editor svg.draw-canvas');
  await expect(canvas).toBeVisible();
  // On a phone the bar comes with the focus (kit/chrome.ts indoc): the canvas is touched before the bar is reached for.
  await canvas.click({ position: { x: 4, y: 4 } });
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.2, y: box.height * 0.3 } });
  await expect(page).toHaveURL(/#\/v1\/anim\/[ryz]/);
  expect(await value(page)).toMatch(/^Kind \| X \| Y \| W \| H \| Style \| Label\n--- \| --- \| --- \| --- \| --- \| --- \| ---\nr \| \d+ \| \d+ \| 12 \| 6 \| 0 \|\n$/);

  // Move mode: the last moment, then the rectangle dragged down and to the right. On a phone the chosen shape's bar is
  // the bottom row and the app's bar steps aside under it (kit/context.ts docked), so the shape is let go first.
  await canvas.click({ position: { x: box.width - 4, y: box.height - 4 } });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  const stage = page.locator('svg.anim-stage');
  await expect(stage).toBeVisible();
  const first = await measure(page);
  expect(first.rows).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect(first.wide).toBeLessThanOrEqual(0);
  await page.getByRole('slider', { name: 'Time' }).fill('23');
  const hit = stage.locator('g.hit rect').first();
  // In the column, which scrolls (round eight): the shape brought into view before the finger goes to it.
  await hit.scrollIntoViewIfNeeded();
  const h = (await hit.boundingBox())!;
  const [x, y] = [h.x + h.width / 2, h.y + h.height / 2];
  // (The rectangle drawn is still in hand, so its sliders are under the stage and the slider may have scrolled into view: from here the page stays put.)
  const top = await page.evaluate(() => document.querySelector('.to-main')!.scrollTop);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => value(page)).toMatch(/\n\nShape \| Keys\n--- \| ---\n0 \| 0,0,0,0,1,0; 23,\d+,\d+,0,1,0\n$/);
  await expect(page.locator('.anim-keys .key')).toHaveCount(2);
  const after = await measure(page);
  expect(after.bar).toBe(first.bar);
  expect(after.pageTop).toBe(top);
  expect(after.wide).toBeLessThanOrEqual(0);
  // A key dot is drawn 14px, and a finger reaches it 18px from its centre.
  // (The column scrolls: on a phone the keys can sit under its foot, so the dot is brought into view first.)
  const reached = await page.evaluate(() => {
    const dot = document.querySelector<HTMLElement>('.anim-keys .key')!;
    dot.scrollIntoView({ block: 'center' });
    const r = dot.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2 + 18, r.top + r.height / 2) === dot;
  });
  expect(reached).toBe(await page.evaluate(() => matchMedia('(pointer: coarse)').matches));
  // The length is typed, the speed too, and the repeat chosen: the head says so, and the seconds follow.
  await page.getByRole('spinbutton', { name: 'Frames', exact: true }).fill('48');
  await page.keyboard.press('Enter');
  await page.getByRole('spinbutton', { name: 'Frames a second' }).fill('12');
  await page.keyboard.press('Enter');
  await expect(page.locator('.anim-secs')).toHaveText('4.0 s');
  await page.locator('.anim-loop > button').click();
  await page.getByRole('menuitemcheckbox', { name: /Back and forth/ }).click();
  await expect.poll(() => value(page)).toMatch(/^---\nframes: 48\nfps: 12\nloop: bounce\n---\n/);
  // The Turn slider is there beside Depth, Size and Spin.
  await expect(page.getByRole('slider', { name: /^Turn/ })).toBeVisible();
  expect((await measure(page)).wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('motion: a tap chooses a shape and its contextual bar comes up under it, 44px to the finger and inside the screen; two taps type its words; an empty stage lets a finger scroll', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/anim');
  const canvas = page.locator('to-anim-editor svg.draw-canvas');
  await expect(canvas).toBeVisible();
  // On a phone the bar comes with the focus (kit/chrome.ts indoc): the canvas is touched before the bar is reached for.
  await canvas.click({ position: { x: 4, y: 4 } });
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.3, y: box.height * 0.3 } });
  await expect(page).toHaveURL(/#\/v1\/anim\/[ryz]/);
  await canvas.click({ position: { x: box.width - 4, y: box.height - 4 } });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  const stage = page.locator('svg.anim-stage');
  await expect(stage).toBeVisible();
  // A finger on the empty stage scrolls; the browser never zooms it (a pinch there is the stage's own zoom, kit/pinch.ts).
  expect(await stage.evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-x pan-y');
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
  await expect(words.locator('.tx')).toBeFocused();
  await page.keyboard.type('Go');
  await page.keyboard.press('Enter');
  await expect.poll(() => value(page)).toMatch(/\nr \| \d+ \| \d+ \| 12 \| 6 \| 0 \| Go\n/);
  expect(errors).toEqual([]);
});
