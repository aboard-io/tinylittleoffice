/**
 * <to-draw>: a little diagram tool. Rectangles, ellipses, diamonds, lines,
 * arrows and free text, each with an optional label, on a 640x400 canvas.
 *
 * Document format: one shape per line:  kind,x,y,w,h,fill,label
 * Coordinates are in 8px grid units so they stay short. Lines and arrows use
 * x,y as the start and w,h as the delta to the end.
 */
import { DocElement, defineElement, html, svg, nothing, state, unsafeSVG, tool, stepper, swatches, icon, clamp, isKey, makeRef, UI, type SlInput, type SlSelect } from '../kit.ts';
import { W, H, GRID, COLORS, TEXT_SIZES, iconOf, isLine, isLink, linkEnds, parseDrawing, removeShape, restack, serializeDrawing, type Color, type Kind, type Fill, type Shape, type TextSize } from '../lib/drawmodel.ts';
import { arrowDefs, shapeSvg, type Theme } from './draw.def.ts';
import { chooseIcon } from '../widgets/icon-picker.ts';

/** The swatches: black (no colour letter) first, then the palette. */
const INKS: Record<string, { name: string; hex: string }> = { '': { name: 'Black', hex: 'var(--to-ink)' }, ...COLORS };

const snap = (n: number) => Math.round(n / GRID) * GRID;

type Tool = 'select' | Kind;
/** The page's own colours, so a drawing looks right in the dark too. */
const THEME: Theme = { ink: 'var(--to-ink)', paper: 'var(--to-surface)', shade: 'var(--to-surface-2)' };

type Drag =
  | { mode: 'link'; from: number; to: [number, number] }
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
  { id: 'k', label: 'Join two shapes', icon: 'join', key: 'K' },
  { id: 'v', label: 'Pen: any shape, corner by corner', icon: 'pen', key: 'P' },
];

/** More shapes, behind one button. */
const MORE: { id: Kind; label: string }[] = [
  { id: 'o', label: 'Rounded box' },
  { id: 'h', label: 'Hexagon' },
  { id: 'p', label: 'Parallelogram' },
  { id: 'c', label: 'Cylinder' },
  { id: 'n', label: 'Note' },
];

export class ToDraw extends DocElement<Shape[]> {
  @state() private tool: Tool = 'select';
  @state() private sel = -1;
  /** The pen's corners so far, in px; the shape is made when the pen is closed (Enter, a double tap, or the first corner again). */
  @state() private pen: [number, number][] = [];
  @state() private drag: Drag | null = null;
  /** How large the canvas is shown: 1 fits the page's width. */
  @state() private zoom = 1;
  /** The icon the next click will place, when the icon tool is armed. */
  private stamp = '';
  private svgEl?: SVGSVGElement;

  protected parse = parseDrawing;
  protected serialize = serializeDrawing;

  protected loaded() {
    this.sel = -1;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
  }

  private patchSel(p: Partial<Shape>) {
    if (this.sel < 0) return;
    this.commit(this.doc.map((s, i) => (i === this.sel ? { ...s, ...p } : s)));
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
    // (Without scrolling: the page must not jump under a drag that has just begun.)
    this.querySelector<HTMLElement>('.draw-wrap')?.focus({ preventScroll: true });

    if (this.tool === 'v') {
      // The pen: a corner a tap; tapping the first corner again closes it.
      const first = this.pen[0];
      if (first && this.pen.length > 2 && Math.hypot(first[0] - x, first[1] - y) < 10) return this.closePen();
      this.pen = [...this.pen, [snap(x), snap(y)]];
      return;
    }
    if (this.tool === 'k') {
      // Joining: press on one shape, let go on another.
      const from = idxAttr ? parseInt(idxAttr, 10) : -1;
      if (from >= 0 && !isLink(this.doc[from].k)) this.drag = { mode: 'link', from, to: [x, y] };
      return;
    }
    if (this.tool === 'select') {
      if (target.classList.contains('handle') && this.sel >= 0) {
        this.drag = { mode: 'resize', idx: this.sel, orig: this.doc[this.sel] };
      } else if (idxAttr !== undefined && idxAttr !== null) {
        const idx = parseInt(idxAttr, 10);
        this.sel = idx;
        const s = this.doc[idx];
        // (A join has no place of its own to move to: it goes where its shapes go.)
        if (!isLink(s.k)) this.drag = { mode: 'move', idx, off: [x - s.x, y - s.y], orig: s };
      } else {
        this.sel = -1;
      }
      return;
    }
    const shape: Shape = { k: this.tool, x: snap(x), y: snap(y), w: 0, h: 0, f: 0, text: this.tool === 't' ? 'Text' : this.tool === 'i' ? this.stamp : '' };
    this.drag = { mode: 'draw', start: [snap(x), snap(y)], shape };
  }

