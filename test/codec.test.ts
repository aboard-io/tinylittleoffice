// The link codec: round trips, the dictionary's gain, and a refusal to unpack a mountain. (Ported from the old tree's test/codec.test.ts.)
import { test, expect } from 'vitest';
import { deflateSync, strToU8 } from 'fflate';
import { encodeDoc, decodeDoc, toBase64Url, fromBase64Url, budgetFor, unpackDoc, DICTIONARY, MAX_DOC_BYTES, URL_LIMIT } from '../src/kit/codec.ts';

test('base64url round trip', () => {
  for (const len of [0, 1, 2, 3, 4, 5, 31, 100]) {
    const bytes = new Uint8Array(len).map((_, i) => (i * 37 + 11) & 255);
    const s = toBase64Url(bytes);
    expect(s).not.toMatch(/[+/=]/);
    expect(Array.from(fromBase64Url(s))).toEqual(Array.from(bytes));
  }
});

test('doc round trip, short and long', () => {
  const docs = ['', 'hi', 'héllo wörld ✓', 'a\tb\n1\t2\n=SUM(A1:A2)', 'lorem ipsum '.repeat(200)];
  for (const d of docs) expect(decodeDoc(encodeDoc(d))).toBe(d);
});

test('compression kicks in for repetitive text', () => {
  const d = 'The quick brown fox jumps over the lazy dog. '.repeat(40);
  const e = encodeDoc(d);
  expect(e[0]).toBe('y');
  expect(e.length).toBeLessThan(d.length / 4);
});

test('raw encoding used for tiny docs', () => {
  expect(encodeDoc('x')[0]).toBe('r');
});

test('garbage decodes to empty', () => {
  expect(decodeDoc('zzz!!')).toBe('');
  expect(decodeDoc('q')).toBe('');
});

test('budget', () => {
  const b = budgetFor('https://example.com/#/v1/text/');
  expect(b.available).toBe(URL_LIMIT - 'https://example.com/#/v1/text/'.length);
});

test('the dictionary shortens everyday documents; plain deflate still reads', () => {
  const memo = '# Quarterly memo\nThe team will meet on Monday to review the launch plan and the budget for next month.\n- Design review';
  const e = encodeDoc(memo);
  expect(e[0]).toBe('y');
  expect(decodeDoc(e)).toBe(memo);
  const old = 'z' + toBase64Url(deflateSync(strToU8(memo), { level: 9, mem: 12 }));
  expect(decodeDoc(old)).toBe(memo);
  expect(e.length).toBeLessThan(old.length * 0.8);
  // (Frozen once v1 launches: then a payload made today must decode forever.)
  expect(decodeDoc(encodeDoc('Launch plan for the team meeting on Monday'))).toBe('Launch plan for the team meeting on Monday');
});

test("the dictionary primes the product's home zone, America/New_York, as the templates now do", () => {
  const text = new TextDecoder().decode(DICTIONARY);
  expect(text).toContain('zone: America/New_York\n');
  expect(text).not.toContain('Europe/London');
});

test('a link that would unpack to a mountain is refused', () => {
  const bomb = deflateSync(new Uint8Array(4 * MAX_DOC_BYTES), { level: 9 });
  expect(bomb.length).toBeLessThan(20_000);
  expect(() => unpackDoc('z', bomb)).toThrow(/too large/);
  const big = 'x'.repeat(MAX_DOC_BYTES / 4);
  expect(unpackDoc('z', deflateSync(new TextEncoder().encode(big)))).toBe(big);
});

// A hyphen is a place to break a line (UAX #14 class HY), so a pasted link full of them was cut wherever a mail
// client or a chat wrapped it (Paul, 2026-10-10). The 63rd character is "~", which no renderer breaks at.
test('base64url writes "~" and "_" for 62 and 63, never "-", and every byte comes back', () => {
  const every = Uint8Array.from({ length: 256 * 3 }, (_, i) => (i % 3 === 0 ? i / 3 : (i * 151) & 255));
  const s = toBase64Url(every);
  expect(s).not.toContain('-');
  expect(s).toContain('~');
  expect(s).toContain('_');
  expect(toBase64Url(new Uint8Array([0xfb, 0xff]))).toBe('~_8');
  expect(Array.from(fromBase64Url(s))).toEqual(Array.from(every));
});

test('a link made before "~" (with "-") reads to the same bytes', () => {
  expect(Array.from(fromBase64Url('-_8'))).toEqual([0xfb, 0xff]);
  const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 97 + 3) & 255);
  const now = toBase64Url(bytes);
  expect(Array.from(fromBase64Url(now.replace(/~/g, '-')))).toEqual(Array.from(bytes));
  const doc = 'A document from before. '.repeat(30) + 'é✓';
  expect(decodeDoc(encodeDoc(doc).replace(/~/g, '-'))).toBe(doc);
  expect(() => fromBase64Url('ab.c')).toThrow();
});

test('a link written by encodeDoc holds no hyphen, even for a document of noise', () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let n = 0; n < 20; n++) {
    const doc = Array.from({ length: 200 + n * 37 }, () => String.fromCharCode(32 + Math.floor(rand() * 0x2fd0))).join('');
    const link = encodeDoc(doc);
    expect(link).not.toContain('-');
    expect(decodeDoc(link)).toBe(doc);
  }
});
