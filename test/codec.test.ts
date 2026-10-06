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
  const b = budgetFor('https://example.com/#/sheet/');
  assert.equal(b.available, URL_LIMIT - 'https://example.com/#/sheet/'.length);
});

test('the dictionary shortens everyday documents, and older links still decode', () => {
  const memo = '# Quarterly memo\nThe team will meet on Monday to review the launch plan and the budget for next month.\n- Design review';
  const e = encodeDoc(memo);
  assert.equal(e[0], 'y');
  assert.equal(decodeDoc(e), memo);
  // The same text packed the old way: longer, and still readable.
  const old = 'z' + toBase64Url(deflateSync(strToU8(memo), { level: 9, mem: 12 }));
  assert.equal(decodeDoc(old), memo);
  assert.ok(e.length < old.length * 0.8, `${e.length} vs ${old.length}`);
  // Frozen: this exact link must decode forever.
  assert.equal(decodeDoc('y84EUIuDMBkoyoOQCzn7Q8giUQCAZCQA'), 'Launch plan for the team meeting on Monday');
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

test('an app\'s own dictionary makes its links shorter, and old links still open', async () => {
  const { packDoc, unpackDoc } = await import('../src/lib/codec.ts');
  const { encodeEnvelope, decodeEnvelope } = await import('../src/lib/envelope.ts');
  await import('../src/apps/index.ts');
  const { specOf } = await import('../src/lib/diagram.ts');
  const { APP_DICTS } = await import('../src/lib/dicts.ts');
  const { apps } = await import('../src/kit/core.ts');
  let shorter = 0, total = 0, before = 0, after = 0;
  for (const def of apps()) {
    const sample = specOf(def.id)?.example;
    if (!sample) continue;
    // A document in the same format as the example, with other words in it.
    const words = sample.split(/(\s+)/);
    const doc = words.map((w, i) => (i % 2 ? w : words[(i * 7) % words.length] ?? w)).join('');
    // (Creation times are kept to the minute.)
    const { quantizeCreated } = await import('../src/lib/envelope.ts');
    const made = quantizeCreated(1_700_000_000_000);
    const plain = encodeEnvelope({ created: made, body: doc });
    const fitted = encodeEnvelope({ created: made, body: doc }, def.id);
    assert.deepEqual(decodeEnvelope(fitted, def.id), { created: made, body: doc }, def.id);
    assert.deepEqual(decodeEnvelope(plain), { created: made, body: doc });
    total++;
    before += plain.length;
    after += fitted.length;
    if (fitted.length < plain.length) shorter++;
  }
  assert.ok(shorter >= total * 0.9, `${shorter} of ${total} shorter`);
  assert.ok(after < before * 0.8, `${before} -> ${after}`);
  // The dictionary is a frozen part of the format.
  assert.ok(Object.keys(APP_DICTS).length >= 60);
  // A "w" link needs its app; without it, it is refused rather than misread.
  const w = packDoc('# Harbor Coffee\n## Coffee\nEspresso | 3.00', 'menu');
  assert.equal(w.flag, 'w');
  assert.throws(() => unpackDoc('w', w.bytes));
  assert.equal(unpackDoc('w', w.bytes, 'menu'), '# Harbor Coffee\n## Coffee\nEspresso | 3.00');
  // Links from before (y, z, r) are untouched.
  assert.equal(unpackDoc('r', new TextEncoder().encode('hi')), 'hi');
});
