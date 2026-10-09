/**
 * <to-draw-editor>: a little diagram tool, and pixel art as a grid mode. Shapes are drawn on a 640 by 400
 * canvas by tools in the bar (a key each), moved and resized by hand, labelled in place (a double tap, or
 * Enter), coloured and styled from popovers; every change is operations on the document's table (model.ts).
 * In pixel mode (the Shapes/Pixels menu) the canvas is a grid of squares, painted with a pencil or a fill in
 * one of eight inks, and "Use as background" makes the grid the drawing's repeating tile.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Accessibility, ArrowDownToLine, ArrowUpToLine, Brush, Circle, Copy, Diamond, Eraser, Grid2x2, Layers, Minus, MousePointer2, MoveRight, PaintBucket, Paintbrush, Palette, PenTool, Pencil, Shapes, Smile, Spline, Square, Tag, Trash2, Type, Wallpaper, ZoomIn, ZoomOut } from 'lucide';
import { btn, tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { place, type MenuItem } from '../../kit/menu.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { toast } from '../../kit/toast.ts';
import { TILE_INKS, TILE_SIDES, tileCss, tileFilled, tilePattern, tileRef } from '../../kit/tile.ts';
import type { Doc } from '../../doc/index.ts';
import { COLORS, GRID, H, W, addShape, bounds, describeDrawing, duplicate, floodSquare, iconOf, isLink, linkEnds, paintSquare, patchShape, readDrawing, removeShape, restack, setAlt, setGrid, setPixels, setTile, simplify, strokeShape, type Color, type DrawView, type Fill, type Kind, type Shape, type TextSize } from './model.ts';
import { TILE_SIDE, arrowDefs, shapeSvg, type Theme } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/dialog.ts';
import './style.css';

export const tag = 'to-draw-editor';

const snap = (n: number) => Math.round(n / GRID) * GRID;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** 'f' draws by hand: a drag is a stroke, closed into a shape when it ends where it began. */
type Tool = 'select' | Kind | 'f';
/** The page's own colours, so a drawing looks right in the dark too. */
export const THEME: Theme = { ink: 'var(--to-ink)', paper: 'var(--to-surface)', shade: 'var(--to-surface-2)' };

type Drag =
  | { mode: 'link'; from: number; to: [number, number] }
  | { mode: 'draw'; start: [number, number]; shape: Shape }
  | { mode: 'move'; idx: number; off: [number, number]; orig: Shape }
  | { mode: 'resize'; idx: number; orig: Shape }
  | { mode: 'free'; pts: [number, number][] };

/** The tools in the bar, a key each. */
const TOOLS: { id: Tool; name: () => string; icon: typeof Square; key: string }[] = [
  { id: 'select', name: () => t('Select'), icon: MousePointer2, key: 'V' },
  { id: 'r', name: () => t('Rectangle'), icon: Square, key: 'R' },
  { id: 'e', name: () => t('Ellipse'), icon: Circle, key: 'E' },
  { id: 'd', name: () => t('Diamond'), icon: Diamond, key: 'D' },
  { id: 'l', name: () => t('Line'), icon: Minus, key: 'L' },
  { id: 'a', name: () => t('Arrow'), icon: MoveRight, key: 'A' },
  { id: 't', name: () => t('Text'), icon: Type, key: 'T' },
  { id: 'k', name: () => t('Join two shapes'), icon: Spline, key: 'K' },
  { id: 'v', name: () => t('Pen: any shape, a tap for each corner'), icon: PenTool, key: 'P' },
  { id: 'f', name: () => t('Freehand: drag to draw a line or a shape'), icon: Brush, key: 'F' },
];
/** Every shape Insert ▾ can place, the bar's and the rest. */
const SHAPES: { id: Kind; name: () => string }[] = [
  { id: 'r', name: () => t('Rectangle') },
  { id: 'o', name: () => t('Rounded box') },
  { id: 'e', name: () => t('Ellipse') },
  { id: 'd', name: () => t('Diamond') },
  { id: 'h', name: () => t('Hexagon') },
  { id: 'p', name: () => t('Parallelogram') },
  { id: 'c', name: () => t('Cylinder') },
  { id: 'n', name: () => t('Note') },
  { id: 't', name: () => t('Text') },
];
const INKS: { c: Color | ''; name: () => string; hex: string }[] = [
  { c: '', name: () => t('Black'), hex: '#18181b' },
  { c: 'r', name: () => t('Red'), hex: COLORS.r },
  { c: 'o', name: () => t('Orange'), hex: COLORS.o },
  { c: 'g', name: () => t('Green'), hex: COLORS.g },
  { c: 'b', name: () => t('Blue'), hex: COLORS.b },
  { c: 'p', name: () => t('Purple'), hex: COLORS.p },
];
const SIZES: { z: TextSize; name: () => string }[] = [
  { z: 1, name: () => t('Small') },
  { z: 2, name: () => t('Normal') },
  { z: 3, name: () => t('Large') },
  { z: 4, name: () => t('Huge') },
];
/** The pixel inks, by letter, named. */
const PIXEL_INKS: { k: string; name: () => string }[] = [
  { k: 'a', name: () => t('Black') },
  { k: 'b', name: () => t('Indigo') },
  { k: 'c', name: () => t('Red') },
  { k: 'd', name: () => t('Orange') },
  { k: 'e', name: () => t('Yellow') },
  { k: 'f', name: () => t('Green') },
  { k: 'g', name: () => t('Sky') },
  { k: 'h', name: () => t('Pink') },
];

