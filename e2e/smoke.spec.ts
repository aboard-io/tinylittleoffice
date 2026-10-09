/**
 * The smoke run on the built site, at desktop size in Chromium and at iPhone size (390 by 844) in WebKit:
 * the home page loads, the Text app opens from it, nothing throws, nothing is wider than the screen, and
 * axe finds nothing. With SHOTS set, a screenshot of each goes there (the phone's are the report's).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SHOTS = process.env.SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()!.width}.png`, fullPage: false });
}
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('home loads, the Text app opens, nothing throws, axe passes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page.locator('.to-tile b')).toHaveText('Text');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'home');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.locator('.to-tile-open').click();
  await expect(page).toHaveURL(/#\/v1\/text$/);
  const area = page.locator('to-text-editor textarea');
  await expect(area).toBeVisible();
  await area.fill('# Hello\n\nA line written on the phone.');
  await expect(page).toHaveURL(/#\/v1\/text\/[ryz]/);
  await page.locator('.to-title').fill('Hello');
  await page.locator('.to-title').press('Enter');
  await expect(page).toHaveTitle('Hello · TinyLittleOffice');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'text');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  // The Insert menu opens inside the screen and Escape closes it.
  await page.locator('to-insert button').click();
  await expect(page.locator('to-insert [role=menu]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('to-insert [role=menu]')).toBeHidden();
  await expect(page.locator('to-insert button')).toBeFocused();

  // The drawer opens; the Theme select turns the page dark.
  await page.locator('.to-burger').click();
  await expect(page.locator('dialog.to-drawer')).toBeVisible();
  await shot(page, 'drawer');
  await page.locator('.to-drawer select').nth(1).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape');
  await shot(page, 'text-dark');
  expect(errors).toEqual([]);
});
