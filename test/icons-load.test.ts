// A document may name any Lucide icon (kit/draw/icons.ts): iconNames lists what a document names, ensureIcons loads the
// rest of Lucide once when one of them is outside the starter set, and resolves at once when all are known.
import { expect, test } from 'vitest';
import { ensureIcons, iconNamed, iconNames, iconsComplete, loadIcons, onIcons } from '../src/kit/draw/icons.ts';

test('iconNames: ":name:" in words, ":name" at a label\'s start, each once; never a colon after a letter or digit', () => {
  expect(iconNames('A :rocket: and :car-front: and :rocket: again.\n')).toEqual(['rocket', 'car-front']);
  expect(iconNames(':rocket::star: side by side')).toEqual(['rocket', 'star']);
  expect(iconNames('- [ ] :truck Delivery\n~ :globe\n')).toEqual(['truck', 'globe']);
  expect(iconNames('At 10:30, a ratio a:b, https://example.com and C:\\ here')).toEqual([]);
  expect(iconNames('')).toEqual([]);
});

test('ensureIcons resolves at once for the starter set, and loads the rest of Lucide once for any other name', async () => {
  expect(iconsComplete()).toBe(false);
  await ensureIcons(['rocket', 'car']);
  // Known names alone load nothing.
  expect(iconsComplete()).toBe(false);
  expect(iconNamed('car-front')).toBeUndefined();
  let told = 0;
  const off = onIcons(() => told++);
  await ensureIcons(iconNames('Drive :car-front: home.'));
  expect(iconsComplete()).toBe(true);
  expect(iconNamed('car-front')).toBeDefined();
  expect(told).toBe(1);
  // Once is once: no second load, no second word.
  await ensureIcons(['no-such-icon']);
  await loadIcons();
  expect(told).toBe(1);
  expect(iconNamed('no-such-icon')).toBeUndefined();
  off();
});

test("a name of an Object's own, which a document may write between colons, names no icon, before and after the rest of Lucide loads", async () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) expect(iconNamed(name), name).toBeUndefined();
  await loadIcons();
  for (const name of ['constructor', 'toString', '__proto__']) expect(iconNamed(name), name).toBeUndefined();
  expect(iconNamed('rocket')).toBeDefined();
});
