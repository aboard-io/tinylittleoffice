/**
 * <to-draw>: a little diagram tool. Rectangles, ellipses, diamonds, lines,
 * arrows and free text, each with an optional label, on a 640x400 canvas.
 *
 * Document format: one shape per line:  kind,x,y,w,h,fill,label
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use
 * x,y as the start and w,h as the delta to the end.
 */
import { LitElement, html, css, svg, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { retro } from '../lib/styles.ts';
import { icon, UI } from '../lib/icons.ts';
import { W, H, GRID, parseDrawing, serializeDrawing, type Kind, type Fill, type Shape } from '../lib/drawmodel.ts';


const snap = (n: number) => Math.round(n / GRID) * GRID;

type Tool = 'select' | Kind;
type Drag =
  | { mode: 'draw'; start: [number, number]; shape: Shape }
  | { mode: 'move'; idx: number; off: [number, number]; orig: Shape }
  | { mode: 'resize'; idx: number; orig: Shape };

const TOOLS: { id: Tool; label: string; icon: keyof typeof UI; key: string }[] = [
  { id: 'select', label: 'Select', icon: 'select', key: 'V' },
  { id: 'r', label: 'Rectangle', icon: 'rect', key: 'R' },
  { id: 'e', label: 'Ellipse', icon: 'ellipse', key: 'E' },
  { id: 'd', label: 'Diamond', icon: 'diamond', key: 'D' },
  { id: 'l', label: 'Line', icon: 'line', key: 'L' },
  { id: 'a', label: 'Arrow', icon: 'arrow', key: 'A' },
  { id: 't', label: 'Text', icon: 'text', key: 'T' },
];

@customElement('to-draw')
export class ToDraw extends LitElement {
  static styles = [
    retro,
    css`
      .wrap {
        padding: 10px;
        background: var(--paper-dim);
      }
      svg.canvas {
        display: block;
        width: 100%;
        height: auto;
        background: var(--paper);
        border: 1px solid var(--ink);
        touch-action: none;
        user-select: none;
      }
      svg.canvas.tool {
        cursor: crosshair;
      }
      .shape {
        cursor: move;
      }
      .handle {
        cursor: nwse-resize;
      }
      .label input {
        width: 180px;
      }
      select {
        min-height: 24px;
      }
      text {
        font: 13px var(--font);
        pointer-events: none;
      }
      .foot {
        padding: 4px 8px;
        border-top: 1px solid var(--ink);
      }
    `,
  ];

  @property() value = '';
  @state() private shapes: Shape[] = [];
  @state() private tool: Tool = 'select';
  @state() private sel = -1;
  @state() private drag: Drag | null = null;
  private lastEmitted = '';
  private svgEl?: SVGSVGElement;

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.shapes = parseDrawing(this.value);
      this.lastEmitted = this.value;
      this.sel = -1;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
  }

  private commit(shapes: Shape[]) {
    this.shapes = shapes;
    this.lastEmitted = serializeDrawing(shapes);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private patchSel(p: Partial<Shape>) {
    if (this.sel < 0) return;
    this.commit(this.shapes.map((s, i) => (i === this.sel ? { ...s, ...p } : s)));
  }

  private point(e: PointerEvent): [number, number] {
    const r = this.svgEl!.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  }

  private onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    this.svgEl = e.currentTarget as SVGSVGElement;
    const [x, y] = this.point(e);
    const target = e.target as Element;
    const idxAttr = target.closest('[data-idx]')?.getAttribute('data-idx');
    this.svgEl.setPointerCapture(e.pointerId);
    this.renderRoot.querySelector<HTMLElement>('.wrap')?.focus();

    if (this.tool === 'select') {
      if (target.classList.contains('handle') && this.sel >= 0) {
        this.drag = { mode: 'resize', idx: this.sel, orig: this.shapes[this.sel] };
      } else if (idxAttr !== undefined && idxAttr !== null) {
        const idx = parseInt(idxAttr, 10);
        this.sel = idx;
        const s = this.shapes[idx];
        this.drag = { mode: 'move', idx, off: [x - s.x, y - s.y], orig: s };
      } else {
        this.sel = -1;
      }
      return;
    }
    const shape: Shape = { k: this.tool, x: snap(x), y: snap(y), w: 0, h: 0, f: 0, text: this.tool === 't' ? 'Text' : '' };
    this.drag = { mode: 'draw', start: [snap(x), snap(y)], shape };
  }

  private onMove(e: PointerEvent) {
    if (!this.drag) return;
    const [x, y] = this.point(e);
    const d = this.drag;
    if (d.mode === 'draw') {
      const s = d.shape;
      const [sx, sy] = d.start;
      let w = snap(x) - sx;
      let h = snap(y) - sy;
      if (s.k === 'l' || s.k === 'a') {
        if (e.shiftKey) Math.abs(w) > Math.abs(h) ? (h = 0) : (w = 0);
        this.drag = { ...d, shape: { ...s, w, h } };
      } else {
        this.drag = { ...d, shape: { ...s, x: Math.min(sx, sx + w), y: Math.min(sy, sy + h), w: Math.abs(w), h: Math.abs(h) } };
      }
    } else if (d.mode === 'move') {
      const nx = snap(x - d.off[0]);
      const ny = snap(y - d.off[1]);
      this.shapes = this.shapes.map((s, i) => (i === d.idx ? { ...s, x: nx, y: ny } : s));
    } else if (d.mode === 'resize') {
      const s = d.orig;
      let w = snap(x) - s.x;
      let h = snap(y) - s.y;
      if (s.k !== 'l' && s.k !== 'a') {
        w = Math.max(GRID, w);
        h = Math.max(GRID, h);
      }
      this.shapes = this.shapes.map((sh, i) => (i === d.idx ? { ...sh, w, h } : sh));
    }
  }

  private onUp() {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.mode === 'draw') {
      let s = d.shape;
      const tiny = Math.abs(s.w) < GRID && Math.abs(s.h) < GRID;
      if (tiny) {
        // A click without a drag drops a default-sized shape.
        s = s.k === 'l' || s.k === 'a' ? { ...s, w: 96, h: 0 } : s.k === 't' ? { ...s, w: 96, h: 24 } : { ...s, w: 96, h: 48 };
      }
      if (s.k !== 'l' && s.k !== 'a') s = { ...s, x: Math.min(s.x, W - s.w), y: Math.min(s.y, H - s.h) };
      this.commit([...this.shapes, s]);
      this.sel = this.shapes.length - 1;
      this.tool = 'select';
      if (s.k === 't') this.updateComplete.then(() => this.renderRoot.querySelector<HTMLInputElement>('.label input')?.select());
    } else {
      this.commit(this.shapes);
    }
  }

  private onKey = (e: KeyboardEvent) => {
    const t = e.composedPath()[0] as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') (t as HTMLInputElement).blur();
      return;
    }
    const tool = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
    if (tool && !e.ctrlKey && !e.metaKey) {
      this.tool = tool.id;
      return;
    }
    if (this.sel < 0) return;
    const s = this.shapes[this.sel];
    if (e.key === 'Delete' || e.key === 'Backspace') this.removeSel();
    else if (e.key === 'ArrowLeft') this.patchSel({ x: s.x - GRID });
    else if (e.key === 'ArrowRight') this.patchSel({ x: s.x + GRID });
    else if (e.key === 'ArrowUp') this.patchSel({ y: s.y - GRID });
    else if (e.key === 'ArrowDown') this.patchSel({ y: s.y + GRID });
    else if (e.key === 'Escape') this.sel = -1;
    else if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) this.duplicate();
    else return;
    e.preventDefault();
  };

  private removeSel() {
    if (this.sel < 0) return;
    this.commit(this.shapes.filter((_, i) => i !== this.sel));
    this.sel = -1;
  }

  private duplicate() {
    if (this.sel < 0) return;
    const s = this.shapes[this.sel];
    this.commit([...this.shapes, { ...s, x: s.x + GRID * 2, y: s.y + GRID * 2 }]);
    this.sel = this.shapes.length - 1;
  }

  private reorder(toFront: boolean) {
    if (this.sel < 0) return;
    const s = this.shapes[this.sel];
    const rest = this.shapes.filter((_, i) => i !== this.sel);
    this.commit(toFront ? [...rest, s] : [s, ...rest]);
    this.sel = toFront ? rest.length : 0;
  }

  private renderShape(s: Shape, i: number, ghost = false) {
    const fill = s.f === 2 ? 'var(--ink)' : s.f === 1 ? '#ccc' : 'var(--paper)';
    const stroke = 'var(--ink)';
    const common = { 'data-idx': i, class: 'shape' };
    let body;
    switch (s.k) {
      case 'r':
        body = svg`<rect x=${s.x} y=${s.y} width=${s.w} height=${s.h} fill=${fill} stroke=${stroke} stroke-width="2" rx="2" />`;
        break;
      case 'e':
        body = svg`<ellipse cx=${s.x + s.w / 2} cy=${s.y + s.h / 2} rx=${s.w / 2} ry=${s.h / 2} fill=${fill} stroke=${stroke} stroke-width="2" />`;
        break;
      case 'd':
        body = svg`<polygon points="${s.x + s.w / 2},${s.y} ${s.x + s.w},${s.y + s.h / 2} ${s.x + s.w / 2},${s.y + s.h} ${s.x},${s.y + s.h / 2}" fill=${fill} stroke=${stroke} stroke-width="2" stroke-linejoin="round" />`;
        break;
      case 'l':
      case 'a':
        body = svg`<line x1=${s.x} y1=${s.y} x2=${s.x + s.w} y2=${s.y + s.h} stroke="transparent" stroke-width="12" />
          <line x1=${s.x} y1=${s.y} x2=${s.x + s.w} y2=${s.y + s.h} stroke=${stroke} stroke-width="2" marker-end=${s.k === 'a' ? 'url(#arrow)' : nothing} stroke-dasharray=${s.f === 1 ? '6 4' : s.f === 2 ? '2 3' : nothing} />`;
        break;
      case 't':
        body = svg`<rect x=${s.x} y=${s.y} width=${s.w} height=${s.h} fill="transparent" stroke=${ghost || i === this.sel ? '#999' : 'none'} stroke-dasharray="3 2" />`;
        break;
    }
    const isLine = s.k === 'l' || s.k === 'a';
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const textFill = s.f === 2 && !isLine && s.k !== 't' ? 'var(--paper)' : 'var(--ink)';
    const halo = isLine ? 'paint-order: stroke; stroke: var(--paper); stroke-width: 4px;' : '';
    const label = s.text
      ? svg`<text x=${cx} y=${cy} text-anchor=${s.k === 't' ? 'start' : 'middle'} dominant-baseline="middle" fill=${textFill} style=${halo}>${s.k === 't' ? svg`<tspan x=${s.x + 4}>${s.text}</tspan>` : s.text}</text>`
      : nothing;
    return svg`<g data-idx=${common['data-idx']} class=${ghost ? '' : common.class} opacity=${ghost ? 0.6 : 1}>${body}${label}</g>`;
  }

  private renderSelection(s: Shape) {
    const isLine = s.k === 'l' || s.k === 'a';
    const x = isLine ? Math.min(s.x, s.x + s.w) : s.x;
    const y = isLine ? Math.min(s.y, s.y + s.h) : s.y;
    const w = Math.abs(s.w);
    const h = Math.abs(s.h);
    const hx = s.x + s.w;
    const hy = s.y + s.h;
    return svg`<rect x=${x - 3} y=${y - 3} width=${w + 6} height=${h + 6} fill="none" stroke="var(--accent)" stroke-dasharray="4 3" pointer-events="none" />
      <rect class="handle" x=${hx - 5} y=${hy - 5} width="10" height="10" fill="var(--paper)" stroke="var(--accent)" stroke-width="2" />`;
  }

  render() {
    const s = this.sel >= 0 ? this.shapes[this.sel] : null;
    const isLine = s?.k === 'l' || s?.k === 'a';
    return html`
      <div class="toolbar" role="toolbar" aria-label="Tools">
        ${TOOLS.map(
          (t) => html`<button class="icon" title="${t.label} (${t.key})" aria-label=${t.label} aria-pressed=${this.tool === t.id ? 'true' : 'false'} @click=${() => (this.tool = t.id)}>
            ${icon(UI[t.icon], 14)}
          </button>`,
        )}
        <span class="sep"></span>
        <label class="label">
          <input
            placeholder=${s ? 'Label' : 'Select a shape to label it'}
            aria-label="Label"
            ?disabled=${!s}
            .value=${s?.text ?? ''}
            @input=${(e: Event) => this.patchSel({ text: (e.target as HTMLInputElement).value })}
            @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        ${s && s.k !== 't'
          ? html`<select aria-label=${isLine ? 'Line style' : 'Fill'} .value=${String(s.f)} @change=${(e: Event) => this.patchSel({ f: parseInt((e.target as HTMLSelectElement).value, 10) as Fill })}>
              <option value="0">${isLine ? 'Solid' : 'No fill'}</option>
              <option value="1">${isLine ? 'Dashed' : 'Grey'}</option>
              <option value="2">${isLine ? 'Dotted' : 'Black'}</option>
            </select>`
          : nothing}
        <button class="icon" ?disabled=${!s} title="Bring to front" aria-label="Bring to front" @click=${() => this.reorder(true)}>${icon(UI.front, 14)}</button>
        <button class="icon" ?disabled=${!s} title="Send to back" aria-label="Send to back" @click=${() => this.reorder(false)}>${icon(UI.back, 14)}</button>
        <button class="icon" ?disabled=${!s} title="Duplicate (Ctrl+D)" aria-label="Duplicate" @click=${this.duplicate}>${icon(UI.copy, 14)}</button>
        <button class="icon" ?disabled=${!s} title="Delete (Del)" aria-label="Delete" @click=${this.removeSel}>${icon(UI.trash, 14)}</button>
      </div>
      <div class="wrap" tabindex="0">
        <svg
          class="canvas ${this.tool === 'select' ? '' : 'tool'}"
          viewBox="0 0 ${W} ${H}"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Drawing canvas"
          @pointerdown=${this.onDown}
          @pointermove=${this.onMove}
          @pointerup=${this.onUp}
          @pointercancel=${this.onUp}
          @dblclick=${() => this.sel >= 0 && this.renderRoot.querySelector<HTMLInputElement>('.label input')?.select()}
        >
          <defs>
            <pattern id="grid" width=${GRID * 2} height=${GRID * 2} patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="#bbb" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
            </marker>
          </defs>
          <rect width=${W} height=${H} fill="url(#grid)" />
          ${this.shapes.map((sh, i) => this.renderShape(sh, i))}
          ${this.drag?.mode === 'draw' ? this.renderShape(this.drag.shape, -1, true) : nothing}
          ${s ? this.renderSelection(s) : nothing}
        </svg>
      </div>
      <div class="foot hint">
        Pick a tool and drag on the canvas, or click to drop a default-sized shape. Drag the corner to resize, hold Shift for straight lines.
        Shapes snap to an 8px grid so they stay tiny in the URL.
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-draw': ToDraw;
  }
}
