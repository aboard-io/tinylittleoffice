import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync, strToU8 } from 'fflate';
import { encodeDoc, decodeDoc, toBase64Url, fromBase64Url, budgetFor, URL_LIMIT } from '../src/lib/codec.ts';

test('base64url round trip', () => {
  for (const len of [0, 1, 2, 3, 4, 5, 31, 100]) {
    const bytes = new Uint8Array(len).map((_, i) => (i * 37 + 11) & 255);
    const s = toBase64Url(bytes);
    assert.ok(!/[+/=]/.test(s));
    assert.deepEqual(Array.from(fromBase64Url(s)), Array.from(bytes));
  }
});

test('doc round trip, short and long', () => {
  const docs = ['', 'hi', 'héllo wörld ✓', 'a\tb\n1\t2\n=SUM(A1:A2)', 'lorem ipsum '.repeat(200)];
  for (const d of docs) assert.equal(decodeDoc(encodeDoc(d)), d);
});

test('compression kicks in for repetitive text', () => {
  const d = 'The quick brown fox jumps over the lazy dog. '.repeat(40);
  const e = encodeDoc(d);
  assert.equal(e[0], 'y');
  assert.ok(e.length < d.length / 4);
});

test('raw encoding used for tiny docs', () => {
  assert.equal(encodeDoc('x')[0], 'r');
});

test('garbage decodes to empty', () => {
  assert.equal(decodeDoc('zzz!!'), '');
  assert.equal(decodeDoc('q'), '');
});

test('budget', () => {
  const b = budgetFor('https://example.com/#/v1/sheet/');
  assert.equal(b.available, URL_LIMIT - 'https://example.com/#/v1/sheet/'.length);
});

test('the dictionary shortens everyday documents; plain deflate still reads', () => {
  const memo = '# Quarterly memo\nThe team will meet on Monday to review the launch plan and the budget for next month.\n- Design review';
  const e = encodeDoc(memo);
  assert.equal(e[0], 'y');
  assert.equal(decodeDoc(e), memo);
  // The same text without the dictionary: longer, and readable.
  const old = 'z' + toBase64Url(deflateSync(strToU8(memo), { level: 9, mem: 12 }));
  assert.equal(decodeDoc(old), memo);
  assert.ok(e.length < old.length * 0.8, `${e.length} vs ${old.length}`);
  // (Frozen once v1 launches: then a payload made today must decode forever.)
  const frozen = encodeDoc('Launch plan for the team meeting on Monday');
  assert.equal(decodeDoc(frozen), 'Launch plan for the team meeting on Monday');
});

test('a link that would unpack to a mountain is refused', async () => {
  const { deflateSync } = await import('fflate');
  const { unpackDoc, MAX_DOC_BYTES } = await import('../src/lib/codec.ts');
  // Sixteen megabytes of the same byte deflate to almost nothing.
  const bomb = deflateSync(new Uint8Array(4 * MAX_DOC_BYTES), { level: 9 });
  assert.ok(bomb.length < 20_000);
  assert.throws(() => unpackDoc('z', bomb), /too large/);
  // An honest document of some size is fine.
  const big = 'x'.repeat(MAX_DOC_BYTES / 4);
  assert.equal(unpackDoc('z', deflateSync(new TextEncoder().encode(big))), big);
});
