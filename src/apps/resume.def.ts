/** Résumé: a text, as Write writes it, fitted to exactly one page. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, onLetter } from '../lib/print.ts';
import { appOf, stack } from '../kit/core.ts';
import { pages, readText } from './write.def.ts';

export const spec = {
  form: [
    { name: 'Name', is: '# {Name}', once: true },
    { name: 'Section', is: '## {Section}', head: true },
    { name: 'Point', is: '- {Point}', indent: true },
    { name: 'Paragraph', is: '{Text:long}' },
  ] as LineKind[],
  hint: 'Written as a text is, in Markdown: "# Name", "## Section", "- point", **bold**. However much there is, it is fitted to one page.',
  example: "# Ada Lovelace\n\nLondon · ada@example.com · example.com/ada\n\n## Experience\n\n**Analyst, Analytical Engine** (1842 to 1843)\n\n- Wrote the first published program, for computing Bernoulli numbers\n- Translated and annotated Menabrea's paper, tripling its length\n\n## Education\n\nTutored in mathematics by Mary Somerville and Augustus De Morgan\n\n## Skills\n\n- Mathematics, music, French, explaining machines to people",
  // Its pages, end to end, as one sheet.
  sheets: (body: string) => [onLetter(stack(pages(body), 0), 40)],
};

export default definePrint(
  {
    id: 'resume',
    group: 'Print',
    name: 'Résumé',
    icon: 'resume',
    blurb: 'A résumé written as plain text and fitted to exactly one page.',
    title: (body) => appOf('write')!.title(body),
    outline: (body) => appOf('write')!.outline(body).slice(0, 14),
    read: readText,
  },
  spec,
);
