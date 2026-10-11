/**
 * Undo on a phone (WebKit, 390 by 844, a finger): the review of 2026-10-11 found it 1,411px along a bar that scrolls
 * sideways. Pinned at the bar's end it is on screen while the bar is, a tap undoes, and the drawer writes no keys.
 * Run on its own:
 *
 *   PW_PORT=4311 npx playwright test e2e/undo-phone.spec.ts --project phone --workers=1
 */
import { test, expect } from '@playwright/test';

test('on a phone Undo is on screen at the bar’s end, and a tap on it undoes what was typed', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  await page.goto('/#/v1/write');
  const words = page.locator('to-write-editor to-text .tx');
  await expect(words).toBeVisible();
  await words.tap();
  await page.keyboard.type('Pinned');
  const value = () => page.evaluate(() => (document.querySelector('to-write-editor') as HTMLElement & { value: string }).value);
  await expect.poll(value).toContain('Pinned');
  const undo = page.locator('to-write-editor to-bar button.cmd-kit-undo');
  await expect(undo).toBeEnabled();
  const box = (await undo.boundingBox())!;
  const bar = (await page.locator('to-write-editor to-bar').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y).toBeGreaterThanOrEqual(bar.y - 1);
  // It is the thing under its own middle: not covered by the palette's button or the tools passing under it.
  expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.cmd-kit-undo'), [box.x + box.width / 2, box.y + box.height / 2])).toBe(true);
  await undo.tap();
  await expect.poll(value).not.toContain('Pinned');
  // The drawer writes no keys on a phone that has typed none with Ctrl or ⌘.
  await page.locator('.to-burger').tap();
  await expect(page.locator('dialog.to-drawer .to-drawer-doc')).toBeVisible();
  await expect(page.locator('dialog.to-drawer kbd')).toHaveCount(0);
  await expect(page.locator('dialog.to-drawer .to-drawer-doc button.cmd-kit-find')).toHaveText('Find in this document');
});
