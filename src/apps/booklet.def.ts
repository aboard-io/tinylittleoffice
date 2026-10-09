/** Booklet: half-letter pages, four to a sheet, nested and folded. Grows four pages at a time. */
import { defineFold, saddle, type Format } from '../lib/fold.ts';

export const HALF: Omit<Format, 'count'> = {
  size: () => ({ w: 528, h: 816 }),
  name: (i, n) => (i === 0 ? 'Front cover' : i === n - 1 ? 'Back cover' : `Page ${i + 1}`),
  sheets: saddle,
  how: () => 'Download the PDF and print it double-sided on letter paper, flipping on the short edge, at actual size. Stack the sheets in order, first on the outside, and fold them together down the middle.',
};

export default defineFold({ id: 'booklet', under: 'zine', name: 'Booklet', icon: 'booklet', blurb: 'A booklet of half-letter pages, eight to twenty, laid out to print, nest and fold.' }, { ...HALF, count: 8, grow: 20 });
