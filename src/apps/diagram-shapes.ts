/**
 * The shapes view: the document laid out as shapes and links, an SVG, and
 * the editor itself. Tap empty space to add a thing; tap a thing for its
 * words and its buttons (add one like it, join it to another, give it a
 * picture, take it away); drag it where it goes: onto another thing to put
 * it under or after it, into a lane or a set to move it there. A line
 * between two things is tapped for its words.
 */
import { html, state, unsafeSVG, type TemplateResult } from '../kit.ts';
import { svg } from '../kit.ts';
import { DiagramElement, clean } from './diagram.ts';
import { fieldsOf, kindsOf, listItems, moveItem, placeBlock, readLines, type Row } from '../lib/lines.ts';
import { isLink, type Shape } from '../lib/drawmodel.ts';
import { arrowDefs, shapeSvg } from './draw.def.ts';

/** What a shape was drawn from: a row's field, or one thing of its list. */
interface Hit {
  row: number;
  field: number;
  item?: number;
}

export class ShapesView extends DiagramElement {
  /** The shape picked in the picture, whose words are open. */
  @state() protected sel = -1;

  /** The hits of this render: what each shape came from, or null for one with no words of its own (a lane's band, a line between steps). */
  private hit: (Hit | null)[] = [];

  /**
   * What each shape was drawn from. A thing is the row written as its
   * label, or the row and field whose words are its first line (one thing
   * of a list, for a person at a table). A line is the row that names both
   * its ends.
   */
  private hits(shapes: Shape[], rows: Row[]): (Hit | null)[] {
    const form = this.spec.form;
    if (!form) return shapes.map(() => null);
    const { made } = kindsOf(form);
    const head = (s: Shape | undefined) => (s ? clean(s.text.split(' | ')[0]) : '');
    const thing = (s: Shape): Hit | null => {
      const label = s.text.trim();
      const h = head(s);
      const exact = rows.findIndex((r) => r.kind < form.length && made[r.kind].write(r.values).trim() === label);
      if (exact >= 0) return { row: exact, field: this.wordsField(rows[exact].kind) };
      if (!h) return null;
      for (const [n, r] of rows.entries()) {
        if (r.kind >= form.length) continue;
        const fields = fieldsOf(form, r.kind);
        for (const [m, v] of r.values.entries()) {
          if (fields[m].type === 'icon' || fields[m].type === 'choice') continue;
          if (fields[m].type === 'list') {
            const k = listItems(v).findIndex((x) => clean(x) === h);
            if (k >= 0) return { row: n, field: m, item: k };
          } else if (clean(v) === h) return { row: n, field: m };
        }
      }
      return null;
    };
    const line = (s: Shape): Hit | null => {
      const [a, b] = [head(shapes[s.x]), head(shapes[s.y])];
      if (!a || !b) return null;
      for (const [n, r] of rows.entries()) {
        if (r.kind >= form.length) continue;
        const refs = this.refFields(r.kind);
        if (refs.length < 2) continue;
        const [x, y] = [clean(r.values[refs[0]]), clean(r.values[refs[1]])];
        if ((x === a && y === b) || (x === b && y === a)) {
          const label = fieldsOf(form, r.kind).findIndex((f, m) => !refs.includes(m) && f.type !== 'icon' && f.type !== 'choice');
          return label >= 0 ? { row: n, field: label } : null;
        }
      }
      return null;
    };
    return shapes.map((s) => (isLink(s.k) ? line(s) : thing(s)));
  }

  /** A tap on a shape: its words open on it, with the small things to do to it underneath; or, while joining, it is the line's other end. */
  private open(i: number, shapes: Shape[], el: Element) {
    const h = this.hit[i];
    if (!h) return;
    if (this.joining) return this.joinTo(shapes[i].text.split(' | ')[0]);
    this.sel = i;
    this.editOver(el, h.row, h.field, h.item);
  }

  /* ---------- adding and moving on the picture itself ---------- */

  /** The kind a tap on empty space adds: the first that is a thing with words of its own (not a title, a divider or a line between things). */
  private get mainKind(): number {
    const form = this.spec.form;
    if (!form) return -1;
    const { kinds } = kindsOf(form);
    return kinds.findIndex((k, n) => n < form.length && !k.once && k.is !== '' && !k.is.startsWith('#') && !k.head && !this.refFields(n).length && fieldsOf(form, n).some((f) => f.type !== 'icon' && f.type !== 'choice'));
  }

