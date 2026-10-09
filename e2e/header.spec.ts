import { test, expect } from '@playwright/test';
// The header is one row: the menu, the document's app and title, then every icon. Too long for the screen, it scrolls
// sideways inside itself, never widening the page, an edge fading where there is more.
for (const w of [360, 390, 430, 461, 520, 600, 640, 700]) test(`header fits at ${w}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: 800 });
  await page.goto('/#/v0/write');
  await page.getByRole('textbox', { name: 'Document' }).click();
  await page.keyboard.type('Hi');
  const h = await page.locator('.to-header').evaluate((e) => e.getBoundingClientRect().bottom);
  const boxes = await page.locator('.to-header-inner > *').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; }));
  expect(boxes.every((b) => b[0] >= 0 && b[1] <= h + 1), JSON.stringify(boxes)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Nothing sits under the menu button, and the row starts with the app and the title.
  const burger = await page.locator('.to-burger').evaluate((e) => e.getBoundingClientRect().right);
  const first = await page.locator('.to-header-inner > *').first().evaluate((e) => e.getBoundingClientRect().left);
  expect(first).toBeGreaterThanOrEqual(burger);
  await expect(page.locator('.to-header-inner > .to-here + .to-title')).toBeVisible();
  // Every icon is in the row, past the edge if need be: the end fades when there is more to scroll to.
  const inner = page.locator('.to-header-inner');
  const [more, fades] = await inner.evaluate((e) => [e.scrollWidth > e.clientWidth + 1, e.hasAttribute('data-fade-end')]);
  expect(fades).toBe(more);
});

// Layout and scrolling need a real browser. Scrolled down, the header is still at the top, and the app's own bar is stuck under it.
for (const app of ['outline', 'sheet', 'write', 'deck', 'todo', 'org']) test(`scrolled in ${app}: the header at the top, its own bar under it`, async ({ page }) => {
  await page.goto(`/#/v0/${app}`);
  await page.locator(`to-${app}`).waitFor();
  const example = page.getByRole('button', { name: /Start from an example/ });
  if (await example.count()) await example.first().click();
  await page.evaluate((a) => {
    const pad = document.createElement('div');
    pad.style.height = '3000px';
    document.querySelector(`to-${a}`)!.append(pad);
  }, app);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(150);
  const top = (sel: string) => page.locator(sel).first().evaluate((e) => Math.round(e.getBoundingClientRect().top));
  expect(await top('.to-header')).toBe(0);
  const headerH = await page.locator('.to-header').evaluate((e) => Math.round(e.getBoundingClientRect().height));
  expect(Math.abs((await top(`to-${app} > :is(.to-toolbar, .sheet-bar, .ol-bars)`)) - headerH)).toBeLessThanOrEqual(1);
  await expect(page.locator('.to-burger')).toBeVisible();
  await expect(page.locator('.to-undo').getByRole('button', { name: 'Undo' })).toBeVisible();
});
