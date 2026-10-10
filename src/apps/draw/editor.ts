/**
 * <to-draw-editor>: a little diagram tool, and pixel art as a grid mode. Shapes are drawn on a 640 by 400
 * canvas by tools in the bar (a key each), moved and resized by hand, their words typed on the shape itself (a
 * double tap, or Enter) in a one-line <to-text> whose bubble has the marks (the label keeps them as inline Markdown);
 * a shape in hand has the contextual bar under it (inks, style, text size, a text's alignment, rotate, edit, duplicate, front/back, copy,
 * cut, paste, delete), a round handle above it that rotates it ([ and ] rotate it by 15°), and a drag on empty canvas
 * chooses every shape inside its box. The clipboard carries shapes as a drawing of their own (TLO and our HTML).
 * Every change is operations on the document's table (model.ts).
 * In pixel mode (the Shapes/Pixels menu) the canvas is a grid of squares, painted with a pencil or a fill in
 * one of eight inks, and Background makes the grid the drawing's repeating tile.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Accessibility, ArrowDownToLine, ArrowUpToLine, Blend, Brush, Circle, ClipboardPaste, Copy, Diamond, Ellipsis, Eraser, Grid2x2, GripHorizontal, Layers, Minus, MousePointer2, MoveRight, PaintBucket, PenTool, Pencil, RotateCcw, RotateCw, Scissors, Shapes, Smile, Spline, Square, Tag, Trash2, Type, Wallpaper, ZoomIn, ZoomOut } from 'lucide';
import { btn, tool } from '../../kit/bar.ts';
import { DocElement, type Entry } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem } from '../../kit/menu.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/context.ts';
import { docToHtml, htmlToBlocks } from '../../kit/clipboard.ts';
import { textWidth } from '../../kit/draw.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { toast } from '../../kit/toast.ts';
import { zoomOf } from '../../kit/zoom.ts';
import { TILE_INKS, TILE_SIDES, tileCss, tileFilled, tilePattern, tileRef } from '../../kit/tile.ts';
import { applyAll, runLength, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { caret, insertRuns } from '../../kit/textops.ts';
import { COLORS, GRID, H, TEXT_PX, W, addShape, alignOp, nextAlign, bounds, canTurn, describeDrawing, duplicateShapes, floodSquare, iconOf, isLink, labelLines, labelPlain, labelText, linkEnds, normRot, paintSquare, pasteShapes, patchShape, patchShapes, pickShapes, readDrawing, removeShape, removeShapes, restackShapes, setAlt, setGrid, setPixels, setTile, shapesFromText, shapesTable, shapesToTlo, shapesWithin, simplify, strokeShape, turnPoint, turnedBounds, wordsOver, type Align, type Color, type DrawView, type Fill, type Kind, type Shape, type TextSize } from './model.ts';
import { TILE_SIDE, arrowDefs, shapeSvg, turnOf, type Theme } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/dialog.ts';
import '../../kit/context.ts';
import '../../kit/text.ts';
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
  | { mode: 'move'; idx: number; off: [number, number]; orig: Shape; twice: boolean }
  | { mode: 'resize'; idx: number; orig: Shape }
  | { mode: 'turn'; idx: number; orig: Shape }
  | { mode: 'marquee'; from: [number, number]; to: [number, number]; base: number[] }
  | { mode: 'free'; pts: [number, number][] };

/** How far a turn goes by the keys and the bar, and the step Shift holds a dragged turn to. */
const TURN_STEP = 15;
/** How long a Mod+C, X or V waits for the browser's own clipboard event before doing it by hand (Safari's comes late, or never). */
const CLIP_WAIT = 120;

/** A label's lines of runs as the one block the words editor holds: a line break between lines. */
export function wordsBlock(words: string): Block {
  const lines = labelLines(words);
  return { k: 'p', runs: lines.flatMap((runs, i) => (i ? [{ t: '\n' }, ...runs] : runs)).filter((r) => r.t || r.ic) };
}
/** The words editor's block back as a label's words: its line breaks are the label's " | ". */
export function blockWords(b: Block | undefined): string {
  const runs: Run[] = b && 'runs' in b ? b.runs : [];
  const lines: Run[][] = [[]];
  for (const r of runs) {
    r.t.split('\n').forEach((part, i) => {
      if (i) lines.push([]);
      if (part || r.ic) lines[lines.length - 1].push({ ...r, t: part });
    });
  }
  while (lines.length > 1 && !lines[lines.length - 1].some((r) => r.t.trim())) lines.pop();
  return labelText(lines.map((l) => l.filter((r) => r.t))).replace(/^( \| )+|( \| )+$/g, '').trim();
}

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
const SIZES: { z: TextSize; name: () => string; letter: () => string }[] = [
  { z: 1, name: () => t('Small text'), letter: () => t('S') },
  { z: 2, name: () => t('Medium text'), letter: () => t('M') },
  { z: 3, name: () => t('Large text'), letter: () => t('L') },
  { z: 4, name: () => t('Extra large text'), letter: () => t('XL') },
];
/** A text's three alignments: the bar's one button shows the one it has and goes on to the next; Mod+Shift+L, E and R set each (the Word Processor's keys, and every word processor's). */
const ALIGNS: { al: Align | ''; name: () => string; icon: typeof Square; key: string }[] = [
  { al: '', name: () => t('Align: left'), icon: UI.alignLeft, key: 'l' },
  { al: 'c', name: () => t('Align: centre'), icon: UI.alignCenter, key: 'e' },
  { al: 'r', name: () => t('Align: right'), icon: UI.alignRight, key: 'r' },
];
const alignKey = (e: KeyboardEvent) => ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey ? ALIGNS.find((x) => x.key === e.key.toLowerCase()) : undefined);

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

/** What an edit remembers of the selection: the shapes chosen before it, and after (undo and redo choose them again). */
interface Mark {
  before: number[];
  after: number[];
}
/** The size of the hit area round a handle, in CSS pixels: 44 under a finger. */
const coarse = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/** The last shapes copied here, so a paste in this page finds them when the system clipboard is refused. */
let copied: { text: string; html: string } | null = null;

/** A shape of the default size, for a tap or an Insert. */
function sized(s: Shape): Shape {
  return s.k === 'l' || s.k === 'a' ? { ...s, w: 96, h: 0 } : s.k === 't' ? { ...s, w: 96, h: 24 } : s.k === 'i' ? { ...s, w: 48, h: 48 } : { ...s, w: 96, h: 48 };
}

export class ToDrawEditor extends DocElement<DrawView> {
  static properties: PropertyDeclarations = { tool: { state: true }, picked: { state: true }, joinFrom: { state: true }, pen: { state: true }, drag: { state: true }, live: { state: true }, zoom: { state: true }, ink: { state: true }, pmode: { state: true }, cursor: { state: true }, altDraft: { state: true }, editing: { state: true } };
  declare tool: Tool;
  /** The chosen shapes, in the order they were chosen (Shift+tap adds one; Mod+A takes them all). */
  declare picked: number[];
  /** The Join tool from the keys: the shape the join starts from, chosen with the arrows and Enter; -1 for none yet. */
  declare joinFrom: number;
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
  /** The shape whose words are being typed on it, -1 for none. */
  declare editing: number;
  /** The shape as it was when its words were opened (Escape puts it back), and the icon kept out of the overlay. */
  private wordsFrom: Shape | null = null;
  private wordsIcon = '';
  /** Counts the times words are opened, so each time's typing is its own undo step. */
  private wordsTimes = 0;
  /**
   * The last Mod+C, X or V on the canvas: done by the browser's own clipboard event when it comes, or by hand when
   * it does not; whichever is first marks it done, so the other never does it again (a paste is one paste).
   */
  private press: { clip: 'copy' | 'cut' | 'paste'; done: boolean; at: number } | null = null;
  /** The words being typed on a shape, as the one block <to-text> holds. */
  private wordsBlocks: Block[] = [];
  /** The icon the next tap will place, when the icon tool is armed. */
  private stamp = '';
  private svgEl: SVGSVGElement | null = null;
  /** The last tap on a shape by a finger or a pen, so a second one soon after on the same shape edits its words. */
  private lastTap = { idx: -1, at: 0 };
  /** The fingers on the canvas, by pointer, and the pinch in hand when there are two. */
  private fingers = new Map<number, [number, number]>();
  private pinch: { dist: number; zoom: number } | null = null;
  /** Counts the pixel strokes, so each stroke is one undo step. */
  private strokes = 0;
  private painting = false;

