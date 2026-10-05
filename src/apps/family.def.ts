/** Family tree: an org chart whose boxes are people and couples. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, specOf } from '../lib/diagram.ts';
import './org.def.ts';

export const spec = {
  form: [
    { name: 'Person', is: '{Who}[ | {Note}]', indent: true },
  ] as LineKind[],
  hint: 'A person or couple per line ("Ada + Charles | 1815"); indent their children beneath them.',
  example: 'Rose + Albert | m. 1948\n  Helen + Tom | m. 1975\n    Paul | b. 1978\n    Sam | b. 1981\n  David | b. 1952\n    Ada | b. 1985',
  layout: specOf('org')!.layout!,
};

export default defineDiagram({ id: 'family', group: 'Visualization', under: 'draw', name: 'Family tree', icon: 'family', blurb: 'A family tree: people and couples, with their children beneath them.' }, spec);
