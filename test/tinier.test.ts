// tinier: links kept for their time and handed back, never changed; a hundred a day from one address, counted
// under a keyed hash kept for a day; what it refuses; the D1 rows and their schema, on SQLite.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { D1Store, type SQL } from '../tinier/d1.ts';
import { brakeHash, brakeKey, DAILY, dayOf, handle, MAX_BYTES, newId, TTLS } from '../tinier/tinier.ts';
import { MemStore } from './memstore.ts';
import { EXPIRIES, SHORT_MAX } from '../src/kit/short.ts';

const PAGE = '<p>{{id}}</p>';
const KEY = 'a-key-for-the-tests';
const DAY = 86_400_000;
const NOW = 1_700_000_000_000;
const req = (method: string, path: string, body?: unknown, ip = '1.2.3.4') =>
  new Request(`https://tinier.test${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
const post = (body: unknown, ip?: string) => req('POST', '/api', body, ip);
const LINK = { c: 'abc~_123', iv: 'xyz', ttl: 3600 };

test('tinier: a link is kept for its time, handed back as it came, and then gone', async () => {
  const store = new MemStore();
  const made = await handle(post(LINK), store, KEY, PAGE, NOW);
  expect(made.status).toBe(201);
  expect(made.headers.get('access-control-allow-origin')).toBe('https://tinylittleoffice.com');
  const { id, exp } = (await made.json()) as { id: string; exp: number };
  expect(id).toMatch(/^[a-z0-9]{7}$/);
  expect(exp).toBe(NOW + 3_600_000);
  expect(store.rows.get(id)).toEqual({ c: 'abc~_123', iv: 'xyz', exp });

  const got = await handle(req('GET', `/api/${id}`), store, KEY, PAGE, NOW + 1000);
  expect(got.status).toBe(200);
  expect(await got.json()).toEqual({ c: 'abc~_123', iv: 'xyz', exp });

  const page = await handle(req('GET', `/${id}`), store, KEY, PAGE, NOW + 1000);
  expect(page.status).toBe(200);
  expect(await page.text()).toBe(`<p>${id}</p>`);
  expect(page.headers.get('content-security-policy')).toMatch(/default-src 'none'/);

  // Past its time it is gone, and asking for it is what removes it.
  const late = await handle(req('GET', `/api/${id}`), store, KEY, PAGE, exp + 1);
  expect(late.status).toBe(404);
  expect(store.rows.size).toBe(0);
  const latePage = await handle(req('GET', `/${id}`), store, KEY, PAGE, exp + 1);
  expect(latePage.status).toBe(404);
  expect(await latePage.text()).toBe('<p></p>');
});

test('tinier: a short link cannot be changed or recalled: PUT and DELETE answer 405, and the row is as it was', async () => {
  const store = new MemStore();
  const { id } = (await (await handle(post(LINK), store, KEY, PAGE, NOW)).json()) as { id: string };
  for (const method of ['PUT', 'DELETE', 'PATCH']) {
    const res = await handle(req(method, `/api/${id}`, { c: 'two', iv: 'iv2', o: 'O'.repeat(43) }), store, KEY, PAGE, NOW);
    expect(res.status, method).toBe(405);
    expect(res.headers.get('allow')).toBe('GET');
  }
  expect((await handle(req('PUT', '/api', LINK), store, KEY, PAGE, NOW)).status).toBe(405);
  expect(store.rows.get(id)).toEqual({ c: LINK.c, iv: LINK.iv, exp: NOW + 3_600_000 });
  const pre = await handle(req('OPTIONS', '/api'), store, KEY, PAGE);
  expect(pre.status).toBe(204);
  expect(pre.headers.get('access-control-allow-methods')).toBe('POST, GET');
});

test('tinier: what it refuses; the lifetimes are an hour, a day, a week and a month', async () => {
  const store = new MemStore();
  const bad = async (body: unknown, status: number) => expect((await handle(post(body), store, KEY, PAGE, NOW)).status, JSON.stringify(body)).toBe(status);
  await bad('not json', 400);
  await bad({ c: 'abc', iv: 'xyz', ttl: 99 }, 400); // a lifetime that is not on the menu
  await bad({ c: 'abc', iv: 'xyz', ttl: 365 * 86400 }, 400); // a year is no longer on it
  await bad({ c: 'has spaces', iv: 'xyz', ttl: 3600 }, 400); // not base64url
  await bad({ c: 'a'.repeat(MAX_BYTES + 1), iv: 'xyz', ttl: 3600 }, 400); // too long
  await bad({ c: 'abc', iv: 'x'.repeat(40), ttl: 3600 }, 400);
  expect(store.rows.size).toBe(0);
  // What it was refused is not counted against the address.
  expect(store.brakes.size).toBe(0);
  expect((await handle(post({ c: 'a'.repeat(MAX_BYTES), iv: 'xyz', ttl: 30 * 86400 }), store, KEY, PAGE, NOW)).status).toBe(201); // the cap and the month fit
  expect(MAX_BYTES).toBe(16 * 1024);
  expect(SHORT_MAX).toBe(MAX_BYTES); // the client's limit is the server's
  expect([...TTLS].sort()).toEqual([3600, 86400, 7 * 86400, 30 * 86400].sort());
  expect([...TTLS].sort()).toEqual(EXPIRIES.map((e) => e.seconds).sort()); // the client's menu is the server's
  expect((await handle(req('GET', '/api/nothere'), store, KEY, PAGE)).status).toBe(404);
  expect((await handle(req('GET', '/api/../etc'), store, KEY, PAGE)).status).toBe(404);
  expect((await handle(req('GET', '/'), store, KEY, PAGE)).status).toBe(200);
  expect((await handle(req('GET', '/nope'), store, KEY, PAGE)).status).toBe(404);
});

test('tinier: a hundred links a day from one address; the 101st is refused until the next UTC day, which counts afresh', async () => {
  const store = new MemStore();
  expect(DAILY).toBe(100);
  const noon = Date.UTC(2026, 9, 11, 12);
  for (let i = 0; i < 100; i++) expect((await handle(post(LINK), store, KEY, PAGE, noon + i)).status, `link ${i + 1}`).toBe(201);
  const refused = await handle(post(LINK), store, KEY, PAGE, noon + 200);
  expect(refused.status).toBe(429);
  expect(await refused.json()).toEqual({ error: 'A hundred links a day from one address; try tomorrow.' });
  // Retry-After: the seconds until the next UTC day.
  expect(refused.headers.get('retry-after')).toBe(String(Math.ceil((Date.UTC(2026, 9, 12) - (noon + 200)) / 1000)));
  expect(refused.headers.get('access-control-allow-origin')).toBe('https://tinylittleoffice.com');
  expect(store.rows.size).toBe(100);
  // Reading is never braked; another address is not held back.
  const [id] = store.rows.keys();
  expect((await handle(req('GET', `/api/${id}`), store, KEY, PAGE, noon + 300)).status).toBe(200);
  expect((await handle(post(LINK, '5.6.7.8'), store, KEY, PAGE, noon + 300)).status).toBe(201);
  // A minute before midnight, still refused; just after, the new day counts from one.
  expect((await handle(post(LINK), store, KEY, PAGE, Date.UTC(2026, 9, 12) - 60_000)).status).toBe(429);
  expect((await handle(post(LINK), store, KEY, PAGE, Date.UTC(2026, 9, 12) + 1)).status).toBe(201);
  expect(store.brakes.get(await brakeHash(KEY, dayOf(Date.UTC(2026, 9, 12)), '1.2.3.4'))!.n).toBe(1);
});

test('tinier: the count is kept under a keyed hash of the day and the address; no address is in the store', async () => {
  const day = dayOf(NOW);
  const h = await brakeHash(KEY, day, '1.2.3.4');
  expect(h).toMatch(/^[A-Za-z0-9_~]{43}$/);
  expect(await brakeHash(KEY, day, '1.2.3.4')).toBe(h);
  expect(await brakeHash(KEY, day + 1, '1.2.3.4')).not.toBe(h); // by day
  expect(await brakeHash('another key', day, '1.2.3.4')).not.toBe(h); // by key
  expect(await brakeHash(KEY, day, '1.2.3.5')).not.toBe(h); // by address

  const store = new MemStore();
  const ip = '203.0.113.77';
  await handle(post(LINK, ip), store, KEY, PAGE, NOW);
  await handle(post(LINK, ip), store, KEY, PAGE, NOW);
  expect([...store.brakes]).toEqual([[await brakeHash(KEY, day, ip), { n: 2, day }]]);
  const everything = JSON.stringify([...store.rows, ...store.brakes]);
  expect(everything).not.toContain(ip);
  expect(everything).not.toContain('203');
});

test('tinier: the sweep forgets expired links and the counts of any day but today and yesterday', async () => {
  for (let i = 0; i < 50; i++) expect(newId()).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{7}$/);
  const store = new MemStore();
  const today = dayOf(NOW);
  await store.put('aaaaaaa', { c: 'c', iv: 'i', exp: NOW - 1 });
  await store.put('bbbbbbb', { c: 'c', iv: 'i', exp: NOW + 1 });
  for (const d of [today - 3, today - 2, today - 1, today]) await store.count(`h${d}`, d);
  await store.sweep(NOW);
  expect([...store.rows.keys()]).toEqual(['bbbbbbb']);
  expect([...store.brakes.keys()]).toEqual([`h${today - 1}`, `h${today}`]);
});

/** Cloudflare D1's few calls the Worker makes, over node's SQLite: enough to run the D1Store's own SQL. */
function d1(db: DatabaseSync) {
  const prepare = (sql: string) => {
    let args: (string | number)[] = [];
    const stmt = {
      bind: (...a: (string | number)[]) => ((args = a), stmt),
      first: async <T>() => (db.prepare(sql).get(...args) as T) ?? null,
      run: async () => {
        const r = db.prepare(sql).run(...args);
        return { meta: { changes: Number(r.changes) } };
      },
    };
    return stmt;
  };
  return { prepare } as SQL;
}
const schema = () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../tinier/schema.sql', import.meta.url), 'utf8'));
  // The migration is safe to apply again.
  for (let i = 0; i < 2; i++) db.exec(readFileSync(new URL('../tinier/migrations/0001-brakes.sql', import.meta.url), 'utf8'));
  return db;
};
const columns = (db: DatabaseSync, table: string) => (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);

test("tinier on D1: production's four columns and the brakes table, and the Worker's SQL run against them", async () => {
  const db = schema();
  expect(columns(db, 'links')).toEqual(['id', 'c', 'iv', 'exp']);
  expect(columns(db, 'brakes')).toEqual(['h', 'n', 'day']);
  const store = new D1Store(d1(db));
  const noon = Date.UTC(2026, 9, 11, 12);
  for (let i = 0; i < 100; i++) expect((await handle(post(LINK), store, KEY, PAGE, noon)).status).toBe(201);
  expect((await handle(post(LINK), store, KEY, PAGE, noon)).status).toBe(429);
  const rows = db.prepare('SELECT * FROM links').all() as { id: string }[];
  expect(rows.length).toBe(100);
  const got = await handle(req('GET', `/api/${rows[0].id}`), store, KEY, PAGE, noon);
  expect(await got.json()).toEqual({ c: LINK.c, iv: LINK.iv, exp: noon + 3_600_000 });
  // One row for the address that day, its count past the hundred, and nothing of the address in it.
  const brakes = db.prepare('SELECT * FROM brakes').all();
  expect(brakes).toEqual([{ h: await brakeHash(KEY, dayOf(noon), '1.2.3.4'), n: 101, day: dayOf(noon) }]);
  expect(JSON.stringify(brakes)).not.toContain('1.2.3.4');
  // Two days on, the sweep leaves no link (each lived an hour) and no count.
  await store.sweep(noon + 2 * DAY);
  expect(db.prepare('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
  expect(db.prepare('SELECT count(*) AS n FROM brakes').get()).toEqual({ n: 0 });
});

test('tinier: without BRAKE_KEY the Worker refuses, and says what is missing', () => {
  expect(() => brakeKey(undefined)).toThrow(/BRAKE_KEY is not set.*wrangler secret put BRAKE_KEY.*\.dev\.vars/);
  expect(() => brakeKey('')).toThrow(/BRAKE_KEY/);
  expect(brakeKey(KEY)).toBe(KEY);
  // The Worker asks for it before anything is answered.
  expect(readFileSync(new URL('../tinier/worker.ts', import.meta.url), 'utf8')).toMatch(/handle\(req, new D1Store\(env\.DB\), brakeKey\(env\.BRAKE_KEY\)/);
});

test('tinier: no per-minute limiter and no brake in memory; the key is a secret, never in the repo', () => {
  const read = (f: string) => readFileSync(new URL(`../tinier/${f}`, import.meta.url), 'utf8');
  expect(read('wrangler.jsonc')).not.toMatch(/ratelimits|LIMITER/);
  expect(read('worker.ts')).not.toMatch(/LIMITER|brake\(/);
  expect(read('tinier.ts')).not.toMatch(/Limiter|function brake\(/);
  expect(read('wrangler.jsonc')).not.toMatch(/BRAKE_KEY"\s*:/);
  expect(readFileSync(new URL('../.gitignore', import.meta.url), 'utf8')).toMatch(/^\.dev\.vars$/m);
});

test('tinier: a copy of the site on this machine names itself, and its short links may lead only there', async () => {
  const site = 'https://pefdev.exe.xyz:4178';
  const page = "<script>const site = '{{site}}';</script><p>{{id}}</p>";
  const made = await handle(post(LINK), new MemStore(), KEY, page, Date.now(), site);
  expect(made.headers.get('access-control-allow-origin')).toBe(site);
  const home = await (await handle(req('GET', '/'), new MemStore(), KEY, page, Date.now(), site)).text();
  expect(home).toMatch(/const site = 'https:\/\/pefdev\.exe\.xyz:4178'/);
  // Without one, it is the real site.
  const real = await (await handle(req('GET', '/'), new MemStore(), KEY, page)).text();
  expect(real).toMatch(/const site = 'https:\/\/tinylittleoffice\.com'/);
});

test('tinier: the folder logs nothing, and neither does the site', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('../tinier/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => (n.endsWith('.ts') && !n.endsWith('.d.ts')) || n.endsWith('.html'))) expect(readFileSync(new URL(f, dir), 'utf8'), f).not.toMatch(/console\.|\.log\(/);
  expect(readFileSync(new URL('wrangler.jsonc', dir), 'utf8')).toMatch(/"observability": \{ "enabled": false \}/);
  expect(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')).toMatch(/"observability": \{ "enabled": false \}/);
});

test('tinier: the landing page opens a link whose key, IV and ciphertext are written with "~" or "-", and hands on only the id and the expiry', async () => {
  const { sealShortAt } = await import('../src/kit/short.ts');
  const { toBase64Url } = await import('../src/kit/codec.ts');
  const page = readFileSync(new URL('../tinier/page.html', import.meta.url), 'utf8');
  const script = /<script>([\s\S]*)<\/script>/.exec(page)![1].replace("'{{id}}'", "'abcdefg'").replace("'{{site}}'", "'https://tinylittleoffice.com'");
  const long = 'https://tinylittleoffice.com/text/#/v1/text/yA~b';
  // A key and an IV whose base64url holds 62 and 63 in several places.
  const raw = Uint8Array.from({ length: 32 }, (_, i) => (i % 3 ? 0xfb : 0xff));
  const iv = Uint8Array.from({ length: 12 }, () => 0xfb);
  const sealed = await sealShortAt(long, raw, iv);
  const key = toBase64Url(raw);
  expect(key + sealed.iv).toContain('~');
  for (const form of [(s: string) => s, (s: string) => s.replace(/~/g, '-')]) {
    let went = '';
    const el = () => ({ textContent: '', hidden: true, href: '' });
    const els: Record<string, ReturnType<typeof el>> = {};
    const env = {
      document: { getElementById: (n: string) => (els[n] ??= el()) },
      location: { pathname: '/abcdefg', hash: `#${form(key)}`, replace: (to: string) => (went = to) },
      fetch: async () => ({ ok: true, json: async () => ({ c: form(sealed.c), iv: form(sealed.iv), exp: 1 }) }),
    };
    await new Function('document', 'location', 'fetch', `return (async () => { await ${script.trim().replace(/;\s*$/, '')}; })();`)(env.document, env.location, env.fetch);
    expect(els.err?.hidden ?? true, els.err?.textContent).toBe(true);
    expect(went).toBe(`${long}?s=abcdefg&x=1`);
  }
});
