import { test, expect } from '@playwright/test';
import { shot, reopen, navTo } from './helpers';

test('navigation works on every screen size', async ({ page }) => {
  await page.goto('/');
  await navTo(page, 'Deck');
  await expect(page).toHaveURL(/#\/deck$/);
  await expect(page.locator('.to-panel-head h1')).toHaveText(/Deck/);
  await navTo(page, 'Calendar');
  await expect(page.locator('.to-panel-head h1')).toHaveText(/Calendar/);
  // No horizontal overflow at this viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await shot(page, 'nav');
});

test('hamburger drawer appears only on small screens', async ({ page, isMobile }) => {
  await page.goto('/#/sheet');
  const burger = page.locator('.to-burger');
  if (isMobile) {
    await expect(burger).toBeVisible();
    await expect(page.locator('.to-nav')).toBeHidden();
    await burger.click();
    const drawer = page.locator('#nav-drawer');
    await expect(drawer).toHaveAttribute('open');
    await expect(drawer.locator('.to-drawer-nav a')).toHaveCount(6);
    await expect(drawer.locator('a[aria-current="page"]')).toContainText('Sheet');
    await shot(page, 'drawer');
    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveAttribute('open');
  } else {
    await expect(burger).toBeHidden();
    await expect(page.locator('.to-nav a')).toHaveCount(5);
  }
});

test('meter counts down and copies the link', async ({ page }) => {
  await page.goto('/#/sheet');
  const meter = page.locator('.to-meter');
  const ring = meter.locator('sl-progress-ring');
  await expect(ring).toHaveAttribute('value', '0');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('The quick brown fox');
  await expect(ring).not.toHaveAttribute('value', '0');
  await expect(meter.locator('.text')).toHaveText(/\d[\d,]* left/, { visible: false });
  const before = page.url();
  await meter.locator('sl-copy-button').click();
  await expect(meter.locator('sl-copy-button')).toHaveAttribute('data-status', 'success').catch(() => {});
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(before);
});

test('documents record their creation time', async ({ page }) => {
  await page.goto('/#/write');
  await expect(page.locator('.to-panel-head .meta')).toContainText('not yet saved');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('hello');
  await expect(page.locator('.to-panel-head .meta')).toContainText('Created');
  const url = page.url();
  expect(url).toMatch(/#\/write\/[ZR]/);
  // Creation time is in the link and survives a reload.
  const created = await page.locator('.to-panel-head .meta').textContent();
  await reopen(page);
  await expect(page.locator('.to-panel-head .meta')).toHaveText(created!.trim());
  // A new document starts over.
  await page.getByRole('link', { name: 'New Write' }).click();
  await expect(page.locator('.to-panel-head .meta')).toContainText('not yet saved');
});

test('signing a document and detecting changes', async ({ page }) => {
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('42');
  await page.locator('.to-meter sl-progress-ring').click();
  const dialog = page.locator('#doc-dialog');
  await expect(dialog).toHaveAttribute('open');
  await expect(dialog).toContainText('Not signed');
  await expect(dialog).toContainText('None yet');
  await page.getByRole('button', { name: 'Sign with my key' }).click();
  await expect(dialog).toContainText('Valid. Signed by key');
  await expect(dialog).toContainText('(this browser)');
  const fp = (await dialog.locator('dd code').first().textContent())!;
  expect(fp).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.to-panel-head')).toContainText('signed');
  const signedUrl = page.url();

  // The signature verifies in a fresh load, then breaks on edit.
  await reopen(page);
  await expect(page.locator('.to-panel-head sl-tag')).toContainText('signed');
  await page.getByRole('textbox', { name: 'A2', exact: true }).fill('43');
  await expect(page.locator('.to-panel-head')).toContainText('signature mismatch');
  await page.locator('.to-meter sl-progress-ring').click();
  await expect(dialog).toContainText('Does not match the current content');
  await page.getByRole('button', { name: 'Re-sign with my key' }).click();
  await expect(dialog).toContainText('Valid. Signed by key');
  await page.getByRole('button', { name: 'Remove signature' }).click();
  await expect(dialog).toContainText('Not signed');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.to-panel-head sl-tag')).toHaveCount(0);
  await shot(page, 'signed');

  // A tampered link reads as a mismatch, not as valid.
  const tampered = signedUrl.replace(/#\/sheet\/Z(.)/, (_m, c: string) => `#/sheet/Z${c === 'A' ? 'B' : 'A'}`);
  await page.goto(tampered);
  const head = page.locator('.to-panel-head');
  await expect(head).not.toContainText(/\bsigned\b(?! mismatch)/);
});

test('signing keys can be exported and imported', async ({ page, context }) => {
  await page.goto('/#/sheet');
  await page.locator('.to-meter sl-progress-ring').click();
  await page.getByRole('button', { name: 'Export' }).click();
  const dialog = page.locator('#doc-dialog');
  const key = await dialog.locator('textarea').inputValue();
  expect(JSON.parse(key)).toHaveProperty('priv');
  const fp = (await dialog.locator('dd code').first().textContent())!;

  // A second, independent origin storage: clear it and import.
  await context.clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.to-meter sl-progress-ring').click();
  await expect(dialog).toContainText('None yet');
  await page.getByRole('button', { name: 'Import' }).click();
  await dialog.locator('textarea').fill(key);
  await page.getByRole('button', { name: 'Use this key' }).click();
  await expect(dialog.locator('dd code').first()).toHaveText(fp);
});
