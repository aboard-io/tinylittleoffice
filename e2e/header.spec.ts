import { test, expect } from '@playwright/test';
for (const w of [360, 390, 430, 461, 520, 600, 640, 700]) test(`header fits at ${w}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 800 });
  await page.goto('/#/v0/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Hi');
  const boxes = await page.locator('.to-header-inner > *').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(r.right)]; }));
  const h = await page.locator('.to-header').evaluate((e) => e.getBoundingClientRect().bottom);
  expect(boxes.every((b) => b[0] >= 0 && b[1] <= h + 1 && b[2] <= w), JSON.stringify(boxes)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Nothing sits under the menu button.
  const burger = await page.locator('.to-burger').evaluate((e) => e.getBoundingClientRect().right);
  const first = await page.locator('.to-header-inner > *').first().evaluate((e) => e.getBoundingClientRect().left);
  expect(first).toBeGreaterThanOrEqual(burger);
});

// Layout and scrolling need a real browser: the bar stays, the menu button at the very top left, however far down.
for (const app of ['outline', 'sheet', 'write']) test(`the bar stays put when ${app} scrolls, its menu at the top left`, async ({ page }) => {
  await page.goto(`/#/v0/${app}`);
  const example = page.getByRole('button', { name: /Start from an example/ });
  await page.locator(`to-${app}`).waitFor();
  if (await example.count()) await example.first().click();
  await page.evaluate(() => {
    const pad = document.createElement('div');
    pad.style.height = '3000px';
    document.querySelector('main')?.append(pad);
  });
  for (const y of [600, 2000, 300]) {
    await page.mouse.wheel(0, y === 300 ? -1700 : y);
    await page.waitForTimeout(150);
    const r = await page.locator('.to-header').evaluate((e) => e.getBoundingClientRect().top);
    const b = await page.locator('.to-burger').evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; });
    expect([Math.round(r), b[0] <= 12, b[1] <= 12], `scrolled ${await page.evaluate(() => scrollY)}`).toEqual([0, true, true]);
  }
});

// Sticking needs real layout: the outline's second bar stays just under the header.
test('the outline’s arrange bar stays under the header when scrolled', async ({ page }) => {
  await page.goto('/#/v0/outline');
  await page.locator('to-outline .ol-nav').waitFor();
  await page.evaluate(() => {
    const pad = document.createElement('div');
    pad.style.height = '3000px';
    document.querySelector('to-outline')?.append(pad);
  });
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(150);
  const [head, bar] = await Promise.all([page.locator('.to-header').evaluate((e) => e.getBoundingClientRect().bottom), page.locator('.ol-nav').evaluate((e) => e.getBoundingClientRect().top)]);
  expect(Math.abs(bar - head)).toBeLessThanOrEqual(1);
});
