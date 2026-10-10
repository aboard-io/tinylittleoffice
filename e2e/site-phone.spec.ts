/**
 * Website on a phone, in WebKit at 390 by 844 with a finger: Insert ▾ is in reach and its Paragraph opens a
 * form at the top of the screen, inside it, its words typed and Done; the new paragraph is in hand with its bar
 * (Edit, Move up, Move down, Duplicate, Delete) inside the screen, 44px a button; one finger on a thing opens its
 * form at once, its type 16px so nothing zooms, the thing's bar under the form and a tap away; Close leaves the
 * thing in hand, a tap on the empty page lets it go; Delete takes it away and Undo brings it back in hand;
 * Preview and Edit by a finger; the things in the page never zoom on a double tap. Run on its own:
 *
 *   PW_PORT=4404 npx playwright test e2e/site-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';

test('website: on a phone, Insert, a form inside the screen, a thing in hand with its bar; Delete, Undo, Preview by a finger', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/site');
  const site = page.frameLocator('to-site-editor iframe.site-frame');
  await expect(site.getByRole('heading', { name: 'My site', level: 1 })).toBeVisible();
  const insert = page.locator('to-site-editor to-insert button').first();
  const reach = await insert.boundingBox();
  expect(reach!.x).toBeGreaterThanOrEqual(0);
  expect(reach!.y).toBeLessThan(200);
  await insert.tap();
  await page.getByRole('menuitem', { name: 'Paragraph' }).tap();
  const form = page.locator('.site-form-dialog dialog');
  await expect(form).toBeVisible();
  const fits = async () => {
    const r = (await form.boundingBox())!;
    expect(r.y).toBeLessThanOrEqual(16);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(390);
    expect(r.y + r.height).toBeLessThanOrEqual(844 / 2);
  };
  await fits();
  await page.keyboard.type('On the quay since 1998.');
  await form.getByRole('button', { name: 'Done' }).tap();
  await expect(form).toHaveCount(0);
  const words = site.getByText('On the quay since 1998.');
  await expect(words).toBeVisible();
  // The new paragraph is in hand: its bar beside it.
  const bar = page.locator('to-site-editor to-context.site-context .to-context');
  await expect(bar).toBeVisible();
  expect(await bar.getByRole('button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Delete']);
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  for (const b of await bar.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // One finger on a thing not in hand: its form at once, inside the screen, nothing zoomed (WebKit counts the tap as a
  // click where the thing listens itself), the thing's bar under the form, inside the screen; Close leaves it in hand.
  const heading = site.getByRole('heading', { name: 'My site', level: 1 });
  await heading.tap();
  await expect(form).toBeVisible();
  await fits();
  const lent = form.locator('to-context.site-context .to-context');
  await expect(lent).toBeVisible();
  const [fr, lr] = [(await form.boundingBox())!, (await lent.boundingBox())!];
  expect(lr.y).toBeGreaterThanOrEqual(fr.y + fr.height - 1);
  expect(lr.x + lr.width).toBeLessThanOrEqual(390);
  await form.getByRole('button', { name: 'Close' }).tap();
  await expect(form).toHaveCount(0);
  await expect(bar).toBeVisible();
  // A tap on the page's empty room lets go.
  const fb = (await page.locator('to-site-editor iframe.site-frame').boundingBox())!;
  const room = await site.locator('body').evaluate((body) => {
    for (let y = innerHeight - 6; y > 0; y -= 8) {
      const at = body.ownerDocument.elementFromPoint(12, y);
      if (at && !at.closest('[data-o], a, button, nav')) return y;
    }
    return -1;
  });
  expect(room).toBeGreaterThan(0);
  await page.touchscreen.tap(fb.x + 12, fb.y + room);
  await expect(bar).toBeHidden();
  // The paragraph by one finger: its form, rich words at 16px; Close, and it is in hand.
  await words.tap();
  await expect(form).toBeVisible();
  await fits();
  expect(await form.locator('to-text .tx').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await form.getByRole('button', { name: 'Close' }).tap();
  await expect(form).toHaveCount(0);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  // Delete by the bar; Undo brings it back, in hand.
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Delete' }).tap();
  await expect(words).toHaveCount(0);
  await page.locator('to-site-editor to-bar button[aria-label="Undo"]').tap();
  await expect(words).toHaveCount(1);
  await expect(bar).toBeVisible();
  expect(await words.evaluate((el) => [getComputedStyle(el).touchAction, el.classList.contains('site-cur')])).toEqual(['manipulation', true]);
  // Preview, and Edit back, by a finger.
  await page.getByRole('button', { name: 'Preview' }).tap();
  await expect(site.locator('[data-o]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit' }).tap();
  await expect(site.locator('[data-o]').first()).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
