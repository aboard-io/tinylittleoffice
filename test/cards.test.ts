// Preview cards (backends/cards/cards.ts, served by the site's Worker, backends/cards/site.ts, and by the shortener's landing page): a
// card is kept a month and handed back as it came; what is refused, and why; the brake; a page asked for with ?c=
// carries the card's tags, escaped, and an unknown card leaves the page as built; what is read once is answered from
// the edge after. The generic cards (scripts/make-cards.ts, public/og/<app>.png) are drawn in the Plex stack and
// greeked: no word of the template's is left, a bar where each was.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { cardHtml, drawCards, pageOf } from '../scripts/make-cards.ts';
import { ogHtml } from '../scripts/icons.ts';
import { apps, appOf } from '../src/kit/core/apps.ts';
import { FONT, pageSvg } from '../src/kit/draw/draw.ts';
import { CARD_H as DRAWN_H, CARD_W as DRAWN_W } from '../src/kit/draw/card.ts';
import { CARD_PNG_MAX as CLIENT_PNG_MAX, CARD_TEXT, CARD_TITLE_MAX as CLIENT_TITLE_MAX, cardWords, withCardId } from '../src/kit/share/card.ts';
import { CARD_H, CARD_ID, CARD_PNG_MAX, CARD_TAGS, CARD_TEXT_MAX, CARD_TITLE_MAX, CARD_TTL, CARD_W, tagCount, type Edge } from '../backends/cards/cards.ts';
import { handleSite } from '../backends/cards/site.ts';
import { handle } from '../backends/tinier/tinier.ts';
import { DAILY } from '../backends/tinier/brake.ts';
import { MemStore } from './memstore.ts';
import { png } from './png.ts';

const KEY = 'a-key-for-the-tests';
const NOW = Date.UTC(2026, 9, 11, 12);
const DAY = 86_400_000;
const SITE = 'https://tinylittleoffice.com';
const SHELL = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replaceAll('%VITE_SITE_URL%', `${SITE}/`);

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');
const body = (o: Partial<{ png: string; title: string; text: string; app: string }> = {}) => JSON.stringify({ png: b64(png()), title: 'Plans', text: 'The first words.', app: 'write', ...o });

/** The built files: the shell at "/" and each app's page, as HTML; anything else 404. */
const assets = {
  fetch: async (req: Request) => {
    const path = new URL(req.url).pathname;
    return path === '/' || appOf(path.slice(1, -1))
      ? new Response(SHELL, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache, no-transform' } })
      : new Response('not found', { status: 404 });
  },
};
/** The edge in a Map, counting what it was asked. */
class MemEdge implements Edge {
  kept = new Map<string, Response>();
  async match(key: Request) {
    return this.kept.get(key.url)?.clone();
  }
  async put(key: Request, res: Response) {
    this.kept.set(key.url, res.clone());
  }
}
const site =
  (store: MemStore, edge: Edge = new MemEdge(), now = NOW) =>
  (req: Request) =>
    handleSite(req, { assets, store, key: KEY, edge, now });
const post = (text: string, ip = '1.2.3.4') => new Request(`${SITE}/card`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: text });
const get = (path: string) => new Request(`${SITE}${path}`);

