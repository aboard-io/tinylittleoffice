/**
 * <to-pinboard-editor>: a board without edges, to pin notes, words, pictures and frames to, draw on with a pen and join
 * with arrows. A drag on the board moves it (so does a trackpad, or the wheel), a pinch or Ctrl and the wheel zoom it
 * about the pointer, and Fit everything brings the whole board into view. The tools in the bar (a letter each) put a
 * thing where the board is tapped, or as large as a drag; the pen draws while it is held; the arrow joins the thing it
 * is pressed on to the thing it is let go on. With Select, a tap takes a thing in hand (Shift adds or takes one away),
 * Shift and a drag on the board chooses every thing inside the box, a drag moves what is in hand (a frame carries what
 * it holds), the corner's handle resizes it, and a double tap types its words on it (a frame's title, a picture's
 * description). The context bar under what is in hand has its colors, its words, Connect, an arrowhead, Bring to
 * front, Duplicate, Cut, Copy, Paste and Delete (what is cut or copied is kept in the page, a frame with what it holds,
 * and the clipboard gets its words; a paste of those words is the things again). A picture pasted or dropped goes to the page's host (`host.images`) and is pinned where
 * it lands. Read-only, the board is moved and zoomed and nothing else. Every change is operations on the document's
 * table (model.ts), so two editors sharing one document through "docops" and `applyRemote` meet in the same board;
 * what is in hand is kept by id, so it stays in hand while others add and take away around it.
 */
import { html, nothing, svg, type PropertyDeclarations, type PropertyValues } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { cmdTool } from '../../kit/ui/bar.ts';
import { contextOf, drawnIn, runKey } from '../../kit/core/commands.ts';
import COMMANDS, { CANVAS_KEYS, TOOLS, type Tool } from './commands.ts';
import { DocElement, type Entry } from '../../kit/core/element.ts';
import { t } from '../../kit/core/i18n.ts';
import { toast } from '../../kit/core/say.ts';
import type { ContextEntry, ToContext } from '../../kit/ui/context.ts';
import { chooseImageFile, imagesKept, imageUrl, putImage } from '../../kit/draw/image-picture.ts';
import { applyAll, runLength, type Block, type Doc, type Op } from '../../doc/index.ts';
import type { TextOps, ToText } from '../../kit/text/text.ts';
import {
  MIN,
  SIZES,
  addItem,
  addPicture,
  clipOf,
  boundsOf,
  boxOf,
  drawOrder,
  duplicateItems,
  nameOf,
  pasteItems,
  frameHolds,
  isJoin,
  itemsWithin,
  joinEnds,
  joinItems,
  moveItems,
  newId,
  patchItem,
  patchItems,
  penStroke,
  readBoard,
  removeItems,
  runsWords,
  setAlt,
  simplify,
  toFront,
  wordsRuns,
  type BoardView,
  type Clip,
  type Box,
  type Color,
  type Item,
  type Kind,
  type Patch,
} from './model.ts';
import { NOTE_PAD, WORDS_PX, arrowDefs, describeBoard, itemSvg, layWords, type Theme } from './view.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/context.ts';
import '../../kit/text/text.ts';
import './style.css';

export const tag = 'to-pinboard-editor';

/** The page's own colors, so a board looks right in the dark too (a note stays paper). */
const THEME: Theme = { ink: 'var(--to-ink)', paper: 'var(--to-surface)', line: 'var(--to-border-strong)', shade: 'var(--to-surface-2)', muted: 'var(--to-ink-3)' };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** How far a pointer moves before a press is a drag, in screen pixels. */
const SLOP = 4;
/** The arrows' step, in board pixels (Shift: five of them). */
const NUDGE = 8;

type Drag =
  | { mode: 'pan'; start: [number, number]; o: [number, number]; moved: boolean }
  | { mode: 'move'; ids: string[]; from: [number, number]; at: [number, number]; moved: boolean; twice: boolean; id: string }
  | { mode: 'resize'; id: string; orig: Item; at: [number, number] }
  | { mode: 'marquee'; from: [number, number]; to: [number, number]; base: string[] }
  | { mode: 'place'; k: 'note' | 'text' | 'frame'; from: [number, number]; to: [number, number] }
  | { mode: 'pen'; pts: [number, number][] }
  | { mode: 'link'; from: string; to: [number, number] };

/** Two fingers on the board: where they began, and the board's place and zoom then. */
interface Pinch {
  d0: number;
  mid0: [number, number];
  z0: number;
  o0: [number, number];
}

/** What an edit remembers of what was in hand: the ids before it and after it (undo and redo take them up again). */
interface Mark {
  before: string[];
  after: string[];
}

/** Each board on a page draws its dots by a pattern of its own. */
let boards = 0;

