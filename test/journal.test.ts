// The journal (backends/journal/journal.ts): sealed entries in one order under an id the server cannot read. Made with
// a snapshot, written only by its token at the next seq, read from its latest snapshot, held for the next entry;
// what it refuses; the rows on node's SQLite by the statements both platforms run; the client (src/kit/share/journal.ts)
// against the handler: the keys a secret gives, an entry sealed for its place and no other, the four requests; and over
// it a document two writers and a reader share (multiparty.ts), its history, and a person's store (sync.ts).
import { test, expect } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { handle, MAX_BYTES, MAX_ENTRY, SCHEMA, SqlStore, TTL, WAIT_MS, waiters, type Entry, type Store } from '../backends/journal/journal.ts';
import { sqlite } from '../backends/node/sqlite.ts';
import { Journal, journalAddress, newSecret, openEntry, PAD, parseAddress, readerAddressOf, readerKeys, sealEntry, verifierOf, writerKeys } from '../src/kit/share/journal.ts';
import { newShared, openShared, SNAPSHOT_EVERY, textAt, versions } from '../src/kit/share/multiparty.ts';
import { SyncStore } from '../src/kit/share/sync.ts';
import { fromBase64Url } from '../src/kit/core/codec.ts';
import { applyAll, parse, write, type Op } from '../src/doc/index.ts';
import { JournalMemStore as MemStore } from './memstore.ts';

const KEY = 'a-key-for-the-tests';
const NOW = 1_700_000_000_000;
const SITE = 'https://tinylittleoffice.com';
const SERVICE = 'https://journal.test/';
const nobody = waiters();

const req = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://journal.test${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '1.2.3.4', origin: SITE, ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
/** A writer's keys and the entries it seals: what a page does, against the handler with a store. */
async function writer(secret = newSecret()) {
  const keys = await writerKeys(secret);
  const bearer = { authorization: `Bearer ${keys.token}` };
  const entry = (seq: number, kind: 'ops' | 'snapshot', content: unknown) => sealEntry(keys, seq, kind, content);
  return { keys, secret, bearer, entry, path: `/j/${keys.id}` };
}
const made = async (store: Store, now = NOW) => {
  const w = await writer();
  const first = await w.entry(1, 'snapshot', { by: 'ann', at: now, app: 'write', text: 'Hello.\n' });
  const res = await handle(req('PUT', w.path, { verifier: await verifierOf(w.keys.token), entry: first }), store, KEY, now, SITE, nobody);
  expect(res.status).toBe(201);
  return { ...w, first };
};

