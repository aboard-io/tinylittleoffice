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

// Layout and scrolling need a real browser. Scrolled down, the header has gone up with the page; the app's own bar is stuck to the top,
// the menu button at the top left and undo and redo at the top right, neither over the bar's own controls.
for (const app of ['outline', 'sheet', 'write', 'deck', 'todo', 'org']) test(`scrolled in ${app}: its own bar at the top, the menu top left, undo and redo top right`, async ({ page }) => {
  await page.goto(`/#/v0/${app}`);
  await page.locator(`to-${app}`).waitFor();
  const example = page.getByRole('button', { name: /Start from an example/ });
  if (await example.count()) await example.first().click();
  await page.evaluate((a) => {
    const pad = document.createElement('div');
    pad.style.height = '3000px';
    document.querySelector(`to-${a}`)!.append(pad);
  }, app);
  const bar = page.locator(`to-${app} > :is(.to-toolbar, .sheet-bar, .ol-bars)`).first();
  const rect = (sel: string) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  // At the top: the header is there, and the bar under it.
  expect((await rect('.to-header')).t).toBe(0);
  await page.mouse.wheel(0, 1500);
  await expect(page.locator('to-app')).toHaveAttribute('scrolled', '');
  await page.waitForTimeout(150);
  expect((await rect('.to-header')).b).toBeLessThanOrEqual(0);
  const b = await bar.evaluate((e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
  expect(Math.round(b.t)).toBe(0);
  const burger = await rect('.to-burger');
  expect(burger.l).toBeLessThanOrEqual(8);
  expect(burger.t).toBeLessThanOrEqual(12);
  const undo = await rect('.to-undo');
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(undo.r).toBeGreaterThanOrEqual(width - 12);
  expect(undo.t).toBeLessThanOrEqual(12);
  // Nothing of the bar's own under them.
  // (What can be seen of them: a bar that scrolls sideways on a phone hides what is past its ends.)
  const controls = await bar.evaluate((e) => {
    return [...e.querySelectorAll('sl-button, button, input, sl-select, sl-dropdown, sl-input')]
      .filter((c) => (c as HTMLElement).offsetParent)
      .map((c) => { const box = (c.closest('.to-toolbar, .sheet-bar') ?? e).getBoundingClientRect(); const r = c.getBoundingClientRect(); return { l: Math.max(r.left, box.left), t: Math.max(r.top, box.top), r: Math.min(r.right, box.right), b: Math.min(r.bottom, box.bottom) }; })
      .filter((r) => r.r > r.l && r.b > r.t);
  });
  const over = (a: typeof b, c: typeof b) => a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
  expect(controls.filter((c) => over(c, burger) || over(c, undo))).toEqual([]);
  // Undo still works from up there.
  await expect(page.locator('.to-undo').getByRole('button', { name: 'Undo' })).toBeVisible();
  // Back up, the header is back.
  await page.mouse.wheel(0, -3000);
  await expect(page.locator('to-app')).not.toHaveAttribute('scrolled', '');
});
