import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { shot } from './helpers';

// As a new visitor finds it: the form, not the text. (The forms and pictures worked by hand are in
// test/dom/forms.test.ts; what is here needs a real browser.)
// The same origin as playwright.config.ts: the port comes from PW_PORT.
const port = Number(process.env.PW_PORT ?? 4173);
test.use({ storageState: { cookies: [], origins: [{ origin: `http://localhost:${port}`, localStorage: [{ name: 'tinyoffice.keep', value: '1' }, { name: 'tinyoffice.edit', value: 'form' }, { name: 'tinyoffice.open', value: 'edit' }] }] } });

test('frames and files: a model works itself out in its frame, and place cards download as a PDF', async ({ page }) => {
  // The model's numbers are worked out by its frame's own script, which only a real browser runs.
  await page.goto('/#/v0/flow');
  const flow = page.locator('to-flow to-lines');
  const addFlow = (kind: string) => flow.getByRole('group', { name: 'Add' }).getByRole('button', { name: kind, exact: true }).click();
  await addFlow('Slider');
  await page.keyboard.type('visitors');
  await page.keyboard.press('Tab');
  await page.keyboard.type('1000');
  await addFlow('Flow');
  await page.keyboard.type('Visitors');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Signups');
  await page.keyboard.press('Tab');
  await page.keyboard.type('visitors * 0.1');
  await expect(page.frameLocator('to-flow iframe').locator('#say')).toContainText('Signups 100');
  await shot(page, 'form-flow');

  // A PDF is drawn on a canvas, and downloaded.
  await page.goto('/#/v0/seating');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  await page.getByRole('button', { name: 'Download' }).click();
  const [cards] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Place cards/ }).click()]);
  expect(readFileSync(await cards.path()).subarray(0, 5).toString()).toBe('%PDF-');
});

// Where a tap or a drag lands on the picture is worked out from the screen (getScreenCTM, elementsFromPoint): a real layout.
test('the picture is the editor: tap to add, drag to move, drag onto another to re-home', async ({ page }) => {
  // Picture mode: the default; no list beside it.
  await page.goto('/#/v0/org');
  await page.evaluate(() => localStorage.removeItem('tinyoffice.edit'));
  await page.reload();
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const pic = page.locator('to-org .pic > svg');
  await expect(pic.locator('g.pick:not(.line)')).toHaveCount(6);
  // A tap on empty space adds a person, with the box open to name them.
  // (The top left is empty, and on a phone, where a wide picture scrolls sideways, it is on the screen.)
  const box = await pic.boundingBox();
  await page.mouse.click(box!.x + 12, box!.y + 12);
  await expect(page.locator('.pic-edit input').first()).toBeFocused();
  await page.keyboard.type('Gus Pine');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(pic).toContainText('Gus Pine');
  await expect(pic.locator('g.pick:not(.line)')).toHaveCount(7);
  // Dragged onto Eve, Gus reports to her.
  const gus = pic.getByRole('button', { name: /^Gus Pine/ });
  const eve = pic.getByRole('button', { name: /^Eve Marsh/ });
  const [g, e] = [await gus.boundingBox(), await eve.boundingBox()];
  await page.mouse.move(g!.x + g!.width / 2, g!.y + g!.height / 2);
  await page.mouse.down();
  await page.mouse.move(e!.x + e!.width / 2, e!.y + e!.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Org chart, as text' })).toHaveValue(/- Eve Marsh \| Design\n    - Gus Pine/);
  await page.keyboard.press('Control+Shift+t');
  await shot(page, 'direct-org');

  // A floor plan's rooms keep a place: a drag moves one.
  await page.goto('/#/v0/floor');
  await page.getByRole('button', { name: 'Start from an example' }).click();
  const plan = page.locator('to-floor .pic > svg');
  const kitchen = plan.getByRole('button', { name: /^Kitchen/ });
  const k = (await kitchen.boundingBox())!;
  await page.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await page.mouse.down();
  await page.mouse.move(k.x + k.width / 2 + 80, k.y + k.height / 2 + 60, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.press('Control+Shift+t');
  await expect(page.getByRole('textbox', { name: 'Floor plan, as text' })).toHaveValue(/Kitchen: [\d.]+ x [\d.]+ at [\d.]+,[\d.]+/);
});
