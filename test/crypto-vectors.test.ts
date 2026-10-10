// The test vectors (test/vectors/*.json, docs/crypto/): fixed inputs and the exact outputs the kit gives for a
// password's seal, a signature and a short link's cipher. Each is checked twice: against the kit, and against
// WebCrypto called directly with the layout the documents describe, so the JSON is enough for another
// implementation to check itself against.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fromBase64Url, toBase64Url } from '../src/kit/codec.ts';
import { deriveKey, PBKDF2_ITERATIONS, sealAt, unseal } from '../src/kit/crypt.ts';
import { createSigner, fingerprintOf, verify } from '../src/kit/sign.ts';
import { encodeCreated, messageOf, signingMessage } from '../src/kit/envelope.ts';
import { ownerHash, ownerLink, publicLink, sealShortAt, shortLink, unshorten } from '../src/kit/short.ts';
import { ownerHash as serverHash } from '../tinier/tinier.ts';

const read = (name: string) => JSON.parse(readFileSync(new URL(`vectors/${name}`, import.meta.url), 'utf8'));
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
const b64 = (s: string) => Uint8Array.from(fromBase64Url(s));
const utf8 = (s: string) => new TextEncoder().encode(s);
const subtle = globalThis.crypto.subtle;
const memKey = (k: unknown) => ({ get: () => JSON.stringify(k), set() {}, remove() {} });

test('password: the parameters are the documents\' and the kit\'s', () => {
  const v = read('password.json');
  expect(v.kdf).toEqual({ name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, keyBytes: 32, saltBytes: 16, normalize: 'NFKC' });
  expect(v.cipher).toEqual({ name: 'AES-GCM', keyBits: 256, ivBytes: 12, tagBytes: 16, additionalData: null });
});

for (const [i, v] of (read('password.json').vectors as Record<string, string>[]).entries()) {
  test(`password vector ${i + 1}: the key, the plaintext, the sealed text, and back`, async () => {
    const salt = unhex(v.saltHex), iv = unhex(v.ivHex);
    expect(hex(utf8(v.password.normalize('NFKC')))).toBe(v.passwordNfkcHex);
    // The key, as PBKDF2 gives it with no kit in between.
    const base = await subtle.importKey('raw', unhex(v.passwordNfkcHex), 'PBKDF2', false, ['deriveBits']);
    expect(hex(new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600_000 }, base, 256)))).toBe(v.keyHex);
    // The kit seals the flag and the bytes to exactly this.
    expect(v.plaintextHex).toBe(hex(new Uint8Array([v.flag.charCodeAt(0), ...utf8(v.document)])));
    expect(await sealAt({ salt, key: await deriveKey(v.password, salt) }, v.flag, utf8(v.document), iv)).toBe(v.sealed);
    // The layout: "E", then base64url of salt | iv | ciphertext and tag; AES-GCM by hand opens it.
    expect(v.sealed[0]).toBe('E');
    const all = b64(v.sealed.slice(1));
    expect(hex(all.slice(0, 16))).toBe(v.saltHex);
    expect(hex(all.slice(16, 28))).toBe(v.ivHex);
    expect(hex(all.slice(28))).toBe(v.ciphertextAndTagHex);
    const raw = await subtle.importKey('raw', unhex(v.keyHex), 'AES-GCM', false, ['decrypt']);
    expect(hex(new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv }, raw, unhex(v.ciphertextAndTagHex))))).toBe(v.plaintextHex);
    // And the kit opens it, with this password and no other.
    const opened = await unseal(v.password, v.sealed);
    expect(opened?.flag).toBe(v.flag);
    expect(new TextDecoder().decode(opened!.bytes)).toBe(v.document);
    expect(await unseal(v.password + ' ', v.sealed)).toBeNull();
  });
}

test('signing: the envelope\'s message, its bytes, and as read from a document', () => {
  const { envelope: e } = read('signing.json');
  expect(encodeCreated(Date.parse(e.created))).toBe(e.createdBase36);
  expect(parseInt(e.createdBase36, 36)).toBe((Date.parse(e.created) - Date.UTC(2020, 0, 1)) / 60_000);
  expect(signingMessage(e.app, Date.parse(e.created), e.body, e.title, e.by)).toBe(e.message);
  expect(hex(utf8(e.message))).toBe(e.messageHex);
  expect(messageOf(e.app, e.document)).toBe(e.message);
});

