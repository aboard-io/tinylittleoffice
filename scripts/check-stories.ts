/**
 * Every story of the Storybook drawn in Chromium, and none with an error (docs/library.md, The Storybook): each is opened
 * alone, waited for until what it mounts has arrived (an editor's box says `data-ready`, stories/support.ts), and any
 * error on the console, any error thrown, and Storybook's own error display are said with the story's id; the script
 * exits 1 if there was one. Run after `npm run build-storybook`, it serves storybook-static/ itself; given an address,
 * it reads a running Storybook's instead (`npm run storybook`).
 *
 *   node scripts/check-stories.ts                         the built Storybook
 *   node scripts/check-stories.ts http://localhost:6006   a running one
 *   node scripts/check-stories.ts --only apps-            the stories whose ids begin so
 *   node scripts/check-stories.ts --static <dir>          a Storybook built into another folder
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
/** The built Storybook: storybook-static/, or the folder `--static` names (a build of one's own, `storybook build -o`). */
const STATIC = resolve(args.includes('--static') ? args[args.indexOf('--static') + 1] : join(ROOT, 'storybook-static'));
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
/** How long a story may take to draw what it mounts. */
const WAIT_MS = 15_000;
/** Pages open at once. */
const AT_ONCE = 4;

/** storybook-static/ served on a free port of this machine, as a static host would serve it. */
function serve(): Promise<{ url: string; server: Server }> {
  if (!existsSync(join(STATIC, 'index.json'))) throw new Error('no storybook-static/index.json: run npm run build-storybook first');
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = join(STATIC, path);
    if (!file.startsWith(STATIC)) return void res.writeHead(403).end();
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${(server.address() as { port: number }).port}`, server })));
}

/** One story drawn: the errors it had, none when it drew cleanly. */
async function check(page: Page, base: string, id: string): Promise<string[]> {
  const errors: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => void (m.type() === 'error' && errors.push(`console: ${m.text()}`));
  const onError = (e: Error) => void errors.push(`thrown: ${e.message}`);
  page.on('console', onConsole);
  page.on('pageerror', onError);
  try {
    await page.goto(`${base}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        const root = document.querySelector('#storybook-root');
        if (document.body.classList.contains('sb-show-errordisplay')) return true;
        if (!root || !root.childElementCount) return false;
        return [...root.querySelectorAll('[data-app]')].every((el) => el.hasAttribute('data-ready'));
      },
      undefined,
      { timeout: WAIT_MS },
    );
    if (await page.evaluate(() => document.body.classList.contains('sb-show-errordisplay')))
      errors.push(`storybook: ${(await page.textContent('#error-message').catch(() => '')) || 'the story threw'}`);
    // What the story fetches or draws after it arrives (the templates, a language, a map) has a moment to fail.
    await page.waitForTimeout(400);
  } catch (e) {
    errors.push(`never drew: ${(e as Error).message.split('\n')[0]}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onError);
  }
  return errors;
}

const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const given = args.find((a) => /^https?:/.test(a));
const served = given ? null : await serve();
const base = (given ?? served!.url).replace(/\/$/, '');
const index = (await (await fetch(`${base}/index.json`)).json()) as { entries: Record<string, { id: string; type: string }> };
const ids = Object.values(index.entries)
  .filter((e) => e.type === 'story' && e.id.startsWith(only))
  .map((e) => e.id);

const browser = await chromium.launch();
const failures: [string, string[]][] = [];
let next = 0;
await Promise.all(
  Array.from({ length: AT_ONCE }, async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    while (next < ids.length) {
      const id = ids[next++];
      const errors = await check(page, base, id);
      if (errors.length) failures.push([id, errors]);
    }
    await page.close();
  }),
);
await browser.close();
served?.server.close();

for (const [id, errors] of failures.sort()) console.log(`${id}\n${errors.map((e) => `  ${e}`).join('\n')}`);
console.log(`${ids.length} stories, ${ids.length - failures.length} drawn cleanly, ${failures.length} with errors`);
process.exit(failures.length ? 1 : 0);