/** A shape of the default size, for a tap or an Insert. */
function sized(s: Shape): Shape {
  return s.k === 'l' || s.k === 'a' ? { ...s, w: 96, h: 0 } : s.k === 't' ? { ...s, w: 96, h: 24 } : s.k === 'i' ? { ...s, w: 48, h: 48 } : { ...s, w: 96, h: 48 };
}

export class ToDrawEditor extends DocElement<DrawView> {
  static properties: PropertyDeclarations = { tool: { state: true }, sel: { state: true }, pen: { state: true }, drag: { state: true }, live: { state: true }, zoom: { state: true }, ink: { state: true }, pmode: { state: true }, cursor: { state: true }, altDraft: { state: true } };
  declare tool: Tool;
  /** The selected shape, -1 for none. */
  declare sel: number;
  /** The pen's corners so far, in px; the shape is made when the pen is closed (Enter, a double tap, or the first corner again). */
  declare pen: [number, number][];
  declare drag: Drag | null;
  /** The shapes as shown while one is being moved or resized; the document is written when the pointer lifts. */
  declare live: Shape[] | null;
  /** How large the canvas is shown: 1 fits the page's width. */
  declare zoom: number;
  /** Pixel mode: the ink in hand ('.' is the eraser) and what a tap does. */
  declare ink: string;
  declare pmode: 'pen' | 'fill';
  /** Pixel mode: the square the keyboard is on. */
  declare cursor: [number, number];
  /** The alt text being written, while its dialog is open; null when it is closed. */
  declare altDraft: string | null;
  /** The icon the next tap will place, when the icon tool is armed. */
  private stamp = '';
  private svgEl: SVGSVGElement | null = null;

  constructor() {
    super();
    this.tool = 'select';
    this.sel = -1;
    this.pen = [];
    this.drag = null;
    this.live = null;
    this.zoom = 1;
    this.ink = 'a';
    this.pmode = 'pen';
    this.cursor = [0, 0];
    this.altDraft = null;
  }
  protected read(doc: Doc): DrawView {
    return readDrawing(doc);
  }
  protected undone() {
    this.sel = -1;
    this.live = null;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
  }

  /** The shapes as drawn right now: the document's, or the ones in motion under the pointer. */
  private get shapes(): Shape[] {
    return this.live ?? this.view.shapes;
  }
  private get selected(): Shape | null {
    return this.sel >= 0 ? (this.shapes[this.sel] ?? null) : null;
  }

  /* ---------- commands ---------- */

