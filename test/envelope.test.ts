// The envelope (kit/envelope.ts): created to the minute, the signed message exactly as the old tree wrote it,
// and a document signed by the old tree verifying here.
import { test, expect } from 'vitest';
import { CREATED_EPOCH_MS, decodeCreated, encodeCreated, isoMinute, messageOf, quantizeCreated, readEnvelope, signingMessage } from '../src/kit/envelope.ts';
import { verify } from '../src/kit/sign.ts';

test('created keeps minute precision, and reads back as it was shown', () => {
  const t = Date.UTC(2026, 9, 5, 14, 32, 45);
  expect(Math.abs(decodeCreated(encodeCreated(t))! - t)).toBeLessThanOrEqual(30_000);
  expect(decodeCreated(encodeCreated(CREATED_EPOCH_MS))).toBe(CREATED_EPOCH_MS);
  expect(decodeCreated('!!')).toBeNull();
  expect(decodeCreated('-5')).toBeNull();
  const q = quantizeCreated(t);
  expect(q % 60000).toBe(0);
  expect(decodeCreated(encodeCreated(q))).toBe(q);
  expect(isoMinute(t)).toBe('2026-10-05T14:33Z');
  expect(isoMinute(Date.UTC(2026, 9, 5, 14, 32, 10))).toBe('2026-10-05T14:32Z');
});

test('the envelope is the head\'s five keys; the app keeps its own', () => {
  const text = '---\ntitle: Q3 budget\nby: forecast-agent\ncreated: 2026-10-05T14:32Z\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120';
  expect(readEnvelope(text)).toEqual({ created: Date.UTC(2026, 9, 5, 14, 32), title: 'Q3 budget', by: 'forecast-agent', body: '---\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120' });
  // A model may write the time loosely; a key without a signature is no signature.
  expect(readEnvelope('---\ncreated: 2026-10-05\n---\nx').created).toBe(Date.UTC(2026, 9, 5));
  expect(readEnvelope('---\nkey: k\n---\nx\n\ny')).toEqual({ created: null, body: 'x\n\ny' });
  expect(readEnvelope('just words')).toEqual({ created: null, body: 'just words' });
});

test('the signed message binds the app, the time, the body, the title and the name', () => {
  expect(signingMessage('sheet', null, 'b')).toBe('tinyoffice\nsheet\n\nb\u0000\u0000');
  expect(signingMessage('sheet', null, 'b', 'T')).toBe('tinyoffice\nsheet\n\nb\u0000T\u0000');
  expect(signingMessage('sheet', null, 'b', '', 'A')).toBe('tinyoffice\nsheet\n\nb\u0000\u0000A');
  const a = signingMessage('sheet', Date.UTC(2026, 0, 1), 'b');
  expect(a).not.toBe(signingMessage('write', Date.UTC(2026, 0, 1), 'b'));
  expect(a).not.toBe(signingMessage('sheet', Date.UTC(2026, 0, 2), 'b'));
  expect(signingMessage('sheet', null, 'b', 'T', 'A')).not.toBe(signingMessage('sheet', null, 'b', 'T', 'B'));
});

// Signed by the old tree's src/lib/sign.ts over its envelope.ts's signingMessage (an Ed25519 key made for the fixture).
const OLD = {
  app: 'sheet',
  text: '---\ntitle: Q3 budget\nby: Paul\ncreated: 2026-10-05T14:32Z\nkey: 9E3ieLH4GaPHFbLzA-gvCGg1PmAdTzYD6tiPYTW-S70\nsig: w8JnnS5IwMK42vdwH2XLmVVjO2NjNKX_lOu60fKIfDzxVRmQgkmBZz6nHqRffx5VNQYt27kWzgugnOEoIw3wBw\nchart: bar\n---\n# Budget\n\nQ | Sales:money\n--- | ---\nQ1 | 120\n',
  msg: 'tinyoffice\nsheet\n24808\n---\nchart: bar\n---\n# Budget\n\nQ | Sales:money\n--- | ---\nQ1 | 120\n\u0000Q3 budget\u0000Paul',
};

test('a document the old tree signed verifies here, and one changed word breaks it', async () => {
  expect(messageOf(OLD.app, OLD.text)).toBe(OLD.msg);
  const env = readEnvelope(OLD.text);
  expect(await verify(env.key!, env.sig!, messageOf(OLD.app, OLD.text))).toBe(true);
  expect(await verify(env.key!, env.sig!, messageOf(OLD.app, OLD.text.replace('120', '121')))).toBe(false);
  expect(await verify(env.key!, env.sig!, messageOf(OLD.app, OLD.text.replace('by: Paul', 'by: Mallory')))).toBe(false);
  expect(await verify(env.key!, env.sig!, messageOf('write', OLD.text))).toBe(false);
});
