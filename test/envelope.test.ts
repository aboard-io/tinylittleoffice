import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeEnvelope, decodeEnvelope, envelopeText, readEnvelope, encodeCreated, decodeCreated, quantizeCreated, signingMessage, CREATED_EPOCH_MS } from '../src/lib/envelope.ts';
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
  const plain = encodeEnvelope({ created, body: 'a | b\n--- | ---\n1 | 2' });
  assert.deepEqual(decodeEnvelope(plain), { created, body: 'a | b\n--- | ---\n1 | 2' });

  const signed = encodeEnvelope({ created, key: 'KEY_-1', sig: 'SIG_-2', body: 'hello '.repeat(50) });
  assert.deepEqual(decodeEnvelope(signed), { created, key: 'KEY_-1', sig: 'SIG_-2', body: 'hello '.repeat(50) });
});

test('the envelope is the header of the text, beside the app\'s own settings', () => {
  const created = Date.UTC(2026, 9, 5, 14, 32);
  const text = envelopeText({ created, title: 'Q3 budget', by: 'forecast-agent', body: '---\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120' });
  assert.equal(text, '---\ntitle: Q3 budget\nby: forecast-agent\ncreated: 2026-10-05T14:32Z\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120');
  // Read back, the envelope's keys come out and the app keeps its own.
  assert.deepEqual(readEnvelope(text), { created, title: 'Q3 budget', by: 'forecast-agent', body: '---\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120' });
  // A model may write the time loosely.
  assert.equal(readEnvelope('---\ncreated: 2026-10-05\n---\nx').created, Date.UTC(2026, 9, 5));
});

test('a key without a signature is dropped, body may contain blank lines', () => {
  const env = decodeEnvelope(encodeEnvelope({ created: null, key: 'k', body: 'x\n\ny' }));
  assert.deepEqual(env, { created: null, body: 'x\n\ny' });
});

test('a document with nothing to put in an envelope is its text alone', () => {
  assert.equal(encodeEnvelope({ created: null, body: 'x' }), encodeDoc('x'));
  assert.equal(encodeEnvelope({ created: null, body: 'x' })[0], 'r');
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

test('who made it travels in the envelope and is bound by the signature', () => {
  const env = { created: Date.UTC(2026, 9, 6), title: 'Plan', by: 'forecast-agent', body: 'a\tb' };
  const back = decodeEnvelope(encodeEnvelope(env, 'sheet'), 'sheet');
  assert.equal(back.by, 'forecast-agent');
  assert.equal(back.title, 'Plan');
  assert.equal(back.body, 'a\tb');
  // A document with only an author still carries an envelope.
  assert.equal(decodeEnvelope(encodeEnvelope({ created: null, by: 'me', body: 'x' })).by, 'me');
  // The title and the author are always part of what is signed, empty or not.
  assert.equal(signingMessage('sheet', null, 'b'), 'tinyoffice\nsheet\n\nb\u0000\u0000');
  assert.equal(signingMessage('sheet', null, 'b', 'T'), 'tinyoffice\nsheet\n\nb\u0000T\u0000');
  assert.equal(signingMessage('sheet', null, 'b', '', 'A'), 'tinyoffice\nsheet\n\nb\u0000\u0000A');
  assert.notEqual(signingMessage('sheet', null, 'b', 'T', 'A'), signingMessage('sheet', null, 'b', 'T', 'B'));
});
