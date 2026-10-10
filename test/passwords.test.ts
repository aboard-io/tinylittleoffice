import { expect, test } from 'vitest';
import { generatePassword, PASSWORD_ALPHABET } from '../src/kit/passwords.ts';

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
