import { test, expect } from '@playwright/test';

test('calendar: spans, zones and the author-zone shortcut', async ({ page }) => {
  await page.goto('/#/cal');
  await expect(page.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page');

  // Click today's cell to create an all-day span, then move it to a known January date.
  await page.locator('.cell.today').click();
  const label = page.getByRole('textbox', { name: 'Label' });
  await expect(label).toBeFocused();
  await label.fill('Offsite');
  await page.getByLabel('Start date').fill('2026-01-15');
  await page.getByLabel('End date').fill('2026-01-17');
  await expect(page.locator('.agenda li')).toHaveCount(1);
  await expect(page.locator('.agenda .when')).toHaveText('Jan 15 – 17, 2026');

  // The agenda jumps the grid to the span's month; the span shows on three days.
  await page.locator('.agenda li').click();
  await expect(page.locator('.toolbar .month')).toHaveText('January 2026');
  for (const d of ['2026-01-15', '2026-01-16', '2026-01-17']) {
    await expect(page.getByRole('gridcell', { name: d }).locator('.chip')).toHaveText('Offsite');
  }
  await expect(page.getByRole('gridcell', { name: '2026-01-18' }).locator('.chip')).toHaveCount(0);

  // Timed: 09:00 New York on Jan 15 is 14:00 UTC.
  await page.getByLabel('All day').uncheck();
  await expect(page.getByLabel('Start time')).toHaveValue('09:00');
  await expect(page.getByLabel('End time')).toHaveValue('10:00');
  const chip = page.getByRole('gridcell', { name: '2026-01-15' }).locator('.chip');
  await expect(chip).toContainText('9:00');
  await page.getByRole('combobox', { name: 'Time zone' }).selectOption('UTC');
  await expect(chip).toContainText('14:00');
  await expect(page.getByLabel('Start time')).toHaveValue('14:00');
  // Editing while viewing in UTC records UTC as the document's zone.
  await label.fill('Offsite call');

  // Reopen: the browser is back in New York time, and the author's zone is one click away.
  const url = page.url();
  expect(url).toMatch(/#\/cal\/[zr]/);
  await page.goto('about:blank');
  await page.goto(url);
  await expect(page.locator('.toolbar .month')).toHaveText('January 2026');
  await expect(chip).toContainText('9:00');
  const authorZone = page.getByRole('button', { name: /UTC time/ });
  await expect(authorZone).toBeVisible();
  await authorZone.click();
  await expect(chip).toContainText('14:00');
  await expect(authorZone).toHaveCount(0);

  // Drag across days creates a multi-day span.
  const from = await page.getByRole('gridcell', { name: '2026-01-05' }).boundingBox();
  const to = await page.getByRole('gridcell', { name: '2026-01-08' }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height - 8);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height - 8, { steps: 6 });
  await page.mouse.up();
  await page.getByRole('textbox', { name: 'Label' }).fill('Sprint');
  await expect(page.locator('.agenda li')).toHaveCount(2);
  await expect(page.locator('.agenda li').first()).toContainText('Jan 5 – 8, 2026');

  // Delete with the keyboard.
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('gridcell', { name: '2026-01-06' }).locator('.chip').click();
  await page.locator('.grid').focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('.agenda li')).toHaveCount(1);
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/cal.png`, fullPage: true });
});
