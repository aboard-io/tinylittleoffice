/** Name badges: a list of people, six badges to a sheet. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePrint, tile } from '../lib/print.ts';
import { fitted } from '../lib/fold.ts';

export const spec = {
  form: [
    { name: 'Person', is: '{Name}[ | {Role}[ | {Where from}]]' },
  ] as LineKind[],
  hint: 'A person per line: "Name | role | where from". Six 4 by 3 inch badges print on each sheet, with lines to cut along.',
  example: 'Ada Lovelace | Engineering | London\nGrace Hopper | Compilers | New York\nAlan Kay | Research | Palo Alto\nMargaret Hamilton | Flight software | Boston',
  sheets: (text: string) =>
    tile(
      text.split('\n').filter((l) => l.trim()).map((l) => {
        const [title, ...bullets] = l.split('|').map((p) => p.trim());
        return fitted({ icon: '', title, bullets }, 384, 288, { cover: true, max: 22 });
      }),
      2,
      3,
    ),
};

export default definePrint({ id: 'badges', name: 'Name badges', icon: 'badges', blurb: 'Name badges from a list of people, six to a sheet, ready to cut.' }, spec);