  private onMove(e: PointerEvent) {
    if (!this.drag) return;
    const [x, y] = this.point(e);
    const d = this.drag;
    if (d.mode === 'link') {
      this.drag = { ...d, to: [x, y] };
    } else if (d.mode === 'draw') {
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
      // Moved on screen as the pointer goes; the document is written when it lifts.
      this.doc = this.doc.map((s, i) => (i === d.idx ? { ...s, x: nx, y: ny } : s));
      this.requestUpdate();
    } else if (d.mode === 'resize') {
      const s = d.orig;
      let w = snap(x) - s.x;
      let h = snap(y) - s.y;
      if (s.k !== 'l' && s.k !== 'a') {
        w = Math.max(GRID, w);
        h = Math.max(GRID, h);
      }
      this.doc = this.doc.map((sh, i) => (i === d.idx ? { ...sh, w, h } : sh));
      this.requestUpdate();
    }
  }

  private onUp(e: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.mode === 'link') {
      const over = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest('[data-idx]')?.getAttribute('data-idx');
      const to = over ? parseInt(over, 10) : -1;
      if (to >= 0 && to !== d.from && this.doc[to] && !isLink(this.doc[to].k)) {
        this.commit([...this.doc, { k: 'k', x: d.from, y: to, w: 0, h: 0, f: 0, text: '' }]);
        this.sel = this.doc.length - 1;
        this.tool = 'select';
      }
      return;
    }
    if (d.mode === 'draw') {
      let s = d.shape;
      const tiny = Math.abs(s.w) < GRID && Math.abs(s.h) < GRID;
      if (tiny) {
        // A click without a drag drops a default-sized shape.
        s = s.k === 'l' || s.k === 'a' ? { ...s, w: 96, h: 0 } : s.k === 't' ? { ...s, w: 96, h: 24 } : s.k === 'i' ? { ...s, w: 48, h: 48 } : { ...s, w: 96, h: 48 };
      }
      if (s.k !== 'l' && s.k !== 'a') s = { ...s, x: Math.min(s.x, W - s.w), y: Math.min(s.y, H - s.h) };
      this.commit([...this.doc, s]);
      this.sel = this.doc.length - 1;
      this.tool = 'select';
      if (s.k === 't') this.updateComplete.then(() => this.querySelector<SlInput>('.draw-label')?.select());
    } else {
      this.commit(this.doc);
    }
  }

  /** The pen's corners become a shape: its box is theirs, its points hundredths of it. */
  private closePen() {
    const pts = this.pen;
    this.pen = [];
    if (pts.length < 3) return;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const [w, h] = [Math.max(GRID, x1 - x0), Math.max(GRID, y1 - y0)];
    const shape: Shape = { k: 'v', x: x0, y: y0, w, h, f: 1, text: '', pts: pts.flatMap(([px, py]) => [((px - x0) / w) * 100, ((py - y0) / h) * 100]) };
    this.commit([...this.doc, shape]);
    this.sel = this.doc.length - 1;
    this.tool = 'select';
  }

  private onKey = (e: KeyboardEvent) => {
    const t = e.composedPath()[0] as HTMLElement;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') (t as HTMLInputElement).blur();
      return;
    }
    if (this.pen.length) {
      if (e.key === 'Enter') return (e.preventDefault(), this.closePen());
      if (e.key === 'Escape') return (e.preventDefault(), void (this.pen = []));
      if (e.key === 'Backspace') return (e.preventDefault(), void (this.pen = this.pen.slice(0, -1)));
    }
    const tool = [...TOOLS].find((x) => x.key.toLowerCase() === e.key.toLowerCase());
    if (tool && !e.ctrlKey && !e.metaKey) {
      this.tool = tool.id;
      return;
    }
    if (this.sel < 0) return;
    const s = this.doc[this.sel];
    if (e.key === 'Delete' || e.key === 'Backspace') this.removeSel();
    else if (isLink(s.k) && e.key.startsWith('Arrow')) return;
    else if (e.key === 'ArrowLeft') this.patchSel({ x: s.x - GRID });
    else if (e.key === 'ArrowRight') this.patchSel({ x: s.x + GRID });
    else if (e.key === 'ArrowUp') this.patchSel({ y: s.y - GRID });
    else if (e.key === 'ArrowDown') this.patchSel({ y: s.y + GRID });
    else if (e.key === 'Escape') this.sel = -1;
    else if (isKey(e, 'Mod+D')) this.duplicate();
    else return;
    e.preventDefault();
  };

  /**
   * The Icon button. With a shape selected, the icon goes in front of its
   * label (or replaces the icon, for an icon shape); with nothing selected,
   * the next click on the canvas places the icon on its own.
   */
  private async pickIcon() {
    const name = await chooseIcon();
    if (!name) return;
    const s = this.sel >= 0 ? this.doc[this.sel] : null;
    if (s && s.k === 'i') this.patchSel({ text: name });
    else if (s && !isLink(s.k)) this.patchSel({ text: `:${name} ${iconOf(s.text)[1]}`.trimEnd() });
    else {
      this.stamp = name;
      this.tool = 'i';
    }
  }

  /** Zoom in steps of a quarter, between half size and four times. */
  private zoomBy(d: number) {
    this.zoom = clamp(Math.round((this.zoom + d) * 4) / 4, 0.5, 4);
  }

  private removeSel() {
    if (this.sel < 0) return;
    this.commit(removeShape(this.doc, this.sel));
    this.sel = -1;
  }

  private duplicate() {
    if (this.sel < 0) return;
    const s = this.doc[this.sel];
    if (isLink(s.k)) return;
    this.commit([...this.doc, { ...s, x: s.x + GRID * 2, y: s.y + GRID * 2 }]);
    this.sel = this.doc.length - 1;
  }

  private reorder(toFront: boolean) {
    if (this.sel < 0) return;
    const moved = restack(this.doc, this.sel, toFront);
    this.commit(moved.shapes);
    this.sel = moved.at;
  }

  /** Drawn by the same code that makes the picture everywhere else (draw.def.ts). */
  private renderShape(s: Shape, i: number, ghost = false) {
    return svg`<g data-idx=${i} class=${ghost ? '' : 'shape'} opacity=${ghost ? 0.6 : 1}>${unsafeSVG(shapeSvg(s, this.doc, THEME, true))}</g>`;
  }

  private renderSelection(s: Shape) {
    if (isLink(s.k)) {
      const ends = linkEnds(s, this.doc);
      return ends ? svg`<line x1=${ends[0]} y1=${ends[1]} x2=${ends[2]} y2=${ends[3]} stroke="var(--to-accent)" stroke-width="6" stroke-linecap="round" opacity="0.35" pointer-events="none" />` : nothing;
    }
    const line = isLine(s.k);
    const x = line ? Math.min(s.x, s.x + s.w) : s.x;
    const y = line ? Math.min(s.y, s.y + s.h) : s.y;
    const w = Math.abs(s.w);
    const h = Math.abs(s.h);
    const hx = s.x + s.w;
    const hy = s.y + s.h;
    return svg`<rect x=${x - 3} y=${y - 3} width=${w + 6} height=${h + 6} fill="none" stroke="var(--to-accent)" stroke-dasharray="4 3" pointer-events="none" />
      <rect class="handle" x=${hx - 5} y=${hy - 5} width="10" height="10" fill="var(--to-surface)" stroke="var(--to-accent)" stroke-width="2" />`;
  }

  render() {
    const s = this.sel >= 0 ? this.doc[this.sel] : null;
    const line = !!s && isLine(s.k);
    const d = this.drag;
    const from = d?.mode === 'link' ? this.doc[d.from] : null;
    return html`
      <div class="to-toolbar" role="toolbar" aria-label="Tools">
        <sl-button-group label="Tools">
          ${TOOLS.map((t) => tool(t.label, t.icon, () => (this.tool = t.id), { pressed: this.tool === t.id, key: t.key, size: 16 }))}
        </sl-button-group>
        <sl-button data-tip=${s && !isLink(s.k) ? 'Put an icon on this shape' : 'Place an icon'} size="small" aria-label="Icon" @click=${this.pickIcon}>${icon(UI.smile, 14)} Icon</sl-button>
        <sl-dropdown hoist @sl-select=${(e: CustomEvent) => (this.tool = e.detail.item.value as Kind)}>
          <sl-button slot="trigger" size="small" caret aria-pressed=${MORE.some((m) => m.id === this.tool) ? 'true' : 'false'}>Shapes</sl-button>
          <sl-menu>${MORE.map((m) => html`<sl-menu-item value=${m.id}>${m.label}</sl-menu-item>`)}</sl-menu>
        </sl-dropdown>
        ${stepper('Zoom', `${Math.round(this.zoom * 100)}%`, { less: 'Zoom out', more: 'Zoom in', onLess: () => this.zoomBy(-0.25), onMore: () => this.zoomBy(0.25), canLess: this.zoom > 0.5, canMore: this.zoom < 4, reset: 'Back to fitting the page', onReset: () => (this.zoom = 1) })}
        <span class="sep"></span>
        <sl-input
          class="draw-label sr-label"
          size="small"
          label="Label"
          placeholder="Label"
          ?disabled=${!s}
          .value=${s?.k === 'i' ? '' : (s?.text ?? '')}
          ?readonly=${s?.k === 'i'}
          @sl-input=${(e: Event) => this.patchSel({ text: (e.target as SlInput).value })}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.target as SlInput).blur()}
        ></sl-input>
        <!-- Always present, so choosing a shape does not make the toolbar (and the canvas under it) jump. -->
        <sl-select class="draw-fill sr-label" size="small" label=${line ? 'Line style' : 'Fill'} ?disabled=${!s || s.k === 't'} .value=${String(s?.f ?? 0)} hoist style="width:110px" @sl-change=${(e: Event) => this.patchSel({ f: parseInt((e.target as SlSelect).value as string, 10) as Fill })}>
              <sl-option value="0">${line ? 'Solid' : 'No fill'}</sl-option>
              <sl-option value="1">${line ? 'Dashed' : 'Grey'}</sl-option>
              <sl-option value="2">${line ? 'Dotted' : 'Solid'}</sl-option>
        </sl-select>
        ${swatches('Colour', INKS, s?.c ?? '', (c) => this.patchSel({ c: (c || undefined) as Color | undefined }), { disabled: !s })}
        <sl-select class="sr-label" size="small" label="Text size" ?disabled=${!s} .value=${String(s?.z ?? 2)} hoist style="width:104px" @sl-change=${(e: Event) => {
          const z = parseInt((e.target as SlSelect).value as string, 10) as TextSize;
          this.patchSel({ z: z === 2 ? undefined : z });
        }}>
          ${([1, 2, 3, 4] as TextSize[]).map((z) => html`<sl-option value=${z}>${TEXT_SIZES[z].name}</sl-option>`)}
        </sl-select>
        ${tool('Animate this drawing', 'play', () => (location.hash = `#/v2/${makeRef('anim', '!o\n' + serializeDrawing(this.doc))}`), { disabled: !this.doc.length, size: 16 })}
        <sl-button-group label="Arrange">
          ${tool('Bring to front', 'front', () => this.reorder(true), { disabled: !s, size: 16 })}
          ${tool('Send to back', 'back', () => this.reorder(false), { disabled: !s, size: 16 })}
          ${tool('Duplicate', 'copy', () => this.duplicate(), { disabled: !s, key: 'Mod+D', size: 16 })}
          ${tool('Delete', 'trash', () => this.removeSel(), { disabled: !s, key: 'Delete', size: 16 })}
        </sl-button-group>
      </div>
      <div class="draw-wrap" tabindex="0" @wheel=${(e: WheelEvent) => {
        // Ctrl (or a pinch on a trackpad) and the wheel zoom; the wheel alone scrolls as usual.
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.zoomBy(-Math.sign(e.deltaY) * 0.25);
      }}>
        <svg
          class="draw-canvas ${this.tool === 'select' ? '' : 'tool'}"
          style="width:${this.zoom * 100}%"
          viewBox="0 0 ${W} ${H}"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Drawing canvas"
          @pointerdown=${this.onDown}
          @pointermove=${this.onMove}
          @pointerup=${this.onUp}
          @pointercancel=${this.onUp}
          @dblclick=${() => (this.pen.length ? this.closePen() : this.sel >= 0 && this.querySelector<SlInput>('.draw-label')?.select())}
        >
          <defs>
            <pattern id="grid" width=${GRID * 2} height=${GRID * 2} patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--to-border-strong)" />
            </pattern>
            ${unsafeSVG(arrowDefs('var(--to-ink)'))}
          </defs>
          <rect width=${W} height=${H} fill="url(#grid)" />
          ${this.pen.length
            ? svg`<polyline points=${this.pen.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--to-accent)" stroke-width="2" stroke-dasharray="6 4"/>
                ${this.pen.map(([px, py], i) => svg`<circle cx=${px} cy=${py} r=${i === 0 ? 7 : 4} fill=${i === 0 ? 'var(--to-accent)' : '#fff'} stroke="var(--to-accent)" stroke-width="2"/>`)}`
            : nothing}
          ${this.doc.map((sh, i) => this.renderShape(sh, i))}
          ${d?.mode === 'draw' ? this.renderShape(d.shape, -1, true) : nothing}
          ${d?.mode === 'link' && from ? svg`<line x1=${from.x + from.w / 2} y1=${from.y + from.h / 2} x2=${d.to[0]} y2=${d.to[1]} stroke="var(--to-accent)" stroke-width="2" stroke-dasharray="5 4" pointer-events="none" />` : nothing}
          ${s ? this.renderSelection(s) : nothing}
        </svg>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-draw': ToDraw;
  }
}
defineElement('draw', ToDraw);
