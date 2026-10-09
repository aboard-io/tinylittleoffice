/**
 * The Office mark: a small office building seen straight on, drawn as the lucide icons are (a 24 grid,
 * 2px round strokes, no fill, currentColor) so it sits with them in the header. A flat roof line, two rows
 * of two windows, a door at the bottom middle; a hair wider than tall. It is the menu button, the drawer's
 * heading, the favicon (public/favicon.svg) and the app icons and share card (scripts/icons.ts draws those
 * from markPaths). No DOM here: the script reads it under node.
 */

/** The drawing, inside a 24 by 24 box: roof, walls and ground, four windows, the door. */
export const markPaths = [
  'M1.5 4.5h21', // the flat roof, a little past the walls
  'M3.5 4.5v15.5h17V4.5', // the walls and the ground
  'M7.5 8.5h1.5M15 8.5h1.5M7.5 12.5h1.5M15 12.5h1.5', // two rows of two windows
  'M10 20v-4h4v4', // the door
];

/** The mark as an SVG element, `size` pixels square, in the colour of the words around it. */
export function mark(size = 24, cls = 'to-mark'): string {
  return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markPaths.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
}