test('a journal is made with a snapshot at seq 1, read from it, and written only at the next seq by its token', async () => {
  const store = new MemStore();
  const w = await made(store);
  expect(store.journals.get(w.keys.id)).toMatchObject({ last: 1, snapshot: 1, exp: NOW + TTL, verifier: await verifierOf(w.keys.token) });
  const second = await w.entry(2, 'ops', { by: 'ann', at: NOW, client: 'c1', ops: [{ op: 'head', key: 'title', value: 'T' }] });
  expect((await handle(req('POST', w.path, second), store, KEY, NOW, SITE, nobody)).status).toBe(401);
  expect((await handle(req('POST', w.path, second, { authorization: 'Bearer ' + 'x'.repeat(43) }), store, KEY, NOW, SITE, nobody)).status).toBe(401);
  const ok = await handle(req('POST', w.path, second, w.bearer), store, KEY, NOW + 1, SITE, nobody);
  expect(ok.status).toBe(201);
  expect(await ok.json()).toEqual({ seq: 2 });
  // The same seq again, or an earlier one, is stale: the entries past the one named come back and nothing is written;
  // a seq past the next names entries the journal has not, and brings none (a writer ahead of the journal takes it whole again).
  for (const seq of [2, 1, 5]) {
    const stale = await handle(req('POST', w.path, { ...second, seq }, w.bearer), store, KEY, NOW + 2, SITE, nobody);
    expect(stale.status, String(seq)).toBe(409);
    expect(((await stale.json()) as { entries: Entry[] }).entries.map((e) => e.seq)).toEqual(seq === 1 ? [1, 2] : seq === 2 ? [2] : []);
  }
  expect(store.journals.get(w.keys.id)!.last).toBe(2);
  // Read: from the latest snapshot by default, from a seq, after a seq.
  const all = (await (await handle(req('GET', w.path), store, KEY, NOW + 3, SITE, nobody)).json()) as { last: number; snapshot: number; entries: Entry[] };
  expect(all).toMatchObject({ last: 2, snapshot: 1 });
  expect(all.entries.map((e) => [e.seq, e.kind])).toEqual([
    [1, 'snapshot'],
    [2, 'ops'],
  ]);
  expect(((await (await handle(req('GET', `${w.path}?from=2`), store, KEY, NOW, SITE, nobody)).json()) as { entries: Entry[] }).entries.map((e) => e.seq)).toEqual([2]);
  expect(((await (await handle(req('GET', `${w.path}?after=2`), store, KEY, NOW, SITE, nobody)).json()) as { entries: Entry[] }).entries).toEqual([]);
  // A snapshot appended becomes where a reading starts.
  const snap = await w.entry(3, 'snapshot', { by: 'ann', at: NOW, app: 'write', text: '---\ntitle: T\n---\nHello.\n' });
  expect((await handle(req('POST', w.path, snap, w.bearer), store, KEY, NOW, SITE, nobody)).status).toBe(201);
  const from3 = (await (await handle(req('GET', w.path), store, KEY, NOW, SITE, nobody)).json()) as { snapshot: number; entries: Entry[] };
  expect(from3.snapshot).toBe(3);
  expect(from3.entries.map((e) => e.seq)).toEqual([3]);
  // A reading a day on keeps the journal a year more; one sooner leaves the row alone.
  expect(store.journals.get(w.keys.id)!.exp).toBe(NOW + TTL);
  await handle(req('GET', w.path), store, KEY, NOW + 2 * 86_400_000, SITE, nobody);
  expect(store.journals.get(w.keys.id)!.exp).toBe(NOW + 2 * 86_400_000 + TTL);
});

test('a held read answers when an entry comes, or when its time is up', async () => {
  const store = new MemStore();
  const wake = waiters();
  const w = await made(store);
  const held = handle(req('GET', `${w.path}?after=1&wait=1`), store, KEY, NOW, SITE, wake);
  let answered = false;
  void held.then(() => (answered = true));
  await new Promise((r) => setTimeout(r, 30));
  expect(answered).toBe(false);
  const e2 = await w.entry(2, 'ops', { by: 'ann', at: NOW, client: 'c1', ops: [] });
  await handle(req('POST', w.path, e2, w.bearer), store, KEY, NOW, SITE, wake);
  const got = (await (await held).json()) as { last: number; entries: Entry[] };
  expect(got.last).toBe(2);
  expect(got.entries.map((e) => e.seq)).toEqual([2]);
  // Nothing comes: the wait ends on its own (a short one, for the test).
  const t = Date.now();
  const timed = waiters();
  await timed.wait('x', 20);
  expect(Date.now() - t).toBeGreaterThanOrEqual(15);
  expect(WAIT_MS).toBe(25_000);
});

