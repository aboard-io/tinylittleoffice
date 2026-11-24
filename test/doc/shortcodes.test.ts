// Emoji shortcodes in words (src/doc/shortcodes.ts): `:raising_hand:` is read as the emoji, words with their marks, and
// written as the emoji; an icon's name wins, so no shortcode is a Lucide icon's; each is one of Unicode's emoji; a name
// that is neither, a time and an address stay words; and words that hold a shortcode as words write back as them.
import { icons } from 'lucide';
import { expect, test } from 'vitest';
import { parse, parseInline, write, writeInline } from '../../src/doc/index.ts';
import { SHORTCODES, shortcodeEmoji } from '../../src/doc/shortcodes.ts';
import { EMOJI } from '../../src/kit/draw/emoji-data.ts';
import { LIBRARY } from '../../src/kit/draw/icons.ts';
import { kebab } from '../../src/kit/draw/icons-full.ts';

test('no shortcode is an icon’s name, and each is a fully qualified emoji of Unicode’s', () => {
  const lucide = new Set([...Object.keys(icons).map(kebab), ...Object.keys(LIBRARY)]);
  const chars = new Set(EMOJI.map((e) => e[0]));
  expect(Object.keys(SHORTCODES).filter((name) => lucide.has(name))).toEqual([]);
  expect(Object.entries(SHORTCODES).filter(([, char]) => !chars.has(char))).toEqual([]);
  expect(shortcodeEmoji('constructor')).toBeUndefined();
});

test('a shortcode is read as its emoji, words with their marks; an icon stays an icon', () => {
  expect(parseInline('Hands up :raising_hand: please')).toEqual([{ t: 'Hands up 🙋 please' }]);
  expect(parseInline(':tada: :thumbs_up: and :raising_hand:')).toEqual([{ t: '🎉 👍 and 🙋' }]);
  expect(parseInline('**Done :white_check_mark:**')).toEqual([{ t: 'Done ✅', b: true }]);
  expect(parseInline(':100: sure')).toEqual([{ t: '💯 sure' }]);
  expect(parseInline(':rocket: Launch')).toEqual([{ t: '', ic: 'rocket' }, { t: ' Launch' }]);
  const deck = parse('## :raising_hand: Questions\n\n- Ask :eyes:\n');
  expect(deck.blocks.map((b) => ('runs' in b ? b.runs : null))).toEqual([[{ t: '🙋 Questions' }], [{ t: 'Ask 👀' }]]);
  expect(write(deck)).toContain('## 🙋 Questions');
});

test('a name that is no shortcode, a time and an address stay words', () => {
  expect(parseInline('see :not_a_code: here')).toEqual([{ t: 'see :not_a_code: here' }]);
  expect(parseInline('at 10:30: then 10:100: done')).toEqual([{ t: 'at 10:30: then 10:100: done' }]);
  expect(JSON.stringify(parseInline('a:tada: b'))).not.toContain('🎉');
  expect(JSON.stringify(parseInline('https://example.com/:tada:/x'))).not.toContain('🎉');
});

test('words that hold a shortcode as words are written so they read back as the same words', () => {
  for (const t of [':raising_hand:', 'say :tada: twice', ':100: points', '**:joy:**']) {
    const runs = [{ t }];
    expect(parseInline(writeInline(runs)), t).toEqual(runs);
  }
});
