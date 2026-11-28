// Link format v2 (issue #23; kit/core/codec.ts): what it is made of, held still, and what it survives. The dictionary's
// bytes and the payloads below are frozen the day v2 ships, as v1's are (test/links.test.ts): a failure here is a link
// somebody has that would stop opening, so fix the code, never these.
import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, strToU8 } from 'fflate';
import { apps } from '../src/kit/core/apps.ts';
import { crc16, decodeDoc, DICTIONARY, DICTIONARY_V2, encodeDoc, fromBase62, isSealed, payloadVersion, toBase62, toBase64Url, wrap } from '../src/kit/core/codec.ts';
import { parseHash, routeHash } from '../src/kit/core/route.ts';
import { isWholeSeal, newLocker, pack } from '../src/kit/share/crypt.ts';

test('the dictionary is the one v2 ships with: 16 KB, v1’s dictionary last', () => {
  expect(createHash('sha256').update(DICTIONARY_V2).digest('hex')).toBe('cd639fe7a6514bfbc130ce2693dc8bfe69371d3b0c43413a1a905d10510ac77f');
  expect(DICTIONARY_V2.length).toBeLessThanOrEqual(16384);
  expect(Buffer.from(DICTIONARY_V2.subarray(-DICTIONARY.length)).equals(Buffer.from(DICTIONARY))).toBe(true);
});

/** Payloads v2 wrote, and what they hold: they open as this forever. */
const FROZEN: [string, string][] = [
  ['w4HC2rseX2Io8kq5IJkeMe3LDPOE7c', '# Hello\n\nA short note.\n'],
  ['w9KL0njKAeSbxfoG8LecoqbbMHFFLQhqZYLsjFktp5xloRZ0O2HgjShj0XhY', '---\napp: sheet\n---\nWhat | Qty:number | Price:money\nTea | 2 | $3.50\nTotal | | =SUM(C2:C2)\n'],
  ['w2BKJgdccIC5KqoJ3iFTyxXvvlTesoZ0YlBM13kHVEA7CP2G1qRLOXdgtBc6ka', '# A talk\n\n## One\n\n- a point\n\n---\n\n## Two\n\nWords on a slide.\n'],
  ['w4J7EC3kT4DHirrGpPMIsFEhdhPBG04IWvnENp1aUYLNqjD5z6zvdngsJNZcqihBbyMt3FnOK', 'Æblegrød, 週末の予定, مرحبا, 🙂\n'],
  ['vC4w2nDzul1goaRoXLIgVRkV3rqWo8erypETXtYHfbEp4pk', 'Plain deflate, no dictionary.\n'],
];

test('payloads v2 wrote open as what they hold', () => {
  for (const [payload, text] of FROZEN) {
    expect(decodeDoc(payload)).toBe(text);
    expect(decodeDoc(parseHash(routeHash('write', payload)).payload)).toBe(text);
  }
});

test('base62: 32 bytes in 43 characters, a last block in the fewest that hold it, each length its own; nothing else read', () => {
  const widths = Array.from({ length: 33 }, (_, k) => toBase62(new Uint8Array(k)).length);
  expect(widths[32]).toBe(43);
  expect(new Set(widths).size).toBe(33);
  for (const n of [0, 1, 2, 31, 32, 33, 64, 65, 1000]) {
    const bytes = new Uint8Array(n).map((_, i) => (i * 7919 + 13) & 255);
    const s = toBase62(bytes);
    expect(s).toMatch(/^[0-9A-Za-z]*$/);
    expect(Array.from(fromBase62(s))).toEqual(Array.from(bytes));
  }
  expect(Array.from(fromBase62(toBase62(new Uint8Array(32).fill(255))))).toEqual(new Array(32).fill(255));
  expect(() => fromBase62('A~')).toThrow();
  expect(() => fromBase62('A')).toThrow(); // one character holds no byte
  expect(() => fromBase62('zz')).toThrow(); // 3843 is more than a byte
});

test('the checksum is CRC-16/CCITT-FALSE over the flag and the bytes', () => {
  expect(crc16('1', strToU8('23456789'))).toBe(0x29b1);
  expect(crc16('w', new Uint8Array([1, 2]))).not.toBe(crc16('v', new Uint8Array([1, 2])));
});

test('a payload names its version by its first letter, and the letters of the two never meet', () => {
  expect(['w', 'v', 'e'].map(payloadVersion)).toEqual([2, 2, 2]);
  expect(['y', 'z', 'r', 'E'].map(payloadVersion)).toEqual([1, 1, 1, 1]);
  expect(['', 'W', 'q'].map(payloadVersion)).toEqual([0, 0, 0]);
  expect(isSealed('eAbc') && isSealed('EAbc') && !isSealed('wAbc')).toBe(true);
});

