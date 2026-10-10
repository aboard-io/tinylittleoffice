/**
 * A password on a document. The packed text (kit/codec.ts) is encrypted with AES-256-GCM under a key
 * derived from the password by PBKDF2-SHA-256, and the link carries
 *   E<base64url(salt[16] | iv[12] | ciphertext)>
 * where the plaintext is the codec's flag byte followed by the packed bytes, so the tag authenticates the
 * flag too. Deriving the key is slow on purpose and happens once a visit; each edit then only runs AES-GCM
 * with a fresh IV. Anyone holding the link can try passwords offline, so the protection is exactly as strong
 * as the password. WebCrypto alone. (Ported from the old tree's src/lib/crypt.ts; parameters unchanged.)
 */
import { fromBase64Url, isSealed, toBase64Url } from './codec.ts';

export { isSealed };

export const PBKDF2_ITERATIONS = 600_000;
const SALT_LEN = 16;
const IV_LEN = 12;

/** A password's key and the salt it was derived with: what re-seals a document without asking again. */
export interface Locker {
  salt: Uint8Array;
  key: CryptoKey;
}

const subtle = () => globalThis.crypto.subtle;

export async function deriveKey(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** A fresh locker for a new password. */
export async function newLocker(password: string, iterations = PBKDF2_ITERATIONS): Promise<Locker> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LEN));
  return { salt, key: await deriveKey(password, salt, iterations) };
}

/** Encrypt a flag and bytes into a link's payload, under a fresh IV. */
export function seal(locker: Locker, flag: string, bytes: Uint8Array): Promise<string> {
  return sealAt(locker, flag, bytes, globalThis.crypto.getRandomValues(new Uint8Array(IV_LEN)));
}

/**
 * For the test vectors alone (test/crypto-vectors.test.ts, docs/crypto/password.md): seal() with the IV
 * given rather than drawn, so a fixed input has one known output. An IV used twice under one key gives the
 * key away; nothing in the site calls this, and a test holds it to that.
 * @internal
 */
export async function sealAt(locker: Locker, flag: string, bytes: Uint8Array, iv: Uint8Array): Promise<string> {
  if (iv.length !== IV_LEN) throw new Error('an IV is 12 bytes');
  const plain = new Uint8Array(bytes.length + 1);
  plain[0] = flag.charCodeAt(0);
  plain.set(bytes, 1);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, locker.key, plain as BufferSource));
  const out = new Uint8Array(SALT_LEN + IV_LEN + ct.length);
  out.set(locker.salt, 0);
  out.set(iv, SALT_LEN);
  out.set(ct, SALT_LEN + IV_LEN);
  return 'E' + toBase64Url(out);
}

/** A sealed payload's parts, or null for one too short or not base64url. */
function parts(payload: string): { salt: Uint8Array; iv: Uint8Array; ct: Uint8Array } | null {
  if (!isSealed(payload)) return null;
  let all: Uint8Array;
  try {
    all = fromBase64Url(payload.slice(1));
  } catch {
    return null;
  }
  if (all.length < SALT_LEN + IV_LEN + 17) return null;
  return { salt: all.slice(0, SALT_LEN), iv: all.slice(SALT_LEN, SALT_LEN + IV_LEN), ct: all.slice(SALT_LEN + IV_LEN) };
}

async function open(key: CryptoKey, iv: Uint8Array, ct: Uint8Array): Promise<{ flag: string; bytes: Uint8Array } | null> {
  try {
    const plain = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource));
    return { flag: String.fromCharCode(plain[0]), bytes: plain.slice(1) };
  } catch {
    return null;
  }
}

/**
 * Decrypt a sealed payload. Null for a wrong password or a damaged link (AES-GCM cannot tell the two apart).
 * The locker returned reuses the link's salt, so later edits are re-sealed without deriving again.
 */
export async function unseal(password: string, payload: string, iterations = PBKDF2_ITERATIONS): Promise<{ locker: Locker; flag: string; bytes: Uint8Array } | null> {
  const p = parts(payload);
  if (!p) return null;
  const key = await deriveKey(password, p.salt, iterations);
  const opened = await open(key, p.iv, p.ct);
  return opened ? { locker: { salt: p.salt, key }, ...opened } : null;
}

/** Decrypt with a locker already held (the same document met again this visit): null unless its salt is the link's and the key fits. */
export async function unsealWith(locker: Locker, payload: string): Promise<{ flag: string; bytes: Uint8Array } | null> {
  const p = parts(payload);
  if (!p || p.salt.length !== locker.salt.length || p.salt.some((b, i) => b !== locker.salt[i])) return null;
  return open(locker.key, p.iv, p.ct);
}
