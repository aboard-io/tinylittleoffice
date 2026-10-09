/**
 * The Outline on a phone: whether typing, Enter and Tab scroll the page, how tall the bar is, and whether the
 * line menu opens inside the screen are real layout on a real phone engine (the phone project: WebKit, 390 by
 * 844, a finger for a pointer). Run on its own:
 *
 *   PW_PORT=4186 npx playwright test e2e/outline-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';

test('outline: on a phone, typing items neither scrolls the page nor moves the bar, which is one row; type is 16px; the line menu opens inside the screen', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/outline');
  const row = (at: number) => page.locator(`.ol-row[data-at="${at}"] to-text .tx`);
  await expect(row(-1)).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-outline-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, zoom: window.visualViewport?.scale ?? 1, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  const first = await measure();
  await row(-1).tap();
  await page.keyboard.type('Launch');
  await expect(page).toHaveURL(/#\/v1\/outline\/[ryz]/);
  const seen: { bar: number; rows: number; pageTop: number }[] = [await measure()];
  // Enter for the next item, Tab to put it under, words in each.
  // (The caret lands in the new row a frame later, as Safari wants; a finger is never that quick, so the test waits as one would.)
  await page.keyboard.press('Enter');
  await expect(row(1)).toBeFocused();
  await page.keyboard.type('Product');
  await page.keyboard.press('Tab');
  seen.push(await measure());
  await page.keyboard.press('Enter');
  await expect(row(2)).toBeFocused();
  await page.keyboard.type('Pricing');
  await page.keyboard.press('Tab');
  seen.push(await measure());
  await page.keyboard.press('Enter');
  await expect(row(3)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('Marketing');
  seen.push(await measure());
  const doc = await page.evaluate(() => (document.querySelector('to-outline-editor') as HTMLElement & { value: string }).value);
  expect(doc).toBe('- Launch\n  - Product\n    - Pricing\n  - Marketing\n');
  // Tapping another row, and the bar's Indent on it.
  await row(1).tap();
  await expect(page.locator('.ol-row[data-at="1"]')).toHaveClass(/\bsel\b/);
  await expect(page.getByRole('button', { name: 'Move down', exact: true })).toBeEnabled();
  seen.push(await measure());
  await page.getByRole('button', { name: 'Move down', exact: true }).tap();
  await expect(page.locator('.ol-row[data-at="1"] to-text .tx')).toHaveText('Marketing');
  seen.push(await measure());
  const last = await measure();
  test.info().annotations.push({ type: 'measured', description: JSON.stringify({ first, last, seen }) });
  // The page stays where it was; the bar is one row, as tall as it started, and never over 56px; nothing is wider than the screen.
  expect(seen.map((s) => s.pageTop)).toEqual(seen.map(() => 0));
  expect(last.pageTop).toBe(0);
  expect(new Set([first.bar, last.bar, ...seen.map((s) => s.bar)]).size).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect([first.rows, last.rows, ...seen.map((s) => s.rows)]).toEqual([1, 1, ...seen.map(() => 1)]);
  expect(last.zoom).toBe(1);
  expect(last.wide).toBeLessThanOrEqual(0);
  // Every box a finger may land in is 16px or more, so Safari has no reason to zoom in.
  const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('to-outline-editor .tx, to-outline-editor input')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => `${el.getAttribute('aria-label') ?? el.className}: ${getComputedStyle(el).fontSize}`));
  expect(small).toEqual([]);
  // A bullet's menu opens inside the screen and Escape closes it; the caret is back in the row's words (the bullet never takes the focus).
  const bullet = page.locator('.ol-row[data-at="2"] button.ol-kind');
  await bullet.tap();
  const menu = page.locator('.ol-line-menu [role=menu]');
  await expect(menu).toBeVisible();
  await expect(bullet).toHaveAttribute('aria-expanded', 'true');
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(row(2)).toBeFocused();
  await expect(bullet).toHaveAttribute('aria-expanded', 'false');
  expect(await measure()).toMatchObject({ pageTop: 0, rows: 1 });
  expect(errors).toEqual([]);
});

test('outline: on a phone, a tap on a row’s handle chooses it whole; the bar under it is inside the screen and its Delete takes the row away', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const text = '- Launch\n  - Product\n  - Marketing\n';
  await page.goto('/#/v1/outline');
  await page.locator('to-outline-editor').evaluate((el, t) => ((el as HTMLElement & { value: string }).value = t), text);
  const handle = page.locator('.ol-row[data-at="1"] .ol-handle');
  await expect(handle).toBeVisible();
  await handle.tap();
  await expect(page.locator('.ol-row[data-at="1"]')).toHaveClass(/\branged\b/);
  const bar = page.locator('.ol-context .to-context');
  await expect(bar).toBeVisible();
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await bar.getByRole('button', { name: 'Delete', exact: true }).tap();
  await expect.poll(() => page.locator('to-outline-editor').evaluate((el) => (el as HTMLElement & { value: string }).value)).toBe('- Launch\n  - Marketing\n');
  await expect(bar).toBeHidden();
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});
