/**
 * Wide documents get wide thumbnails (Paul, 2026-10-10), at desktop size and on an iPhone-sized WebKit: in the
 * templates list a landscape page is 72 tall and as wide as its shape, to twice its height, and a kept document's
 * preview under its app the same at its own height; the words beside them shrink, and nothing is wider than the
 * screen. With SHOTS set, a screenshot of each list and of the home page with the kept documents.
 */
import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS;
const shot = async (page: Page, name: string) => SHOTS && (await page.screenshot({ path: `${SHOTS}/thumbs-${name}-${page.viewportSize()!.width}.png` }));
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const WIDE: [string, string][] = [
  ['Spreadsheet', 'Mortgages compared'],
  ['Kanban Board', 'A project'],
  ['Diagram Maker', 'The Brontës'],
  ['Presentation Builder', 'A talk'],
];

test('the templates list and the kept documents draw a wide document wide', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tinyoffice.keep', '1'));
  await page.goto('/');
  const kept: { app: string; hash: string }[] = [];
  for (const [app, name] of WIDE) {
    const row = page.locator(`section.to-app[aria-label="${app}"]`);
    await row.locator('.to-templates-btn').click();
    const list = row.locator('[role=listbox]');
    await expect(list).toBeVisible();
    const option = list.getByRole('option', { name });
    await option.scrollIntoViewIfNeeded();
    const box = (await option.locator('.to-thumb').boundingBox())!;
    expect(Math.round(box.height), app).toBe(72);
    expect(box.width, app).toBeGreaterThan(72);
    expect(box.width, app).toBeLessThanOrEqual(145);
    const listBox = (await list.boundingBox())!;
    expect(listBox.x + listBox.width, app).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await shot(page, app.split(' ')[0].toLowerCase());
    await option.click();
    await expect(page).toHaveURL(/#\/v1\/\w+\//);
    // The editor settles the link (its name, its place in the library) before the page goes home.
    await expect(page.locator('.to-title')).toBeVisible();
    await expect
      .poll(async () => {
        const was = page.url();
        await page.waitForTimeout(300);
        return page.url() === was;
      })
      .toBe(true);
    kept.push({ app, hash: new URL(page.url()).hash });
    await page.goto('/');
  }
  // Kept under their apps (seeded, so the check does not hang on when a template counts as kept).
  await page.evaluate((all) => {
    const ids: Record<string, string> = { Spreadsheet: 'sheet', 'Kanban Board': 'board', 'Diagram Maker': 'diagram', 'Presentation Builder': 'deck' };
    localStorage.setItem('tinyoffice.library', JSON.stringify(all.map((k, i) => ({ id: 'k' + i, app: ids[k.app], title: k.app, hash: k.hash, at: Date.now() - i }))));
  }, kept);
  await page.reload();
  for (const [app] of WIDE) {
    const svg = page.locator(`section.to-app[aria-label="${app}"] .to-drive to-preview svg`).first();
    await svg.scrollIntoViewIfNeeded();
    await expect(svg).toBeVisible();
    const box = (await svg.boundingBox())!;
    expect(box.width, app).toBeGreaterThan(box.height);
    expect(box.width, app).toBeLessThanOrEqual(2 * box.height + 2);
  }
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.locator('section.to-app[aria-label="Spreadsheet"]').scrollIntoViewIfNeeded();
  await shot(page, 'kept');
});
