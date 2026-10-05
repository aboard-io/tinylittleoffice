/**
 * Optional password protection for a document.
 *
 * The packed envelope bytes are encrypted with AES-256-GCM under a key
 * derived from the password with PBKDF2-SHA-256. The URL carries
 *   E<base64url(salt[16] | iv[12] | ciphertext)>
 * where the plaintext is one flag byte (which packing was used) followed by
 * the packed bytes, so the tag also authenticates the flag.
 *
 * Deriving the key is deliberately slow and happens once per session; each
 * edit then only runs AES-GCM with a fresh IV. Anyone holding the link can
 * try passwords offline, so the protection is exactly as strong as the
 * password.
 */
import { toBase64Url, fromBase64Url } from './codec.ts';

export const PBKDF2_ITERATIONS = 600_000;
const SALT_LEN = 16;
const IV_LEN = 12;

export interface Locker {
  salt: Uint8Array;
  key: CryptoKey;
}

const subtle = () => globalThis.crypto.subtle;

export async function deriveKey(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** A fresh locker for a new password. */
export async function newLocker(password: string, iterations = PBKDF2_ITERATIONS): Promise<Locker> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LEN));
  return { salt, key: await deriveKey(password, salt, iterations) };
}

export function isSealed(payload: string): boolean {
  return payload.startsWith('E');
}

/** Encrypt a flag + bytes pair into a URL payload. */
export async function seal(locker: Locker, flag: string, bytes: Uint8Array): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LEN));
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

/**
 * Decrypt a sealed payload. Returns null for a wrong password or a damaged
 * link (AES-GCM cannot tell the two apart). The returned locker reuses the
 * link's salt so later edits can be re-sealed without deriving again.
 */
export async function unseal(password: string, payload: string, iterations = PBKDF2_ITERATIONS): Promise<{ locker: Locker; flag: string; bytes: Uint8Array } | null> {
  if (!isSealed(payload)) return null;
  let all: Uint8Array;
  try {
    all = fromBase64Url(payload.slice(1));
  } catch {
    return null;
  }
  if (all.length < SALT_LEN + IV_LEN + 17) return null;
  const salt = all.slice(0, SALT_LEN);
  const iv = all.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ct = all.slice(SALT_LEN + IV_LEN);
  const key = await deriveKey(password, salt, iterations);
  try {
    const plain = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, ct as BufferSource));
    return { locker: { salt, key }, flag: String.fromCharCode(plain[0]), bytes: plain.slice(1) };
  } catch {
    return null;
  }
}
