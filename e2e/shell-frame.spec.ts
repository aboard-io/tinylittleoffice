/**
 * The document is the page (Paul, 2026-10-10): on a phone (WebKit, 390 by 844) the Word Processor's paper is as wide
 * as the screen with no border; the page never scrolls, the words scroll in a column (round eight, kit/chrome.ts) with
 * the header and the bar holding still, the bar at the column's bottom; a tap in the words hides the header, the menu
 * button floating at the top right; a tap on the title opens it wide, its automatic name chosen whole. On a desktop the
 * words keep the page's measure, and the editor has the window's width, not a column: a wide sheet is never cut off. Run
 * on its own:
 *
 *   PW_PORT=4436 npx playwright test e2e/shell-frame.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import { encodeDoc } from '../src/kit/codec.ts';

const LONG = `---\ntitle: Long\n---\n${Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page.`).join('\n\n')}\n`;

test('phone: the paper edge to edge, the column scrolls under the header and the bar, a tap in the words hides the header, the title opens wide', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`/#/v1/write/${encodeDoc(LONG)}`);
  const paper = page.locator('.write-page');
  await expect(paper).toBeVisible();
  const p = await paper.evaluate((el) => ({
    left: el.getBoundingClientRect().left,
    width: el.getBoundingClientRect().width,
    border: getComputedStyle(el).borderLeftWidth,
    radius: getComputedStyle(el).borderTopLeftRadius,
    shadow: getComputedStyle(el).boxShadow,
  }));
  expect(p.left).toBe(0);
  expect(p.width).toBe(390);
  expect(p.border).toBe('0px');
  expect(p.radius).toBe('0px');
  expect(p.shadow).toBe('none');
  // The words keep an inset of 16 of the stylesheet's pixels (a rem is the size of everything, kit/zoom.ts, × 16px).
  const unit = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
  const words = (await page.locator('.write-page .write-text').boundingBox())!;
  expect(Math.round(words.x / unit)).toBe(16);

  // The column scrolls, the window never: the header at the top, the bar at the column's bottom, both holding still.
  await page.locator('.to-main').evaluate((el) => (el.scrollTop = 1500));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [window.scrollY, document.querySelector('.to-main')!.scrollTop > 1000])).toEqual([0, true]);
  const header = (await page.locator('.to-header').boundingBox())!;
  expect(header.y).toBe(0);
  // While reading the bar is away under the column's foot (on a phone it comes with the focus, kit/chrome.ts indoc).
  expect(await page.locator('to-write-editor to-bar').evaluate((el) => (el as HTMLElement).inert)).toBe(true);
  const burger = page.locator('.to-burger');
  await expect(burger).toBeInViewport();
  const r = (await burger.boundingBox())!;
  expect(r.x + r.width).toBeGreaterThan(390 - 30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  // A tap in the words: the header steps aside, the menu button floats at the column's top right, the bar stays at the bottom.
  await page.locator('.write-page .write-text p').nth(30).tap();
  await expect(page.locator('to-chrome')).toHaveAttribute('editing', '');
  await expect(page.locator('.to-header')).toBeHidden();
  const b = (await burger.boundingBox())!;
  expect(b.y).toBeLessThan(20);
  expect(b.x + b.width).toBeGreaterThan(390 - 30);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const bar = page.locator('to-write-editor to-bar');
  await expect.poll(async () => Math.round((await bar.boundingBox())!.y + (await bar.boundingBox())!.height)).toBe(await page.evaluate(() => Math.round(window.visualViewport!.height)));
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(page.locator('.to-header')).toBeVisible();

  // A new document's title, tapped: the wide row, 20px, its name chosen whole so typing replaces it.
  await page.goto('/#/v1/write');
  await expect(page.locator('to-write-editor to-text .tx')).toBeVisible();
  await page.locator('.to-title').tap();
  await expect(page.locator('.to-header')).toHaveClass(/titling/);
  await page.waitForTimeout(300);
  const field = page.locator('.to-title');
  const f = (await field.boundingBox())!;
  // In the stylesheet's own pixels: on the screen a rem is the size of everything (kit/zoom.ts) × 16px.
  const scale = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
  expect(Math.round(f.height / scale)).toBe(44);
  expect(f.width).toBeGreaterThan(340);
  expect(
    await field.evaluate((el: HTMLInputElement) => [
      Math.round(parseFloat(getComputedStyle(el).fontSize) / (parseFloat(getComputedStyle(document.documentElement).fontSize) / 16)),
      el.value.slice(el.selectionStart!, el.selectionEnd!) === el.value,
    ]),
  ).toEqual([20, true]);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  await page.keyboard.type('Notes');
  await page.keyboard.press('Enter');
  await expect(page.locator('.to-header')).not.toHaveClass(/titling/);
  await expect(field).toHaveValue('Notes');
  expect(errors).toEqual([]);
});

test('desktop: no frame round the paper, and the words no wider than the page’s measure', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only');
  await page.goto(`/#/v1/write/${encodeDoc(LONG)}`);
  const paper = page.locator('.write-page');
  await expect(paper).toBeVisible();
  expect(await paper.evaluate((el) => [getComputedStyle(el).borderLeftWidth, getComputedStyle(el).boxShadow])).toEqual(['0px', 'none']);
  const words = (await page.locator('.write-page .write-text').boundingBox())!;
  const unit = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
  // A letter page is 816px with an inch (96px) each side: 624px of words, in the stylesheet's pixels.
  expect(words.width / unit).toBeLessThanOrEqual(624.5);
  expect(words.width / unit).toBeGreaterThan(600);
});

const WIDE = `---\ntitle: Wide\n---\n${['Month', 'Rent', 'Food', 'Travel', 'Phone', 'Gym', 'Books', 'Gifts', 'Savings', 'Total'].join(' | ')}\n${Array(10).fill('---').join(' | ')}\n${Array.from({ length: 10 }, (_, i) => String(i + 1)).join(' | ')}\n`;

test("desktop: a wide sheet at 1280 has the window's width, never a column, and the page does not scroll sideways", async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/#/v1/sheet/${encodeDoc(WIDE)}`);
  await expect(page.locator('to-sheet-editor')).toBeVisible();
  const m = await page.evaluate(() => {
    const main = document.querySelector('.to-main')!.getBoundingClientRect();
    return { main: [main.left, main.width], page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  // The editor's main is the window's width.
  expect(m.main).toEqual([0, 1280]);
  expect(m.page).toBeLessThanOrEqual(0);
});
