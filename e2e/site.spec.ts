import { test, expect } from '@playwright/test';
import { shot } from './helpers.ts';

const TWO = 'theme: teal\n\n# Harbor Coffee\n\nRoasted on the quay.\n\n> Menu | #menu\n> Coffee | #coffee\n\n- :coffee: Daily | Fresh\n\n# Menu\n\nEspresso and buns.\n\n## Coffee\n\n- Espresso | 3.00';

// The page's own script switches its pages, which only a real browser runs. (The editor's side, the pages added,
// moved and taken away, and the download are in test/dom/pages.test.ts.)
test('a site of two pages: the nav switches pages, the preview keeps its place, a section link finds its page', async ({ page }) => {
  await page.goto('/#/v0/site');
  const area = page.getByRole('textbox', { name: 'Website, as text' });
  await area.fill(TWO);
  const site = page.frameLocator('to-site iframe');
  const nav = site.getByRole('navigation', { name: 'Pages' });
  await expect(site.locator('#home h1')).toHaveText('Harbor Coffee');
  await expect(site.locator('#menu')).toBeHidden();
  await nav.getByRole('link', { name: 'Menu' }).click();
  await expect(site.locator('#menu')).toBeVisible();
  await expect(site.locator('#home')).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Menu' })).toHaveAttribute('aria-current', 'page');
  await shot(page, 'site-page');
  // The text changes under it; the page drawn afresh is still on Menu.
  await area.fill(TWO + '\n- Flat white | 4.20');
  await expect(site.locator('#menu .cards li')).toHaveCount(2);
  await expect(site.locator('#home')).toBeHidden();
  // A section's link from the home page goes to the page that holds it.
  await nav.getByRole('link', { name: 'Home' }).click();
  await site.locator('#home').getByRole('link', { name: 'Coffee' }).click();
  await expect(site.locator('#menu')).toBeVisible();
});
