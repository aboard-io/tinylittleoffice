import { test, expect } from '@playwright/test';
import { shot, reopen, pickOption } from './helpers';

test('calendar: spans, zones and the author-zone shortcut', async ({ page }) => {
  await page.goto('/#/cal');
  const dialog = page.locator('sl-dialog.cal-dialog');
  // A click on a day opens the dialog over the grid, which stays where it is.
  const gridBefore = await page.locator('.cal-grid').boundingBox();
  await page.locator('.cal-cell.today').click();
  await expect(dialog).toHaveAttribute('open');
  expect(await page.locator('.cal-grid').boundingBox()).toEqual(gridBefore);
  const label = page.getByRole('textbox', { name: 'Label' });
  await expect(label).toBeFocused();
  await label.fill('Offsite');
  await page.getByLabel('Start date').fill('2026-01-15');
  await page.getByLabel('End date').fill('2026-01-17');
  // The draft is drawn as it changes; Return is the same as Done.
  await expect(page.locator('.cal-agenda .when')).toHaveText('Jan 15 – 17, 2026');
  await page.keyboard.press('Enter');
  await expect(dialog).not.toHaveAttribute('open');
  await expect(page.locator('.cal-agenda li')).toHaveCount(1);

  await page.locator('.cal-agenda li').click();
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  await expect(dialog).toHaveAttribute('open');
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
  await expect(chip).toHaveAttribute('data-tip', /9:00/);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).not.toHaveAttribute('open');
  // The time zone is a box you can type in: a city is enough.
  const zone = page.getByRole('combobox', { name: 'Time zone' });
  await zone.fill('utc');
  await zone.press('Enter');
  await expect(zone).toHaveValue('UTC');
  await expect(chip).toHaveAttribute('data-tip', /2:00/);
  await chip.click();
  await expect(page.getByLabel('Start time')).toHaveValue('14:00');
  await label.fill('Offsite call');
  await page.keyboard.press('Enter');
  await expect(dialog).not.toHaveAttribute('open');
  await expect(chip).toHaveText(/Offsite call/);

  await reopen(page);
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  await expect(chip).toHaveAttribute('data-tip', /9:00/);
  const authorZone = page.getByRole('button', { name: /UTC time/ });
  await expect(authorZone).toBeVisible();
  await authorZone.click();
  await expect(chip).toHaveAttribute('data-tip', /2:00/);
  await expect(authorZone).toHaveCount(0);

  // Drag across days creates a multi-day span.
  const from = await page.getByRole('gridcell', { name: '2026-01-05' }).boundingBox();
  const to = await page.getByRole('gridcell', { name: '2026-01-08' }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height - 6);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height - 6, { steps: 6 });
  await page.mouse.up();
  await expect(dialog).toHaveAttribute('open');
  await page.getByRole('textbox', { name: 'Label' }).fill('Sprint');
  await expect(page.locator('.cal-agenda li')).toHaveCount(2);
  await expect(page.locator('.cal-agenda li').first()).toContainText('Jan 5 – 8, 2026');
  await shot(page, 'cal');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).not.toHaveAttribute('open');
  await expect(page.locator('.cal-agenda li')).toHaveCount(2);

  // Escape throws the dialog's changes away; Delete, outside a field, deletes the span.
  await page.getByRole('gridcell', { name: '2026-01-06' }).locator('.cal-chip').click();
  await page.getByRole('textbox', { name: 'Label' }).fill('Not this');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open');
  await expect(page.getByRole('gridcell', { name: '2026-01-06' }).locator('.cal-chip')).toHaveText('Sprint');
  await page.getByRole('gridcell', { name: '2026-01-06' }).locator('.cal-chip').click();
  await page.getByRole('button', { name: 'Done' }).focus();
  await page.keyboard.press('Delete');
  await expect(dialog).not.toHaveAttribute('open');
  await expect(page.locator('.cal-agenda li')).toHaveCount(1);
});

test('calendar: a span that repeats every week', async ({ page }) => {
  await page.goto('/#/cal');
  const dialog = page.locator('sl-dialog.cal-dialog');
  await page.locator('.cal-cell.today').click();
  await page.getByRole('textbox', { name: 'Label' }).fill('Standup');
  await page.getByLabel('Start date').fill('2026-01-05');
  await page.getByLabel('End date').fill('2026-01-05');
  await pickOption(page, '.cal-repeat', 'w');
  await page.getByLabel('Times').fill('4');
  await page.keyboard.press('Enter');
  await expect(dialog).not.toHaveAttribute('open');
  // One line in the agenda, saying so; its month shows it every Monday, four times.
  await expect(page.locator('.cal-agenda li')).toHaveCount(1);
  await expect(page.locator('.cal-agenda .rep')).toHaveText('every week, 4 times');
  await page.locator('.cal-agenda li').click();
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open');
  for (const d of ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']) {
    await expect(page.getByRole('gridcell', { name: d }).locator('.cal-chip')).toHaveText('Standup');
  }
  await expect(page.getByRole('gridcell', { name: '2026-01-06' }).locator('.cal-chip')).toHaveCount(0);
  await expect(page.locator('.cal-agenda li')).toHaveCount(4);
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.getByRole('gridcell', { name: '2026-02-02' }).locator('.cal-chip')).toHaveCount(0);
  await shot(page, 'cal-repeat');

  // The link carries the rule, and opens on the series' month once it is over; editing any one of them edits the series.
  await reopen(page);
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  await expect(page.locator('.cal-agenda li')).toHaveCount(4);
  await page.getByRole('gridcell', { name: '2026-01-19' }).locator('.cal-chip').click();
  await expect(page.getByLabel('Times')).toHaveValue('4');
  await page.getByRole('textbox', { name: 'Label' }).fill('Standup!');
  await pickOption(page, '.cal-repeat', 'never');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('gridcell', { name: '2026-01-05' }).locator('.cal-chip')).toHaveText('Standup!');
  await expect(page.getByRole('gridcell', { name: '2026-01-12' }).locator('.cal-chip')).toHaveCount(0);
  await expect(page.locator('.cal-agenda li')).toHaveCount(1);
});
