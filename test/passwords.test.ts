import { expect, test } from 'vitest';
import { generatePassword, guessable, PASSWORD_ALPHABET, strength } from '../src/kit/passwords.ts';

test('a generated password is four groups of five from the alphabet, and never the same twice', () => {
  const p = generatePassword();
  expect(p).toMatch(/^[^-]{5}-[^-]{5}-[^-]{5}-[^-]{5}$/);
  for (const c of p.replace(/-/g, '')) expect(PASSWORD_ALPHABET.includes(c)).toBe(true);
  expect(PASSWORD_ALPHABET).not.toMatch(/[lIO01]/);
  const seen = new Set(Array.from({ length: 50 }, () => generatePassword()));
  expect(seen.size).toBe(50);
  expect(generatePassword(2, 8)).toMatch(/^[^-]{8}-[^-]{8}$/);
});

test('every character of the alphabet comes up over many draws (no character is unreachable)', () => {
  const counts = new Map<string, number>();
  for (let i = 0; i < 400; i++) for (const c of generatePassword().replace(/-/g, '')) counts.set(c, (counts.get(c) ?? 0) + 1);
  expect(counts.size).toBe(PASSWORD_ALPHABET.length);
});

test('the estimate: length × the character sets used, the commonest passwords next to nothing; under 50 bits is guessable offline', () => {
  for (const p of ['1', 'password', 'abcdef', 'Password1', 'qwerty123', 'tulip', 'letmein!', '']) expect(guessable(p), p).toBe(true);
  for (let i = 0; i < 20; i++) expect(guessable(generatePassword())).toBe(false);
  expect(strength(generatePassword())).toBeGreaterThan(100);
  // Four random words, as the warning says.
  expect(guessable('maple orbit sugar lantern')).toBe(false);
  // A common password dressed up is still common: case and a trailing digit or two do not hide it.
  expect(strength('PASSWORD')).toBeLessThan(20);
  expect(strength('password12')).toBeLessThan(20);
  // Lower case alone: 26 letters, about 4.7 bits each.
  expect(strength('kxzqwvjmtr')).toBeCloseTo(10 * Math.log2(26), 5);
  // One character over and over is one guess per length.
  expect(guessable('aaaaaaaaaaaaaaaaaaaa')).toBe(true);
});
