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
  // A short link cannot be forgotten or recalled, so nothing may offer to.
  expect(source).not.toMatch(/Anyone who has it will find nothing|Forget this short link/i);
  // No picture is fetched for a document (round seventeen): the map is the one thing that asks the web by itself.
  expect(source).not.toMatch(/picture service|trusted list/i);
});

test('the words that say what is true are there', () => {
  const keys = Object.keys(en);
  expect(keys).toContain('This site keeps nothing on this device. Your browser’s history still holds every link opened here, and a link is the document: use a private window, or give it a password.');
  expect(keys).toContain('Your browser’s history');
  expect(keys).toContain('Every document opened here, in full, unless it has a password.');
  // A short link is not promised to be recallable: it cannot be (round seventeen), and the Share dialog says so.
  expect(keys).toContain('A short link cannot be changed or recalled once made; it expires on its own.');
  expect(keys).toContain('Nothing you write leaves your browser unless you share the link. One thing asks the web by itself: a trip’s map, whose pictures come from OpenStreetMap while it is shown.');
  expect(keys).toContain('Turn on Saved and keep it here');
});
