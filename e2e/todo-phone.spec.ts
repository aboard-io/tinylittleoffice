/**
 * Todo on a phone, by finger (docs/editing.md §6, §7): a tap on a task's grip chooses it with its bar inside the
 * screen, and the bar's Duplicate works; the grip and the due date are 44px to a finger, the grip alone takes a drag,
 * and a double tap on the words never zooms. Real layout on WebKit at iPhone 14 size:
 *
 *   PW_PORT=4315 npx playwright test e2e/todo-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';

test('todo: on a phone, a tap on the grip chooses the task with its bar on screen; Duplicate by finger; 44px grip and date; no zoom', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/todo');
  const words = (at: number) => page.locator(`to-text[data-at="${at}"] .tx`);
  await words(0).tap();
  await page.keyboard.type('Call the printer');
  await expect(page).toHaveURL(/#\/v1\/todo\/[ryz]/);
  await page.locator('.todo-row').first().locator('.todo-grip').tap();
  await expect(page.locator('.todo-row.ranged')).toHaveCount(1);
  const bar = page.locator('to-context.todo-context .to-context');
  await expect(bar).toBeVisible();
  const b = (await bar.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  await bar.getByRole('button', { name: 'Duplicate' }).tap();
  await expect(page.locator('.todo-row')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => (document.querySelector('to-todo-editor') as HTMLElement & { value: string }).value)).toBe('- [ ] Call the printer\n- [ ] Call the printer\n');
  // Escape lets the copies go (the caret back in the words) and the bar with them.
  await page.keyboard.press('Escape');
  await expect(bar).toBeHidden();
  // The date, once asked for, is a finger tall.
  await page.locator('.todo-row').first().locator('.todo-more').tap();
  await page.getByRole('menuitem', { name: 'Due date…' }).tap();
  await expect(page.locator('.todo-row').first().locator('input[type=date]')).toBeVisible();
  const sizes = await page.evaluate(() => {
    const grip = document.querySelector('.todo-grip')!;
    const before = getComputedStyle(grip, '::before');
    const ta = (sel: string) => getComputedStyle(document.querySelector(sel)!).touchAction;
    return {
      grip: [parseFloat(before.width), parseFloat(before.height)],
      date: document.querySelector('.todo-due')!.getBoundingClientRect().height,
      list: ta('.todo-list'),
      gripTa: ta('.todo-grip'),
      row: ta('.todo-row'),
    };
  });
  expect(Math.min(...sizes.grip)).toBeGreaterThanOrEqual(44);
  expect(sizes.date).toBeGreaterThanOrEqual(44);
  expect([sizes.list, sizes.gripTa]).toEqual(['manipulation', 'none']);
  expect(sizes.row).not.toBe('none');
  await page.keyboard.press('Escape');
  // A double tap on the words never zooms the page.
  const w = (await words(1).boundingBox())!;
  await page.touchscreen.tap(w.x + 20, w.y + w.height / 2);
  await page.touchscreen.tap(w.x + 20, w.y + w.height / 2);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
