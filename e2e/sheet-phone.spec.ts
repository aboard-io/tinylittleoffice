/**
 * Stays: whether a tap scrolls the page, and how tall the bar is, are real
 * layout on a real phone engine. One of the phone checks, not the deploy
 * gate (scripts/deploy.mjs runs smoke and header); run on its own:
 *
 *   npx playwright test e2e/sheet-phone.spec.ts --project=mobile --workers=1
 */
import { test, expect, devices } from '@playwright/test';
import { shot, blank } from './helpers';

// Paul's phone is an iPhone in Safari: WebKit, 390 by 844, a finger for a pointer.
// (WebKit knows no clipboard permission; the config asks for one for Chromium's sake.)
test.use({ ...devices['iPhone 13'], browserName: 'webkit', permissions: [] });

test('sheet: on a phone, tapping cells neither scrolls the page nor moves the bar, which is one row', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone only');
  await page.goto('/#/v0/sheet');
  await blank(page);
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await expect(cell('A1')).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-sheet .to-toolbar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { bar: bar.offsetHeight, rows: tops.size, scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth, pageTop: document.scrollingElement!.scrollTop, zoom: window.visualViewport?.scale ?? 1 };
    });
  const first = await measure();
  await shot(page, 'sheet-phone-blank');
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
  await shot(page, 'sheet-phone-cells');
  const last = await measure();
  test.info().annotations.push({ type: 'measured', description: JSON.stringify({ first, last, seen }) });
  // The page stays where it was; the bar is one row, as tall as it started, and never over 56px; it may scroll sideways.
  expect(seen.map((s) => s.pageTop)).toEqual(taps.map(() => 0));
  expect(last.pageTop).toBe(0);
  expect(new Set([first.bar, last.bar, ...seen.map((s) => s.bar)]).size).toBe(1);
  expect(first.bar).toBeLessThanOrEqual(56);
  expect([first.rows, last.rows, ...seen.map((s) => s.rows)]).toEqual([1, 1, ...taps.map(() => 1)]);
  expect(last.zoom).toBe(1);
  // Every box a finger may land in is 16px or more, so Safari has no reason to zoom in.
  const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('to-sheet input, to-sheet textarea')].filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16).map((el) => `${el.getAttribute('aria-label') ?? el.className}: ${getComputedStyle(el).fontSize}`));
  expect(small).toEqual([]);
});
