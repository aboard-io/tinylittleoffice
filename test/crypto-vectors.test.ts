// The test vectors (test/vectors/*.json, docs/crypto/): fixed inputs and the exact outputs the kit gives for a
// password's seal, a short link's cipher and a journal's keys and entries. Each is checked twice: against the kit, and against
// WebCrypto called directly with the layout the documents describe, so the JSON is enough for another
// implementation to check itself against.
import { test, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fromBase64Url, toBase64Url } from '../src/kit/core/codec.ts';
import { deriveKey, sealAt, unseal } from '../src/kit/share/crypt.ts';
import { sealShortAt, shortLink, unshorten } from '../src/kit/share/short.ts';
import { journalAddress, openEntry, PAD, readerKeys, sealEntryAt, verifierOf, writerKeys, type Kind } from '../src/kit/share/journal.ts';

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

/** The journal vectors (docs/crypto/journal.md), made from their inputs by WebCrypto alone. */
const JOURNAL_KDF = { name: 'HKDF', hash: 'SHA-256', salt: '', infoRead: 'tinylittleoffice journal read v1', infoWrite: 'tinylittleoffice journal write v1', keyBytes: 32 };
const JOURNAL_CIPHER = { name: 'AES-GCM', keyBits: 256, ivBytes: 12, tagBytes: 16, additionalData: 'tinylittleoffice journal v1\\n<id>\\n<seq>\\n<kind>', paddedTo: PAD };
const JOURNAL_ABOUT =
  "Tiny Little Office journals (src/kit/share/journal.ts, backends/journal/, docs/crypto/journal.md). From a secret of 32 bytes: read = HKDF-SHA-256(ikm = secret, salt = empty, info = 'tinylittleoffice journal read v1' as UTF-8, 32 bytes); token = the same with info 'tinylittleoffice journal write v1'; id = the first 22 characters of base64url(SHA-256('tinylittleoffice journal id v1' as UTF-8 || read)); verifier = base64url(SHA-256(base64url(token) as UTF-8)), what the service keeps. An entry: plaintext = the content's JSON as UTF-8 after its length as 4 bytes big-endian, then zeros to a multiple of 256 bytes; c = AES-256-GCM(read, iv, plaintext, additionalData = 'tinylittleoffice journal v1' LF id LF seq LF kind, as UTF-8) with its 16-byte tag last; iv and c travel as base64url without padding, seq and kind in the clear. A writer's address is <service>/j/<id>#w<secret>, a reader's <service>/j/<id>#r<read>. Fixed secrets and IVs are for these vectors only: the site draws both from crypto.getRandomValues. Base64url here is RFC 4648's URL alphabet with '~' for 62 where the RFC has '-' (a hyphen is where a pasted link breaks a line), no padding; '-' is read as 62 too.";
const JOURNAL_INPUTS: { secretHex: string; seq: number; kind: Kind; ivHex: string; content: unknown }[] = [
  {
    secretHex: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    seq: 1,
    kind: 'snapshot',
    ivHex: '202122232425262728292a2b',
    content: { by: 'ann', at: 1700000000000, app: 'write', text: 'The note passed in class.\n' },
  },
  {
    secretHex: 'f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff000102030405060708090a0b0c0d0e0f',
    seq: 2,
    kind: 'ops',
    ivHex: 'd0d1d2d3d4d5d6d7d8d9dadb',
    content: { by: 'ann', at: 1700000001000, client: 'c0ffee', ops: [{ op: 'head', key: 'title', value: 'Vector' }] },
  },
];
async function journalVector(v: (typeof JOURNAL_INPUTS)[number]) {
  const secret = unhex(v.secretHex),
    iv = unhex(v.ivHex);
  const base = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits']);
  const derive = async (info: string) => new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8(info) }, base, 256));
  const read = await derive(JOURNAL_KDF.infoRead);
  const token = await derive(JOURNAL_KDF.infoWrite);
  const id = toBase64Url(new Uint8Array(await subtle.digest('SHA-256', new Uint8Array([...utf8('tinylittleoffice journal id v1'), ...read])))).slice(0, 22);
  const tokenText = toBase64Url(token);
  const verifier = toBase64Url(new Uint8Array(await subtle.digest('SHA-256', utf8(tokenText))));
  const json = JSON.stringify(v.content);
  const bytes = utf8(json);
  const plain = new Uint8Array(Math.ceil((bytes.length + 4) / PAD) * PAD);
  new DataView(plain.buffer).setUint32(0, bytes.length);
  plain.set(bytes, 4);
  const additionalData = `tinylittleoffice journal v1\n${id}\n${v.seq}\n${v.kind}`;
  const aes = await subtle.importKey('raw', read, 'AES-GCM', false, ['encrypt']);
  const c = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8(additionalData) }, aes, plain));
  const service = 'https://journal.tinylittleoffice.com/';
  return {
    secretHex: v.secretHex,
    secret: toBase64Url(secret),
    readHex: hex(read),
    read: toBase64Url(read),
    tokenHex: hex(token),
    token: tokenText,
    id,
    verifier,
    writerAddress: journalAddress(service, id, { secret: toBase64Url(secret) }),
    readerAddress: journalAddress(service, id, { read: toBase64Url(read) }),
    seq: v.seq,
    kind: v.kind,
    ivHex: v.ivHex,
    iv: toBase64Url(iv),
    content: v.content,
    json,
    plaintextHex: hex(plain),
    additionalData,
    ciphertextAndTagHex: hex(c),
    c: toBase64Url(c),
  };
}

