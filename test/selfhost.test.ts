// The self-hosted process (backends/node/): node:http as the Fetch API, the built files with the headers dist/_headers gives
// them, and a short link and a preview card made and read through the two listeners, over a SQLite database in memory.
import { test, expect, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fillHeaders } from '../scripts/headers.ts';
import { assets, MAX_BODY, send, toRequest } from '../backends/node/http.ts';
import { options, start } from '../backends/node/server.ts';
import { png as wholePng } from './png.ts';

/** A built site in small: the real _headers, filled as the build fills it, and a page or two. */
const dist = mkdtempSync(join(tmpdir(), 'tlo-selfhost-'));
const HEADERS = fillHeaders(readFileSync(new URL('../public/_headers', import.meta.url), 'utf8'), { scripts: ["'sha256-x'"], tinier: 'http://localhost:8001/' });
const PAGE = (title: string) => `<!doctype html><title>${title}</title><meta property="og:title" content="Tiny Little Office"><meta property="og:image" content="/og.png">`;
writeFileSync(join(dist, '_headers'), HEADERS);
writeFileSync(join(dist, 'index.html'), PAGE('Home'));
writeFileSync(join(dist, '404.html'), PAGE('Not here'));
mkdirSync(join(dist, 'write'));
writeFileSync(join(dist, 'write', 'index.html'), PAGE('Word Processor'));
mkdirSync(join(dist, 'assets'));
writeFileSync(join(dist, 'assets', 'app-abc.js'), 'console.log(1)');
afterAll(() => rmSync(dist, { recursive: true, force: true }));

/** The policy the file says for `/` (the first rule's), as a line of the file. */
const policy = (/^\s+Content-Security-Policy: (.+)$/m.exec(HEADERS) ?? [])[1];
const files = assets(dist);
const get = (path: string, init?: RequestInit) => files.fetch(new Request(`http://box${path}`, init));

