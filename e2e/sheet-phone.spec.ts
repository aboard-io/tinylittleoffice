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
      return { bar: Math.round(bar.getBoundingClientRect().height / (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16)), rows: tops.size, pageTop: document.scrollingElement!.scrollTop, zoom: window.visualViewport?.scale ?? 1, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
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

test('sheet: under a finger, a tap selects a cell whole, heads and row numbers are 44px, a checkbox ticks, a block has its bar, Undo is in the bar', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await cell('A1').tap();
  await cell('A1').fill('Rent');
  await cell('B1').tap();
  await cell('A1').tap();
  // The tap selected the words, so typing replaces them.
  await page.keyboard.type('Food');
  await expect(cell('A1')).toHaveValue('Food');
  const sizes = await page.evaluate(() => {
    const h = (sel: string) => document.querySelector<HTMLElement>(sel)!.getBoundingClientRect().height;
    const fill = document.querySelector<HTMLElement>('table.sheet td .fill')!;
    const hit = getComputedStyle(fill, '::before');
    return { head: h('table.sheet .col-head'), row: h('table.sheet .row-num'), fill: fill.getBoundingClientRect().width - 2 * parseFloat(hit.left), touch: getComputedStyle(document.querySelector('table.sheet td input')!).touchAction };
  });
  expect(sizes.head).toBeGreaterThanOrEqual(44);
  expect(sizes.row).toBeGreaterThanOrEqual(44);
  expect(sizes.fill).toBeGreaterThanOrEqual(44);
  expect(sizes.touch).toBe('manipulation');
  // A block (a row number selects its row): the bar comes up with Copy, Cut, Paste and Clear, inside the screen.
  await page.getByRole('button', { name: 'Row 1: insert or delete rows' }).tap();
  await page.keyboard.press('Escape');
  const bar = page.locator('.sheet-context .to-context');
  await expect(bar).toBeVisible();
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await bar.getByRole('button', { name: 'Clear these cells' }).tap();
  await expect(cell('A1')).toHaveValue('');
  // Undo from the bar brings it back.
  await page.locator('to-bar.sheet-bar').getByRole('button', { name: 'Undo' }).tap();
  await expect(cell('A1')).toHaveValue('Food');
  // Column C holds checkboxes: a tap on C1 ticks it, and no keyboard comes up (the focus stays off the cell).
  await page.getByRole('button', { name: /^Column C:/ }).tap();
  await page.locator('.sheet-colmenu [role=menu]').getByText('Checkbox', { exact: true }).tap();
  await page.getByRole('button', { name: 'Tick C1', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Tick C1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(cell('C1')).not.toBeFocused();
  expect(errors).toEqual([]);
});

test('sheet: on a phone, the row numbers are a narrow quiet side, a checkbox is a big box a tap ticks, an option cell has a caret that opens its words', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await expect(cell('A1')).toBeVisible();
  // The side: as wide as two digits and 8px, unshaded and unruled; the heads 44px for the finger and as quiet.
  const look = await page.evaluate(() => {
    const th = document.querySelector<HTMLElement>('table.sheet th.row')!;
    const head = document.querySelector<HTMLElement>('table.sheet thead tr:first-child th')!;
    const surface = getComputedStyle(document.querySelector('.sheet-scroll')!).backgroundColor;
    const quiet = (el: HTMLElement) => getComputedStyle(el).backgroundColor === surface && getComputedStyle(el).borderRightWidth === '0px' && getComputedStyle(el).borderBottomWidth === '0px';
    return { side: th.getBoundingClientRect().width, head: document.querySelector<HTMLElement>('table.sheet .col-head')!.getBoundingClientRect().height, quiet: quiet(th) && quiet(head) };
  });
  expect(look.side).toBeLessThanOrEqual(30);
  expect(look.head).toBeGreaterThanOrEqual(44);
  expect(look.quiet).toBe(true);
  // Column B holds checkboxes: a 24px box in a cell a finger can hit, ticked by a tap, no keyboard coming up.
  await page.getByRole('button', { name: /^Column B:/ }).tap();
  await page.locator('.sheet-colmenu [role=menu]').getByText('Checkbox', { exact: true }).tap();
  const tick = page.getByRole('button', { name: 'Tick B1', exact: true });
  expect((await tick.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const box = (await tick.locator('.box').boundingBox())!;
  expect([box.width, box.height]).toEqual([24, 24]);
  await tick.tap();
  await expect(tick).toHaveAttribute('aria-pressed', 'true');
  await expect(cell('B1')).not.toBeFocused();
  // Column C holds options: what it holds is offered, and the caret on a cell takes the finger to it.
  await page.getByRole('button', { name: /^Column C:/ }).tap();
  await page.locator('.sheet-colmenu [role=menu]').getByText('Option', { exact: true }).tap();
  // (An input with a list of words is a combo box.)
  const option = (ref: string) => page.getByRole('combobox', { name: ref, exact: true });
  await option('C1').tap();
  await option('C1').fill('GOOD');
  await option('C2').tap();
  await option('C2').fill('BAD');
  const caret = page.getByRole('button', { name: 'Choices for C3', exact: true });
  expect((await caret.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await caret.tap();
  await expect(option('C3')).toBeFocused();
  const offered = await option('C3').evaluate((el) => [...(el as HTMLInputElement).list!.options].map((o) => o.value));
  expect(offered).toEqual(['GOOD', 'BAD']);
  expect(errors).toEqual([]);
});

test('sheet: on a phone, Money asks its currency in a dialog inside the screen, its field 16px; the cells show it', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/sheet');
  const cell = (ref: string) => page.getByRole('textbox', { name: ref, exact: true });
  await cell('B1').tap();
  await cell('B1').fill('1200');
  await cell('A1').tap();
  await page.getByRole('button', { name: /^Column B:/ }).tap();
  await page.locator('.sheet-colmenu [role=menu]').getByText('Money', { exact: true }).tap();
  const field = page.getByRole('combobox', { name: 'Currency' });
  await expect(field).toBeVisible();
  const box = (await page.locator('.to-currency-dialog dialog').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await field.fill('£');
  await page.getByRole('button', { name: 'OK' }).tap();
  await expect(field).toBeHidden();
  await expect(cell('B1')).toHaveValue('£1,200.00');
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  expect(errors).toEqual([]);
});
