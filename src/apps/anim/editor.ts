/**
 * <to-anim-editor>: a drawing that moves. Draw mode is Draw's own editor, given the drawing alone; what it
 * changes comes back as one splice of the table of shapes (in Draw's own bursts), and the keys follow their
 * shapes. Move mode puts the time on a moment and lets you drag a shape to where it should be then, bring it
 * in front of the others (depth), grow it (the handle, or the slider), spin it in the plane, turn it about its
 * upright axis like a card, and give it effects; between the moments you set, it travels in straight lines. A canvas as the standard has it (docs/editing.md §5, §8): a tap chooses a shape,
 * Shift+tap adds one, Mod+A takes them all; the shapes in hand have a contextual bar under them (a key here,
 * the words, duplicate, copy, cut, paste, delete); the arrows nudge them (with none in hand, and always by
 * comma and full stop, they step a frame); Enter or two taps open a shape's words in Draw; the clipboard
 * carries the shapes with their keys. Every change is operations on the document (model.ts), and an undo
 * puts the shapes in hand back. Laid out for a phone first (Paul, 2026-10-11: "all over the place with lots of white
 * space"): in Move mode the stage, the filmstrip right under it (every frame, numbered, the one in hand outlined, with
 * its menu: duplicate, delete, a frame earlier or later), the scrubber with the chosen shape's keys on it and the time
 * at its end, then the chosen shape's sliders; the length (frames), the speed (frames a second) and how it repeats
 * (for ever, once, a number of times, back and forth) behind Settings in the bar, a small sheet. Under either mode, at
 * the column's foot above the bar, the row: Draw and Move as one control, and the mode's hint in full.
 */