test('signing: Ed25519 (RFC 8032\'s own key), the exact signature, verified', async () => {
  const { envelope: e, ed25519: v } = read('signing.json');
  const signer = createSigner(memKey(v.stored));
  // RFC 8032 §7.1 TEST 1: the empty message.
  expect(hex(b64((await signer.sign('')).sig))).toBe(v.rfc8032.signatureHex);
  const { key, sig } = await signer.sign(e.message);
  expect(key).toBe(v.publicKey);
  expect(b64(key).length).toBe(32);
  expect(sig).toBe(v.signature);
  expect(hex(b64(sig))).toBe(v.signatureHex);
  expect(await fingerprintOf(key)).toBe(v.fingerprint);
  expect(await verify(v.publicKey, v.signature, e.message)).toBe(true);
  expect(await verify(v.publicKey, v.signature, e.message.replace('Paul', 'Pau1'))).toBe(false);
  // By hand: the raw public key verifies the signature over the UTF-8 bytes.
  const pub = await subtle.importKey('raw', b64(v.publicKey), { name: 'Ed25519' }, false, ['verify']);
  expect(await subtle.verify({ name: 'Ed25519' }, pub, b64(v.signature), unhex(e.messageHex))).toBe(true);
});

test('signing: the P-256 fallback, its raw key from the JWK, its signature verified', async () => {
  const { envelope: e, p256: v } = read('signing.json');
  const raw = b64(v.publicKey);
  expect(raw.length).toBe(65);
  expect(hex(raw)).toBe('04' + hex(b64(v.stored.pub.x)) + hex(b64(v.stored.pub.y)));
  expect(await createSigner(memKey(v.stored)).publicKey()).toBe(v.publicKey);
  expect(await fingerprintOf(v.publicKey)).toBe(v.fingerprint);
  expect(await verify(v.publicKey, v.signature, e.message)).toBe(true);
  expect(await verify(v.publicKey, v.signature, e.message + ' ')).toBe(false);
  // ECDSA is not deterministic: a new signature differs and verifies all the same.
  const again = await createSigner(memKey(v.stored)).sign(e.message);
  expect(again.sig).not.toBe(v.signature);
  expect(await verify(again.key, again.sig, e.message)).toBe(true);
});

test('short links: the ciphertext, the owner hash on both sides, the two links', async () => {
  for (const v of read('short-links.json').vectors as Record<string, string>[]) {
    expect(toBase64Url(unhex(v.keyHex))).toBe(v.key);
    expect(await sealShortAt(v.link, unhex(v.keyHex), unhex(v.ivHex))).toEqual({ c: v.c, iv: v.iv });
    expect(await unshorten(v.c, v.iv, v.key)).toBe(v.link);
    const k = await subtle.importKey('raw', unhex(v.keyHex), 'AES-GCM', false, ['decrypt']);
    expect(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unhex(v.ivHex) }, k, b64(v.c)))).toBe(v.link);
    expect(b64(v.c).length).toBe(utf8(v.link).length + 16);
    expect(hex(b64(v.o))).toBe(v.oHex);
    expect(await ownerHash(v.o)).toBe(v.ownerHash);
    expect(await serverHash(v.o)).toBe(v.ownerHash);
    expect(toBase64Url(new Uint8Array(await subtle.digest('SHA-256', unhex(v.oHex))))).toBe(v.ownerHash);
    const owned = { id: v.id, key: v.key, o: v.o }, at = 'https://tinier.tinylittleoffice.com/';
    expect(shortLink(owned, at)).toBe(v.short);
    expect(ownerLink(owned, at)).toBe(v.owner);
    expect(publicLink(v.owner)).toBe(v.short);
  }
});

test('the entry points that take an IV are the tests\' alone: nothing in the site calls them', () => {
  const files = (dir: string): string[] => readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}${d.name}/`) : d.name.endsWith('.ts') ? [`${dir}${d.name}`] : []));
  const callers = [...files('../src/'), ...files('../tinier/'), ...files('../media/')].filter((f) => {
    const text = readFileSync(new URL(f, import.meta.url), 'utf8');
    const uses = (text.match(/\bsealAt\(|\bsealShortAt\(/g) ?? []).length;
    const defines = (text.match(/function sealAt\(|function sealShortAt\(/g) ?? []).length;
    const ownSeal = (text.match(/return sealAt\(locker|=> sealShortAt\(link, rawKey, crypto\.getRandomValues/g) ?? []).length;
    return uses - defines - ownSeal > 0;
  });
  expect(callers).toEqual([]);
});

test('the vectors\' text is written with "~" for 62, and the same text with "-" (as written before) is the same bytes', () => {
  const texts = [
    ...(read('password.json').vectors as Record<string, string>[]).map((v) => v.sealed.slice(1)),
    ...(read('short-links.json').vectors as Record<string, string>[]).flatMap((v) => [v.key, v.iv, v.c, v.o, v.ownerHash]),
    read('signing.json').ed25519.signature,
    read('signing.json').p256.publicKey,
  ];
  expect(texts.join('')).toContain('~');
  for (const s of texts) {
    expect(s).not.toContain('-');
    expect(toBase64Url(b64(s))).toBe(s);
    expect(hex(b64(s.replace(/~/g, '-')))).toBe(hex(b64(s)));
  }
});
