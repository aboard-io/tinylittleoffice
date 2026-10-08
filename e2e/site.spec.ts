import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './helpers.ts';

const TWO = '# Harbor Coffee\nRoasted on the quay.\ntheme: teal\n> Menu | #menu\n- :coffee Daily | Fresh\n=== Menu\nEspresso and buns.\n## Coffee\n- Espresso | 3.00';

test('a site of two pages: the preview switches pages, keeps its place, and the download is the same file', async ({ page }) => {
  await page.goto('/#/site');
  const area = page.getByRole('textbox', { name: 'Website, as text' });
  await area.fill(TWO);
  const site = page.frameLocator('to-site iframe');
  const nav = site.getByRole('navigation', { name: 'Pages' });
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Menu']);
  await expect(site.locator('#home h1')).toHaveText('Harbor Coffee');
  await expect(site.locator('#menu')).toBeHidden();
  // The nav switches pages: Menu is on show, home is not, and the nav says so.
  await nav.getByRole('link', { name: 'Menu' }).click();
  await expect(site.locator('#menu')).toBeVisible();
  await expect(site.locator('#home')).toBeHidden();
  await expect(nav.getByRole('link', { name: 'Menu' })).toHaveAttribute('aria-current', 'page');
  await expect(site.locator('#menu h2')).toHaveText('Coffee');
  await shot(page, 'site-page');
  // The text changes under it; the page drawn afresh is still on Menu.
  await area.fill(TWO + '\n- Flat white | 4.20');
  await expect(site.locator('#menu .cards li')).toHaveCount(2);
  await expect(site.locator('#home')).toBeHidden();
  // A section's link from the home page goes to the page that holds it.
  await area.fill(TWO + '\n- Flat white | 4.20\n> Coffee | #coffee');
  await site.locator('#home').getByRole('link', { name: 'Coffee' }).click();
  await expect(site.locator('#menu')).toBeVisible();
  // What downloads is the whole site, one file, without the editor's own script.
  await page.getByRole('button', { name: 'Download' }).click();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Web page/ }).click()]);
  const html = readFileSync(await file.path(), 'utf8');
  expect(file.suggestedFilename()).toBe('harbor-coffee.html');
  expect(html).toContain('<section class="page" id="home">');
  expect(html).toContain('<section class="page" id="menu">');
  expect(html).toContain('<nav aria-label="Pages"><a href="#home">Home</a><a href="#menu">Menu</a></nav>');
  expect(html).toContain('--a:#0f766e');
  expect(html).not.toContain('lf-at');
  expect(html.match(/<script>/g)).toHaveLength(1);
});

test('on the picture: a page is added after the one on show, named, moved, and taken away', async ({ page }) => {
  await page.goto('/#/site');
  await page.getByRole('textbox', { name: 'Website, as text' }).fill('# Harbor Coffee\nRoasted on the quay.\n=== Menu\nEspresso.\n=== Visit\nQuay Street.');
  await page.getByRole('button', { name: 'Edit as a form' }).click();
  const site = page.frameLocator('to-site iframe');
  const nav = site.getByRole('navigation', { name: 'Pages' });
  await nav.getByRole('link', { name: 'Menu' }).click();
  await expect(site.locator('#menu')).toBeVisible();
  // A new page follows the one on show, and is on show itself with its title ready to type over.
  await site.getByRole('button', { name: '+ Page' }).click();
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Menu', 'Title', 'Visit']);
  await expect(site.locator('#title')).toBeVisible();
  await expect(site.getByRole('textbox', { name: 'Title, row 4' })).toBeFocused();
  await page.keyboard.type('Hours');
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Menu', 'Hours', 'Visit']);
  await expect(site.locator('#hours')).toBeVisible();
  await shot(page, 'site-edit');
  // The page on show can be moved past its neighbour, and taken away with everything in it.
  await site.getByRole('button', { name: 'Page later' }).click();
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Menu', 'Visit', 'Hours']);
  await expect(site.locator('#hours')).toBeVisible();
  await site.getByRole('button', { name: 'Page earlier' }).click();
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Menu', 'Hours', 'Visit']);
  await site.getByRole('button', { name: 'Remove page' }).click();
  await expect(nav.getByRole('link')).toHaveText(['Home', 'Menu', 'Visit']);
  await expect(site.locator('#home')).toBeVisible();
  // The list beside shows the same: a page, with the lines under it one in.
  await expect(page.locator('to-lines .lf-row.head')).toHaveCount(3);
});
