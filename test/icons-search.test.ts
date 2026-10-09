// The icon library: the starter set's keywords, the stemmer, suggestions and search (kit/icons-search.ts), and the whole of Lucide joining it.
import { expect, test } from 'vitest';
import { KEYWORDS, iconCategories, iconCount, searchIcons, stem, suggestIcons } from '../src/kit/icons-search.ts';
import { LIBRARY_NAMES, iconNamed } from '../src/kit/icons.ts';

test('every starter icon has keywords, and nothing else does', () => {
  expect(Object.keys(KEYWORDS).sort()).toEqual([...LIBRARY_NAMES].sort());
  for (const name of LIBRARY_NAMES) expect(iconNamed(name), name).toBeDefined();
});

test('stem', () => {
  expect(stem('launching')).toBe('launch');
  expect(stem('launches')).toBe('launch');
  expect(stem('shipping')).toBe('ship');
  expect(stem('selling')).toBe('sell');
  expect(stem('companies')).toBe('company');
  expect(stem('goals')).toBe('goal');
  expect(stem('plan')).toBe('plan');
});

test('suggestions follow the words', () => {
  expect(suggestIcons('Launch plan', ['Build it', 'Ship it', 'Tell people'])[0]).toBe('rocket');
  expect(suggestIcons('Our goals for Q3')[0]).toBe('target');
  expect(suggestIcons('Pricing')[0]).toBe('dollar');
  expect(suggestIcons('Meet the team')[0]).toBe('users');
  expect(suggestIcons('', ['Security and privacy'])).toContain('shield');
  expect(suggestIcons('Launch plan')).not.toContain('plane');
  expect(suggestIcons('')).toEqual([]);
  expect(suggestIcons('Zzyzx qwerty')).toEqual([]);
  expect(suggestIcons('team goals money growth launch security time', [], 3)).toHaveLength(3);
});

test('search by name, prefix and keyword', () => {
  expect(searchIcons('')).toHaveLength(LIBRARY_NAMES.length);
  expect(searchIcons('rock')[0]).toBe('rocket');
  expect(searchIcons('trending').slice(0, 2)).toEqual(['trending-up', 'trending-down']);
  expect(searchIcons('trending down')[0]).toBe('trending-down');
  expect(searchIcons('money')).toContain('dollar');
  expect(searchIcons('pet')).toContain('dog');
  expect(searchIcons('chart')[0]).toBe('bar-chart');
  expect(searchIcons('zzz')).toEqual([]);
  expect(iconCategories()).toEqual([]);
});

test('the lazy chunk brings all of Lucide, found by name and tag, in categories', async () => {
  // (Under node the chunk's dialog is never opened; its import alone joins the icons.)
  const { allIcons } = await import('../src/kit/icons-picker.ts');
  expect(allIcons.length).toBeGreaterThan(1500);
  expect(iconCount()).toBeGreaterThan(1500);
  expect(iconNamed('accessibility')).toBeDefined();
  expect(iconNamed('chart-column')).toBeDefined();
  expect(iconNamed('a-arrow-down')).toBeDefined();
  expect(searchIcons('accessib')).toContain('accessibility');
  expect(searchIcons('chart column')).toContain('chart-column');
  // The short names documents already use keep working, and searching nothing still shows the starter set.
  expect(iconNamed('dollar')).toBeDefined();
  expect(searchIcons('')).toHaveLength(LIBRARY_NAMES.length);
  expect(searchIcons('a').length).toBeLessThanOrEqual(180);
  expect(iconCategories().length).toBeGreaterThan(10);
  expect(iconCategories().find((c) => c.id === 'animals')?.count).toBeGreaterThan(5);
});
