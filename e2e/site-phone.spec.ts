/**
 * Website on a phone, in WebKit at 390 by 844 with a finger: a tap on a section in the page takes it in hand
 * with its bar (Edit, Move up, Move down, Duplicate, Delete) inside the screen; the bar's Delete takes it away
 * and Undo brings it back in hand; Edit puts the caret in its words; the words and the page's handles never
 * zoom on a double tap, and the Web Picture dialog's field is 16px. Run on its own:
 *
 *   PW_PORT=4321 npx playwright test e2e/site-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';

const CAFE = '# Harbor Coffee\n\nOn the quay.\n\n# Menu\n\nWhat we pour.\n\n## Coffee\n\n- Espresso | 3.00\n\n## Pastry\n\n- Cardamom bun | 3.50\n';

test('website: on a phone, a tapped section has its bar; Delete, Undo and Edit by a finger', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/site');
  const words = page.locator('to-site-editor to-text.site-text .tx');
  await expect(words).toBeVisible();
  // A site to work on, typed in as its text would be pasted.
  await words.tap();
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.querySelector('to-site-editor to-text.site-text .tx')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, CAFE);
  const site = page.frameLocator('to-site-editor iframe.site-frame');
  await page.locator('to-site-editor select.site-part').selectOption({ label: '— Pastry' });
  await expect(site.locator('#pastry')).toBeVisible();
  // The page drawn again for the part picked; then a finger on the section's words (WebKit counts it as a click only where the section listens itself).
  await page.waitForTimeout(600);
  await site.locator('#pastry li').first().tap();
  const bar = page.locator('to-site-editor to-context.site-context .to-context');
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('button')).toHaveCount(5);
  expect(await bar.getByRole('button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Delete']);
  const box = await bar.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  for (const b of await bar.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await bar.getByRole('button', { name: 'Delete' }).tap();
  await expect(site.locator('#pastry')).toHaveCount(0);
  await page.locator('to-site-editor to-bar button[aria-label="Undo"]').tap();
  await expect(site.locator('#pastry')).toHaveCount(1);
  await expect(page.locator('to-site-editor select.site-part option:checked')).toHaveText('— Pastry');
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Edit' }).tap();
  await expect(bar).toBeHidden();
  expect(await page.evaluate(() => !!document.activeElement?.closest('to-text.site-text'))).toBe(true);
  // Never zoomed on a double tap: the words and the page's handles; the Web Picture dialog's field is 16px.
  expect(await words.evaluate((el) => getComputedStyle(el).touchAction)).toBe('manipulation');
  expect(await site.locator('.site-plus').first().evaluate((el) => getComputedStyle(el).touchAction)).toBe('manipulation');
  await page.locator('to-site-editor to-insert button').first().tap();
  await page.getByRole('menuitem', { name: 'Picture' }).tap();
  const field = page.locator('.to-ask-picture .to-ask-url');
  await expect(field).toBeVisible();
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(errors).toEqual([]);
});
