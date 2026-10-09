/**
 * The Sheet on a phone: whether a tap scrolls the page, and how tall the bar is, are real layout on a real
 * phone engine (the phone project: WebKit, 390 by 844, a finger for a pointer). Run on its own:
 *
 *   npx playwright test e2e/sheet-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';

test('sheet: on a phone, tapping cells neither scrolls the page nor moves the bar, which is one row; every input is 16px', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await expect(cell('A1')).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-sheet-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { bar: bar.offsetHeight, rows: tops.size, pageTop: document.scrollingElement!.scrollTop, zoom: window.visualViewport?.scale ?? 1, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  const first = await measure();
  // Ten cells, some of them typed into: a block, a formula, a cell shown again with its formula.
  const taps = ['A1', 'B2', 'C3', 'A4', 'B5', 'C6', 'A7', 'B8', 'C9', 'A10'];
  const seen: { bar: number; rows: number; pageTop: number }[] = [];
  for (const [i, ref] of taps.entries()) {
    await cell(ref).tap();
    if (i < 3) await cell(ref).fill(i === 2 ? '=A1+B2' : String((i + 1) * 10));
    if (i === 4) await page.keyboard.press('Shift+ArrowDown');
    const m = await measure();
    seen.push({ bar: m.bar, rows: m.rows, pageTop: m.pageTop });
  }
  await cell('C3').tap();
  await expect(page.getByLabel('Formula')).toHaveValue('=A1+B2');
  await expect(page.getByLabel('Selected cells')).toHaveText('C3');
  await expect(page).toHaveURL(/#\/v1\/sheet\/[ryz]/);
  const last = await measure();
  test.info().annotations.push({ type: 'measured', description: JSON.stringify({ first, last, seen }) });
  // The page stays where it was; the bar is one row, as tall as it started, and never over 56px; nothing is wider than the screen.
  expect(seen.map((s) => s.pageTop)).toEqual(taps.map(() => 0));
  expect(last.pageTop).toBe(0);
  expect(new Set([first.bar, last.bar, ...seen.map((s) => s.bar)]).size).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect([first.rows, last.rows, ...seen.map((s) => s.rows)]).toEqual([1, 1, ...taps.map(() => 1)]);
  expect(last.zoom).toBe(1);
  expect(last.wide).toBeLessThanOrEqual(0);
  // Every box a finger may land in is 16px or more, so Safari has no reason to zoom in.
  const smallInputs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('to-sheet-editor input')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => `${el.getAttribute('aria-label') ?? el.className}: ${getComputedStyle(el).fontSize}`));
  expect(smallInputs).toEqual([]);
  // A column's menu opens inside the screen and Escape closes it, focus back on the head.
  await page.getByRole('button', { name: /^Column C:/ }).tap();
  const menu = page.locator('.sheet-colmenu [role=menu]');
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', { name: /^Column C:/ })).toBeFocused();
  expect(errors).toEqual([]);
});