  /**
   * A tap on empty space: a new thing there, drawn at once, its words ready
   * to type; gone again if none are. In a lane or a set, it goes to that.
   */
  private addAt(px: number, py: number) {
    const form = this.spec.form;
    const kind = this.mainKind;
    if (!form || kind < 0) return;
    const key = this.spec.keyAt?.(this.textOf(this.doc), px, py);
    if (key) return this.addTo(key);
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
    // A keyed thing (a table, an event) is named first; the rest is a Tab away.
    const key0 = this.keyField(kind);
    this.startDraft(kind, this.rows().length, kindsOf(form).kinds[kind].at ?? 0, values, key0 >= 0 ? key0 : this.wordsField(kind));
  }

  /** The draft's shape: the one showing its field's name. */
  protected draftElement(): Element | null {
    if (!this.draft) return null;
    const d = this.spec.layout!(this.drawnText());
    const words = this.draftWords();
    const i = d.shapes.findIndex((q) => !isLink(q.k) && q.text.split(/\s*[|:]\s*|\n/).some((part) => part.replace(/^:[a-z0-9-]+\s*/, '').trim() === words));
    return i >= 0 ? this.querySelector(`.pic > svg g.pick[data-i="${i}"]`) : null;
  }

  /** A thing like the picked one, beside or under it; a thing joined to it, where things are known by their joins (a network). */
  protected addAfter(i: number, field = -1) {
    const form = this.spec.form!;
    const rows = this.rows();
    const kind = rows[i].kind;
    const link = this.linkKind();
    const refs = this.refFields(kind);
    const { kinds } = kindsOf(form);
    if (link >= 0 && this.listField(kind) < 0 && !kinds[kind].indent) {
      // "API > New": the thing first, the new one typed into the line's far end.
      const from = refs.length >= 2 ? (refs.includes(field) ? field : -1) : this.wordsField(kind);
      const name = from >= 0 ? rows[i].values[from].replace(/^:[a-z0-9-]+\s*/, '').trim() : '';
      if (name) {
        const fields = fieldsOf(form, link);
        const ends = this.refFields(link);
        const values = fields.map((f, n) => (n === ends[0] ? name : f.type === 'choice' ? f.options[0] : ''));
        this.startDraft(link, i + 1, rows[i].depth, values, ends[1]);
        return;
      }
    }
    super.addAfter(i, field);
  }

