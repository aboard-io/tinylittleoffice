/**
 * The journal: sealed entries in one order under an id the server cannot read (backends/README.md). A document
 * several people edit at once is one (src/kit/share/multiparty.ts), and so is a person's own store of documents
 * (src/kit/share/sync.ts); the server holds ciphertext, an order and an expiry, and knows nothing else.
 *
 *   PUT  /j/<id>                      {verifier, entry}                201 {seq: 1}      a new journal, its first entry a snapshot; a hundred a day per address
 *   POST /j/<id>                      Authorization: Bearer <token>; {seq, kind, iv, c}
 *                                                                      201 {seq}         appended at seq, the next in the order
 *                                                                      409 {entries}     seq was not the next: the entries past it, to carry one's own over
 *   GET  /j/<id>[?from=<seq>]         200 {last, snapshot, entries}                      from the latest snapshot, or from `from`
 *   GET  /j/<id>?after=<seq>&wait=1   the same, held up to WAIT_MS until there is an entry past `after`
 *
 * Anything else answers 404 as an unknown journal does; the API's only answers are 200, 201, 204, 400, 401, 404, 409,
 * 413 and 429. An id is 22 characters of base64url (the hash of the read key: whoever has the id has only ciphertext);
 * the verifier is the hash of the write token, which a writer sends and the server compares whole, so nothing the
 * server holds appends an entry. An entry is `kind` in the clear (`ops` or `snapshot`, so a reader starts from the
 * latest snapshot), a 12-byte IV and the ciphertext, at most MAX_ENTRY characters; a journal holds at most MAX_BYTES,
 * and is forgotten TTL after it was last written or read. The order is the server's one job: an entry is appended only
 * at the seq its writer names, the next one, so every entry was made against the whole order before it
 * (docs/kernel.md §12). A page of the site alone writes; anyone with the id may read, since the id gives ciphertext.
 *
 * This file is the whole of it apart from what every service shares (tinier/brake.ts) and where the rows live (a
 * Store): SqlStore keeps them in SQLite by the statements of SCHEMA, on Cloudflare in a Durable Object's own database
 * and on one machine in the process's file (cloudflare/journal/worker.ts, node/server.ts); the tests give it Maps and
 * node's SQLite. docs/crypto/journal.md says what an entry is, byte by byte.
 */
import { bodyText, braked, json, SITE, sitesOf, type Counter } from '../tinier/brake.ts';
import type { SQL } from '../tinier/d1.ts';

export type Kind = 'ops' | 'snapshot';
export interface Entry {
  seq: number;
  kind: Kind;
  iv: string;
  c: string;
}
/** A journal's row: who may write (the verifier), when to forget it, the last seq, the latest snapshot's, and its size. */
export interface Journal {
  id: string;
  verifier: string;
  exp: number;
  last: number;
  snapshot: number;
  bytes: number;
}

export interface Store extends Counter {
  journal(id: string): Promise<Journal | null>;
  /** A new journal with its first entry; false when the id is taken. */
  make(journal: Journal, first: Entry): Promise<boolean>;
  /** `entry` appended if its seq is the next, the row brought up to it and kept until `exp`; false when it is not the next. */
  append(id: string, entry: Entry, exp: number): Promise<boolean>;
  /** The entries from `from` on, in order. */
  read(id: string, from: number): Promise<Entry[]>;
  /** The journal kept until `exp`. */
  touch(id: string, exp: number): Promise<void>;
  /** Every journal past its time forgotten, with its entries. */
  sweep(now: number): Promise<void>;
}

/** Who waits for an entry (a held GET), and is woken by one: a map in memory, one a process or a Durable Object. */
export interface Wake {
  wait(id: string, ms: number): Promise<void>;
  wake(id: string): void;
}
export function waiters(): Wake {
  const held = new Map<string, Set<() => void>>();
  return {
    wait: (id, ms) =>
      new Promise((done) => {
        const set = held.get(id) ?? held.set(id, new Set()).get(id)!;
        const timer = setTimeout(() => (set.delete(go), done()), ms);
        const go = () => (clearTimeout(timer), done());
        set.add(go);
      }),
    wake: (id) => {
      const set = held.get(id);
      held.delete(id);
      set?.forEach((go) => go());
    },
  };
}

