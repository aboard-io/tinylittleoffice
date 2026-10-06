/** Poster: one letter page, the words as big as will fit. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, slidesOf, LETTER } from '../lib/print.ts';
import { fitted } from '../lib/fold.ts';

export const spec = {
  form: [
    { name: 'Picture', is: ':{Picture:icon}', once: true },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: 'The headline, then a line for each thing to say. Start with ":icon-name" for a picture. Everything is made as big as the page allows.',
  example: ':music\nOpen mic night\nFriday 12 March, 8pm\nThe Anchor, 14 Quay Street\nFree. Bring a song.',
  sheets: (text: string) => [fitted(slidesOf(text)[0] ?? { icon: '', title: '', bullets: [] }, LETTER.w, LETTER.h, { cover: true, max: 150, m: 64 })],
};

export default definePrint({ id: 'poster', group: 'Print', under: undefined, name: 'Poster', icon: 'poster', blurb: 'A poster or flyer: a headline and a few lines, as big as one page allows.' }, spec);
