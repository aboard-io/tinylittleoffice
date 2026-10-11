/**
 * The smoke run on the built site, at desktop size in Chromium and at iPhone size (390 by 844) in WebKit:
 * the home page loads, the Word Processor opens from it (named at once), its Display Link reads, nothing throws, nothing is wider than the screen, and
 * axe finds nothing. With SHOTS set, a screenshot of each goes there (the phone's are the report's).
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SHOTS = process.env.SHOTS;
async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()!.width}.png`, fullPage: false });
}
// theme.js tells iOS alone that the page may not zoom, so a tap in a box no longer zooms and sticks (iOS still
// lets a person pinch); axe's meta-viewport rule cannot know that, so it is left out of the phone's run.
const axe = (page: Page) => new AxeBuilder({ page }).disableRules(['meta-viewport']).analyze();
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('home loads, the Word Processor opens, nothing throws, axe passes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/');
  await expect(page.locator('.to-app-name').first()).toHaveText('Word Processor');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'home');
  expect((await axe(page)).violations).toEqual([]);

  await page.locator('.to-app-open').first().click();
  await expect(page).toHaveURL(/#\/v1\/write$/);
  const area = page.locator('to-write-editor to-text .tx');
  await expect(area).toBeVisible();
  await area.click();
  await page.keyboard.type('A line written on the phone.');
  await expect(page).toHaveURL(/#\/v1\/write\/[ryz]/);
  await expect(area.locator('p')).toHaveText('A line written on the phone.');
  // Done (the keyboard's, on a phone): the words let go, and the header, which steps aside on a phone while they have
  // the focus (kit/chrome.ts), is back.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  // A new document has its name from the start: "New Document <today> #1".
  await expect(page.locator('.to-title')).toHaveValue(/^New Document \d{4}-\d{2}-\d{2} #1$/);
  await page.locator('.to-title').fill('Hello');
  await page.locator('.to-title').press('Enter');
  await expect(page).toHaveTitle('Hello · Tiny Little Office');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'write');
  expect((await axe(page)).violations).toEqual([]);

  // The Insert menu opens inside the screen and Escape closes it. On a phone the bar comes with the focus
  // (kit/chrome.ts indoc; responsive.css; while reading it is away, and inert), so the words are tapped first.
  await area.click();
  await page.getByRole('button', { name: 'Insert' }).click();
  await expect(page.locator('to-insert [role=menu]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('to-insert [role=menu]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Insert' })).toBeFocused();

  // The Display Link: the pages to read, no editor, nothing wider than the screen; a tap on Edit goes back.
  const editing = page.url();
  await page.goto(`${editing}?d`);
  await page.reload();
  await expect(page.locator('.to-display-page svg')).toBeVisible();
  await expect(page.locator('to-write-editor')).toHaveCount(0);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'display');
  expect((await axe(page)).violations).toEqual([]);
  await page.locator('.to-display-edit').click();
  await expect(area).toBeVisible();
  await expect(area.locator('p')).toHaveText('A line written on the phone.');

  // The drawer opens; the Theme select turns the page dark.
  await page.locator('.to-burger').click();
  await expect(page.locator('dialog.to-drawer')).toBeVisible();
  await shot(page, 'drawer');
  await page.locator('.to-drawer select').nth(1).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape');
  await shot(page, 'write-dark');
  expect(errors).toEqual([]);
});

test('a link that leaves the site asks first, in a dialog inside the screen', async ({ page }) => {
  // "Read [the report](https://reports.example/q3) today.", as its link (the codec's raw form: "r" and base64url).
  await page.goto(`/#/v1/write/r${Buffer.from('Read [the report](https://reports.example/q3) today.\n').toString('base64url')}`);
  const link = page.locator('to-write-editor to-text .tx a').first();
  await expect(link).toBeVisible();
  await link.click();
  await page.getByRole('button', { name: 'Open link' }).click();
  const dialog = page.locator('to-dialog.to-link-guard dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.lg-host')).toHaveText('reports.example');
  await expect(dialog.locator('.lg-cancel')).toBeFocused();
  const box = (await dialog.locator('.to-dialog-inner').boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await shot(page, 'link-guard');
  expect((await axe(page)).violations).toEqual([]);
  await dialog.locator('.lg-cancel').click();
  await expect(dialog).toHaveCount(0);
});

test('the person’s own size is the 100%: a browser set to 20px type draws a rem at 20 × 1.3, and the nav at its own share of it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'the default size is set through Chromium');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 13 } });
  await page.goto('/');
  await expect(page.locator('.to-app-name').first()).toHaveText('Word Processor');
  const px = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  // kit/zoom.ts BASE: the normal size draws everything at 1.3 of the browser's default.
  expect(await px('html')).toBeCloseTo(26, 1);
  expect(await px('.to-header')).toBeCloseTo(26, 1);
});
