/**
 * Every preview is the one box, 4:3, whatever the page's shape (Paul, 2026-10-10: "All previews of docs and templates
 * should be the same size"; kit/draw.ts CROPPED), at desktop size and on an iPhone-sized WebKit: in the templates list
 * a wide page is 96 by 72 at the size of 100% (kit/zoom.ts BASE draws it 1.3 times that), and a kept document's
 * preview under its app 72 by 54; the list is inside the screen, and nothing is wider than it. With SHOTS set, a
 * screenshot of each list and of the home page with the kept documents.
 */
import { test, expect, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS;
const shot = async (page: Page, name: string) => SHOTS && (await page.screenshot({ path: `${SHOTS}/thumbs-${name}-${page.viewportSize()!.width}.png` }));
/** What 1px at the size of 100% is drawn at: the root's font size over 16 (kit/zoom.ts BASE, 1.3). */
const base = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const WIDE: [string, string][] = [
  ['Spreadsheet', 'Mortgages compared'],
  ['Kanban Board', 'A project'],
  ['Diagram Maker', 'The Brontës'],
  ['Presentation Builder', 'A talk'],
];

test('the templates list and the kept documents draw a wide document in the one 4:3 box', async ({ page }) => {
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
    expect(Math.round(box.height), app).toBe(Math.round(72 * (await base(page))));
    expect(Math.round(box.width), app).toBe(Math.round(96 * (await base(page))));
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
    // A preview is drawn once it scrolls into sight (kit/preview.ts): the box is brought there, then its drawing looked for.
    const preview = page.locator(`section.to-app[aria-label="${app}"] .to-drive to-preview`).first();
    await preview.scrollIntoViewIfNeeded();
    await expect(preview.locator('svg')).toBeVisible();
    const box = (await preview.boundingBox())!;
    expect(Math.round(box.height), app).toBe(Math.round(54 * (await base(page))));
    expect(Math.round(box.width), app).toBe(Math.round(72 * (await base(page))));
  }
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.locator('section.to-app[aria-label="Spreadsheet"]').scrollIntoViewIfNeeded();
  await shot(page, 'kept');
});
