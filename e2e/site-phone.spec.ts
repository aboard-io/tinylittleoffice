/**
 * Website on a phone, in WebKit at 390 by 844 with a finger: a new site opens with the focus inside the frame, in
 * the site's name where it is drawn (16px or more, so nothing zooms), and what is typed there is the
 * document; the heading in hand has its bar (Edit, Move up, Move down, Duplicate, Delete) inside the screen, 44px a
 * button. Insert ▾ is in reach and its Paragraph is put in after the thing in hand; a finger on its words types
 * them; a tap on the empty page lets go; Delete takes it away and Undo brings it back in hand; Preview and Edit by a
 * finger; the things in the page never zoom on a double tap. Run on its own:
 *
 *   PW_PORT=4404 npx playwright test e2e/site-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';

test('website: on a phone, the words typed inside the frame, the name open at once; Insert, a thing in hand with its bar; Delete, Undo, Preview by a finger', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/#/v1/site');
  const site = page.frameLocator('to-site-editor iframe.site-frame');
  // A new site opens with its name in hand, the focus in the frame, in its words (docs/editing.md §1); no form.
  const words = site.locator('h1 to-text .tx');
  await expect(words).toBeFocused();
  await expect(page.locator('.site-form-dialog')).toHaveCount(0);
  expect(await words.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.keyboard.type('Quay Pottery');
  await expect(page).toHaveURL(/#\/v1\/site\/[ryz]/);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  // The heading in hand: its bar inside the screen, 44px a button.
  const bar = page.locator('to-site-editor to-context.site-context .to-context');
  await expect(bar).toBeVisible();
  expect(await bar.getByRole('button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))).toEqual(['Edit', 'Move up', 'Move down', 'Duplicate', 'Delete']);
  const box = (await bar.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  for (const b of await bar.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // Insert ▾ in reach, in the bar at the column's bottom (round eight: above the keyboard when one is up): a paragraph
  // after the heading, its words offered, in hand.
  const insert = page.locator('to-site-editor to-insert button').first();
  const reach = (await insert.boundingBox())!;
  expect(reach.x).toBeGreaterThanOrEqual(0);
  expect(reach.y + reach.height).toBeLessThanOrEqual(await page.evaluate(() => window.visualViewport!.height + 0.5));
  expect(reach.y).toBeGreaterThan(844 - 200);
  await insert.tap();
  await page.getByRole('menuitem', { name: 'Paragraph' }).tap();
  const para = site.getByText('New paragraph');
  await expect(para).toBeVisible();
  await expect(site.getByRole('heading', { name: 'Quay Pottery', level: 1 })).toBeVisible();
  // A finger on its words: the focus in them; chosen whole and typed over.
  await para.tap();
  const pwords = site.locator('p to-text .tx');
  await expect(pwords).toBeFocused();
  await page.keyboard.press('Meta+A');
  await page.keyboard.type('On the quay since 1998.');
  const said = site.getByText('On the quay since 1998.');
  await expect(said).toBeVisible();
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  // A tap on the page's empty room lets go, the words kept.
  const fb = (await page.locator('to-site-editor iframe.site-frame').boundingBox())!;
  const room = await site.locator('body').evaluate((body) => {
    for (let y = innerHeight - 6; y > 0; y -= 8) {
      const at = body.ownerDocument.elementFromPoint(12, y);
      if (at && !at.closest('[data-o], a, button, nav, to-text')) return y;
    }
    return -1;
  });
  expect(room).toBeGreaterThan(0);
  await page.touchscreen.tap(fb.x + 12, fb.y + room);
  await expect(bar).toBeHidden();
  await expect(said).toBeVisible();
  await expect(site.locator('to-text:not([hidden])')).toHaveCount(0);
  // Taken again, then Delete by the bar; Undo brings it back, in hand.
  await said.tap();
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Delete' }).tap();
  await expect(said).toHaveCount(0);
  await page.locator('to-site-editor to-bar button[aria-label="Undo"]').tap();
  await expect(said).toHaveCount(1);
  await expect(bar).toBeVisible();
  expect(await said.evaluate((el) => [getComputedStyle(el).touchAction, el.classList.contains('site-cur')])).toEqual(['manipulation', true]);
  // Preview, and Edit back, by a finger.
  await page.getByRole('button', { name: 'Preview' }).tap();
  await expect(site.locator('[data-o]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit' }).tap();
  await expect(site.locator('[data-o]').first()).toBeAttached();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
