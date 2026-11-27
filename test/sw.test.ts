// The service worker (src/sw.ts) and its list (scripts/sw-manifest.ts), under node: the worker's own source, its types
// stripped and its list filled as the build fills it, run in a scope of fakes (the caches, the network) and driven by
// the events a browser sends. What it keeps at install, what it keeps once fetched, how a page is answered online and
// offline, that a link's "?c=" page is never kept, and that a new build's worker deletes the old caches and no one else's.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { fill, UNFILLED, writeWorker } from '../scripts/sw-manifest.ts';

const SOURCE = stripTypeScriptTypes(readFileSync(new URL('../src/sw.ts', import.meta.url), 'utf8'));
const ROOT = 'https://site.test/';

/** The browser's caches, as a map of names to maps of addresses to responses. */
function fakeCaches() {
  const store = new Map<string, Map<string, Response>>();
  const key = (r: RequestInfo | URL) => (typeof r === 'string' ? r : r instanceof URL ? r.href : r.url);
  const open = async (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const c = store.get(name)!;
    return {
      put: async (r: RequestInfo, res: Response) => void c.set(key(r), res),
      addAll: async (urls: string[]) => {
        for (const u of urls) c.set(u, new Response(`kept ${u}`));
      },
    };
  };
  return {
    store,
    api: {
      open,
      keys: async () => [...store.keys()],
      delete: async (name: string) => store.delete(name),
      match: async (r: RequestInfo) => {
        for (const c of store.values()) if (c.has(key(r))) return c.get(key(r))!.clone();
        return undefined;
      },
    },
  };
}

/** The worker started in a scope of fakes; `online` says whether the network answers. */
function start(files: string[]) {
  const listeners = new Map<string, (e: unknown) => void>();
  const caches = fakeCaches();
  const net = { online: true, asked: [] as string[] };
  const scope = {
    addEventListener: (type: string, f: (e: unknown) => void) => listeners.set(type, f),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    registration: { scope: ROOT },
    location: { origin: new URL(ROOT).origin },
  };
  const fetch = async (r: Request) => {
    net.asked.push(r.url);
    if (!net.online) throw new TypeError('Failed to fetch');
    return new Response(`fresh ${r.url}`);
  };
  new Function('self', 'caches', 'fetch', fill(SOURCE, { cache: 'tlo-new', files }))(scope, caches.api, fetch);
  const wait = async (type: string) => {
    let p: Promise<unknown> = Promise.resolve();
    listeners.get(type)!({ waitUntil: (q: Promise<unknown>) => (p = q) });
    await p;
  };
  /** A request through the worker: its answer, or null where it lets the browser go to the network itself. */
  const ask = async (url: string, init?: RequestInit): Promise<string | null> => {
    const answer: { r: Promise<Response> | null } = { r: null };
    listeners.get('fetch')!({ request: new Request(url, init), respondWith: (r: Promise<Response>) => (answer.r = r) });
    return answer.r ? (await answer.r).text() : null;
  };
  const kept = (name = 'tlo-new') => [...(caches.store.get(name)?.keys() ?? [])];
  return { caches, net, wait, ask, kept };
}

test('the build fills the worker’s list where the source leaves it, and says so when the source has none to fill', () => {
  expect(SOURCE).toContain(`'${UNFILLED}'`);
  const filled = fill(SOURCE, { cache: 'tlo-abc', files: ['', 'write/'] });
  expect(filled).not.toContain(UNFILLED);
  expect(filled).toContain(JSON.stringify(JSON.stringify({ cache: 'tlo-abc', files: ['', 'write/'] })));
  expect(() => fill('const BUILD = {};', { cache: 'tlo-abc', files: [] })).toThrow(/not there/);
});

let dir = '';
afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