/** The most an entry's ciphertext may be, in base64url characters (256 KB of bytes): a snapshot of a long document. */
export const MAX_ENTRY = 350_000;
/** The most a journal may hold, in characters of ciphertext. */
export const MAX_BYTES = 32 * 1024 * 1024;
/** How long a journal lives past its last writing or reading: a year. */
export const TTL = 365 * 86_400_000;
/** How long a GET with wait=1 is held for an entry. */
export const WAIT_MS = 25_000;
/** The statements both platforms run: the journals' rows and their entries, the order the primary key. */
export const SCHEMA = `CREATE TABLE IF NOT EXISTS journals (id TEXT PRIMARY KEY, verifier TEXT NOT NULL, exp INTEGER NOT NULL, last INTEGER NOT NULL, snapshot INTEGER NOT NULL, bytes INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS journals_exp ON journals (exp);
CREATE TABLE IF NOT EXISTS entries (id TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, iv TEXT NOT NULL, c TEXT NOT NULL, PRIMARY KEY (id, seq));`;

const ID = /^[A-Za-z0-9_~-]{22}$/;
const B64 = /^[A-Za-z0-9_~-]+$/;
const DIGEST = /^[A-Za-z0-9_~-]{43}$/;
const KINDS = new Set<string>(['ops', 'snapshot']);
const whole = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

const said = (error: string, site: string, status: number) => json({ error }, site, status);
const gone = (site: string) => said('No such journal, or it has expired.', site, 404);

/** The body as JSON of an object, held to the limit, or null. */
async function body(req: Request, most: number): Promise<Record<string, unknown> | null> {
  if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) return null;
  const text = await bodyText(req, most);
  if (text === null) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
/** An entry as a request gives one, or null. */
function entryOf(v: unknown): Entry | null {
  if (!v || typeof v !== 'object') return null;
  const { seq, kind, iv, c } = v as Record<string, unknown>;
  if (!whole(seq) || seq < 1 || typeof kind !== 'string' || !KINDS.has(kind) || typeof iv !== 'string' || !/^[A-Za-z0-9_~-]{16}$/.test(iv)) return null;
  if (typeof c !== 'string' || !c || c.length > MAX_ENTRY || !B64.test(c)) return null;
  return { seq, kind: kind as Kind, iv, c };
}

const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '~')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
/** Whether the token sent is the journal's: its hash against the verifier, every character compared whatever the first differing one. */
async function mayWrite(req: Request, verifier: string): Promise<boolean> {
  const token = /^Bearer ([A-Za-z0-9_~-]{43})$/.exec(req.headers.get('authorization') ?? '')?.[1];
  if (!token) return false;
  const a = b64(await digest(token));
  let differ = a.length ^ verifier.length;
  for (let i = 0; i < a.length; i++) differ |= a.charCodeAt(i) ^ (verifier.charCodeAt(i) || 0);
  return differ === 0;
}

/** Answer one request. `key` is the brake's secret; `site` the sites whose pages may write (SITE, comma-separated); `wake` the waiters of this process or object. */
export async function handle(req: Request, store: Store, key: string, now: number, site: string, wake: Wake): Promise<Response> {
  const url = new URL(req.url);
  const origins = sitesOf(site).map((s) => new URL(s).origin);
  const asking = req.headers.get('origin');
  const allow = asking && origins.includes(asking) ? asking : (origins[0] ?? SITE);
  const res = await answer(req, url, store, key, now, allow, !asking || origins.includes(asking), wake);
  res.headers.set('x-robots-tag', 'noindex');
  if (origins.length > 1) res.headers.set('vary', 'origin');
  return res;
}

