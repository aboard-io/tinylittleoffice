/**
 * Every editor, in the one script, so an app opens with nothing to fetch.
 * An app with an editor of its own is a line here (`npm run new-app` adds
 * it). The rest are edited by a shared editor, chosen by what their
 * definition registered: a diagram, page or print spec (the diagram editor,
 * in one of its views), or a fold (the editor for paper that folds).
 */
import './sheet.ts';
import './write.ts';
import './outline.ts';
import './deck.ts';
import './draw.ts';
import './cal.ts';
import './todo.ts';
import './board.ts';
import './gantt.ts';
import './trip.ts';
import './anim.ts';
import './calc.ts';
import './pixel.ts';
import './contract.ts';
import './site.ts';
import { apps } from '../kit/core.ts';
import { specOf } from '../lib/diagram.ts';
import { formatOf } from '../lib/fold.ts';
import { defineDiagramEditor } from './diagram-editor.ts';
import { defineFoldEditor } from './fold.ts';

for (const a of apps()) {
  if (customElements.get(`to-${a.id}`)) continue;
  if (specOf(a.id)) defineDiagramEditor(a.id);
  else if (formatOf(a.id)) defineFoldEditor(a.id);
}
