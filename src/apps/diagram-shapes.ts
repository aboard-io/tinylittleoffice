/**
 * The shapes view: the document laid out as shapes and links, an SVG.
 * Tap a shape for its buttons (add one like it, give it a picture, edit
 * its words, take it away); tap twice to type on it.
 */
import { html, nothing, state, unsafeSVG, type TemplateResult } from '../kit.ts';
import { svg } from 'lit';
import { DiagramElement } from './diagram.ts';
import { type DiagramSpec } from '../lib/diagram.ts';
import { fieldsOf, kindsOf, readLines, removeRow } from '../lib/lines.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { isLink } from '../lib/drawmodel.ts';
import { arrowDefs, shapeSvg } from './draw.def.ts';

export class ShapesView extends DiagramElement {
  /** The shape picked in the picture, whose buttons are showing. */
  @state() protected sel = -1;

  /** The row of the form that shape i was drawn from: the row written as the shape's label, or whose first words are. */
  private rowOf(i: number, shapes: ReturnType<NonNullable<DiagramSpec['layout']>>['shapes']): number {
    const form = this.spec.form;
    if (!form) return -1;
    const rows = readLines(this.textOf(this.doc), form);
    const { made } = kindsOf(form);
    const label = shapes[i].text.trim();
    const head = label.split(' | ')[0].replace(/^:[a-z0-9-]+\s*/, '').trim().toLowerCase();
    const exact = rows.findIndex((r) => made[r.kind].write(r.values).trim() === label);
    if (exact >= 0) return exact;
    return rows.findIndex((r) => r.values.some((v, n) => fieldsOf(form, r.kind)[n].type !== 'icon' && v.trim().toLowerCase() === head));
  }

  /** Little buttons under the picked shape: add one like it, give it a picture, go to its words, take it away. */
  private controls(d: ReturnType<NonNullable<DiagramSpec['layout']>>) {
    const i = this.sel;
    const s = d.shapes[i];
    if (!s || isLink(s.k)) return nothing;
    const row = this.rowOf(i, d.shapes);
    if (row < 0) return nothing;
    // A finger's width on screen, whatever the picture's scale.
    const el = this.querySelector<SVGSVGElement>('.pic > svg');
    const unit = el ? el.getBoundingClientRect().width / d.w : 1;
    const size = Math.max(22, Math.round(34 / unit));
    const acts: [string, string, () => void][] = [
      ['Add one under it', 'plus', () => this.addAfter(row)],
      ['Give it a picture', 'smile', () => this.iconFor(row)],
      ['Edit its words', 'pencil', () => this.editOver(this.querySelector(`.pic > svg g.pick[data-i="${i}"]`)!, row)],
      ['Take it away', 'x', () => (this.sel = -1, this.putRows(removeRow(this.rows(), this.spec.form!, row)))],
    ];
    const x0 = s.x + s.w / 2 - (acts.length * (size + 4) - 4) / 2;
    const y = s.y + s.h + 6;
    return svg`<g class="diagram-ctl" role="group" aria-label="Shape ${i + 1}">
      ${acts.map(([label, glyph, act], n) => svg`<g role="button" tabindex="0" aria-label=${label} transform="translate(${x0 + n * (size + 4)} ${y})" @click=${(e: Event) => (e.stopPropagation(), act())} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), act())}>
        <title>${label}</title>
        <rect width=${size} height=${size} rx=${size / 4}/>
        <g transform="translate(${size * 0.18} ${size * 0.18}) scale(${(size * 0.64) / 24})" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${unsafeSVG(ICON_SVG[glyph] ?? '')}</g>
      </g>`)}
    </g>`;
  }

  protected drawable() {
    return !!this.spec.layout?.(this.doc).shapes.length;
  }
  protected onPicClick() {
    this.sel = -1;
  }
  protected unpick() {
    this.sel = -1;
  }
  protected picture(): TemplateResult {
    const spec = this.spec;
    const d = spec.layout!(this.doc);
    if (!d.shapes.length) return super.picture();
    return html`<svg viewBox="0 0 ${d.w} ${d.h}" role=${spec.form ? 'group' : 'img'} aria-label=${this.name} style="max-width:${d.w * 1.4}px">
      <defs>${unsafeSVG(arrowDefs())}</defs>
      ${d.shapes.map((s, i) =>
        isLink(s.k) || !spec.form
          ? svg`<g>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`
          : svg`<g class="pick ${this.sel === i ? 'on' : ''}" data-i=${i} role="button" tabindex="0" aria-label="${s.text.replace(/^:[a-z0-9-]+\s*/, '') || 'Shape'}: tap for its buttons, twice to type" aria-pressed=${this.sel === i ? 'true' : 'false'} @dblclick=${(e: Event) => (e.stopPropagation(), this.editOver(e.currentTarget as Element, this.rowOf(i, d.shapes)))} @click=${(e: Event) => (e.stopPropagation(), (this.sel = this.sel === i ? -1 : i), this.requestUpdate())} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), (this.sel = this.sel === i ? -1 : i))}>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`,
      )}
      ${this.controls(d)}
    </svg>`;
  }
}
