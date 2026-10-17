/**
 * Preview cards through the dev Workers: the built site served by its own Worker (`wrangler dev`, as `npm run
 * site:dev` runs it) and the shortener (`wrangler dev -c backends/cloudflare/tinier/wrangler.jsonc`), on one local D1 with the migrations
 * applied. A document's Share, Bluesky with the preview on: the browser draws the first page, the Worker keeps it, the
 * compose box gets the link with /c/<id>; that page says the card in its tags, the picture decodes at 1200 by
 * 630, and the shortener's landing page with the same ?c= says it too. Desktop Chromium only (one Worker pair). Run on
 * its own:
 *
 *   npx playwright test e2e/cards.spec.ts --project=desktop
 */
import { test, expect } from '@playwright/test';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeDoc } from '../src/kit/core/codec.ts';

const SITE_PORT = Number(process.env.CARDS_SITE_PORT ?? 8798);
const TINIER_PORT = Number(process.env.CARDS_TINIER_PORT ?? 8797);
const site = `http://127.0.0.1:${SITE_PORT}`;
const tinier = `http://127.0.0.1:${TINIER_PORT}`;
let dir = '';
const workers: ChildProcess[] = [];

/** Until the address answers, or a minute has passed. */
async function up(url: string) {
  for (let i = 0; i < 1200; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error(`${url} never answered`);
}
const content = (page: string, name: string) => new RegExp(`<meta (?:property|name)="${name.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`).exec(page)?.[1];

test.beforeAll(async ({}, info) => {
  if (info.project.name !== 'desktop') return;
  test.setTimeout(180_000);
  dir = mkdtempSync(join(tmpdir(), 'tlo-cards-'));
  const env = { ...process.env, CI: 'true' };
  execFileSync('npx', ['wrangler', 'd1', 'migrations', 'apply', 'tinier', '--local', '-c', 'backends/cloudflare/site/wrangler.jsonc', '--persist-to', dir], { env, stdio: 'ignore' });
  const run = (args: string[]) => workers.push(spawn('npx', ['wrangler', 'dev', '--persist-to', dir, ...args], { env, stdio: 'ignore', detached: true }));
  run(['-c', 'backends/cloudflare/site/wrangler.jsonc', '--port', String(SITE_PORT), '--var', 'BRAKE_KEY:e2e-site']);
  run(['-c', 'backends/cloudflare/tinier/wrangler.jsonc', '--port', String(TINIER_PORT), '--var', 'BRAKE_KEY:e2e-tinier', '--var', `SITE:${site}`]);
  await Promise.all([up(`${site}/`), up(`${tinier}/`)]);
});
test.afterAll(() => {
  for (const w of workers) if (w.pid) process.kill(-w.pid, 'SIGTERM');
  if (dir) rmSync(dir, { recursive: true, force: true });
});

test('a document shared to Bluesky with its preview: the card is kept, the /c/<id> page says it, the picture is 1200 by 630', async ({ page, request }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop only');
  // The compose box is not opened: the address it would open at is kept instead.
  await page.addInitScript(() => {
    window.open = (url?: string | URL) => (((window as unknown as { opened: string }).opened = String(url)), null);
  });
  const doc = '---\ntitle: Garden "plan"\n---\n# Garden "plan"\n\nTomatoes by the fence, beans on the trellis.\n';
  await page.goto(`${site}/write/#/v1/write/${encodeDoc(doc)}`);
  await expect(page.locator('to-write-editor to-text .tx')).toBeVisible();
  await page.locator('.to-burger').click();
  await page.locator('.to-drawer-share').click();
  const dialog = page.locator('to-dialog.to-share-dialog dialog[open]');
  await expect(dialog.locator('.to-share-preview input[role=switch]')).toBeChecked();
  await dialog.locator('.to-post-bluesky').click();
  await page.locator('to-dialog.to-link-guard .lg-go').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { opened?: string }).opened ?? '')).toMatch(/^https:\/\/bsky\.app\//);
  const compose = await page.evaluate(() => (window as unknown as { opened: string }).opened);
  const link = /https?:\/\/\S+/.exec(new URL(compose).searchParams.get('text')!)![0];
  const id = /\/c\/([a-z0-9]{7})#/.exec(link)?.[1];
  expect(id, link).toBeTruthy();
  // The address the reader arrives at: the card is gone from it as the page starts, the document is there on the app's page.
  await page.goto(link.replace(/^https?:\/\/[^/]+/, site));
  await expect(page.locator('to-write-editor to-text .tx')).toContainText('Tomatoes by the fence');
  expect(new URL(page.url()).pathname).toBe('/write/');

  // What a network's fetcher reads.
  const shared = await request.get(`${site}/c/${id}`);
  expect(shared.status()).toBe(200);
  expect(shared.headers()['cache-control']).toBe('public, max-age=3600, no-transform');
  const html = await shared.text();
  expect(content(html, 'og:title')).toBe('Garden &quot;plan&quot;');
  expect(content(html, 'twitter:title')).toBe('Garden &quot;plan&quot;');
  expect(content(html, 'og:description')).toBe('Tomatoes by the fence, beans on the trellis.');
  expect(content(html, 'og:image')).toMatch(new RegExp(`/card/${id}\\.png$`));
  expect(content(html, 'twitter:card')).toBe('summary_large_image');
  // The page keeps the site's policy.
  expect(shared.headers()['content-security-policy']).toMatch(/default-src 'self'/);
  const pic = await request.get(`${site}/card/${id}.png`);
  expect(pic.headers()['content-type']).toBe('image/png');
  expect(pic.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  const bytes = (await pic.body()).toString('base64');
  const size = await page.evaluate(async (b64) => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }));
    return [bitmap.width, bitmap.height];
  }, bytes);
  expect(size).toEqual([1200, 630]);

  // The shortener's landing page with the same card.
  const made = await request.post(`${tinier}/api`, { data: { c: 'abc', iv: 'xyz', ttl: 3600 } });
  expect(made.status()).toBe(201);
  const { id: short } = (await made.json()) as { id: string };
  const landing = await (await request.get(`${tinier}/${short}?c=${id}`)).text();
  expect(content(landing, 'og:title')).toBe('Garden &quot;plan&quot;');
  expect(content(landing, 'og:image')).toBe(`${site}/card/${id}.png`);
});
