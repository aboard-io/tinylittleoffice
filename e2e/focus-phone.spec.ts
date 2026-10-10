/**
 * A document opens with the focus where a person starts (docs/editing.md §1), on a phone (WebKit, 390 by 844):
 * every app's new document, and a template from the home page, take the focus in the editor and never scroll the
 * page; the title box never has it. Run on its own:
 *
 *   PW_PORT=4428 npx playwright test e2e/focus-phone.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';

/** Each app, and what has the focus once its new document is drawn. */
const START: [string, string][] = [
  ['write', 'to-write-editor to-text.write-text .tx'],
  ['sheet', 'to-sheet-editor input[aria-label="A1"]'],
  ['deck', 'to-deck-editor to-text.deck-title .tx'],
  ['outline', 'to-outline-editor .ol-row to-text .tx'],
  ['todo', 'to-todo-editor to-text .tx'],
  ['board', 'to-board-editor .board-col to-text .tx'],
  ['calc', 'to-calc-editor .calc-display'],
  ['draw', 'to-draw-editor .draw-wrap'],
  ['anim', 'to-anim-editor .draw-wrap'],
  ['diagram', 'to-diagram-editor .dg-wrap'],
  ['cal', 'to-cal-editor .cal-cell.today .cal-n'],
  ['trip', 'to-trip-editor .trip-map'],
  ['site', 'to-site-editor iframe.site-frame'],
];

test('every app opens with the focus where a person starts, the page not scrolled', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  for (const [app, start] of START) {
    await page.goto('/');
    await page.goto(`/#/v1/${app}`);
    await expect(page.locator(start).first(), app).toBeVisible();
    await expect.poll(() => page.locator(start).first().evaluate((el) => el === document.activeElement || el.contains(document.activeElement)), { message: app }).toBe(true);
    expect(await page.evaluate(() => document.activeElement?.matches('.to-title, body') ?? true), app).toBe(false);
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop), app).toBe(0);
  }
  // A template from the home page opens the same way.
  await page.goto('/');
  await page.locator('.to-templates-btn[aria-label="Templates for Word Processor"]').tap();
  await page.locator('[role=option]', { hasText: 'Memo' }).first().tap();
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('to-write-editor to-text.write-text'))).toBe(true);
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
  expect(errors).toEqual([]);
});
