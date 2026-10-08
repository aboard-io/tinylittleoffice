import { expect, type Page } from '@playwright/test';

export const SHOTS = process.env.SHOTS; // directory for screenshots, optional

export async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()!.width}.png`, fullPage: true });
}

/** Reload the page at its current URL: the URL is the document, so this is the persistence test. */
export async function reopen(page: Page) {
  const url = page.url();
  await page.goto('about:blank');
  await page.goto(url);
}

/** Navigate to an app through the hamburger menu (it opens in a new tab; this goes there in the same one). */
export async function navTo(page: Page, name: string) {
  await page.locator('.to-burger').click();
  // The app may be in a cluster folded shut: open it first.
  const link = page.locator('#nav-drawer .to-drawer-nav a', { hasText: name });
  const cluster = page.locator('#nav-drawer details.to-cluster', { has: link });
  if ((await cluster.count()) && !(await cluster.getAttribute('open'))) await cluster.locator('summary').click();
  // An app chosen from the menu opens in a new tab; the test follows it here.
  await expect(link).toHaveAttribute('target', '_blank');
  const href = await link.getAttribute('href');
  await page.keyboard.press('Escape');
  await expect(page.locator('#nav-drawer')).not.toHaveAttribute('open');
  await page.goto(new URL(href!, page.url()).href);
}

/** Pick an option in an sl-select by value. */
export async function pickOption(page: Page, select: string, value: string) {
  await page.locator(select).click();
  await page.locator(`${select} sl-option[value="${value}"]`).click();
  // Wait for the list to close, or the next click on the select would land mid-animation.
  await expect(page.locator(`${select} sl-option[value="${value}"]`)).toBeHidden();
}

/** Copy the document's link: the meter's button, or on a phone (where the meter is only a ring) Share → Copy link. */
export async function copyLink(page: Page) {
  const btn = page.locator('.to-meter').getByRole('button', { name: 'Copy link' });
  if (await btn.isVisible()) return btn.click();
  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('menuitem', { name: /^Copy link/ }).first().click();
  await expect(page.getByRole('menuitem', { name: /^Copy link/ }).first()).toBeHidden();
}

/** Open the Privacy menu's item, or on a phone (no Privacy button) the document dialog it leads to. */
export async function privacy(page: Page, item: RegExp) {
  const btn = page.getByRole('button', { name: 'Privacy' });
  if (await btn.isVisible()) {
    await btn.click();
    await page.getByRole('menuitem', { name: item }).click();
  } else await page.locator('.to-meter sl-progress-ring').click();
}
