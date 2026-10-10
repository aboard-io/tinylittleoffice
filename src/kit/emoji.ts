/**
 * The Emoji set of the icon picker: the native characters, by name and keyword, in Unicode's groups
 * (emoji-data.ts, written by scripts/emoji.ts from Unicode's and CLDR's data). No DOM and no fonts: an
 * emoji is drawn by the system, as words are. Loaded with the picker, never before.
 */
import { EMOJI, EMOJI_GROUPS } from './emoji-data.ts';

export { EMOJI_GROUPS };

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const ENTRIES = EMOJI.map(([char, name, keywords, group]) => ({ char, name, nameWords: words(name), keywords: words(keywords), group }));
const BY_CHAR = new Map(ENTRIES.map((e) => [e.char, e]));

/** The emoji in one group (an index into EMOJI_GROUPS), in Unicode's order. */
export const emojiIn = (group: number): string[] => ENTRIES.filter((e) => e.group === group).map((e) => e.char);

/** An emoji's name ("automobile"), '' for a character that is not one. */
export const emojiName = (char: string): string => BY_CHAR.get(char)?.name ?? '';

/** Emoji matching what was typed, best first (a word of the name before a keyword): every word typed must begin a word of either. Nothing typed gives nothing. */
export function searchEmoji(query: string, limit = 180): string[] {
  const q = words(query);
  if (!q.length) return [];
  const hits: [string, number][] = [];
  for (const e of ENTRIES) {
    let rank = 0;
    const ok = q.every((t) => {
      if (e.nameWords.some((w) => w.startsWith(t))) return true;
      rank++;
      return e.keywords.some((w) => w.startsWith(t));
    });
    if (ok) hits.push([e.char, rank]);
  }
  return hits.sort((a, b) => a[1] - b[1]).slice(0, limit).map(([c]) => c);
}
