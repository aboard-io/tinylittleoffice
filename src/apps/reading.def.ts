/** Reading list: what you read, who wrote it, and what you thought. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

function page(body: string): string {
  const title = h1(body) || 'Reading list';
  const books = rest(body).map((l) => l.split('|').map((p) => p.trim()));
  return htmlPage(
    title,
    `${books.length} books.`,
    `main{max-width:36rem;margin:0 auto;padding:2.5rem 1.25rem}h1{font-size:1.8rem}ol{list-style:none;padding:0}li{padding:1rem 0;border-bottom:1px solid #e4e4e7}
strong{font-size:1.15rem}.by{color:#52525b}.stars{color:#ca8a04;letter-spacing:.1em;float:right}.off{color:#d4d4d8}p{margin:.3rem 0 0;color:#3f3f46}`,
    `<main><h1>${xml(title)}</h1><ol>${books
      .map(([name, by = '', stars = '', note = '']) => {
        const n = Math.max(0, Math.min(5, Math.round(parseFloat(stars) || 0)));
        return `<li>${stars ? `<span class="stars" role="img" aria-label="${n} out of 5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>` : ''}<strong>${xml(name)}</strong>${by ? ` <span class="by">${xml(by)}</span>` : ''}${note ? `<p>${xml(note)}</p>` : ''}</li>`;
      })
      .join('')}</ol></main>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Book', is: '{Title} | {Author}[ | {Stars:choice=1,2,3,4,5}[ | {What you thought:long}]]' },
    { name: 'Book, just the title', is: '{Title}' },
  ] as LineKind[],
  hint: '"# Title", then a book per line: "Title | author | stars out of 5 | what you thought".',
  example: '# Read in 2027\nThe Dispossessed | Ursula K. Le Guin | 5 | Still the best argument about how to live together.\nPiranesi | Susanna Clarke | 4 | A house with tides in it.\nThe Soul of a New Machine | Tracy Kidder | 4\nOn Writing Well | William Zinsser | 3 | Useful, if stern.',
  page,
};

export default definePage({ id: 'reading', name: 'Reading list', icon: 'reading', group: 'Personal', blurb: 'A reading list with stars and a line on each book.', title: h1 }, spec);
