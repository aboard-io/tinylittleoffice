/**
 * Diagram on the built site, at desktop size in Chromium and at iPhone size in WebKit: a tap on the empty picture
 * makes the first idea, its words typed on it, typing puts it in the link and on the picture, Enter makes a branch; the bar
 * is one row, nothing is wider than the screen, axe finds nothing. Run on its own:
 *
 *   PW_PORT=4192 npx playwright test e2e/diagram.spec.ts --workers=1
 *
 * And on a phone, by finger: the words of a thing tapped focused at once (the keyboard's path) and laid on the thing, the
 * context bar under them, 44px, inside the screen, its
 * Duplicate, Copy and Paste, and Bring out; no selection bubble; a tap elsewhere closes the words.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('diagram: the first idea and a branch typed on the picture', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/diagram');
  const wrap = page.locator('to-diagram-editor .dg-wrap');
  await expect(wrap).toBeVisible();
  const measure = () =>
    page.evaluate(() => {
      const bar = document.querySelector<HTMLElement>('to-diagram-editor to-bar')!;
      const tops = new Set([...bar.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round((el as HTMLElement).getBoundingClientRect().top)));
      return { rows: tops.size, wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
  expect(await measure()).toEqual({ rows: 1, wide: 0 });
  await wrap.click({ position: { x: 40, y: 40 } });
  const line = page.locator('to-text.dg-words .tx');
  await expect(line).toBeVisible();
  await line.pressSequentially('Launch');
  await expect(page).toHaveURL(/#\/v1\/diagram\/[ryz]/);
  await expect(page.locator('.dg-pic g.dg-thing')).toHaveCount(1);
  await line.press('Enter');
  await line.pressSequentially('Pricing');
  await expect(page.locator('.dg-pic g.dg-thing[aria-label="Pricing"]')).toHaveCount(1);
  await line.press('Escape');
  await expect(page.locator('to-text.dg-words')).toBeHidden();
  expect((await measure()).wide).toBeLessThanOrEqual(0);
  expect((await new AxeBuilder({ page }).disableRules(['meta-viewport']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test('diagram: on a phone, a tap on a thing opens its words with the context bar on screen, 44px to a finger; Duplicate, Copy/Paste and Bring out by finger; no bubble', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/diagram');
  await page.locator('to-diagram-editor .dg-wrap').tap({ position: { x: 40, y: 40 } });
  const line = page.locator('to-text.dg-words .tx');
  await line.pressSequentially('Launch');
  await line.press('Enter');
  await line.pressSequentially('Pricing');
  // A tap elsewhere keeps the words and closes them.
  await page.locator('.dg-hint').tap();
  await expect(page.locator('to-text.dg-words')).toBeHidden();
  const pricing = page.locator('.dg-pic g.dg-thing[aria-label="Pricing"]');
  await pricing.tap();
  // The tap focused the words (WebKit shows no keyboard, but the focus is what raises it), on the thing itself.
  await expect(line).toBeFocused();
  const [w, g] = [(await page.locator('to-text.dg-words').boundingBox())!, (await pricing.boundingBox())!];
  expect(Math.abs(w.y + w.height / 2 - (g.y + g.height / 2))).toBeLessThan(g.height / 2);
  expect(Math.abs(w.x + w.width / 2 - (g.x + g.width / 2))).toBeLessThan(g.width / 2);
  const bar = page.locator('to-context.dg-context .to-context');
  await expect(bar).toBeVisible();
  const b = (await bar.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(390);
  for (const h of await bar.locator('button').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  await expect(page.locator('.tx-bubble .to-context:popover-open')).toHaveCount(0);
  await bar.getByRole('button', { name: 'Duplicate' }).tap();
  await expect(page.locator('.dg-pic g.dg-thing[aria-label="Pricing"]')).toHaveCount(2);
  const value = () => page.evaluate(() => (document.querySelector('to-diagram-editor') as HTMLElement & { value: string }).value);
  expect(await value()).toBe('- Launch\n  - Pricing\n  - Pricing\n');
  await page.locator('.dg-pic g.dg-thing[aria-label="Launch"]').tap();
  await bar.getByRole('button', { name: 'Copy' }).tap();
  await bar.getByRole('button', { name: 'Paste' }).tap();
  await expect.poll(value).toBe('- Launch\n  - Pricing\n  - Pricing\n  - Launch\n    - Pricing\n    - Pricing\n');
  // Bring out by finger: the last idea comes out from under the second Launch, a branch of the first, its words still open.
  await page.locator('.dg-hint').tap();
  await page.locator('.dg-pic g.dg-thing[aria-label="Pricing"]').nth(3).tap();
  await bar.getByRole('button', { name: 'Bring out' }).tap();
  await expect.poll(value).toBe('- Launch\n  - Pricing\n  - Pricing\n  - Launch\n    - Pricing\n  - Pricing\n');
  await expect(line).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.dg-pic')!).touchAction)).toBe('manipulation');
  expect(errors).toEqual([]);
});

test('diagram: on a phone, Join in the bar joins the thing open to the next one tapped', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/diagram');
  await page.locator('.dg-kind > button').tap();
  await page.locator('[popover]:popover-open [role^=menuitem]').getByText('Network').tap();
  await page.locator('to-diagram-editor .dg-wrap').tap({ position: { x: 40, y: 40 } });
  const line = page.locator('to-text.dg-words .tx');
  await expect(line).toBeFocused();
  await line.pressSequentially('Web');
  await line.press('Enter');
  await expect(line).toBeFocused();
  await line.pressSequentially('API');
  await page.locator('.dg-hint').tap();
  await expect(page.locator('to-text.dg-words')).toBeHidden();
  await page.locator('.dg-pic g.dg-thing[aria-label="Web"]').tap();
  const join = page.locator('to-diagram-editor to-bar').getByRole('button', { name: 'Join' });
  const r = (await join.boundingBox())!;
  expect(r.height).toBeGreaterThanOrEqual(44);
  await join.tap();
  await expect(join).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dg-pic g.dg-thing[aria-label="API"]').tap();
  const value = () => page.evaluate(() => (document.querySelector('to-diagram-editor') as HTMLElement & { value: string }).value);
  await expect.poll(value).toContain('~ Web -> API');
  await expect(join).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('diagram: on a phone, a mind map joins two ideas across the tree, and a finger on the dashed curve opens its words', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/diagram');
  await page.locator('to-diagram-editor .dg-wrap').tap({ position: { x: 40, y: 40 } });
  const line = page.locator('to-text.dg-words .tx');
  await expect(line).toBeFocused();
  for (const [i, w] of ['Root', 'Left', 'Right'].entries()) {
    if (i) await line.press('Enter');
    await line.pressSequentially(w);
  }
  await page.locator('.dg-hint').tap();
  await expect(page.locator('to-text.dg-words')).toBeHidden();
  await page.locator('.dg-pic g.dg-thing[aria-label="Left"]').tap();
  const join = page.locator('to-diagram-editor to-bar').getByRole('button', { name: 'Join' });
  await join.tap();
  await expect(join).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.dg-pic g.dg-thing[aria-label="Right"]').tap();
  const value = () => page.evaluate(() => (document.querySelector('to-diagram-editor') as HTMLElement & { value: string }).value);
  await expect.poll(value).toContain('~ Left -- Right');
  const curve = page.locator('.dg-pic g.dg-thing.edge polyline[stroke-dasharray]');
  await expect(curve).toHaveCount(1);
  // The curve's middle, by finger.
  const mid = await curve.evaluate((el) => {
    const pts = el.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number));
    const [x, y] = pts[Math.floor(pts.length / 2)];
    const p = new DOMPoint(x, y).matrixTransform((el as SVGGraphicsElement).getScreenCTM()!);
    return { x: p.x, y: p.y };
  });
  await page.touchscreen.tap(mid.x, mid.y);
  await expect(line).toBeFocused();
  await line.pressSequentially('rhymes');
  await expect.poll(value).toContain('~ Left -- Right: rhymes');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
