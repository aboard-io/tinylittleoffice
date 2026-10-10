/**
 * What was restored round the document, by a finger on a phone (WebKit, 390 by 844): a tap on the Share
 * dialog's head line opens the rooms the link fits in, inside the screen; the menu's size of everything steps
 * by taps; Insert ▾ narrows as letters are typed; a trip presents by a tap and steps by taps. Run on its own:
 *
 *   PW_PORT=4422 npx playwright test e2e/shell-phone.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import { encodeDoc } from '../src/kit/codec.ts';

const wide = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('a tap opens where the link fits; the size steps; Insert narrows; a trip presents', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/write');
  await expect(page.locator('to-write-editor to-text .tx')).toBeVisible();

  await page.locator('.to-header .to-share').tap();
  const dialog = page.locator('to-dialog.to-share-dialog dialog[open]');
  await dialog.locator('.to-fit-words').tap();
  const rooms = page.locator('.to-rooms');
  await expect(rooms).toBeVisible();
  const r = (await rooms.boundingBox())!;
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.width).toBeLessThanOrEqual(390.5);
  await expect(rooms.locator('tbody tr')).toHaveCount(11);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  await page.locator('.to-burger').tap();
  await page.locator('.to-size-more').tap();
  await expect(page.locator('.to-size-now')).toHaveText('110%');
  await page.locator('.to-size-now').tap();
  await expect(page.locator('.to-size-now')).toHaveText('100%');
  await page.keyboard.press('Escape');

  await page.locator('to-write-editor to-insert > button').tap();
  await page.keyboard.type('ta');
  await expect(page.locator('to-write-editor to-insert [role=menuitem]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  const trip = 'Place | Lat:number | Lon:number | Note\n--- | --- | --- | ---\nLisbon | 38.7223 | -9.1393 | Nata\nPorto | 41.1579 | -8.6291 |\n';
  await page.goto(`/#/v1/trip/${encodeDoc(trip)}`);
  await page.locator('to-bar button[aria-label="Present"]').tap();
  await expect(page.locator('.trip-present b')).toHaveText('1 of 2 · Lisbon');
  await page.locator('.trip-present button[aria-label="The next stop"]').tap();
  await expect(page.locator('.trip-present b')).toHaveText('2 of 2 · Porto');
  await page.locator('.trip-present button[aria-label="Stop presenting"]').tap();
  await expect(page.locator('.trip-present')).toHaveCount(0);
  expect(await wide(page)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