const templates = async () => (await Promise.all(apps().map(async (a) => (await a.templates()).map((t) => ({ app: a.id, name: `${a.id}/${t.id}`, doc: t.doc }))))).flat();

/** What travel does to a link (Oskar's list, issue #23): each leaves the document as it was. */
const TRAVEL: [string, (link: string) => string][] = [
  ['as it was', (l) => l],
  ['percent-encoded twice, as Webex does', (l) => l.replace(/\+/g, '%2B').replace(/%/g, '%25')],
  ['with the quote after it glued on', (l) => `${l}%E2%80%99`],
  ['wrapped at 76 columns by a mail client', (l) => l.replace(/(.{76})/g, '$1\n')],
  [
    'with a zero-width space in its payload',
    (l) => {
      const at = l.indexOf('/', l.indexOf('#/v2/') + 5) + 10;
      return `${l.slice(0, at)}​${l.slice(at)}`;
    },
  ],
  ['with its "+" breaks read as spaces', (l) => l.replace(/\+/g, ' ')],
];

test('every template’s link opens as the template after everything travel does to it', { timeout: 60_000 }, async () => {
  const wrong: string[] = [];
  for (const t of await templates()) {
    const link = `https://tinylittleoffice.com/${routeHash(t.app, encodeDoc(t.doc))}`;
    for (const [how, change] of TRAVEL) {
      const r = parseHash(change(link).slice(change(link).indexOf('#')));
      if (r.app !== t.app || decodeDoc(r.payload) !== t.doc) wrong.push(`${t.name}, ${how}`);
    }
  }
  expect(wrong).toEqual([]);
});

test('a link cut short, or with a word glued to its end, opens as nothing rather than as another document', { timeout: 60_000 }, async () => {
  const opened: string[] = [];
  for (const t of await templates()) {
    const hash = routeHash(t.app, encodeDoc(t.doc));
    for (const changed of [hash.slice(0, -1), hash.slice(0, -2), hash.slice(0, -5), `${hash}Thanks`, `${hash}a`, `${hash}9`])
      if (decodeDoc(parseHash(changed).payload)) opened.push(`${t.name}: ${changed.slice(-12)}`);
  }
  expect(opened).toEqual([]);
});

test('a sealed link cut short is told apart before any password is asked for', async () => {
  const sealed = await pack('---\ntitle: Salaries\n---\nThe secret words\n', await newLocker('pw'));
  expect(sealed[0]).toBe('e');
  expect(isWholeSeal(sealed)).toBe(true);
  expect(isWholeSeal(sealed.slice(0, -1))).toBe(false);
  expect(isWholeSeal(`${sealed}x`)).toBe(false);
});

test('each version’s payload reads under the other’s hash, by its own letters', () => {
  const text = '# Both\n\nRead the way it was written.\n';
  const v1 = 'y' + toBase64Url(deflateSync(strToU8(text), { level: 9, mem: 12, dictionary: DICTIONARY }));
  expect(decodeDoc(parseHash(`#/v2/write/${v1}`).payload)).toBe(text);
  expect(decodeDoc(parseHash(`#/v1/write/${encodeDoc(text)}`).payload)).toBe(text);
  // A v1 payload keeps its "~", "-" and "_", which v2's never holds.
  const tilde = parseHash('#/v1/write/yA~b_C-d').payload;
  expect(tilde).toBe('yA~b_C-d');
});

test('links are shorter than v1’s: the samples, which the dictionary was not made from, by a tenth or more', () => {
  const dir = join(import.meta.dirname, '../samples');
  const samples = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => f.endsWith('.tlo')).map((f) => readFileSync(join(dir, f), 'utf8'));
  expect(samples.length).toBeGreaterThanOrEqual(30);
  // v1's link, as v1 wrote it: the shortest of raw, deflated and deflated against v1's dictionary, in base64url.
  const v1 = (t: string) => {
    const raw = strToU8(t);
    const best = [raw, deflateSync(raw, { level: 9, mem: 12 }), deflateSync(raw, { level: 9, mem: 12, dictionary: DICTIONARY })].reduce((a, b) => (b.length < a.length ? b : a));
    return 1 + toBase64Url(best).length;
  };
  const total = (f: (t: string) => number) => samples.reduce((n, t) => n + f(t), 0);
  expect(total((t) => encodeDoc(t).length) / total(v1)).toBeLessThan(0.9);
  // And base62 with its checksum costs what it was measured to: v2's text over v1's, the same bytes.
  const bytes = deflateSync(strToU8(samples[0]), { level: 9 });
  expect(wrap('v', bytes).length / (1 + toBase64Url(bytes).length)).toBeLessThan(1.05);
});
