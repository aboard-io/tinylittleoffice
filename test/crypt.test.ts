// A password on a document (kit/crypt.ts): AES-256-GCM under a PBKDF2-SHA-256 key, the old tree's parameters,
// and a sealed vector opening.
import { test, expect } from 'vitest';
import { PBKDF2_ITERATIONS, isSealed, newLocker, seal, unseal, unsealWith } from '../src/kit/crypt.ts';
import { decodeDoc, encodeDoc, packDoc, unpackDoc } from '../src/kit/codec.ts';

const FAST = 1000; // the tests' iterations; a real link uses PBKDF2_ITERATIONS

test('the parameters are the old tree\'s: 600,000 iterations, a 16-byte salt, a 12-byte IV, "E" first', async () => {
  expect(PBKDF2_ITERATIONS).toBe(600_000);
  const { flag, bytes } = packDoc('x');
  const sealed = await seal(await newLocker('pw', FAST), flag, bytes);
  expect(sealed[0]).toBe('E');
  // salt 16 + iv 12 + (flag 1 + bytes + tag 16), base64url
  expect(sealed.length - 1).toBe(Math.ceil(((16 + 12 + 1 + bytes.length + 16) * 4) / 3));
});

test('a sealed vector opens to its text, and only with its password', async () => {
  // Sealed by kit/crypt.ts (seal over packDoc, flag "y"), at 1000 iterations; made again when the dictionary's zone
  // became America/New_York (r17-finish), since the old tree's vector inflated against the old dictionary.
  const payload = 'EqNNvy_Xyadn4GYEvTwcDzYJeBVS54SVFC89YrGTnbBoQI4P2FNzcfi2HEWgs6JJeEP8XomdfYzFlb6yv4lBKhsg1yiIOk9WnJg';
  const opened = await unseal('correct horse', payload, FAST);
  expect(opened).not.toBeNull();
  expect(unpackDoc(opened!.flag, opened!.bytes)).toBe('---\ntitle: Secret\n---\nhello sealed world\n');
  expect(await unseal('correct horsE', payload, FAST)).toBeNull();
  expect(await unseal('', payload, FAST)).toBeNull();
  // The password is read NFKC: the same words typed another way open it.
  expect(await unseal('correct\u00a0horse', payload, FAST)).not.toBeNull();
});

test('seal and unseal; the ciphertext gives nothing away, and the plain codec reads it as nothing', async () => {
  const text = 'a | b\n--- | ---\n1 | secret\n'.repeat(10);
  const { flag, bytes } = packDoc(text);
  const payload = await seal(await newLocker('correct horse', FAST), flag, bytes);
  expect(isSealed(payload)).toBe(true);
  expect(isSealed(encodeDoc(text))).toBe(false);
  expect(payload).not.toContain('secret');
  expect(decodeDoc(payload)).toBe('');
  const opened = (await unseal('correct horse', payload, FAST))!;
  expect(unpackDoc(opened.flag, opened.bytes)).toBe(text);
});

test('re-sealed with the opened locker: the same salt, a fresh IV; a locker held opens it again without the password', async () => {
  const { flag, bytes } = packDoc('x');
  const a = await seal(await newLocker('pw', FAST), flag, bytes);
  const opened = (await unseal('pw', a, FAST))!;
  const b = await seal(opened.locker, flag, bytes);
  expect(a).not.toBe(b);
  expect(a.slice(0, 22)).toBe(b.slice(0, 22));
  expect((await unsealWith(opened.locker, b))!.bytes).toEqual(bytes);
  // Another document's locker does not fit.
  expect(await unsealWith(await newLocker('pw', FAST), b)).toBeNull();
});

test('tampering is caught, junk refused', async () => {
  const { flag, bytes } = packDoc('hello world');
  const payload = await seal(await newLocker('pw', FAST), flag, bytes);
  const i = payload.length - 5;
  const tampered = payload.slice(0, i) + (payload[i] === 'A' ? 'B' : 'A') + payload.slice(i + 1);
  expect(await unseal('pw', tampered, FAST)).toBeNull();
  expect(await unseal('pw', 'E!!!', FAST)).toBeNull();
  expect(await unseal('pw', 'Eabc', FAST)).toBeNull();
  expect(await unseal('pw', 'yabc', FAST)).toBeNull();
});
