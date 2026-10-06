/** Brochure: a letter sheet folded in three. Six panels, in the order they are read. */
import { defineFold, side } from '../lib/fold.ts';

export default defineFold(
  { id: 'brochure', group: 'Print', under: 'zine', name: 'Brochure', icon: 'brochure', blurb: 'A trifold brochure: six panels on two sides of a sheet, each where the fold needs it.' },
  {
    count: 6,
    size: () => ({ w: 352, h: 816 }),
    name: (i) => ['Front', 'Inside left', 'Inside middle', 'Inside right', 'Inside flap', 'Back'][i],
    // Outside: the flap that folds in, the back, the front. Inside: the three panels, left to right.
    sheets: (p) => [side(p, [[5, 6, 1]]), side(p, [[2, 3, 4]])],
    how: () => 'Download the PDF and print it double-sided on letter paper, flipping on the short edge, at actual size. Fold the right third in, then the left third over it: the front is on top.',
  },
);
