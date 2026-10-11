// media, the picture proxy: what it fetches, what it refuses, what it hands back, what it keeps.
import { test, expect } from 'vitest';
import { fetchable, handle, MAX_BYTES, UA, type CacheLike, type Deps } from '../media/media.ts';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const CAT = 'https://images.unsplash.com/cat.png';
const ask = (u: string | null, method = 'GET', headers: Record<string, string> = {}) =>
  new Request(`https://media.tinylittleoffice.com/img${u === null ? '' : `?u=${encodeURIComponent(u)}`}`, {
    method,
    headers: { 'cf-connecting-ip': '1.2.3.4', cookie: 'who=me', referer: 'https://tinylittleoffice.com/write/', ...headers },
  });

/** A web of addresses, each answering as told; every request it was asked is kept. */
function web(pages: Record<string, () => Response>) {
  const asked: { url: string; init?: RequestInit }[] = [];
  const fetch = async (input: Request | string, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    asked.push({ url, init });
    const page = pages[url];
    return page ? page() : new Response('no', { status: 404 });
  };
  return { fetch, asked };
}
const png =
  (headers: Record<string, string> = {}) =>
  () =>
    new Response(PNG, { headers: { 'content-type': 'image/png', 'set-cookie': 'track=1', etag: '"x"', server: 'origin', ...headers } });
const yes = async () => true;
const deps = (pages: Record<string, () => Response>, more: Partial<Deps> = {}) => {
  const w = web(pages);
  return { w, d: { fetch: w.fetch, allowed: yes, ...more } as Deps };
};

test('media: a picture is fetched once with nothing of the reader, and handed back under the proxy’s own headers', async () => {
  const { w, d } = deps({ [CAT]: png() });
  const res = await handle(ask(CAT), d);
  expect(res.status).toBe(200);
  expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
  expect(res.headers.get('content-type')).toBe('image/png');
  expect(res.headers.get('cache-control')).toBe('public, max-age=604800, immutable');
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'");
  expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  expect(res.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
  expect(res.headers.get('access-control-allow-origin')).toBe('https://tinylittleoffice.com');
  // Nothing of the origin's but the type.
  for (const h of ['set-cookie', 'etag', 'server', 'vary']) expect(res.headers.get(h)).toBeNull();
  // Nothing of the reader's: no cookie, no referrer, no address.
  expect(w.asked).toHaveLength(1);
  const sent = new Headers(w.asked[0].init?.headers);
  expect([...sent.keys()]).toEqual(['accept', 'user-agent']);
  // The proxy names itself and nothing else: Wikimedia answers an unnamed fetcher with 403 (2026-10-11).
  expect(sent.get('user-agent')).toBe(UA);
  expect(w.asked[0].init?.redirect).toBe('manual');
});

test('media: only https addresses with a public name on the default port', async () => {
  const { w, d } = deps({});
  for (const bad of [
    null,
    '',
    'nonsense',
    'http://images.unsplash.com/a.png',
    'ftp://x.org/a.png',
    'data:image/png;base64,AA',
    'https://127.0.0.1/a.png',
    'https://[::1]/a.png',
    'https://localhost/a.png',
    'https://printer.local/a.png',
    'https://intranet/a.png',
    'https://x.org:8443/a.png',
    'https://u:p@x.org/a.png',
  ]) {
    const res = await handle(ask(bad), d);
    expect(res.status, String(bad)).toBe(400);
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
  }
  expect(w.asked).toHaveLength(0);
  expect(fetchable('https://upload.wikimedia.org/a.png#x')?.href).toBe('https://upload.wikimedia.org/a.png');
});

test('media: redirects are followed by hand, three at most, each under the same rules', async () => {
  const hop = (to: string) => () => new Response(null, { status: 302, headers: { location: to } });
  const three = deps({
    [CAT]: hop('/b'),
    'https://images.unsplash.com/b': hop('https://live.staticflickr.com/c'),
    'https://live.staticflickr.com/c': hop('https://live.staticflickr.com/d.png'),
    'https://live.staticflickr.com/d.png': png(),
  });
  expect((await handle(ask(CAT), three.d)).status).toBe(200);
  expect(three.w.asked.map((a) => a.url)).toEqual([CAT, 'https://images.unsplash.com/b', 'https://live.staticflickr.com/c', 'https://live.staticflickr.com/d.png']);
  const four = deps({
    [CAT]: hop('/b'),
    'https://images.unsplash.com/b': hop('/c'),
    'https://images.unsplash.com/c': hop('/d'),
    'https://images.unsplash.com/d': hop('/e'),
    'https://images.unsplash.com/e': png(),
  });
  expect((await handle(ask(CAT), four.d)).status).toBe(502);
  const inward = deps({ [CAT]: hop('http://127.0.0.1/admin.png') });
  expect((await handle(ask(CAT), inward.d)).status).toBe(502);
  expect(inward.w.asked).toHaveLength(1);
});

test('media: only pictures; SVG only as image/svg+xml, under a policy that runs nothing', async () => {
  const page = deps({ [CAT]: () => new Response('<html>', { headers: { 'content-type': 'text/html' } }) });
  expect((await handle(ask(CAT), page.d)).status).toBe(415);
  const none = deps({ [CAT]: () => new Response(PNG) });
  expect((await handle(ask(CAT), none.d)).status).toBe(415);
  const oddSvg = deps({ [CAT]: () => new Response('<svg/>', { headers: { 'content-type': 'image/svg' } }) });
  expect((await handle(ask(CAT), oddSvg.d)).status).toBe(415);
  const svg = deps({ [CAT]: () => new Response('<svg xmlns="http://www.w3.org/2000/svg"/>', { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } }) });
  const res = await handle(ask(CAT), svg.d);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('image/svg+xml');
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; style-src 'unsafe-inline'");
});

