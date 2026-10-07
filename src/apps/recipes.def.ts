/** Recipe cards: a page per dish (the dish, what goes in, what to do), 6 by 4 inch cards two to a sheet. */
import { defineFold, fitted, type Format } from '../lib/fold.ts';
import { tile } from '../lib/print.ts';

export const RECIPES: Format = {
  count: 2,
  grow: 48,
  by: 1,
  size: () => ({ w: 576, h: 384 }),
  name: (i) => `Card ${i + 1}`,
  page: (s) => fitted(s, 576, 384, { max: 19, m: 30 }),
  sheets: (p) => tile(p, 1, 2),
  how: () => 'Download the PDF and print it on letter paper, at actual size. Cut along the dashes: two cards a sheet.',
};

export default defineFold({ id: 'recipes', under: undefined, group: 'Create', name: 'Recipe cards', icon: 'recipes', blurb: 'Recipe cards to print and cut: the dish, what goes in, what to do.' }, RECIPES);