test('what it refuses: a body that is not JSON of the right shape, a first entry that is no snapshot, an entry too big, a journal full, an id of the wrong shape, another site’s page writing, a path that is nothing', async () => {
  const store = new MemStore();
  const w = await writer();
  const first = await w.entry(1, 'snapshot', { app: 'write', text: '' });
  const verifier = await verifierOf(w.keys.token);
  const put = (body: unknown, headers = {}) => handle(req('PUT', w.path, body, headers), store, KEY, NOW, SITE, nobody);
  expect((await put('not json')).status).toBe(400);
  expect((await put({ verifier, entry: { ...first, seq: 2 } })).status).toBe(400);
  expect((await put({ verifier, entry: { ...first, kind: 'ops' } })).status).toBe(400);
  expect((await put({ verifier: 'short', entry: first })).status).toBe(400);
  expect((await put({ verifier, entry: { ...first, iv: 'tooshort' } })).status).toBe(400);
  expect((await put({ verifier, entry: { ...first, c: 'A'.repeat(MAX_ENTRY + 1) } })).status).toBe(400);
  expect((await put({ verifier, entry: first }, { 'content-type': 'text/plain' })).status).toBe(400);
  expect((await put({ verifier, entry: first }, { origin: 'https://evil.example' })).status).toBe(400);
  expect(store.journals.size).toBe(0);
  expect(store.brakes.size).toBe(0);
  expect((await put({ verifier, entry: first })).status).toBe(201);
  expect((await put({ verifier, entry: first })).status).toBe(409);
  for (const path of ['/j/short', '/j/' + 'x'.repeat(23), '/', '/api', `/j/${w.keys.id}/more`]) expect((await handle(req('GET', path), store, KEY, NOW, SITE, nobody)).status, path).toBe(404);
  expect((await handle(req('DELETE', w.path), store, KEY, NOW, SITE, nobody)).status).toBe(404);
  // A reader may read from anywhere (the id gives ciphertext); the answer is the site's page's to read, and marked noindex.
  const read = await handle(req('GET', w.path, undefined, { origin: 'https://evil.example' }), store, KEY, NOW, SITE, nobody);
  expect(read.status).toBe(200);
  expect(read.headers.get('x-robots-tag')).toBe('noindex');
  expect(read.headers.get('access-control-allow-origin')).toBe(SITE);
  expect(read.headers.get('cache-control')).toBe('no-store');
  // Full: the journal takes no more past MAX_BYTES.
  store.journals.get(w.keys.id)!.bytes = MAX_BYTES - 10;
  const big = await w.entry(2, 'ops', { ops: [], pad: 'x'.repeat(500) });
  expect((await handle(req('POST', w.path, big, w.bearer), store, KEY, NOW, SITE, nobody)).status).toBe(413);
  // Gone past its time, and swept.
  store.journals.get(w.keys.id)!.exp = NOW - 1;
  expect((await handle(req('GET', w.path), store, KEY, NOW, SITE, nobody)).status).toBe(404);
  await store.sweep(NOW);
  expect(store.journals.size).toBe(0);
  // The preflight, for a page with a token and JSON.
  const pre = await handle(req('OPTIONS', w.path), store, KEY, NOW, SITE, nobody);
  expect(pre.status).toBe(204);
  expect(pre.headers.get('access-control-allow-headers')).toBe('authorization, content-type');
});

test('the brake: a hundred journals a day from one address, the 101st refused until the next UTC day; reading and writing are not counted', async () => {
  const store = new MemStore();
  for (let i = 0; i < 100; i++) expect((await made(store)).keys.id).toBeTruthy();
  const w = await writer();
  const res = await handle(req('PUT', w.path, { verifier: await verifierOf(w.keys.token), entry: await w.entry(1, 'snapshot', {}) }), store, KEY, NOW, SITE, nobody);
  expect(res.status).toBe(429);
  expect(res.headers.get('retry-after')).toMatch(/^\d+$/);
  expect(store.journals.size).toBe(100);
  expect([...store.brakes.values()][0].n).toBe(101);
});

