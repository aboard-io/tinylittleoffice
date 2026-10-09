/**
 * Website on the built site, at desktop size in Chromium and at iPhone size in WebKit: the first words typed
 * are the site's name and the page in the frame shows them; the "+" in the page adds a page, whose heading is
 * typed over beside it; the page's own nav then switches to it. The bar is one row, nothing is wider than the
 * screen, axe finds nothing. Run on its own:
 *
 *   PW_PORT=4195 npx playwright test e2e/site.spec.ts --workers=1
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('website: the name typed, a page added from the "+" in the page, the nav goes to it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/site');
  const words = page.locator('to-site-editor to-text.site-text .tx');
  await expect(words).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-site-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { rows: tops.size, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  expect(await measure()).toEqual({ rows: 1, wide: 0 });
  await words.click();
  await words.pressSequentially('Harbor Coffee');
  await expect(page).toHaveURL(/#\/v1\/site\/[ryz]/);
  const site = page.frameLocator('to-site-editor iframe.site-frame');
  await expect(site.locator('#home h1')).toHaveText('Harbor Coffee');
  await site.getByRole('button', { name: 'Add to Harbor Coffee' }).click();
  await site.getByRole('menuitem', { name: 'Page' }).click();
  // The new page's heading is selected beside the frame: typing replaces it.
  await expect(page.locator('to-site-editor select.site-part')).toHaveValue('1');
  await page.keyboard.type('Menu');
  await expect(site.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Menu' })).toBeVisible();
  await site.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Home' }).click();
  await expect(site.locator('#home')).toBeVisible();
  await site.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Menu' }).click();
  await expect(site.locator('#menu')).toBeVisible();
  await expect(site.locator('#home')).toBeHidden();
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).include('to-site-editor').disableRules(['meta-viewport']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