  private patchSel(p: Partial<Shape>, key?: string) {
    if (this.sel < 0) return;
    this.edit(patchShape(this.doc, this.sel, p), key);
  }
  /** A new shape, chosen, and the select tool back in hand. */
  private add(s: Shape) {
    this.edit(addShape(this.doc, s));
    this.sel = this.view.shapes.length - 1;
    this.tool = 'select';
  }
  /** A shape of the default size in the middle of the canvas (a little along for each one already there), from Insert. */
  private insert(k: Kind, text = '') {
    const n = this.view.shapes.length;
    const s = sized({ k, x: 0, y: 0, w: 0, h: 0, f: 0, text });
    this.add({ ...s, x: snap(clamp(W / 2 - s.w / 2 + (n % 5) * GRID * 2, 0, W - s.w)), y: snap(clamp(H / 2 - s.h / 2 + (n % 5) * GRID * 2, 0, H - s.h)) });
    if (k === 't') void this.updateComplete.then(() => this.openLabel());
  }
  private removeSel() {
    if (this.sel < 0) return;
    this.edit(removeShape(this.doc, this.sel));
    this.sel = -1;
  }
  private duplicateSel() {
    if (this.sel < 0) return;
    const ops = duplicate(this.doc, this.sel);
    if (!ops.length) return;
    this.edit(ops);
    this.sel = this.view.shapes.length - 1;
  }
  private reorder(toFront: boolean) {
    if (this.sel < 0) return;
    const { ops, at } = restack(this.doc, this.sel, toFront);
    this.edit(ops);
    this.sel = at;
  }
  /** The pen's corners become a shape: its box is theirs, its points hundredths of it. */
  private closePen() {
    const pts = this.pen;
    this.pen = [];
    if (pts.length >= 3) this.stroke(pts, true);
  }
  private stroke(pts: [number, number][], closed = false) {
    const s = strokeShape(pts, closed);
    if (s) this.add(s);
  }
  /** Zoom in steps of a quarter, between half size and four times. */
  private zoomBy(d: number) {
    this.zoom = clamp(Math.round((this.zoom + d) * 4) / 4, 0.5, 4);
  }
  /** The Icon button: on a selected shape the icon goes before its label (or is the icon, for an icon shape); with none selected, the next tap places it on its own. */
  private async pickIcon() {
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const s = this.selected;
    const name = await chooseIcon({ current: s ? iconOf(s.text)[0] : undefined, none: !!s && !!iconOf(s.text)[0] && s.k !== 'i' });
    this.focusCanvas();
    if (name === null) return;
    if (s && s.k === 'i') this.patchSel({ text: name || s.text });
    else if (s && !isLink(s.k)) this.patchSel({ text: `${name ? `:${name} ` : ''}${iconOf(s.text)[1]}`.trimEnd() });
    else if (name) {
      this.stamp = name;
      this.tool = 'i';
    }
  }

  /* ---------- the pointer on the canvas ---------- */

  private point(e: PointerEvent): [number, number] {
    const b = this.svgEl!.getBoundingClientRect();
    return [((e.clientX - b.left) * W) / b.width, ((e.clientY - b.top) * H) / b.height];
  }
  private focusCanvas() {
    // (Without scrolling: the page must not jump under a drag that has just begun.)
    this.querySelector<HTMLElement>('.draw-wrap')?.focus({ preventScroll: true });
  }

