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
  // A row goes under the items, its description empty to type into; Tab reaches the quantity, the units and the price.
  await inv.getByRole('button', { name: '+ Add a line' }).click();
  await expect(inv.getByRole('textbox', { name: 'What, row 2' })).toBeFocused();
  await page.keyboard.type('Design');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="1,1"]')).toBeFocused();
  await page.keyboard.type('12');
  await page.keyboard.press('Tab');
  // Then the units, then the price.
  await expect(inv.locator('[data-lf="1,2"]')).toBeFocused();
  await page.keyboard.type('hours');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="1,3"]')).toBeFocused();
  await page.keyboard.type('150');
  await expect(inv.locator('[data-inv="amount"]').first()).toHaveText('$1,800.00');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$1,800.00');
  await shot(page, 'invoice-edit');
  // A shortcut pressed in the page is the editor's.
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Invoice, as text' })).toHaveValue('From: Harbor Studio | 14 Quay Street\nDesign, 12 hours, 150');
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

// The frame's own script, real focus and a real date box: adding lines, moving between them while typing, dates, removing.
test('invoice: lines are added under the lines, the cursor stays where it is put, dates are picked, lines are removed', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('tinyoffice.edit'));
  await page.goto('/#/v0/invoice');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const f = page.frameLocator('.diagram.page iframe');
  const lines = f.locator('tr[data-inv=item]');
  await expect(lines).toHaveCount(3);
  // "Add a line" sits under the lines, and works every time.
  const add = f.getByRole('button', { name: '+ Add a line' });
  await expect(f.locator('tbody tr.adder')).toContainText('Add a line');
  for (const n of [4, 5]) {
    await add.click();
    await expect(lines).toHaveCount(n);
  }
  // Type in one line, then go straight to another: the cursor stays in the other, however long the page takes to be drawn again.
  await f.getByRole('textbox', { name: 'What, row 10' }).click();
  await page.keyboard.type('Review');
  await f.getByRole('textbox', { name: 'Price, row 8' }).click();
  for (let i = 0; i < 4; i++) {
    await page.waitForTimeout(400);
    await expect(f.locator(':focus')).toHaveAttribute('aria-label', 'Price, row 8');
  }
  // Units after the quantity.
  await f.getByRole('textbox', { name: 'Units, row 11' }).click();
  await page.keyboard.type('days');
  // A date is picked from the browser's date box.
  await f.getByLabel('Due').fill('2027-04-15');
  await f.getByLabel('Due').dispatchEvent('change');
  await f.getByRole('textbox', { name: 'What, row 7' }).click();
  await expect.poll(() => page.evaluate(() => (document.querySelector('to-app') as unknown as { env: { body: string } }).env.body)).toContain('Due: 2027-04-15');
  const body = await page.evaluate(() => (document.querySelector('to-app') as unknown as { env: { body: string } }).env.body);
  expect(body).toContain('Review, 1, 10');
  expect(body).toContain(', 1 days, 10');
  // Each line has a button to take it away.
  const before = await lines.count();
  await f.getByRole('button', { name: 'Remove the line Review' }).click();
  await expect(lines).toHaveCount(before - 1);
});
