/**
 * A journal's client (backends/journal/journal.ts; backends/README.md, "The journal"): the keys a secret gives, an
 * entry sealed and opened, and the four requests. A page gives it the service's address, so nothing here names one
 * (kit/core/network.ts lists what the site reaches, and the site does not reach a journal yet).
 *
 * The secret is 32 random bytes; from it, by HKDF-SHA-256 with the format's name as the info and no salt, come the read
 * key (AES-256-GCM, what seals and opens every entry), the write token (what the server asks for, as a bearer) and the
 * id (the hash of the read key: the server holds ciphertext under an address that says nothing of the key). A writer's
 * address carries the secret, `#w…`; a reader's the read key, `#r…`, from which no token comes. An entry's plaintext is
 * its JSON, padded to a multiple of PAD so its length says little, under additional data that names the format, the
 * journal, the seq and the kind: an entry moved to another place or another journal does not open.
 * docs/crypto/journal.md gives the layout; test/crypto-vectors.test.ts holds it.
 */
import { fromBase64Url, toBase64Url } from '../core/codec.ts';

export type Kind = 'ops' | 'snapshot';
export interface Entry {
  seq: number;
  kind: Kind;
  iv: string;
  c: string;
}
/** What a journal's address gives: the id, the key that opens its entries, and the token that writes, for a writer. */
export interface Keys {
  id: string;
  key: CryptoKey;
  token?: string;
}

const NAME = 'tinylittleoffice journal';
const enc = (s: string) => new TextEncoder().encode(s);
const subtle = () => globalThis.crypto.subtle;
/** An entry's padding: its plaintext is a multiple of this many bytes. */
export const PAD = 256;
const SECRET = /^[A-Za-z0-9_~-]{43}$/;

const hkdf = async (secret: Uint8Array, info: string): Promise<Uint8Array> => {
  const base = await subtle().importKey('raw', secret as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc(`${NAME} ${info} v1`) }, base, 256));
};
const sha = async (bytes: Uint8Array): Promise<Uint8Array> => new Uint8Array(await subtle().digest('SHA-256', bytes as BufferSource));
const aes = (raw: Uint8Array) => subtle().importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);

/** A new journal's secret: 32 random bytes, as base64url. */
export const newSecret = (): string => toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));

/** The id a read key names: base64url(SHA-256(the format's name ‖ the key)), 22 characters. */
const idOf = async (read: Uint8Array): Promise<string> => toBase64Url(await sha(new Uint8Array([...enc(`${NAME} id v1`), ...read]))).slice(0, 22);

/** The keys a writer's secret gives: the id, the read key (and its text, for a reader's address) and the token. */
export async function writerKeys(secret: string): Promise<Keys & { token: string; read: string }> {
  if (!SECRET.test(secret)) throw new Error('not a journal secret');
  const bytes = fromBase64Url(secret);
  const read = await hkdf(bytes, 'read');
  return { id: await idOf(read), key: await aes(read), token: toBase64Url(await hkdf(bytes, 'write')), read: toBase64Url(read) };
}
/** The keys a reader's key gives: the id and the read key, and no token. */
export async function readerKeys(read: string): Promise<Keys> {
  if (!SECRET.test(read)) throw new Error('not a journal key');
  const bytes = fromBase64Url(read);
  return { id: await idOf(bytes), key: await aes(bytes) };
}
/** What the server keeps of a token: base64url(SHA-256(the token's text)), compared whole with what a writer sends. */
export const verifierOf = async (token: string): Promise<string> => toBase64Url(await sha(enc(token)));

