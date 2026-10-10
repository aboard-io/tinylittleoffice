// The order a ":word" completion offers icons and emoji in (kit/complete.ts): a name that is what was typed, a
// name with a word that is (for an emoji, a keyword too: CLDR calls 🚗 "automobile", people call it "car"), a
// name that starts with it, a word that does, a tag that does; ties by the shorter name, then by name.
import { expect, test } from 'vitest';
import { completeEmoji, emojiNamed } from '../src/kit/emoji.ts';
import { completeIcons, rankMatches } from '../src/kit/icons-search.ts';

const e = (name: string, keywords = '') => ({ nameWords: name.split(/[ -]/), keywords: keywords.split(' ').filter(Boolean) });

test('rankMatches: exact name, then a word of it, then a name begun, a word begun, a tag begun; shorter names first', () => {
  const list = [e('carrot'), e('car-front'), e('car'), e('cable-car'), e('scarf'), e('bus', 'car vehicle'), e('cat')];
  expect(rankMatches('car', list, 8).map((i) => list[i].nameWords.join('-'))).toEqual(['car', 'cable-car', 'car-front', 'carrot', 'bus']);
  expect(rankMatches('ca', list, 3).map((i) => list[i].nameWords.join('-'))).toEqual(['car', 'cat', 'carrot']);
  // A keyword typed whole counts as a name only with alias (an emoji's).
  expect(
    rankMatches('car', list, 8, true)
      .map((i) => list[i].nameWords.join('-'))
      .slice(0, 3),
  ).toEqual(['car', 'bus', 'cable-car']);
  // Hyphens part the words typed; nothing typed, nothing found.
  expect(rankMatches('cable-c', list, 8).map((i) => list[i].nameWords.join('-'))).toEqual(['cable-car']);
  expect(rankMatches('', list, 8)).toEqual([]);
  expect(rankMatches('-', list, 8)).toEqual([]);
});

test('completeIcons and completeEmoji: the starter set answers ":ca", the car emoji comes for ":car", a name looked up whole', () => {
  expect(completeIcons('ca').slice(0, 2)).toEqual(['car', 'cat']);
  expect(completeIcons('car')[0]).toBe('car');
  expect(completeIcons('thumbs-up')).toEqual(['thumbs-up']);
  expect(completeEmoji('car', 4)).toContain('🚗');
  expect(completeEmoji('cat')[0]).toBe('🐈');
  expect(completeEmoji('heart')).toContain('❤️');
  expect(completeEmoji('ca', 8).length).toBe(8);
  expect(emojiNamed('red-heart')).toBe('❤️');
  expect(emojiNamed('Automobile')).toBe('🚗');
  expect(emojiNamed('nosuchthing')).toBe('');
});
