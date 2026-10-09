/** One line registers a diagram app's editor, in whichever of the three views its spec calls for. */
import { defineElement } from '../kit.ts';
import { specOf } from '../lib/diagram.ts';
import { DiagramElement } from './diagram.ts';
import { PageView } from './diagram-page.ts';
import { SheetsView } from './diagram-sheets.ts';
import { ShapesView } from './diagram-shapes.ts';

/** Register the editor for one diagram app, in the view its spec calls for: a page, printed sheets, or shapes. */
export function defineDiagramEditor(id: string) {
  const spec = specOf(id)!;
  const View: typeof DiagramElement = spec.page ? PageView : spec.sheets ? SheetsView : ShapesView;
  defineElement(id, class extends View {
    static app = id;
  });
}