  private onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    this.svgEl = e.currentTarget as SVGSVGElement;
    const [x, y] = this.point(e);
    const target = e.target as Element;
    const idxAttr = target.closest('[data-idx]')?.getAttribute('data-idx');
    this.svgEl.setPointerCapture(e.pointerId);
    this.focusCanvas();
    if (this.tool === 'f') {
      this.drag = { mode: 'free', pts: [[x, y]] };
      return;
    }
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
      if (from >= 0 && !isLink(this.shapes[from].k)) this.drag = { mode: 'link', from, to: [x, y] };
      return;
    }
    if (this.tool === 'select') {
      if (target.classList.contains('handle') && this.sel >= 0) {
        this.drag = { mode: 'resize', idx: this.sel, orig: this.shapes[this.sel] };
      } else if (idxAttr !== undefined && idxAttr !== null) {
        const idx = parseInt(idxAttr, 10);
        this.sel = idx;
        const s = this.shapes[idx];
        // (A join has no place of its own to move to: it goes where its shapes go.)
        if (!isLink(s.k)) this.drag = { mode: 'move', idx, off: [x - s.x, y - s.y], orig: s };
      } else {
        this.sel = -1;
      }
      return;
    }
    const shape: Shape = { k: this.tool, x: snap(x), y: snap(y), w: 0, h: 0, f: 0, text: this.tool === 't' ? t('Text') : this.tool === 'i' ? this.stamp : '' };
    this.drag = { mode: 'draw', start: [snap(x), snap(y)], shape };
  }

  private onMove(e: PointerEvent) {
    if (!this.drag) return;
    const [x, y] = this.point(e);
    const d = this.drag;
    if (d.mode === 'free') {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(x - last[0], y - last[1]) >= 2) this.drag = { ...d, pts: [...d.pts, [x, y]] };
    } else if (d.mode === 'link') {
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
      this.live = this.view.shapes.map((s, i) => (i === d.idx ? { ...s, x: nx, y: ny } : s));
    } else if (d.mode === 'resize') {
      const s = d.orig;
      let w = snap(x) - s.x;
      let h = snap(y) - s.y;
      if (s.k !== 'l' && s.k !== 'a') {
        w = Math.max(GRID, w);
        h = Math.max(GRID, h);
      }
      this.live = this.view.shapes.map((sh, i) => (i === d.idx ? { ...sh, w, h } : sh));
    }
  }

  private onUp(e: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.mode === 'free') return this.stroke(simplify(d.pts));
    if (d.mode === 'link') {
      const over = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest('[data-idx]')?.getAttribute('data-idx');
      const to = over ? parseInt(over, 10) : -1;
      if (to >= 0 && to !== d.from && this.shapes[to] && !isLink(this.shapes[to].k)) this.add({ k: 'k', x: d.from, y: to, w: 0, h: 0, f: 0, text: '' });
      return;
    }
    if (d.mode === 'draw') {
      let s = d.shape;
      // A tap without a drag drops a default-sized shape.
      if (Math.abs(s.w) < GRID && Math.abs(s.h) < GRID) s = sized(s);
      if (s.k !== 'l' && s.k !== 'a') s = { ...s, x: Math.min(s.x, W - s.w), y: Math.min(s.y, H - s.h) };
      this.add(s);
      if (s.k === 't') void this.updateComplete.then(() => this.openLabel());
      return;
    }
    // A move or a resize: what was shown is written.
    const moved = this.live?.[d.idx];
    this.live = null;
    if (moved) this.patchSel(d.mode === 'move' ? { x: moved.x, y: moved.y } : { w: moved.w, h: moved.h });
  }

  /* ---------- keys ---------- */

  private onKey = (e: KeyboardEvent) => {
    const at = e.composedPath()[0] as HTMLElement;
    if (at.tagName === 'INPUT' || at.tagName === 'TEXTAREA' || at.closest('[popover]') || at.closest('dialog')) return;
    if (this.view.grid) return this.onPixelKey(e);
    if (this.pen.length) {
      if (e.key === 'Enter') return (e.preventDefault(), this.closePen());
      if (e.key === 'Escape') return (e.preventDefault(), void (this.pen = []));
      if (e.key === 'Backspace') return (e.preventDefault(), void (this.pen = this.pen.slice(0, -1)));
    }
    const picked = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
    if (picked && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.tool = picked.id;
      return;
    }
    const s = this.selected;
    if (!s) return;
    if (e.key === 'Delete' || e.key === 'Backspace') this.removeSel();
    else if (e.key === 'Enter') this.openLabel();
    else if (isLink(s.k) && e.key.startsWith('Arrow')) return;
    else if (e.key === 'ArrowLeft') this.patchSel({ x: s.x - GRID }, `nudge:${this.sel}`);
    else if (e.key === 'ArrowRight') this.patchSel({ x: s.x + GRID }, `nudge:${this.sel}`);
    else if (e.key === 'ArrowUp') this.patchSel({ y: s.y - GRID }, `nudge:${this.sel}`);
    else if (e.key === 'ArrowDown') this.patchSel({ y: s.y + GRID }, `nudge:${this.sel}`);
    else if (e.key === 'Escape') this.sel = -1;
    else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') this.duplicateSel();
    else return;
    e.preventDefault();
  };

  /* ---------- the label, edited over its shape ---------- */

  private get labelPop(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.draw-label-pop');
  }
  /** The selected shape's label, in a box over the shape (the icon picker, for an icon shape). */
  private openLabel() {
    const s = this.selected;
    if (!s) return;
    if (s.k === 'i') return void this.pickIcon();
    const pop = this.labelPop;
    const anchor = this.querySelector<HTMLElement>(`[data-idx="${this.sel}"]`);
    if (!pop || !anchor) return;
    if (!pop.matches(':popover-open')) pop.showPopover();
    place(pop, anchor);
    const input = pop.querySelector<HTMLInputElement>('input');
    input?.focus({ preventScroll: true });
    input?.select();
  }
  private closeLabel(back = true) {
    const pop = this.labelPop;
    if (pop?.matches(':popover-open')) pop.hidePopover();
    if (back) this.focusCanvas();
  }

  /* ---------- pixel mode ---------- */

  private paint(x: number, y: number, flood = false) {
    const p = this.view.pixels;
    const next = flood ? floodSquare(p, x, y, this.ink) : paintSquare(p, x, y, this.ink);
    if (next !== p) this.edit(setPixels(this.doc, next), flood ? undefined : 'pixels');
  }
  /** The square under the pointer, or null off the grid. */
  private square(e: PointerEvent): [number, number] | null {
    const el = e.currentTarget as SVGSVGElement;
    const b = el.getBoundingClientRect();
    const n = this.view.pixels.n;
    const x = Math.floor(((e.clientX - b.left) / b.width) * n);
    const y = Math.floor(((e.clientY - b.top) / b.height) * n);
    return x >= 0 && x < n && y >= 0 && y < n ? [x, y] : null;
  }
  private onPixelPointer(e: PointerEvent) {
    const at = this.square(e);
    if (e.type === 'pointerdown') {
      if (e.button !== 0 || !at) return;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      this.focusCanvas();
      this.cursor = at;
      this.paint(at[0], at[1], this.pmode === 'fill');
    } else if (e.type === 'pointermove' && e.buttons && at && this.pmode === 'pen') this.paint(at[0], at[1]);
  }
  private onPixelKey(e: KeyboardEvent) {
    const n = this.view.pixels.n;
    const [x, y] = this.cursor;
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (step[e.key]) {
      e.preventDefault();
      this.cursor = [clamp(x + step[e.key][0], 0, n - 1), clamp(y + step[e.key][1], 0, n - 1)];
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.paint(x, y, this.pmode === 'fill');
    }
  }
  private clearPixels() {
    this.edit(setPixels(this.doc, { n: this.view.pixels.n, rows: this.view.pixels.rows.map((r) => '.'.repeat(r.length)) }));
  }
  /** The grid becomes the drawing's background: written into the head as a tile, and the shapes are shown over it. */
  private useAsBackground() {
    const p = this.view.pixels;
    if (!tileFilled(p)) return;
    this.edit([...setTile(this.doc, tileRef(p)), ...setGrid(this.doc, 0)]);
    toast(t('The grid is now the background. Download gives it as a tile; any page can carry it as tile:.'));
  }

  /* ---------- menus ---------- */

  private inserts(): MenuItem[] {
    return [
      ...SHAPES.map((s) => ({ group: t('Shapes'), label: s.name(), does: () => this.insert(s.id) })),
      { group: t('Lines'), label: t('Line'), icon: Minus, does: () => this.insert('l') },
      { group: t('Lines'), label: t('Arrow'), icon: MoveRight, does: () => this.insert('a') },
      { group: t('Lines'), label: t('Join two shapes'), icon: Spline, hint: t('Press on one shape and let go on another'), does: () => (this.tool = 'k') },
      { group: t('More'), label: t('Icon…'), icon: Smile, does: () => void this.pickIcon() },
      { group: t('More'), label: t('Pen: any shape, a tap for each corner'), icon: PenTool, does: () => (this.tool = 'v') },
      { group: t('More'), label: t('Freehand: drag to draw a line or a shape'), icon: Brush, does: () => (this.tool = 'f') },
    ];
  }
  private modeItems(): MenuItem[] {
    const grid = this.view.grid;
    return [
      { label: t('Shapes'), icon: Shapes, checked: !grid, does: () => this.edit(setGrid(this.doc, 0)) },
      ...TILE_SIDES.map((n) => ({ label: t('Pixels, {n} by {n}', { n }), icon: Grid2x2, checked: grid === n, does: () => this.edit(setGrid(this.doc, n)) })),
      ...(this.view.tile && !grid ? [{ group: t('Background'), label: t('Remove the background tile'), icon: Trash2, does: () => this.edit(setTile(this.doc, '')) }] : []),
    ];
  }
  private colourItems(): MenuItem[] {
    const s = this.selected;
    return INKS.map((ink) => ({ label: ink.name(), swatch: ink.hex, checked: (s?.c ?? '') === ink.c, does: () => this.patchSel({ c: (ink.c || undefined) as Color | undefined }) }));
  }
  private styleItems(): MenuItem[] {
    const s = this.selected;
    const line = !!s && (s.k === 'l' || s.k === 'a' || isLink(s.k) || s.k === 'w');
    const fills: { f: Fill; name: string }[] = line ? [{ f: 0, name: t('Solid') }, { f: 1, name: t('Dashed') }, { f: 2, name: t('Dotted') }] : [{ f: 0, name: t('No fill') }, { f: 1, name: t('Grey') }, { f: 2, name: t('Solid') }];
    return [
      ...(s?.k === 't' ? [] : fills.map((x) => ({ group: line ? t('Line') : t('Fill'), label: x.name, checked: s?.f === x.f, does: () => this.patchSel({ f: x.f }) }))),
      ...SIZES.map((x) => ({ group: t('Text size'), label: x.name(), checked: (s?.z ?? 2) === x.z, does: () => this.patchSel({ z: x.z === 2 ? undefined : x.z }) })),
    ];
  }
  private arrangeItems(): MenuItem[] {
    const s = this.selected;
    return [
      { label: t('Bring to front'), icon: ArrowUpToLine, disabled: !s, does: () => this.reorder(true) },
      { label: t('Send to back'), icon: ArrowDownToLine, disabled: !s, does: () => this.reorder(false) },
      { label: t('Duplicate'), icon: Copy, hint: 'Mod+D', disabled: !s || isLink(s.k), does: () => this.duplicateSel() },
      { label: t('Label…'), icon: Tag, hint: 'Enter', disabled: !s, does: () => this.openLabel() },
      { label: t('Delete'), icon: Trash2, hint: 'Delete', disabled: !s, does: () => this.removeSel() },
    ];
  }

  /* ---------- drawing ---------- */

  /** One line under the bar saying what the hand in play does; always there, so nothing jumps. */
  private hint(): string {
    if (this.view.grid) return t('Tap or drag to paint; the arrow keys move, Enter paints.');
    if (this.tool === 'v' || this.pen.length) return t('Tap each corner; tap the first again, or press Enter, to close it.');
    if (this.tool === 'f') return t('Drag to draw; end where you began to close it into a shape.');
    if (this.tool === 'k') return t('Press on one shape and let go on another.');
    if (this.tool === 'i') return t('Tap where the icon goes.');
    if (this.tool !== 'select') return t('Drag on the canvas to draw it, or tap to place one.');
    if (this.selected) return t('Drag to move; the corner handle resizes; Enter or a double tap for the label.');
    return t('Tap a shape to select it; choose a tool to draw.');
  }

  render() {
    const v = this.view;
    return html`${v.grid ? this.renderPixelBar() : this.renderBar()}
      <p class="draw-hint to-hint">${this.hint()}</p>
      ${v.grid ? this.renderPixels() : this.renderCanvas()}
      ${this.renderLabel()}
      ${this.renderAlt()}`;
  }

  private renderBar() {
    const v = this.view;
    const s = this.selected;
    const label = v.grid ? t('Pixels, {n} by {n}', { n: v.grid }) : t('Shapes');
    return html`<to-bar class="draw-bar">
      <to-insert .items=${this.inserts()}></to-insert>
      <to-menu class="draw-mode" .label=${label} .icon=${v.grid ? Grid2x2 : Shapes} caret .items=${this.modeItems()}></to-menu>
      ${TOOLS.map((x) => tool({ label: x.name(), icon: x.icon, keys: x.key, pressed: this.tool === x.id, does: () => (this.tool = x.id) }))}
      ${tool({ label: s && !isLink(s.k) ? t('Put an icon on this shape') : t('Place an icon'), icon: Smile, pressed: this.tool === 'i', does: () => void this.pickIcon() })}
      <to-menu class="draw-colour" icon-only .label=${t('Colour')} .icon=${Palette} .items=${this.colourItems()} ?disabled=${!s}></to-menu>
      <to-menu class="draw-style" icon-only .label=${t('Style')} .icon=${Paintbrush} .items=${this.styleItems()}></to-menu>
      <to-menu class="draw-arrange" icon-only .label=${t('Arrange')} .icon=${Layers} .items=${this.arrangeItems()}></to-menu>
      <button type="button" class="to-btn draw-alt ${v.alt ? 'has' : ''}" aria-label=${v.alt ? t('Alt text: {alt}', { alt: v.alt }) : t('Add alt text: describe this drawing for people who cannot see it')} title=${v.alt ? t('Alt text: {alt}', { alt: v.alt }) : t('Add alt text: describe this drawing for people who cannot see it')} @click=${() => this.openAlt()}>${v.alt ? icon(UI.check, 16) : icon(Accessibility, 18)}<span>${t('Alt')}</span></button>
      ${tool({ label: t('Zoom out'), icon: ZoomOut, disabled: this.zoom <= 0.5, does: () => this.zoomBy(-0.25) })}
      ${tool({ label: t('Zoom in'), icon: ZoomIn, disabled: this.zoom >= 4, does: () => this.zoomBy(0.25) })}
    </to-bar>`;
  }

  private renderPixelBar() {
    const v = this.view;
    return html`<to-bar class="draw-bar">
      <to-menu class="draw-mode" .label=${t('Pixels, {n} by {n}', { n: v.grid })} .icon=${Grid2x2} caret .items=${this.modeItems()}></to-menu>
      ${PIXEL_INKS.map((ink) => html`<button type="button" class="to-btn to-tool draw-swatch" aria-label=${ink.name()} title=${ink.name()} aria-pressed=${String(this.ink === ink.k && this.pmode === 'pen')} @click=${() => ((this.ink = ink.k), (this.pmode = 'pen'))}><span class="to-swatch" style="--swatch:${TILE_INKS[ink.k]}" aria-hidden="true"></span></button>`)}
      ${tool({ label: t('Eraser'), icon: Eraser, pressed: this.ink === '.', does: () => ((this.ink = '.'), (this.pmode = 'pen')) })}
      ${tool({ label: t('Pencil'), icon: Pencil, pressed: this.pmode === 'pen' && this.ink !== '.', does: () => ((this.pmode = 'pen'), this.ink === '.' && (this.ink = 'a')) })}
      ${tool({ label: t('Fill'), icon: PaintBucket, pressed: this.pmode === 'fill', does: () => ((this.pmode = 'fill'), this.ink === '.' && (this.ink = 'a')) })}
      ${tool({ label: t('Clear the grid'), icon: Trash2, disabled: !tileFilled(v.pixels), does: () => this.clearPixels() })}
      ${btn({ label: t('Use as background'), icon: Wallpaper, disabled: !tileFilled(v.pixels), does: () => this.useAsBackground() })}
    </to-bar>`;
  }

  /** Drawn by the same code that makes the picture everywhere else (view.ts). */
  private renderShape(s: Shape, i: number, ghost = false) {
    return svg`<g data-idx=${i} class=${ghost ? '' : 'shape'} opacity=${ghost ? 0.6 : 1}>${unsafeSVG(shapeSvg(s, this.shapes, THEME, true))}</g>`;
  }
  private renderSelection(s: Shape) {
    if (isLink(s.k)) {
      const ends = linkEnds(s, this.shapes);
      return ends ? svg`<line x1=${ends[0]} y1=${ends[1]} x2=${ends[2]} y2=${ends[3]} stroke="var(--to-accent)" stroke-width="6" stroke-linecap="round" opacity="0.35" pointer-events="none" />` : nothing;
    }
    const [x, y, w, h] = bounds(s, this.shapes);
    // The handle is at the shape's end: its far corner, or where its line stops.
    return svg`<rect x=${x - 3} y=${y - 3} width=${w + 6} height=${h + 6} fill="none" stroke="var(--to-accent)" stroke-dasharray="4 3" pointer-events="none" />
      <rect class="handle" x=${s.x + s.w - 6} y=${s.y + s.h - 6} width="12" height="12" fill="var(--to-surface)" stroke="var(--to-accent)" stroke-width="2" />`;
  }

  private renderCanvas() {
    const v = this.view;
    const d = this.drag;
    const s = this.selected;
    const from = d?.mode === 'link' ? this.shapes[d.from] : null;
    const tile = v.tile;
    return html`<div class="draw-wrap" tabindex="0" role="application" aria-label=${t('Drawing canvas. V selects; R, E, D, L, A, T draw; arrows nudge; Enter edits the label; Delete removes.')} @wheel=${(e: WheelEvent) => {
      // Ctrl (or a pinch on a trackpad) and the wheel zoom; the wheel alone scrolls as usual.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      this.zoomBy(-Math.sign(e.deltaY) * 0.25);
    }}>
      <svg class="draw-canvas ${this.tool === 'select' ? '' : 'tool'}" style="width:${this.zoom * 100}%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label=${v.alt || describeDrawing(v.shapes) || t('An empty drawing')}
        @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onUp}
        @dblclick=${() => (this.pen.length ? this.closePen() : this.sel >= 0 && this.openLabel())}>
        <defs>
          <pattern id="draw-grid" width=${GRID * 2} height=${GRID * 2} patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="var(--to-border-strong)" /></pattern>
          ${unsafeSVG(arrowDefs('var(--to-ink)'))}
          ${tile ? unsafeSVG(tilePattern(tile, 'draw-tile', TILE_SIDE)) : nothing}
        </defs>
        ${tile ? svg`<rect width=${W} height=${H} fill="url(#draw-tile)" />` : nothing}
        <rect width=${W} height=${H} fill="url(#draw-grid)" />
        ${this.pen.length
          ? svg`<polyline points=${this.pen.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--to-accent)" stroke-width="2" stroke-dasharray="6 4"/>
              ${this.pen.map(([px, py], i) => svg`<circle cx=${px} cy=${py} r=${i === 0 ? 7 : 4} fill=${i === 0 ? 'var(--to-accent)' : 'var(--to-surface)'} stroke="var(--to-accent)" stroke-width="2"/>`)}`
          : nothing}
        ${this.shapes.map((sh, i) => this.renderShape(sh, i))}
        ${d?.mode === 'draw' ? this.renderShape(d.shape, -1, true) : nothing}
        ${d?.mode === 'free' ? svg`<polyline points=${d.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--to-accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pointer-events="none"/>` : nothing}
        ${d?.mode === 'link' && from ? svg`<line x1=${from.x + from.w / 2} y1=${from.y + from.h / 2} x2=${d.to[0]} y2=${d.to[1]} stroke="var(--to-accent)" stroke-width="2" stroke-dasharray="5 4" pointer-events="none" />` : nothing}
        ${s ? this.renderSelection(s) : nothing}
      </svg>
    </div>`;
  }

  private renderPixels() {
    const p = this.view.pixels;
    const n = p.n;
    const [cx, cy] = this.cursor;
    const cells: unknown[] = [];
    p.rows.forEach((row, y) => {
      for (let x = 0; x < n; x++) if (TILE_INKS[row[x]]) cells.push(svg`<rect x=${x} y=${y} width="1.02" height="1.02" fill=${TILE_INKS[row[x]]} />`);
    });
    return html`<div class="draw-wrap draw-pixel-wrap" tabindex="0" role="application" aria-label=${t('Pixel grid, {n} by {n}. The arrow keys move; Enter paints the square with the ink in hand.', { n })} aria-describedby="draw-cursor">
      <svg class="draw-pixels ${this.pmode}" viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label=${this.view.alt || t('Pixel art, {n} by {n}', { n })}
        @pointerdown=${this.onPixelPointer} @pointermove=${this.onPixelPointer}>
        <defs><pattern id="draw-cells" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0V1H0" fill="none" stroke="var(--to-border)" stroke-width=${0.6 / (640 / n)} /></pattern></defs>
        <rect width=${n} height=${n} fill="var(--to-surface)" />
        ${cells}
        <rect width=${n} height=${n} fill="url(#draw-cells)" />
        <rect class="draw-cursor" x=${cx} y=${cy} width="1" height="1" fill="none" stroke="var(--to-accent)" stroke-width=${2 / (640 / n)} />
      </svg>
      <span id="draw-cursor" class="sr-only">${t('Row {y}, column {x}: {ink}', { y: cy + 1, x: cx + 1, ink: PIXEL_INKS.find((i) => i.k === p.rows[cy]?.[cx])?.name() ?? t('clear') })}</span>
      <div class="draw-tile-preview" style="background-image:${tileCss(p, 64)}" role="img" aria-label=${t('As a repeating background')}></div>
    </div>`;
  }

  /** The label, typed over its shape. */
  private renderLabel() {
    const s = this.selected;
    const value = s && s.k !== 'i' ? s.text : '';
    return html`<div class="draw-label-pop" popover="manual" @toggle=${(e: Event) => (e as ToggleEvent).newState === 'closed' && this.focusCanvas()}>
      <input type="text" class="draw-label" aria-label=${t('Label')} placeholder=${t('Label')} autocomplete="off" .value=${value}
        @input=${(e: Event) => this.patchSel({ text: (e.target as HTMLInputElement).value }, `label:${this.sel}`)}
        @keydown=${(e: KeyboardEvent) => (e.key === 'Enter' || e.key === 'Escape') && (e.preventDefault(), this.closeLabel())}
        @blur=${() => this.closeLabel(false)} />
    </div>`;
  }

  /* ---------- alt text ---------- */

  private openAlt() {
    this.altDraft = this.view.alt;
    void this.updateComplete.then(() => this.querySelector<ToDialog>('.draw-alt-dialog')?.show());
  }
  private saveAlt() {
    if (this.altDraft === null) return;
    this.edit(setAlt(this.doc, this.altDraft));
    this.querySelector<ToDialog>('.draw-alt-dialog')?.close();
  }
  /** The alt text dialog: what the drawing shows, written once, read wherever the drawing goes. */
  private renderAlt() {
    const draft = this.altDraft ?? '';
    const suggestion = describeDrawing(this.view.shapes);
    return html`<to-dialog class="draw-alt-dialog" heading=${t('Alt text')} @to-close=${() => (this.altDraft = null)} .body=${html`
      <label class="draw-alt-field"><span>${t('What does this drawing show?')}</span>
        <textarea rows="3" .value=${draft} placeholder=${suggestion || t('A diagram of…')} @input=${(e: Event) => (this.altDraft = (e.target as HTMLTextAreaElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && this.saveAlt()}></textarea>
      </label>
      <p class="to-hint">${t('Read aloud to people who cannot see it, and kept with the drawing wherever it is embedded or downloaded.')}</p>
      <div class="to-row">
        ${suggestion ? html`<button type="button" class="to-btn" @click=${() => (this.altDraft = suggestion)}>${t('Describe from the shapes')}</button>` : nothing}
        <button type="button" class="to-btn primary draw-alt-done" @click=${() => this.saveAlt()}>${icon(UI.check, 16)}<span>${t('Done')}</span></button>
      </div>`}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDrawEditor);
