/**
 * Website on the built site, at desktop size in Chromium: the page is the editor. A blank site opens with its
 * heading's words open there, in the page, and the name typed is the site's; Insert ▾ makes a page, its words
 * typed where they are, then a button, where it goes from the URL chip on its bar; the page's own nav goes between
 * the pages; Preview shows it as a visitor has it and Edit comes back. The bar is one row, nothing is wider than the
 * screen, axe finds nothing. Run on its own:
 *
 *   PW_PORT=4404 npx playwright test e2e/site.spec.ts --project=desktop --workers=1
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('website: the name typed in the page, a page and a button from Insert, the nav goes to it, Preview and back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/site');
  const site = page.frameLocator('to-site-editor iframe.site-frame');
  const words = site.locator('h1 to-text .tx');
  await expect(words).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-site-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { rows: tops.size, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  expect(await measure()).toEqual({ rows: 1, wide: 0 });
  // A new site opens with its name's words open in the page (docs/editing.md §1), the heading in hand, its bar beside it; no form.
  await expect(words).toBeFocused();
  await expect(page.locator('to-site-editor to-context.site-context .to-context')).toBeVisible();
  await expect(page.locator('.site-form-dialog')).toHaveCount(0);
  await page.keyboard.type('Harbor Coffee');
  await expect(page).toHaveURL(/#\/v1\/site\/[ryz]/);
  // A tap on the page's foot keeps the words, and the page is drawn with them.
  await site.locator('footer').click();
  await expect(site.getByRole('heading', { name: 'Harbor Coffee', level: 1 })).toBeVisible();
  await expect(site.locator('to-text:not([hidden])')).toHaveCount(0);
  // Insert ▾, at the top left: a page, its words offered; tapped, they are typed where they are.
  const insert = page.locator('to-site-editor to-insert button').first();
  const at = await insert.boundingBox();
  const frameBox = await page.locator('to-site-editor iframe.site-frame').boundingBox();
  expect(at!.x).toBeLessThanOrEqual(frameBox!.x + 8);
  expect(at!.y).toBeLessThan(frameBox!.y);
  await insert.click();
  await page.getByRole('menuitem', { name: 'Page' }).click();
  const fresh = site.getByRole('heading', { name: 'New page', level: 1 });
  await expect(fresh).toBeVisible();
  await fresh.click();
  await expect(site.locator('h1 to-text .tx')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Menu');
  await site.locator('footer').click();
  const nav = site.getByRole('navigation', { name: 'Pages' });
  await expect(nav.getByRole('link', { name: 'Menu' })).toBeVisible();
  // A button after the new page's heading: its words typed on it, where it goes from the URL chip.
  await site.getByRole('heading', { name: 'Menu', level: 1 }).click();
  await insert.click();
  await page.getByRole('menuitem', { name: 'Button' }).click();
  const button = site.getByRole('link', { name: 'Button' });
  await expect(button).toBeVisible();
  await button.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('Call us');
  const bar = page.locator('to-site-editor to-context.site-context .to-context');
  await bar.getByRole('button', { name: 'Where it goes' }).click();
  const form = page.locator('.site-form-dialog dialog');
  await expect(form).toBeVisible();
  await form.getByLabel('Goes to').fill('tel:+12075550134');
  await form.getByRole('button', { name: 'Done' }).click();
  await expect(site.getByRole('link', { name: 'Call us' })).toHaveAttribute('href', 'tel:+12075550134');
  await nav.getByRole('link', { name: 'Home' }).click();
  await expect(site.getByRole('heading', { name: 'Harbor Coffee', level: 1 })).toBeVisible();
  await expect(site.getByRole('link', { name: 'Call us' })).toBeHidden();
  // Preview: the page as a visitor has it; Edit comes back.
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
  await expect(site.locator('[data-o]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(site.locator('[data-o]').first()).toBeAttached();
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).include('to-site-editor').disableRules(['meta-viewport']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
