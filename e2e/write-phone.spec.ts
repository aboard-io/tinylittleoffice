/**
 * Write in a real engine: the arrows over a card (the browser's own caret, desktop Chromium and the phone's
 * WebKit alike), and on a phone (WebKit, 390 by 844, a finger) a table taken in hand by its corner handle
 * and taken out from the bar under it, a column's menu inside the screen, a table wider than the paper
 * scrolling in its own box. Run on its own:
 *
 *   PW_PORT=4310 npx playwright test e2e/write-phone.spec.ts --workers=1
 */
import { test, expect, type Page } from '@playwright/test';

/** The caret put at a place in the words, written to the page (a frame later in WebKit). */
async function caretAt(page: Page, block: number, offset: number) {
  await page.evaluate(([b, o]) => {
    const el = document.querySelector('to-write-editor to-text') as HTMLElement & { sel: unknown };
    el.sel = { anchor: { block: b, offset: o }, focus: { block: b, offset: o } };
  }, [block, offset]);
  await expect(page.locator('to-write-editor .tx')).toBeFocused();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}
/** The block the editor's caret is in (it follows the browser's at selectionchange, a moment after the key). */
const caretBlock = (page: Page) => page.evaluate(() => (document.querySelector('to-write-editor to-text') as HTMLElement & { sel: { focus: { block: number } } | null }).sel?.focus.block ?? -1);
async function open(page: Page, text: string) {
  await page.goto('/#/v1/write');
  const editor = page.locator('to-write-editor');
  await expect(editor.locator('to-text .tx')).toBeVisible();
  await page.evaluate((t) => ((document.querySelector('to-write-editor') as HTMLElement & { value: string }).value = t), text);
  await expect.poll(() => page.evaluate(() => (document.querySelector('to-write-editor to-text') as HTMLElement & { blocks: unknown[] }).blocks.length)).toBeGreaterThan(1);
  return {
    value: () => page.evaluate(() => (document.querySelector('to-write-editor') as HTMLElement & { value: string }).value),
  };
}

test('write: the arrows go over a card to the words on its other side, and what is typed lands there', async ({ page }) => {
  const doc = await open(page, 'Before\n\nA | B\n--- | ---\n1 | 2\n\nAfter\n');
  const after = page.locator('to-write-editor .tx > p').nth(1);
  await expect(after).toHaveText('After');
  // The caret at the start of "After", then up over the table.
  await caretAt(page, 2, 0);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => caretBlock(page)).toBe(0);
  await page.keyboard.type('X');
  await expect.poll(async () => (await doc.value()).includes('X')).toBe(true);
  expect((await doc.value()).split('\n\n')).toEqual([expect.stringContaining('X'), 'A | B\n--- | ---\n1 | 2', 'After\n']);
  // And down over it from the end of "Before".
  await caretAt(page, 0, (await doc.value()).split('\n\n')[0].length);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => caretBlock(page)).toBe(2);
  await page.keyboard.type('Y');
  await expect.poll(async () => (await doc.value()).split('\n\n').at(-1)).toContain('Y');
  expect((await doc.value()).split('\n\n')[1]).toBe('A | B\n--- | ---\n1 | 2');
});

test('write: on a phone, a table is taken in hand by its handle and taken out from its bar; its menus stay inside the screen; the page never scrolls sideways', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const doc = await open(page, 'Before\n\nWhat | Qty:number | Units | Price:money | Amount:money | Note\n--- | --- | --- | --- | --- | ---\nDesign | 12 | hours | 150 | =B1*D1 | first\n\nAfter\n');
  const table = page.locator('to-write-table');
  await expect(table.locator('input').first()).toBeVisible();
  const wide = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await wide()).toBeLessThanOrEqual(0);
  // A column's head: its menu opens inside the screen.
  await table.locator('.wt-col').nth(1).tap();
  const colMenu = page.locator('to-menu.wt-colmenu [role=menu]');
  await expect(colMenu).toBeVisible();
  const box = (await colMenu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(colMenu).toBeHidden();
  // The handle is 44px to a finger, and a tap takes the table in hand: the bar comes up inside the screen.
  const hand = table.locator('.wt-hand');
  const h = (await hand.boundingBox())!;
  expect(h.height).toBeGreaterThanOrEqual(44);
  await hand.tap();
  const bar = page.locator('to-context.write-cardbar .to-context');
  await expect(bar).toBeVisible();
  const b = (await bar.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  await bar.getByRole('button', { name: 'Delete', exact: true }).tap();
  await expect.poll(doc.value).toBe('Before\n\nAfter\n');
  await expect(bar).toBeHidden();
  expect(await wide()).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