async function answer(req: Request, url: URL, store: Store, key: string, now: number, site: string, fromSite: boolean, wake: Wake): Promise<Response> {
  if (req.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': site,
        'access-control-allow-methods': 'GET, POST, PUT',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '86400',
      },
    });
  const m = /^\/j\/([^/]+)$/.exec(url.pathname);
  if (!m || !ID.test(m[1])) return gone(site);
  const id = m[1];
  // A page of another site never writes here: its request is refused before it is read.
  if (req.method !== 'GET' && !fromSite) return said('Bad request', site, 400);

  if (req.method === 'PUT') {
    const b = await body(req, MAX_ENTRY + 1024);
    const first = b && entryOf(b.entry);
    if (!b || !first || first.seq !== 1 || first.kind !== 'snapshot' || typeof b.verifier !== 'string' || !DIGEST.test(b.verifier)) return said('Bad request', site, 400);
    const wait = await braked(store, key, req, now);
    if (wait !== null) {
      const res = said('A hundred journals a day from one address; try tomorrow.', site, 429);
      res.headers.set('retry-after', String(wait));
      return res;
    }
    const made = await store.make({ id, verifier: b.verifier, exp: now + TTL, last: 1, snapshot: 1, bytes: first.c.length }, first);
    return made ? json({ seq: 1 }, site, 201) : said('That journal is there already.', site, 409);
  }

  const journal = await store.journal(id);
  if (!journal || journal.exp < now) return gone(site);

  if (req.method === 'POST') {
    if (!(await mayWrite(req, journal.verifier))) return said('Not this journal’s writer.', site, 401);
    const b = await body(req, MAX_ENTRY + 1024);
    const entry = b && entryOf(b);
    if (!entry) return said('Bad request', site, 400);
    if (journal.bytes + entry.c.length > MAX_BYTES) return said('This journal is full.', site, 413);
    if (entry.seq !== journal.last + 1 || !(await store.append(id, entry, now + TTL))) {
      // Stale, or beaten to the seq: the entries the writer has not seen, from the one it named.
      return json({ entries: await store.read(id, Math.min(entry.seq, journal.last + 1)) }, site, 409);
    }
    wake.wake(id);
    return json({ seq: entry.seq }, site, 201);
  }

  if (req.method === 'GET') {
    const after = url.searchParams.get('after');
    const from = url.searchParams.get('from');
    let start = journal.snapshot;
    if (after !== null) {
      const n = Number(after);
      if (!whole(n)) return said('Bad request', site, 400);
      start = n + 1;
      if (url.searchParams.get('wait') === '1' && journal.last <= n) await wake.wait(id, WAIT_MS);
    } else if (from !== null) {
      const n = Number(from);
      if (!whole(n) || n < 1) return said('Bad request', site, 400);
      start = n;
    }
    // A reading keeps the journal a year more, written at most once a day: a journal in use lives on, a forgotten one goes.
    if (journal.exp - now < TTL - 86_400_000) await store.touch(id, now + TTL);
    const fresh = after !== null ? await store.journal(id) : journal;
    const entries = await store.read(id, start);
    return json({ last: fresh?.last ?? journal.last, snapshot: fresh?.snapshot ?? journal.snapshot, entries }, site);
  }
  return gone(site);
}

/** The rows in SQL by SCHEMA's statements (D1's few calls, which node's SQLite and a Durable Object's run too); the brake's counts are the `counter`'s (D1's brakes table on Cloudflare). */
export class SqlStore implements Store {
  private db: SQL;
  private counter: Counter;
  constructor(db: SQL, counter: Counter) {
    this.db = db;
    this.counter = counter;
  }
  count(h: string, day: number) {
    return this.counter.count(h, day);
  }
  async journal(id: string) {
    return (await this.db.prepare('SELECT id, verifier, exp, last, snapshot, bytes FROM journals WHERE id = ?').bind(id).first<Journal>()) ?? null;
  }
  async make(j: Journal, first: Entry) {
    const r = await this.db.prepare('INSERT OR IGNORE INTO journals (id, verifier, exp, last, snapshot, bytes) VALUES (?, ?, ?, 1, 1, ?)').bind(j.id, j.verifier, j.exp, first.c.length).run();
    if (r.meta.changes !== 1) return false;
    await this.db.prepare('INSERT INTO entries (id, seq, kind, iv, c) VALUES (?, 1, ?, ?, ?)').bind(j.id, first.kind, first.iv, first.c).run();
    return true;
  }
  async append(id: string, e: Entry, exp: number) {
    // The row is moved to the seq first, and only from the one before it: the one statement that decides the order.
    const r = await this.db
      .prepare('UPDATE journals SET last = ?, snapshot = CASE WHEN ? = ? THEN ? ELSE snapshot END, bytes = bytes + ?, exp = ? WHERE id = ? AND last = ?')
      .bind(e.seq, e.kind, 'snapshot', e.seq, e.c.length, exp, id, e.seq - 1)
      .run();
    if (r.meta.changes !== 1) return false;
    await this.db.prepare('INSERT INTO entries (id, seq, kind, iv, c) VALUES (?, ?, ?, ?, ?)').bind(id, e.seq, e.kind, e.iv, e.c).run();
    return true;
  }
  async read(id: string, from: number) {
    return (await this.db.prepare('SELECT seq, kind, iv, c FROM entries WHERE id = ? AND seq >= ? ORDER BY seq').bind(id, from).all<Entry>()).results;
  }
  async touch(id: string, exp: number) {
    await this.db.prepare('UPDATE journals SET exp = ? WHERE id = ?').bind(exp, id).run();
  }
  async sweep(now: number) {
    await this.db.prepare('DELETE FROM entries WHERE id IN (SELECT id FROM journals WHERE exp < ?)').bind(now).run();
    await this.db.prepare('DELETE FROM journals WHERE exp < ?').bind(now).run();
  }
}
