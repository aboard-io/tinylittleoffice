import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('kept on the device from the menu, everything works with no connection', async ({ page, context }) => {
  await page.goto('/');
  // Nothing is kept until asked: the switch in the menu registers the worker, which fetches the whole build, then takes over.
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))).toBe(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  const kept = page.locator('sl-switch.to-offline');
  await expect(page.getByRole('switch', { name: 'Keep the app on this device' })).not.toBeChecked();
  await kept.click();
  await expect(page.locator('sl-switch.to-offline')).toHaveAttribute('help-text', /^Ready to work offline · \d+\.\d MB$/, { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.keyboard.press('Escape');
  await context.setOffline(true);
  // A cold start, offline: the home page, then apps never opened before, each with code of its own.
  await page.reload();
  await expect(page.locator('.to-launcher').first()).toBeVisible();
  await page.goto('/zine/');
  await expect(page.locator('to-zine .deck-thumb')).toHaveCount(8);
  await page.getByRole('textbox', { name: 'Headline' }).fill('Made underground');
  await expect.poll(() => page.url()).toMatch(/#\/v0\/zine\/[yzr]/);
  await page.goto('/#/v0/sheet');
  // (A blank sheet offers its templates first.)
  await page.getByRole('button', { name: 'Blank: an empty page' }).click();
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
  // The switch is remembered; off again, the worker and its cache go.
  await page.locator('sl-dialog.to-icons').getByRole('button', { name: 'accessibility', exact: true }).click();
  await expect(page.locator('sl-dialog.to-icons')).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('switch', { name: 'Keep the app on this device' })).toBeChecked();
  await kept.click();
  await expect(page.locator('sl-switch.to-offline')).toHaveAttribute('help-text', 'Not kept');
  expect(await page.evaluate(async () => [(await navigator.serviceWorker.getRegistrations()).length, (await caches.keys()).length])).toEqual([0, 0]);
});