  constructor() {
    super();
    this.tool = 'select';
    this.picked = [];
    this.joinFrom = -1;
    this.pen = [];
    this.drag = null;
    this.live = null;
    this.zoom = 1;
    this.ink = 'a';
    this.pmode = 'pen';
    this.cursor = [0, 0];
    this.altDraft = null;
    this.editing = -1;
  }
  protected read(doc: Doc): DrawView {
    return readDrawing(doc);
  }
  /** After an undo or a redo: the shapes the change was made to are chosen again, and the canvas has the focus. */
  protected undone(entry: Entry, redo: boolean) {
    if (this.editing >= 0) this.closeWords(false, false);
    this.live = null;
    this.drag = null;
    const mark = entry.mark as Mark | undefined;
    const n = this.view.shapes.length;
    this.picked = (mark ? (redo ? mark.after : mark.before) : []).filter((i) => i >= 0 && i < n);
    void this.updateComplete.then(() => this.focusCanvas());
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    // On the document: with nothing selected a browser may send the event to the body rather than the canvas.
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener);
    this.querySelector<ToContext>('.draw-context')?.hide();
    this.querySelector<ToContext>('.draw-words to-context')?.hide();
  }
  protected willUpdate(changed: Map<string, unknown>) {
    super.willUpdate(changed);
    // A new document from outside, or pixel mode: the words in hand are let go.
    if (this.editing >= 0 && (this.view.grid || !this.view.shapes[this.editing])) this.closeWords(false, false);
  }
  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);
    if (this.editing >= 0) this.placeWords();
    const bar = this.querySelector<ToContext>('.draw-context');
    if (!bar) return;
    const s = this.shapes[this.editing >= 0 ? this.editing : this.sel];
    if (!s || this.view.grid || this.drag) return void (bar.isOpen && bar.hide());
    const words = this.wordsEl;
    bar.show(this.editing >= 0 && words ? words : () => this.shapeRect());
  }

  /** The shapes as drawn right now: the document's, or the ones in motion under the pointer. */
  private get shapes(): Shape[] {
    return this.live ?? this.view.shapes;
  }
  /** The chosen shapes that are there. */
  private get chosen(): number[] {
    return this.picked.filter((i) => i >= 0 && i < this.shapes.length);
  }
  /** The one shape in hand: the last chosen; -1 for none. Set, it is the only one chosen. */
  get sel(): number {
    const c = this.chosen;
    return c.length ? c[c.length - 1] : -1;
  }
  set sel(i: number) {
    this.picked = i >= 0 ? [i] : [];
  }
  private get selected(): Shape | null {
    return this.sel >= 0 ? (this.shapes[this.sel] ?? null) : null;
  }

  /* ---------- commands ---------- */

  /** An edit, with the shapes chosen before it and after it (the ones chosen now, unless said), so undo and redo choose them again. */
  private change(ops: Op[], after: number[] = this.chosen, key?: string) {
    if (!ops.length) return;
    const mark: Mark = { before: this.chosen, after };
    this.edit(ops, key, mark);
    this.picked = after;
  }
  /** Every chosen shape changed the same way (a colour, a style, a size). */
  private patchSel(p: Partial<Shape>, key?: string) {
    const c = this.chosen;
    if (!c.length) return;
    this.change(patchShapes(this.doc, c.map((i) => [i, p])), c, key);
  }
  /** The texts in hand (or those given) set left, centred or right, as one step; false when none is a text. */
  private alignSel(al: Align | '', which = this.chosen): boolean {
    if (!which.some((i) => this.shapes[i]?.k === 't')) return false;
    this.change(alignOp(this.doc, which, al), this.chosen);
    return true;
  }
  /** A new shape, chosen, and the select tool back in hand. */
  private add(s: Shape) {
    this.change(addShape(this.doc, s), [this.view.shapes.length]);
    this.tool = 'select';
  }
  /** A shape of the default size in the middle of the canvas (a little along for each one already there), from Insert. */
  private insert(k: Kind, text = '') {
    const n = this.view.shapes.length;
    const s = sized({ k, x: 0, y: 0, w: 0, h: 0, f: 0, text });
    // Words pasted on their own make the box as wide as they are.
    if (k === 't' && text) s.w = Math.max(s.w, Math.min(W - GRID * 2, Math.ceil((textWidth(text, TEXT_PX[2]) + 8) / GRID) * GRID));
    this.add({ ...s, x: snap(clamp(W / 2 - s.w / 2 + (n % 5) * GRID * 2, 0, W - s.w)), y: snap(clamp(H / 2 - s.h / 2 + (n % 5) * GRID * 2, 0, H - s.h)) });
    if (k === 't' && !text) this.openWords();
  }
  private removeSel() {
    if (!this.chosen.length) return;
    this.change(removeShapes(this.doc, this.chosen), []);
  }
  private duplicateSel() {
    const { ops, sel } = duplicateShapes(this.doc, this.chosen);
    this.change(ops, sel);
  }
  /** The chosen shapes to the front or the back, or a place forward or back (Alt+Up/Down), together. */
  private reorder(how: boolean | 1 | -1) {
    if (!this.chosen.length) return;
    const { ops, at } = restackShapes(this.doc, this.chosen, how === true ? 'front' : how === false ? 'back' : how);
    this.change(ops, at);
  }
  /** A join from one shape to another (neither a join, not the same). */
  private join(from: number, to: number) {
    const [a, b] = [this.view.shapes[from], this.view.shapes[to]];
    if (!a || !b || from === to || isLink(a.k) || isLink(b.k)) return;
    this.add({ k: 'k', x: from, y: to, w: 0, h: 0, f: 0, text: '' });
  }
  /** The two chosen shapes, when exactly two shapes (no joins) are chosen. */
  private get pair(): [number, number] | null {
    const c = this.chosen;
    return c.length === 2 && c.every((i) => !isLink(this.shapes[i].k)) ? [c[0], c[1]] : null;
  }
  /** The chosen shapes moved by the keys (by dx, dy) or resized (by dw, dh), never off the canvas; a run of presses is one undo step. */
  private nudge(dx: number, dy: number, resize: boolean): boolean {
    const c = this.chosen.filter((i) => !isLink(this.shapes[i].k));
    if (!c.length) return false;
    const patches: [number, Partial<Shape>][] = c.map((i) => {
      const s = this.shapes[i];
      const line = s.k === 'l' || s.k === 'a';
      if (resize) {
        const w = line ? clamp(s.w + dx, -s.x, W - s.x) : clamp(s.w + dx, GRID, W - s.x);
        const h = line ? clamp(s.h + dy, -s.y, H - s.y) : clamp(s.h + dy, GRID, H - s.y);
        return [i, { w, h }];
      }
      const [x0, x1] = [Math.max(0, -s.w), Math.min(W, W - s.w)];
      const [y0, y1] = [Math.max(0, -s.h), Math.min(H, H - s.h)];
      return [i, { x: clamp(s.x + dx, x0, Math.max(x0, x1)), y: clamp(s.y + dy, y0, Math.max(y0, y1)) }];
    });
    this.change(patchShapes(this.doc, patches), this.chosen, `${resize ? 'size' : 'nudge'}:${this.chosen.join(',')}`);
    return true;
  }
  /** The chosen shapes turned by `deg` about their own centres (lines and joins stay as they are); a run of presses is one undo step. */
  private turnBy(deg: number) {
    const c = this.chosen.filter((i) => canTurn(this.shapes[i].k));
    if (!c.length) return false;
    this.change(patchShapes(this.doc, c.map((i) => [i, { rot: normRot((this.shapes[i].rot ?? 0) + deg) }])), this.chosen, `turn:${this.chosen.join(',')}`);
    return true;
  }
  /** Whether any chosen shape can be turned. */
  private get turnable(): boolean {
    return this.chosen.some((i) => canTurn(this.shapes[i].k));
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
    const name = await chooseIcon({ emoji: false, current: s ? iconOf(s.text)[0] : undefined, none: !!s && !!iconOf(s.text)[0] && s.k !== 'i' });
    this.focusCanvas();
    if (name === null) return;
    const i = this.sel;
    if (s && s.k === 'i') this.change(patchShape(this.doc, i, { text: name || s.text }), [i]);
    else if (s && !isLink(s.k)) this.change(patchShape(this.doc, i, { text: `${name ? `:${name} ` : ''}${iconOf(s.text)[1]}`.trimEnd() }), [i]);
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
  /** Where a person starts: the canvas, with the select tool and nothing chosen. */
  async focusFirst() {
    await this.updateComplete;
    this.focusCanvas();
  }
  private focusCanvas() {
    // (Without scrolling: the page must not jump under a drag that has just begun.)
    this.querySelector<HTMLElement>('.draw-wrap')?.focus({ preventScroll: true });
  }

  /** Two fingers on the canvas: the distance between them. */
  private spread(): number {
    const [a, b] = [...this.fingers.values()];
    return a && b ? Math.hypot(a[0] - b[0], a[1] - b[1]) : 0;
  }
  private onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    // No mouse events after a touch: their mousedown would take the focus from words just opened by this tap.
    e.preventDefault();
    if (e.pointerType === 'touch') {
      this.fingers.set(e.pointerId, [e.clientX, e.clientY]);
      if (this.fingers.size === 2) {
        // A second finger: a pinch, which zooms; whatever the first one began is let go.
        this.drag = null;
        this.live = null;
        this.pinch = { dist: this.spread(), zoom: this.zoom };
        return;
      }
    }
    if (this.pinch) return;
    // A tap away from words being typed is the end of them; if that took out an empty text, it is all the tap does.
    if (this.editing >= 0 && this.closeWords(false)) return;
    this.svgEl = e.currentTarget as SVGSVGElement;
    const [x, y] = this.point(e);
    const target = e.target as Element;
    const idxAttr = target.closest('[data-idx]')?.getAttribute('data-idx');
    try {
      this.svgEl.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer counts as down (a synthetic one, a finger already lifted): the drag goes on without the capture.
    }
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
      const idx = idxAttr != null ? parseInt(idxAttr, 10) : -1;
      if (target.closest('.rotor') && this.chosen.length === 1) {
        this.drag = { mode: 'turn', idx: this.sel, orig: this.shapes[this.sel] };
      } else if (target.classList.contains('handle') && this.chosen.length === 1) {
        this.drag = { mode: 'resize', idx: this.sel, orig: this.shapes[this.sel] };
      } else if (idx >= 0 && e.shiftKey) {
        // Shift+tap: the shape added to the chosen ones, or taken away from them.
        this.picked = this.chosen.includes(idx) ? this.chosen.filter((i) => i !== idx) : [...this.chosen, idx];
      } else if (idx >= 0) {
        // A second tap by a finger on the shape in hand edits its words (a touch screen may send no dblclick).
        const twice = (e.pointerType === 'touch' || e.pointerType === 'pen') && this.lastTap.idx === idx && e.timeStamp - this.lastTap.at < 400 && this.sel === idx;
        this.lastTap = { idx, at: e.timeStamp };
        // A shape among the chosen keeps them all in hand, so a drag moves them together.
        if (!this.chosen.includes(idx)) this.sel = idx;
        const s = this.shapes[idx];
        // (A join has no place of its own to move to: it goes where its shapes go.)
        if (!isLink(s.k)) this.drag = { mode: 'move', idx, off: [x - s.x, y - s.y], orig: s, twice };
      } else {
        // On nothing: a tap lets the shapes go; a drag draws a box, and the shapes inside it are chosen (Shift adds them).
        const base = e.shiftKey ? this.chosen : [];
        if (!e.shiftKey) this.sel = -1;
        this.drag = { mode: 'marquee', from: [x, y], to: [x, y], base };
      }
      return;
    }
    const shape: Shape = { k: this.tool, x: snap(x), y: snap(y), w: 0, h: 0, f: 0, text: this.tool === 't' ? t('Text') : this.tool === 'i' ? this.stamp : '' };
    this.drag = { mode: 'draw', start: [snap(x), snap(y)], shape };
  }

  private onMove(e: PointerEvent) {
    if (this.fingers.has(e.pointerId)) this.fingers.set(e.pointerId, [e.clientX, e.clientY]);
    if (this.pinch) {
      const d = this.spread();
      if (d && this.pinch.dist) this.zoom = clamp(Math.round(this.pinch.zoom * (d / this.pinch.dist) * 4) / 4, 0.5, 4);
      return;
    }
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
        // Shift makes a box a square, an ellipse a circle.
        if (e.shiftKey) {
          const m = Math.max(Math.abs(w), Math.abs(h));
          [w, h] = [(w < 0 ? -1 : 1) * m, (h < 0 ? -1 : 1) * m];
        }
        this.drag = { ...d, shape: { ...s, x: Math.min(sx, sx + w), y: Math.min(sy, sy + h), w: Math.abs(w), h: Math.abs(h) } };
      }
    } else if (d.mode === 'move') {
      // The shape under the pointer snaps to the grid; the others chosen with it go the same way.
      const dx = snap(x - d.off[0]) - d.orig.x;
      const dy = snap(y - d.off[1]) - d.orig.y;
      const moving = new Set(this.chosen.includes(d.idx) ? this.chosen : [d.idx]);
      this.live = this.view.shapes.map((s, i) => (moving.has(i) && !isLink(s.k) ? { ...s, x: s.x + dx, y: s.y + dy } : s));
    } else if (d.mode === 'marquee') {
      this.drag = { ...d, to: [x, y] };
      if (Math.hypot(x - d.from[0], y - d.from[1]) >= 4) this.picked = [...new Set([...d.base, ...shapesWithin(this.view.shapes, d.from[0], d.from[1], x, y)])];
    } else if (d.mode === 'turn') {
      // The angle from the shape's centre to the pointer, 0 straight up; Shift holds it to 15° steps.
      const s = d.orig;
      const [cx, cy] = [s.x + s.w / 2, s.y + s.h / 2];
      let deg = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
      if (e.shiftKey) deg = Math.round(deg / TURN_STEP) * TURN_STEP;
      const rot = normRot(deg) || undefined;
      this.live = this.view.shapes.map((sh, i) => (i === d.idx ? { ...sh, rot } : sh));
    } else if (d.mode === 'resize') {
      const s = d.orig;
      // A turned shape is resized in its own frame: the pointer turned back about its centre first.
      const [px, py] = s.rot ? turnPoint(x, y, s.x + s.w / 2, s.y + s.h / 2, -s.rot) : [x, y];
      let w = snap(px) - s.x;
      let h = snap(py) - s.y;
      if (s.k !== 'l' && s.k !== 'a') {
        w = Math.max(GRID, w);
        h = Math.max(GRID, h);
      }
      this.live = this.view.shapes.map((sh, i) => (i === d.idx ? { ...sh, w, h } : sh));
    }
  }

  private onUp(e: PointerEvent) {
    this.fingers.delete(e.pointerId);
    if (this.pinch) {
      if (this.fingers.size < 2) this.pinch = null;
      return;
    }
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    if (d.mode === 'free') return this.stroke(simplify(d.pts));
    if (d.mode === 'marquee') return;
    if (d.mode === 'link') {
      const over = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest('[data-idx]')?.getAttribute('data-idx');
      if (over) this.join(d.from, parseInt(over, 10));
      return;
    }
    if (d.mode === 'draw') {
      let s = d.shape;
      // A tap without a drag drops a default-sized shape.
      if (Math.abs(s.w) < GRID && Math.abs(s.h) < GRID) s = sized(s);
      if (s.k !== 'l' && s.k !== 'a') s = { ...s, x: Math.min(s.x, W - s.w), y: Math.min(s.y, H - s.h) };
      this.add(s);
      // (Here, in the pointer's own handler, so a phone lets the focus go to the words and brings up its keyboard.)
      if (s.k === 't') this.openWords();
      return;
    }
    // A move or a resize: what was shown is written, as one step.
    const live = this.live;
    this.live = null;
    if (d.mode === 'resize') {
      const r = live?.[d.idx];
      if (r) this.change(patchShape(this.doc, d.idx, { w: r.w, h: r.h }), [d.idx]);
      return;
    }
    if (d.mode === 'turn') {
      const r = live?.[d.idx];
      if (r && (r.rot ?? 0) !== (d.orig.rot ?? 0)) this.change(patchShape(this.doc, d.idx, { rot: r.rot ?? 0 }), [d.idx]);
      return;
    }
    const patches: [number, Partial<Shape>][] = (live ?? []).flatMap((s, i): [number, Partial<Shape>][] => {
      const was = this.view.shapes[i];
      return was && (s.x !== was.x || s.y !== was.y) ? [[i, { x: s.x, y: s.y }]] : [];
    });
    if (patches.length) this.change(patchShapes(this.doc, patches));
    // (Here, in the pointer's own handler, so a phone lets the focus go to the words and brings up its keyboard.)
    else if (d.twice) this.openWords(d.idx);
  }

  /* ---------- keys ---------- */

  private onKey = (e: KeyboardEvent) => {
    // The canvas's keys are for the canvas alone: never from a bar button, a field, a popover, a dialog or the words.
    const at = e.composedPath()[0] as HTMLElement;
    if (e.defaultPrevented || !at.classList?.contains('draw-wrap')) return;
    if (this.view.grid) return this.onPixelKey(e);
    const mod = e.metaKey || e.ctrlKey;
    if (this.pen.length) {
      if (e.key === 'Enter') return (e.preventDefault(), this.closePen());
      if (e.key === 'Escape') return (e.preventDefault(), void (this.pen = []));
      if (e.key === 'Backspace') return (e.preventDefault(), void (this.pen = this.pen.slice(0, -1)));
    }
    if (e.key === 'Escape') {
      // One step out per press: a join begun, then the chosen shapes, then the tool back to Select.
      if (this.drag?.mode === 'link') this.drag = null;
      else if (this.joinFrom >= 0) this.joinFrom = -1;
      else if (this.chosen.length) this.sel = -1;
      else if (this.tool !== 'select') {
        this.tool = 'select';
        this.stamp = '';
      } else return;
      return void e.preventDefault();
    }
    if (this.tool === 'k' && !mod && !e.altKey && this.joinKey(e)) return void e.preventDefault();
    const picked = TOOLS.find((x) => x.key.toLowerCase() === e.key.toLowerCase());
    if (picked && !mod && !e.altKey) {
      // K with two shapes chosen joins them; otherwise a letter picks its tool.
      const pair = this.pair;
      if (picked.id === 'k' && pair) this.join(pair[0], pair[1]);
      else {
        this.tool = picked.id;
        this.joinFrom = -1;
      }
      return;
    }
    const chosen = this.chosen;
    const lower = e.key.toLowerCase();
    if (mod && !e.altKey && !e.shiftKey && lower === 'a') {
      e.preventDefault();
      this.tool = 'select';
      this.picked = this.shapes.map((_, i) => i);
      return;
    }
    const clip = mod && !e.altKey && !e.shiftKey ? ({ c: 'copy', x: 'cut', v: 'paste' } as const)[lower as 'c' | 'x' | 'v'] : undefined;
    if (clip && (chosen.length || clip === 'paste')) {
      // Not prevented: the browser's own copy, cut or paste event follows and does it. If none comes, by hand; never both.
      const press = { clip, done: false, at: performance.now() };
      this.press = press;
      setTimeout(() => {
        if (press.done) return;
        press.done = true;
        if (clip === 'paste') void this.pasteIn();
        else this.copyOut(clip === 'cut');
      }, CLIP_WAIT);
      return;
    }
    // Mod+D is ours on the canvas, whatever is chosen (never the browser's bookmark).
    if (mod && !e.altKey && lower === 'd') return void (e.preventDefault(), this.duplicateSel());
    if (!chosen.length) return;
    const align = alignKey(e);
    if (align) return void (e.preventDefault(), this.alignSel(align.al));
    const arrow: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const step = arrow[e.key];
    if (e.key === 'Delete' || e.key === 'Backspace') this.removeSel();
    else if ((e.key === '[' || e.key === ']') && !mod && !e.altKey) {
      // [ and ] rotate the chosen shapes 15° back or on.
      if (!this.turnBy(e.key === ']' ? TURN_STEP : -TURN_STEP)) return;
    } else if (e.key === 'Enter') {
      if (chosen.length !== 1) return;
      this.openWords();
    } else if (step && e.altKey) {
      // Alt+Up/Down: a place forward or back in the stack; Alt+Left/Right are the caret's (a word at a time) and never taken.
      if (mod || !step[1]) return;
      this.reorder(step[1] < 0 ? 1 : -1);
    } else if (step) {
      // Arrows nudge by a grid step, Shift+Arrows by five; Mod+Arrows resize by one.
      const by = GRID * (e.shiftKey && !mod ? 5 : 1);
      if (!this.nudge(step[0] * by, step[1] * by, mod)) return;
    } else return;
    e.preventDefault();
  };
  /** The Join tool from the keys: the arrows go from shape to shape, Enter takes the first end and then the other, which makes the join. */
  private joinKey(e: KeyboardEvent): boolean {
    const ends = this.shapes.flatMap((s, i) => (isLink(s.k) ? [] : [i]));
    if (!ends.length) return false;
    const by = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (by) {
      const now = ends.indexOf(this.sel);
      this.sel = ends[now < 0 ? (by > 0 ? 0 : ends.length - 1) : (now + by + ends.length) % ends.length];
      return true;
    }
    if (e.key !== 'Enter' || !ends.includes(this.sel)) return false;
    if (this.joinFrom < 0 || this.joinFrom === this.sel) this.joinFrom = this.sel;
    else {
      const from = this.joinFrom;
      this.joinFrom = -1;
      this.join(from, this.sel);
    }
    return true;
  }

  /* ---------- the words, typed on the shape ---------- */

  private get wordsEl(): ToText | null {
    return this.querySelector<ToText>('to-text.draw-words');
  }
  /** The canvas's scale: CSS pixels to a canvas unit. */
  private scale(): number {
    const svg = this.querySelector<SVGSVGElement>('svg.draw-canvas');
    return svg ? svg.getBoundingClientRect().width / W : 1;
  }
  /** The chosen shapes' box on the screen (as they show, turned), the handle with it: where the contextual bar goes under. */
  private shapeRect(): DOMRect | null {
    const c = this.chosen;
    const svg = this.querySelector<SVGSVGElement>('svg.draw-canvas');
    if (!c.length || !svg) return null;
    const r = svg.getBoundingClientRect();
    const k = r.width / W;
    const boxes = c.map((i) => turnedBounds(this.shapes[i], this.shapes));
    const [x, y] = [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1]))];
    const [x1, y1] = [Math.max(...boxes.map((b) => b[0] + b[2])), Math.max(...boxes.map((b) => b[1] + b[3]))];
    return new DOMRect(r.left + (x - 4) * k, r.top + (y - 4) * k, (x1 - x + 10) * k, (y1 - y + 10) * k);
  }
  /**
   * The shape's words in the editor over it, focused and all selected, synchronously: called from the tap's,
   * the key's or the button's own handler, so iOS lets the focus in and raises the keyboard. An icon shape
   * opens the icon picker instead.
   */
  private openWords(i = this.sel) {
    const s = this.view.shapes[i];
    const el = this.wordsEl;
    if (!s || !el || this.view.grid) return;
    if (s.k === 'i') return void this.pickIcon();
    const [ic, words] = iconOf(s.text);
    this.sel = i;
    this.editing = i;
    this.wordsFrom = s;
    this.wordsIcon = ic;
    this.wordsTimes++;
    this.wordsBlocks = [wordsBlock(words)];
    el.blocks = this.wordsBlocks;
    el.hidden = false;
    this.placeWords();
    // The focus now, in this handler (a phone's keyboard comes up only so); the selection once the words are drawn.
    el.tx?.focus({ preventScroll: true });
    el.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: runLength(this.wordsBlocks[0].k === 'p' ? this.wordsBlocks[0].runs : []) } };
  }
  /**
   * The editor put exactly over the shape's words: the same font at the size the canvas shows it, centred in
   * the shape (from the left, for a text), turned with it. Below 16px it is set at 16 and scaled down, so iOS does not zoom.
   */
  private placeWords() {
    const el = this.wordsEl;
    const s = this.shapes[this.editing];
    const svg = this.querySelector<SVGSVGElement>('svg.draw-canvas');
    const stage = svg?.parentElement;
    if (!el || !s || !svg || !stage) return;
    const r = svg.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    // Measured on the screen, set in the stage's own lengths: under the size of everything those are `z` times smaller.
    const z = zoomOf(stage);
    const w = wordsOver(s, this.shapes, r.width / W / z, (r.left - sr.left) / z, (r.top - sr.top) / z, THEME);
    Object.assign(el.style, w.style);
    el.classList.toggle('left', w.left);
    el.classList.toggle('wrap', w.wrap);
  }
  /** The editor's words as the label writes them: lines joined by " | ", the marks as inline Markdown, the icon put back in front. */
  private wordsText(): string {
    const words = blockWords(this.wordsBlocks[0]);
    const ic = this.wordsIcon;
    return ic ? (words ? `:${ic} ${words}` : `:${ic}`) : words;
  }
  /** The words editor's ops: applied to its block, handed back, and the shape's label (and a text's box, grown to hold its words) written, so the picture follows. */
  private onWordsOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    this.applyWords(e.detail.ops);
  };
  private applyWords(ops: Op[]) {
    const el = this.wordsEl;
    const i = this.editing;
    const s = this.view.shapes[i];
    if (!s || !el) return;
    const blocks = applyAll({ head: {}, blocks: this.wordsBlocks }, ops).blocks;
    // One line of words: anything that came as more blocks is folded into the first, a line break between.
    const runs = blocks.flatMap((b, n) => [...(n ? [{ t: '\n' }] : []), ...('runs' in b ? b.runs : [])]);
    this.wordsBlocks = [{ k: 'p', runs }];
    el.blocks = this.wordsBlocks;
    const patch: Partial<Shape> = { text: this.wordsText() };
    if (s.k === 't' && this.wordsFrom) {
      const range = document.createRange();
      range.selectNodeContents(el.tx);
      const k = this.scale();
      const wide = range.getBoundingClientRect().width / k + 8;
      const lines = Math.max(1, (patch.text!.match(/ \| /g)?.length ?? 0) + 1);
      const tall = lines * TEXT_PX[s.z ?? 2] * 1.25 + 6;
      const up = (n: number) => Math.ceil(n / GRID) * GRID;
      const w = Math.max(this.wordsFrom.w, Math.min(W - s.x, up(wide)));
      const h = Math.max(this.wordsFrom.h, up(tall));
      if (w !== s.w) patch.w = w;
      if (h !== s.h) patch.h = h;
    }
    this.change(patchShape(this.doc, i, patch), [i], `label:${i}:${this.wordsTimes}`);
  }
  /** Enter is done; Shift+Enter a line break, which the label keeps as " | ". */
  private onWordsEnter = (e: CustomEvent<{ shift: boolean }>) => {
    e.stopPropagation();
    const el = this.wordsEl;
    if (!e.detail.shift || !el) return void this.closeWords();
    const runs = this.wordsBlocks[0]?.k === 'p' ? this.wordsBlocks[0].runs : [];
    const r = insertRuns(this.wordsBlocks, el.sel ?? caret(0, runLength(runs)), [{ t: '\n' }]);
    this.applyWords(r.ops);
    el.sel = r.sel;
  };
  /** Escape, once <to-text> has closed its boxes and let a range go: the words as they were when editing began, in the same undo step as the typing. */
  private onWordsKey = (e: KeyboardEvent) => {
    const align = !e.isComposing && !e.defaultPrevented ? alignKey(e) : undefined;
    if (align) return void (e.preventDefault(), e.stopPropagation(), this.alignSel(align.al, [this.editing]));
    if (e.isComposing || e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    const was = this.wordsFrom;
    const i = this.editing;
    if (was && this.view.shapes[i]) this.change(patchShape(this.doc, i, { text: was.text, w: was.w, h: was.h }), [i], `label:${i}:${this.wordsTimes}`);
    this.closeWords(true, false);
  };
  /** The focus gone from the words (not into their own bubble or link box): done with them. */
  private onWordsBlur = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (this.editing < 0 || (to && this.wordsEl?.contains(to))) return;
    this.closeWords(false);
  };
  /** Done with the words: the editor hidden, a text left with no words taken out (true then), the focus back on the canvas. */
  private closeWords(back = true, tidy = true): boolean {
    const i = this.editing;
    if (i < 0) return false;
    this.editing = -1;
    this.wordsFrom = null;
    this.wordsBlocks = [];
    const el = this.wordsEl;
    if (el) {
      el.querySelector<ToContext>('to-context')?.hide();
      el.hidden = true;
      el.blocks = this.wordsBlocks;
    }
    const s = this.view.shapes[i];
    const gone = tidy && s?.k === 't' && !labelPlain(s.text).trim();
    if (gone) this.change(removeShape(this.doc, i), []);
    if (back) this.focusCanvas();
    return gone;
  }

  /* ---------- the clipboard ---------- */

  /** What copy puts on the clipboard for the shape in hand: the drawing of it in TLO, and our HTML of that table. Null when nothing can be copied. */
  private clip(): { text: string; html: string } | null {
    if (!this.chosen.length) return null;
    const shapes = pickShapes(this.view.shapes, this.chosen);
    if (!shapes.length) return null;
    return (copied = { text: shapesToTlo(shapes), html: docToHtml([shapesTable(shapes)]) });
  }
  /** Pasted text into the drawing: shapes (a drawing's table) beside where they were, or a line of words as a text in the middle. */
  private pasteText(text: string) {
    const shapes = shapesFromText(text);
    if (shapes.length) {
      const { ops, all } = pasteShapes(this.doc, shapes);
      this.change(ops, all);
      this.tool = 'select';
      return;
    }
    const words = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' | ');
    if (words) this.insert('t', words);
  }
  /** Copy, cut and paste from the keys, while the canvas has the focus (the overlay's words are the browser's own). */
  private onClipboard = (e: ClipboardEvent) => {
    const wrap = this.querySelector<HTMLElement>('.draw-wrap');
    if (!wrap || this.view.grid || this.editing >= 0 || document.activeElement !== wrap) return;
    // The key's paste already done by hand (the browser's event came late): not again.
    const press = this.press;
    if (press && press.clip === e.type && performance.now() - press.at < 2000) {
      if (press.done && e.type === 'paste') return void e.preventDefault();
      press.done = true;
    }
    const dt = e.clipboardData;
    if (e.type === 'paste') {
      // The text first (ours is the drawing in TLO); HTML alone is read as blocks, so a table pasted from elsewhere comes in too.
      const html = dt?.getData('text/html') ?? '';
      let text = dt?.getData('text/plain') ?? '';
      if (!text.trim() && html) text = write({ head: {}, blocks: htmlToBlocks(html) });
      if (!text.trim()) return;
      e.preventDefault();
      return this.pasteText(text);
    }
    const c = this.clip();
    if (!c || !dt) return;
    e.preventDefault();
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') this.removeSel();
  };
  /** The bar's Copy and Cut: the system clipboard as the page may write it, and this page's own memory of it. */
  private copyOut(cut: boolean) {
    const c = this.clip();
    if (!c) return;
    const plain = () => navigator.clipboard?.writeText(c.text).catch(() => undefined);
    try {
      void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([c.text], { type: 'text/plain' }), 'text/html': new Blob([c.html], { type: 'text/html' }) })]).catch(plain);
    } catch {
      void plain();
    }
    if (cut) this.removeSel();
  }
  /** The bar's Paste: the system clipboard's words if the page may read them, else what was last copied here. */
  private async pasteIn() {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      // Refused: this page's own copy.
    }
    text ||= copied?.text ?? '';
    if (text) this.pasteText(text);
  }

  /* ---------- pixel mode ---------- */

  private paint(x: number, y: number, flood = false) {
    const p = this.view.pixels;
    const next = flood ? floodSquare(p, x, y, this.ink) : paintSquare(p, x, y, this.ink);
    if (next !== p) this.edit(setPixels(this.doc, next), flood || !this.painting ? undefined : `pixels:${this.strokes}`);
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
      // Each stroke is its own undo step, however long it takes and however soon the next one comes.
      this.strokes++;
      this.painting = true;
      this.paint(at[0], at[1], this.pmode === 'fill');
    } else if (e.type === 'pointermove' && e.buttons && at && this.pmode === 'pen') this.paint(at[0], at[1]);
    else if (e.type === 'pointerup' || e.type === 'pointercancel') this.painting = false;
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
      { group: t('More'), label: t('Paste'), icon: ClipboardPaste, hint: 'Mod+V', does: () => void this.pasteIn() },
    ];
  }
  private modeItems(): MenuItem[] {
    const grid = this.view.grid;
    return [
      { label: t('Shapes'), icon: Shapes, checked: !grid, does: () => this.edit(setGrid(this.doc, 0)) },
      ...TILE_SIDES.map((n) => ({ label: t('Pixels {n}×{n}', { n }), icon: Grid2x2, checked: grid === n, does: () => this.edit(setGrid(this.doc, n)) })),
      ...(this.view.tile && !grid ? [{ group: t('Background'), label: t('Remove the background tile'), icon: Trash2, does: () => this.edit(setTile(this.doc, '')) }] : []),
    ];
  }
  private arrangeItems(): MenuItem[] {
    const s = this.selected;
    const many = this.chosen.length > 1;
    return [
      { label: t('Bring to front'), icon: ArrowUpToLine, disabled: !s, does: () => this.reorder(true) },
      { label: t('Send to back'), icon: ArrowDownToLine, disabled: !s, does: () => this.reorder(false) },
      { label: t('Duplicate'), icon: Copy, hint: 'Mod+D', disabled: !s || (!many && isLink(s.k)), does: () => this.duplicateSel() },
      { label: t('Delete'), icon: Trash2, hint: 'Delete', disabled: !s, does: () => this.removeSel() },
    ];
  }
  /**
   * The contextual bar under the shape in hand: inks | fill or line style | text size | edit the words,
   * duplicate, front, back | copy, cut, paste | delete. While its words are typed, under them: size and ink only.
   */
  private contextItems(): ContextEntry[] {
    const i = this.editing >= 0 ? this.editing : this.sel;
    const s = this.shapes[i];
    if (!s || this.view.grid) return [];
    const inks: ContextEntry[] = INKS.map((ink) => ({ label: ink.name(), swatch: ink.hex, pressed: (s.c ?? '') === ink.c, does: () => this.patchSel({ c: (ink.c || undefined) as Color | undefined }) }));
    const sizes: ContextEntry[] = s.k === 'i' ? [] : SIZES.map((x) => ({ label: x.name(), text: x.letter(), pressed: (s.z ?? 2) === x.z, does: () => this.patchSel({ z: x.z === 2 ? undefined : x.z }) }));
    // A text's alignment, beside its size: the one it has, and a tap for the next.
    const texts = this.editing >= 0 ? [i] : this.chosen;
    const now = ALIGNS.find((x) => x.al === (s.al ?? '')) ?? ALIGNS[0];
    const align: ContextEntry[] = texts.every((j) => this.shapes[j]?.k === 't') ? [{ label: now.name(), icon: now.icon, keys: `Mod+Shift+${now.key.toUpperCase()}`, does: () => this.alignSel(nextAlign(s.al), texts) }] : [];
    if (this.editing >= 0) return [...sizes, ...align, SEP, ...inks];
    const turns: ContextEntry[] = this.turnable
      ? [
          { label: t('Rotate left'), icon: RotateCcw, keys: '[', does: () => this.turnBy(-TURN_STEP) },
          { label: t('Rotate right'), icon: RotateCw, keys: ']', does: () => this.turnBy(TURN_STEP) },
        ]
      : [];
    const tail: ContextEntry[] = [
      SEP,
      { label: t('Copy'), icon: UI.copy, keys: 'Mod+C', disabled: isLink(s.k) && this.chosen.length < 2, does: () => this.copyOut(false) },
      { label: t('Cut'), icon: Scissors, keys: 'Mod+X', disabled: isLink(s.k) && this.chosen.length < 2, does: () => this.copyOut(true) },
      { label: t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', does: () => void this.pasteIn() },
      SEP,
      { label: t('Delete'), icon: Trash2, keys: 'Delete', does: () => this.removeSel() },
    ];
    const lineLike = (k: Kind) => k === 'l' || k === 'a' || isLink(k) || k === 'w';
    const fillsOf = (line: boolean): { f: Fill; label: string; icon: typeof Square }[] =>
      line
        ? [{ f: 0, label: t('Solid line'), icon: Minus }, { f: 1, label: t('Dashed line'), icon: GripHorizontal }, { f: 2, label: t('Dotted line'), icon: Ellipsis }]
        : [{ f: 0, label: t('No fill'), icon: Square }, { f: 1, label: t('Grey fill'), icon: Blend }, { f: 2, label: t('Solid fill'), icon: PaintBucket }];
    if (this.chosen.length > 1) {
      // Several in hand: what can be done to them all (a style when they are all lines, or all shapes with an inside), and a join when they are two.
      const pair = this.pair;
      const kinds = this.chosen.map((j) => this.shapes[j].k).filter((k) => k !== 't' && k !== 'i');
      const allLines = kinds.length > 0 && kinds.every(lineLike);
      const allShapes = kinds.length > 0 && kinds.every((k) => !lineLike(k));
      const look = allLines || allShapes ? fillsOf(allLines) : [];
      const same = (f: Fill) => this.chosen.every((j) => this.shapes[j].k === 't' || this.shapes[j].k === 'i' || this.shapes[j].f === f);
      return [
        ...inks,
        ...(look.length ? [SEP as ContextEntry, ...look.map((x): ContextEntry => ({ label: x.label, icon: x.icon, pressed: same(x.f), does: () => this.patchSel({ f: x.f }) }))] : []),
        SEP,
        ...sizes,
        ...align,
        SEP,
        ...turns,
        ...(pair ? [{ label: t('Join two shapes'), icon: Spline, keys: 'K', does: () => this.join(pair[0], pair[1]) }] : []),
        { label: t('Duplicate'), icon: Copy, keys: 'Mod+D', does: () => this.duplicateSel() },
        { label: t('Bring to front'), icon: ArrowUpToLine, does: () => this.reorder(true) },
        { label: t('Send to back'), icon: ArrowDownToLine, does: () => this.reorder(false) },
        ...tail,
      ];
    }
    const fills = fillsOf(lineLike(s.k));
    const style: ContextEntry[] = s.k === 't' || s.k === 'i' ? [] : [SEP as ContextEntry, ...fills.map((x) => ({ label: x.label, icon: x.icon, pressed: s.f === x.f, does: () => this.patchSel({ f: x.f }) }))];
    const link = isLink(s.k);
    return [
      ...inks,
      ...style,
      ...(sizes.length ? ([SEP, ...sizes, ...align] as ContextEntry[]) : []),
      SEP,
      ...turns,
      s.k === 'i' ? { label: t('Change the icon'), icon: Smile, keys: 'Enter', does: () => this.openWords() } : { label: t('Edit the words'), icon: Tag, keys: 'Enter', does: () => this.openWords() },
      { label: t('Duplicate'), icon: Copy, keys: 'Mod+D', disabled: link, does: () => this.duplicateSel() },
      { label: t('Bring to front'), icon: ArrowUpToLine, does: () => this.reorder(true) },
      { label: t('Send to back'), icon: ArrowDownToLine, does: () => this.reorder(false) },
      ...tail,
    ];
  }

  /* ---------- drawing ---------- */

  /** One line under the bar saying what the hand in play does; always there, so nothing jumps. */
  private hint(): string {
    if (this.view.grid) return t('Tap or drag to paint; the arrow keys move, Enter paints.');
    if (this.tool === 'v' || this.pen.length) return t('Tap each corner; tap the first again, or press Enter, to close it.');
    if (this.tool === 'f') return t('Drag to draw; end where you began to close it into a shape.');
    if (this.tool === 'k') return this.joinFrom >= 0 ? t('Now the other shape: tap it, or choose it with the arrows and press Enter.') : t('Press on one shape and let go on another.');
    if (this.tool === 'i') return t('Tap where the icon goes.');
    if (this.tool !== 'select') return t('Drag on the canvas to draw it, or tap to place one.');
    if (this.editing >= 0) return t('Type the words; Enter is done, Shift+Enter starts a new line, Escape puts them back.');
    if (this.chosen.length > 1) return t('Drag to move them together; Shift and a tap adds a shape or takes it away.');
    if (this.selected) return t('Drag to move; the corner handle resizes, the round one rotates; Enter or a double tap edits the words.');
    return t('Tap a shape to select it, or drag round shapes to choose them; choose a tool to draw.');
  }

  render() {
    const v = this.view;
    return html`${v.grid ? this.renderPixelBar() : this.renderBar()}
      <p class="draw-hint to-hint">${this.hint()}</p>
      ${v.grid ? this.renderPixels() : this.renderCanvas()}
      <to-context class="draw-context" .label=${t('The shape in hand')} .items=${this.contextItems()}></to-context>
      ${this.renderAlt()}`;
  }

  private renderBar() {
    const v = this.view;
    const s = this.selected;
    const label = v.grid ? t('Pixels {n}×{n}', { n: v.grid }) : t('Shapes');
    return html`<to-bar class="draw-bar">
      <to-insert .items=${this.inserts()}></to-insert>
      <to-menu class="draw-mode" .label=${label} .icon=${v.grid ? Grid2x2 : Shapes} caret .items=${this.modeItems()}></to-menu>
      ${TOOLS.map((x) => tool({ label: x.name(), icon: x.icon, keys: x.key, pressed: this.tool === x.id, does: () => (this.tool = x.id) }))}
      ${tool({ label: s && !isLink(s.k) ? t('Put an icon on this shape') : t('Place an icon'), icon: Smile, keep: true, pressed: this.tool === 'i', does: () => void this.pickIcon() })}
      <to-menu class="draw-arrange" icon-only .label=${t('Arrange')} .icon=${Layers} .items=${this.arrangeItems()}></to-menu>
      <button type="button" class="to-btn draw-alt ${v.alt ? 'has' : ''}" aria-label=${v.alt ? t('Alt text: {alt}', { alt: v.alt }) : t('Add alt text: describe this drawing for people who cannot see it')} title=${v.alt ? t('Alt text: {alt}', { alt: v.alt }) : t('Add alt text: describe this drawing for people who cannot see it')} @click=${() => this.openAlt()}>${v.alt ? icon(UI.check, 16) : icon(Accessibility, 18)}<span>${t('Alt')}</span></button>
      ${tool({ label: t('Zoom out'), icon: ZoomOut, disabled: this.zoom <= 0.5, does: () => this.zoomBy(-0.25) })}
      ${tool({ label: t('Zoom in'), icon: ZoomIn, disabled: this.zoom >= 4, does: () => this.zoomBy(0.25) })}
      ${this.undoTools()}
    </to-bar>`;
  }

  private renderPixelBar() {
    const v = this.view;
    return html`<to-bar class="draw-bar">
      <to-menu class="draw-mode" .label=${t('Pixels {n}×{n}', { n: v.grid })} .icon=${Grid2x2} caret .items=${this.modeItems()}></to-menu>
      ${PIXEL_INKS.map((ink) => html`<button type="button" class="to-btn to-tool draw-swatch" aria-label=${ink.name()} title=${ink.name()} aria-pressed=${String(this.ink === ink.k)} @click=${() => (this.ink = ink.k)}><span class="to-swatch" style="--swatch:${TILE_INKS[ink.k]}" aria-hidden="true"></span></button>`)}
      ${tool({ label: t('Eraser'), icon: Eraser, pressed: this.ink === '.', does: () => (this.ink = '.') })}
      ${tool({ label: t('Pencil'), icon: Pencil, pressed: this.pmode === 'pen', does: () => ((this.pmode = 'pen'), this.ink === '.' && (this.ink = 'a')) })}
      ${tool({ label: t('Fill'), icon: PaintBucket, pressed: this.pmode === 'fill', does: () => ((this.pmode = 'fill'), this.ink === '.' && (this.ink = 'a')) })}
      ${tool({ label: t('Clear the grid'), icon: Trash2, disabled: !tileFilled(v.pixels), does: () => this.clearPixels() })}
      ${btn({ label: t('Background'), hint: t('Use as background'), icon: Wallpaper, disabled: !tileFilled(v.pixels), does: () => this.useAsBackground() })}
      ${this.undoTools()}
    </to-bar>`;
  }

  /** Drawn by the same code that makes the picture everywhere else (view.ts). */
  private renderShape(s: Shape, i: number, ghost = false) {
    // The shape whose words are being typed is drawn without them: the overlay holds them, nothing doubles.
    const drawn = i >= 0 && i === this.editing ? { ...s, text: '' } : s;
    return svg`<g data-idx=${i} class=${ghost ? '' : 'shape'} opacity=${ghost ? 0.6 : 1}>${unsafeSVG(shapeSvg(drawn, this.shapes, THEME, true))}</g>`;
  }
  /** Each chosen shape outlined; one alone has its handle (with a 44px hit area round it under a finger). */
  private renderSelection() {
    const c = this.chosen;
    const marks = c.map((i) => {
      const s = this.shapes[i];
      if (isLink(s.k)) {
        const ends = linkEnds(s, this.shapes);
        return ends ? svg`<line x1=${ends[0]} y1=${ends[1]} x2=${ends[2]} y2=${ends[3]} stroke="var(--to-accent)" stroke-width="6" stroke-linecap="round" opacity="0.35" pointer-events="none" />` : nothing;
      }
      const [x, y, w, h] = bounds(s, this.shapes);
      // A turned shape's outline turns with it.
      return svg`<rect x=${x - 3} y=${y - 3} width=${w + 6} height=${h + 6} transform=${turnOf(s) || nothing} fill="none" stroke="var(--to-accent)" stroke-dasharray="4 3" pointer-events="none" />`;
    });
    const s = c.length === 1 ? this.shapes[c[0]] : null;
    if (!s || isLink(s.k)) return marks;
    // The handle is at the shape's end: its far corner, or where its line stops. A shape that turns has a round handle above its top's middle.
    const [hx, hy] = [s.x + s.w, s.y + s.h];
    const hit = coarse() ? 44 / this.scale() : 0;
    const turns = canTurn(s.k);
    const [rx, ry] = [s.x + s.w / 2, s.y - 22];
    return svg`${marks}<g transform=${turnOf(s) || nothing}>${hit > 12 ? svg`<rect class="handle handle-hit" x=${hx - hit / 2} y=${hy - hit / 2} width=${hit} height=${hit} fill="transparent" />` : nothing}
      <rect class="handle" x=${hx - 6} y=${hy - 6} width="12" height="12" fill="var(--to-surface)" stroke="var(--to-accent)" stroke-width="2" />
      ${turns
        ? svg`<g class="rotor" role="presentation"><line x1=${rx} y1=${s.y - 3} x2=${rx} y2=${ry + 6} stroke="var(--to-accent)" stroke-width="1.5" pointer-events="none" />
          ${hit > 12 ? svg`<circle class="rotor-hit" cx=${rx} cy=${ry} r=${hit / 2} fill="transparent" />` : nothing}
          <circle cx=${rx} cy=${ry} r="6" fill="var(--to-surface)" stroke="var(--to-accent)" stroke-width="2" /></g>`
        : nothing}</g>`;
  }

  private renderCanvas() {
    const v = this.view;
    const d = this.drag;
    const from = d?.mode === 'link' ? this.shapes[d.from] : null;
    const tile = v.tile;
    return html`<div class="draw-wrap" tabindex="0" role="application" aria-label=${t('Drawing canvas. V selects; R, E, D, L, A, T draw; arrows nudge; [ and ] rotate; Enter edits the words; Delete removes.')} @wheel=${(e: WheelEvent) => {
      // Ctrl (or a pinch on a trackpad) and the wheel zoom; the wheel alone scrolls as usual.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      this.zoomBy(-Math.sign(e.deltaY) * 0.25);
    }}>
      <div class="draw-stage" style="width:${this.zoom * 100}%">
      <svg class="draw-canvas ${this.tool === 'select' ? '' : 'tool'} ${d ? 'held' : ''} ${this.zoom <= 1 ? 'fit' : ''}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label=${v.alt || describeDrawing(v.shapes) || t('An empty drawing')}
        @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onUp}
        @dblclick=${() => (this.pen.length ? this.closePen() : this.editing < 0 && this.chosen.length === 1 && this.openWords())}>
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
        ${this.renderSelection()}
        ${d?.mode === 'marquee' && Math.hypot(d.to[0] - d.from[0], d.to[1] - d.from[1]) >= 4
          ? svg`<rect class="draw-marquee" x=${Math.min(d.from[0], d.to[0])} y=${Math.min(d.from[1], d.to[1])} width=${Math.abs(d.to[0] - d.from[0])} height=${Math.abs(d.to[1] - d.from[1])} fill="var(--to-accent)" fill-opacity="0.08" stroke="var(--to-accent)" stroke-dasharray="5 4" pointer-events="none" />`
          : nothing}
      </svg>
      <to-text class="draw-words" hidden shape="line" marks-only label=${t('The words of the shape')} .blocks=${this.wordsBlocks}
        @text-ops=${this.onWordsOps} @text-enter=${this.onWordsEnter} @text-selectall=${(e: Event) => e.stopPropagation()} @text-exit=${(e: Event) => e.stopPropagation()} @keydown=${this.onWordsKey} @focusout=${this.onWordsBlur}></to-text>
      </div>
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
        @pointerdown=${this.onPixelPointer} @pointermove=${this.onPixelPointer} @pointerup=${this.onPixelPointer} @pointercancel=${this.onPixelPointer}>
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
        <textarea rows="3" .value=${draft} placeholder=${suggestion || t('A diagram of…')} @input=${(e: Event) => (this.altDraft = (e.target as HTMLTextAreaElement).value)} @keydown=${(e: KeyboardEvent) => {
          // Enter is Done (the alt text is one paragraph); Shift+Enter is left to the field.
          if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
          e.preventDefault();
          this.saveAlt();
        }}></textarea>
      </label>
      <p class="to-hint">${t('Read aloud to people who cannot see it, and kept with the drawing wherever it is embedded or downloaded.')}</p>
      <div class="to-row">
        ${suggestion ? html`<button type="button" class="to-btn" @click=${() => (this.altDraft = suggestion)}>${t('Describe from the shapes')}</button>` : nothing}
        <button type="button" class="to-btn primary draw-alt-done" @click=${() => this.saveAlt()}>${icon(UI.check, 16)}<span>${t('Done')}</span></button>
      </div>`}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDrawEditor);