test('a card is kept for a month under a new id and its picture handed back as it came, immutable', async () => {
  const store = new MemStore();
  const ask = site(store);
  const made = await ask(post(body()));
  expect(made.status).toBe(201);
  const { id, exp } = (await made.json()) as { id: string; exp: number };
  expect(id).toMatch(new RegExp(`^[abcdefghijkmnpqrstuvwxyz23456789]{${CARD_ID}}$`));
  expect(CARD_ID).toBe(12);
  expect(exp).toBe(NOW + 30 * DAY);
  expect(CARD_TTL).toBe(30 * DAY);
  expect(store.cards.get(id)).toMatchObject({ app: 'write', title: 'Plans', text: 'The first words.', exp });
  const pic = await ask(get(`/card/${id}.png`));
  expect(pic.status).toBe(200);
  expect(pic.headers.get('content-type')).toBe('image/png');
  expect(pic.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  expect(new Uint8Array(await pic.arrayBuffer())).toEqual(png());
  // Nothing else is there: another id, another name, another method.
  for (const r of [get('/card/zzzzzzz.png'), get(`/card/${id}`), get(`/card/${id}.jpg`), get('/card'), new Request(`${SITE}/card/${id}.png`, { method: 'DELETE' })])
    expect((await ask(r)).status, r.url).toBe(404);
});

test('what a card may be: a PNG of 1200 by 630 of at most 400 KB, a title of 120 characters, words of 300; over, 400 with the sentence, and not counted', async () => {
  expect([CARD_W, CARD_H, CARD_PNG_MAX, CARD_TITLE_MAX, CARD_TEXT_MAX]).toEqual([1200, 630, 400 * 1024, 120, 300]);
  // The browser draws and sends within them (src/kit/draw/card.ts, src/kit/share/card.ts).
  expect([DRAWN_W, DRAWN_H, CLIENT_PNG_MAX, CLIENT_TITLE_MAX]).toEqual([CARD_W, CARD_H, CARD_PNG_MAX, CARD_TITLE_MAX]);
  expect(CARD_TEXT).toBeLessThanOrEqual(CARD_TEXT_MAX);
  const store = new MemStore();
  const ask = site(store);
  const refused = async (text: string, said: string) => {
    const res = await ask(post(text));
    expect(res.status, said).toBe(400);
    expect(await res.json()).toEqual({ error: said });
  };
  await refused(body({ title: 'x'.repeat(121) }), 'The title is over 120 characters.');
  await refused(body({ text: 'x'.repeat(301) }), 'The text is over 300 characters.');
  await refused(body({ png: b64(png(1200, 630, 400 * 1024 + 1)) }), 'The picture is over 400 KB.');
  await refused(body({ png: b64(png(1200, 630, 900 * 1024)) }), 'The picture is over 400 KB.');
  await refused(body({ png: b64(png(1200, 600)) }), 'A card is a PNG of 1200 by 630.');
  await refused(body({ png: b64(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')) }), 'A card is a PNG of 1200 by 630.');
  // A PNG whole, or nothing: a chunk's checksum wrong, the end cut off, bytes after the end, or a header alone.
  const whole = png();
  await refused(body({ png: b64(Uint8Array.from(whole, (b, i) => (i === 40 ? b ^ 1 : b))) }), 'A card is a PNG of 1200 by 630.');
  await refused(body({ png: b64(whole.subarray(0, whole.length - 4)) }), 'A card is a PNG of 1200 by 630.');
  await refused(body({ png: b64(new Uint8Array([...whole, 0])) }), 'A card is a PNG of 1200 by 630.');
  await refused(body({ png: b64(whole.subarray(0, 33)) }), 'A card is a PNG of 1200 by 630.');
  // From another site's page, or not as JSON, it is no card and not counted (the brake would count the reader).
  const foreign: Record<string, string>[] = [
    { 'content-type': 'text/plain', 'cf-connecting-ip': '1.2.3.4' },
    { 'content-type': 'application/json', origin: 'https://evil.example', 'cf-connecting-ip': '1.2.3.4' },
    { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site', 'cf-connecting-ip': '1.2.3.4' },
  ];
  for (const headers of foreign) {
    const res = await ask(new Request(`${SITE}/card`, { method: 'POST', headers, body: body() }));
    expect(res.status, JSON.stringify(headers)).toBe(400);
  }
  await refused(body({ png: 'not base64 !' }), 'Bad request');
  await refused(body({ app: '../etc' }), 'Bad request');
  await refused('not json', 'Bad request');
  expect(store.cards.size).toBe(0);
  expect(store.brakes.size).toBe(0);
  // The site's own page, as the browser sends it: its origin and sec-fetch-site, as JSON.
  expect((await ask(new Request(`${SITE}/card`, { method: 'POST', headers: { 'content-type': 'application/json', origin: SITE, 'sec-fetch-site': 'same-origin' }, body: body() }))).status).toBe(201);
  // At the limits it is kept: 120 characters of title, 300 of words, 400 KB of picture; an emoji is one character.
  expect((await ask(post(body({ title: '😀'.repeat(120), text: 'x'.repeat(300), png: b64(png(1200, 630, 400 * 1024)) })))).status).toBe(201);
});

test('the brake: a hundred cards a day from one address, the 101st refused until the next UTC day', async () => {
  expect(DAILY).toBe(100);
  const store = new MemStore();
  const ask = site(store);
  for (let i = 0; i < 100; i++) expect((await ask(post(body()))).status, `card ${i + 1}`).toBe(201);
  const refused = await ask(post(body()));
  expect(refused.status).toBe(429);
  expect(await refused.json()).toEqual({ error: 'A hundred previews a day from one address; try tomorrow.' });
  expect(refused.headers.get('retry-after')).toBe(String(DAY / 2 / 1000));
  expect(store.cards.size).toBe(100);
  // Another address is not held back, and the next day counts afresh.
  expect((await ask(post(body(), '5.6.7.8'))).status).toBe(201);
  expect((await site(store, new MemEdge(), NOW + DAY / 2 + 1)(post(body()))).status).toBe(201);
});

/** A tag's content in a page. */
const content = (page: string, name: string) => new RegExp(`<meta (?:property|name)="${name.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`).exec(page)?.[1];

// The page a shared link opens (2026-10-15): the card's app's page, tagged, at /c/<id>; the one page the Worker runs for.
test('/c/<id> is the card’s app’s page with the card in its tags, cached an hour; unknown, expired or malformed goes home, keeping the hash', async () => {
  const store = new MemStore();
  const edge = new MemEdge();
  const ask = site(store, edge);
  const { id } = (await (await ask(post(body({ title: 'Trip "plans"', text: 'Day one.', app: 'trip' })))).json()) as { id: string };
  const res = await ask(get(`/c/${id}`));
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toBe('public, max-age=3600, no-transform');
  expect(res.headers.get('content-type')).toMatch(/^text\/html/);
  const page = await res.text();
  expect(content(page, 'og:title')).toBe('Trip &quot;plans&quot;');
  expect(content(page, 'og:description')).toBe('Day one.');
  expect(content(page, 'og:image')).toBe(`${SITE}/card/${id}.png`);
  for (const tag of CARD_TAGS) expect(tagCount(page, tag), tag).toBe(1);
  // Read once, kept at the edge.
  let reads = 0;
  const card = store.card.bind(store);
  store.card = (i) => (reads++, card(i));
  await ask(get(`/c/${id}`));
  expect(reads).toBe(0);
  expect(edge.kept.get(`${SITE}/c/${id}`)!.headers.get('cache-control')).toBe('public, max-age=3600, no-transform');
  // Gone, or never there: the home page, by a redirect that keeps the hash.
  for (const [path, now] of [
    ['/c/zzzzzzz', NOW],
    [`/c/${id}`, NOW + 30 * DAY + 1],
  ] as const) {
    const gone = await site(store, new MemEdge(), now)(get(path));
    expect(gone.status, path).toBe(302);
    expect(gone.headers.get('location'), path).toBe(`${SITE}/`);
  }
  // Not a card's id: the assets' own answer. A POST is no card.
  expect((await ask(get('/c/not-an-id'))).status).toBe(404);
  expect((await ask(get('/c/'))).status).toBe(404);
  expect((await ask(new Request(`${SITE}/c/${id}`, { method: 'POST' }))).status).toBe(404);
});

test('a page with ?c= (the links made before 2026-10-15), or any other query, is the page as built', async () => {
  const store = new MemStore();
  const { id } = (await (await site(store)(post(body()))).json()) as { id: string };
  for (const [path, now] of [
    ['/write/?c=zzzzzzz', NOW],
    ['/write/?c=not-an-id', NOW],
    ['/write/?other=1', NOW],
    ['/write/', NOW],
    [`/write/?c=${id}`, NOW + 30 * DAY + 1],
  ] as const) {
    const res = await site(store, new MemEdge(), now)(get(path));
    expect(res.status, path).toBe(200);
    expect(await res.text(), path).toBe(SHELL);
    expect(res.headers.get('cache-control'), path).toBe('no-cache, no-transform');
  }
});

test('the edge: a card and a page with it are read from the database once, however many fetchers come', async () => {
  const store = new MemStore();
  const edge = new MemEdge();
  const ask = site(store, edge);
  const { id } = (await (await ask(post(body()))).json()) as { id: string };
  let reads = 0;
  const [card, cardPng] = [store.card.bind(store), store.cardPng.bind(store)];
  store.card = (i) => (reads++, card(i));
  store.cardPng = (i) => (reads++, cardPng(i));
  const pages: string[] = [];
  for (let i = 0; i < 3; i++) pages.push(await (await ask(get(`/c/${id}`))).text());
  expect(reads).toBe(1);
  expect(new Set(pages).size).toBe(1);
  // The edge keeps the picture for the card's life; the fetcher is told a year, immutable.
  for (let i = 0; i < 3; i++) {
    const res = await ask(get(`/card/${id}.png`));
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(png());
  }
  expect(reads).toBe(2);
  expect(edge.kept.get(`${SITE}/card/${id}.png`)!.headers.get('cache-control')).toBe(`public, max-age=${30 * 86400}`);
  expect(edge.kept.get(`${SITE}/c/${id}`)!.headers.get('cache-control')).toBe('public, max-age=3600, no-transform');
});

test("the shortener's landing page carries the site's own card, each tag once, whatever its query", async () => {
  const store = new MemStore();
  const page = readFileSync(new URL('../backends/tinier/page.html', import.meta.url), 'utf8');
  for (const tag of CARD_TAGS) expect(tagCount(page, tag), tag).toBe(1);
  const { id: card } = (await (await site(store)(post(body({ title: 'Trip <notes>', text: 'Day one.' })))).json()) as { id: string };
  const made = await handle(
    new Request('https://tinier.tinylittleoffice.com/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ c: 'abc', iv: 'xyz', ttl: 3600 }) }),
    store,
    KEY,
    page,
    NOW,
  );
  const { id } = (await made.json()) as { id: string };
  const text = await (await handle(new Request(`https://tinier.tinylittleoffice.com/${id}?c=${card}`), store, KEY, page, NOW)).text();
  expect(content(text, 'og:image')).toBe(`${SITE}/og.png`);
  expect(content(text, 'og:title')).toBe('Tiny Little Office');
  expect(text).toContain(`const id = '${id}'`);
});

test('the sweep forgets expired cards with expired links; a card a month old is gone', async () => {
  const store = new MemStore();
  const ask = site(store);
  const { id } = (await (await ask(post(body()))).json()) as { id: string };
  const later = NOW + 30 * DAY + 1;
  expect((await site(store, new MemEdge(), NOW + 30 * DAY - 1)(get(`/card/${id}.png`))).status).toBe(200);
  expect((await site(store, new MemEdge(), later)(get(`/card/${id}.png`))).status).toBe(404);
  await store.sweep(NOW + DAY);
  expect(store.cards.size).toBe(1);
  await store.sweep(later);
  expect(store.cards.size).toBe(0);
});

// The pages are static assets, never the Worker's: on launch day (2026-10-15) every visit through the Worker passed the
// free plan's 100,000 requests a day and the pages answered 429. Only the cards run it.
test("the site's Worker runs first only for the cards and a shared link's /c/<id> page: an app's page, with or without ?c=, is a static asset", () => {
  const jsonc = readFileSync(new URL('../backends/cloudflare/site/wrangler.jsonc', import.meta.url), 'utf8');
  const first = JSON.parse(/"run_worker_first": (\[[^\]]*\])/.exec(jsonc)![1]);
  expect(first).toEqual(['/c/*', '/card', '/card/*']);
  for (const a of apps()) expect(first).not.toContain(`/${a.id}/`);
  expect(jsonc).toMatch(/"main": "worker\.ts"/);
  expect(jsonc).toMatch(/"binding": "ASSETS"/);
  // The cards are in the shortener's database: the same one, by its id.
  const id = (f: string) => /"database_id": "([^"]+)"/.exec(readFileSync(new URL(f, import.meta.url), 'utf8'))![1];
  expect(id('../backends/cloudflare/site/wrangler.jsonc')).toBe(id('../backends/cloudflare/tinier/wrangler.jsonc'));
  // The site's robots.txt lets every fetcher in, so a network can read a card's page.
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
  expect(robots).toMatch(/^Allow: \/$/m);
  expect(robots).not.toMatch(/^Disallow:/im);
});

test("what a document's card says: its title, then its first 200 characters of words (the title not twice), or the app's line; the link carries the id before the #", () => {
  const write = appOf('write')!;
  const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ');
  const said = cardWords(write, `---\ntitle: Plans\n---\n# Plans\n\n**Bold** start, then ${long}\n`, 'Plans');
  expect(said.title).toBe('Plans');
  expect(said.text.startsWith('Bold start, then word0 word1')).toBe(true);
  expect([...said.text].length).toBeLessThanOrEqual(CARD_TEXT);
  expect(said.text.endsWith('…')).toBe(true);
  expect(cardWords(write, '', '').text).toBe(write.blurb);
  expect(cardWords(write, '', 'x'.repeat(200)).title.length).toBeLessThanOrEqual(CARD_TITLE_MAX);
  expect(withCardId(`${SITE}/write/#/v1/write/abc?lang=fr`, 'k8hwicw', `${SITE}/`)).toBe(`${SITE}/c/k8hwicw#/v1/write/abc?lang=fr`);
  expect(withCardId(`${SITE}/office/sheet/#/v1/sheet/abc`, 'k8hwicw', `${SITE}/office/`)).toBe(`${SITE}/office/c/k8hwicw#/v1/sheet/abc`);
});

/* ---------- the generic cards ---------- */

const plex = (html: string) => {
  expect(html).toContain(`font-family:${FONT}`);
  expect(FONT.startsWith("'IBM Plex Sans'")).toBe(true);
  expect(html).not.toMatch(/font-family="?system-ui/);
  // Every face of src/styles/fonts.css, its file inline.
  const faces = [...html.matchAll(/@font-face\s*\{[^}]*\}/g)].map((m) => m[0]);
  expect(faces).toHaveLength(16);
  for (const f of faces) expect(f).toMatch(/src:\s*url\('data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}'\) format\('woff2'\)/);
  expect(html).not.toContain('/fonts/');
};

test("an app card is drawn in the Plex stack, with the site's faces inline", async () => {
  plex(await cardHtml(appOf('write')!));
});

test("og.png is drawn in the Plex stack, with the site's faces inline", () => {
  plex(ogHtml);
  expect(ogHtml).toContain('Tiny Little Office');
});

/** The <text> elements of a page that hold words. */
const worded = (svg: string) => [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].filter((m) => m[1].replace(/<[^>]*>/g, '').trim()).length;

test("every app's generic card is greeked: no word of the template's left, a bar where each was, the app's name in ink", { timeout: 60_000 }, async () => {
  const drawn = await drawCards(apps(), '');
  for (const [i, def] of apps().entries()) {
    const html = drawn[i];
    const page = pageSvg(await pageOf(def));
    expect(worded(page), def.id).toBeGreaterThan(0);
    expect(html, def.id).not.toMatch(/<text\b/);
    expect(html, def.id).not.toMatch(/<image\b|<foreignObject\b/);
    expect([...html.matchAll(/<rect [^>]*class="greek"/g)].length, def.id).toBe(worded(page));
    // The words that stay are the app's own, in HTML: its name and its line.
    expect(html, def.id).toContain(`<h1>${def.name}</h1>`);
  }
});
