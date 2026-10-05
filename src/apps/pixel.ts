/** <to-pixel>: a grid of squares to colour. Format and drawing: pixel.def.ts. */
import { DocElement, defineElement, html, state, tool } from '../kit.ts';
import { INKS, parsePixels, pixelsOf, serializePixels } from './pixel.def.ts';

export class PixelElement extends DocElement<string[][]> {
  static app = 'pixel';
  @state() private ink = 'a';
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

  /** Paint whatever square is under the pointer: pressing, or dragging across. */
  private onPointer(e: PointerEvent) {
    if (e.type === 'pointermove' && !e.buttons) return;
    const cell = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.dataset.i;
    if (cell !== undefined) this.paint(+cell);
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
    return html`
      <div class="to-toolbar">
        <div class="pixel-inks" role="radiogroup" aria-label="Colour">
          ${[...Object.entries(INKS), ['.', { name: 'Eraser', hex: 'transparent' }] as const].map(
            ([k, c]) => html`<button role="radio" aria-checked=${this.ink === k ? 'true' : 'false'} aria-label=${c.name} title=${c.name} class=${k === '.' ? 'none' : ''} style="--c:${c.hex}" @click=${() => (this.ink = k)}></button>`,
          )}
        </div>
        <span class="to-spacer"></span>
        ${tool('Clear', 'trash', () => this.commit(parsePixels('', n)), { text: true })}
      </div>
      <div class="pixel-grid" role="grid" aria-label="Squares" style="--n:${n}" @pointerdown=${this.onPointer} @pointermove=${this.onPointer} @keydown=${this.onKey}>
        ${this.doc.map(
          (row, y) => html`<div role="row">
            ${row.map((c, x) => html`<button role="gridcell" data-i=${y * n + x} tabindex=${x + y ? -1 : 0} aria-label="Row ${y + 1}, column ${x + 1}: ${INKS[c]?.name ?? 'empty'}" style=${c === '.' ? '' : `background:${INKS[c].hex}`} @click=${() => this.paint(y * n + x)}></button>`)}
          </div>`,
        )}
      </div>
    `;
  }
}
defineElement('pixel', PixelElement);