test('journal: the vectors file is what its inputs make (TLO_WRITE_VECTORS=1 writes it again)', async () => {
  const made = { about: JOURNAL_ABOUT, kdf: JOURNAL_KDF, cipher: JOURNAL_CIPHER, vectors: await Promise.all(JOURNAL_INPUTS.map(journalVector)) };
  if (process.env.TLO_WRITE_VECTORS) writeFileSync(new URL('vectors/journal.json', import.meta.url), JSON.stringify(made, null, 2) + '\n');
  expect(read('journal.json')).toEqual(made);
});

for (const [i, v] of (read('journal.json').vectors as (Record<string, string> & { seq: number; kind: Kind; content: unknown })[]).entries()) {
  test(`journal vector ${i + 1}: the kit derives the keys, the id and the verifier, seals the entry to the ciphertext, and opens it at its place alone`, async () => {
    const w = await writerKeys(v.secret);
    expect({ id: w.id, token: w.token, read: w.read }).toEqual({ id: v.id, token: v.token, read: v.read });
    expect((await readerKeys(v.read)).id).toBe(v.id);
    expect(await verifierOf(v.token)).toBe(v.verifier);
    expect(await sealEntryAt(w, v.seq, v.kind, v.content, unhex(v.ivHex))).toEqual({ seq: v.seq, kind: v.kind, iv: v.iv, c: v.c });
    // AES-GCM by hand, under the read key, with the additional data, gives the padded plaintext.
    const raw = await subtle.importKey('raw', unhex(v.readHex), 'AES-GCM', false, ['decrypt']);
    expect(hex(new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unhex(v.ivHex), additionalData: utf8(v.additionalData) }, raw, unhex(v.ciphertextAndTagHex))))).toBe(v.plaintextHex);
    expect(b64(v.c).length % PAD).toBe(16);
    // The kit opens it with the reader's keys, at its place and at no other.
    const entry = { seq: v.seq, kind: v.kind, iv: v.iv, c: v.c };
    expect(await openEntry(await readerKeys(v.read), entry)).toEqual(v.content);
    expect(await openEntry(w, { ...entry, seq: v.seq + 1 })).toBeNull();
  });
}

test("the entry points that take an IV are the tests' alone: nothing in the site calls them", () => {
  const files = (dir: string): string[] =>
    readdirSync(new URL(dir, import.meta.url), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(`${dir}${d.name}/`) : d.name.endsWith('.ts') ? [`${dir}${d.name}`] : []));
  const callers = [...files('../src/'), ...files('../backends/')].filter((f) => {
    const text = readFileSync(new URL(f, import.meta.url), 'utf8');
    const uses = (text.match(/\bsealAt\(|\bsealShortAt\(|\bsealEntryAt\(/g) ?? []).length;
    const defines = (text.match(/function sealAt\(|function sealShortAt\(|function sealEntryAt\(/g) ?? []).length;
    const ownSeal = (text.match(/return sealAt\(locker|=> sealShortAt\(link, rawKey, crypto\.getRandomValues|return sealEntryAt\(keys, seq, kind, content, globalThis\.crypto\.getRandomValues/g) ?? [])
      .length;
    return uses - defines - ownSeal > 0;
  });
  expect(callers).toEqual([]);
});

test('the vectors\' text is written with "~" for 62, and the same text with "-" (as written before) is the same bytes', () => {
  const texts = [
    ...(read('password.json').vectors as Record<string, string>[]).map((v) => v.sealed.slice(1)),
    ...(read('short-links.json').vectors as Record<string, string>[]).flatMap((v) => [v.key, v.iv, v.c]),
    ...(read('journal.json').vectors as Record<string, string>[]).flatMap((v) => [v.secret, v.read, v.token, v.verifier, v.iv, v.c]),
  ];
  expect(texts.join('')).toContain('~');
  for (const s of texts) {
    expect(s).not.toContain('-');
    expect(toBase64Url(b64(s))).toBe(s);
    expect(hex(b64(s.replace(/~/g, '-')))).toBe(hex(b64(s)));
  }
});
