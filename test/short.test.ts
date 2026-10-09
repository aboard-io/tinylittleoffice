// The short-link client against the shortener itself, in one process: fetch is the Worker's handle().
import { test, expect, vi, afterEach } from 'vitest';
import { handle } from '../tinier/tinier.ts';
import { forget, ownerHash, ownerLink, publicLink, shortCost, shorten, shortLink, unshorten, update } from '../src/kit/short.ts';
import { MemStore } from './tinier.test.ts';

const AT = 'https://tinier.test/';
const PAGE = '<p>{{id}}</p>';
const yes = async () => true;
afterEach(() => vi.unstubAllGlobals());

/** fetch, answered by the shortener with its rows in `store`; every request it saw is in `seen`. */
function serve(store: MemStore, allowed = yes) {
  const seen: { method: string; body: string }[] = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    seen.push({ method: init.method ?? 'GET', body: typeof init.body === 'string' ? init.body : '' });
    return handle(new Request(url, init), store, allowed, PAGE);
  });
  return seen;
}
const parts = (link: string) => {
  const m = /^https:\/\/tinier\.test\/([a-z0-9]{7})#([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?$/.exec(link)!;
  return { id: m[1], key: m[2], o: m[3] };
};
const LONG = 'https://tinylittleoffice.com/text/#/v1/text/yAbCdEfGhIjKlMnOpQrStUv';

test('shorten: two links, the public one opening the latest version with the key that never changes', async () => {
  const store = new MemStore();
  const seen = serve(store);
  const made = await shorten(LONG, 86400, AT);
  const pub = parts(made.short);
  const own = parts(made.owner);
  expect(pub.o).toBeUndefined();
  expect(own).toEqual({ id: pub.id, key: pub.key, o: made.owned.o });
  expect(made.owned).toEqual({ id: pub.id, key: pub.key, o: own.o });
  expect(publicLink(made.owner)).toBe(made.short);
  expect(publicLink(made.short)).toBe(made.short);
  expect(ownerLink(made.owned, AT)).toBe(made.owner);
  expect(shortLink(made.owned, AT)).toBe(made.short);
  expect(own.o).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(made.expires).toBeGreaterThan(Date.now());
  // The server holds the hash of o, never o; the request carried the hash alone.
  const row = store.rows.get(pub.id)!;
  expect(row.owner).toBe(await ownerHash(own.o!));
  expect(seen[0].body).not.toContain(own.o);
  expect(seen[0].body).toContain(row.owner);
  // The public link opens the document.
  const got = (await (await fetch(`${AT}api/${pub.id}`)).json()) as { c: string; iv: string; ver: number };
  expect(got.ver).toBe(1);
  expect(await unshorten(got.c, got.iv, pub.key)).toBe(LONG);

  // The owner updates it: the public link, with the old key, now opens the new document.
  const after = await update(made.owned, LONG + 'Changed', undefined, AT);
  expect(after.ver).toBe(2);
  expect(after.expires).toBe(made.expires);
  const again = (await (await fetch(`${AT}api/${pub.id}`)).json()) as { c: string; iv: string; ver: number; updated: number };
  expect(again.ver).toBe(2);
  expect(again.updated).toBeGreaterThan(0);
  expect(again.iv).not.toBe(got.iv);
  expect(await unshorten(again.c, again.iv, pub.key)).toBe(LONG + 'Changed');
  // o travelled in the PUT alone, and only to prove it.
  expect(seen.filter((r) => r.body.includes(own.o!)).map((r) => r.method)).toEqual(['PUT']);

  // Extended: a longer life from now.
  const longer = await update(made.owned, LONG, 7 * 86400, AT);
  expect(longer.ver).toBe(3);
  expect(longer.expires).toBeGreaterThan(made.expires);

  // Forgotten.
  await forget(made.owned, AT);
  expect(store.rows.size).toBe(0);
  await expect(update(made.owned, LONG, undefined, AT)).rejects.toThrow('This short link is gone, or the key does not fit.');
});

test('update and forget with the wrong o fail as a missing link does; the brake and the size cap are said in words', async () => {
  const store = new MemStore();
  serve(store);
  const made = await shorten(LONG, 3600, AT);
  const wrong = { ...made.owned, o: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB' };
  await expect(update(wrong, LONG, undefined, AT)).rejects.toThrow('This short link is gone, or the key does not fit.');
  await expect(forget(wrong, AT)).rejects.toThrow('This short link is gone, or the key does not fit.');
  expect(store.rows.get(made.id)!.ver).toBe(1);
  // Too long for the service: refused here, before anything is sent.
  const huge = LONG + 'x'.repeat(13 * 1024);
  await expect(shorten(huge, 3600, AT)).rejects.toThrow('This document is too long for a short link.');
  expect(shortCost(huge)).toBeGreaterThan(16 * 1024);
  expect(shortCost(LONG)).toBeLessThan(200);
  // Braked.
  vi.unstubAllGlobals();
  serve(store, async () => false);
  await expect(shorten(LONG, 3600, AT)).rejects.toThrow('Too many short links from here this hour.');
  await expect(update(made.owned, LONG, undefined, AT)).rejects.toThrow('Too many short links from here this hour.');
});
