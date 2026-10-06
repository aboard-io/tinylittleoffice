/** <to-pixel>: a grid of squares to colour. Format and drawing: pixel.def.ts. */
import { DocElement, defineElement, html, state, tool, unsafeSVG, pageSvg, appOf } from '../kit.ts';
import { INKS, parsePixels, pixelsOf, serializePixels } from './pixel.def.ts';

export class PixelElement extends DocElement<string[][]> {
  static app = 'pixel';
  @state() private ink = 'a';
  /** Pencil, line, box, filled box, or fill: what dragging (or tapping) does. */
  @state() private mode: 'pen' | 'line' | 'rect' | 'box' | 'fill' = 'pen';
  /** A line or box being dragged out: where it started and where the pointer is. */
  @state() private drag: { from: number; to: number } | null = null;
  private get size() {
    return pixelsOf((this.constructor as typeof PixelElement).app).size;
  }

  protected parse(text: string) {
    return parsePixels(text, this.size);
  }
  protected serialize(doc: string[][]) {
    return serializePixels(doc);
  }

  private paint(i: number) {
    const [x, y] = [i % this.size, Math.floor(i / this.size)];
    if (this.doc[y]?.[x] === undefined || this.doc[y][x] === this.ink) return;
    this.commit(this.doc.map((row, ry) => (ry === y ? row.map((c, rx) => (rx === x ? this.ink : c)) : row)));
  }

  /** The squares a line or box from a to b covers. */
  private shape(a: number, b: number): Set<number> {
    const n = this.size;
    const [x0, y0, x1, y1] = [a % n, Math.floor(a / n), b % n, Math.floor(b / n)];
    const out = new Set<number>();
    if (this.mode === 'line') {
      // Bresenham: one square per step along the longer side.
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= steps; i++) out.add(Math.round(y0 + ((y1 - y0) * i) / (steps || 1)) * n + Math.round(x0 + ((x1 - x0) * i) / (steps || 1)));
    } else {
      const [l, r, t, m] = [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)];
      for (let y = t; y <= m; y++) for (let x = l; x <= r; x++) if (this.mode === 'box' || x === l || x === r || y === t || y === m) out.add(y * n + x);
    }
    return out;
  }

  /** Fill: every square joined to this one of the same colour becomes the ink. */
  private flood(i: number) {
    const n = this.size;
    const was = this.doc[Math.floor(i / n)][i % n];
    if (was === this.ink) return;
    const grid = this.doc.map((r) => r.slice());
    const stack = [i];
    while (stack.length) {
      const c = stack.pop()!;
      const [x, y] = [c % n, Math.floor(c / n)];
      if (grid[y]?.[x] !== was) continue;
      grid[y][x] = this.ink;
      if (x > 0) stack.push(c - 1);
      if (x < n - 1) stack.push(c + 1);
      if (y > 0) stack.push(c - n);
      if (y < n - 1) stack.push(c + n);
    }
    this.commit(grid);
  }

  private paintAll(cells: Set<number>) {
    const n = this.size;
    this.commit(this.doc.map((row, y) => row.map((c, x) => (cells.has(y * n + x) ? this.ink : c))));
  }

  /** What the pointer does depends on the tool: the pencil paints as it goes; a line or box is dragged out; fill is a tap. */
  private onPointer(e: PointerEvent) {
    const cell = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.dataset.i;
    const i = cell === undefined ? -1 : +cell;
    if (e.type === 'pointerdown' && i >= 0) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (this.mode === 'fill') return this.flood(i);
      if (this.mode === 'pen') return this.paint(i);
      this.drag = { from: i, to: i };
      return;
    }
    if (e.type === 'pointermove') {
      if (this.drag) this.drag = i >= 0 ? { ...this.drag, to: i } : this.drag;
      else if (e.buttons && this.mode === 'pen' && i >= 0) this.paint(i);
      return;
    }
    if ((e.type === 'pointerup' || e.type === 'pointercancel') && this.drag) {
      if (e.type === 'pointerup') this.paintAll(this.shape(this.drag.from, this.drag.to));
      this.drag = null;
    }
  }

  private onKey(e: KeyboardEvent) {
    const i = +((e.target as HTMLElement).dataset.i ?? -1);
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -this.size, ArrowDown: this.size }[e.key];
    if (i < 0 || !step) return;
    e.preventDefault();
    this.querySelector<HTMLElement>(`[data-i="${Math.max(0, Math.min(this.size * this.size - 1, i + step))}"]`)?.focus();
  }

  render() {
    const n = this.size;
    const ghost = this.drag ? this.shape(this.drag.from, this.drag.to) : new Set<number>();
    const def = appOf((this.constructor as typeof PixelElement).app)!;
    const picture = pageSvg(def.view(this.serialize(this.doc))[0], 'aria-hidden="true"');
    return html`
      <div class="to-toolbar">
        <div class="pixel-inks" role="radiogroup" aria-label="Colour">
          ${[...Object.entries(INKS), ['.', { name: 'Eraser', hex: 'transparent' }] as const].map(
            ([k, c]) => html`<button role="radio" aria-checked=${this.ink === k ? 'true' : 'false'} aria-label=${c.name} title=${c.name} class=${k === '.' ? 'none' : ''} style="--c:${c.hex}" @click=${() => (this.ink = k)}></button>`,
          )}
        </div>
        <sl-button-group label="Tool">
          ${([['pen', 'Pencil', 'pen'], ['line', 'Line', 'line'], ['rect', 'Box', 'rect'], ['box', 'Filled box', 'box'], ['fill', 'Fill', 'fill']] as const).map(([id, label, glyph]) => tool(label, glyph, () => (this.mode = id), { pressed: this.mode === id }))}
        </sl-button-group>
        <span class="to-spacer"></span>
        ${tool('Clear', 'trash', () => this.commit(parsePixels('', n)), { text: true })}
      </div>
      <div class="pixel-work">
      <div class="pixel-grid ${this.mode}" role="grid" aria-label="Squares" style="--n:${n}" @pointerdown=${this.onPointer} @pointermove=${this.onPointer} @pointerup=${this.onPointer} @pointercancel=${this.onPointer} @keydown=${this.onKey}>
        ${this.doc.map(
          (row, y) => html`<div role="row">
            ${row.map((c, x) => html`<button role="gridcell" data-i=${y * n + x} tabindex=${x + y ? -1 : 0} aria-label="Row ${y + 1}, column ${x + 1}: ${INKS[c]?.name ?? 'empty'}" style=${ghost.has(y * n + x) ? `background:${INKS[this.ink]?.hex ?? 'transparent'}` : c === '.' ? '' : `background:${INKS[c].hex}`} @click=${() => this.mode === 'fill' ? this.flood(y * n + x) : this.mode === 'pen' ? this.paint(y * n + x) : null} class=${ghost.has(y * n + x) ? 'ghost' : ''}></button>`)}
          </div>`,
        )}
      </div>
      <aside class="pixel-preview" aria-label="At actual size">
        <div class="big">${unsafeSVG(picture)}</div>
        <div class="small">${unsafeSVG(picture)}</div>
        <span class="to-hint">As it will look</span>
      </aside>
      </div>
    `;
  }
}
defineElement('pixel', PixelElement);
