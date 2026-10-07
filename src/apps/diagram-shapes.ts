/**
 * The shapes view: the document laid out as shapes and links, an SVG.
 * Tap a shape for its buttons (add one like it, give it a picture, edit
 * its words, take it away); tap twice to type on it.
 */
import { html, state, unsafeSVG, type TemplateResult } from '../kit.ts';
import { svg } from 'lit';
import { DiagramElement } from './diagram.ts';
import { type DiagramSpec } from '../lib/diagram.ts';
import { fieldsOf, kindsOf, placeBlock, readLines } from '../lib/lines.ts';
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

  /** A tap on a shape: its words open on it, with the small things to do to it underneath. */
  private open(i: number, shapes: ReturnType<NonNullable<DiagramSpec['layout']>>['shapes'], el: Element) {
    const row = this.rowOf(i, shapes);
    if (row < 0) return;
    this.sel = i;
    this.editOver(el, row);
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

  /** A tap on empty space: a new thing there, drawn at once, its words ready to type; gone again if none are. */
  private addAt(px: number, py: number) {
    const form = this.spec.form;
    const kind = this.mainKind;
    if (!form || kind < 0) return;
    const fields = fieldsOf(form, kind);
    const values = fields.map((f) => (f.type === 'choice' ? f.options[0] : ''));
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
    this.startDraft(kind, this.rows().length, kindsOf(form).kinds[kind].at ?? 0, values);
  }

  /** The draft's shape: the one labelled with its kind's name. */
  protected draftElement(): Element | null {
    if (!this.draft) return null;
    const d = this.spec.layout!(this.drawnText());
    const name = kindsOf(this.spec.form!).kinds[this.draft.row.kind].name;
    const i = d.shapes.findIndex((q) => !isLink(q.k) && q.text.split(/\s*[|:]\s*|\n/).some((part) => part.replace(/^:[a-z0-9-]+\s*/, '').trim() === name));
    return i >= 0 ? this.querySelector(`.pic > svg g.pick[data-i="${i}"]`) : null;
  }

  /** A thing like the picked one, beside or under it; a thing joined to it, where things are known by their joins (a network). */
  protected addAfter(i: number) {
    const form = this.spec.form!;
    const rows = this.rows();
    const kind = rows[i].kind;
    const fields = fieldsOf(form, kind);
    // A kind that joins two things ("From > To", "Who .. Who") names them in its first two fields.
    const picks = fields.map((f, n) => (f.type === 'pick' || /^(from|to|one set|other sets)$/i.test(f.name) ? n : -1)).filter((n) => n >= 0);
    if (picks.length >= 2 && this.sel >= 0) {
      // "API > New": the picked thing first, the new one typed into the second place.
      const label = this.spec.layout!(this.doc).shapes[this.sel]?.text.replace(/^:[a-z0-9-]+\s*/, '').split(' | ')[0].trim() ?? '';
      const values = fields.map((f, n) => (n === picks[0] ? label : f.type === 'choice' ? f.options[0] : ''));
      this.startDraft(kind, i + 1, rows[i].depth, values, picks[1]);
      return;
    }
    super.addAfter(i);
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
    const t = e.target as Element;
    const blank = this.form && t.closest('.pic > svg') && !t.closest('g.pick, .diagram-ctl, .pic-edit');
    // Empty space, tapped: let go of what was picked (or being typed); tapped again, something new goes there.
    if (this.sel >= 0 || this.editing || this.draft || this.justClosed) {
      this.sel = -1;
      return;
    }
    if (blank) {
      const [x, y] = this.svgPoint(e as PointerEvent);
      this.addAt(x, y);
    }
  }
  protected unpick() {
    this.sel = -1;
  }
  protected picture(): TemplateResult {
    const spec = this.spec;
    const d = spec.layout!(this.drawnText());
    if (!d.shapes.length) return html`<p class="to-empty">${spec.form ? 'Tap here to start: each tap on empty space adds a thing; tap a thing to type on it, Enter for the next; drag it where it goes.' : 'Write on the left and it is drawn here.'}</p>`;
    return html`<svg viewBox="0 0 ${d.w} ${d.h}" role=${spec.form ? 'group' : 'img'} aria-label=${this.name} style="max-width:${d.w * 1.4}px" @pointermove=${this.onMove} @pointerup=${(e: PointerEvent) => this.onUp(e, d.shapes)} @pointercancel=${() => (this.drag = null)}>
      <defs>${unsafeSVG(arrowDefs())}</defs>
      ${d.shapes.map((s, i) =>
        isLink(s.k) || !spec.form
          ? svg`<g>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`
          : svg`<g class="pick ${this.sel === i ? 'on' : ''}" data-i=${i} role="button" tabindex="0" aria-label="${s.text.replace(/^:[a-z0-9-]+\s*/, '') || 'Shape'}: tap to type on it; drag it where it goes" @pointerdown=${(e: PointerEvent) => this.onDown(e, i, d.shapes)} @click=${(e: Event) => (e.stopPropagation(), this.drag?.moved ? null : this.open(i, d.shapes, e.currentTarget as Element))} @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), this.open(i, d.shapes, e.currentTarget as Element))}>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`,
      )}
    </svg>`;
  }
}