test('the rows on node’s SQLite by SCHEMA, the order the primary key: made, appended at the next seq alone, read, touched, swept', async () => {
  const db = new DatabaseSync(':memory:');
  for (const s of SCHEMA.split(';')) if (s.trim()) db.exec(s);
  const brakes = new MemStore();
  const store = new SqlStore(sqlite(db), brakes);
  const w = await made(store);
  const row = await store.journal(w.keys.id);
  expect(row).toMatchObject({ id: w.keys.id, last: 1, snapshot: 1, exp: NOW + TTL });
  const e2 = await w.entry(2, 'ops', { ops: [] });
  const e3 = await w.entry(3, 'ops', { ops: [] });
  expect(await store.append(w.keys.id, e3, NOW)).toBe(false);
  expect(await store.append(w.keys.id, e2, NOW + 5)).toBe(true);
  expect(await store.append(w.keys.id, e2, NOW + 5)).toBe(false);
  expect(await store.append(w.keys.id, e3, NOW + 6)).toBe(true);
  expect((await store.read(w.keys.id, 2)).map((e) => e.seq)).toEqual([2, 3]);
  expect((await store.journal(w.keys.id))!).toMatchObject({ last: 3, exp: NOW + 6, bytes: w.first.c.length + e2.c.length + e3.c.length });
  await store.touch(w.keys.id, NOW + 100);
  expect((await store.journal(w.keys.id))!.exp).toBe(NOW + 100);
  await store.sweep(NOW + 101);
  expect(await store.journal(w.keys.id)).toBeNull();
  expect(await store.read(w.keys.id, 1)).toEqual([]);
  // The whole handler over it, too.
  const again = await made(store, NOW + 200);
  expect((await (await handle(req('GET', again.path), store, KEY, NOW + 200, SITE, nobody)).json()) as object).toMatchObject({ last: 1, snapshot: 1 });
});

test('the keys: a secret gives the id, the read key and the token; the read key alone gives the same id and no token; an address holds one or the other', async () => {
  const secret = newSecret();
  expect(secret).toMatch(/^[A-Za-z0-9_~-]{43}$/);
  const w = await writerKeys(secret);
  const r = await readerKeys(w.read);
  expect(r.id).toBe(w.id);
  expect(r.token).toBeUndefined();
  expect(w.id).toMatch(/^[A-Za-z0-9_~-]{22}$/);
  expect(w.token).toMatch(/^[A-Za-z0-9_~-]{43}$/);
  expect(w.read).not.toBe(secret);
  expect(w.token).not.toBe(w.read);
  // The verifier is what the server keeps: the token's hash, not the token.
  const verifier = await verifierOf(w.token);
  expect(verifier).toMatch(/^[A-Za-z0-9_~-]{43}$/);
  expect(verifier).not.toBe(w.token);
  // Addresses.
  const writing = journalAddress(SERVICE, w.id, { secret });
  const reading = journalAddress(SERVICE, w.id, { read: w.read });
  expect(writing).toBe(`${SERVICE}j/${w.id}#w${secret}`);
  expect((await parseAddress(writing))!.keys.token).toBe(w.token);
  expect((await parseAddress(reading))!.keys.token).toBeUndefined();
  expect((await parseAddress(reading))!.id).toBe(w.id);
  expect(await readerAddressOf(writing)).toBe(reading);
  expect(await readerAddressOf(reading)).toBe(reading);
  // An address whose id is not the key's is no address.
  expect(await parseAddress(journalAddress(SERVICE, 'x'.repeat(22), { secret }))).toBeNull();
  expect(await readerAddressOf(journalAddress(SERVICE, 'x'.repeat(22), { secret }))).toBeNull();
  expect(await parseAddress('https://journal.test/j/short#w' + secret)).toBeNull();
  expect(await parseAddress('')).toBeNull();
});