import { html, nothing, svg, type PropertyDeclarations, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { live } from 'lit/directives/live.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Pause, Play, Repeat, Sparkles } from 'lucide';
import { cmdBtn, cmdMenu, cmdTool } from '../../kit/ui/bar.ts';
import { contextOf, drawnIn, labelOf, runKey } from '../../kit/core/commands.ts';
import COMMANDS, { loopName } from './commands.ts';
import { DocElement, type DocChange, type Entry } from '../../kit/core/element.ts';
import { t } from '../../kit/core/i18n.ts';
import { type ContextEntry, type ToContext } from '../../kit/ui/context.ts';
import type { ToDialog } from '../../kit/ui/dialog.ts';
import { clipText, GENERATOR, docToHtml, htmlToBlocks } from '../../kit/text/clipboard.ts';
import { toast } from '../../kit/core/say.ts';
import { pinchZoom } from '../../kit/ui/pinch.ts';
import { applyAll, parse, write, type Doc, type Op } from '../../doc/index.ts';
import { GRID, H, W, bounds, isDrawn, isLink, shapesTable, type Shape } from '../draw/model.ts';
import { THEME } from '../draw/editor.ts';
import {
  MAX_FPS,
  MAX_FRAMES,
  MAX_Z,
  MIN_FPS,
  MIN_FRAMES,
  drawingOf,
  duplicateFrame,
  moveFrame,
  playhead,
  removeFrame,
  duplicateShapes,
  loosen,
  motionOf,
  pasteMotion,
  readAnim,
  redraw,
  removeKey,
  removeShapes,
  room,
  setLength,
  stateAt,
  withKeys,
  type AnimView,
  type Key as AnimKey,
} from './model.ts';
import { frameSvg, transformOf, altOf } from './view.ts';
import { turnOf } from '../draw/view.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/menu.ts';
import '../../kit/ui/context.ts';
import '../../kit/ui/dialog.ts';
import './style.css';

export const tag = 'to-anim-editor';

/** How long a Mod+C, X or V waits for the browser's own clipboard event before doing it by hand (Safari's comes late, or never). */
const CLIP_WAIT = 120;
/** One of the Animator's own commands, by its name. */
const own = (id: string) => COMMANDS.find((c) => c.id === `anim.${id}`)!;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** A drag on the stage: shapes moved, a pen shape's corner, or the size handle; its ops are written when the pointer lets go. */
type Drag =
  | { mode: 'move'; from: { i: number; dx: number; dy: number }[]; x: number; y: number; ops: Op[]; tap?: { i: number; cx: number; cy: number } }
  | { mode: 'corner'; i: number; corner: number; ops: Op[] }
  | { mode: 'size'; i: number; cx: number; cy: number; d0: number; s0: number; ops: Op[] };

/** What an edit made in Move mode carries for undo: the shapes in hand before it and after it. */
interface Mark {
  before: number[];
  after: number[];
}

/** Draw's editor as Motion holds it: its value, and its selection (one shape, or the shapes in hand). */
type DrawEl = HTMLElement & { value: string; sel?: number; picked?: number[]; updateComplete: Promise<unknown>; performUpdate?: () => void };

/** The last shapes copied here, so a paste in this page finds them when the system clipboard is refused. */
let copied: { text: string; html: string } | null = null;

/** Two taps on one shape this close together edit its words (WebKit sends no dblclick for a finger). */
const TWICE_MS = 400;
/** A finger's target, in CSS pixels. */
const FINGER = 44;

export class ToAnimEditor extends DocElement<AnimView> {
  static properties: PropertyDeclarations = {
    mode: { state: true },
    frame: { state: true },
    sels: { state: true },
    playing: { state: true },
    clock: { state: true },
    live: { state: true },
    zoom: { state: true },
    held: { state: true },
  };
  declare mode: 'draw' | 'move';
  declare frame: number;
  /** The shapes in hand, the last chosen last; [] for none. */
  declare sels: number[];
  declare playing: boolean;
  /** The fractional frame while playing. */
  declare clock: number;
  /** The motion as shown while a shape is dragged; the document is written when the pointer lets go. */
  declare live: AnimView | null;
  /** How large the stage is shown: 1 fits the page's width. */
  declare zoom: number;
  /** A drag is on: the stage keeps the finger. */
  declare held: boolean;
  /** Once the mode has been chosen by hand, a new reading of the document does not choose it again. */
  private chosen = false;
  private raf = 0;
  private drag: Drag | null = null;
  private thumbs: { of: AnimView; list: { at: number; svg: string }[] } | null = null;
  /** Draw's editor is made afresh when this changes (after an undo under its open words, or a refused change). */
  private drawGen = 0;
  /** The shapes to hand Draw once it is drawn. */
  private handOver: number[] | null = null;
  /** The last tap on a shape: which, and when (for two taps). */
  private lastTap: { i: number; at: number } | null = null;
  /** The last Mod+C, X or V on the stage: done by the browser's own event or by hand, whichever comes first, never both. */
  private press: { clip: 'copy' | 'cut' | 'paste'; done: boolean; at: number } | null = null;
  /** Two fingers are on the stage: the pinch is kit/ui/pinch.ts's, and the pointers are not the shapes'. */
  private pinching = false;
  private unpinch: (() => void) | null = null;

  constructor() {
    super();
    this.mode = 'draw';
    this.frame = 0;
    this.sels = [];
    this.playing = false;
    this.clock = 0;
    this.live = null;
    this.zoom = 1;
    this.held = false;
  }
  protected read(doc: Doc): AnimView {
    return readAnim(doc);
  }
  protected willUpdate(changed: PropertyValues) {
    super.willUpdate(changed);
    // A document arriving (it has no history yet): a list of things with no drawing is made one, one splice that
    // undoes; and a drawing that is there is there to be moved, while an empty stage wants drawing on.
    if (changed.has('value') && !this.canUndo && !this.canRedo) {
      this.edit(loosen(this.doc));
      if (!this.chosen) this.mode = this.view.shapes.length ? 'move' : 'draw';
    }
    this.frame = Math.min(this.frame, this.view.frames - 1);
    if (this.sels.some((i) => i >= this.view.shapes.length)) this.sels = this.sels.filter((i) => i < this.view.shapes.length);
  }
  protected updated(changed: PropertyValues) {
    super.updated(changed);
    const draw = this.drawEl;
    if (draw && this.handOver) {
      const list = this.handOver;
      this.handOver = null;
      void draw.updateComplete.then(() => this.handDraw(list));
    }
    if (changed.has('frame') || changed.has('mode')) this.showFrame();
    const bar = this.querySelector<ToContext>('.anim-context');
    if (!bar) return;
    if (this.mode !== 'move' || !this.sels.length || this.playing || this.drag) return void (bar.isOpen && bar.hide());
    bar.show(() => this.selRect());
  }
  /** After an undo or a redo: the shapes that were in hand then are in hand again, and the focus is on the stage (or Draw's canvas). */
  protected undone(entry: Entry, redo: boolean) {
    this.live = null;
    this.drag = null;
    this.held = false;
    const mark = entry.mark as Mark | undefined;
    if (mark) this.sels = (redo ? mark.after : mark.before).filter((i) => i < this.view.shapes.length);
    if (this.mode === 'draw') {
      // Draw's words open over a document that has gone back: Draw is made afresh, with nothing open, the shapes in hand.
      if (this.drawEl?.querySelector('.draw-words:not([hidden])')) this.drawGen++;
      this.handOver = [...this.sels];
      void this.updateComplete.then(() => this.drawEl?.querySelector<HTMLElement>('.draw-wrap')?.focus({ preventScroll: true }));
    } else void this.updateComplete.then(() => this.focusStage());
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    // Draw's own Undo and Redo, inside Draw mode, are Motion's: the document is ours, and so is its history.
    this.addEventListener('docundo', this.onInnerHistory, true);
    this.addEventListener('docredo', this.onInnerHistory, true);
    // On the document: with nothing selected a browser may send the event to the body rather than the stage.
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener);
    // Two fingers zoom the stage about them and pan it, read as every spatial canvas reads them (in Draw mode, Draw's).
    this.unpinch = pinchZoom(this, {
      frame: () => (this.mode === 'move' ? this.querySelector<HTMLElement>('.anim-wrap') : null),
      picture: () => this.stageEl,
      zoom: () => this.zoom,
      start: () => {
        // A second finger: whatever the first one began is let go, as it was.
        this.pinching = true;
        this.drag = null;
        this.live = null;
        this.held = false;
        this.lastTap = null;
      },
      set: (z) => {
        this.zoom = clamp(z, 1, 4);
        return this.updateComplete;
      },
      end: (z) => {
        this.pinching = false;
        this.zoom = clamp(Math.round(z * 4) / 4, 1, 4);
        return this.updateComplete;
      },
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('docundo', this.onInnerHistory, true);
    this.removeEventListener('docredo', this.onInnerHistory, true);
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener);
    this.unpinch?.();
    this.unpinch = null;
    this.querySelector<ToContext>('.anim-context')?.hide();
    cancelAnimationFrame(this.raf);
  }
  private onInnerHistory = (e: Event) => {
    if (e.target === this) return;
    e.stopPropagation();
    e.preventDefault();
    this.dispatchEvent(new CustomEvent(e.type, { cancelable: true }));
  };

  /** What is drawn: the document's motion, or the one under the pointer. */
  private get anim(): AnimView {
    return this.live ?? this.view;
  }
  /** The shape chosen last, -1 for none: the one whose keys are on the scrubber and whose depth, size and spin are shown. */
  get sel(): number {
    return this.sels.length ? this.sels[this.sels.length - 1] : -1;
  }
  private get stageEl(): SVGSVGElement | null {
    return this.querySelector<SVGSVGElement>('svg.anim-stage');
  }
  private get drawEl(): DrawEl | null {
    return this.querySelector<DrawEl>('to-draw-editor');
  }
  /** Where a person starts: the stage (Draw's canvas while the drawing is open). */
  async focusFirst() {
    await this.updateComplete;
    if (this.mode === 'draw') this.drawEl?.querySelector<HTMLElement>('.draw-wrap')?.focus({ preventScroll: true });
    else this.focusStage();
  }
  private focusStage() {
    this.stageEl?.focus({ preventScroll: true });
  }

  /* ---------- time ---------- */

  seek(frame: number) {
    this.pause();
    this.frame = clamp(Math.round(frame), 0, this.view.frames - 1);
  }
  pause() {
    if (!this.playing) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.frame = Math.min(this.view.frames - 1, Math.round(this.clock));
  }
  /** Play from the moment in hand (from the start, when a play that stops has ended), as the motion repeats: for ever, once, a number of times, or back and forth. */
  toggle() {
    if (this.playing) return this.pause();
    const { frames, loop } = this.view;
    const from = (loop === 'once' || typeof loop === 'number') && this.frame >= frames - 1 ? 0 : this.frame;
    this.playing = true;
    const t0 = performance.now() - (from / this.view.fps) * 1000;
    const tick = () => {
      if (!this.playing) return;
      const at = playhead(this.view.frames, this.view.loop, ((performance.now() - t0) / 1000) * this.view.fps);
      this.clock = at.frame;
      if (at.done) return this.pause();
      this.raf = requestAnimationFrame(tick);
    };
    tick();
  }
  setMode(mode: 'draw' | 'move') {
    this.chosen = true;
    this.pause();
    this.lastTap = null;
    if (mode === this.mode) return;
    // The shapes in hand go with the mode: into Draw, and back out of it.
    if (mode === 'move') this.sels = this.drawSelection().filter((i) => i < this.view.shapes.length);
    else this.handOver = [...this.sels];
    this.mode = mode;
  }
  private secs(frame: number) {
    return (frame / this.view.fps).toFixed(1);
  }

  /* ---------- Draw, held ---------- */

  private drawSelection(): number[] {
    const d = this.drawEl;
    if (!d) return [];
    if (Array.isArray(d.picked)) return d.picked.slice();
    return typeof d.sel === 'number' && d.sel >= 0 ? [d.sel] : [];
  }
  private handDraw(list: number[]) {
    const d = this.drawEl;
    if (!d) return;
    if (Array.isArray(d.picked)) d.picked = list.slice();
    else d.sel = list.length ? list[list.length - 1] : -1;
  }
  /** Draw mode's change: Draw's text is not the document, ours is, with the drawing inside it; Draw's burst is ours. */
  private onDrawChange(e: DocChange) {
    e.stopPropagation();
    const drawing = parse(e.detail);
    if (drawing.head.grid) {
      // Pixel art is the Drawing Tool's own; a motion moves shapes. Draw is given the drawing back.
      this.drawGen++;
      this.handOver = [...this.sels];
      this.requestUpdate();
      toast(t('anim-pixel-art-is-made-in'));
      return;
    }
    const before = [...this.sels];
    const after = this.drawSelection();
    const ops = redraw(this.doc, drawing);
    if (!ops.length) return;
    this.edit(ops, e.key && `draw:${e.key}`, { before, after } satisfies Mark);
    this.sels = after;
  }
  /** The selected shape's words, typed on it: Draw's own words, opened on the same shape from here (Enter, two taps). */
  editWords(i = this.sel) {
    const s = this.view.shapes[i];
    if (!s) return;
    this.sels = [i];
    this.setMode('draw');
    this.handOver = null;
    // Drawn now, in this key's or tap's own handler, so a phone lets the focus into the words and brings up its keyboard.
    this.performUpdate();
    const d = this.drawEl;
    if (!d) return;
    d.performUpdate?.();
    this.handDraw([i]);
    const wrap = d.querySelector<HTMLElement>('.draw-wrap');
    wrap?.focus({ preventScroll: true });
    wrap?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, composed: true }));
  }

  /* ---------- the shapes in hand ---------- */

  /** An edit made in Move mode: the shapes in hand before and after it go with it, for undo. */
  act(ops: Op[], key?: string, after: number[] = this.sels) {
    this.lastTap = null;
    if (!ops.length) return;
    this.edit(ops, key, { before: [...this.sels], after: [...after] } satisfies Mark);
    this.sels = after;
  }
  /** Each shape in hand keyed at this moment, changed as asked (a function of where it is now, or the same change for all). */
  key(change: Partial<AnimKey> | ((at: AnimKey, i: number) => Partial<AnimKey>) = {}, burst?: string) {
    if (!this.sels.length) return;
    const v = this.view;
    const list = this.sels.map((i) => {
      const at = stateAt(v, i, this.frame);
      return { i, key: { ...at, ...(typeof change === 'function' ? change(at, i) : change), t: this.frame } };
    });
    this.act(withKeys(this.doc, list), burst);
  }
  toggleFx(letter: string) {
    const on = stateAt(this.view, this.sel, this.frame).fx.includes(letter);
    this.key((at) => ({ fx: on ? at.fx.replace(letter, '') : at.fx.includes(letter) ? at.fx : at.fx + letter }));
  }
  /** The shapes in hand moved by (x, y) at this moment, never off the stage. */
  nudge(x: number, y: number) {
    const v = this.view;
    this.key(
      (at, i) => {
        const [x0, x1, y0, y1] = room(v, i);
        return { dx: clamp(at.dx + x, Math.min(x0, at.dx), Math.max(x1, at.dx)), dy: clamp(at.dy + y, Math.min(y0, at.dy), Math.max(y1, at.dy)) };
      },
      `nudge:${this.sels.join(',')}:${this.frame}`,
    );
  }
  /** The shapes in hand grown (or shrunk) a tenth at this moment. */
  grow(by: number) {
    this.key((at) => ({ s: clamp(Math.round((at.s + by) * 10) / 10, 0.2, 4) }), `size:${this.sels.join(',')}:${this.frame}`);
  }
  removeKeyHere() {
    let doc = this.doc;
    const ops: Op[] = [];
    for (const i of this.sels) {
      const step = removeKey(doc, i, this.frame);
      ops.push(...step);
      doc = applyAll(doc, step);
    }
    this.act(ops);
  }
  removeSel() {
    if (!this.sels.length) return;
    this.act(removeShapes(this.doc, this.sels), undefined, []);
  }
  duplicateSel() {
    const { ops, sel } = duplicateShapes(this.doc, this.sels);
    this.act(ops, undefined, sel);
  }
  selectAll() {
    this.sels = this.view.shapes.map((_, i) => i);
  }

  /* ---------- the clipboard ---------- */

  /** What copy puts on the clipboard for the shapes in hand: their motion in TLO, and our HTML of it. Null when nothing can be copied. */
  private clip(): { text: string; html: string } | null {
    const m = this.sels.length ? motionOf(this.doc, this.sels) : null;
    return m ? (copied = { text: write(m), html: docToHtml(m.blocks) }) : null;
  }
  /** Pasted: shapes (a motion's or a drawing's) beside where they were, moving as they did; or words as a text in the middle. */
  private pasteData(text: string, html = '') {
    const tlo = clipText({ text, html });
    let doc = tlo.trim() ? parse(tlo.replace(/\r\n?/g, '\n')) : null;
    if (!doc && html.includes(GENERATOR)) doc = { head: {}, blocks: htmlToBlocks(html) };
    if (!doc) return;
    let { ops, sel } = pasteMotion(this.doc, doc);
    if (!ops.length) {
      const words = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' | ');
      if (!words) return;
      const s: Shape = { k: 't', x: Math.round((W / 2 - 80) / GRID) * GRID, y: Math.round((H / 2 - 16) / GRID) * GRID, w: 160, h: 32, f: 0, text: words };
      ({ ops, sel } = pasteMotion(this.doc, { head: {}, blocks: [shapesTable([s])] }));
    }
    this.act(ops, undefined, sel);
  }
  /** Copy, cut and paste from the keys, while the stage has the focus. */
  private onClipboard = (e: ClipboardEvent) => {
    const stage = this.stageEl;
    if (this.mode !== 'move' || !stage || document.activeElement !== stage) return;
    // The key's paste already done by hand (the browser's event came late): not again.
    const press = this.press;
    if (press && press.clip === e.type && performance.now() - press.at < 2000) {
      if (press.done && e.type === 'paste') return void e.preventDefault();
      press.done = true;
    }
    const dt = e.clipboardData;
    if (e.type === 'paste') {
      e.preventDefault();
      return this.pasteData(dt?.getData('text/plain') ?? '', dt?.getData('text/html') ?? '');
    }
    const c = this.clip();
    if (!c || !dt) return;
    e.preventDefault();
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') this.removeSel();
  };
  /** The contextual bar's Copy and Cut: the system clipboard as the page may write it, and this page's own memory of it. */
  copyOut(cut: boolean) {
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
  /** The contextual bar's Paste: the system clipboard's words if the page may read them, else what was last copied here. */
  async pasteIn() {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      // Refused: this page's own copy.
    }
    text ||= copied?.text ?? '';
    if (text) this.pasteData(text);
  }

  /* ---------- keys ---------- */

  /** The stage's keys in Move mode (commands.ts); in Draw mode the keys are Draw's, and only the stage's own keys are ours (never a bar button's, a field's, a menu's). */
  private onKey = (e: KeyboardEvent) => {
    if (this.mode !== 'move' || e.defaultPrevented || e.isComposing) return;
    const at = e.composedPath()[0] as Element;
    if (!at?.closest?.('svg.anim-stage')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && !e.altKey && !e.shiftKey && (k === 'c' || k === 'x' || k === 'v')) {
      const clip = ({ c: 'copy', x: 'cut', v: 'paste' } as const)[k];
      if (!this.sels.length && clip !== 'paste') return;
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
    runKey(e, COMMANDS, this);
  };
  /** The arrows: the shapes in hand nudged (Shift by five), sized with Mod; with none in hand Left and Right step a frame (§8). */
  arrowKey(e: KeyboardEvent): boolean {
    const arrow = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as Record<string, [number, number]>)[e.key];
    const mod = e.metaKey || e.ctrlKey;
    const any = this.sels.length > 0;
    if (!arrow) return false;
    if (any && mod) this.grow(arrow[0] + -arrow[1] > 0 ? 0.1 : -0.1);
    else if (any) this.nudge(arrow[0] * GRID * (e.shiftKey ? 5 : 1), arrow[1] * GRID * (e.shiftKey ? 5 : 1));
    else if (arrow[0] && !mod && !e.shiftKey) this.seek(this.frame + arrow[0]);
    else return false;
    return true;
  }
  /** Escape, one step a press: the playing stops, then the shapes are let go. */
  stepOut(): boolean {
    if (this.playing) this.pause();
    else if (this.sels.length) this.sels = [];
    else return false;
    return true;
  }

  /* ---------- the stage ---------- */

  /** The pointer in stage units (the stage's box may be wider than its picture when its height is capped: the picture is centred in it). */
  private point(e: PointerEvent): [number, number] {
    const m = this.stageEl?.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  /** CSS pixels to a stage unit. */
  private scale(): number {
    return this.stageEl?.getScreenCTM()?.a || 1;
  }
  /** Where the shapes in hand are on the screen: where the contextual bar goes under. */
  private selRect(): DOMRect | null {
    const rects = [...this.querySelectorAll('.anim-stage .hit.sel > rect')].map((r) => r.getBoundingClientRect());
    if (!rects.length) return null;
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    return new DOMRect(left, top, Math.max(...rects.map((r) => r.right)) - left, Math.max(...rects.map((r) => r.bottom)) - top);
  }
  private onDown(e: PointerEvent) {
    if (e.button !== 0 || this.pinching || this.readOnly) return;
    const target = e.target as Element;
    const idx = target.closest('[data-idx]')?.getAttribute('data-idx');
    const corner = target.closest('[data-corner]')?.getAttribute('data-corner');
    const handle = !!target.closest('[data-handle]');
    this.pause();
    this.focusStage();
    const one = this.sels.length === 1 ? this.sel : -1;
    const [x, y] = this.point(e);
    if (one >= 0 && (corner != null || handle)) {
      e.preventDefault();
      if (corner != null) this.drag = { mode: 'corner', i: one, corner: +corner, ops: [] };
      else {
        // The size handle: the shape grows as the pointer goes from its centre.
        const s = this.view.shapes[one];
        const at = stateAt(this.view, one, this.frame);
        const [bx, by, bw, bh] = bounds(s, this.view.shapes);
        const [cx, cy] = [bx + bw / 2 + at.dx, by + bh / 2 + at.dy];
        this.drag = { mode: 'size', i: one, cx, cy, d0: Math.max(1, Math.hypot(x - cx, y - cy)), s0: at.s, ops: [] };
      }
      this.held = true;
      this.stageEl?.setPointerCapture(e.pointerId);
      return;
    }
    if (idx == null) {
      this.sels = [];
      this.lastTap = null;
      return;
    }
    e.preventDefault();
    const i = parseInt(idx, 10);
    // Shift+tap adds a shape to those in hand, or takes it away.
    if (e.shiftKey) {
      this.sels = this.sels.includes(i) ? this.sels.filter((j) => j !== i) : [...this.sels, i];
      this.lastTap = null;
      if (!this.sels.includes(i)) return;
    } else if (!this.sels.includes(i)) this.sels = [i];
    else this.sels = [...this.sels.filter((j) => j !== i), i];
    const from = this.sels.map((j) => {
      const at = stateAt(this.view, j, this.frame);
      return { i: j, dx: at.dx, dy: at.dy };
    });
    this.drag = { mode: 'move', from, x, y, ops: [], tap: e.shiftKey ? undefined : { i, cx: e.clientX, cy: e.clientY } };
    this.held = true;
    this.stageEl?.setPointerCapture(e.pointerId);
  }
  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    // A finger's tremble is not a drag: a tap stays a tap until the pointer has gone a few pixels.
    if (d.mode === 'move' && d.tap) {
      if (Math.hypot(e.clientX - d.tap.cx, e.clientY - d.tap.cy) < 4) return;
      d.tap = undefined;
    }
    const [x, y] = this.point(e);
    const v = this.view;
    let list: { i: number; key: AnimKey }[];
    if (d.mode === 'corner') {
      // The corner goes where the pointer is, in hundredths of the shape's box (its offset undone).
      const s = v.shapes[d.i];
      const at = stateAt(v, d.i, this.frame);
      const pts = (at.pts ?? s.pts ?? []).slice();
      pts[2 * d.corner] = Math.round(((x - at.dx - s.x) / s.w) * 100);
      pts[2 * d.corner + 1] = Math.round(((y - at.dy - s.y) / s.h) * 100);
      list = [{ i: d.i, key: { ...at, pts, t: this.frame } }];
    } else if (d.mode === 'size') {
      const at = stateAt(v, d.i, this.frame);
      list = [{ i: d.i, key: { ...at, s: clamp(Math.round(((d.s0 * Math.hypot(x - d.cx, y - d.cy)) / d.d0) * 10) / 10, 0.2, 4), t: this.frame } }];
    } else list = d.from.map((f) => ({ i: f.i, key: { ...stateAt(v, f.i, this.frame), dx: Math.round(f.dx + x - d.x), dy: Math.round(f.dy + y - d.y), t: this.frame } }));
    // (A shape moved for the first time at a later moment starts from where it was drawn: withKeys.)
    d.ops = withKeys(this.doc, list);
    this.live = readAnim(applyAll(this.doc, d.ops));
  }
  private onUp(e: PointerEvent) {
    const d = this.drag;
    this.drag = null;
    this.live = null;
    this.held = false;
    if (d?.ops.length) {
      this.lastTap = null;
      return this.act(d.ops);
    }
    // Two taps on one shape (a pointer that went nowhere, twice): its words, opened here in the tap's own handler.
    if (d?.mode !== 'move' || !d.tap || e.type !== 'pointerup') return void (this.lastTap = null);
    const i = d.tap.i;
    const twice = this.lastTap?.i === i && e.timeStamp - this.lastTap.at < TWICE_MS;
    this.lastTap = twice ? null : { i, at: e.timeStamp };
    if (twice && this.sels.length === 1 && !isLink(this.view.shapes[i].k)) this.editWords(i);
  }
  private onWheel(e: WheelEvent) {
    // Mod (or a pinch on a trackpad) and the wheel zoom; the wheel alone scrolls as usual.
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.zoom = clamp(Math.round((this.zoom - Math.sign(e.deltaY) * 0.25) * 4) / 4, 1, 4);
  }

  /* ---------- the frames ---------- */

  /** The frame in hand shown twice; the second of them in hand. */
  duplicateFrame() {
    const ops = duplicateFrame(this.doc, this.frame);
    if (!ops.length) return;
    this.act(ops);
    this.frame++;
  }
  /** The frame in hand cut out; the one after it (or the new last) in hand. */
  removeFrame() {
    this.act(removeFrame(this.doc, this.frame));
  }
  /** The frame in hand moved a frame earlier or later; it stays in hand. */
  moveFrame(by: -1 | 1) {
    const to = this.frame + by;
    if (to < 0 || to >= this.view.frames) return;
    // (Two frames that show the same are the same either way round: nothing is written, and the one in hand moves on.)
    this.act(moveFrame(this.doc, this.frame, by));
    this.frame = to;
  }
  /** The frame in hand scrolled into the strip's view, the strip alone (never the column). */
  private showFrame() {
    const strip = this.querySelector<HTMLElement>('.anim-thumbs');
    const on = strip?.querySelector<HTMLElement>('.anim-frame.on');
    if (!strip || !on) return;
    const [l, r] = [on.offsetLeft - strip.offsetLeft, on.offsetLeft - strip.offsetLeft + on.offsetWidth];
    if (l < strip.scrollLeft) strip.scrollLeft = l;
    else if (r > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = r - strip.clientWidth;
  }

  /* ---------- settings ---------- */

  /** The length, the speed and the repeat: a small sheet (Settings in the bar). */
  openSettings() {
    this.pause();
    void this.querySelector<ToDialog>('to-dialog.anim-settings')?.show();
  }
  /** A number field's words committed: the length or the speed, held to what it may be (the field shows what was kept). */
  private setNumber(which: 'frames' | 'fps', input: HTMLInputElement) {
    const n = Math.round(parseFloat(input.value));
    const { frames, fps } = this.view;
    const ops = Number.isFinite(n) ? setLength(this.doc, which === 'frames' ? n : frames, which === 'fps' ? n : fps) : [];
    if (ops.length) this.act(ops);
    // Out of bounds or not a number: the field shows what the motion has.
    input.value = String(which === 'frames' ? this.view.frames : this.view.fps);
  }
  /** The contextual bar under the shapes in hand (commands.ts; §5's order, for a motion). (Depth, size, spin, turn and the effects are beside the sliders.) */
  private contextItems(): ContextEntry[] {
    return this.sels.length ? (contextOf(COMMANDS, this) as ContextEntry[]) : [];
  }

  /* ---------- drawing ---------- */

  render() {
    const tile = !!this.view.draw.tile;
    return html`${
      this.mode === 'draw'
        ? keyed(this.drawGen, html`<to-draw-editor class="anim-draw" ?data-tile=${tile} .value=${write(drawingOf(this.doc))} @docchange=${this.onDrawChange}></to-draw-editor>`)
        : html`${this.readOnly ? nothing : this.renderBar()} ${this.renderStage()}${this.renderTime()}${this.renderProps()}
            <to-context class="anim-context" .label=${t('anim-shapes-in-hand')} .items=${this.contextItems()}></to-context>
            ${this.renderSettings()}`
    }
      ${this.renderRow()}`;
  }

  private hint(): string {
    if (this.mode === 'draw') return t('anim-draw-shapes-move-sets-them');
    if (!this.view.shapes.length) return t('anim-nothing-here-yet-draw-something');
    if (this.sel < 0) return t('anim-tap-shape-then-drag-it');
    return t('anim-drag-it-to-where-it', { s: this.secs(this.frame) });
  }

  private renderBar() {
    return html`<to-bar class="anim-bar">
      ${cmdTool(own('play'), this, { icon: this.playing ? Pause : Play })} ${cmdTool(own('settings'), this)} ${this.undoTools()}
    </to-bar>`;
  }

  /** The row at the column's foot, above the bar, in either mode: Draw and Move as one control, and what to do now, in full. */
  private renderRow() {
    return html`<div class="anim-row">
      <span class="anim-modes" role="group" aria-label=${t('anim-mode')}>${cmdBtn(own('draw'), this, { keep: false })}${cmdBtn(own('move'), this, { keep: false })}</span>
      <p class="anim-hint" aria-live="polite">${this.hint()}</p>
    </div>`;
  }
  private renderStage() {
    const a = this.anim;
    const now = this.playing ? this.clock : this.frame;
    const one = this.sels.length === 1 ? this.sel : -1;
    // A finger's 44px, in stage units, for the corners and the size handle; a mouse's is what is drawn.
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    const reach = (drawn: number) => (coarse ? Math.max(drawn, FINGER / 2 / this.scale()) : drawn);
    return html`<div class="anim-wrap" data-spatial @wheel=${this.onWheel}>
      <svg class="anim-stage ${this.held ? 'held' : ''}" style=${this.zoom === 1 ? '' : `width:${this.zoom * 100}%;max-height:none;max-width:none`} viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="application" aria-label=${t('anim-stage-alt-arrow-keys-move', { alt: altOf(a) })} tabindex="0"
        @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onUp}>
        ${unsafeSVG(frameSvg(a, now, THEME))}
        ${
          this.playing
            ? nothing
            : a.shapes.map((s, i) => {
                const [x, y, w, h] = bounds(s, a.shapes);
                const k = stateAt(a, i, now);
                const chosen = this.sels.includes(i);
                const pts = isDrawn(s.k) && i === one ? (k.pts ?? s.pts ?? []) : [];
                const sized = i === one && !isLink(s.k);
                return svg`<g class="hit ${chosen ? 'sel' : ''}" data-idx=${i} transform=${transformOf(s, a.shapes, k, now)}><rect x=${x - 6} y=${y - 6} width=${w + 12} height=${h + 12} rx="4" transform=${turnOf(s) || nothing} />
                ${sized ? svg`<g class="handle" data-handle="1"><circle class="reach" cx=${x + w + 6} cy=${y + h + 6} r=${reach(8)} /><rect x=${x + w} y=${y + h} width="12" height="12" /></g>` : nothing}
                ${Array.from({ length: Math.floor(pts.length / 2) }, (_, c) => {
                  const [cx, cy] = [s.x + (pts[2 * c] / 100) * s.w, s.y + (pts[2 * c + 1] / 100) * s.h];
                  return svg`<g class="corner" data-corner=${c}><circle class="reach" cx=${cx} cy=${cy} r=${reach(7)} /><circle class="dot" cx=${cx} cy=${cy} r="7" /></g>`;
                })}</g>`;
              })
        }
      </svg>
    </div>`;
  }

  private renderProps() {
    if (this.sel < 0 || !this.view.shapes[this.sel]) return nothing;
    const at = stateAt(this.anim, this.sel, this.frame);
    // Each says what it does in its tooltip: depth is which shape is in front, size is how large, spin is in the plane, turn about the upright axis.
    const slider = (label: string, tip: string, field: 'z' | 's' | 'r' | 'u', min: number, max: number, step: number, shown: string) =>
      html`<label class="anim-slider anim-${field}" title=${tip}><span>${label} <b>${shown}</b></span>
        <input type="range" min=${min} max=${max} step=${step} aria-description=${tip} .value=${String(at[field] ?? 0)} @input=${(e: Event) => this.key({ [field]: parseFloat((e.target as HTMLInputElement).value) }, `${field}:${this.sels.join(',')}:${this.frame}`)} /></label>`;
    return html`<div class="anim-props">
      ${slider(t('anim-depth'), t('anim-which-shape-is-in-front'), 'z', -MAX_Z, MAX_Z, 1, `${Math.round(at.z)}`)}
      ${slider(t('common-size'), t('anim-how-large-shape-is-drawn'), 's', 0.2, 4, 0.1, `${at.s.toFixed(1)}×`)}
      ${slider(t('anim-spin'), t('anim-turns-shape-around-in-plane'), 'r', -360, 360, 1, `${Math.round(at.r)}°`)}
      ${slider(t('anim-turn'), t('anim-turns-shape-about-its-upright'), 'u', -360, 360, 1, `${Math.round(at.u ?? 0)}°`)}
      <to-menu class="anim-fx" keep .label=${labelOf(own('fx'), this)} .icon=${Sparkles} caret .items=${drawnIn(COMMANDS, 'menu:fx', this)}></to-menu>
    </div>`;
  }

  /** The sheet behind Settings: the length in frames, the speed in frames a second and how it repeats, one line each, and the length in seconds under them; written as the head's frames, fps and loop. */
  private renderSettings() {
    const { frames, fps, loop } = this.view;
    const field = (which: 'frames' | 'fps', label: string, value: number, min: number, max: number) =>
      html`<label class="anim-field anim-${which}"><span>${label}</span><input type="number" inputmode="numeric" min=${min} max=${max} step="1" .value=${live(String(value))}
        @change=${(e: Event) => this.setNumber(which, e.target as HTMLInputElement)}
        @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && !e.isComposing && (e.preventDefault(), this.setNumber(which, e.target as HTMLInputElement))} /></label>`;
    return html`<to-dialog class="anim-settings" heading=${t('anim-length-speed-and-repeat')} .body=${html`<div class="anim-length">
      ${field('frames', t('anim-frames'), frames, MIN_FRAMES, MAX_FRAMES)} ${field('fps', t('anim-frames-second'), fps, MIN_FPS, MAX_FPS)}
      <to-menu class="anim-loop" .label=${loopName(loop)} .icon=${Repeat} caret .items=${drawnIn(COMMANDS, 'menu:loop', this)}></to-menu>
      <p class="anim-secs to-hint" aria-live="polite">${t('anim-s-s', { s: (frames / fps).toFixed(1) })}</p>
    </div>`}></to-dialog>`;
  }

  /** Every frame's little picture; drawn again when the document changes. */
  private thumbnails() {
    const v = this.view;
    if (this.thumbs?.of !== v) this.thumbs = { of: v, list: Array.from({ length: v.frames }, (_, at) => ({ at, svg: frameSvg(v, at, THEME) })) };
    return this.thumbs.list;
  }

  /** Under the stage: the filmstrip (every frame, the one in hand outlined, its menu at the end), then the scrubber with the keys on it and the time at its end. */
  private renderTime() {
    const { frames, fps } = this.view;
    const shown = this.playing ? Math.floor(this.clock) : this.frame;
    const keys = this.view.keys[this.sel] ?? [];
    // The dots and the frames are tapped to go to a time: they never take the focus from the stage.
    const keep = (e: Event) => e.preventDefault();
    return html`<div class="anim-time">
      <div class="anim-strip">
        <div class="anim-thumbs" role="group" aria-label=${t('anim-moments')}>
          ${this.thumbnails().map(
            (
              m,
            ) => html`<button type="button" class="anim-frame ${m.at === shown ? 'on' : ''}" aria-label=${t('anim-frame-n-s-s', { n: m.at + 1, s: this.secs(m.at) })} aria-pressed=${String(m.at === shown)} @mousedown=${keep} @click=${() => this.seek(m.at)}>
              <svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${unsafeSVG(m.svg)}</svg><span class="anim-n" aria-hidden="true">${m.at + 1}</span>
            </button>`,
          )}
        </div>
        ${cmdMenu(own('frame'), this, COMMANDS, 'anim-frame-menu')}
      </div>
      <div class="anim-scrub">
        <div class="anim-track">
          <input type="range" aria-label=${t('anim-time')} min="0" max=${frames - 1} step="1" .value=${String(shown)} @input=${(e: Event) => this.seek(parseInt((e.target as HTMLInputElement).value, 10))} />
          <div class="anim-keys">
            ${keys.map((k) => html`<button type="button" class=${k.t === this.frame && !this.playing ? 'key on' : 'key'} style="left:${(k.t / Math.max(1, frames - 1)) * 100}%" aria-label=${t('anim-key-at-s-s', { s: this.secs(k.t) })} @mousedown=${keep} @click=${() => this.seek(k.t)}></button>`)}
          </div>
        </div>
        <span class="anim-clock">${t('anim-now-s-of-all-s', { now: this.secs(shown), all: (frames / fps).toFixed(1) })}</span>
      </div>
    </div>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToAnimEditor);
