// Signing (kit/sign.ts): Ed25519, with P-256 where a browser has none; tampering fails; a key moves between devices.
import { test, expect } from 'vitest';
import { canCheck, createSigner, fingerprintOf, generate, verify, type KeyStore } from '../src/kit/sign.ts';

function memStore(): KeyStore {
  let v: string | null = null;
  return { get: () => v, set: (x) => (v = x), remove: () => (v = null) };
}

for (const alg of ['ed', 'ec'] as const) {
  test(`sign and verify, tamper fails (${alg === 'ed' ? 'Ed25519' : 'the P-256 fallback'})`, async () => {
    const signer = createSigner(memStore(), () => generate(alg));
    expect(await signer.fingerprint()).toBeNull();
    expect(await signer.publicKey()).toBeNull();
    const m = 'tinyoffice\nsheet\nabc\nbody';
    const { key, sig } = await signer.sign(m);
    expect(key.length).toBe(alg === 'ed' ? 43 : 87); // 32 bytes, or 65
    expect(await verify(key, sig, m)).toBe(true);
    expect(await verify(key, sig, m + '!')).toBe(false);
    const flipped = sig.slice(0, 20) + (sig[20] === 'A' ? 'B' : 'A') + sig.slice(21);
    expect(await verify(key, flipped, m)).toBe(false);
    expect(await verify('nope', sig, m)).toBe(false);
    expect(await signer.fingerprint()).toMatch(/^[0-9a-f]{5}-[0-9a-f]{5}$/);
    expect(await signer.fingerprint()).toBe(await fingerprintOf(key));
    expect(await signer.publicKey()).toBe(key);
  });
}

test('the fallback is taken where Ed25519 is not there', async () => {
  const subtle = globalThis.crypto.subtle;
  const real = subtle.generateKey.bind(subtle);
  subtle.generateKey = ((alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519' ? Promise.reject(new Error('NotSupported')) : (real as (...a: unknown[]) => unknown)(alg, ...rest)) as typeof subtle.generateKey;
  try {
    const signer = createSigner(memStore());
    const { key, sig } = await signer.sign('m');
    expect(key.length).toBe(87);
    expect(await verify(key, sig, 'm')).toBe(true);
  } finally {
    subtle.generateKey = real;
  }
});

test('a browser without Ed25519 cannot check an Ed25519 signature, and says so; P-256 it always can', async () => {
  const ed = await createSigner(memStore(), () => generate('ed')).sign('m');
  const ec = await createSigner(memStore(), () => generate('ec')).sign('m');
  expect(await canCheck(ed.key)).toBe(true);
  const subtle = globalThis.crypto.subtle;
  const real = subtle.importKey.bind(subtle);
  subtle.importKey = ((fmt: string, data: unknown, alg: AlgorithmIdentifier, ...rest: unknown[]) =>
    (alg as Algorithm).name === 'Ed25519'
      ? Promise.reject(new DOMException('Unrecognized name', 'NotSupportedError'))
      : (real as (...a: unknown[]) => unknown)(fmt, data, alg, ...rest)) as typeof subtle.importKey;
  try {
    expect(await canCheck(ed.key)).toBe(false);
    expect(await verify(ed.key, ed.sig, 'm')).toBe(false);
    expect(await canCheck(ec.key)).toBe(true);
    expect(await verify(ec.key, ec.sig, 'm')).toBe(true);
    expect(await canCheck('not base64url!')).toBe(true);
  } finally {
    subtle.importKey = real;
  }
});

test('export and import keep who you are; forget drops it; junk is refused', async () => {
  const a = createSigner(memStore());
  await a.sign('m');
  const fp = await a.fingerprint();
  const b = createSigner(memStore());
  expect(await b.importKey(await a.exportKey())).toBe(fp);
  const { key, sig } = await b.sign('again');
  expect(await verify(key, sig, 'again')).toBe(true);
  b.forget();
  expect(await b.fingerprint()).toBeNull();
  await expect(b.importKey('{"alg":"rsa"}')).rejects.toThrow();
  await expect(b.importKey('not json')).rejects.toThrow();
});

test('two browsers, two keys', async () => {
  const sa = await createSigner(memStore()).sign('m');
  const sb = await createSigner(memStore()).sign('m');
  expect(sa.key).not.toBe(sb.key);
  expect(await verify(sa.key, sb.sig, 'm')).toBe(false);
});
