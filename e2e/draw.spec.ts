/**
 * Draw on the built site, at desktop size in Chromium and at iPhone size in WebKit: a key and a click make a
 * shape that lands in the link, the bar is one row, nothing is wider than the screen; pixel mode paints a
 * square and "Use as background" writes the tile; a shape tapped has its contextual bar inside the screen, its words
 * are typed on it, and the bar's Delete takes it away. Run on its own:
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
  await expect(canvas.locator('.handle:not(.handle-hit)')).toBeVisible();
  const after = await measure();
  expect(after.bar).toBe(first.bar);
  expect(after.pageTop).toBe(0);
  // Pixel mode from the menu: a square painted, then the grid made the background.
  await page.locator('.draw-mode > button').click();
  await page.getByRole('menuitemcheckbox', { name: 'Pixels, 8 by 8' }).click();
  const grid = page.locator('svg.draw-pixels');
  await expect(grid).toBeVisible();
  await page.getByRole('button', { name: 'Red', exact: true }).click();
  const g = (await grid.boundingBox())!;
  await grid.click({ position: { x: g.width / 16, y: g.height / 16 } });
  await page.getByRole('button', { name: 'Use as background' }).click();
  await expect(canvas).toBeVisible();
  await expect(canvas.locator('pattern#draw-tile')).toHaveCount(1);
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('draw: a shape tapped has its contextual bar inside the screen, and the bar\'s Delete takes the shape away', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/draw');
  const canvas = page.locator('svg.draw-canvas');
  await expect(canvas).toBeVisible();
  const touch = !!info.project.use.hasTouch;
  const box = (await canvas.boundingBox())!;
  const at = (x: number, y: number) => ({ position: { x: (x / 640) * box.width, y: (y / 400) * box.height } });
  // A rectangle at (192, 120), 96 by 48; a tap on nothing lets it go, a tap on it takes it again.
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  await canvas.click(at(192, 120));
  await expect(canvas.locator('[data-idx="0"]')).toHaveCount(1);
  const bar = page.locator('.draw-context .to-context');
  if (touch) await canvas.tap(at(600, 380));
  else await canvas.click(at(600, 380));
  await expect(bar).toBeHidden();
  if (touch) await canvas.tap(at(240, 144));
  else await canvas.click(at(240, 144));
  await expect(bar).toBeVisible();
  const r = (await bar.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(width);
  // Under the shape (or over it, where there is no room below): never on it.
  const shape = (await canvas.locator('[data-idx="0"]').boundingBox())!;
  expect(r.y >= shape.y + shape.height - 1 || r.y + r.height <= shape.y + 1).toBe(true);
  // Its words, typed on the shape itself from the bar's Edit the words: the overlay has the focus at once.
  const edit = bar.getByRole('button', { name: 'Edit the words' });
  if (touch) await edit.tap();
  else await edit.click();
  const words = page.locator('.draw-words');
  await expect(words).toBeFocused();
  await page.keyboard.type('Hi there');
  await page.keyboard.press('Enter');
  await expect(words).toBeHidden();
  await expect(canvas.locator('[data-idx="0"] text')).toHaveText('Hi there');
  await expect(bar).toBeVisible();
  // The T tool and a tap: a text whose words are open at once, the focus in them (no mouse event after the touch takes it).
  await page.getByRole('button', { name: /^Text/ }).click();
  if (touch) await canvas.tap(at(400, 300));
  else await canvas.click(at(400, 300));
  await expect(words).toBeFocused();
  await page.keyboard.type('Note');
  await page.keyboard.press('Enter');
  await expect(canvas.locator('[data-idx="1"] text')).toHaveText('Note');
  if (touch) await canvas.tap(at(240, 144));
  else await canvas.click(at(240, 144));
  await expect(bar).toBeVisible();
  if (!touch) {
    // A double click opens the words too; Escape leaves them as they were.
    await canvas.dblclick(at(240, 144));
    await expect(words).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(words).toBeHidden();
    await expect(canvas.locator('[data-idx="0"] text')).toHaveText('Hi there');
  }
  const del = bar.getByRole('button', { name: 'Delete' });
  if (touch) await del.tap();
  else await del.click();
  await expect(canvas.locator('[data-idx]')).toHaveCount(1);
  await expect(bar).toBeHidden();
  expect(errors).toEqual([]);
});

test('draw by finger: two taps on a shape type its words; the empty canvas pans and a shape keeps the finger; the bar\'s Undo brings back a deleted shape, chosen', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/draw');
  const canvas = page.locator('svg.draw-canvas');
  await expect(canvas).toBeVisible();
  const touch = !!info.project.use.hasTouch;
  const box = (await canvas.boundingBox())!;
  const at = (x: number, y: number) => ({ position: { x: (x / 640) * box.width, y: (y / 400) * box.height } });
  const hit = (x: number, y: number) => (touch ? canvas.tap(at(x, y)) : canvas.click(at(x, y)));
  await page.getByRole('button', { name: /^Rectangle/ }).click();
  await hit(192, 120);
  await expect(canvas.locator('[data-idx="0"]')).toHaveCount(1);
  expect(await canvas.evaluate((el) => getComputedStyle(el).touchAction)).toBe('pan-x pan-y');
  expect(await canvas.locator('[data-idx="0"]').evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
  const words = page.locator('.draw-words');
  if (touch) {
    // Two taps on the shape (no dblclick under a finger): its words open, the focus in them.
    await hit(240, 144);
    await hit(240, 144);
    await expect(words).toBeFocused();
    await page.keyboard.type('Tapped');
    await page.keyboard.press('Enter');
    await expect(canvas.locator('[data-idx="0"] text')).toHaveText('Tapped');
  } else {
    await canvas.dblclick(at(240, 144));
    await expect(words).toBeFocused();
    await page.keyboard.press('Escape');
  }
  const bar = page.locator('.draw-context .to-context');
  await expect(bar).toBeVisible();
  const del = bar.getByRole('button', { name: 'Delete' });
  if (touch) await del.tap();
  else await del.click();
  await expect(canvas.locator('[data-idx]')).toHaveCount(0);
  const undo = page.locator('to-draw-editor to-bar').getByRole('button', { name: 'Undo' });
  if (touch) await undo.tap();
  else await undo.click();
  await expect(canvas.locator('[data-idx]')).toHaveCount(1);
  await expect(canvas.locator('.handle').first()).toBeVisible();
  await expect(bar).toBeVisible();
  expect(errors).toEqual([]);
});
