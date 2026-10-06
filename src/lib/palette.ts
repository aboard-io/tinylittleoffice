/**
 * The one palette. Chosen so that every pair can be told apart by people
 * with the common colour deficiencies (deuteranopia, protanopia,
 * tritanopia): blue, orange, green, purple and red are the Okabe–Ito
 * colours, with lightness as well as hue between them. The letters are
 * what documents carry, so they never change; only what they look like.
 */
export const PALETTE: Record<string, { name: string; hex: string }> = {
  b: { name: 'Blue', hex: '#0072b2' },
  o: { name: 'Orange', hex: '#d55e00' },
  g: { name: 'Green', hex: '#009e73' },
  p: { name: 'Purple', hex: '#a05ca8' },
  r: { name: 'Red', hex: '#b3261e' },
  s: { name: 'Sky', hex: '#56b4e9' },
  y: { name: 'Yellow', hex: '#e8b400' },
  k: { name: 'Black', hex: '#18181b' },
};
/** Colours in the order a series takes them: each a clear step from the last, whatever your eyes. */
export const SERIES = ['#0072b2', '#d55e00', '#009e73', '#a05ca8', '#56b4e9', '#e8b400', '#b3261e', '#18181b'];
/** Light tints to lay text on: the same hues, pale. */
export const TINTS: Record<string, string> = { b: '#dbeafe', o: '#ffe4cc', g: '#d1f5e8', p: '#f1e0f4', r: '#f9dad7', s: '#e0f2fe', y: '#fff3c4', k: '#e4e4e7' };
/**
 * Something besides colour, for charts: a pattern to lay over each series
 * after the first, so bars and slices can be told apart in black and white.
 * The patterns, as SVG defs, and the fill that uses one.
 */
export function patternDefs(id = 'p'): string {
  const marks = ['', 'M0 0L6 6M-1 5L1 7M5 -1L7 1', 'M3 0V6', 'M0 3H6', 'M0 6L6 0M-1 1L1 -1M5 7L7 5', 'M3 3m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0', 'M0 0L6 6M0 6L6 0', 'M0 3H6M3 0V6'];
  return marks.map((d, i) => (d ? `<pattern id="${id}${i}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="${d}" stroke="#fff" stroke-width="1.2" fill="#fff" stroke-opacity="0.55" fill-opacity="0.55"/></pattern>` : '')).join('');
}
export const patternFill = (i: number, id = 'p') => (i % 8 ? `url(#${id}${i % 8})` : '');
