// The link codec: round trips, the dictionary's gain, and a refusal to unpack a mountain. (Ported from the old tree's test/codec.test.ts.)
import { test, expect } from 'vitest';
import { deflateSync, strToU8 } from 'fflate';
import { encodeDoc, decodeDoc, toBase64Url, fromBase64Url, budgetFor, unpackDoc, MAX_DOC_BYTES, URL_LIMIT } from '../src/kit/codec.ts';

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

test('a link that would unpack to a mountain is refused', () => {
  const bomb = deflateSync(new Uint8Array(4 * MAX_DOC_BYTES), { level: 9 });
  expect(bomb.length).toBeLessThan(20_000);
  expect(() => unpackDoc('z', bomb)).toThrow(/too large/);
  const big = 'x'.repeat(MAX_DOC_BYTES / 4);
  expect(unpackDoc('z', deflateSync(new TextEncoder().encode(big)))).toBe(big);
});
