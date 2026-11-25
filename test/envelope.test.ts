// The envelope (kit/core/envelope.ts): created to the minute.
import { test, expect } from 'vitest';
import { isoMinute, quantizeCreated } from '../src/kit/core/envelope.ts';

test('created keeps minute precision, and reads back as it was shown', () => {
  const t = Date.UTC(2026, 9, 5, 14, 32, 45);
  const q = quantizeCreated(t);
  expect(q % 60000).toBe(0);
  expect(Math.abs(q - t)).toBeLessThanOrEqual(30_000);
  expect(quantizeCreated(q)).toBe(q);
  expect(isoMinute(t)).toBe('2026-10-05T14:33Z');
  expect(isoMinute(Date.UTC(2026, 9, 5, 14, 32, 10))).toBe('2026-10-05T14:32Z');
});
