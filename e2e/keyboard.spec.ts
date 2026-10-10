/**
 * The keyboard alone, no pointer from start to end: Tab through the home page to an app and open it, type in
 * its editor, walk the Download menu by arrows and close it with Escape, undo, open Share and close it, the
 * focus visible at every stop and back on what opened each menu and dialog. Desktop Chromium: a phone has no
 * Tab key.
 *
 *   PW_PORT=4423 npx playwright test e2e/keyboard.spec.ts --project=desktop
 */
import { test, expect, type Page } from '@playwright/test';

/** What has the focus: the element itself, or the one inside a shadow root. */
const focused = (page: Page) =>
  page.evaluate(() => {
    let el = document.activeElement;
    while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    const h = el as HTMLElement | null;
    if (!h || h === document.body) return { what: 'body', ring: false };
    const cs = getComputedStyle(h);
    // Where words are written the caret is the sign of the focus; everywhere else, an outline or a shadow.
    const ring = h.isContentEditable || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
    return { what: `${h.tagName.toLowerCase()}.${[...h.classList].join('.')}|${h.getAttribute('aria-label') ?? h.textContent?.trim().slice(0, 40)}`, ring };
  });

/** Tab (or Shift+Tab) until `want` has the focus; every stop on the way shows where the focus is. */
async function tabTo(page: Page, want: (what: string) => boolean, back = false, most = 60) {
  for (let i = 0; i < most; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const f = await focused(page);
    if (f.what === 'body') continue;
    expect.soft(f.ring, `a ring on ${f.what}`).toBe(true);
    if (want(f.what)) return f.what;
  }
  throw new Error('never reached by Tab');
}

test('the keyboard alone: home, an app, typing, a menu, undo, share', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'a phone has no Tab key');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('.to-app-open').first()).toBeVisible();

  // The home page: Tab reaches the first app, Enter opens it blank.
  await tabTo(page, (w) => w.startsWith('a.to-app-open|') && w.includes('Word Processor'));
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/v1\/write$/);
  const area = page.locator('to-write-editor to-text .tx');
  await expect(area).toBeVisible();

  // Into the editor by Tab, and type.
  await tabTo(page, (w) => w.startsWith('div.tx'));
  await page.keyboard.type('Typed without a mouse.');
  await expect(area.locator('p').first()).toHaveText('Typed without a mouse.');
  await expect(page).toHaveURL(/#\/v1\/write\/[ryz]/);
  const typed = page.url();

  // Download, by its key (the drawer's This document holds it): the drawer opens with the table on its first item,
  // arrows walk it, Escape closes it and gives the focus to its row, and Escape again closes the drawer.
  const download = page.locator('to-menu.to-drawer-download button').first();
  await page.keyboard.press('ControlOrMeta+Shift+d');
  const items = page.locator('to-menu.to-drawer-download [role^=menuitem]');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(items.first()).toBeHidden();
  await expect(download).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.to-drawer')).toBeHidden();

  // Undo: back into the words, and Mod+Z takes the typing away.
  await tabTo(page, (w) => w.startsWith('div.tx'), true);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(area.locator('p').first()).not.toHaveText('Typed without a mouse.');
  await expect.poll(() => page.url()).not.toBe(typed);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(area.locator('p').first()).toHaveText('Typed without a mouse.');

  // Share, by its key: the dialog with the focus inside it, Tab stays inside, Escape closes it.
  await page.keyboard.press('ControlOrMeta+Shift+s');
  const dialog = page.locator('dialog[open]').filter({ hasText: 'Copy link' });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]') || document.activeElement === document.body)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // The menu (the drawer): Enter opens it on Find, Escape closes it and the Menu button has the focus again.
  const burger = page.locator('.to-burger');
  await tabTo(page, (w) => w.startsWith('button.to-btn.to-tool.to-burger'), true);
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog.to-drawer')).toBeVisible();
  await expect(page.locator('.to-find')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.to-drawer')).toBeHidden();
  await expect(burger).toBeFocused();
  expect(errors).toEqual([]);
});
