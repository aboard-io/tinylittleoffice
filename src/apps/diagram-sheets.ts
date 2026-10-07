/**
 * The sheets view: the document as the pages it prints to, each drawn as
 * an SVG. Tap a line of a sheet and its words open for typing.
 */
import { html, unsafeSVG, pageSvg, type TemplateResult } from '../kit.ts';
import { DiagramElement } from './diagram.ts';
import { fieldsOf, kindsOf } from '../lib/lines.ts';

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
    if (!this.form) return;
    const t = e.target as Element;
    if (t.closest('text')) return this.onSheetClick(e);
    // Empty paper, tapped: a new line at the end, open for its words.
    if (!t.closest('.sheet')) return;
    const form = this.spec.form!;
    const { kinds } = kindsOf(form);
    const kind = kinds.findIndex((k, n) => n < form.length && !k.once && k.is !== '' && !k.is.startsWith('#') && !k.head && fieldsOf(form, n).some((f) => f.type !== 'icon' && f.type !== 'choice'));
    if (kind < 0) return;
    if (this.editing || this.draft) return;
    this.startDraft(kind, this.rows().length, kinds[kind].at ?? 0);
  }

  /** The draft's line on the sheet: the words are its kind's name. */
  protected draftElement(): Element | null {
    if (!this.draft) return null;
    const name = kindsOf(this.spec.form!).kinds[this.draft.row.kind].name;
    return [...this.querySelectorAll('.sheet text')].find((x) => (x.textContent ?? '').trim().startsWith(name)) ?? null;
  }
  protected picture(): TemplateResult {
    const spec = this.spec;
    const text = this.textOf(this.doc);
    const pages = text.trim() || this.draft ? spec.sheets!(this.drawnText()) : spec.sheets!(spec.example);
    return html`${pages.map((p, i) => html`<div class="sheet ${text.trim() ? '' : 'sample'}">${unsafeSVG(pageSvg(p, `role="img" aria-label="${this.name}, sheet ${i + 1}"`))}</div>`)}`;
  }
}
