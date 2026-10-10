/**
 * The mark: a sheet of paper with its corner turned down and two lines of words on it, drawn as Lucide draws its
 * icons (24 by 24, a 2px stroke, round caps) so it sits among them (Paul, 2026-10-10: "a logo that looks like a piece
 * of paper"). The one drawing is the menu button, the drawer's head, the favicon and app icons (scripts/icons.ts) and
 * the cards (scripts/make-cards.ts).
 */
export const markPaths = [
  'M14 2.5H6.5a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7z', // the sheet, its top right corner turned down
  'M14 2.5V7h4.5', // the fold
  'M9 12.5h6M9 16.5h4', // two lines of words
];

/** The mark as an SVG element, `size` pixels square, in the colour of the words around it. */
export function mark(size = 24, cls = 'to-mark'): string {
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