/** A journal's address: the service, its id, and after "#" the secret (`w`, a writer's) or the read key (`r`, a reader's). */
export const journalAddress = (service: string, id: string, part: { secret: string } | { read: string }): string => `${service}j/${id}#${'secret' in part ? `w${part.secret}` : `r${part.read}`}`;
const ADDRESS = /^(https?:\/\/[^#?]*\/)j\/([A-Za-z0-9_~-]{22})#([wr])([A-Za-z0-9_~-]{43})$/;
/** Whether an address has a journal's shape: the service, `/j/<id>` and a writer's or a reader's part. */
export const isJournalAddress = (address: string): boolean => ADDRESS.test(address.trim());
/** An address taken apart: the service, the id, and the keys its fragment gives; null when it is not a journal's, or its id is not its key's. */
export async function parseAddress(address: string): Promise<{ service: string; id: string; keys: Keys } | null> {
  const m = ADDRESS.exec(address.trim());
  if (!m) return null;
  const keys = m[3] === 'w' ? await writerKeys(m[4]) : await readerKeys(m[4]);
  return keys.id === m[2] ? { service: m[1], id: m[2], keys } : null;
}
/** A reader's address for a writer's, to give someone who follows and does not write; a reader's as it is; null for neither. */
export async function readerAddressOf(address: string): Promise<string | null> {
  const m = ADDRESS.exec(address.trim());
  if (!m) return null;
  if (m[3] === 'r') return address.trim();
  const keys = await writerKeys(m[4]);
  return keys.id === m[2] ? journalAddress(m[1], keys.id, { read: keys.read }) : null;
}

const aad = (id: string, seq: number, kind: Kind) => enc(`${NAME} v1\n${id}\n${seq}\n${kind}`);

/** An entry's content sealed for its place: the JSON's bytes after their length, padded to PAD, under a fresh IV. */
export function sealEntry(keys: Keys, seq: number, kind: Kind, content: unknown): Promise<Entry> {
  return sealEntryAt(keys, seq, kind, content, globalThis.crypto.getRandomValues(new Uint8Array(12)));
}
/**
 * For the test vectors alone (test/crypto-vectors.test.ts, docs/crypto/journal.md): sealEntry() with the IV given
 * rather than drawn. An IV used twice under one key gives the key away; nothing in the site calls this, and a test
 * holds it to that.
 * @internal
 */
export async function sealEntryAt(keys: Keys, seq: number, kind: Kind, content: unknown, iv: Uint8Array): Promise<Entry> {
  if (iv.length !== 12) throw new Error('an IV is 12 bytes');
  const json = enc(JSON.stringify(content));
  const plain = new Uint8Array(Math.ceil((json.length + 4) / PAD) * PAD);
  new DataView(plain.buffer).setUint32(0, json.length);
  plain.set(json, 4);
  const c = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad(keys.id, seq, kind) }, keys.key, plain));
  return { seq, kind, iv: toBase64Url(iv), c: toBase64Url(c) };
}
/** An entry opened at its place, or null for one that is not this journal's, not at this place, or not whole. */
export async function openEntry<T = unknown>(keys: Keys, entry: Entry): Promise<T | null> {
  try {
    const plain = new Uint8Array(
      await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64Url(entry.iv) as BufferSource, additionalData: aad(keys.id, entry.seq, entry.kind) }, keys.key, fromBase64Url(entry.c) as BufferSource),
    );
    const n = new DataView(plain.buffer).getUint32(0);
    return JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + n))) as T;
  } catch {
    return null;
  }
}

/** What a journal answers a reading. */
export interface Read {
  last: number;
  snapshot: number;
  entries: Entry[];
}
/** The service's answer to an append: the seq it took, or the entries past the one named (stale). */
export type Appended = { seq: number } | { entries: Entry[] };

class JournalError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'JournalError';
    this.status = status;
  }
}
const failed = async (res: Response): Promise<never> => {
  let said = '';
  try {
    said = String(((await res.json()) as { error?: string }).error ?? '');
  } catch {
    // Not JSON: the status says enough.
  }
  throw new JournalError(res.status, said || `the journal answered ${res.status}`);
};

/** The four requests, at `service` (an address ending in "/"), for the journal `keys` name. */
export class Journal {
  readonly service: string;
  readonly keys: Keys;
  constructor(service: string, keys: Keys) {
    this.service = service;
    this.keys = keys;
  }
  private get url() {
    return `${this.service}j/${this.keys.id}`;
  }
  private headers(json: boolean): Record<string, string> {
    return { ...(json ? { 'content-type': 'application/json' } : {}), ...(this.keys.token ? { authorization: `Bearer ${this.keys.token}` } : {}) };
  }
  /** The journal made with its first entry, a snapshot. */
  async make(content: unknown): Promise<void> {
    if (!this.keys.token) throw new JournalError(401, 'a reader cannot make a journal');
    const entry = await sealEntry(this.keys, 1, 'snapshot', content);
    const res = await fetch(this.url, { method: 'PUT', headers: this.headers(true), body: JSON.stringify({ verifier: await verifierOf(this.keys.token), entry }) });
    if (res.status !== 201) await failed(res);
  }
  /** `content` appended at `seq`; the entries past it when the seq was not the next. */
  async append(seq: number, kind: Kind, content: unknown): Promise<Appended> {
    if (!this.keys.token) throw new JournalError(401, 'a reader cannot write');
    const entry = await sealEntry(this.keys, seq, kind, content);
    const res = await fetch(this.url, { method: 'POST', headers: this.headers(true), body: JSON.stringify(entry) });
    if (res.status === 201 || res.status === 409) return (await res.json()) as Appended;
    return failed(res);
  }
  /** The entries from the latest snapshot, or from `from`. */
  async read(from?: number): Promise<Read> {
    const res = await fetch(from === undefined ? this.url : `${this.url}?from=${from}`, { headers: this.headers(false) });
    return res.ok ? ((await res.json()) as Read) : failed(res);
  }
  /** The entries past `after`, when there are any: held by the service until one comes, or `signal` ends the wait. */
  async poll(after: number, signal?: AbortSignal): Promise<Read> {
    const res = await fetch(`${this.url}?after=${after}&wait=1`, { headers: this.headers(false), signal });
    return res.ok ? ((await res.json()) as Read) : failed(res);
  }
}
