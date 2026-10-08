import { test } from '@playwright/test';
test('debug', async ({ page }) => {
  page.on('console', (m) => m.text().startsWith('LFDBG') && console.log(m.text()));
  page.on('framenavigated', (f) => f !== page.mainFrame() && console.log('LFDBG framenav'));
  await page.goto('/#/site');
  await page.getByRole('textbox', { name: 'Website, as text' }).fill('# Harbor Coffee\nRoasted on the quay.\n=== Menu\nEspresso.\n=== Visit\nQuay Street.');
  await page.getByRole('button', { name: 'Edit as a form' }).click();
  const site = page.frameLocator('to-site iframe');
  await site.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Menu' }).click();
  await page.waitForTimeout(300);
  console.log('LFDBG --- add');
  await site.getByRole('button', { name: '+ Page' }).click();
  await page.waitForTimeout(800);
});
