/** Programme: one sheet folded in half. A front, two pages inside, a back. */
import { defineFold } from '../lib/fold.ts';
import { HALF } from './booklet.def.ts';

export default defineFold(
  { id: 'programme', group: 'Print', under: 'zine', name: 'Programme', icon: 'programme', blurb: 'An order of service, a setlist, a running order: one sheet folded in half.' },
  { ...HALF, count: 4, name: (i) => ['Front', 'Inside left', 'Inside right', 'Back'][i] },
);
