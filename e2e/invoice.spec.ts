import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './helpers';

// The invoice opens as the page itself, every field typed into where it stands (the suite's other tests start as text).
// The editor's side of it (the messages, the sums, the text saved, the web page download) is in test/dom/pages.test.ts.
test.beforeEach(({ page }) => page.addInitScript(() => localStorage.removeItem('tinyoffice.edit')));

// The frame's own script, which only a real browser runs: typing in the page, Tab, the cursor kept across a redraw, sums live.
test('an invoice is typed straight onto the page, and the sums are done as you go', async ({ page }) => {
  await page.goto('/#/v0/invoice');
  const inv = page.frameLocator('to-invoice iframe');
  await expect(inv.locator('#lf-bar')).toHaveCount(0);
  await inv.getByRole('textbox', { name: 'From, line 1' }).click();
  await page.keyboard.type('Harbor Studio');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="0,0,1"]')).toBeFocused();
  await page.keyboard.type('14 Quay Street');
  // A row goes under the items with its words selected to type over; Tab reaches the quantity and the price, selected too.
  await inv.getByRole('button', { name: 'Add a row' }).click();
  await expect(inv.getByRole('textbox', { name: 'What, row 2' })).toBeFocused();
  await page.keyboard.type('Design');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="1,1"]')).toBeFocused();
  await page.keyboard.type('12');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="1,2"]')).toBeFocused();
  await page.keyboard.type('150');
  await expect(inv.locator('[data-inv="amount"]').first()).toHaveText('$1,800.00');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$1,800.00');
  await shot(page, 'invoice-edit');
  // A shortcut pressed in the page is the editor's.
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Invoice, as text' })).toHaveValue('From: Harbor Studio | 14 Quay Street\nDesign, 12, 150');
});

// The PDF is drawn on a canvas, and downloaded: a real browser's.
test('the example invoice downloads as a PDF', async ({ page }) => {
  await page.goto('/#/v0/invoice');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  await expect(page.frameLocator('to-invoice iframe').locator('[data-inv="total"]')).toHaveText('$5,486.40');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(pdf.suggestedFilename()).toBe('invoice-0042.pdf');
  expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe('%PDF-');
});