export class ToPinboardEditor extends DocElement<BoardView> {
  static properties: PropertyDeclarations = {
    tool: { state: true },
    picked: { state: true },
    zoom: { state: true },
    ox: { state: true },
    oy: { state: true },
    drag: { state: true },
    live: { state: true },
    editing: { state: true },
    size: { state: true },
  };
  declare tool: Tool;
  /** The things in hand, by id, in the order they were taken. */
  declare picked: string[];
  /** The board's scale (screen pixels to a board pixel), and where its origin is on the screen, from the canvas's corner. */
  declare zoom: number;
  declare ox: number;
  declare oy: number;
  declare drag: Drag | null;
  /** The things as shown while they move or are resized: each one's patch; the document is written when the pointer lifts. */
  declare live: Map<string, Patch> | null;
  /** The thing whose words (or a picture's description) are typed on it, by id; null for none. */
  declare editing: { id: string; alt: boolean } | null;
  /** The canvas's size on the screen. */
  declare size: [number, number];
  readonly minZoom = 0.1;
  readonly maxZoom = 4;
  private readonly dots = `pin-dots-${++boards}`;
  /** The board has been brought into view for this document; and since, moved or zoomed by the person (until then it is fitted again as its box changes size). */
  private placed = false;
  private moved = false;
  private resizer: ResizeObserver | null = null;
  private pointers = new Map<number, [number, number]>();
  private pinch: Pinch | null = null;
  /** The words being typed, as the one block <to-text> holds; what they were (Escape puts them back); how many times words were opened (each time its own undo step). */
  private wordsBlocks: Block[] = [];
  private wordsFrom: { words: string; alt: string; h: number } | null = null;
  private wordsTimes = 0;
  private lastTap = { id: '', at: 0 };
  /**
   * The things last cut or copied (kept in the page; the clipboard gets their words), where they were cut from, and how
   * many times they were put down here since: each paste a little further along.
   */
  clip: (Clip & { text: string; cut: boolean; times: number }) | null = null;
  private pasteWait = 0;

