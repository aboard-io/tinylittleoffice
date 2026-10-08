import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './helpers';

// The invoice opens as the page itself, every field typed into where it stands (the suite's other tests start as text).
test.beforeEach(({ page }) => page.addInitScript(() => localStorage.removeItem('tinyoffice.edit')));

test('an invoice is typed straight onto the page, and the sums are done as you go', async ({ page }) => {
  await page.goto('/#/invoice');
  const inv = page.frameLocator('to-invoice iframe');
  // Empty, it is the invoice all the same, every field a hint of what goes there.
  await expect(page.locator('to-invoice iframe')).not.toHaveClass(/sample/);
  const from = inv.getByRole('textbox', { name: 'From, line 1' });
  await expect(from).toHaveAttribute('data-hint', 'Your name');
  await expect(inv.getByRole('textbox', { name: 'To, line 1' })).toHaveAttribute('data-hint', 'Who this is for');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$0.00');
  await expect(inv.locator('#lf-bar')).toHaveCount(0);
  // Typing into a hint makes its line of the text; Tab moves on, and the cursor survives the page being drawn again.
  await from.click();
  await page.keyboard.type('Harbor Studio');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="0,0,1"]')).toBeFocused();
  await page.keyboard.type('14 Quay Street');
  await inv.getByRole('textbox', { name: 'Number' }).click();
  await page.keyboard.type('0042');
  await expect(page).toHaveTitle('Invoice 0042 · TinyLittleOffice');
  // A row goes under the items with its words selected to type over; Tab reaches the quantity and the price, selected too.
  await inv.getByRole('button', { name: 'Add a row' }).click();
  await expect(inv.getByRole('textbox', { name: 'What, row 3' })).toBeFocused();
  await page.keyboard.type('Design');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="2,1"]')).toBeFocused();
  await page.keyboard.type('12');
  await page.keyboard.press('Tab');
  await expect(inv.locator('[data-lf="2,2"]')).toBeFocused();
  await page.keyboard.type('150');
  await expect(inv.locator('[data-inv="amount"]').first()).toHaveText('$1,800.00');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$1,800.00');
  // Tax is a rate typed beside its line of the sums.
  await inv.getByRole('textbox', { name: 'Tax' }).click();
  await page.keyboard.type('8%');
  await expect(inv.locator('[data-inv="taxed"]')).toHaveText('$144.00');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$1,944.00');
  await shot(page, 'invoice-edit');
  // Another row, and its button takes it away.
  await inv.getByRole('button', { name: 'Add a row' }).click();
  await expect(inv.locator(':focus')).toHaveAttribute('aria-label', /^What, row/);
  await page.keyboard.type('Build');
  await expect(inv.locator('tbody tr')).toHaveCount(2);
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$1,954.80');
  await inv.getByRole('button', { name: 'Remove Build' }).click();
  await expect(inv.locator('tbody tr')).toHaveCount(1);
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$1,944.00');
  // What is saved is the text, as anyone would have typed it, the headings in their order.
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Invoice, as text' })).toHaveValue('From: Harbor Studio | 14 Quay Street\nNumber: 0042\nTax: 8%\nDesign, 12, 150');
});

test('the example invoice is edited where it stands, and the page it downloads is clean', async ({ page }) => {
  await page.goto('/#/invoice');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const inv = page.frameLocator('to-invoice iframe');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$5,486.40');
  // A quantity changed changes the sums; a cleared field shows its hint again.
  const qty = inv.getByRole('textbox', { name: 'Qty, row 7' });
  await qty.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('10');
  await expect(inv.locator('[data-inv="amount"]').first()).toHaveText('$1,500.00');
  await expect(inv.locator('[data-inv="total"]')).toHaveText('$5,162.40');
  await inv.getByRole('textbox', { name: 'Due' }).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await expect(inv.getByRole('textbox', { name: 'Due' })).toHaveText('');
  await page.keyboard.press('Escape');
  // (Escape redraws the page; a key pressed in the instant its frame reloads goes nowhere, so the shortcut is tried until it takes.)
  await expect(async () => {
    await page.keyboard.press('Control+Shift+t');
    await expect(page.getByRole('textbox', { name: 'Invoice, as text' })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByRole('textbox', { name: 'Invoice, as text' })).toHaveValue(/^From: Harbor Studio \| 14 Quay Street\nTo: Acme Ltd \| Accounts payable\nNumber: 0042\nDate: 2027-03-01\nTax: 8%\nDesign, 10, 150\n/);
  // The downloaded page carries none of the editing, and the PDF is still the invoice.
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = readFileSync(await file.path(), 'utf8');
  expect(file.suggestedFilename()).toBe('invoice-0042.html');
  expect(html).toContain('<td>Design</td><td class="n">10</td>');
  expect(html).not.toContain('data-lf');
  expect(html).not.toContain('<script>');
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+p')]);
  expect(pdf.suggestedFilename()).toBe('invoice-0042.pdf');
  expect(readFileSync(await pdf.path()).subarray(0, 5).toString()).toBe('%PDF-');
});
