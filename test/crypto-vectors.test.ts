// The test vectors (test/vectors/*.json, docs/crypto/): fixed inputs and the exact outputs the kit gives for a
// password's seal and a short link's cipher. Each is checked twice: against the kit, and against
// WebCrypto called directly with the layout the documents describe, so the JSON is enough for another
// implementation to check itself against.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fromBase64Url, toBase64Url } from '../src/kit/core/codec.ts';
import { deriveKey, sealAt, unseal } from '../src/kit/share/crypt.ts';
import { sealShortAt, shortLink, unshorten } from '../src/kit/share/short.ts';

const read = (name: string) => JSON.parse(readFileSync(new URL(`vectors/${name}`, import.meta.url), 'utf8'));
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
const b64 = (s: string) => Uint8Array.from(fromBase64Url(s));
const utf8 = (s: string) => new TextEncoder().encode(s);
const subtle = globalThis.crypto.subtle;

/** The password vectors, made from their inputs by WebCrypto alone, the layout docs/crypto/password.md gives. */
const KDF = { name: 'HKDF', hash: 'SHA-256', info: 'tinylittleoffice sealed v1', keyBytes: 32, saltBytes: 16, normalize: 'NFKC' };
const CIPHER = { name: 'AES-GCM', keyBits: 256, ivBytes: 12, tagBytes: 16, additionalData: null };
const ABOUT =
  "Tiny Little Office password sealing (src/kit/share/crypt.ts, docs/crypto/password.md). The password is one the app made (twenty characters from an alphabet of 56, about 116 bits); key = HKDF-SHA-256(ikm = NFKC(password) as UTF-8, salt, info = 'tinylittleoffice sealed v1' as UTF-8, 32 bytes); plaintext = the codec's flag byte then the document's bytes (flag 'r': UTF-8 as it is); sealed = 'E' + base64url without padding of salt[16] | iv[12] | AES-256-GCM(key, iv, plaintext) with its 16-byte tag last and no additional data. Fixed salts and IVs are for these vectors only: the site draws both from crypto.getRandomValues. Base64url here is RFC 4648's URL alphabet with '~' for 62 where the RFC has '-' (a hyphen is where a pasted link breaks a line), no padding; '-' is read as 62 too.";
const INPUTS = [
  { password: 'Hq7wN-3mXkd-RtP9z-aVb4s', saltHex: '000102030405060708090a0b0c0d0e0f', ivHex: '101112131415161718191a1b', flag: 'r', document: '---\ntitle: Vector\n---\nThe note passed in class.\n' },
  {
    password: 'Ｈq7wN-3mXkd-RtP9z-aVb4s',
    saltHex: '808182838485868788898a8b8c8d8e8f',
    ivHex: '909192939495969798999a9b',
    flag: 'r',
    document: 'Read NFKC: a password typed with a full-width letter is the same password, and opens the same document.\n',
  },
];
async function passwordVector(v: (typeof INPUTS)[number]) {
  const salt = unhex(v.saltHex),
    iv = unhex(v.ivHex);
  const ikm = utf8(v.password.normalize('NFKC'));
  const base = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const key = new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8(KDF.info) }, base, 256));
  const plain = new Uint8Array([v.flag.charCodeAt(0), ...utf8(v.document)]);
  const aes = await subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const out = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, aes, plain));
  return {
    password: v.password,
    passwordNfkcHex: hex(ikm),
    saltHex: v.saltHex,
    ivHex: v.ivHex,
    keyHex: hex(key),
    flag: v.flag,
    document: v.document,
    plaintextHex: hex(plain),
    ciphertextAndTagHex: hex(out),
    sealed: 'E' + toBase64Url(new Uint8Array([...salt, ...iv, ...out])),
  };
}

test('password: the vectors file is what its inputs make (TLO_WRITE_VECTORS=1 writes it again)', async () => {
  const made = { about: ABOUT, kdf: KDF, cipher: CIPHER, vectors: await Promise.all(INPUTS.map(passwordVector)) };
  if (process.env.TLO_WRITE_VECTORS) writeFileSync(new URL('vectors/password.json', import.meta.url), JSON.stringify(made, null, 2) + '\n');
  expect(read('password.json')).toEqual(made);
});

for (const [i, v] of (read('password.json').vectors as Record<string, string>[]).entries()) {
  test(`password vector ${i + 1}: the kit derives the key, seals to the sealed text, and opens it`, async () => {
    const salt = unhex(v.saltHex),
      iv = unhex(v.ivHex);
    // The kit's key is the vector's: AES-GCM under the raw key opens what the kit sealed.
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

test('short links: the ciphertext and the link', async () => {
  for (const v of read('short-links.json').vectors as Record<string, string>[]) {
    expect(toBase64Url(unhex(v.keyHex))).toBe(v.key);
    expect(await sealShortAt(v.link, unhex(v.keyHex), unhex(v.ivHex))).toEqual({ c: v.c, iv: v.iv });
    expect(await unshorten(v.c, v.iv, v.key)).toBe(v.link);
    const k = await subtle.importKey('raw', unhex(v.keyHex), 'AES-GCM', false, ['decrypt']);
    expect(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unhex(v.ivHex) }, k, b64(v.c)))).toBe(v.link);
    expect(b64(v.c).length).toBe(utf8(v.link).length + 16);
    expect(shortLink(v.id, v.key, 'https://tinier.tinylittleoffice.com/')).toBe(v.short);
  }
});

test("the entry points that take an IV are the tests' alone: nothing in the site calls them", () => {
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}${d.name}/`) : d.name.endsWith('.ts') ? [`${dir}${d.name}`] : []));
  const callers = [...files('../src/'), ...files('../backends/')].filter((f) => {
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
    ...(read('short-links.json').vectors as Record<string, string>[]).flatMap((v) => [v.key, v.iv, v.c]),
  ];
  expect(texts.join('')).toContain('~');
  for (const s of texts) {
    expect(s).not.toContain('-');
    expect(toBase64Url(b64(s))).toBe(s);
    expect(hex(b64(s.replace(/~/g, '-')))).toBe(hex(b64(s)));
  }
});
