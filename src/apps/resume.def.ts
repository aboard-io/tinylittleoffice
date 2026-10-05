/** Résumé: written like any text, and fitted to exactly one page. */
import { definePrint, onLetter } from '../lib/print.ts';
import { stack } from '../kit/core.ts';
import { pages } from './write.def.ts';

export const spec = {
  hint: 'Written as a text is: "# Name", "## Section", "- point", *bold*. However much there is, it is fitted to one page.',
  example: '# Ada Lovelace\nLondon · ada@example.com · example.com/ada\n## Experience\n*Analyst, Analytical Engine* (1842 to 1843)\n- Wrote the first published program, for computing Bernoulli numbers\n- Translated and annotated Menabrea\'s paper, tripling its length\n## Education\nTutored in mathematics by Mary Somerville and Augustus De Morgan\n## Skills\n- Mathematics, music, French, explaining machines to people',
  // Its pages, end to end, as one sheet.
  sheets: (body: string) => [onLetter(stack(pages(body), 0), 40)],
};

export default definePrint({ id: 'resume', name: 'Résumé', icon: 'resume', blurb: 'A résumé written as plain text and fitted to exactly one page.' }, spec);
