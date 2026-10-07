/**
 * The shapes view: the document laid out as shapes and links, an SVG.
 * Tap a shape for its buttons (add one like it, give it a picture, edit
 * its words, take it away); tap twice to type on it.
 */
import { html, nothing, state, unsafeSVG, type TemplateResult } from '../kit.ts';
import { svg } from 'lit';
import { DiagramElement } from './diagram.ts';
import { type DiagramSpec } from '../lib/diagram.ts';
import { fieldsOf, kindsOf, placeBlock, readLines, removeRow, type Row } from '../lib/lines.ts';
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
    if (!head) return -1;
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

  /* ---------- adding and moving on the picture itself ---------- */

  /** The kind a tap on empty space adds: the first that is a thing with words of its own (not a title, a divider or a link between things). */
  private get mainKind(): number {
    const form = this.spec.form;
    if (!form) return -1;
    const { kinds } = kindsOf(form);
    const plain = (n: number) => fieldsOf(form, n).every((f) => f.type !== 'pick') && !/\{From\}|\{One set\}/.test(kinds[n].is);
    return kinds.findIndex((k, n) => n < form.length && !k.once && k.is !== '' && !k.is.startsWith('#') && !k.head && plain(n) && fieldsOf(form, n).some((f) => f.type !== 'icon' && f.type !== 'choice'));
  }

  /** A tap on empty space: a new thing there, with its words ready to type. */
  private addAt(px: number, py: number) {
    const form = this.spec.form;
    const kind = this.mainKind;
    if (!form || kind < 0) return;
    const fields = fieldsOf(form, kind);
    const words = fields.findIndex((f) => f.type !== 'icon' && f.type !== 'choice');
    const rows = this.rows();
    const values = fields.map((f, n) => (f.type === 'choice' ? f.options[0] : n === words ? 'New' : ''));
    const m = this.spec.moves;
    if (m && m.kind === kind) {
      // Where it was tapped, in the picture's own units, if the kind keeps a place.
      const d = this.spec.layout!(this.doc);
      const x0 = Math.min(...d.shapes.filter((s) => !isLink(s.k)).map((s) => s.x), Infinity);
      const y0 = Math.min(...d.shapes.filter((s) => !isLink(s.k)).map((s) => s.y), Infinity);
      values[m.x] = String(Math.max(0, Math.round((px - (Number.isFinite(x0) ? x0 : px)) / m.unit)));
      values[m.y] = String(Math.max(0, Math.round((py - (Number.isFinite(y0) ? y0 : py)) / m.unit)));
      if (fields[1] && /width/i.test(fields[1].name)) (values[1] = '3'), (values[2] = '3');
    }
    const row: Row = { kind, values, depth: kindsOf(form).kinds[kind].at ?? 0 };
    const at = rows.length;
    this.putRows([...rows, row]);
    void this.updateComplete.then(() => {
      const d = this.spec.layout!(this.doc);
      const i = d.shapes.findIndex((q, n) => !isLink(q.k) && this.rowOf(n, d.shapes) === at);
      const el = this.querySelector(`.pic > svg g.pick[data-i="${i}"]`);
      if (el) this.editOver(el, at, words);
    });
  }

  /** A drag: where the pointer went down, and the shape under it. */
  private drag: { i: number; row: number; x: number; y: number; moved: boolean } | null = null;
  private svgPoint(e: PointerEvent): [number, number] {
    const svg = this.querySelector<SVGSVGElement>('.pic > svg')!;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM()!.inverse());
    return [q.x, q.y];
  }
  private onDown(e: PointerEvent, i: number, shapes: ReturnType<NonNullable<DiagramSpec['layout']>>['shapes']) {
    if (e.button !== 0 || !this.spec.form) return;
    const row = this.rowOf(i, shapes);
    if (row < 0) return;
    const [x, y] = this.svgPoint(e);
    this.drag = { i, row, x, y, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.svgPoint(e);
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < 6) return;
    d.moved = true;
    const g = this.querySelector<SVGGElement>(`.pic > svg g.pick[data-i="${d.i}"]`);
    if (g) {
      g.setAttribute('transform', `translate(${x - d.x} ${y - d.y})`);
      g.classList.add('dragging');
    }
    // The shape under the pointer, if another: where this one would go.
    const over = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest('g.pick')).find((el) => el && el !== g) as SVGGElement | null;
    this.querySelectorAll('.pic > svg g.pick.over').forEach((el) => el.classList.remove('over'));
    over?.classList.add('over');
  }
  private onUp(e: PointerEvent, shapes: ReturnType<NonNullable<DiagramSpec['layout']>>['shapes']) {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    e.stopPropagation();
    const form = this.spec.form!;
    const g = this.querySelector<SVGGElement>(`.pic > svg g.pick[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
    const over = this.querySelector<SVGGElement>('.pic > svg g.pick.over');
    over?.classList.remove('over');
    const rows = this.rows();
    const [x, y] = this.svgPoint(e);
    if (over) {
      // Dropped on another thing: under it (a tree), or after it (a list).
      const to = this.rowOf(+over.dataset.i!, shapes);
      const moved = to >= 0 ? placeBlock(rows, form, d.row, to, kindsOf(form).kinds[rows[to].kind].indent ? 'under' : 'after') : null;
      if (moved) this.putRows(moved);
      return;
    }
    const m = this.spec.moves;
    if (m && rows[d.row].kind === m.kind) {
      // Dropped on empty space: a thing that keeps a place moves there.
      const row = rows[d.row];
      const s = shapes[d.i];
      const all = shapes.filter((q) => !isLink(q.k));
      const [x0, y0] = [Math.min(...all.map((q) => q.x)), Math.min(...all.map((q) => q.y))];
      const was = row.values[m.x] === '' ? [(s.x - x0) / m.unit, (s.y - y0) / m.unit] : [+row.values[m.x], +row.values[m.y]];
      const values = row.values.map((v, n) => (n === m.x ? String(Math.max(0, Math.round((was[0] + (x - d.x) / m.unit) * 2) / 2)) : n === m.y ? String(Math.max(0, Math.round((was[1] + (y - d.y) / m.unit) * 2) / 2)) : v));
      this.putRows(rows.map((r, n) => (n === d.row ? { ...r, values } : r)));
    }
  }

  protected drawable() {
    return !!this.spec.layout?.(this.doc).shapes.length;
  }
  protected onPicClick(e: Event) {
    this.sel = -1;
    // Empty space, tapped: something new goes there.
    const t = e.target as Element;
    if (this.form && t.closest('.pic > svg') && !t.closest('g.pick, .diagram-ctl')) {
      const [x, y] = this.svgPoint(e as PointerEvent);
      this.addAt(x, y);
    }
  }
  protected unpick() {
    this.sel = -1;
  }
  protected picture(): TemplateResult {
    const spec = this.spec;
    const d = spec.layout!(this.doc);
    if (!d.shapes.length) return html`<p class="to-empty">${spec.form ? 'Tap here to start: each tap on empty space adds a thing; tap a thing for its buttons, twice to type on it; drag it where it goes.' : 'Write on the left and it is drawn here.'}</p>`;
    return html`<svg viewBox="0 0 ${d.w} ${d.h}" role=${spec.form ? 'group' : 'img'} aria-label=${this.name} style="max-width:${d.w * 1.4}px" @pointermove=${this.onMove} @pointerup=${(e: PointerEvent) => this.onUp(e, d.shapes)} @pointercancel=${() => (this.drag = null)}>
      <defs>${unsafeSVG(arrowDefs())}</defs>
      ${d.shapes.map((s, i) =>
        isLink(s.k) || !spec.form
          ? svg`<g>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`
          : svg`<g class="pick ${this.sel === i ? 'on' : ''}" data-i=${i} role="button" tabindex="0" aria-label="${s.text.replace(/^:[a-z0-9-]+\s*/, '') || 'Shape'}: tap for its buttons, twice to type" aria-pressed=${this.sel === i ? 'true' : 'false'} @pointerdown=${(e: PointerEvent) => this.onDown(e, i, d.shapes)} @dblclick=${(e: Event) => (e.stopPropagation(), this.editOver(e.currentTarget as Element, this.rowOf(i, d.shapes)))} @click=${(e: Event) => (e.stopPropagation(), this.drag?.moved ? null : ((this.sel = this.sel === i ? -1 : i), this.requestUpdate()))} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), (this.sel = this.sel === i ? -1 : i))}>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`,
      )}
      ${this.controls(d)}
    </svg>`;
  }
}