test('an entry sealed for its place opens there and nowhere else, its length a multiple of the padding, by a reader as by its writer', async () => {
  const w = await writerKeys(newSecret());
  const r = await readerKeys(w.read);
  const content = { by: 'ann', at: 1, client: 'c', ops: [{ op: 'head', key: 'title', value: 'T' }] };
  const e = await sealEntry(w, 7, 'ops', content);
  expect(e).toMatchObject({ seq: 7, kind: 'ops' });
  expect(fromBase64Url(e.iv)).toHaveLength(12);
  expect((fromBase64Url(e.c).length - 16) % PAD).toBe(0);
  expect(await openEntry(w, e)).toEqual(content);
  expect(await openEntry(r, e)).toEqual(content);
  // Moved, renamed, or under another journal's key, it does not open; nor damaged.
  expect(await openEntry(w, { ...e, seq: 8 })).toBeNull();
  expect(await openEntry(w, { ...e, kind: 'snapshot' })).toBeNull();
  expect(await openEntry(await writerKeys(newSecret()), e)).toBeNull();
  expect(await openEntry(w, { ...e, c: e.c.slice(0, -2) + 'AA' })).toBeNull();
  // Two seals of one content differ (a fresh IV), and a long content pads to the next multiple.
  const again = await sealEntry(w, 7, 'ops', content);
  expect(again.c).not.toBe(e.c);
  const long = await sealEntry(w, 1, 'snapshot', { text: 'x'.repeat(PAD * 3) });
  expect((fromBase64Url(long.c).length - 16) % PAD).toBe(0);
  expect(fromBase64Url(long.c).length - 16).toBeGreaterThan(PAD * 3);
});

/** The handler in place of the service: every fetch of the client's answered by `handle` over `store`, as a page of the site asking. */
function served(store: Store, wake = waiters()) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const r = new Request(input, init);
    r.headers.set('cf-connecting-ip', '9.9.9.9');
    r.headers.set('origin', SITE);
    return handle(r, store, KEY, Date.now(), SITE, wake);
  }) as typeof fetch;
  return () => void (globalThis.fetch = real);
}

