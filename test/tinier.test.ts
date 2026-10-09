// tinier: links kept for their time and handed back; owners updating, extending and forgetting them; what it refuses.
import { test, expect } from 'vitest';
import { brake, handle, MAX_BYTES, newId, ownerHash, TTLS, type Link, type Revision, type Store } from '../tinier/tinier.ts';
import { EXPIRIES, SHORT_MAX } from '../src/kit/short.ts';

/** The rows in a Map: what D1 does, for the test. */
export class MemStore implements Store {
  rows = new Map<string, Link>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, link: Link) {
    if (this.rows.has(id)) return false;
    this.rows.set(id, link);
    return true;
  }
  async revise(id: string, rev: Revision) {
    const row = this.rows.get(id)!;
    this.rows.set(id, { ...row, ...rev, ver: row.ver + 1 });
  }
  async drop(id: string) {
    this.rows.delete(id);
  }
  async sweep(now: number) {
    let n = 0;
    for (const [id, l] of this.rows) if (l.exp < now) (this.rows.delete(id), n++);
    return n;
  }
}
const PAGE = '<p>{{id}}</p>';
const yes = async () => true;
const no = async () => false;
const req = (method: string, path: string, body?: unknown) => new Request(`https://tinier.test${path}`, { method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const post = (body: unknown) => req('POST', '/api', body);
// An owner key: 32 bytes in base64url (43 characters), and its hash as the server keeps it.
const O = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const WRONG = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

test('tinier: a link is kept for its time, handed back, and then gone', async () => {
  const store = new MemStore();
  const now = 1_700_000_000_000;
  const made = await handle(post({ c: 'abc-_123', iv: 'xyz', ttl: 3600 }), store, yes, PAGE, now);
  expect(made.status).toBe(201);
  expect(made.headers.get('access-control-allow-origin')).toBe('https://tinylittleoffice.com');
  const { id, exp } = (await made.json()) as { id: string; exp: number };
  expect(id).toMatch(/^[a-z0-9]{7}$/);
  expect(exp).toBe(now + 3_600_000);

  const got = await handle(req('GET', `/api/${id}`), store, yes, PAGE, now + 1000);
  expect(got.status).toBe(200);
  expect(await got.json()).toEqual({ c: 'abc-_123', iv: 'xyz', exp, ver: 1, updated: null });

  const page = await handle(req('GET', `/${id}`), store, yes, PAGE, now + 1000);
  expect(page.status).toBe(200);
  expect(await page.text()).toBe(`<p>${id}</p>`);
  expect(page.headers.get('content-security-policy')).toMatch(/default-src 'none'/);

  // Past its time it is gone, and asking for it is what removes it.
  const late = await handle(req('GET', `/api/${id}`), store, yes, PAGE, exp + 1);
  expect(late.status).toBe(404);
  expect(store.rows.size).toBe(0);
  const latePage = await handle(req('GET', `/${id}`), store, yes, PAGE, exp + 1);
  expect(latePage.status).toBe(404);
  expect(await latePage.text()).toBe('<p></p>');
});

test('tinier: the owner puts a new version under the same id; GET hands back the new ciphertext and ver 2', async () => {
  const store = new MemStore();
  const now = 1_700_000_000_000;
  const owner = await ownerHash(O);
  expect(owner).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const { id, exp } = (await (await handle(post({ c: 'one', iv: 'iv1', ttl: 86400, owner }), store, yes, PAGE, now)).json()) as { id: string; exp: number };
  expect(store.rows.get(id)).toMatchObject({ owner, ver: 1, updated: null });

  const put = await handle(req('PUT', `/api/${id}`, { c: 'two', iv: 'iv2', o: O }), store, yes, PAGE, now + 5000);
  expect(put.status).toBe(200);
  expect(await put.json()).toEqual({ id, exp, ver: 2, updated: now + 5000 });
  expect(await (await handle(req('GET', `/api/${id}`), store, yes, PAGE, now + 6000)).json()).toEqual({ c: 'two', iv: 'iv2', exp, ver: 2, updated: now + 5000 });

  // A lifetime given extends the link from now; a shorter one than what is left changes nothing.
  const longer = await handle(req('PUT', `/api/${id}`, { c: 'three', iv: 'iv3', o: O, ttl: 7 * 86400 }), store, yes, PAGE, now + 10_000);
  expect(((await longer.json()) as { exp: number; ver: number }).exp).toBe(now + 10_000 + 7 * 86_400_000);
  const shorter = await handle(req('PUT', `/api/${id}`, { c: 'four', iv: 'iv4', o: O, ttl: 3600 }), store, yes, PAGE, now + 20_000);
  expect(await shorter.json()).toMatchObject({ exp: now + 10_000 + 7 * 86_400_000, ver: 4 });
});

test('tinier: the wrong key is 403, an unknown id 404, with one and the same body; a row without an owner cannot change', async () => {
  const store = new MemStore();
  const now = 1_700_000_000_000;
  const { id } = (await (await handle(post({ c: 'one', iv: 'iv1', ttl: 3600, owner: await ownerHash(O) }), store, yes, PAGE, now)).json()) as { id: string };
  const wrong = await handle(req('PUT', `/api/${id}`, { c: 'two', iv: 'iv2', o: WRONG }), store, yes, PAGE, now);
  const none = await handle(req('PUT', '/api/zzzzzzz', { c: 'two', iv: 'iv2', o: O }), store, yes, PAGE, now);
  expect(wrong.status).toBe(403);
  expect(none.status).toBe(404);
  expect(await wrong.text()).toBe(await none.text());
  expect(store.rows.get(id)!.c).toBe('one');
  // No key at all, or one of the wrong shape, is the wrong key.
  expect((await handle(req('PUT', `/api/${id}`, { c: 'two', iv: 'iv2' }), store, yes, PAGE, now)).status).toBe(403);
  expect((await handle(req('PUT', `/api/${id}`, { c: 'two', iv: 'iv2', o: 'short' }), store, yes, PAGE, now)).status).toBe(403);
  expect((await handle(req('DELETE', `/api/${id}`, { o: WRONG }), store, yes, PAGE, now)).status).toBe(403);
  expect(store.rows.size).toBe(1);
  // An expired link is gone to its owner too.
  expect((await handle(req('PUT', `/api/${id}`, { c: 'two', iv: 'iv2', o: O }), store, yes, PAGE, now + 3_600_001)).status).toBe(404);
  // Made without an owner: nobody can update it.
  const { id: orphan } = (await (await handle(post({ c: 'one', iv: 'iv1', ttl: 3600 }), store, yes, PAGE, now)).json()) as { id: string };
  expect((await handle(req('PUT', `/api/${orphan}`, { c: 'two', iv: 'iv2', o: O }), store, yes, PAGE, now)).status).toBe(403);
});

test('tinier: the owner forgets a link, and it is gone to everyone', async () => {
  const store = new MemStore();
  const now = 1_700_000_000_000;
  const { id } = (await (await handle(post({ c: 'one', iv: 'iv1', ttl: 3600, owner: await ownerHash(O) }), store, yes, PAGE, now)).json()) as { id: string };
  const gone = await handle(req('DELETE', `/api/${id}`, { o: O }), store, yes, PAGE, now);
  expect(gone.status).toBe(204);
  expect(store.rows.size).toBe(0);
  expect((await handle(req('GET', `/api/${id}`), store, yes, PAGE, now)).status).toBe(404);
  expect((await handle(req('DELETE', `/api/${id}`, { o: O }), store, yes, PAGE, now)).status).toBe(404);
});

test('tinier: what it refuses, and the brake on every write', async () => {
  const store = new MemStore();
  const bad = async (body: unknown, status: number) => expect((await handle(post(body), store, yes, PAGE)).status, JSON.stringify(body)).toBe(status);
  await bad('not json', 400);
  await bad({ c: 'abc', iv: 'xyz', ttl: 99 }, 400); // a lifetime that is not on the menu
  await bad({ c: 'has spaces', iv: 'xyz', ttl: 3600 }, 400); // not base64url
  await bad({ c: 'a'.repeat(MAX_BYTES + 1), iv: 'xyz', ttl: 3600 }, 400); // too long
  await bad({ c: 'abc', iv: 'x'.repeat(40), ttl: 3600 }, 400);
  await bad({ c: 'abc', iv: 'xyz', ttl: 3600, owner: 'tooshort' }, 400); // an owner hash of the wrong shape
  expect(store.rows.size).toBe(0);
  expect((await handle(post({ c: 'a'.repeat(MAX_BYTES), iv: 'xyz', ttl: 3600 }), store, yes, PAGE)).status).toBe(201); // the cap itself fits
  expect(MAX_BYTES).toBe(16 * 1024);
  expect(SHORT_MAX).toBe(MAX_BYTES); // the client's limit is the server's
  expect([...TTLS].sort()).toEqual(EXPIRIES.map((e) => e.seconds).sort()); // the client's menu is the server's
  expect(TTLS.has(365 * 86400)).toBe(true);
  const { id } = (await (await handle(post({ c: 'abc', iv: 'xyz', ttl: 3600, owner: await ownerHash(O) }), store, yes, PAGE)).json()) as { id: string };
  expect((await handle(req('PUT', `/api/${id}`, { c: 'a'.repeat(MAX_BYTES + 1), iv: 'xyz', o: O }), store, yes, PAGE)).status).toBe(400);
  expect((await handle(req('PUT', `/api/${id}`, { c: 'abc', iv: 'xyz', o: O, ttl: 99 }), store, yes, PAGE)).status).toBe(400);
  expect((await handle(req('PUT', `/api/${id}`, 'not json'), store, yes, PAGE)).status).toBe(400);
  // The brake holds POST, PUT and DELETE alike; GET is never braked.
  expect((await handle(post({ c: 'abc', iv: 'xyz', ttl: 3600 }), store, no, PAGE)).status).toBe(429);
  expect((await handle(req('PUT', `/api/${id}`, { c: 'abc', iv: 'xyz', o: O }), store, no, PAGE)).status).toBe(429);
  expect((await handle(req('DELETE', `/api/${id}`, { o: O }), store, no, PAGE)).status).toBe(429);
  expect((await handle(req('GET', `/api/${id}`), store, no, PAGE)).status).toBe(200);
  expect((await handle(req('GET', '/api/nothere'), store, yes, PAGE)).status).toBe(404);
  expect((await handle(req('GET', '/api/../etc'), store, yes, PAGE)).status).toBe(404);
  expect((await handle(req('GET', '/'), store, yes, PAGE)).status).toBe(200);
  expect((await handle(req('GET', '/nope'), store, yes, PAGE)).status).toBe(404);
  const pre = await handle(req('OPTIONS', '/api'), store, yes, PAGE);
  expect(pre.status).toBe(204);
  expect(pre.headers.get('access-control-allow-methods')).toBe('POST, GET, PUT, DELETE');
});

test('tinier: ids are seven readable characters and the sweep forgets the old', async () => {
  for (let i = 0; i < 50; i++) expect(newId()).toMatch(/^[abcdefghijkmnpqrstuvwxyz23456789]{7}$/);
  const store = new MemStore();
  const row = { c: 'c', iv: 'i', owner: null, ver: 1, updated: null };
  await store.put('aaaaaaa', { ...row, exp: 10 });
  await store.put('bbbbbbb', { ...row, exp: 30 });
  expect(await store.sweep(20)).toBe(1);
  expect([...store.rows.keys()]).toEqual(['bbbbbbb']);
});

test('tinier: the brake allows so many an hour from one address, and forgets', async () => {
  const may = brake(3, 1000);
  const t = 1_000_000;
  expect(await Promise.all([may('a', t), may('a', t + 1), may('a', t + 2), may('a', t + 3)])).toEqual([true, true, true, false]);
  expect(await may('b', t + 3)).toBe(true); // another address is not held back
  expect(await may('a', t + 1001)).toBe(true); // an hour on, the first has aged out
});

test('tinier: a copy of the site on this machine names itself, and its short links may lead only there', async () => {
  const site = 'https://pefdev.exe.xyz:4178';
  const page = "<script>const site = '{{site}}';</script><p>{{id}}</p>";
  const made = await handle(post({ c: 'abc', iv: 'xyz', ttl: 3600 }), new MemStore(), yes, page, Date.now(), site);
  expect(made.headers.get('access-control-allow-origin')).toBe(site);
  const home = await (await handle(req('GET', '/'), new MemStore(), yes, page, Date.now(), site)).text();
  expect(home).toMatch(/const site = 'https:\/\/pefdev\.exe\.xyz:4178'/);
  // Without one, it is the real site.
  const real = await (await handle(req('GET', '/'), new MemStore(), yes, page)).text();
  expect(real).toMatch(/const site = 'https:\/\/tinylittleoffice\.com'/);
});
