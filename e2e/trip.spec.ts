/**
 * Trip on the built site, at desktop size in Chromium and at iPhone size in WebKit: Leaflet arrives in its own
 * chunk, taps on the map add stops that land in the link with a pin each, a name typed is the stop's; the bar
 * is one row and nothing is wider than the screen. On the phone, by finger (docs/editing.md §6, §7): a tap on a
 * stop's number chooses it with its bar on screen and the bar's Duplicate and Delete work; the number and the pins
 * are 44px, the number alone takes a drag, and a double tap on the words never zooms the page. The map's pictures
 * are answered here, not by OpenStreetMap.
 * Run on its own:
 *
 *   PW_PORT=4194 npx playwright test e2e/trip.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';

test('trip: taps on the map add stops, pins mark them, a name is typed', async ({ page }) => {
  const errors: string[] = [];
  const tiles: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    tiles.push(route.request().url());
    return route.fulfill({ status: 204 });
  });
  await page.goto('/#/v1/trip');
  const map = page.locator('.trip-map.leaflet-container');
  await expect(map).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-trip-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return {
        bar: Math.round(bar.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16)),
        rows: tops.size,
        pageTop: document.scrollingElement!.scrollTop,
        wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
  const first = await measure();
  expect(first.rows).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect(first.wide).toBeLessThanOrEqual(0);
  // The pictures are asked for only because the map is on view.
  await expect.poll(() => tiles.length).toBeGreaterThan(0);
  const box = (await map.boundingBox())!;
  await map.click({ position: { x: box.width * 0.4, y: box.height * 0.5 } });
  await expect(page.locator('.trip-stop')).toHaveCount(1);
  await expect(page.locator('.trip-stop .trip-name .tx').first()).toBeFocused();
  await page.keyboard.type('Here');
  await map.click({ position: { x: box.width * 0.6, y: box.height * 0.4 } });
  await expect(page.locator('.trip-stop')).toHaveCount(2);
  await expect(map.locator('.trip-pin')).toHaveCount(2);
  await expect(page).toHaveURL(/#\/v1\/trip\/./);
  await expect(page.locator('.trip-stop .trip-name .tx').first()).toHaveText('Here');
  await expect(page.locator('.trip-count')).toContainText('2 stops');
  const after = await measure();
  expect(after.bar).toBe(first.bar);
  expect(after.wide).toBeLessThanOrEqual(0);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/trip-${test.info().project.name}.png` });
  expect(errors).toEqual([]);
});

test('trip: on a phone, a tap on the number chooses the stop with its bar on screen; Duplicate and Delete by finger; 44px targets; no zoom', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ status: 204 }));
  await page.goto('/#/v1/trip');
  const map = page.locator('.trip-map.leaflet-container');
  await expect(map).toBeVisible();
  const box = (await map.boundingBox())!;
  await map.tap({ position: { x: box.width * 0.5, y: box.height * 0.5 } });
  await expect(page.locator('.trip-stop')).toHaveCount(1);
  await expect(page.locator('.trip-stop .trip-name .tx').first()).toBeFocused();
  await page.keyboard.type('Here');
  await page.locator('.trip-stop .trip-n').first().tap();
  await expect(page.locator('.trip-stop.ranged')).toHaveCount(1);
  const bar = page.locator('to-context.trip-context .to-context');
  await expect(bar).toBeVisible();
  const b = (await bar.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  await bar.getByRole('button', { name: 'Duplicate' }).tap();
  await expect(page.locator('.trip-stop')).toHaveCount(2);
  await expect(page.locator('.trip-stop.ranged')).toHaveCount(1);
  await bar.getByRole('button', { name: 'Delete' }).tap();
  await expect(page.locator('.trip-stop')).toHaveCount(1);
  await expect(bar).toBeHidden();
  await expect(page.locator('.trip-stop .trip-name .tx').first()).toHaveText('Here');
  const sizes = await page.evaluate(() => {
    const n = document.querySelector('.trip-n')!.getBoundingClientRect();
    const pin = document.querySelector('.trip-pin')!.getBoundingClientRect();
    const ta = (sel: string) => getComputedStyle(document.querySelector(sel)!).touchAction;
    return { n: [n.width, n.height], pin: [pin.width, pin.height], list: ta('.trip-stops'), handle: ta('.trip-n'), row: ta('.trip-stop') };
  });
  expect(Math.min(...sizes.n, ...sizes.pin)).toBeGreaterThanOrEqual(44);
  expect([sizes.list, sizes.handle]).toEqual(['manipulation', 'none']);
  expect(sizes.row).not.toBe('none');
  // A double tap on the words never zooms the page.
  const w = (await page.locator('.trip-stop .trip-note .tx').first().boundingBox())!;
  await page.touchscreen.tap(w.x + 20, w.y + w.height / 2);
  await page.touchscreen.tap(w.x + 20, w.y + w.height / 2);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
