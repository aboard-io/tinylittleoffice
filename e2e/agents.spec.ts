/**
 * The agent and sharing surface on the built site: /llms.txt and /api.js are served (and the API imports and
 * works in a page), a plain link becomes the packed one, the embed page shows the pages alone, and each app's
 * page names its own share card.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const axe = (page: import('@playwright/test').Page) => new AxeBuilder({ page }).disableRules(['meta-viewport']).analyze();

test('/llms.txt and /api.js are served; the API makes a link that opens', async ({ page, request }) => {
  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toContain('# Tiny Little Office links');
  const api = await request.get('/api.js');
  expect(api.status()).toBe(200);
  expect(await api.text()).toMatch(/export\s*\{/);
  await page.goto('/');
  const made = await page.evaluate(async () => {
    const api = await import(`${location.origin}/api.js`);
    const url: string = api.link('todo', '- [ ] Milk\n', { title: 'Shop', site: location.origin });
    return { url, back: api.read(url).text, apps: (await api.apps()).length };
  });
  expect(made.back).toBe('---\ntitle: Shop\n---\n- [ ] Milk\n');
  expect(made.apps).toBe(13);
  await page.goto(made.url);
  await expect(page.locator('.to-title')).toHaveValue('Shop');
});

test('a plain link becomes the packed link; the embed page shows the pages alone; an app’s page names its card', async ({ page, request }) => {
  await page.goto('/todo/#title=Packing&doc=-+%5B+%5D+Socks');
  await expect(page).toHaveURL(/#\/v1\/todo\/[yzr][A-Za-z0-9_~]+$/);
  await expect(page.locator('.to-title')).toHaveValue('Packing');
  const packed = new URL(page.url()).hash.replace('#/v1/todo/', '');
  await page.goto(`/embed/#/v1/todo.embed/${packed}`);
  await expect(page.locator('.to-embed .to-display-page svg')).toBeVisible();
  await expect(page.locator('.to-header')).toHaveCount(0);
  await expect(page.locator('.to-embed-title')).toHaveText('Packing');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  const sheet = await (await request.get('/sheet/')).text();
  expect(sheet).toMatch(/<meta property="og:image" content="[^"]*og\/sheet\.png"/);
  expect((await request.get('/og/sheet.png')).headers()['content-type']).toBe('image/png');
});

test('Share’s Post the link and Embed fit the screen, Mastodon’s field too; Compare stacks on a phone', async ({ page }) => {
  await page.goto('/todo/#title=Packing&doc=-+%5B+%5D+Socks');
  await expect(page).toHaveURL(/#\/v1\/todo\//);
  const first = page.url();
  await page.locator('.to-burger').click();
  await page.locator('.to-drawer-share').click();
  const dialog = page.locator('to-dialog.to-share-dialog dialog');
  await page.locator('.to-post-mastodon').click();
  await expect(page.locator('.to-mastodon-server')).toBeVisible();
  for (const sel of ['.to-post-bluesky', '.to-post-email', '.to-mastodon-server', '.to-copy-embed']) {
    const box = (await page.locator(sel).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
  expect(await dialog.evaluate((d) => d.scrollWidth - d.clientWidth)).toBeLessThanOrEqual(0);
  expect((await axe(page)).violations).toEqual([]);
  await page.keyboard.press('Escape');
  const a = new URL(first).hash.replace('#/v1/todo/', '');
  await page.goto('/#/compare/todo/' + a);
  await page.locator('.cmp-b').fill(first);
  await page.locator('.cmp-b').press('Enter');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await expect(page.locator('.cmp-sum')).toHaveText('No difference');
  expect((await axe(page)).violations).toEqual([]);
});
