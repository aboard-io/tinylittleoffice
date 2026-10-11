/**
 * Signing with WebCrypto. A browser gets one Ed25519 key pair, kept where the site keeps things
 * (kit/store.ts) as JWK: under Saved on the device, under Private for the visit. The public key and the
 * signature travel in the document's head (kit/envelope.ts). ECDSA P-256 is the fallback where Ed25519 is
 * not implemented; the key's length tells the two apart when verifying.
 *
 * Honest limits: a signature proves that whoever holds the key vouched for exactly this content, title,
 * name and creation time. The name and the time are the signer's own word. (Ported from the old tree's
 * src/lib/sign.ts.)
 */
import { fromBase64Url, toBase64Url } from './codec.ts';

export interface KeyStore {
  get(): string | null;
  set(v: string): void;
  remove(): void;
}

export interface Signer {
  /** This browser's key's fingerprint, or null when it has none yet. */
  fingerprint(): Promise<string | null>;
  /** This browser's public key (base64url), or null when it has none yet. */
  publicKey(): Promise<string | null>;
  sign(message: string): Promise<{ key: string; sig: string }>;
  exportKey(): Promise<string>;
  importKey(json: string): Promise<string>;
  forget(): void;
}

const subtle = () => globalThis.crypto.subtle;
const ED = { name: 'Ed25519' } as const;
const EC = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const EC_SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

interface StoredKey {
  alg: 'ed' | 'ec';
  priv: JsonWebKey;
  pub: JsonWebKey;
}

/** A new key pair: Ed25519, or P-256 where the browser has no Ed25519 (`only` forces one, for the tests). */
export async function generate(only?: 'ed' | 'ec'): Promise<StoredKey> {
  if (only !== 'ec') {
    try {
      const kp = (await subtle().generateKey(ED, true, ['sign', 'verify'])) as CryptoKeyPair;
      return { alg: 'ed', priv: await subtle().exportKey('jwk', kp.privateKey), pub: await subtle().exportKey('jwk', kp.publicKey) };
    } catch (err) {
      if (only === 'ed') throw err;
    }
  }
  const kp = (await subtle().generateKey(EC, true, ['sign', 'verify'])) as CryptoKeyPair;
  return { alg: 'ec', priv: await subtle().exportKey('jwk', kp.privateKey), pub: await subtle().exportKey('jwk', kp.publicKey) };
}

async function rawPublic(k: StoredKey): Promise<Uint8Array> {
  const key = await subtle().importKey('jwk', k.pub, k.alg === 'ed' ? ED : EC, true, ['verify']);
  return new Uint8Array(await subtle().exportKey('raw', key));
}

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

/**
 * A human-comparable id for a public key: the first 100 bits of its SHA-256 in base32 (RFC 4648's alphabet, lower
 * case), four groups of five, "abcde-fghij-klmno-pqrst". 100 bits so that no one can make a key that matches
 * another's (40 bits fell to a rented GPU in hours), still short enough to read out.
 */
export async function fingerprintOf(keyB64: string): Promise<string> {
  const digest = new Uint8Array(await subtle().digest('SHA-256', fromBase64Url(keyB64) as BufferSource));
  let out = '';
  for (let i = 0; i < 20; i++) {
    const bit = i * 5;
    const two = (digest[bit >> 3] << 8) | digest[(bit >> 3) + 1];
    out += BASE32[(two >> (11 - (bit & 7))) & 31] + (i % 5 === 4 && i < 19 ? '-' : '');
  }
  return out;
}

/** Whether a signature made by sign() holds for this message. The key's length tells the algorithm. */
export async function verify(keyB64: string, sigB64: string, message: string): Promise<boolean> {
  try {
    const raw = fromBase64Url(keyB64);
    const sig = fromBase64Url(sigB64);
    const data = new TextEncoder().encode(message);
    if (raw.length === 32) {
      const key = await subtle().importKey('raw', raw as BufferSource, ED, false, ['verify']);
      return await subtle().verify(ED, key, sig as BufferSource, data);
    }
    if (raw.length === 65) {
      const key = await subtle().importKey('raw', raw as BufferSource, EC, false, ['verify']);
      return await subtle().verify(EC_SIGN, key, sig as BufferSource, data);
    }
  } catch {
    /* malformed */
  }
  return false;
}

/** RFC 8032's first test key: a public key every Ed25519 accepts, to ask the browser whether it has Ed25519. */
const ED_PROBE = Uint8Array.from('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'.match(/../g)!, (h) => parseInt(h, 16));

/**
 * Whether this browser can check a signature by this key at all. P-256 is in every WebCrypto; Ed25519 is not
 * (older Safari, some embedded browsers), and where it is missing an Ed25519 signature cannot be checked,
 * which is not the same as not matching.
 */
export async function canCheck(keyB64: string): Promise<boolean> {
  let raw: Uint8Array;
  try {
    raw = fromBase64Url(keyB64);
  } catch {
    return true;
  }
  if (raw.length !== 32) return true;
  try {
    await subtle().importKey('raw', ED_PROBE as BufferSource, ED, false, ['verify']);
    return true;
  } catch {
    return false;
  }
}

/** A signer over a place to keep its key; `make` makes the key when there is none (the tests force P-256 with it). */
export function createSigner(store: KeyStore, make: () => Promise<StoredKey> = generate): Signer {
  const load = (): StoredKey | null => {
    try {
      const raw = store.get();
      return raw ? (JSON.parse(raw) as StoredKey) : null;
    } catch {
      return null;
    }
  };
  const ensure = async (): Promise<StoredKey> => {
    let k = load();
    if (!k) {
      k = await make();
      store.set(JSON.stringify(k));
    }
    return k;
  };
  const publicKey = async () => {
    const k = load();
    return k ? toBase64Url(await rawPublic(k)) : null;
  };
  return {
    publicKey,
    async fingerprint() {
      const key = await publicKey();
      return key ? fingerprintOf(key) : null;
    },
    async sign(message) {
      const k = await ensure();
      const priv = await subtle().importKey('jwk', k.priv, k.alg === 'ed' ? ED : EC, false, ['sign']);
      const sig = await subtle().sign(k.alg === 'ed' ? ED : EC_SIGN, priv, new TextEncoder().encode(message));
      return { key: toBase64Url(await rawPublic(k)), sig: toBase64Url(new Uint8Array(sig)) };
    },
    async exportKey() {
      return JSON.stringify(await ensure());
    },
    async importKey(json) {
      const k = JSON.parse(json) as StoredKey;
      if ((k.alg !== 'ed' && k.alg !== 'ec') || !k.priv || !k.pub) throw new Error('not a key');
      await subtle().importKey('jwk', k.priv, k.alg === 'ed' ? ED : EC, false, ['sign']);
      store.set(JSON.stringify({ alg: k.alg, priv: k.priv, pub: k.pub }));
      return fingerprintOf(toBase64Url(await rawPublic(k)));
    },
    forget() {
      store.remove();
    },
  };
}