test('the list: the pages, the app file and the stylesheet, the manifest and icons, the Latin faces; the cache named by their bytes', () => {
  dir = mkdtempSync(join(tmpdir(), 'tlo-sw-'));
  const put = (p: string, s = p) => (mkdirSync(join(dir, p, '..'), { recursive: true }), writeFileSync(join(dir, p), s));
  for (const p of ['index.html', 'write/index.html', 'assets/app-AAAAAAAA.js', 'assets/app-AAAAAAAA.css', 'assets/templates-write-AAAAAAAA.js', 'assets/lang-fr-AAAAAAAA.js', 'manifest.webmanifest'])
    put(p);
  for (const p of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) put(p);
  for (const f of ['IBMPlexSans-Regular', 'IBMPlexSans-SemiBold', 'IBMPlexSerif-Regular', 'IBMPlexSerif-SemiBold', 'IBMPlexMono-Regular', 'IBMPlexSansArabic-Regular']) put(`fonts/${f}.woff2`);
  put('sw.js', `var t=JSON.parse(\`${UNFILLED}\`);`);
  const build = writeWorker(dir, ['write']);
  expect(build.files).toStrictEqual([
    '',
    'write/',
    'assets/app-AAAAAAAA.css',
    'assets/app-AAAAAAAA.js',
    'manifest.webmanifest',
    'favicon.svg',
    'favicon-32.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'fonts/IBMPlexSans-Regular.woff2',
    'fonts/IBMPlexSans-SemiBold.woff2',
    'fonts/IBMPlexSerif-Regular.woff2',
    'fonts/IBMPlexSerif-SemiBold.woff2',
    'fonts/IBMPlexMono-Regular.woff2',
  ]);
  expect(build.cache).toMatch(/^tlo-[0-9a-f]{12}$/);
  expect(readFileSync(join(dir, 'sw.js'), 'utf8')).toBe(`var t=JSON.parse(${JSON.stringify(JSON.stringify(build))});`);
  // Same bytes, same name; a page changed, a new name (so a deploy is a new worker).
  put('sw.js', `var t=JSON.parse(\`${UNFILLED}\`);`);
  expect(writeWorker(dir, ['write']).cache).toBe(build.cache);
  put('write/index.html', 'changed');
  put('sw.js', `var t=JSON.parse(\`${UNFILLED}\`);`);
  expect(writeWorker(dir, ['write']).cache).not.toBe(build.cache);
});

test('installed, it keeps the list; a hashed file and a face are kept once fetched and served from the cache after', async () => {
  const w = start(['', 'write/', 'assets/app-AAAAAAAA.js']);
  await w.wait('install');
  expect(w.kept()).toStrictEqual([ROOT, `${ROOT}write/`, `${ROOT}assets/app-AAAAAAAA.js`]);
  expect(await w.ask(`${ROOT}assets/app-AAAAAAAA.js`)).toBe(`kept ${ROOT}assets/app-AAAAAAAA.js`);
  expect(await w.ask(`${ROOT}assets/templates-write-BBBBBBBB.js`)).toBe(`fresh ${ROOT}assets/templates-write-BBBBBBBB.js`);
  expect(await w.ask(`${ROOT}fonts/IBMPlexSansArabic-Regular.woff2`)).toBe(`fresh ${ROOT}fonts/IBMPlexSansArabic-Regular.woff2`);
  expect(w.kept()).toContain(`${ROOT}assets/templates-write-BBBBBBBB.js`);
  expect(w.kept()).toContain(`${ROOT}fonts/IBMPlexSansArabic-Regular.woff2`);
  w.net.online = false;
  expect(await w.ask(`${ROOT}assets/templates-write-BBBBBBBB.js`)).toBe(`fresh ${ROOT}assets/templates-write-BBBBBBBB.js`);
  // Never fetched, not there: the page's import fails, and the page says so (kit/ui/home.ts).
  await expect(w.ask(`${ROOT}assets/templates-sheet-CCCCCCCC.js`)).rejects.toThrow('Failed to fetch');
});

test('a page is the network’s while there is one, kept afresh at its address; offline the kept copy; a "?c=" page is never kept', async () => {
  const w = start(['', 'write/']);
  await w.wait('install');
  expect(await w.ask(`${ROOT}write/`, { mode: 'same-origin' })).toBe(`fresh ${ROOT}write/`);
  expect(await w.ask(`${ROOT}write/?c=abc123`)).toBe(`fresh ${ROOT}write/?c=abc123`);
  expect(await w.ask(`${ROOT}c/abc1234`)).toBe(`fresh ${ROOT}c/abc1234`);
  expect(w.kept()).toStrictEqual([ROOT, `${ROOT}write/`]);
  w.net.online = false;
  expect(await w.ask(`${ROOT}write/`)).toBe(`fresh ${ROOT}write/`);
  // The card's words were never kept: offline, the page at its address answers, as the page with no card.
  expect(await w.ask(`${ROOT}write/?c=abc123&lang=fr`)).toBe(`fresh ${ROOT}write/`);
  // Not the site's, not a GET: the worker stays out of it.
  expect(await w.ask('https://tiles.openfreemap.org/planet/1/1/1.pbf')).toBeNull();
  expect(await w.ask(`${ROOT}card`, { method: 'POST', body: '{}' })).toBeNull();
});

test('activated, a new build’s worker deletes the caches of the builds before it, and no one else’s', async () => {
  const w = start(['']);
  await w.caches.api.open('tlo-old');
  await w.caches.api.open('someone-else');
  await w.wait('install');
  await w.wait('activate');
  expect([...w.caches.store.keys()].sort()).toStrictEqual(['someone-else', 'tlo-new']);
});
