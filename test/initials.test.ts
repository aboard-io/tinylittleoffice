// A person drawn small (kit/ui/initials.ts): their initials as a reader writes them, and a hue of their own, the same
// for the same name however it is cased or spaced round, so the Board, a typed table and <to-avatar> draw one person one way.
import { expect, test } from 'vitest';
import { hueOf, initial } from '../src/kit/ui/initials.ts';
import { hueOf as boardHue, initials as boardInitials } from '../src/apps/board/fields.ts';

test('initials: the first letter of the first and last words, upper-cased; one word, one letter; none, nothing', () => {
  expect(initial('Maya Patel')).toBe('MP');
  expect(initial('  leo  ')).toBe('L');
  expect(initial('Ana María de la Cruz')).toBe('AC');
  expect(initial('émile zola')).toBe('ÉZ');
  expect(initial('')).toBe('');
  expect(initial('   ')).toBe('');
});

test('a hue: 0 to 359, the same for the same name whatever its case and the spaces round it, and not the same for every name', () => {
  const h = hueOf('Maya Patel');
  expect(h).toBeGreaterThanOrEqual(0);
  expect(h).toBeLessThan(360);
  expect(Number.isInteger(h)).toBe(true);
  expect(hueOf(' maya patel ')).toBe(h);
  expect(hueOf('MAYA PATEL')).toBe(h);
  expect(new Set(['Maya Patel', 'Leo', 'Ana Cruz', 'Bob Brown', 'Carol Chen'].map(hueOf)).size).toBeGreaterThan(3);
});

test('the Board draws its cards by the same two (src/apps/board/fields.ts)', () => {
  expect(boardInitials).toBe(initial);
  expect(boardHue).toBe(hueOf);
});