test('media: 5 MB at most, by its length or as it streams', async () => {
  const said = deps({ [CAT]: png({ 'content-length': String(MAX_BYTES + 1) }) });
  expect((await handle(ask(CAT), said.d)).status).toBe(413);
  let pulled = 0;
  const endless = () =>
    new Response(
      new ReadableStream<Uint8Array>({
        pull(c) {
          pulled++;
          c.enqueue(new Uint8Array(1024 * 1024));
        },
      }),
      { headers: { 'content-type': 'image/jpeg' } },
    );
  const streamed = deps({ [CAT]: endless });
  const res = await handle(ask(CAT), streamed.d);
  expect(res.status).toBe(413);
  // Cut off just past the cap, not read to the end.
  expect(pulled).toBeLessThan(10);
});

test('media: a picture not there is 404; a site that fails, or takes too long, is 502', async () => {
  expect((await handle(ask(CAT), deps({}).d)).status).toBe(404);
  expect((await handle(ask(CAT), deps({ [CAT]: () => new Response('x', { status: 500 }) }).d)).status).toBe(502);
  const down = { fetch: async () => Promise.reject(new TypeError('network')), allowed: yes } as Deps;
  expect((await handle(ask(CAT), down)).status).toBe(502);
  const slow: Deps = {
    allowed: yes,
    timeout: 20,
    fetch: (_u, init) => new Promise((_, no) => init?.signal?.addEventListener('abort', () => no(init.signal!.reason))),
  };
  expect((await handle(ask(CAT), slow)).status).toBe(502);
});

test('media: kept at the edge by the address alone, and asked of the site once', async () => {
  const kept = new Map<string, Response>();
  const cache: CacheLike = {
    async match(r) {
      return kept.get(r.url)?.clone();
    },
    async put(r, res) {
      kept.set(r.url, res);
    },
  };
  const later: Promise<unknown>[] = [];
  const { w, d } = deps({ [CAT]: png() }, { cache, later: (p) => later.push(p) });
  expect((await handle(ask(CAT), d)).status).toBe(200);
  await Promise.all(later);
  expect([...kept.keys()]).toEqual([`https://media.tinylittleoffice.com/img?u=${encodeURIComponent(CAT)}`]);
  const again = await handle(ask(CAT, 'GET', { 'cf-connecting-ip': '5.6.7.8', cookie: 'other' }), d);
  expect(again.status).toBe(200);
  expect(new Uint8Array(await again.arrayBuffer())).toEqual(PNG);
  expect(w.asked).toHaveLength(1);
  // An error is never kept.
  const miss = deps({}, { cache, later: (p) => later.push(p) });
  await handle(ask('https://images.unsplash.com/gone.png'), miss.d);
  expect(kept.size).toBe(1);
});

test('media: a brake per client, CORS for the site alone, nothing else answered', async () => {
  const keys: string[] = [];
  const { w, d } = deps({ [CAT]: png() }, { allowed: async (k) => (keys.push(k), false) });
  const res = await handle(ask(CAT), d);
  expect(res.status).toBe(429);
  expect(keys).toEqual(['1.2.3.4']);
  expect(w.asked).toHaveLength(0);
  const pre = await handle(ask(null, 'OPTIONS'), deps({}).d);
  expect(pre.status).toBe(204);
  expect(pre.headers.get('access-control-allow-origin')).toBe('https://tinylittleoffice.com');
  expect(pre.headers.get('access-control-allow-methods')).toBe('GET');
  const local = await handle(ask(null, 'OPTIONS'), deps({}, { site: 'http://localhost:4178' }).d);
  expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:4178');
  expect((await handle(ask(CAT, 'POST'), deps({}).d)).status).toBe(405);
  expect((await handle(new Request('https://media.tinylittleoffice.com/'), deps({}).d)).status).toBe(404);
});

test('media: the folder logs nothing', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../media/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts') && !n.endsWith('.d.ts'))) expect(readFileSync(new URL(f, dir), 'utf8'), f).not.toMatch(/console\.|\.log\(/);
  expect(readFileSync(new URL('wrangler.jsonc', dir), 'utf8')).toMatch(/"observability": \{ "enabled": false \}/);
});
