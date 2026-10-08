import { test, expect } from '@playwright/test';
import { shot } from './helpers';

// The rest of the calendar (spans, zones, repeats) is in test/dom/calendar.test.ts; these need a real layout.
test('calendar: the dialog opens over a grid that stays put, and a drag across days is a span', async ({ page }) => {
  await page.goto('/#/v0/cal');
  const dialog = page.locator('sl-dialog.cal-dialog');
  // Geometry: the grid's box before and after the dialog opens.
  const gridBefore = await page.locator('.cal-grid').boundingBox();
  await page.locator('.cal-cell.today').click();
  await expect(dialog).toHaveAttribute('open');
  expect(await page.locator('.cal-grid').boundingBox()).toEqual(gridBefore);
  await expect(page.getByRole('textbox', { name: 'Label' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open');

  // A drag finds the day under the pointer by where it is on the screen (elementFromPoint).
  // (A span on 2026-01-20, so the calendar opens on January 2026.)
  await page.goto('about:blank');
  await page.goto('/#/v0/cal/' + (await import('../src/lib/envelope.ts')).encodeEnvelope({ created: 1, body: '- 2026-01-20: Anchor' }));
  await expect(page.locator('.cal-month')).toHaveText('January 2026');
  const from = await page.getByRole('gridcell', { name: '2026-01-05' }).boundingBox();
  const to = await page.getByRole('gridcell', { name: '2026-01-08' }).boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height - 6);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height - 6, { steps: 6 });
  await page.mouse.up();
  await expect(dialog).toHaveAttribute('open');
  await page.getByRole('textbox', { name: 'Label' }).fill('Sprint');
  await expect(page.locator('.cal-agenda li').first()).toContainText('Jan 5 – 8, 2026');
  await expect(page.locator('.cal-agenda li')).toHaveCount(2);
  await shot(page, 'cal');
});
