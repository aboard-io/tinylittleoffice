import { test } from 'node:test';
import assert from 'node:assert/strict';

import { KEYWORDS, searchIcons, stem, suggestIcons } from '../src/lib/iconsearch.ts';
import { LIBRARY_NAMES } from '../src/lib/icons.ts';

test('every library icon has keywords, and nothing else does', () => {
  assert.deepEqual(Object.keys(KEYWORDS).sort(), [...LIBRARY_NAMES].sort());
});

test('stem', () => {
  assert.equal(stem('launching'), 'launch');
  assert.equal(stem('launches'), 'launch');
  assert.equal(stem('shipping'), 'ship');
  assert.equal(stem('selling'), 'sell');
  assert.equal(stem('companies'), 'company');
  assert.equal(stem('goals'), 'goal');
  assert.equal(stem('plan'), 'plan');
});

test('suggestions follow the slide text', () => {
  assert.equal(suggestIcons('Launch plan', ['Build it', 'Ship it', 'Tell people'])[0], 'rocket');
  assert.equal(suggestIcons('Our goals for Q3')[0], 'target');
  assert.equal(suggestIcons('Pricing')[0], 'dollar');
  assert.equal(suggestIcons('Meet the team')[0], 'users');
  assert.ok(suggestIcons('', ['Security and privacy']).includes('shield'));
  assert.ok(!suggestIcons('Launch plan').includes('plane'));
  assert.deepEqual(suggestIcons(''), []);
  assert.deepEqual(suggestIcons('Zzyzx qwerty'), []);
  assert.ok(suggestIcons('team goals money growth launch security time', [], 3).length === 3);
});

test('search by name, prefix and keyword', () => {
  assert.equal(searchIcons('').length, LIBRARY_NAMES.length);
  assert.equal(searchIcons('rock')[0], 'rocket');
  assert.deepEqual(searchIcons('trending').slice(0, 2), ['trending-up', 'trending-down']);
  assert.equal(searchIcons('trending down')[0], 'trending-down');
  assert.ok(searchIcons('money').includes('dollar'));
  assert.ok(searchIcons('pet').includes('dog') && searchIcons('pet').includes('cat'));
  assert.equal(searchIcons('chart')[0], 'bar-chart');
  assert.deepEqual(searchIcons('zzz'), []);
});

test('all of Lucide joins the library, found by name', async () => {
  const { allIcons, ICON_SVG, LIBRARY } = await import('../src/lib/icons.ts');
  const { iconCount } = await import('../src/lib/iconsearch.ts');
  await allIcons;
  assert.ok(iconCount() > 1500, String(iconCount()));
  assert.ok(ICON_SVG['accessibility'] && ICON_SVG['building-2'] && ICON_SVG['a-arrow-down']);
  assert.ok(searchIcons('accessib').includes('accessibility'));
  assert.ok(searchIcons('chart column').includes('chart-column'));
  // The short names decks already use keep working, and searching nothing still shows the starter set.
  assert.ok(LIBRARY['dollar'] && LIBRARY['rocket']);
  assert.equal(searchIcons('').length, LIBRARY_NAMES.length);
  assert.ok(searchIcons('a').length <= 180);
});
