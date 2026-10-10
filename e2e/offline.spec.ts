/**
 * The copy kept on the device, for real: the switch in the menu registers the service worker, which fetches
 * every file of the build (dist/files.json); then with no network at all a cold reload opens the home page,
 * an app never opened before opens and edits, and a document's link opens. Off again, the worker and its
 * cache go. Desktop Chromium (the worker is the same code on a phone; WebKit's offline emulation is not).
 *
 *   PW_PORT=4423 npx playwright test e2e/offline.spec.ts --project=desktop
 */
import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('kept on the device from the menu, the app opens and works with no connection', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'one browser is enough for the worker');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  // Nothing is kept until asked.
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))).toBe(0);
  await page.locator('.to-burger').click();
  const kept = page.getByRole('switch', { name: /Keep the app on this device/ });
  await expect(kept).not.toBeChecked();
  await kept.check();
  const line = page.locator('.to-drawer .to-switch').filter({ has: kept }).locator('small');
  await expect(line).toHaveText(/^Ready to work offline · \d+\.\d MB$/, { timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Every file the build lists is in the worker's cache.
  const { files } = await (await page.request.get('/files.json')).json();
  expect(await page.evaluate(async (n) => (await caches.open((await caches.keys())[0])).keys().then((k) => k.length >= n), files.length)).toBe(true);
  await page.keyboard.press('Escape');

  await context.setOffline(true);
  // A cold start with no network: the home page.
  await page.reload();
  await expect(page.locator('.to-app-open').first()).toBeVisible();
  // An app whose editor was never loaded: its chunk comes from the device; a line typed goes into the link.
  await page.goto('/#/v1/write');
  const area = page.locator('to-write-editor to-text .tx');
  await expect(area).toBeVisible();
  await area.click();
  await page.keyboard.type('Written on a train.');
  await expect(page).toHaveURL(/#\/v1\/write\/[ryz]/);
  const link = page.url();
  // An app's own page, as a shared link names it, and the document's link reloaded, both offline.
  await page.goto('/sheet/');
  await expect(page.locator('.to-header')).toBeVisible();
  await page.goto(link);
  await page.reload();
  await expect(area.locator('p').first()).toHaveText('Written on a train.');
  await context.setOffline(false);

  // Off again: the worker and its cache go.
  await page.locator('.to-burger').click();
  await expect(kept).toBeChecked();
  await kept.uncheck();
  await expect(line).toHaveText('Not kept');
  expect(await page.evaluate(async () => [(await navigator.serviceWorker.getRegistrations()).length, (await caches.keys()).length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
});
