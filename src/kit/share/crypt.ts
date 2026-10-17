/**
 * A password on a document. The packed text (kit/core/codec.ts) is encrypted with AES-256-GCM under a key
 * derived from the password by one HKDF-SHA-256 pass, and the link carries
 *   E<base64url(salt[16] | iv[12] | ciphertext)>
 * where the plaintext is the codec's flag byte followed by the packed bytes, so the tag authenticates the
 * flag too. Every password is one the app made (kit/share/passwords.ts: about 116 random bits), so the password is
 * the entropy and the KDF only turns it into a key: there is nothing to stretch, and opening costs a phone
 * nothing. Each edit runs AES-GCM with
 * a fresh IV. WebCrypto alone. docs/crypto/password.md gives the layout and why it is sound.
 */
import { encodeDoc, fromBase64Url, isSealed, packDoc, toBase64Url, unpackDoc } from '../core/codec.ts';

/** HKDF's info: names the format, so this key is for nothing else. */
const INFO = new TextEncoder().encode('tinylittleoffice sealed v1');
const SALT_LEN = 16;
const IV_LEN = 12;

/** A password's key and the salt it was derived with: what re-seals a document without asking again. */
export interface Locker {
  salt: Uint8Array;
  key: CryptoKey;
}

const subtle = () => globalThis.crypto.subtle;

/** The key for a password and a salt: HKDF-SHA-256 over the password's NFKC bytes (as it is typed to open), the salt as HKDF's salt. */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: INFO }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** A fresh locker for a new password. */
export async function newLocker(password: string): Promise<Locker> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LEN));
  return { salt, key: await deriveKey(password, salt) };
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

/** Whether a payload has a sealed payload's shape at all: "E", base64url, and at least a salt, an IV, a flag and a tag. A link cut short in a chat fails here, before any password is asked for. */
export const isWholeSeal = (payload: string): boolean => parts(payload) !== null;

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
export async function unseal(password: string, payload: string): Promise<{ locker: Locker; flag: string; bytes: Uint8Array } | null> {
  const p = parts(payload);
  if (!p) return null;
  const key = await deriveKey(password, p.salt);
  const opened = await open(key, p.iv, p.ct);
  return opened ? { locker: { salt: p.salt, key }, ...opened } : null;
}

/** Decrypt with a locker already held (the same document met again this visit): null unless its salt is the link's and the key fits. */
export async function unsealWith(locker: Locker, payload: string): Promise<{ flag: string; bytes: Uint8Array } | null> {
  const p = parts(payload);
  if (!p || p.salt.length !== locker.salt.length || p.salt.some((b, i) => b !== locker.salt[i])) return null;
  return open(locker.key, p.iv, p.ct);
}

/* ---------- a document's text, sealed and opened ---------- */

/** A document's text as its link's payload: sealed under the locker when there is one. */
export async function pack(text: string, locker: Locker | null): Promise<string> {
  if (!locker) return encodeDoc(text);
  const { flag, bytes } = packDoc(text);
  return seal(locker, flag, bytes);
}

/** What a seal held, as a document's text, or null when it is not one the codec reads (a seal made of other bytes under the password). */
const unpacked = ({ flag, bytes }: { flag: string; bytes: Uint8Array }): string | null => {
  try {
    return unpackDoc(flag, bytes);
  } catch {
    return null;
  }
};

/** A password tried on a sealed payload: the text and its locker, or null when it is not the password, or the seal holds no document. */
export async function unlock(password: string, payload: string): Promise<{ text: string; locker: Locker } | null> {
  const r = await unseal(password, payload);
  const text = r && unpacked(r);
  return !r || text === null ? null : { text, locker: r.locker };
}

/** A sealed payload opened by a locker already held: the text, or null when the locker is not its or the seal holds no document. */
export async function reopenWith(locker: Locker, payload: string): Promise<string | null> {
  const r = await unsealWith(locker, payload);
  return r ? unpacked(r) : null;
}
