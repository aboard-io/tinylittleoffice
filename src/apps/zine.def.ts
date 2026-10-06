/**
 * Zine: eight small pages from one sheet of letter paper. One-sided is the
 * classic mini zine: everything on one side, folded into eighths with one
 * cut along the middle. Two-sided prints both sides; the sheet is cut in
 * half, the halves nested and folded, for bigger pages.
 */
import { defineFold, side, type Format } from '../lib/fold.ts';

export const ZINE: Format = {
  count: 8,
  sides: true,
  size: (two) => (two ? { w: 408, h: 528 } : { w: 264, h: 408 }),
  name: (i, n) => (i === 0 ? 'Front cover' : i === n - 1 ? 'Back cover' : `Page ${i + 1}`),
  // One-sided: the top row is upside down, so that folding puts the pages in order.
  sheets: (p, two) =>
    two
      ? [side(p, [[8, 1], [6, 3]], { cut: [1, 0, 2], note: 'cut along the dashes · this half goes outside' }), side(p, [[2, 7], [4, 5]], { cut: [1, 0, 2], note: 'print on the back, flipped on the long edge' })]
      : [side(p, [[5, 4, 3, 2], [6, 7, 8, 1]], { flip: [0], cut: [1, 1, 3], note: 'cut along the dashes · fold along the dots' })],
  how: (two) =>
    two
      ? 'Download the PDF and print it double-sided on letter paper, flipping on the long edge, at actual size. Cut along the dashes, lay the top half over the bottom half, and fold them together down the middle.'
      : 'Download the PDF and print it on one side of letter paper, at actual size. Fold it in half the long way, then into quarters; cut the dashes in the middle; push the ends together and fold it into a book.',
};

export default defineFold({ id: 'zine', group: 'Print', name: 'Zine', icon: 'zine', blurb: 'An eight-page zine from one sheet of paper: print, fold and cut, or read it by tapping on a phone.' }, ZINE);
