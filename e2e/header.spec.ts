import { test, expect } from '@playwright/test';
for (const w of [360, 390, 430, 461, 520, 600, 640, 700]) test(`header fits at ${w}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 800 });
  await page.goto('/#/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Hi');
  const boxes = await page.locator('.to-header-inner > *').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(r.right)]; }));
  const h = await page.locator('.to-header').evaluate((e) => e.getBoundingClientRect().bottom);
  expect(boxes.every((b) => b[0] >= 0 && b[1] <= h + 1 && b[2] <= w), JSON.stringify(boxes)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
