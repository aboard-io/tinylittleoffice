import { test, expect } from '@playwright/test';
import { shot, reopen, pickOption } from './helpers';

test('calendar: spans, zones and the author-zone shortcut', async ({ page }) => {
  await page.goto('/#/cal');
  await page.locator('.cal-cell.today').click();
  const label = page.getByRole('textbox', { name: 'Label' });
  await expect(label).toBeFocused();
  await label.fill('Offsite');
  await page.getByLabel('Start date').fill('2026-01-15');
  await page.getByLabel('End date').fill('2026-01-17');
  await expect(page.locator('.cal-agenda li')).toHaveCount(1);
  await expect(page.locator('.cal-agenda .when')).toHaveText('Jan 15 – 17, 2026');

  await page.locator('.cal-agenda li').click();
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  for (const d of ['2026-01-15', '2026-01-16', '2026-01-17']) {
    await expect(page.getByRole('gridcell', { name: d }).locator('.cal-chip')).toHaveText('Offsite');
  }
  await expect(page.getByRole('gridcell', { name: '2026-01-18' }).locator('.cal-chip')).toHaveCount(0);

  // Timed: 09:00 New York on Jan 15 is 14:00 UTC.
  const allDay = page.locator('sl-checkbox', { hasText: 'All day' });
  await expect(allDay).toHaveJSProperty('checked', true);
  await allDay.click();
  await expect(allDay).toHaveJSProperty('checked', false);
  await expect(page.getByLabel('Start time')).toHaveValue('09:00');
  await expect(page.getByLabel('End time')).toHaveValue('10:00');
  const chip = page.getByRole('gridcell', { name: '2026-01-15' }).locator('.cal-chip');
  await expect(chip).toHaveAttribute('title', /9:00/);
  await pickOption(page, 'sl-select.cal-zone', 'UTC');
  await expect(chip).toHaveAttribute('title', /2:00/);
  await expect(page.getByLabel('Start time')).toHaveValue('14:00');
  await label.fill('Offsite call');

  await reopen(page);
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  await expect(chip).toHaveAttribute('title', /9:00/);
  const authorZone = page.getByRole('button', { name: /UTC time/ });
  await expect(authorZone).toBeVisible();
  await authorZone.click();
  await expect(chip).toHaveAttribute('title', /2:00/);
  await expect(authorZone).toHaveCount(0);

  // Drag across days creates a multi-day span.
  const from = await page.getByRole('gridcell', { name: '2026-01-05' }).boundingBox();
  const to = await page.getByRole('gridcell', { name: '2026-01-08' }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height - 6);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height - 6, { steps: 6 });
  await page.mouse.up();
  await page.getByRole('textbox', { name: 'Label' }).fill('Sprint');
  await expect(page.locator('.cal-agenda li')).toHaveCount(2);
  await expect(page.locator('.cal-agenda li').first()).toContainText('Jan 5 – 8, 2026');
  await shot(page, 'cal');

  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('gridcell', { name: '2026-01-06' }).locator('.cal-chip').click();
  await page.locator('.cal-grid').focus();
  await page.keyboard.press('Delete');
  await expect(page.locator('.cal-agenda li')).toHaveCount(1);
});
