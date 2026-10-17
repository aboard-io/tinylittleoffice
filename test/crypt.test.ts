// A password on a document (kit/share/crypt.ts): AES-256-GCM under a key from one HKDF-SHA-256 pass over the password,
// which the app made (kit/share/passwords.ts: about 117 bits, nothing to stretch), and a sealed fixture opening.
import { test, expect } from 'vitest';
import * as crypt from '../src/kit/share/crypt.ts';
import { newLocker, seal, unseal, unsealWith } from '../src/kit/share/crypt.ts';
import { decodeDoc, encodeDoc, isSealed, packDoc, toBase64Url, unpackDoc } from '../src/kit/core/codec.ts';
import { generatePassword } from '../src/kit/share/passwords.ts';

const subtle = globalThis.crypto.subtle;
const utf8 = (s: string) => new TextEncoder().encode(s);

/**
 * A sealed payload made here with WebCrypto alone, as docs/crypto/password.md lays it out (no kit in between): the
 * fixture the kit must open. HKDF-SHA-256 over the password's NFKC bytes, the salt as HKDF's salt, the format's name
 * as its info; AES-256-GCM over the flag and the bytes; "E" and base64url of salt | iv | ciphertext and tag.
 */
async function fixture(password: string, text: string): Promise<string> {
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i * 7);
  const iv = Uint8Array.from({ length: 12 }, (_, i) => 200 + i);
  const base = await subtle.importKey('raw', utf8(password.normalize('NFKC')), 'HKDF', false, ['deriveKey']);
  const key = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8('tinylittleoffice sealed v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const { flag, bytes } = packDoc(text);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new Uint8Array([flag.charCodeAt(0), ...bytes])));
  return 'E' + toBase64Url(new Uint8Array([...salt, ...iv, ...ct]));
}

test('the parameters: a 16-byte salt, a 12-byte IV, "E" first; no iterations anywhere', async () => {
  // deriveKey(password, salt), newLocker(password), unseal(password, payload): nothing to say how slow.
  expect([crypt.deriveKey.length, crypt.newLocker.length, crypt.unseal.length]).toEqual([2, 1, 2]);
  const { flag, bytes } = packDoc('x');
  const sealed = await seal(await newLocker('pw'), flag, bytes);
  expect(sealed[0]).toBe('E');
  // salt 16 + iv 12 + (flag 1 + bytes + tag 16), base64url
  expect(sealed.length - 1).toBe(Math.ceil(((16 + 12 + 1 + bytes.length + 16) * 4) / 3));
});

test('a fixture sealed under HKDF by hand opens to its text, and only with its password', async () => {
  const password = 'Hq7wN-3mXkd-RtP9z-aVb4s';
  const text = '---\ntitle: Secret\n---\nhello sealed world\n';
  const payload = await fixture(password, text);
  const opened = await unseal(password, payload);
  expect(opened).not.toBeNull();
  expect(unpackDoc(opened!.flag, opened!.bytes)).toBe(text);
  expect(await unseal('Hq7wN-3mXkd-RtP9z-aVb4S', payload)).toBeNull();
  expect(await unseal('', payload)).toBeNull();
  // The password is read NFKC, as it is typed to open: full-width letters are the plain ones.
  expect(await unseal('Ｈq7wN-3mXkd-RtP9z-aVb4s', payload)).not.toBeNull();
});

test('opening is quick: one HKDF pass, not 600,000 rounds (well under 50 ms under node)', async () => {
  const password = generatePassword();
  const { flag, bytes } = packDoc('a | b\n--- | ---\n1 | 2\n'.repeat(50));
  const payload = await seal(await newLocker(password), flag, bytes);
  await unseal(password, payload);
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    expect(await unseal(password, payload)).not.toBeNull();
    times.push(performance.now() - t0);
  }
  expect(Math.min(...times)).toBeLessThan(50);
});

test('seal and unseal; the ciphertext gives nothing away, and the plain codec reads it as nothing', async () => {
  const text = 'a | b\n--- | ---\n1 | secret\n'.repeat(10);
  const { flag, bytes } = packDoc(text);
  const payload = await seal(await newLocker('correct horse'), flag, bytes);
  expect(isSealed(payload)).toBe(true);
  expect(isSealed(encodeDoc(text))).toBe(false);
  expect(payload).not.toContain('secret');
  expect(decodeDoc(payload)).toBe('');
  const opened = (await unseal('correct horse', payload))!;
  expect(unpackDoc(opened.flag, opened.bytes)).toBe(text);
});

test('re-sealed with the opened locker: the same salt, a fresh IV; a locker held opens it again without the password', async () => {
  const { flag, bytes } = packDoc('x');
  const a = await seal(await newLocker('pw'), flag, bytes);
  const opened = (await unseal('pw', a))!;
  const b = await seal(opened.locker, flag, bytes);
  expect(a).not.toBe(b);
  expect(a.slice(0, 22)).toBe(b.slice(0, 22));
  expect((await unsealWith(opened.locker, b))!.bytes).toEqual(bytes);
  // Another document's locker does not fit.
  expect(await unsealWith(await newLocker('pw'), b)).toBeNull();
});

test('tampering is caught, junk refused', async () => {
  const { flag, bytes } = packDoc('hello world');
  const payload = await seal(await newLocker('pw'), flag, bytes);
  const i = payload.length - 5;
  const tampered = payload.slice(0, i) + (payload[i] === 'A' ? 'B' : 'A') + payload.slice(i + 1);
  expect(await unseal('pw', tampered)).toBeNull();
  expect(await unseal('pw', 'E!!!')).toBeNull();
  expect(await unseal('pw', 'Eabc')).toBeNull();
  expect(await unseal('pw', 'yabc')).toBeNull();
});

test('a payload that cannot be a seal is known before any password is asked; a seal that holds no document opens to nothing', async () => {
  const { isWholeSeal, sealAt } = crypt;
  const { unlock } = await import('../src/kit/share/privacy.ts');
  const locker = await newLocker('k7Rwm-Xq9Pz-aaaaa-bbbbb');
  const sealed = await seal(locker, 'r', utf8('Hello.\n'));
  expect(isWholeSeal(sealed)).toBe(true);
  // Cut short in a chat, or not base64url, or not sealed at all.
  for (const cut of [sealed.slice(0, 40), sealed.slice(0, -1) + '!', 'E', 'yAbc', '']) expect(isWholeSeal(cut), cut).toBe(false);
  // The password opens it, but what is inside is no document the codec reads (a flag of no kind): nothing, and no locker kept (a review, 2026-10-17).
  const odd = await sealAt(
    locker,
    'E',
    utf8('not a document'),
    Uint8Array.from({ length: 12 }, (_, i) => i),
  );
  expect(await unseal('k7Rwm-Xq9Pz-aaaaa-bbbbb', odd)).not.toBeNull();
  expect(await unlock('k7Rwm-Xq9Pz-aaaaa-bbbbb', odd)).toBeNull();
  expect(await unlock('k7Rwm-Xq9Pz-aaaaa-bbbbb', sealed)).toMatchObject({ text: 'Hello.\n' });
});
