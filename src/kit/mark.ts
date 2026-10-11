/**
 * The mark: a sheet of paper with its corner turned down and a link on it, drawn as Lucide draws its icons (24 by
 * 24, a 2px stroke, round caps) so it sits among them (Paul, 2026-10-10: "a logo that looks like a piece of paper";
 * 2026-10-11: "folded paper with a link"). The link is Lucide's chain at two fifths of its size, two loops crossing on the
 * diagonal, so it reads as a link at 32px and as a marked sheet at 16. The one drawing is the menu button, the
 * drawer's head, the favicon and app icons (scripts/icons.ts) and the cards (scripts/make-cards.ts).
 */
export const markPaths = [
  'M14 2.5H6.5a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V7z', // the sheet, its top right corner turned down
  'M14 2.5V7h4.5', // the fold
  'M10.7 14.05a2.1 2.1 0 0 0 3.17.23l1.26-1.26a2.1 2.1 0 0 0-2.97-2.97l-.72.72', // the link's upper loop
  'M12.38 13.2a2.1 2.1 0 0 0-3.17-.23l-1.26 1.26a2.1 2.1 0 0 0 2.97 2.97l.72-.72', // and its lower loop
];

/** The mark as an SVG element, `size` sixteenths of its scale square (--i, kit.css), in the colour of the words around it. */
export function mark(size = 24, cls = 'to-mark'): string {
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" style="--i:${size / 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
