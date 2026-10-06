/**
 * The sheets view: the document as the pages it prints to, each drawn as
 * an SVG. Tap a line of a sheet and its words open for typing.
 */
import { html, unsafeSVG, pageSvg, type TemplateResult } from '../kit.ts';
import { DiagramElement } from './diagram.ts';
import { fieldsOf } from '../lib/lines.ts';

export class SheetsView extends DiagramElement {
  /** A sheet's words, tapped: the row and field they came from, if any. */
  private onSheetClick(e: Event) {
    const t = (e.target as Element).closest('text');
    const form = this.spec.form;
    if (!t || !form) return;
    const label = (t.textContent ?? '').trim();
    const rows = this.rows();
    for (let i = 0; i < rows.length; i++) {
      const f = rows[i].values.findIndex((v, n) => fieldsOf(form, rows[i].kind)[n].type !== 'icon' && v.trim() && (v.trim() === label || label.startsWith(v.trim())));
      if (f >= 0) return this.editOver(t, i, f);
    }
  }

  protected get kind() {
    return 'print';
  }
  protected onPicClick(e: Event) {
    if (this.form) this.onSheetClick(e);
  }
  protected picture(): TemplateResult {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    const pages = text.trim() ? spec.sheets!(this.doc) : spec.sheets!(spec.example);
    return html`${pages.map((p, i) => html`<div class="sheet ${text.trim() ? '' : 'sample'}">${unsafeSVG(pageSvg(p, `role="img" aria-label="${this.name}, sheet ${i + 1}"`))}</div>`)}`;
  }
}
