// The Emoji set's table (kit/emoji-data.ts, written by scripts/emoji.ts) and its search (kit/emoji.ts).
import { expect, test } from 'vitest';
import { EMOJI, EMOJI_GROUPS } from '../src/kit/emoji-data.ts';
import { emojiIn, emojiName, searchEmoji } from '../src/kit/emoji.ts';

test('the table: base emoji only, each once, named, fully qualified, every group non-empty', () => {
  expect(EMOJI_GROUPS).toEqual(['Smileys & Emotion', 'People & Body', 'Animals & Nature', 'Food & Drink', 'Travel & Places', 'Activities', 'Objects', 'Symbols', 'Flags']);
  expect(EMOJI.length).toBeGreaterThan(1500);
  const chars = EMOJI.map((e) => e[0]);
  expect(new Set(chars).size).toBe(chars.length);
  for (const [char, name, keywords, group] of EMOJI) {
    expect(name.trim(), char).not.toBe('');
    expect(typeof keywords).toBe('string');
    expect(EMOJI_GROUPS[group], char).toBeDefined();
    // A fully-qualified emoji is what RGI_Emoji matches whole; no skin tone, no hair.
    expect(new RegExp('^\\p{RGI_Emoji}$', 'v').test(char), `${char} ${name}`).toBe(true);
    expect(/[\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/u.test(char), `${char} ${name}`).toBe(false);
  }
  EMOJI_GROUPS.forEach((g, i) => expect(emojiIn(i).length, g).toBeGreaterThan(0));
  // Flags, keycaps and families (CLDR's derived names) are in.
  expect(emojiName('🇫🇷')).toBe('flag: France');
  expect(emojiName('#️⃣')).toBe('keycap: #');
  expect(emojiName('🚗')).toBe('automobile');
});

test('search by name and keyword', () => {
  expect(searchEmoji('car')).toContain('🚗');
  expect(searchEmoji('automobile')[0]).toBe('🚗');
  expect(searchEmoji('france')).toContain('🇫🇷');
  expect(searchEmoji('grinning face')[0]).toBe('😀');
  expect(searchEmoji('')).toEqual([]);
  expect(searchEmoji('zzzqx')).toEqual([]);
});
