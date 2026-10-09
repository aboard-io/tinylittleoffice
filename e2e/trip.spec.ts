/**
 * Trip on the built site, at desktop size in Chromium and at iPhone size in WebKit: Leaflet arrives in its own
 * chunk, taps on the map add stops that land in the link with a pin each, a name typed is the stop's; the bar
 * is one row and nothing is wider than the screen. The map's pictures are answered here, not by OpenStreetMap.
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
      return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
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
  await page.keyboard.type('Here');
  await map.click({ position: { x: box.width * 0.6, y: box.height * 0.4 } });
  await expect(page.locator('.trip-stop')).toHaveCount(2);
  await expect(map.locator('.trip-pin')).toHaveCount(2);
  await expect(page).toHaveURL(/#\/v1\/trip\/./);
  await expect(page.locator('.trip-stop .trip-name').first()).toHaveValue('Here');
  await expect(page.locator('.trip-count')).toContainText('2 stops');
  const after = await measure();
  expect(after.bar).toBe(first.bar);
  expect(after.wide).toBeLessThanOrEqual(0);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/trip-${test.info().project.name}.png` });
  expect(errors).toEqual([]);
});