  /** A drag: where the pointer went down, and the shape under it. */
  private drag: { i: number; hit: Hit; x: number; y: number; moved: boolean } | null = null;
  /** When a drag last ended: the click that follows it is not a tap. */
  private droppedAt = -Infinity;
  private svgPoint(e: PointerEvent): [number, number] {
    const svg = this.querySelector<SVGSVGElement>('.pic > svg');
    if (!svg) return [0, 0];
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM()!.inverse());
    return [q.x, q.y];
  }
  private onDown(e: PointerEvent, i: number) {
    const hit = this.hit[i];
    if (e.button !== 0 || !this.spec.form || !hit || this.draft) return;
    const [x, y] = this.svgPoint(e);
    this.drag = { i, hit, x, y, moved: false };
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
    const over = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest('g.pick:not(.line)')).find((el) => el && el !== g) as SVGGElement | null;
    this.querySelectorAll('.pic > svg g.pick.over').forEach((el) => el.classList.remove('over'));
    over?.classList.add('over');
  }
  private onUp(e: PointerEvent, shapes: Shape[]) {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    e.stopPropagation();
    this.droppedAt = performance.now();
    const form = this.spec.form!;
    const g = this.querySelector<SVGGElement>(`.pic > svg g.pick[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
    const over = this.querySelector<SVGGElement>('.pic > svg g.pick.over');
    over?.classList.remove('over');
    const rows = this.rows();
    const [x, y] = this.svgPoint(e);
    if (over) {
      // Dropped on another thing: into its list, after it (a person to another table); or under it (a tree), or after it (a list).
      const to = this.hit[+over.dataset.i!];
      if (!to) return;
      if (d.hit.item !== undefined) {
        const list = this.listField(rows[to.row].kind);
        if (list >= 0) this.putRows(moveItem(rows, d.hit.row, d.hit.field, d.hit.item, to.row, list, to.item !== undefined && to.field === list ? to.item + 1 : Infinity));
      } else if (d.hit.row !== to.row) {
        const moved = placeBlock(rows, form, d.hit.row, to.row, kindsOf(form).kinds[rows[to.row].kind].indent ? 'under' : 'after');
        if (moved) this.putRows(moved);
      }
      return;
    }
    const key = this.spec.keyAt?.(this.textOf(this.doc), x, y);
    if (key) {
      // Dropped into a lane or a set: it goes there.
      if (d.hit.item !== undefined) return this.moveInto(d.hit.row, d.hit.field, d.hit.item, key);
      const row = rows[d.hit.row];
      const kf = this.keyField(row.kind);
      if (kf < 0 || this.listField(row.kind) >= 0 || clean(this.keyOf(row)) === clean(key)) return;
      const read = this.keyRow(key);
      if (read && read.kind === row.kind) this.putRows(rows.map((r, n) => (n === d.hit.row ? { ...r, values: r.values.map((v, m) => (m === kf ? read.values[kf] : v)) } : r)));
      return;
    }
    const m = this.spec.moves;
    if (m && rows[d.hit.row].kind === m.kind) {
      // Dropped on empty space: a thing that keeps a place moves there.
      const row = rows[d.hit.row];
      const s = shapes[d.i];
      const all = shapes.filter((q) => !isLink(q.k));
      const [x0, y0] = [Math.min(...all.map((q) => q.x)), Math.min(...all.map((q) => q.y))];
      const was = row.values[m.x] === '' ? [(s.x - x0) / m.unit, (s.y - y0) / m.unit] : [+row.values[m.x], +row.values[m.y]];
      const values = row.values.map((v, n) => (n === m.x ? String(Math.max(0, Math.round((was[0] + (x - d.x) / m.unit) * 2) / 2)) : n === m.y ? String(Math.max(0, Math.round((was[1] + (y - d.y) / m.unit) * 2) / 2)) : v));
      this.putRows(rows.map((r, n) => (n === d.hit.row ? { ...r, values } : r)));
    }
  }

  /** A picture of shapes is worked on the picture itself: no list beside it. */
  protected get lists() {
    return false;
  }
  protected drawable() {
    return !!this.spec.layout?.(this.doc).shapes.length;
  }
  protected onPicClick(e: Event) {
    const t = e.target as Element;
    if (!this.form || t.closest('.pic-edit, .diagram-aside')) return;
    // Half a join, and a tap on nothing: no join.
    if (this.joining) return void (this.joining = null);
    // Empty space, tapped: let go of what was picked (or being typed); tapped again, something new goes there.
    if (this.sel >= 0 || this.editing || this.draft || this.justClosed || performance.now() - this.droppedAt < 400) {
      this.sel = -1;
      return;
    }
    if (t.closest('g.pick')) return;
    const [x, y] = this.svgPoint(e as PointerEvent);
    this.addAt(x, y);
  }
  protected unpick() {
    this.sel = -1;
  }
  protected picture(): TemplateResult {
    const spec = this.spec;
    const d = spec.layout!(this.drawnText());
    if (!d.shapes.length) return html`<p class="to-empty">${spec.form ? 'Tap here to start: each tap on empty space adds a thing; tap a thing to type on it, Enter for the next; drag it where it goes.' : 'Write on the left and it is drawn here.'}</p>`;
    // (The draft is drawn with its field's name for words, so the rows are read from what is drawn.)
    this.hit = spec.form ? this.hits(d.shapes, readLines(this.drawnText(), spec.form)) : d.shapes.map(() => null);
    const hits = this.hit;
    const words = (s: Shape) => s.text.replace(/^:[a-z0-9-]+\s*/, '');
    const tapped = (e: Event, i: number) => {
      e.stopPropagation();
      if (this.drag?.moved || performance.now() - this.droppedAt < 400) return;
      this.open(i, d.shapes, e.currentTarget as Element);
    };
    const keyed = (e: KeyboardEvent, i: number) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), this.open(i, d.shapes, e.currentTarget as Element));
    return html`<svg viewBox="0 0 ${d.w} ${d.h}" role=${spec.form ? 'group' : 'img'} aria-label=${this.name} style="--w:${d.w}px" @pointermove=${this.onMove} @pointerup=${(e: PointerEvent) => this.onUp(e, d.shapes)} @pointercancel=${() => (this.drag = null)}>
      <defs>${unsafeSVG(arrowDefs())}</defs>
      ${d.shapes.map((s, i) =>
        !hits[i]
          ? svg`<g>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`
          : isLink(s.k)
            ? svg`<g class="pick line ${this.sel === i ? 'on' : ''}" data-i=${i} role="button" tabindex="0" aria-label="Line from ${words(d.shapes[s.x])} to ${words(d.shapes[s.y])}${s.text ? `, ${s.text}` : ''}: tap for its words" @click=${(e: Event) => tapped(e, i)} @keydown=${(e: KeyboardEvent) => keyed(e, i)}>${unsafeSVG(shapeSvg(s, d.shapes, undefined, true))}</g>`
            : svg`<g class="pick ${this.sel === i ? 'on' : ''}" data-i=${i} role="button" tabindex="0" aria-label="${words(s) || 'Shape'}: tap to type on it; drag it where it goes" @pointerdown=${(e: PointerEvent) => this.onDown(e, i)} @click=${(e: Event) => tapped(e, i)} @keydown=${(e: KeyboardEvent) => keyed(e, i)}>${unsafeSVG(shapeSvg(s, d.shapes))}</g>`,
      )}
    </svg>`;
  }
}
