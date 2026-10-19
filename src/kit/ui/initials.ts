/**
 * A person as a page draws them small (docs/library.md, The kit's small pieces): their initials, and a hue of their
 * own, the same for the same name wherever it is drawn, so the Board's cards, a typed table's person cells and a
 * page's <to-avatar> (kit/ui/avatar.ts) show one person one way. No DOM: the Board's model tests and a host's server
 * use them alike (src/apps/board/fields.ts serves them to the Board under its own names).
 */

/** A person's initials: the first letter of their first and last words ("Maya Patel" MP, "Leo" L), as a reader writes them. */
export function initial(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const first = (w: string) => [...w][0]?.toLocaleUpperCase() ?? '';
  return words.length === 1 ? first(words[0]) : first(words[0]) + first(words[words.length - 1]);
}

/** A hue of a person's own, 0 to 359, the same for the same name (case and spaces aside) wherever it is drawn. */
export function hueOf(name: string): number {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % 360;
}