  constructor() {
    super();
    this.tool = 'select';
    this.picked = [];
    this.zoom = 1;
    this.ox = 0;
    this.oy = 0;
    this.drag = null;
    this.live = null;
    this.editing = null;
    this.size = [0, 0];
  }
  protected read(doc: Doc): BoardView {
    return readBoard(doc);
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    document.addEventListener('paste', this.onPaste);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    document.removeEventListener('paste', this.onPaste);
    this.resizer?.disconnect();
    this.resizer = null;
    this.querySelector<ToContext>('.pin-context')?.hide();
  }
  protected willUpdate(changed: PropertyValues) {
    // A document from outside (not this editor's own echo, nor another's ops it took in) is brought into view afresh.
    if (changed.has('value') && this.hasUpdated && !this.ours(this.value)) this.placed = this.moved = false;
    super.willUpdate(changed);
    if (this.editing && !this.view.byId.has(this.editing.id)) this.closeWords(false, false);
  }
  protected firstUpdated() {
    const canvas = this.canvas;
    if (!canvas || typeof ResizeObserver !== 'function') return;
    this.resizer = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect();
      if (r.width === this.size[0] && r.height === this.size[1]) return;
      this.size = [r.width, r.height];
      if (!this.moved) this.placed = false;
    });
    this.resizer.observe(canvas);
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (!this.placed && this.size[0] > 0) {
      this.placed = true;
      this.fit(1);
    }
    if (this.editing) this.placeWords();
    const bar = this.querySelector<ToContext>('.pin-context');
    if (!bar) return;
    if (!this.chosen.length || this.editing || this.drag || this.readOnly) return void (bar.isOpen && bar.hide());
    bar.show(() => this.chosenRect());
  }
  /** After an undo or a redo: what the change was made to is in hand again, and the board has the focus. */
  protected undone(entry: Entry, redo: boolean) {
    if (this.editing) this.closeWords(false, false);
    this.live = null;
    this.drag = null;
    const mark = entry.mark as Mark | undefined;
    this.picked = mark ? (redo ? mark.after : mark.before) : [];
    void this.updateComplete.then(() => this.focusBoard());
  }

  /* ---------- what is shown, and in hand ---------- */

  private get canvas(): SVGSVGElement | null {
    return this.querySelector<SVGSVGElement>('svg.pin-canvas');
  }
  /** The board as drawn right now: the document's, with what is moving where the pointer has it. */
  get shown(): BoardView {
    const live = this.live;
    if (!live) return this.view;
    const items = this.view.items.map((i) => (live.has(i.id) ? { ...i, ...live.get(i.id) } : i));
    const byId = new Map<string, Item>();
    for (const i of items) if (!byId.has(i.id)) byId.set(i.id, i);
    return { ...this.view, items, byId };
  }
  /** The ids in hand that are on the board. */
  get chosen(): string[] {
    return this.picked.filter((id) => this.view.byId.has(id));
  }
  get chosenItems(): Item[] {
    return this.chosen.map((id) => this.shown.byId.get(id)!);
  }
  /** The thing in hand: the last taken; null for none. */
  get held(): Item | null {
    const c = this.chosen;
    return c.length ? (this.shown.byId.get(c[c.length - 1]) ?? null) : null;
  }
  /** The two things in hand, when exactly two things (no joins) are. */
  get pair(): [string, string] | null {
    const c = this.chosenItems;
    return c.length === 2 && c.every((i) => !isJoin(i.k)) ? [c[0].id, c[1].id] : null;
  }

  /* ---------- commands ---------- */

  /** An edit, with what was in hand before it and after it (what is in hand now, unless said), so undo and redo take it up again. */
  private change(ops: Op[], after: string[] = this.chosen, key?: string) {
    if (!ops.length) return;
    this.edit(ops, key, { before: this.chosen, after } satisfies Mark);
    this.picked = after;
  }
  private freshId(k: Kind): string {
    return newId(k, this.view.byId);
  }
  /** The middle of the board as it is shown, in board pixels. */
  private middle(): [number, number] {
    const [w, h] = this.size;
    return [(w / 2 - this.ox) / this.zoom, (h / 2 - this.oy) / this.zoom];
  }
  /** A thing of a kind put at a place (its top-left), the default size, in hand; a note, words and a frame have their words opened. */
  private put(k: 'note' | 'text' | 'frame', x: number, y: number, w = SIZES[k][0], h = SIZES[k][1]) {
    const id = this.freshId(k);
    this.change(addItem(this.doc, { id, k, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), color: '', words: '' }), [id]);
    this.tool = 'select';
    this.openWords(id);
  }
  /** Insert ▾: a thing in the middle of what is shown, a little along for each thing already there. */
  insert(k: 'note' | 'text' | 'frame') {
    const [cx, cy] = this.middle();
    const [w, h] = SIZES[k];
    const step = (this.view.items.length % 6) * 16;
    this.put(k, cx - w / 2 + step, cy - h / 2 + step);
  }
  colorSel(c: Color | '') {
    const items = this.chosenItems.filter((i) => i.k !== 'picture');
    this.change(
      patchItems(
        this.doc,
        items.map((i) => [i.id, { color: c === 'yellow' && i.k === 'note' && !i.color ? '' : c }]),
      ),
    );
  }
  removeSel() {
    this.change(removeItems(this.doc, this.chosen), []);
  }
  duplicateSel() {
    const { ops, ids } = duplicateItems(this.doc, this.chosen);
    this.change(ops, ids);
  }
  /** Cut or Copy: what is in hand (a frame with what it holds, and the joins among them) kept to be put down again; the clipboard gets their words. */
  copySel(cut: boolean) {
    const clip = clipOf(this.doc, this.withHeld(this.chosen));
    if (!clip.items.length) return;
    const n = clip.items.length;
    const text = clip.items.map(nameOf).filter(Boolean).join('\n') || t('pinboard-board-of-n-things', { n });
    this.clip = { ...clip, text, cut, times: 0 };
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    if (cut)
      this.change(
        removeItems(
          this.doc,
          clip.items.map((i) => i.id),
        ),
        [],
      );
  }
  /**
   * Paste: what was cut or copied, put down with new ids. Where it came from is in view, a little along each time (a
   * cut, first where it was); otherwise in the middle of what is shown.
   */
  pasteClip() {
    clearTimeout(this.pasteWait);
    const c = this.clip;
    if (!c || this.readOnly) return;
    const x0 = Math.min(...c.items.map((i) => i.x)),
      y0 = Math.min(...c.items.map((i) => i.y));
    const x1 = Math.max(...c.items.map((i) => i.x + i.w)),
      y1 = Math.max(...c.items.map((i) => i.y + i.h));
    const [mx, my] = this.middle();
    const [hw, hh] = this.size.map((s) => s / 2 / this.zoom);
    const near = Math.abs((x0 + x1) / 2 - mx) < hw && Math.abs((y0 + y1) / 2 - my) < hh;
    let dx: number, dy: number;
    if (near) {
      dx = dy = (c.cut ? 0 : 24) * ++c.times;
    } else {
      c.times = 0;
      [dx, dy] = [Math.round(mx - (x0 + x1) / 2), Math.round(my - (y0 + y1) / 2)];
    }
    c.cut = false;
    const { ops, ids } = pasteItems(this.doc, c, dx, dy);
    this.change(ops, ids);
    this.tool = 'select';
  }
  front() {
    this.change(toFront(this.doc, this.chosen));
  }
  connect(from: string, to: string) {
    const id = this.freshId('arrow');
    this.change(joinItems(this.doc, from, to, id), [id]);
  }
  /** An arrow becomes a line, and lines become arrows. */
  toggleHead() {
    const joins = this.chosenItems.filter((i) => isJoin(i.k));
    const k = joins.every((i) => i.k === 'arrow') ? 'line' : 'arrow';
    this.change(
      patchItems(
        this.doc,
        joins.map((i) => [i.id, { k }]),
      ),
    );
  }
  pickTool(id: Tool) {
    this.tool = id;
    if (id !== 'select') this.picked = [];
  }
  /** Escape, a step out a press: a drag let go, then the tool back to Select, then nothing in hand; false with nothing to step out of. */
  stepOut(): boolean {
    if (this.drag) {
      this.drag = null;
      this.live = null;
    } else if (this.tool !== 'select') this.tool = 'select';
    else if (this.chosen.length) this.picked = [];
    else return false;
    return true;
  }
  chooseAll() {
    this.tool = 'select';
    this.picked = this.view.items.map((i) => i.id);
  }
  /** The arrows move what is in hand by a step, Shift by five; a run of presses is one undo step. */
  nudgeKey(e: KeyboardEvent): boolean {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const s = step[e.key];
    if (!s) return false;
    const by = NUDGE * (e.shiftKey ? 5 : 1);
    const ops = moveItems(this.doc, this.withHeld(this.chosen), s[0] * by, s[1] * by);
    if (!ops.length) return false;
    this.change(ops, this.chosen, `nudge:${this.chosen.join(',')}`);
    return true;
  }
  /** What moves with these: themselves, and what each frame among them holds. */
  private withHeld(ids: string[]): string[] {
    const v = this.view;
    const out = new Set(ids);
    for (const id of ids) {
      const it = v.byId.get(id);
      if (it?.k === 'frame') for (const h of frameHolds(v, it)) out.add(h);
    }
    return [...out].filter((id) => !isJoin(v.byId.get(id)!.k));
  }

  /* ---------- the view: where the board is, and how large ---------- */

  /** A point on the screen as a point of the board. */
  private toBoard(clientX: number, clientY: number): [number, number] {
    const r = this.canvas!.getBoundingClientRect();
    return [(clientX - r.left - this.ox) / this.zoom, (clientY - r.top - this.oy) / this.zoom];
  }
  /** Zoomed by a factor about a point of the canvas (its middle by default), that point staying where it is. */
  zoomBy(f: number, at?: [number, number]) {
    this.moved = true;
    const [px, py] = at ?? [this.size[0] / 2, this.size[1] / 2];
    const z = clamp(this.zoom * f, this.minZoom, this.maxZoom);
    this.ox = px - ((px - this.ox) * z) / this.zoom;
    this.oy = py - ((py - this.oy) * z) / this.zoom;
    this.zoom = z;
  }
  /** Everything brought into view, no larger than `most` times (two, from the bar); an empty board at its own size, its origin near the corner. */
  fit(most = 2) {
    const [w, h] = this.size;
    const box = boundsOf(this.view);
    if (!box || !w || !h) {
      this.zoom = 1;
      this.ox = 32;
      this.oy = 32;
      return;
    }
    const pad = 32;
    const z = clamp(Math.min((w - pad * 2) / Math.max(box[2], 1), (h - pad * 2) / Math.max(box[3], 1), most), this.minZoom, this.maxZoom);
    this.zoom = z;
    this.ox = w / 2 - (box[0] + box[2] / 2) * z;
    this.oy = h / 2 - (box[1] + box[3] / 2) * z;
  }
  async focusFirst() {
    await this.updateComplete;
    this.focusBoard();
  }
  private focusBoard() {
    this.querySelector<HTMLElement>('.pin-wrap')?.focus({ preventScroll: true });
  }
  /** What is in hand, on the screen: where the context bar goes. */
  private chosenRect(): DOMRect | null {
    const canvas = this.canvas;
    const boxes = this.chosenItems.map((i) => boxOf(i, this.shown)).filter((b): b is Box => !!b);
    if (!canvas || !boxes.length) return null;
    const r = canvas.getBoundingClientRect();
    const x0 = Math.min(...boxes.map((b) => b[0]));
    const y0 = Math.min(...boxes.map((b) => b[1]));
    const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
    const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
    const z = this.zoom;
    const left = clamp(r.left + this.ox + x0 * z, r.left, r.right);
    const top = clamp(r.top + this.oy + y0 * z, r.top, r.bottom);
    const right = clamp(r.left + this.ox + x1 * z + 6, r.left, r.right);
    const bottom = clamp(r.top + this.oy + y1 * z + 6, r.top, r.bottom);
    return new DOMRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
  }

  /* ---------- the pointer ---------- */

  private idAt(target: EventTarget | null): string | null {
    return (target as Element | null)?.closest?.('[data-id]')?.getAttribute('data-id') ?? null;
  }
  private onDown(e: PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    const canvas = this.canvas!;
    const r = canvas.getBoundingClientRect();
    this.pointers.set(e.pointerId, [e.clientX - r.left, e.clientY - r.top]);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer counts as down: the drag goes on without the capture.
    }
    if (this.pointers.size === 2) return this.startPinch();
    if (this.pointers.size > 2 || this.pinch) return;
    // A press away from words being typed is the end of them.
    if (this.editing) this.closeWords(false);
    this.focusBoard();
    const at = this.toBoard(e.clientX, e.clientY);
    const screen = this.pointers.get(e.pointerId)!;
    const id = this.idAt(e.target);
    const pan = (): Drag => ({ mode: 'pan', start: screen, o: [this.ox, this.oy], moved: false });
    if (this.readOnly) return void (this.drag = pan());
    if (this.tool === 'pen') return void (this.drag = { mode: 'pen', pts: [at] });
    if (this.tool === 'arrow') {
      const it = id ? this.view.byId.get(id) : undefined;
      this.drag = it && !isJoin(it.k) ? { mode: 'link', from: it.id, to: at } : pan();
      return;
    }
    if (this.tool !== 'select') return void (this.drag = { mode: 'place', k: this.tool, from: at, to: at });
    if ((e.target as Element).closest('.pin-handle') && this.chosen.length === 1) {
      const it = this.view.byId.get(this.chosen[0])!;
      return void (this.drag = { mode: 'resize', id: it.id, orig: it, at });
    }
    if (id && e.shiftKey) {
      this.picked = this.chosen.includes(id) ? this.chosen.filter((x) => x !== id) : [...this.chosen, id];
      return;
    }
    if (id) {
      // A second tap by a finger on the thing in hand types its words (a touch screen may send no dblclick).
      const twice = e.pointerType !== 'mouse' && this.lastTap.id === id && e.timeStamp - this.lastTap.at < 400 && this.chosen.length === 1 && this.chosen[0] === id;
      this.lastTap = { id, at: e.timeStamp };
      if (!this.chosen.includes(id)) this.picked = [id];
      this.drag = { mode: 'move', ids: this.withHeld(this.chosen), from: at, at, moved: false, twice, id };
      return;
    }
    if (e.shiftKey) return void (this.drag = { mode: 'marquee', from: at, to: at, base: this.chosen });
    this.drag = pan();
  }
  private onMove(e: PointerEvent) {
    const canvas = this.canvas;
    if (!canvas || !this.pointers.has(e.pointerId)) return;
    const r = canvas.getBoundingClientRect();
    const screen: [number, number] = [e.clientX - r.left, e.clientY - r.top];
    this.pointers.set(e.pointerId, screen);
    if (this.pinch) return this.movePinch();
    const d = this.drag;
    if (!d) return;
    const at = this.toBoard(e.clientX, e.clientY);
    if (d.mode === 'pan') {
      const moved = d.moved || Math.hypot(screen[0] - d.start[0], screen[1] - d.start[1]) > SLOP;
      if (moved) {
        this.moved = true;
        this.ox = d.o[0] + screen[0] - d.start[0];
        this.oy = d.o[1] + screen[1] - d.start[1];
      }
      if (moved !== d.moved) this.drag = { ...d, moved };
    } else if (d.mode === 'move') {
      const [dx, dy] = [Math.round(at[0] - d.from[0]), Math.round(at[1] - d.from[1])];
      const moved = d.moved || Math.hypot(dx, dy) * this.zoom > SLOP;
      if (!moved) return;
      this.drag = { ...d, at, moved };
      this.live = new Map(d.ids.map((id) => [id, { x: this.view.byId.get(id)!.x + dx, y: this.view.byId.get(id)!.y + dy }]));
    } else if (d.mode === 'resize') {
      const o = d.orig;
      let w = Math.max(MIN, Math.round(o.w + at[0] - d.at[0]));
      let h = Math.max(MIN, Math.round(o.h + at[1] - d.at[1]));
      // A picture keeps its shape.
      if (o.k === 'picture') h = Math.max(MIN, Math.round((w * o.h) / o.w));
      if (o.k === 'text') h = this.textHeight({ ...o, w });
      this.live = new Map([[o.id, { w, h }]]);
      this.drag = { ...d };
    } else if (d.mode === 'marquee') {
      this.drag = { ...d, to: at };
      if (Math.hypot(at[0] - d.from[0], at[1] - d.from[1]) * this.zoom > SLOP) this.picked = [...new Set([...d.base, ...itemsWithin(this.view, d.from[0], d.from[1], at[0], at[1])])];
    } else if (d.mode === 'place' || d.mode === 'link') {
      this.drag = { ...d, to: at };
    } else if (d.mode === 'pen') {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(at[0] - last[0], at[1] - last[1]) * this.zoom >= 2) this.drag = { ...d, pts: [...d.pts, at] };
    }
  }
  private onUp(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    if (this.pinch) {
      if (this.pointers.size < 2) this.pinch = null;
      return;
    }
    const d = this.drag;
    this.drag = null;
    if (!d || e.type === 'pointercancel') return void (this.live = null);
    if (d.mode === 'pan') {
      // A tap on the board with nothing else: what was in hand is let go.
      if (!d.moved && !this.readOnly) this.picked = [];
      return;
    }
    if (d.mode === 'marquee') return;
    if (d.mode === 'pen') {
      const id = this.freshId('pen');
      const s = penStroke(simplify(d.pts, 1.5 / this.zoom), id);
      if (s && (s.w > 2 || s.h > 2)) this.change(addItem(this.doc, s), this.chosen);
      return;
    }
    if (d.mode === 'link') {
      const over = this.idAt(document.elementFromPoint(e.clientX, e.clientY));
      if (over && over !== d.from) this.connect(d.from, over);
      this.tool = 'select';
      return;
    }
    if (d.mode === 'place') {
      const [x0, y0, x1, y1] = [Math.min(d.from[0], d.to[0]), Math.min(d.from[1], d.to[1]), Math.max(d.from[0], d.to[0]), Math.max(d.from[1], d.to[1])];
      const [w, h] = SIZES[d.k];
      // A tap puts one of the default size there; a drag one as large as the drag.
      if ((x1 - x0) * this.zoom < 12 && (y1 - y0) * this.zoom < 12) this.put(d.k, x0 - (d.k === 'text' ? 0 : w / 2), y0 - (d.k === 'text' ? h / 2 : h / 2));
      else this.put(d.k, x0, y0, Math.max(MIN, x1 - x0), d.k === 'text' ? h : Math.max(MIN, y1 - y0));
      return;
    }
    const live = this.live;
    this.live = null;
    if (d.mode === 'resize') {
      const p = live?.get(d.id);
      if (p) this.change(patchItem(this.doc, d.id, p), [d.id]);
      return;
    }
    // A move: what was shown is written, one op a thing; a second tap on the thing in hand types its words.
    if (d.moved) this.change(moveItems(this.doc, d.ids, Math.round(d.at[0] - d.from[0]), Math.round(d.at[1] - d.from[1])));
    else if (d.twice) this.openWords(d.id);
  }
  private startPinch() {
    // A second finger: whatever the first began is let go.
    this.drag = null;
    this.live = null;
    const [a, b] = [...this.pointers.values()];
    this.pinch = { d0: Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])), mid0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], z0: this.zoom, o0: [this.ox, this.oy] };
  }
  private movePinch() {
    const p = this.pinch!;
    const [a, b] = [...this.pointers.values()];
    const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const z = clamp((p.z0 * Math.hypot(a[0] - b[0], a[1] - b[1])) / p.d0, this.minZoom, this.maxZoom);
    this.moved = true;
    // The point of the board that was under the fingers stays under them.
    const [wx, wy] = [(p.mid0[0] - p.o0[0]) / p.z0, (p.mid0[1] - p.o0[1]) / p.z0];
    this.zoom = z;
    this.ox = mid[0] - wx * z;
    this.oy = mid[1] - wy * z;
  }
  /** A trackpad's two fingers or the wheel move the board; with Ctrl (a trackpad's pinch) or Mod they zoom it about the pointer. */
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = this.canvas!.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) return this.zoomBy(Math.exp(-e.deltaY * 0.01), [e.clientX - r.left, e.clientY - r.top]);
    const k = e.deltaMode === 1 ? 16 : 1;
    this.moved = true;
    this.ox -= e.deltaX * k;
    this.oy -= e.deltaY * k;
  };
  private onDouble(e: MouseEvent) {
    if (this.readOnly) return;
    // The pointer's capture sends the click to the board itself: what is under the pointer is asked of the page.
    const id = this.idAt(e.target) ?? this.idAt(document.elementFromPoint(e.clientX, e.clientY));
    if (id && this.view.byId.get(id)?.k !== 'pen') this.openWords(id);
  }

  /* ---------- keys, pictures, paste ---------- */

  /** The board's keys (commands.ts), for the board alone: never from a bar button, a field, a popover or the words. */
  private onKey = (e: KeyboardEvent) => {
    const at = e.composedPath()[0] as HTMLElement;
    if (e.defaultPrevented || !at.classList?.contains('pin-wrap') || this.readOnly) return;
    // Mod+V is the browser's (a paste event, onPaste); where none comes (Safari, to a canvas), what was copied anyway
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'v' && this.clip && this.editing === null) {
      clearTimeout(this.pasteWait);
      this.pasteWait = window.setTimeout(() => this.pasteClip(), 150);
    }
    runKey(e, CANVAS_KEYS, this);
  };
  /** Insert ▾ Picture…: a file from the device, pinned in the middle of what is shown. */
  async choosePicture() {
    const file = await chooseImageFile();
    if (file) await this.pinPicture(file, this.middle());
  }
  /** A picture file put to the host and pinned with its middle at a point of the board, no larger than a frame grab is shown. */
  private async pinPicture(file: File, at: [number, number]) {
    if (!imagesKept()) return void toast(t('common-picture-not-kept-here'));
    const fence = await putImage(file, file.name);
    if (!fence) return;
    const [fw, fh] = [Number(fence.a?.kv?.w) || 0, Number(fence.a?.kv?.h) || 0];
    const [bw, bh] = SIZES.picture;
    const k = fw && fh ? Math.min(bw / fw, bh / fh, 1) : 1;
    const [w, h] = fw && fh ? [Math.max(MIN, Math.round(fw * k)), Math.max(MIN, Math.round(fh * k))] : [bw, bh];
    const id = this.freshId('picture');
    this.change(addPicture(this.doc, { id, k: 'picture', x: Math.round(at[0] - w / 2), y: Math.round(at[1] - h / 2), w, h, color: '', words: '' }, fence), [id]);
    this.tool = 'select';
  }
  /** Things copied here are pasted as themselves; a picture pasted goes to the host; words pasted are a note. Only while the board has the focus. */
  private onPaste = (e: ClipboardEvent) => {
    if (this.readOnly || this.editing || document.activeElement !== this.querySelector('.pin-wrap')) return;
    clearTimeout(this.pasteWait);
    // the clipboard still holding the words of what was copied here: those things (anything newer is pasted as itself)
    if (this.clip && !e.clipboardData?.files?.length && (e.clipboardData?.getData('text/plain') ?? '') === this.clip.text) {
      e.preventDefault();
      return void this.pasteClip();
    }
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      return void this.pinPicture(file, this.middle());
    }
    const words = (e.clipboardData?.getData('text/plain') ?? '').replace(/\s+/g, ' ').trim();
    if (!words) return;
    e.preventDefault();
    const [cx, cy] = this.middle();
    const [w, h] = SIZES.note;
    const id = this.freshId('note');
    this.change(addItem(this.doc, { id, k: 'note', x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h, color: '', words: runsWords([{ t: words }]) }), [id]);
  };
  private onDragOver(e: DragEvent) {
    if (this.readOnly || !e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = imagesKept() ? 'copy' : 'none';
  }
  private onDrop(e: DragEvent) {
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (this.readOnly || !files.length) return;
    e.preventDefault();
    const at = this.toBoard(e.clientX, e.clientY);
    void (async () => {
      for (const [n, f] of files.entries()) await this.pinPicture(f, [at[0] + n * 24, at[1] + n * 24]);
    })();
  }

  /* ---------- the words, typed on the thing ---------- */

  private get wordsEl(): ToText | null {
    return this.querySelector<ToText>('to-text.pin-words');
  }
  /** A text's height for its words at its width. */
  private textHeight(it: Pick<Item, 'words' | 'w'>): number {
    const laid = layWords(it.words || ' ', it.w, WORDS_PX.text);
    return Math.max(SIZES.text[1], Math.ceil(laid.lines.length * laid.px * 1.3 + 4));
  }
  /**
   * The words of a thing in the editor over it, focused and all chosen, synchronously: called from the tap's, the
   * key's or the button's own handler, so iOS lets the focus in and raises the keyboard. A picture's are its description.
   */
  openWords(id = this.held?.id) {
    const it = id ? this.view.byId.get(id) : undefined;
    const el = this.wordsEl;
    if (!it || !el || this.readOnly || it.k === 'pen' || (it.k === 'picture' && !it.image)) return;
    const alt = it.k === 'picture';
    const words = alt ? (it.image?.alt ?? '') : it.words;
    this.picked = [it.id];
    this.editing = { id: it.id, alt };
    this.wordsFrom = { words: it.words, alt: it.image?.alt ?? '', h: it.h };
    this.wordsTimes++;
    const runs = alt ? [{ t: words }] : wordsRuns(words);
    this.wordsBlocks = [{ k: 'p', runs: runs.filter((r) => r.t) }];
    el.blocks = this.wordsBlocks;
    el.hidden = false;
    el.classList.toggle('pin-alt', alt);
    this.placeWords();
    el.tx?.focus({ preventScroll: true });
    el.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: runLength(this.wordsBlocks[0].k === 'p' ? this.wordsBlocks[0].runs : []) } };
  }
  /** The editor laid over the thing's words: its font at the size the board shows it (at 16px or more, scaled, so iOS does not zoom), as wide as they wrap. */
  private placeWords() {
    const el = this.wordsEl;
    const ed = this.editing;
    const it = ed ? this.shown.byId.get(ed.id) : undefined;
    if (!el || !it) return;
    const z = this.zoom;
    let [x, y, room, px] = [it.x, it.y, it.w, WORDS_PX.text];
    if (ed!.alt) [x, y, room, px] = [it.x, it.y + it.h + 6, Math.max(160, it.w), 14];
    else if (it.k === 'note') [x, y, room, px] = [it.x + NOTE_PAD, it.y + NOTE_PAD - 2, it.w - NOTE_PAD * 2, WORDS_PX.note];
    else if (it.k === 'frame') [x, y, room, px] = [it.x + 14, it.y + 6, Math.max(24, it.w - 28), WORDS_PX.frame];
    else if (isJoin(it.k)) {
      const e = joinEnds(it, this.shown);
      if (!e) return;
      [room, px] = [160, WORDS_PX.join];
      [x, y] = [(e[0] + e[2]) / 2 - room / 2, (e[1] + e[3]) / 2 - px];
    }
    const size = px * z;
    const font = Math.max(16, size);
    const shrink = size / font;
    Object.assign(el.style, {
      left: `${this.ox + x * z}px`,
      top: `${this.oy + y * z}px`,
      fontSize: `${font}px`,
      width: `${(room * z) / shrink}px`,
      transform: `scale(${shrink})`,
      fontWeight: it.k === 'frame' && !ed!.alt ? '600' : '',
      textAlign: isJoin(it.k) ? 'center' : '',
    });
    el.classList.toggle('pin-on-paper', it.k === 'note' && !ed!.alt);
  }
  private onWordsOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    const el = this.wordsEl;
    const ed = this.editing;
    const it = ed ? this.view.byId.get(ed.id) : undefined;
    if (!el || !ed || !it) return;
    const blocks = applyAll({ head: {}, blocks: this.wordsBlocks }, e.detail.ops).blocks;
    // One line of words: anything that came as more blocks is folded into the first.
    const runs = blocks.flatMap((b, n) => [...(n ? [{ t: ' ' }] : []), ...('runs' in b ? b.runs : [])]);
    this.wordsBlocks = [{ k: 'p', runs }];
    el.blocks = this.wordsBlocks;
    const key = `words:${it.id}:${this.wordsTimes}`;
    if (ed.alt) return this.change(setAlt(this.doc, it.id, runs.map((r) => r.t).join('')), [it.id], key);
    const words = runsWords(runs);
    const patch: Patch = { words };
    if (it.k === 'text') patch.h = this.textHeight({ words, w: it.w });
    this.change(patchItem(this.doc, it.id, patch), [it.id], key);
  };
  /** Escape, once <to-text> has closed its boxes: the words as they were, in the same undo step as the typing. */
  private onWordsKey = (e: KeyboardEvent) => {
    if (e.isComposing || e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    const ed = this.editing;
    const was = this.wordsFrom;
    if (ed && was && this.view.byId.has(ed.id)) {
      const key = `words:${ed.id}:${this.wordsTimes}`;
      if (ed.alt) this.change(setAlt(this.doc, ed.id, was.alt), [ed.id], key);
      else this.change(patchItem(this.doc, ed.id, { words: was.words, ...(this.view.byId.get(ed.id)!.k === 'text' ? { h: was.h } : {}) }), [ed.id], key);
    }
    this.closeWords(true, false);
  };
  private onWordsBlur = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (!this.editing || (to && this.wordsEl?.contains(to))) return;
    this.closeWords(false);
  };
  /** Done with the words: the editor hidden, words on nothing left with none taken out, the focus back on the board. */
  private closeWords(back = true, tidy = true) {
    const ed = this.editing;
    if (!ed) return;
    this.editing = null;
    this.wordsFrom = null;
    this.wordsBlocks = [];
    const el = this.wordsEl;
    if (el) {
      el.querySelector<ToContext>('to-context')?.hide();
      el.hidden = true;
      el.blocks = this.wordsBlocks;
    }
    const it = this.view.byId.get(ed.id);
    if (tidy && it?.k === 'text' && !it.words.trim()) this.change(removeItems(this.doc, [it.id]), []);
    if (back) this.focusBoard();
  }

  /* ---------- drawing ---------- */

  private hint(): string {
    if (this.readOnly) return t('pinboard-hint-read');
    if (this.editing) return t('pinboard-hint-typing');
    if (this.tool === 'pen') return t('pinboard-hint-pen');
    if (this.tool === 'arrow') return t('pinboard-hint-arrow');
    if (this.tool !== 'select') return t('pinboard-hint-place');
    if (this.chosen.length) return t('pinboard-hint-chosen');
    return t('pinboard-hint-select');
  }

  render() {
    const own = (id: string) => COMMANDS.find((c) => c.id === `pinboard.${id}`)!;
    const zoom = html`${cmdTool(own('zoomout'), this, { keep: false })} ${cmdTool(own('zoomin'), this, { keep: false })} ${cmdTool(own('fit'), this, { keep: false })}`;
    return html`${
      this.readOnly
        ? html`<div class="pin-bar pin-read-bar" role="toolbar" aria-label=${t('common-pinboard')}>${zoom}</div>`
        : html`<to-bar class="pin-bar">
            <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
            ${TOOLS.map((x) => cmdTool(own(`tool.${x.id}`), this, { keep: false }))} ${zoom} ${this.undoTools()}
          </to-bar>`
    }
      <p class="pin-hint to-hint">${this.hint()}</p>
      ${this.renderBoard()}
      <to-context class="pin-context" .label=${t('pinboard-in-hand')} .items=${this.readOnly ? [] : (contextOf(COMMANDS, this) as ContextEntry[])}></to-context>`;
  }

  private renderBoard() {
    const v = this.shown;
    const z = this.zoom;
    const d = this.drag;
    const ed = this.editing;
    // The dots step out as the board zooms out, so they never crowd.
    let step = 24 * z;
    while (step < 12) step *= 2;
    const href = (ref: string) => imageUrl(ref);
    const items = drawOrder(v).map((it) => {
      const body = itemSvg(it, v, THEME, { href, hit: true, noWords: !!ed && ed.id === it.id && !ed.alt });
      return body ? svg`<g data-id=${it.id} class="pin-item pin-${it.k}">${unsafeSVG(body)}</g>` : nothing;
    });
    return html`<div class="pin-wrap" tabindex="0" role="application" aria-roledescription=${t('common-pinboard')} aria-label=${describeBoard(this.view)}
      @dragover=${this.onDragOver} @drop=${this.onDrop}>
      <svg class="pin-canvas ${this.tool === 'select' ? '' : 'tool'} ${d?.mode === 'pan' && d.moved ? 'panning' : ''}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
        @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onUp} @wheel=${this.onWheel} @dblclick=${this.onDouble}>
        <defs>
          <pattern id=${this.dots} width=${step} height=${step} x=${this.ox} y=${this.oy} patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="var(--to-border-strong)" /></pattern>
          ${unsafeSVG(arrowDefs('var(--to-ink)'))}
        </defs>
        <rect class="pin-ground" width="100%" height="100%" fill="url(#${this.dots})" />
        <g transform="translate(${this.ox} ${this.oy}) scale(${z})">
          ${items}
          ${this.renderDrag()}
          ${this.readOnly ? nothing : this.renderChosen()}
        </g>
      </svg>
      <to-text class="pin-words" hidden shape="line" marks-only label=${t('common-edit-words')} .blocks=${this.wordsBlocks}
        @text-ops=${this.onWordsOps} @text-enter=${(e: Event) => (e.stopPropagation(), this.closeWords())} @text-selectall=${(e: Event) => e.stopPropagation()} @text-exit=${(e: Event) => e.stopPropagation()}
        @keydown=${this.onWordsKey} @focusout=${this.onWordsBlur}></to-text>
    </div>`;
  }

  /** What a drag in progress shows: a stroke, an arrow from its thing, the box a tool or Shift draws. */
  private renderDrag() {
    const d = this.drag;
    const z = this.zoom;
    if (d?.mode === 'pen')
      return svg`<polyline points=${d.pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--to-ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" pointer-events="none" />`;
    if (d?.mode === 'link') {
      const from = this.view.byId.get(d.from);
      if (!from) return nothing;
      return svg`<line x1=${from.x + from.w / 2} y1=${from.y + from.h / 2} x2=${d.to[0]} y2=${d.to[1]} stroke="var(--to-accent)" stroke-width=${2 / z} stroke-dasharray=${`${6 / z} ${4 / z}`} pointer-events="none" />`;
    }
    if (d?.mode === 'marquee' || d?.mode === 'place') {
      const [x, y, w, h] = [Math.min(d.from[0], d.to[0]), Math.min(d.from[1], d.to[1]), Math.abs(d.to[0] - d.from[0]), Math.abs(d.to[1] - d.from[1])];
      if ((w + h) * z < SLOP) return nothing;
      return svg`<rect class="pin-marquee" x=${x} y=${y} width=${w} height=${h} fill="var(--to-accent)" fill-opacity="0.08" stroke="var(--to-accent)" stroke-width=${1 / z} stroke-dasharray=${`${5 / z} ${4 / z}`} pointer-events="none" />`;
    }
    return nothing;
  }

  /** Each thing in hand outlined; one alone has its corner's handle (larger under a finger). */
  private renderChosen() {
    const v = this.shown;
    const z = this.zoom;
    const items = this.chosenItems;
    const marks = items.map((it) => {
      if (isJoin(it.k)) {
        const e = joinEnds(it, v);
        return e ? svg`<line x1=${e[0]} y1=${e[1]} x2=${e[2]} y2=${e[3]} stroke="var(--to-accent)" stroke-width=${8 / z} stroke-linecap="round" opacity="0.35" pointer-events="none" />` : nothing;
      }
      const pad = 4 / z;
      return svg`<rect x=${it.x - pad} y=${it.y - pad} width=${it.w + pad * 2} height=${it.h + pad * 2} fill="none" stroke="var(--to-accent)" stroke-width=${1.5 / z} stroke-dasharray=${`${4 / z} ${3 / z}`} pointer-events="none" />`;
    });
    const it = items.length === 1 && !isJoin(items[0].k) && !this.editing ? items[0] : null;
    if (!it) return marks;
    const s = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 22 : 12) / z;
    const [hx, hy] = [it.x + it.w, it.y + it.h];
    return svg`${marks}<rect class="pin-handle" x=${hx - s / 2} y=${hy - s / 2} width=${s} height=${s} fill="var(--to-surface)" stroke="var(--to-accent)" stroke-width=${2 / z} />`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToPinboardEditor);
