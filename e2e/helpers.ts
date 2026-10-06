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

/** Navigate to an app through the hamburger menu. */
export async function navTo(page: Page, name: string) {
  await page.locator('.to-burger').click();
  // The app may be in a cluster folded shut: open it first.
  const link = page.locator('#nav-drawer .to-drawer-nav a', { hasText: name });
  const cluster = page.locator('#nav-drawer details.to-cluster', { has: link });
  if ((await cluster.count()) && !(await cluster.getAttribute('open'))) await cluster.locator('summary').click();
  await link.click();
  await expect(page.locator('#nav-drawer')).not.toHaveAttribute('open');
}

/** Pick an option in an sl-select by value. */
export async function pickOption(page: Page, select: string, value: string) {
  await page.locator(select).click();
  await page.locator(`${select} sl-option[value="${value}"]`).click();
  // Wait for the list to close, or the next click on the select would land mid-animation.
  await expect(page.locator(`${select} sl-option[value="${value}"]`)).toBeHidden();
}
