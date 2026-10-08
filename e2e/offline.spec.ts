import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('once opened, everything works with no connection', async ({ page, context }) => {
  await page.goto('/');
  // The service worker fetches the whole build, then takes over.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  // A cold start, offline: the home page, then apps never opened before, each with code of its own.
  await page.reload();
  await expect(page.locator('.to-launcher').first()).toBeVisible();
  await page.goto('/zine/');
  await expect(page.locator('to-zine .deck-thumb')).toHaveCount(8);
  await page.getByRole('textbox', { name: 'Headline' }).fill('Made underground');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/zine\/[yzr]/);
  await page.goto('/#/v0/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('=1+2');
  await page.getByRole('textbox', { name: 'B1', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'A1', exact: true })).toHaveValue('3');
  // The icon library is one of the things brought along.
  await page.goto('/#/v0/draw');
  await page.getByRole('button', { name: 'Icon', exact: true }).click();
  await page.locator('sl-dialog.to-icons sl-input input').fill('accessib');
  await expect(page.locator('sl-dialog.to-icons').getByRole('button', { name: 'accessibility', exact: true })).toBeVisible();
  // And the fonts.
  expect(await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check('16px "IBM Plex Sans"')))).toBe(true);
  await context.setOffline(false);
});
