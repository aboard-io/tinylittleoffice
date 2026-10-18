// A card's face in the reader's language (fields.ts): an amount short, a day short, a person's initials and hue.
import { expect, test } from 'vitest';
import { dayShort, hueOf, initials, moneyShort } from '../fields.ts';

test('an amount: whole ones without cents, a code or a symbol, in the language given', () => {
  expect(moneyShort(12000, 'USD', 'en')).toBe('$12,000');
  expect(moneyShort(8500.5, 'USD', 'en')).toBe('$8,500.50');
  expect(moneyShort(12000, '$', 'en')).toBe('$12,000');
  expect(moneyShort(-30, '£', 'en')).toBe('-£30');
  expect(moneyShort(1200, 'EUR', 'de')).toMatch(/^1\.200\s€$/);
});

test('a day: its month and day, the year only when it is not this one; null for what is no day', () => {
  const now = new Date(2026, 9, 18);
  expect(dayShort('2026-12-15', 'en', now)).toBe('Dec 15');
  expect(dayShort('2027-01-10', 'en', now)).toBe('Jan 10, 2027');
  expect(dayShort('soon', 'en', now)).toBe(null);
  expect(dayShort(null, 'en', now)).toBe(null);
});

test('a person: the first letters of their first and last words, and a hue that is theirs whatever the case', () => {
  expect(initials('Maya Patel')).toBe('MP');
  expect(initials('  leo  ')).toBe('L');
  expect(initials('Ana María de la Cruz')).toBe('AC');
  expect(initials('')).toBe('');
  expect(hueOf('Maya Patel')).toBe(hueOf(' maya patel'));
  expect(hueOf('Maya Patel')).toBeGreaterThanOrEqual(0);
  expect(hueOf('Maya Patel')).toBeLessThan(360);
});
