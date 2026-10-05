import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSigner, verify, fingerprintOf, type KeyStore } from '../src/lib/sign.ts';

function memStore(): KeyStore {
  let v: string | null = null;
  return { get: () => v, set: (x) => (v = x), remove: () => (v = null) };
}

test('sign and verify, tamper detection', async () => {
  const signer = createSigner(memStore());
  assert.equal(await signer.fingerprint(), null);
  const { key, sig } = await signer.sign('tinyoffice\nsheet\nabc\nbody');
  assert.ok(key.length >= 43);
  assert.ok(sig.length >= 86);
  assert.equal(await verify(key, sig, 'tinyoffice\nsheet\nabc\nbody'), true);
  assert.equal(await verify(key, sig, 'tinyoffice\nsheet\nabc\nbody!'), false);
  const flipped = sig.slice(0, 20) + (sig[20] === 'A' ? 'B' : 'A') + sig.slice(21);
  assert.equal(await verify(key, flipped, 'tinyoffice\nsheet\nabc\nbody'), false);
  assert.equal(await verify('nope', sig, 'x'), false);
  assert.match((await signer.fingerprint())!, /^[0-9a-f]{5}-[0-9a-f]{5}$/);
  assert.equal(await signer.fingerprint(), await fingerprintOf(key));
});

test('key export and import keep identity; forget drops it', async () => {
  const a = createSigner(memStore());
  await a.sign('m');
  const fp = await a.fingerprint();
  const b = createSigner(memStore());
  assert.equal(await b.importKey(await a.exportKey()), fp);
  const { key, sig } = await b.sign('again');
  assert.equal(await verify(key, sig, 'again'), true);
  b.forget();
  assert.equal(await b.fingerprint(), null);
  await assert.rejects(b.importKey('{"alg":"rsa"}'));
  await assert.rejects(b.importKey('not json'));
});

test('two browsers have different keys', async () => {
  const a = createSigner(memStore());
  const b = createSigner(memStore());
  const sa = await a.sign('m');
  const sb = await b.sign('m');
  assert.notEqual(sa.key, sb.key);
  assert.equal(await verify(sa.key, sb.sig, 'm'), false);
});
