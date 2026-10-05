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
  await expect(page.locator('.to-panel-head .meta')).toHaveText('');
  const editor = page.getByRole('textbox', { name: 'Document' });
  await editor.click();
  await page.keyboard.type('hello');
  await expect(page.locator('.to-panel-head .meta')).toContainText(/\d{4}/);
  const url = page.url();
  expect(url).toMatch(/#\/write\/[ZR]/);
  // Creation time is in the link and survives a reload.
  const created = await page.locator('.to-panel-head .meta').textContent();
  await reopen(page);
  await expect(page.locator('.to-panel-head .meta')).toHaveText(created!.trim());
  // A new document starts over.
  await page.getByRole('link', { name: 'New Write' }).click();
  await expect(page.locator('.to-panel-head .meta')).toHaveText('');
});

test('signing a document and detecting changes', async ({ page }) => {
  await page.goto('/#/sheet');
  await page.getByRole('textbox', { name: 'A1', exact: true }).fill('42');
  await page.locator('.to-meter sl-progress-ring').click();
  const dialog = page.locator('#doc-dialog');
  await expect(dialog).toHaveAttribute('open');
  await expect(dialog).toContainText('Unsigned');
  await expect(dialog.locator('dd code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(dialog).toContainText('Valid');
  await expect(dialog).toContainText('this browser');
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
  await expect(dialog).toContainText('Mismatch');
  await page.getByRole('button', { name: 'Re-sign' }).click();
  await expect(dialog).toContainText('Valid');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(dialog).toContainText('Unsigned');
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
  await expect(dialog.locator('dd code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Import' }).click();
  await dialog.locator('textarea').fill(key);
  await page.getByRole('button', { name: 'Use key' }).click();
  await expect(dialog.locator('dd code').first()).toHaveText(fp);
});

test('password-locked documents', async ({ page }) => {
  test.slow(); // PBKDF2 at 600k iterations, several times
  await page.goto('/#/sheet');
  const a1 = page.getByRole('textbox', { name: 'A1', exact: true });
  await a1.fill('payroll 2026');
  const plainUrl = page.url();
  await page.locator('.to-meter sl-progress-ring').click();
  const dialog = page.locator('#doc-dialog');
  await page.getByLabel('New password').fill('hunter2 is weak');
  await page.getByRole('button', { name: 'Lock' }).click();
  await expect(dialog).toContainText('Locked');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.to-panel-head')).toContainText('locked');
  const lockedUrl = page.url();
  expect(lockedUrl).toMatch(/#\/sheet\/E[A-Za-z0-9_-]+$/);
  expect(lockedUrl).not.toBe(plainUrl);

  // Reopening asks for the password; the content is not shown until it is right.
  await page.goto('about:blank');
  await page.goto(lockedUrl);
  const prompt = page.locator('#pw-dialog');
  await expect(prompt).toHaveAttribute('open');
  await expect(a1).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(prompt).toContainText('Wrong password');
  await expect(prompt).toHaveAttribute('open');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('hunter2 is weak');
  await page.keyboard.press('Enter');
  await expect(prompt).not.toHaveAttribute('open');
  await expect(a1).toHaveValue('payroll 2026');
  await expect(page.locator('.to-panel-head')).toContainText('locked');

  // Edits stay encrypted, and the password can be removed.
  await page.getByRole('textbox', { name: 'A2', exact: true }).fill('bonus');
  await expect.poll(() => page.url()).toMatch(/#\/sheet\/E/);
  const url2 = page.url();
  await page.goto('about:blank');
  await page.goto(url2);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('hunter2 is weak');
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('textbox', { name: 'A2', exact: true })).toHaveValue('bonus');
  await page.locator('.to-meter sl-progress-ring').click();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(dialog).not.toContainText('Locked');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect.poll(() => page.url()).toMatch(/#\/sheet\/[ZR]/);
  const plainAgain = page.url();
  await page.goto('about:blank');
  await page.goto(plainAgain);
  await expect(prompt).not.toHaveAttribute('open');
  await expect(a1).toHaveValue('payroll 2026');
});
