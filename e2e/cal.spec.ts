/**
 * Calendar on the built site: on a phone, a tap on a day opens the dialog over a grid that stays put, the words
 * are typed without the page moving or zooming, and Done writes the span; on a desktop, a real drag across days
 * (the day under the pointer found by where it is on the screen) is a span over them. Run on its own:
 *
 *   PW_PORT=4191 npx playwright test e2e/cal.spec.ts --workers=1
 */
import { test, expect, type Page } from '@playwright/test';

const value = (page: Page) => page.evaluate(() => (document.querySelector('to-cal-editor') as HTMLElement & { value: string }).value);
const measure = (page: Page) =>
  page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('to-cal-editor to-bar')!;
    const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
    return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, zoom: window.visualViewport?.scale ?? 1, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });

test('calendar: on a phone, a tap on a day opens the dialog over a grid that stays put; the words are typed and Done writes the span', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/cal');
  const grid = page.locator('.cal-grid');
  await expect(grid).toBeVisible();
  const first = await measure(page);
  const before = await grid.boundingBox();
  await page.locator('.cal-cell.today').tap();
  const dialog = page.locator('to-dialog.cal-dialog dialog');
  await expect(dialog).toBeVisible();
  expect(await grid.boundingBox()).toEqual(before);
  await expect(page.locator('to-text.cal-label .tx')).toBeFocused();
  await page.keyboard.type('Dentist');
  const typing = await measure(page);
  const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('to-dialog.cal-dialog .tx, to-dialog.cal-dialog input:not([type=checkbox]), to-dialog.cal-dialog select')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).length);
  await dialog.getByRole('button', { name: 'Done' }).tap();
  await expect(dialog).toBeHidden();
  expect(await value(page)).toMatch(/^- \d{4}-\d\d-\d\d: Dentist\n$/);
  await expect(page.locator('.cal-cell.today .cal-chip')).toHaveText('Dentist');
  await expect(page).toHaveURL(/#\/v1\/cal\/./);
  const after = await measure(page);
  expect([first, typing, after].map((s) => s.rows)).toEqual([1, 1, 1]);
  expect(new Set([first.bar, after.bar]).size).toBe(1);
  expect(typing.zoom).toBe(1);
  expect(after.pageTop).toBe(0);
  expect(after.wide).toBeLessThanOrEqual(0);
  expect(small).toBe(0);
  expect(errors).toEqual([]);
});

test('calendar: a drag across days is a span over them', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only');
  await page.goto('/#/v1/cal');
  const cells = page.locator('.cal-row:nth-child(3) .cal-cell');
  const from = (await cells.nth(1).boundingBox())!;
  const to = (await cells.nth(3).boundingBox())!;
  const days = await cells.evaluateAll((els) => els.map((el) => Number((el as HTMLElement).dataset.day)));
  await page.mouse.move(from.x + from.width / 2, from.y + from.height - 6);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height - 6, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('to-dialog.cal-dialog dialog')).toBeVisible();
  await page.keyboard.type('Sprint');
  await page.keyboard.press('Enter');
  const iso = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10);
  await expect.poll(() => value(page)).toBe(`- ${iso(days[1])} to ${iso(days[3])}: Sprint\n`);
});
