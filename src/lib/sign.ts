/**
 * Document signing with WebCrypto. A browser gets one Ed25519 key pair, kept
 * in localStorage as JWK; the public key and signature travel in the URL.
 * ECDSA P-256 is the fallback where Ed25519 is not implemented.
 *
 * Honest limits: the key proves that whoever holds it vouched for exactly this
 * content and creation time. The time itself is self-reported by the signer.
 */
import { toBase64Url, fromBase64Url } from './codec.ts';

export interface KeyStore {
  get(): string | null;
  set(v: string): void;
  remove(): void;
}

export interface Signer {
  /** Fingerprint of this browser's key, or null if none exists yet. */
  fingerprint(): Promise<string | null>;
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

async function generate(): Promise<StoredKey> {
  try {
    const kp = (await subtle().generateKey(ED, true, ['sign', 'verify'])) as CryptoKeyPair;
    return { alg: 'ed', priv: await subtle().exportKey('jwk', kp.privateKey), pub: await subtle().exportKey('jwk', kp.publicKey) };
  } catch {
    const kp = (await subtle().generateKey(EC, true, ['sign', 'verify'])) as CryptoKeyPair;
    return { alg: 'ec', priv: await subtle().exportKey('jwk', kp.privateKey), pub: await subtle().exportKey('jwk', kp.publicKey) };
  }
}

async function rawPublic(k: StoredKey): Promise<Uint8Array> {
  const key = await subtle().importKey('jwk', k.pub, k.alg === 'ed' ? ED : EC, true, ['verify']);
  return new Uint8Array(await subtle().exportKey('raw', key));
}

/** Short, human-comparable id for a public key: 10 hex chars of its SHA-256. */
export async function fingerprintOf(keyB64: string): Promise<string> {
  const digest = new Uint8Array(await subtle().digest('SHA-256', fromBase64Url(keyB64) as BufferSource));
  const hex = Array.from(digest.slice(0, 5), (b) => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 5) + '-' + hex.slice(5);
}

/** Verify a signature made by sign(). Key length tells the algorithm apart. */
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

export function createSigner(store: KeyStore): Signer {
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
      k = await generate();
      store.set(JSON.stringify(k));
    }
    return k;
  };
  return {
    async fingerprint() {
      const k = load();
      return k ? fingerprintOf(toBase64Url(await rawPublic(k))) : null;
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
      if ((k.alg !== 'ed' && k.alg !== 'ec') || !k.priv || !k.pub) throw new Error('Not a TinyOffice key');
      await subtle().importKey('jwk', k.priv, k.alg === 'ed' ? ED : EC, false, ['sign']);
      store.set(JSON.stringify({ alg: k.alg, priv: k.priv, pub: k.pub }));
      return fingerprintOf(toBase64Url(await rawPublic(k)));
    },
    forget() {
      store.remove();
    },
  };
}

export function localStorageStore(name = 'tinyoffice.key'): KeyStore {
  return {
    get: () => {
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    set: (v) => {
      try {
        localStorage.setItem(name, v);
      } catch {
        /* private mode */
      }
    },
    remove: () => {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}
