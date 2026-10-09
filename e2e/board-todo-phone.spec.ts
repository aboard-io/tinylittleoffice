/**
 * Board and Todo on a phone: typing tasks and cards neither scrolls the page nor moves the bar, which is one row;
 * every row and control is a finger tall; a card carried by its grip lands in the next stage. Real layout on a
 * real phone engine (the phone project: WebKit, 390 by 844). Run on its own:
 *
 *   PW_PORT=4190 npx playwright test e2e/board-todo-phone.spec.ts --project=phone --workers=1
 */
import { test, expect, type Page } from '@playwright/test';

const measure = (page: Page, tag: string) =>
  page.evaluate((tag) => {
    const bar = document.querySelector<HTMLElement>(`${tag} to-bar`)!;
    const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
    return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, zoom: window.visualViewport?.scale ?? 1, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  }, tag);
const value = (page: Page, tag: string) => page.evaluate((tag) => (document.querySelector(tag) as HTMLElement & { value: string }).value, tag);
const small = (page: Page, tag: string) => page.evaluate((tag) => [...document.querySelectorAll<HTMLElement>(`${tag} .tx, ${tag} input:not([type=checkbox])`)].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => el.getAttribute('aria-label') ?? el.className), tag);

test('todo: on a phone, tasks are typed, ticked and starred without the page moving; rows are a finger tall', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/todo');
  const words = (at: number) => page.locator(`to-text[data-at="${at}"] .tx`);
  await expect(words(0)).toBeVisible();
  const first = await measure(page, 'to-todo-editor');
  await words(0).tap();
  await page.keyboard.type('Call the printer');
  await expect(page).toHaveURL(/#\/v1\/todo\/[ryz]/);
  const seen = [await measure(page, 'to-todo-editor')];
  await page.keyboard.press('Enter');
  await expect(words(1)).toBeFocused();
  await page.keyboard.type('Pay rent');
  seen.push(await measure(page, 'to-todo-editor'));
  await page.locator('.todo-row').first().locator('.todo-star').tap();
  await page.locator('.todo-row').first().locator('.todo-tick').tap();
  seen.push(await measure(page, 'to-todo-editor'));
  expect(await value(page, 'to-todo-editor')).toBe('- [x] Call the printer {.star}\n- [ ] Pay rent\n');
  const rows = await page.locator('.todo-row').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const h of rows) expect(h).toBeGreaterThanOrEqual(44);
  expect(seen.map((s) => s.pageTop)).toEqual(seen.map(() => 0));
  expect(new Set([first.bar, ...seen.map((s) => s.bar)]).size).toBe(1);
  expect([first.rows, ...seen.map((s) => s.rows)].every((n) => n === 1)).toBe(true);
  expect(seen.at(-1)).toMatchObject({ zoom: 1 });
  expect(seen.at(-1)!.wide).toBeLessThanOrEqual(0);
  expect(await small(page, 'to-todo-editor')).toEqual([]);
  expect(errors).toEqual([]);
});

test('board: on a phone, a card is typed without the page moving, and carried by its grip into the next stage', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/board');
  const cols = page.locator('.board-col');
  await expect(cols).toHaveCount(3);
  const first = await measure(page, 'to-board-editor');
  // The stage's menu puts a card in; the caret goes to it.
  await cols.first().locator('.board-more').tap();
  await page.locator('.board-menu [role=menu]').getByText('Add a card').tap();
  const card = page.locator('to-text[data-at="1"] .tx');
  await expect(card).toBeFocused();
  await page.keyboard.type('Photograph the studio');
  await expect(page).toHaveURL(/#\/v1\/board\/[ryz]/);
  const seen = [await measure(page, 'to-board-editor')];
  expect((await page.locator('.board-main').first().boundingBox())!.height).toBe(44);
  // Carried by the grip to the next stage, at the right edge of the screen.
  const grip = (await page.locator('.board-grip').first().boundingBox())!;
  const next = (await cols.nth(1).boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 20, grip.y + 10, { steps: 3 });
  await page.mouse.move(Math.min(385, next.x + 20), next.y + 60, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => value(page, 'to-board-editor')).toContain('## Doing\n\n- Photograph the studio\n');
  seen.push(await measure(page, 'to-board-editor'));
  expect(seen.map((s) => s.pageTop)).toEqual(seen.map(() => 0));
  expect(new Set([first.bar, ...seen.map((s) => s.bar)]).size).toBe(1);
  expect([first.rows, ...seen.map((s) => s.rows)].every((n) => n === 1)).toBe(true);
  expect(seen.at(-1)!.wide).toBeLessThanOrEqual(0);
  expect(await small(page, 'to-board-editor')).toEqual([]);
  expect(errors).toEqual([]);
});
