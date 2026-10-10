/**
 * Website on the built site, at desktop size in Chromium: the page is the editor. One tap on the blank site's
 * heading opens its form at once, the heading's bar under it, and the name typed there is the site's; Insert ▾ makes a
 * page through its form, then a button; the page's own nav goes between the pages; Preview shows it as a visitor
 * has it and Edit comes back. The bar is one row, nothing is wider than the screen, axe finds nothing. Run on its own:
 *
 *   PW_PORT=4404 npx playwright test e2e/site.spec.ts --project=desktop --workers=1
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('website: the name in its form, a page and a button from Insert, the nav goes to it, Preview and back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/site');
  const site = page.frameLocator('to-site-editor iframe.site-frame');
  const name = site.getByRole('heading', { name: 'My site', level: 1 });
  await expect(name).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-site-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { rows: tops.size, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  expect(await measure()).toEqual({ rows: 1, wide: 0 });
  // One tap opens the heading's form, the heading in hand, its bar under the form.
  await name.click();
  const form = page.locator('.site-form-dialog dialog');
  await expect(form).toBeVisible();
  await expect(form.locator('to-context.site-context .to-context')).toBeVisible();
  await page.keyboard.type('Harbor Coffee');
  await page.keyboard.press('Enter');
  await expect(form).toHaveCount(0);
  await expect(page).toHaveURL(/#\/v1\/site\/[ryz]/);
  await expect(site.getByRole('heading', { name: 'Harbor Coffee', level: 1 })).toBeVisible();
  // Insert ▾, at the top left: a page, named in its form.
  const insert = page.locator('to-site-editor to-insert button').first();
  const at = await insert.boundingBox();
  const frameBox = await page.locator('to-site-editor iframe.site-frame').boundingBox();
  expect(at!.x).toBeLessThanOrEqual(frameBox!.x + 8);
  expect(at!.y).toBeLessThan(frameBox!.y);
  await insert.click();
  await page.getByRole('menuitem', { name: 'Page' }).click();
  await expect(form).toBeVisible();
  await page.keyboard.type('Menu');
  await page.keyboard.press('Enter');
  const nav = site.getByRole('navigation', { name: 'Pages' });
  await expect(nav.getByRole('link', { name: 'Menu' })).toBeVisible();
  // A button after the new page's heading: its words and where it goes.
  await insert.click();
  await page.getByRole('menuitem', { name: 'Button' }).click();
  await expect(form).toBeVisible();
  await page.keyboard.type('Call us');
  await form.getByLabel('Goes to').fill('tel:+12075550134');
  await form.getByRole('button', { name: 'Done' }).click();
  await expect(site.getByRole('link', { name: 'Call us' })).toBeVisible();
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
