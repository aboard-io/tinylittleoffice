// The privacy words say what is true (round sixteen, the review of 2026-10-11: "the app tells me 'no cookies, no
// trace' while my browser's history keeps every document I typed"). The browser's history holds every link opened
// here, and a link is the document: no string may promise otherwise, and the ones that answer it stay.
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import en from '../src/i18n/en.ts';

const source = readFileSync(join(import.meta.dirname, '..', 'src', 'i18n', 'en.ts'), 'utf8');

test("no string promises what the browser's history makes untrue", () => {
  expect(source).not.toMatch(/no trace/i);
  expect(source).not.toMatch(/nothing is kept/i);
  // A forgotten short link is gone for those who come later, not for those who already opened it.
  expect(source).not.toMatch(/Anyone who has it will find nothing/i);
  // The map is not the one thing that asks the web by itself: a trusted site's picture is fetched as its document opens.
  expect(source).not.toMatch(/the one thing that asks the web/i);
});

test('the words that say what is true are there', () => {
  const keys = Object.keys(en);
  expect(keys).toContain('This site keeps nothing on this device. Your browser’s history still holds every link opened here, and a link is the document: use a private window, or give it a password.');
  expect(keys).toContain('Your browser’s history');
  expect(keys).toContain('Every document opened here, in full, unless it has a password.');
  expect(keys).toContain('Forget this short link? Anyone who opens it from now on finds nothing. Anyone who already opened it still has the document.');
  expect(keys).toContain('Showing them tells their site this document was opened, and when.');
  expect(keys).toContain('Turn on Saved and keep it here');
});
