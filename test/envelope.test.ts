import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeEnvelope, decodeEnvelope, encodeCreated, decodeCreated, quantizeCreated, signingMessage, CREATED_EPOCH_MS } from '../src/lib/envelope.ts';
import { encodeDoc } from '../src/lib/codec.ts';

test('created time keeps minute precision', () => {
  const t = Date.UTC(2026, 9, 5, 14, 32, 45);
  const back = decodeCreated(encodeCreated(t))!;
  assert.equal(Math.abs(back - t) <= 30_000, true);
  assert.equal(decodeCreated(encodeCreated(CREATED_EPOCH_MS)), CREATED_EPOCH_MS);
  assert.equal(decodeCreated('!!'), null);
  assert.equal(decodeCreated('-5'), null);
  // What is shown before a reload must equal what reads back after it.
  const q = quantizeCreated(t);
  assert.equal(decodeCreated(encodeCreated(q)), q);
  assert.equal(q % 60000, 0);
});

test('envelope round trip with and without signature', () => {
  const created = Date.UTC(2026, 9, 5, 14, 32);
  const plain = encodeEnvelope({ created, body: 'a\tb\n1\t2' });
  assert.equal(plain[0], 'R');
  assert.deepEqual(decodeEnvelope(plain), { created, body: 'a\tb\n1\t2' });

  const signed = encodeEnvelope({ created, key: 'KEY_-1', sig: 'SIG_-2', body: 'hello '.repeat(50) });
  assert.equal(signed[0], 'Z');
  assert.deepEqual(decodeEnvelope(signed), { created, key: 'KEY_-1', sig: 'SIG_-2', body: 'hello '.repeat(50) });
});

test('a key without a signature is dropped, body may contain blank lines', () => {
  const env = decodeEnvelope(encodeEnvelope({ created: null, key: 'k', body: 'x\n\ny' }));
  assert.deepEqual(env, { created: null, body: 'x\n\ny' });
});

test('legacy lowercase payloads decode as a bare body', () => {
  const legacy = encodeDoc('c123\n\nnot an envelope');
  assert.equal(legacy[0], 'r');
  assert.deepEqual(decodeEnvelope(legacy), { created: null, body: 'c123\n\nnot an envelope' });
  assert.deepEqual(decodeEnvelope(''), { created: null, body: '' });
  assert.deepEqual(decodeEnvelope('Zgarbage!'), { created: null, body: '' });
});

test('empty metadata falls back to the bare encoding', () => {
  assert.equal(encodeEnvelope({ created: null, body: 'x' }), encodeDoc('x'));
  assert.equal(encodeEnvelope({ created: null, body: '' }), '');
});

test('signing message binds app, time and body', () => {
  const a = signingMessage('sheet', Date.UTC(2026, 0, 1), 'b');
  const b = signingMessage('write', Date.UTC(2026, 0, 1), 'b');
  const c = signingMessage('sheet', Date.UTC(2026, 0, 2), 'b');
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.ok(a.startsWith('tinyoffice\nsheet\n'));
});
