/** Poster: one letter page, the words as big as will fit; a title page by default, or any page type. */
import { defineFold, fitted, LETTER, type Format } from '../lib/fold.ts';

export const POSTER: Format = {
  count: 1,
  size: () => LETTER,
  name: () => 'Poster',
  page: (s) => fitted({ ...s, layout: s.layout ?? 't' }, LETTER.w, LETTER.h, { cover: true, loud: 2, max: 150, m: 64 }),
  sheets: (p) => p,
  how: () => 'Download the PDF and print it on letter paper, at actual size.',
};

export default defineFold({ id: 'poster', name: 'Poster', icon: 'poster', blurb: 'A poster or flyer: a headline and a few lines, as big as one page allows.' }, POSTER);