test('the policy reaches the browser exactly as dist/_headers says it, on the home page, an app’s page and a missing one', async () => {
  expect(policy).toMatch(/^default-src 'self'; script-src 'self' 'sha256-x';/);
  for (const path of ['/', '/write/', '/nowhere']) expect((await get(path)).headers.get('content-security-policy'), path).toBe(policy);
  // The build's own shortener is the one the pages may reach, in place of ours.
  expect(policy).toMatch(/connect-src 'self' data: [^;]*http:\/\/localhost:8001;/);
  expect(policy).not.toContain('tinier.tinylittleoffice.com');
  const home = await get('/');
  expect(home.headers.get('cache-control')).toBe('no-cache, no-transform');
  expect(home.headers.get('x-content-type-options')).toBe('nosniff');
  expect(home.headers.get('content-type')).toBe('text/html; charset=utf-8');
  expect(await home.text()).toContain('<title>Home');
  expect((await get('/assets/app-abc.js')).headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
});

test('the files as Cloudflare serves them: a folder at its slash, 404.html for what is not there, nothing outside the build, no _headers, a 304 for what the browser has', async () => {
  const bare = await get('/write?x=1');
  expect(bare.status).toBe(307);
  expect(bare.headers.get('location')).toBe('/write/?x=1');
  const missing = await get('/nowhere');
  expect(missing.status).toBe(404);
  expect(await missing.text()).toContain('Not here');
  expect((await get('/_headers')).status).toBe(404);
  for (const path of ['//_headers', '/x/..%2F_headers', '/_redirects', '/./_headers']) expect((await get(path)).status, path).toBe(404);
  expect((await get('/%2e%2e/%2e%2e/etc/passwd')).status).toBe(404);
  expect((await get('/', { method: 'POST' })).status).toBe(404);
  const etag = (await get('/')).headers.get('etag')!;
  expect((await get('/', { headers: { 'if-none-match': etag } })).status).toBe(304);
});

/** A node server over one handler, through the adapters, and its address. */
async function through(answer: (req: Request) => Promise<Response>, ipHeader = ''): Promise<{ url: string; server: Server }> {
  const server = createServer(async (req, res) => {
    const request = await toRequest(req, 'http://box', ipHeader);
    await send(res, request ? await answer(request) : new Response('Too large', { status: 413 }), String(req.headers['accept-encoding'] ?? ''));
  });
  await new Promise<void>((ready) => server.listen(0, '127.0.0.1', ready));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
}

test('the adapters: method, path, headers and body in; status, headers and body out; gzip when asked; the address that asked, never the client’s claim', async () => {
  let seen: Request | undefined;
  const { url, server } = await through(async (req) => {
    seen = req;
    const body = await req.text();
    return new Response(JSON.stringify({ body }), { status: 201, headers: { 'content-type': 'application/json', 'x-one': 'a' } });
  });
  const res = await fetch(`${url}/api/x?y=1`, { method: 'POST', body: 'hello', headers: { 'cf-connecting-ip': '9.9.9.9', 'x-mine': 'yes' } });
  expect(res.status).toBe(201);
  expect(res.headers.get('x-one')).toBe('a');
  expect(res.headers.get('content-encoding')).toBe('gzip');
  expect(await res.json()).toEqual({ body: 'hello' });
  expect(seen!.url).toBe('http://box/api/x?y=1');
  expect(seen!.method).toBe('POST');
  expect(seen!.headers.get('x-mine')).toBe('yes');
  expect(seen!.headers.get('cf-connecting-ip')).toBe('127.0.0.1');
  // Over the limit, refused before the handler.
  expect((await fetch(`${url}/`, { method: 'POST', body: 'x'.repeat(MAX_BODY + 1) })).status).toBe(413);
  server.close();
  // Behind a proxy that names the reader.
  const proxied = await through(async (req) => new Response(req.headers.get('cf-connecting-ip')), 'x-forwarded-for');
  // The proxy appended the address it saw; the first is whatever the client wrote (a review, 2026-10-17).
  expect(await (await fetch(proxied.url, { headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' } })).text()).toBe('10.0.0.1');
  expect(await (await fetch(proxied.url, { headers: { 'x-forwarded-for': '10.0.0.2' } })).text()).toBe('10.0.0.2');
  proxied.server.close();
});

test('the environment: BRAKE_KEY required and said so; the site’s address, the ports and the file by default', () => {
  expect(() => options({})).toThrow(/BRAKE_KEY is not set/);
  const o = options({ BRAKE_KEY: 'k' });
  expect(o).toMatchObject({ key: 'k', site: 'http://localhost:8000', port: 8000, tinierPort: 8001, host: '0.0.0.0' });
  expect(o.db).toMatch(/data\/tinier\.sqlite$/);
  expect(options({ BRAKE_KEY: 'k', SITE: 'https://office.example.org/' }).site).toBe('https://office.example.org');
});

/** A PNG of 1200 by 630, whole as the card's check reads it (test/cards.test.ts png), as base64. */
const png = () => btoa(String.fromCharCode(...wholePng(1200, 630, 200)));

test('one process, two listeners: a short link made and read back, its landing page, and a preview card at /c/<id> on the app’s page', async () => {
  const SITE = 'http://office.test';
  const running = await start({ ...options({ BRAKE_KEY: 'k', SITE }), port: 0, tinierPort: 0, host: '127.0.0.1', db: ':memory:', dist });
  const at = (s: Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
  try {
    const tinier = at(running.tinier);
    const made = await fetch(`${tinier}/api`, { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE }, body: JSON.stringify({ c: 'abc~_123', iv: 'xyz', ttl: 3600 }) });
    expect(made.status).toBe(201);
    expect(made.headers.get('access-control-allow-origin')).toBe(SITE);
    const { id } = (await made.json()) as { id: string };
    expect(await (await fetch(`${tinier}/api/${id}`)).json()).toMatchObject({ c: 'abc~_123', iv: 'xyz' });
    const landing = await fetch(`${tinier}/${id}`);
    expect(landing.status).toBe(200);
    expect(await landing.text()).toContain(SITE);
    expect((await fetch(`${tinier}/api/zzzzzzz`)).status).toBe(404);

    const site = at(running.site);
    expect(await (await fetch(`${site}/`)).text()).toContain('<title>Home');
    const card = await fetch(`${site}/card`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ png: png(), title: 'Our plan', text: 'Words.', app: 'write' }),
    });
    expect(card.status).toBe(201);
    const { id: cid } = (await card.json()) as { id: string };
    const shared = await fetch(`${site}/c/${cid}`);
    expect(shared.status).toBe(200);
    expect(shared.headers.get('content-security-policy')).toBe(policy);
    const html = await shared.text();
    expect(html).toContain('<title>Word Processor');
    expect(html).toContain('<meta property="og:title" content="Our plan">');
    expect((await fetch(`${site}/card/${cid}.png`)).headers.get('content-type')).toBe('image/png');
    // An unknown card goes home, where the hash still opens the document.
    expect((await fetch(`${site}/c/zzzzzzz`, { redirect: 'manual' })).status).toBe(302);
  } finally {
    await running.close();
  }
});
