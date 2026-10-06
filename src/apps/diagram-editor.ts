/** One line registers a diagram app's editor, in whichever of the three views its spec calls for. */
import { defineElement } from '../kit.ts';
import { specOf } from '../lib/diagram.ts';
import { DiagramElement } from './diagram.ts';
import { PageView } from './diagram-page.ts';
import { SheetsView } from './diagram-sheets.ts';
import { ShapesView } from './diagram-shapes.ts';
/** Register the editor for one diagram app, in the view its spec calls for. */
export function defineDiagramEditor(id: string) {
  defineElement(id, class extends viewFor(id) {
    static app = id;
  });
}
/** The view a spec draws with: a page, printed sheets, or shapes. */
export function viewFor(id: string): typeof DiagramElement {
  const spec = specOf(id)!;
  return spec.page ? PageView : spec.sheets ? SheetsView : ShapesView;
}
