/**
 * The document is the page (Paul, 2026-10-10): on a phone (WebKit, 390 by 844) the Word Processor's paper is as wide
 * as the screen with no border, and a long document scrolled has its bar at the top, the header gone and the menu
 * button still there; a tap on the title opens it wide, its automatic name chosen whole. On a desktop the words keep
 * the page's measure. Run on its own:
 *
 *   PW_PORT=4433 npx playwright test e2e/shell-frame.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import { encodeDoc } from '../src/kit/codec.ts';

const LONG = `---\ntitle: Long\n---\n${Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}, long enough to take a line or two of the page.`).join('\n\n')}\n`;

test('phone: the paper edge to edge, the header scrolls away, the bar sticks, the title opens wide', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`/#/v1/write/${encodeDoc(LONG)}`);
  const paper = page.locator('.write-page');
  await expect(paper).toBeVisible();
  const p = await paper.evaluate((el) => ({ left: el.getBoundingClientRect().left, width: el.getBoundingClientRect().width, border: getComputedStyle(el).borderLeftWidth, radius: getComputedStyle(el).borderTopLeftRadius, shadow: getComputedStyle(el).boxShadow }));
  expect(p.left).toBe(0);
  expect(p.width).toBe(390);
  expect(p.border).toBe('0px');
  expect(p.radius).toBe('0px');
  expect(p.shadow).toBe('none');
  // The words keep an inset of 16px.
  const words = (await page.locator('.write-page .write-text').boundingBox())!;
  expect(Math.round(words.x)).toBe(16);

  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(page.locator('to-shell')).toHaveAttribute('scrolled', '');
  await page.waitForTimeout(300);
  const bar = (await page.locator('to-write-editor to-bar').boundingBox())!;
  expect(Math.round(bar.y)).toBe(0);
  const header = (await page.locator('.to-header').boundingBox())!;
  expect(header.y + header.height).toBeLessThanOrEqual(0);
  const burger = page.locator('.to-burger');
  await expect(burger).toBeInViewport();
  const b = (await burger.boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(bar.x).toBeGreaterThanOrEqual(b.x + b.width - 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  // A new document's title, tapped: the wide row, 20px, its name chosen whole so typing replaces it.
  await page.goto('/#/v1/write');
  await expect(page.locator('to-write-editor to-text .tx')).toBeVisible();
  await page.locator('.to-title').tap();
  await expect(page.locator('.to-header')).toHaveClass(/titling/);
  await page.waitForTimeout(300);
  const field = page.locator('.to-title');
  const f = (await field.boundingBox())!;
  expect(f.height).toBe(44);
  expect(f.width).toBeGreaterThan(340);
  expect(await field.evaluate((el: HTMLInputElement) => [getComputedStyle(el).fontSize, el.value.slice(el.selectionStart!, el.selectionEnd!) === el.value])).toEqual(['20px', true]);
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
  // A letter page is 816px with an inch (96px) each side: 624px of words.
  expect(words.width).toBeLessThanOrEqual(624.5);
  expect(words.width).toBeGreaterThan(600);
});
