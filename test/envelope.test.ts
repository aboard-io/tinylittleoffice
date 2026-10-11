// The envelope (kit/envelope.ts): created to the minute, and the head's keys that are the document's.
import { test, expect } from 'vitest';
import { isoMinute, quantizeCreated, readEnvelope } from '../src/kit/envelope.ts';

test('created keeps minute precision, and reads back as it was shown', () => {
  const t = Date.UTC(2026, 9, 5, 14, 32, 45);
  const q = quantizeCreated(t);
  expect(q % 60000).toBe(0);
  expect(Math.abs(q - t)).toBeLessThanOrEqual(30_000);
  expect(quantizeCreated(q)).toBe(q);
  expect(isoMinute(t)).toBe('2026-10-05T14:33Z');
  expect(isoMinute(Date.UTC(2026, 9, 5, 14, 32, 10))).toBe('2026-10-05T14:32Z');
});

test("the envelope is the head's title, by and created; the app keeps its own", () => {
  const text = '---\ntitle: Q3 budget\nby: forecast-agent\ncreated: 2026-10-05T14:32Z\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120';
  expect(readEnvelope(text)).toEqual({ created: Date.UTC(2026, 9, 5, 14, 32), title: 'Q3 budget', by: 'forecast-agent', body: '---\nchart: bar\n---\nQ | Sales\n--- | ---\nQ1 | 120' });
  // A model may write the time loosely.
  expect(readEnvelope('---\ncreated: 2026-10-05\n---\nx').created).toBe(Date.UTC(2026, 9, 5));
  expect(readEnvelope('just words')).toEqual({ created: null, body: 'just words' });
});