test('the client against the handler: made, appended, stale and carried, read from the snapshot, polled', async () => {
  const store = new MemStore();
  const done = served(store);
  try {
    const secret = newSecret();
    const w = new Journal(SERVICE, await writerKeys(secret));
    await w.make({ by: 'ann', at: 1, app: 'write', text: 'Hello.\n' });
    expect(await w.append(2, 'ops', { by: 'ann', at: 2, client: 'a', ops: [] })).toEqual({ seq: 2 });
    // Another writer of the same journal, behind: told what it missed.
    const other = new Journal(SERVICE, await writerKeys(secret));
    const stale = await other.append(2, 'ops', { by: 'bob', at: 3, client: 'b', ops: [] });
    expect('entries' in stale && stale.entries.map((e) => e.seq)).toEqual([2]);
    expect(await other.append(3, 'ops', { by: 'bob', at: 3, client: 'b', ops: [] })).toEqual({ seq: 3 });
    const read = await w.read();
    expect(read.last).toBe(3);
    expect(read.entries.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect((await w.read(3)).entries.map((e) => e.seq)).toEqual([3]);
    // A reader's address polls, and is answered when the writer appends.
    const reader = new Journal(SERVICE, await readerKeys((await writerKeys(secret)).read));
    const polled = reader.poll(3);
    await new Promise((r) => setTimeout(r, 20));
    expect(await w.append(4, 'snapshot', { by: 'ann', at: 4, app: 'write', text: 'Hello.\n' })).toEqual({ seq: 4 });
    expect((await polled).entries.map((e) => e.seq)).toEqual([4]);
    await expect(reader.append(5, 'ops', {})).rejects.toThrow(/reader/);
    await expect(new Journal(SERVICE, await writerKeys(newSecret())).read()).rejects.toMatchObject({ status: 404 });
  } finally {
    done();
  }
});

const until = async (what: () => boolean, ms = 3000, said = 'never happened') => {
  const t = Date.now();
  while (!what()) {
    if (Date.now() - t > ms) throw new Error(said);
    await new Promise((r) => setTimeout(r, 5));
  }
};
const insert = (at: number, from: number, text: string): Op => ({ op: 'text', at, from, to: from, runs: [{ t: text }] });

test('a shared document: two writers’ changes, made at once, end in one document on both and on a reader, each told the other’s as carried over its own; a snapshot in time', async () => {
  const store = new MemStore();
  const done = served(store);
  try {
    const { address, reader } = await newShared(SERVICE, 'write', 'One.\n\nTwo.\n', 'ann');
    expect(address).toMatch(/^https:\/\/journal\.test\/j\/[A-Za-z0-9_~-]{22}#w[A-Za-z0-9_~-]{43}$/);
    const a = (await openShared(address, 'ann'))!;
    const b = (await openShared(address, 'bob'))!;
    const r = (await openShared(reader, 'eve'))!;
    expect(a).toMatchObject({ app: 'write', text: 'One.\n\nTwo.\n', writes: true, seq: 1 });
    expect(r.writes).toBe(false);
    // Each side's document, as its editor would hold it: its own ops applied as made, the other's as told.
    const docs = { a: parse(a.text), b: parse(b.text), r: parse(r.text) };
    a.onRemote((ops) => (docs.a = applyAll(docs.a, ops)));
    b.onRemote((ops) => (docs.b = applyAll(docs.b, ops)));
    r.onRemote((ops) => (docs.r = applyAll(docs.r, ops)));
    const resets: string[] = [];
    for (const s of [a, b, r]) s.onReset((t) => resets.push(t));
    // At once: ann types at the end of the first paragraph, bob at the end of the second.
    const mine = [insert(0, 4, ' A')];
    const theirs = [insert(1, 4, ' B')];
    docs.a = applyAll(docs.a, mine);
    docs.b = applyAll(docs.b, theirs);
    a.changed(mine);
    b.changed(theirs);
    const settled = 'One. A\n\nTwo. B\n';
    await until(() => write(docs.a) === settled && write(docs.b) === settled && write(docs.r) === settled);
    expect(resets).toEqual([]);
    expect(store.journals.values().next().value!.last).toBe(3);
    // The journal's own document is the same, and its history names who did what, in its order.
    expect(await textAt(address, 3)).toBe(settled);
    expect(await textAt(address, 2)).toMatch(/^One\. A\n\nTwo\.\n$|^One\.\n\nTwo\. B\n$/);
    expect((await versions(reader))!.map((v) => [v.seq, v.by, v.kind])).toEqual([
      [1, 'ann', 'snapshot'],
      [2, expect.any(String), 'ops'],
      [3, expect.any(String), 'ops'],
    ]);
    // A reader cannot write: its changes go nowhere, and no address that is not a journal's opens.
    r.changed([insert(0, 0, 'x')]);
    await new Promise((t) => setTimeout(t, 30));
    expect(store.journals.values().next().value!.last).toBe(3);
    expect(await openShared('https://journal.test/j/nothing#wx', 'eve')).toBeNull();
    expect(await versions('nothing')).toBeNull();
    for (const s of [a, b, r]) s.close();
  } finally {
    done();
  }
});

test('a snapshot every SNAPSHOT_EVERY entries, by the writer that gets there; a replica that would part from the journal is reset to it', async () => {
  const store = new MemStore();
  const done = served(store);
  try {
    const { address } = await newShared(SERVICE, 'write', '.\n', 'ann');
    const a = (await openShared(address, 'ann'))!;
    // One change at a time, each taken before the next (changes made while one is on its way go together in one entry).
    for (let i = 0; i < SNAPSHOT_EVERY; i++) {
      a.changed([insert(0, i, 'x')]);
      await until(() => a.seq >= i + 2, 3000, `change ${i} never taken: seq ${a.seq}`);
    }
    const id = store.journals.keys().next().value!;
    await until(() => store.journals.get(id)!.last > SNAPSHOT_EVERY + 1, 3000, `no snapshot: last ${store.journals.get(id)!.last}`);
    expect(store.journals.get(id)!.snapshot).toBe(SNAPSHOT_EVERY + 2);
    expect(
      store.entries
        .get(id)!
        .filter((e) => e.kind === 'snapshot')
        .map((e) => e.seq),
    ).toEqual([1, SNAPSHOT_EVERY + 2]);
    // Someone else, opening now, reads from the snapshot and holds the same document.
    const b = (await openShared(address, 'bob'))!;
    expect(b.text).toBe('x'.repeat(SNAPSHOT_EVERY) + '.\n');
    expect(b.seq).toBe(SNAPSHOT_EVERY + 2);
    // An entry whose ops do not apply (a block the document has not) is passed over by every replica alike: nothing changes, nobody parts.
    const resets: string[] = [];
    b.onReset((t) => resets.push(t));
    const w = new Journal(SERVICE, (await parseAddress(address))!.keys);
    const bad: Op = { op: 'text', at: 9, from: 0, to: 0, runs: [] };
    expect(await w.append(SNAPSHOT_EVERY + 3, 'ops', { by: 'mallory', at: 0, client: 'm', ops: [bad] })).toEqual({ seq: SNAPSHOT_EVERY + 3 });
    await until(() => b.seq === SNAPSHOT_EVERY + 3, 3000, 'the entry never reached bob');
    expect(resets).toEqual([]);
    expect(await textAt(address, SNAPSHOT_EVERY + 3)).toBe('x'.repeat(SNAPSHOT_EVERY) + '.\n');
    // A writer whose own op would not apply has parted from the journal: reset, and nothing written.
    const own: string[] = [];
    a.onReset((t) => own.push(t));
    a.changed([bad]);
    await until(() => own.length > 0, 3000, 'the writer was never reset');
    expect(own[0]).toBe('x'.repeat(SNAPSHOT_EVERY) + '.\n');
    expect(store.journals.get(id)!.last).toBe(SNAPSHOT_EVERY + 3);
    a.close();
    b.close();
  } finally {
    done();
  }
}, 30_000);

test('a person’s store: made on one device, opened on another by its address, the documents made and kept on either seen on both', async () => {
  const store = new MemStore();
  const done = served(store);
  try {
    const laptop = await SyncStore.make(SERVICE, 'ann');
    expect(laptop.address).toMatch(/^https:\/\/journal\.test\/j\/[A-Za-z0-9_~-]{22}#w[A-Za-z0-9_~-]{43}$/);
    expect(laptop.list()).toEqual([]);
    const note = await laptop.create(SERVICE, 'write', 'A note.\n', 'Note');
    expect(note).toMatchObject({ app: 'write', title: 'Note' });
    expect(note.address).toContain(`/j/${note.id}#w`);
    // The phone, given the address: the same index, and the documents heard as the laptop changes them.
    const phone = (await SyncStore.open(laptop.address, 'ann'))!;
    expect(phone.list().map((d) => d.title)).toEqual(['Note']);
    const heard: string[][] = [];
    const stop = phone.watch((docs) => heard.push(docs.map((d) => d.title)));
    await laptop.rename(note.id, 'A note');
    await until(() => heard.length > 0);
    expect(heard[0]).toEqual(['A note']);
    // A document shared with ann, added to her store by its address; the phone writes too, and the laptop's next write merges rather than overwrites.
    const theirs = await newShared(SERVICE, 'sheet', 'A | B\n--- | ---\n1 | 2\n', 'bob');
    await phone.add({ id: (await parseAddress(theirs.address))!.id, address: theirs.address, app: 'sheet', title: 'Bob’s sheet' });
    await laptop.remove(note.id);
    expect(laptop.list().map((d) => d.title)).toEqual(['Bob’s sheet']);
    await until(() => heard.at(-1)?.length === 1 && heard.at(-1)![0] === 'Bob’s sheet');
    // The document itself opens as any shared document does.
    expect((await openShared(theirs.address, 'ann'))!.app).toBe('sheet');
    stop();
    phone.close();
    laptop.close();
    expect(await SyncStore.open('https://journal.test/j/nope#wx', 'ann')).toBeNull();
  } finally {
    done();
  }
});
