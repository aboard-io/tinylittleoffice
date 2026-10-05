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

/** Navigate to an app through the header nav, or the drawer on small screens. */
export async function navTo(page: Page, name: string) {
  const burger = page.locator('.to-burger');
  if (await burger.isVisible()) {
    await burger.click();
    await page.locator('#nav-drawer .to-drawer-nav a', { hasText: name }).click();
    await expect(page.locator('#nav-drawer')).not.toHaveAttribute('open');
  } else {
    await page.locator('.to-nav a', { hasText: name }).click();
  }
}

/** Pick an option in an sl-select by value. */
export async function pickOption(page: Page, select: string, value: string) {
  await page.locator(select).click();
  await page.locator(`${select} sl-option[value="${value}"]`).click();
}
