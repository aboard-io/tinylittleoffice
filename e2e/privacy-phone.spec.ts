/**
 * Privacy on a phone: a sealed link opens with the unlock dialog inside the screen, its field 16px (no zoom),
 * a wrong password said so and the right one opening the document; the state beside the title a finger big,
 * the header one row. Real layout on a real phone engine (the phone project: WebKit, 390 by 844):
 *
 *   PW_PORT=4420 npx playwright test e2e/privacy-phone.spec.ts --project=phone --workers=1
 */
import { test, expect } from '@playwright/test';
import { newLocker, seal } from '../src/kit/crypt.ts';
import { packDoc } from '../src/kit/codec.ts';

test('a sealed link on a phone: the unlock dialog inside 390px, a wrong password, then the document', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'phone only');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const { flag, bytes } = packDoc('---\ntitle: Salaries\n---\nThe secret words.\n');
  const payload = await seal(await newLocker('correct horse'), flag, bytes);
  await page.goto(`/#/v1/write/${payload}`);
  const dialog = page.locator('to-dialog.to-unlock-dialog dialog');
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  const field = page.locator('.to-unlock-field');
  await expect(field).toBeFocused();
  expect(await field.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
  const go = page.locator('.to-unlock-go');
  expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await go.boundingBox())!.x + (await go.boundingBox())!.width).toBeLessThanOrEqual(390);
  await expect(page).toHaveTitle('Locked document · Tiny Little Office');
  await field.fill('wrong horse');
  await go.tap();
  await expect(page.locator('.to-unlock-wrong')).toHaveText('Wrong password', { timeout: 15_000 });
  await field.fill('correct horse');
  await go.tap();
  await expect(page.locator('to-text .tx p').first()).toHaveText('The secret words.', { timeout: 15_000 });
  await expect(dialog).toBeHidden();
  const zoom = await page.evaluate(() => window.visualViewport?.scale ?? 1);
  expect(zoom).toBe(1);
  // The state beside the title: a finger big, and the header one row inside the screen.
  const pill = (await page.locator('.to-header .to-trust').boundingBox())!;
  expect(pill.height).toBeGreaterThanOrEqual(44);
  expect(pill.width).toBeGreaterThanOrEqual(44);
  const header = await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.to-header')!;
    return { tops: new Set([...h.children].filter((el) => (el as HTMLElement).offsetWidth > 0).map((el) => Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))).size, right: Math.max(...[...h.children].map((el) => el.getBoundingClientRect().right)), wide: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(header.tops).toBe(1);
  expect(header.right).toBeLessThanOrEqual(390);
  expect(header.wide).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
