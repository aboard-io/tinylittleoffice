/** Name badges: a page per person (name, role, where from), six 4 by 3 inch badges to a sheet, with lines to cut along. */
import { defineFold, fitted, type Format } from '../lib/fold.ts';
import { tile } from '../lib/print.ts';

export const BADGES: Format = {
  count: 2,
  grow: 48,
  by: 1,
  size: () => ({ w: 384, h: 288 }),
  name: (i) => `Badge ${i + 1}`,
  page: (s) => fitted({ ...s, layout: s.layout ?? 't' }, 384, 288, { cover: true, loud: 1.1, max: 22 }),
  sheets: (p) => tile(p.filter((_, i) => i < p.length), 2, 3),
  how: () => 'Download the PDF and print it on letter paper, at actual size. Cut along the dashes: six badges a sheet.',
};

export default defineFold({ id: 'badges', group: 'Print', under: 'poster', name: 'Name badges', icon: 'badges', blurb: 'Name badges, one page per person, six to a sheet, ready to cut.' }, BADGES);
