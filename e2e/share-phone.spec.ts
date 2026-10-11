/**
 * Share on a phone (WebKit, 390 by 844, a finger): the dialog is one sheet the screen's size, its lifetimes a
 * row of segments a tap chooses, nothing wider than the screen; arriving by a short link, the banner says how
 * long the link has left and stays inside the screen. Run on its own:
 *
 *   PW_PORT=4408 npx playwright test e2e/share-phone.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';

const DAY = 86_400_000;
const wide = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('share: on a phone, one full-screen sheet; a tap chooses a lifetime; the arrival banner fits', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/write');
  await expect(page.locator('to-write-editor to-text .tx')).toBeVisible();
  await page.locator('.to-burger').tap();
  await page.locator('.to-drawer-share').tap();
  const dialog = page.locator('to-dialog.to-share-dialog dialog[open]');
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect([Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)]).toEqual([0, 0, 390, 844]);
  await expect(dialog.locator('.to-copy-link')).toBeVisible();
  await expect(dialog.locator('.to-copy-display')).toBeVisible();
  // A tap on "A month" chooses it.
  await dialog.locator('.to-ttl label', { hasText: 'A month' }).tap();
  await expect(dialog.locator('.to-ttl input:checked')).toHaveValue(String(30 * 86400));
  // A month is the longest life: no year.
  await expect(dialog.locator('.to-ttl label')).toHaveText(['An hour', 'A day', 'A week', 'A month']);
  for (const b of await dialog.locator('button:visible').all()) {
    const r = (await b.boundingBox())!;
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(390.5);
  }
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/share-phone.png` });
  expect(await wide(page)).toBeLessThanOrEqual(0);

  // Arriving by a short link, three days left: the amber banner, its buttons inside the screen.
  const hash = await page.evaluate(() => location.hash.split('?')[0]);
  await page.goto(`/?arrive#${hash.slice(1)}?s=abcdefg&x=${Date.now() + 3 * DAY}`);
  const banner = page.locator('.to-arrival');
  await expect(banner).toHaveClass(/soon/);
  await expect(banner.locator('.to-arrival-words')).toHaveText('This link expires in 3 days');
  for (const b of await banner.locator('button').all()) {
    const r = (await b.boundingBox())!;
    expect(r.x + r.width).toBeLessThanOrEqual(390.5);
    expect(r.height).toBeGreaterThanOrEqual(44);
  }
  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}/arrival-phone.png` });
  expect(await wide(page)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
