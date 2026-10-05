import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newLocker, seal, unseal, isSealed } from '../src/lib/crypt.ts';
import { packEnvelope, unpackEnvelope, encodeEnvelope, decodeEnvelope } from '../src/lib/envelope.ts';

const FAST = 1000; // iterations for tests; production uses PBKDF2_ITERATIONS

test('seal and unseal an envelope, wrong password fails', async () => {
  const env = { created: Date.UTC(2026, 9, 5, 12, 0), body: 'a\tb\n=A1*2\tsecret '.repeat(20) };
  const { flag, bytes } = packEnvelope(env);
  const locker = await newLocker('correct horse', FAST);
  const payload = await seal(locker, flag, bytes);
  assert.ok(isSealed(payload));
  assert.ok(!payload.includes('secret'));
  const opened = await unseal('correct horse', payload, FAST);
  assert.ok(opened);
  assert.equal(opened.flag, flag);
  assert.deepEqual(unpackEnvelope(opened.flag, opened.bytes), env);
  assert.equal(await unseal('correct horsE', payload, FAST), null);
  assert.equal(await unseal('', payload, FAST), null);
});

test('re-sealing with the opened locker keeps the salt and changes the IV', async () => {
  const { flag, bytes } = packEnvelope({ created: null, body: 'x' });
  const a = await seal(await newLocker('pw', FAST), flag, bytes);
  const opened = (await unseal('pw', a, FAST))!;
  const b = await seal(opened.locker, flag, bytes);
  assert.notEqual(a, b);
  assert.equal(a.slice(0, 22), b.slice(0, 22)); // same 16-byte salt
  assert.deepEqual((await unseal('pw', b, FAST))!.bytes, bytes);
});

test('tampering is detected, junk is rejected', async () => {
  const { flag, bytes } = packEnvelope({ created: null, body: 'hello world' });
  const payload = await seal(await newLocker('pw', FAST), flag, bytes);
  const i = payload.length - 5;
  const tampered = payload.slice(0, i) + (payload[i] === 'A' ? 'B' : 'A') + payload.slice(i + 1);
  assert.equal(await unseal('pw', tampered, FAST), null);
  assert.equal(await unseal('pw', 'E!!!', FAST), null);
  assert.equal(await unseal('pw', 'Eabc', FAST), null);
  assert.equal(await unseal('pw', 'Zabc', FAST), null);
});

test('overhead is small and the plain codec is unchanged', async () => {
  const env = { created: Date.UTC(2026, 0, 1), body: 'the quick brown fox '.repeat(30) };
  const plain = encodeEnvelope(env);
  const { flag, bytes } = packEnvelope(env);
  const sealed = await seal(await newLocker('pw', FAST), flag, bytes);
  assert.ok(sealed.length - plain.length < 70, `overhead ${sealed.length - plain.length}`);
  assert.deepEqual(decodeEnvelope(plain), env);
});
