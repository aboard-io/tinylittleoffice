import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, newId, type Link, type Store } from '../tinier/tinier.ts';

/** The rows in a Map: what D1 does, for the test. */
class MemStore implements Store {
  rows = new Map<string, Link>();
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async put(id: string, link: Link) {
    if (this.rows.has(id)) return false;
    this.rows.set(id, link);
    return true;
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
const post = (body: unknown) => new Request('https://tinier.test/api', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('tinier: a link is kept for its time, handed back, and then gone', async () => {
  const store = new MemStore();
  const now = 1_700_000_000_000;
  const made = await handle(post({ c: 'abc-_123', iv: 'xyz', ttl: 3600 }), store, yes, PAGE, now);
  assert.equal(made.status, 201);
  assert.equal(made.headers.get('access-control-allow-origin'), 'https://tinylittleoffice.com');
  const { id, exp } = (await made.json()) as { id: string; exp: number };
  assert.match(id, /^[a-z0-9]{7}$/);
  assert.equal(exp, now + 3_600_000);

  const got = await handle(new Request(`https://tinier.test/api/${id}`), store, yes, PAGE, now + 1000);
  assert.equal(got.status, 200);
  assert.deepEqual(await got.json(), { c: 'abc-_123', iv: 'xyz', exp });

  const page = await handle(new Request(`https://tinier.test/${id}`), store, yes, PAGE, now + 1000);
  assert.equal(page.status, 200);
  assert.equal(await page.text(), `<p>${id}</p>`);
  assert.match(page.headers.get('content-security-policy') ?? '', /default-src 'none'/);

  // Past its time it is gone, and asking for it is what removes it.
  const late = await handle(new Request(`https://tinier.test/api/${id}`), store, yes, PAGE, exp + 1);
  assert.equal(late.status, 404);
  assert.equal(store.rows.size, 0);
  const latePage = await handle(new Request(`https://tinier.test/${id}`), store, yes, PAGE, exp + 1);
  assert.equal(latePage.status, 404);
  assert.equal(await latePage.text(), '<p></p>');
});

test('tinier: what it refuses', async () => {
  const store = new MemStore();
  const bad = async (body: unknown, status: number) => assert.equal((await handle(post(body), store, yes, PAGE)).status, status, JSON.stringify(body));
  await bad('not json', 400);
  await bad({ c: 'abc', iv: 'xyz', ttl: 99 }, 400); // a lifetime that is not on the menu
  await bad({ c: 'has spaces', iv: 'xyz', ttl: 3600 }, 400); // not base64url
  await bad({ c: 'a'.repeat(9000), iv: 'xyz', ttl: 3600 }, 400); // too long
  await bad({ c: 'abc', iv: 'x'.repeat(40), ttl: 3600 }, 400);
  assert.equal(store.rows.size, 0);
  assert.equal((await handle(post({ c: 'abc', iv: 'xyz', ttl: 3600 }), store, no, PAGE)).status, 429);
  assert.equal((await handle(new Request('https://tinier.test/api/nothere'), store, yes, PAGE)).status, 404);
  assert.equal((await handle(new Request('https://tinier.test/api/../etc'), store, yes, PAGE)).status, 404);
  assert.equal((await handle(new Request('https://tinier.test/'), store, yes, PAGE)).status, 200);
  assert.equal((await handle(new Request('https://tinier.test/nope'), store, yes, PAGE)).status, 404);
  const pre = await handle(new Request('https://tinier.test/api', { method: 'OPTIONS' }), store, yes, PAGE);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-methods'), 'POST, GET');
});

test('tinier: ids are seven readable characters and the sweep forgets the old', async () => {
  for (let i = 0; i < 50; i++) assert.match(newId(), /^[abcdefghijkmnpqrstuvwxyz23456789]{7}$/);
  const store = new MemStore();
  await store.put('aaaaaaa', { c: 'c', iv: 'i', exp: 10 });
  await store.put('bbbbbbb', { c: 'c', iv: 'i', exp: 30 });
  assert.equal(await store.sweep(20), 1);
  assert.deepEqual([...store.rows.keys()], ['bbbbbbb']);
});
