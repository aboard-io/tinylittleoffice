/**
 * Rows: the one implementation of things chosen whole in a list (docs/editing.md §3 and §6). An app with rows (Outline's
 * items, Todo's items, Board's cards, Trip's stops, the schedule's tasks) draws its rows and hands this controller the
 * rows on screen; the controller keeps which of them are chosen and answers everything a person does to them.
 *
 *   const rows = new Rows<number>(this, {
 *     rows: () => [...{ id, el, span: { from, to } }],    // the rows on screen in order; a span is the row's blocks with its family
 *     box: () => this.querySelector('.list'),             // what holds the focus while rows are chosen (tabindex=-1)
 *     handle: '.my-handle',                               // a row's handle: a tap chooses, a drag moves
 *     nests: true,                                        // Indent/Bring out and a drop "under" (right half of a row)
 *     edit: (id, offset) => …,                            // the caret into a row's words ('end' or an offset)
 *     remove, move, canMove, shift, canShift, duplicate,  // the operations on a span; move/shift/duplicate return the
 *     copy: (span) => ({ text, html }), paste,            //   range to keep chosen afterwards (or null to let go)
 *     drop: (id, to, how) => …,  extra: (span) => […],    // a dragged row put under/after another; the app's own context items
 *   });
 *
 * The host draws `rows.has(id)` (a chosen row: `.ranged`, aria-selected) and puts `rows.renderContext()` in its template;
 * it calls `rows.choose(id, extend?)`, `rows.selectAll()`, `rows.release(id?)` from its own paths (Shift+Up/Down in words,
 * a second Select All). The controller owns: the range {anchor, focus}; a tap on a handle (choose; Shift+tap and, on a
 * touch screen, a second tap on another handle extend); Shift+Up/Down (from the words too, unless `fromWords` is false),
 * flipping past the anchor; Escape (in words: the row chosen, step out of edit; on a range: the caret back), plain arrows
 * and Enter letting go to a caret; Mod+A; Delete/Backspace; Tab/Shift+Tab; Alt+Up/Down; Mod+D; Mod+C/X/V through
 * capturing document listeners that act only while the host holds the focus (or nothing does), with a module-level
 * clipboard (`lastCopied()`) for when the system's is refused; the <to-context> under the range in the standard's order
 * (Edit, Move up, Move down, [the app's], Indent, Bring out, Duplicate | Copy, Cut, Paste | Delete); a tap outside the host
 * letting the range go; and a drag by the handle with pointer events (setPointerCapture, a 6px threshold, a hit test by
 * elementFromPoint, a drawn insertion line, auto-scroll near the scroller's edges). Styles: `.to-rows-handle` (put it on
 * the handle: `touch-action: none` there only, a 44px hit area under a coarse pointer) and `.to-rows-target` (src/styles/kit.css).
 */
import { html, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';
import { ArrowDown, ArrowUp, ClipboardPaste, CopyPlus, Copy, Scissors, SquarePen } from 'lucide';
import { SEP, type ContextEntry, type ToContext } from './context.ts';
import { UI } from './icons.ts';
import { t } from './i18n.ts';
import './context.ts';

/** Blocks [from, to): a row with its family, or a run of rows. */
export interface RowSpan {
  from: number;
  to: number;
}
export interface RowItem<Id> {
  id: Id;
  el: HTMLElement;
  span: RowSpan;
}
export interface RowRange<Id> {
  anchor: Id;
  focus: Id;
}
export interface Clip {
  text: string;
  html: string;
}
export type DropHow = 'under' | 'after';
export interface RowDrag<Id> {
  id: Id;
  over: Id | null;
  how: DropHow;
}

export interface RowsOptions<Id> {
  /** The rows on screen, in order. */
  rows(): RowItem<Id>[];
  /** What takes the focus while rows are chosen, so the keys come here and not to words. */
  box(): HTMLElement | null;
  /** A row's handle, as a selector inside the row's element. */
  handle: string;
  /** Rows nest: Indent and Bring out are offered, and a drop on a row's right half goes under it. */
  nests?: boolean;
  /** Shift+Up/Down and Escape in a row's words choose the row (one-line words; true unless said). */
  fromWords?: boolean;
  /** The row the caret is in, where a Shift+tap extends from. */
  current?(): Id | null;
  /** The span some chosen rows cover (default: from the first row's block to the furthest end). */
  span?(rows: RowItem<Id>[]): RowSpan | null;
  /** The caret into a row's words. */
  edit(id: Id, offset: number | 'end'): void;
  remove(span: RowSpan, ids: Id[]): void;
  move(span: RowSpan, by: 1 | -1): RowRange<Id> | null | void;
  canMove(span: RowSpan, by: 1 | -1): boolean;
  shift?(span: RowSpan, by: 1 | -1): RowRange<Id> | null | void;
  canShift?(span: RowSpan, by: 1 | -1): boolean;
  duplicate(span: RowSpan): RowRange<Id> | null | void;
  copy(span: RowSpan): Clip;
  /** Rows pasted in place of the span (null: where the host likes). */
  paste(data: Clip, span: RowSpan | null): void;
  /** A dragged row (with its family) put under or after another. */
  drop?(id: Id, to: Id, how: DropHow): void;
  /** The app's own context items (Move to a stage, Numbered): after Move down. */
  extra?(span: RowSpan): ContextEntry[];
  /** What scrolls during a drag near its edges (default: the nearest scrolling ancestor of the box, or the page). */
  scroller?(): HTMLElement | null;
  /** The context bar's name and class. */
  label?: string;
  contextClass?: string;
}

/** The last rows copied in this page: a paste here knows them, and works when the system clipboard is refused. */
let copied: Clip | null = null;
export const lastCopied = (): Clip | null => copied;

const EDGE = 48;
const SLOP = 6;

type Host = ReactiveControllerHost & HTMLElement;
type Press<Id> = { id: Id; pointer: number; x: number; y: number; moved: boolean; touch: boolean; shift: boolean; el: HTMLElement };

export class Rows<Id = number> implements ReactiveController {
  /** The rows chosen whole; null when the caret is in words (or nowhere). */
  range: RowRange<Id> | null = null;
  /** A drag by a handle under way. */
  drag: RowDrag<Id> | null = null;
  private press: Press<Id> | null = null;
  /** A pointer tap was taken as a choose: the click after it is not another. */
  private tapped = false;
  private point = { x: 0, y: 0 };
  private scrolling = 0;
  private target: HTMLElement | null = null;
  /** A popover inside the words was open when Escape went down: that Escape was the popover's. */
  private popOpen = false;

  constructor(
    private host: Host,
    private o: RowsOptions<Id>,
  ) {
    host.addController(this);
  }

  hostConnected() {
    const h = this.host;
    h.addEventListener('keydown', this.onKeyCapture, true);
    h.addEventListener('keydown', this.onKey);
    h.addEventListener('focusin', this.onFocusIn);
    h.addEventListener('pointerdown', this.onDown);
    h.addEventListener('pointermove', this.onMove);
    h.addEventListener('pointerup', this.onUp);
    h.addEventListener('pointercancel', this.onCancel);
    h.addEventListener('click', this.onClick);
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener, true);
    document.addEventListener('pointerdown', this.onOutside, true);
  }
  hostDisconnected() {
    const h = this.host;
    h.removeEventListener('keydown', this.onKeyCapture, true);
    h.removeEventListener('keydown', this.onKey);
    h.removeEventListener('focusin', this.onFocusIn);
    h.removeEventListener('pointerdown', this.onDown);
    h.removeEventListener('pointermove', this.onMove);
    h.removeEventListener('pointerup', this.onUp);
    h.removeEventListener('pointercancel', this.onCancel);
    h.removeEventListener('click', this.onClick);
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener, true);
    document.removeEventListener('pointerdown', this.onOutside, true);
    this.endDrag();
  }
  hostUpdated() {
    // A range whose rows have gone (an edit, a fold) is let go.
    if (this.range && !this.chosen().length) {
      this.range = null;
      this.host.requestUpdate();
    }
    const bar = this.bar();
    if (!bar) return;
    if (this.range) bar.show(() => this.rect());
    else if (bar.isOpen) bar.hide();
  }

  /* ---------- the range ---------- */

  private set(r: RowRange<Id> | null) {
    this.range = r;
    this.host.requestUpdate();
  }
  /** The chosen rows, in order. */
  chosen(): RowItem<Id>[] {
    const r = this.range;
    if (!r) return [];
    const vis = this.o.rows();
    const a = vis.findIndex((x) => x.id === r.anchor);
    const f = vis.findIndex((x) => x.id === r.focus);
    return a < 0 || f < 0 ? [] : vis.slice(Math.min(a, f), Math.max(a, f) + 1);
  }
  /** The blocks the chosen rows cover, families and all. */
  span(): RowSpan | null {
    const rows = this.chosen();
    if (!rows.length) return null;
    if (this.o.span) return this.o.span(rows);
    return { from: Math.min(...rows.map((r) => r.span.from)), to: Math.max(...rows.map((r) => r.span.to)) };
  }
  /** Whether the row is chosen: inside the range's span (a chosen row's family is chosen with it). */
  has(id: Id): boolean {
    const s = this.range && this.span();
    if (!s) return false;
    const row = this.o.rows().find((x) => x.id === id);
    return !!row && row.span.from >= s.from && row.span.from < s.to;
  }
  /** The row at `id` chosen whole, or (extending) the range from where it began to it; the words' caret goes. */
  choose(id: Id, extend = false) {
    const vis = this.o.rows();
    if (!vis.some((x) => x.id === id)) return;
    const cur = this.o.current?.() ?? null;
    const from = this.range?.anchor ?? (cur !== null && vis.some((x) => x.id === cur) ? cur : id);
    this.set(extend ? { anchor: from, focus: id } : { anchor: id, focus: id });
    document.getSelection()?.removeAllRanges();
    this.o.box()?.focus({ preventScroll: true });
  }
  /** Shift+Down: the focus to the next row after its family; Shift+Up: to the row before. Past the anchor the range turns. */
  extend(by: 1 | -1) {
    const r = this.range;
    if (!r) return;
    const vis = this.o.rows();
    const a = vis.findIndex((x) => x.id === r.anchor);
    const f = vis.findIndex((x) => x.id === r.focus);
    let to: RowItem<Id> | undefined;
    if (by < 0) to = vis[f - 1];
    else if (f < a) to = vis[f + 1];
    else to = vis.find((x) => x.span.from >= vis[f].span.to);
    if (to) this.set({ ...r, focus: to.id });
  }
  /** Every row on screen chosen. */
  selectAll() {
    const vis = this.o.rows();
    if (!vis.length) return;
    this.choose(vis[0].id);
    this.set({ anchor: vis[0].id, focus: vis[vis.length - 1].id });
  }
  /** A range put back as it was (an undo): chosen, the focus on the box. */
  select(r: RowRange<Id>) {
    this.set(r);
    document.getSelection()?.removeAllRanges();
    this.o.box()?.focus({ preventScroll: true });
  }
  /** The range let go; given a row, the caret into it. */
  release(id?: Id, offset: number | 'end' = 'end') {
    this.set(null);
    if (id !== undefined) this.o.edit(id, offset);
  }
  /** Where the chosen rows are on screen, from the first to the last. */
  rect(): DOMRect | null {
    const s = this.span();
    const els = s ? this.o.rows().filter((x) => x.span.from >= s.from && x.span.from < s.to).map((x) => x.el) : [];
    if (!els.length) return null;
    const a = els[0].getBoundingClientRect();
    const b = els[els.length - 1].getBoundingClientRect();
    const left = Math.min(a.left, b.left);
    return new DOMRect(left, a.top, Math.max(a.right, b.right) - left, b.bottom - a.top);
  }

  /* ---------- the operations ---------- */

  /** After an operation: the range it says to keep, else none. */
  private after(r: RowRange<Id> | null | void) {
    this.set(r ?? null);
    if (r) this.o.box()?.focus({ preventScroll: true });
  }
  remove() {
    const s = this.span();
    if (!s) return;
    const ids = this.chosen().map((x) => x.id);
    this.o.remove(s, ids);
    if (this.range) this.set(null);
  }
  move(by: 1 | -1) {
    const s = this.span();
    if (s && this.o.canMove(s, by)) this.after(this.o.move(s, by));
  }
  shift(by: 1 | -1) {
    const s = this.span();
    if (s && this.o.shift && (this.o.canShift?.(s, by) ?? true)) this.after(this.o.shift(s, by));
  }
  duplicate() {
    const s = this.span();
    if (s) this.after(this.o.duplicate(s));
  }
  /** The chosen rows as the clipboard holds them; kept here too. */
  private clip(s: RowSpan): Clip {
    return (copied = this.o.copy(s));
  }
  /** The bar's Copy and Cut: the system clipboard as the page may write it, and this page's own memory of it. */
  copyOut(cut: boolean) {
    const s = this.span();
    if (!s) return;
    const c = this.clip(s);
    const plain = () => navigator.clipboard?.writeText(c.text).catch(() => undefined);
    try {
      void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([c.text], { type: 'text/plain' }), 'text/html': new Blob([c.html], { type: 'text/html' }) })]).catch(plain);
    } catch {
      void plain();
    }
    if (cut) this.remove();
  }
  /** The bar's Paste: the system clipboard's words if the page may read them, else what was last copied here. */
  async pasteIn() {
    const s = this.span();
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).replace(/\r\n?/g, '\n');
    } catch {
      // Refused: this page's own copy.
    }
    const data = text ? { text, html: copied?.text === text ? copied.html : '' } : copied;
    if (!data) return;
    this.o.paste(data, s);
    this.set(null);
  }

  /* ---------- the context bar ---------- */

  private bar(): ToContext | null {
    return this.host.querySelector<ToContext>(`to-context.to-rows-context`);
  }
  /** What the bar under the range offers, in the standard's order. */
  contextItems(): ContextEntry[] {
    const s = this.range ? this.span() : null;
    if (!s) return [];
    const o = this.o;
    const nest: ContextEntry[] = o.nests && o.shift
      ? [
          { label: t('Indent'), icon: UI.indent, keys: 'Tab', disabled: !(o.canShift?.(s, 1) ?? true), does: () => this.shift(1) },
          { label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', disabled: !(o.canShift?.(s, -1) ?? true), does: () => this.shift(-1) },
        ]
      : [];
    return [
      { label: t('Edit'), icon: SquarePen, keys: 'Enter', does: () => this.range && this.release(this.range.focus) },
      { label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', disabled: !o.canMove(s, -1), does: () => this.move(-1) },
      { label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', disabled: !o.canMove(s, 1), does: () => this.move(1) },
      ...(o.extra?.(s) ?? []),
      ...nest,
      { label: t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', does: () => this.duplicate() },
      SEP,
      { label: t('Copy'), icon: Copy, keys: 'Mod+C', does: () => this.copyOut(false) },
      { label: t('Cut'), icon: Scissors, keys: 'Mod+X', does: () => this.copyOut(true) },
      { label: t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', does: () => void this.pasteIn() },
      SEP,
      { label: t('Delete'), icon: UI.trash, keys: 'Delete', does: () => this.remove() },
    ];
  }
  /** The bar, for the host's template. */
  renderContext(): TemplateResult {
    return html`<to-context class="to-rows-context ${this.o.contextClass ?? ''}" .label=${this.o.label ?? t('Chosen items')} .items=${this.contextItems()}></to-context>`;
  }

  /* ---------- keys ---------- */

  private rowOf(el: Element | null): RowItem<Id> | undefined {
    if (!el) return undefined;
    return this.o.rows().find((x) => x.el.contains(el));
  }
  private inWords(el: HTMLElement): boolean {
    return !!el.closest?.('to-text, input, textarea, [contenteditable="true"]');
  }
  private onKeyCapture = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const el = e.composedPath()[0] as HTMLElement;
    // (The selection bubble is not one: it comes and goes with the selection.)
    this.popOpen = !!el.closest?.('to-text')?.querySelector('[popover]:popover-open:not(.to-context)');
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const el = e.composedPath()[0] as HTMLElement;
    if (el.closest?.('[popover], dialog')) return;
    if (this.inWords(el)) return this.onWordsKey(e, el);
    if (!this.range) return;
    if (this.onRangeKey(e)) e.preventDefault();
  };
  /** In a row's words: Shift+Up/Down and Escape step out to the row chosen whole. */
  private onWordsKey(e: KeyboardEvent, el: HTMLElement) {
    if (this.o.fromWords === false || !el.closest('to-text')) return;
    const row = this.rowOf(el);
    if (!row) return;
    const mod = e.metaKey || e.ctrlKey;
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey && !mod && !e.altKey) {
      e.preventDefault();
      this.choose(row.id);
    } else if (e.key === 'Escape' && !mod && !e.shiftKey) {
      // The popover's Escape was the popover's; selected words collapse first; then the row.
      if (this.popOpen) return void (this.popOpen = false);
      const tx = el.closest('to-text') as (HTMLElement & { sel: { anchor: unknown; focus: unknown } | null }) | null;
      const s = tx?.sel as { anchor: { block: number; offset: number }; focus: { block: number; offset: number } } | null | undefined;
      e.preventDefault();
      if (tx && s && (s.anchor.block !== s.focus.block || s.anchor.offset !== s.focus.offset)) tx.sel = { anchor: s.focus, focus: s.focus };
      else this.choose(row.id);
    }
  }
  /** The keys a range answers to; true when the key was the range's. */
  private onRangeKey(e: KeyboardEvent): boolean {
    const r = this.range!;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const up = k === 'ArrowUp';
    const vertical = up || k === 'ArrowDown';
    if (k === 'Escape' || (k === 'Enter' && !mod && !e.altKey && !e.shiftKey)) this.release(r.focus);
    else if (vertical && e.altKey && !mod) this.move(up ? -1 : 1);
    else if (vertical && e.shiftKey && !mod) this.extend(up ? -1 : 1);
    else if (vertical && !mod && !e.altKey) {
      const rows = this.chosen();
      const s = this.span();
      const vis = this.o.rows();
      const to = up ? (vis[vis.indexOf(rows[0]) - 1] ?? rows[0]) : (vis.find((x) => s && x.span.from >= s.to) ?? rows[rows.length - 1]);
      this.release(to.id, up ? 'end' : 0);
    } else if ((k === 'ArrowLeft' || k === 'ArrowRight') && !mod && !e.altKey && !e.shiftKey) {
      const rows = this.chosen();
      this.release(k === 'ArrowLeft' ? rows[0].id : rows[rows.length - 1].id, k === 'ArrowLeft' ? 0 : 'end');
    } else if (k === 'Backspace' || k === 'Delete') this.remove();
    else if (k === 'Tab' && !mod && !e.altKey) {
      if (!this.o.nests) return false;
      this.shift(e.shiftKey ? -1 : 1);
    } else if (mod && !e.altKey && k.toLowerCase() === 'a') this.selectAll();
    else if (mod && !e.altKey && !e.shiftKey && k.toLowerCase() === 'd') this.duplicate();
    else return false;
    return true;
  }
  /** The focus going into words (a tap, a Tab) lets the range go. */
  private onFocusIn = (e: FocusEvent) => {
    if (this.range && this.inWords(e.target as HTMLElement)) this.set(null);
  };
  /** A tap outside the host, and outside its bar, lets the range go. */
  private onOutside = (e: PointerEvent) => {
    if (!this.range) return;
    const el = e.target as Node | null;
    if (!el || this.host.contains(el)) return;
    this.set(null);
  };

  /* ---------- the clipboard ---------- */

  /** Whether a clipboard event is the range's: in the host while rows are chosen, or on the page's body. */
  private mine(target: EventTarget | null): boolean {
    if (!this.range) return false;
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el === document.body || el === document.documentElement) return true;
    return this.host.contains(el) && !el.closest?.('dialog, [popover], input, textarea, to-text');
  }
  private onClipboard = (e: ClipboardEvent) => {
    if (!this.mine(e.target)) return;
    const dt = e.clipboardData;
    const s = this.span();
    if (!s || !dt) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'paste') {
      const data = { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') };
      this.o.paste(data, s);
      return this.set(null);
    }
    const c = this.clip(s);
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') this.remove();
  };

  /* ---------- the handle: a tap chooses, a drag moves ---------- */

  private handleOf(e: Event): HTMLElement | null {
    const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(this.o.handle);
    return el && this.host.contains(el) ? el : null;
  }
  /** A tap on a handle: choose the row; Shift, or on a touch screen a second handle, extends. */
  private tap(id: Id, shift: boolean, touch: boolean) {
    const extend = shift || (touch && !!this.range && this.range.anchor !== id);
    this.choose(id, extend);
  }
  private onClick = (e: MouseEvent) => {
    const h = this.handleOf(e);
    if (!h) return;
    if (this.tapped) return void (this.tapped = false);
    const row = this.rowOf(h);
    if (row) this.tap(row.id, e.shiftKey, false);
  };
  private onDown = (e: PointerEvent) => {
    const h = this.handleOf(e);
    if (!h || e.button !== 0 || !e.isPrimary) return;
    const row = this.rowOf(h);
    if (!row) return;
    this.tapped = false;
    this.press = { id: row.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false, touch: e.pointerType === 'touch' || e.pointerType === 'pen', shift: e.shiftKey, el: h };
    this.point = { x: e.clientX, y: e.clientY };
    try {
      h.setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is not really down (a test's) cannot be captured; the handle hears it while it is over it.
    }
  };
  private onMove = (e: PointerEvent) => {
    const p = this.press;
    if (!p || e.pointerId !== p.pointer) return;
    this.point = { x: e.clientX, y: e.clientY };
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < SLOP) return;
    e.preventDefault();
    if (!p.moved) {
      if (!this.o.drop) return;
      p.moved = true;
      this.drag = { id: p.id, over: null, how: 'after' };
      if (this.range) this.set(null);
      this.host.requestUpdate();
    }
    this.aim();
    this.edges();
  };
  private onUp = (e: PointerEvent) => {
    const p = this.press;
    if (!p || e.pointerId !== p.pointer) return;
    this.press = null;
    const d = this.drag;
    this.endDrag();
    // A tap that did not move is the choose; the click that follows is swallowed.
    this.tapped = true;
    setTimeout(() => (this.tapped = false), 400);
    if (!p.moved) return this.tap(p.id, p.shift || e.shiftKey, p.touch);
    if (d && d.over !== null) this.o.drop?.(d.id, d.over, d.how);
  };
  private onCancel = () => {
    this.press = null;
    this.endDrag();
  };
  private endDrag() {
    if (this.scrolling) cancelAnimationFrame(this.scrolling);
    this.scrolling = 0;
    this.target?.remove();
    this.target = null;
    if (this.drag) {
      this.drag = null;
      this.host.requestUpdate();
    }
  }
  /** Where the carried row would land: the row under the pointer; its right half is "under" it where rows nest. */
  private aim() {
    const d = this.drag;
    if (!d) return;
    const { x, y } = this.point;
    const vis = this.o.rows();
    const from = vis.find((r) => r.id === d.id);
    const hit = document.elementFromPoint(x, y);
    let row = hit ? vis.find((r) => r.el.contains(hit)) : undefined;
    if (!row && vis.length) {
      // Between rows or past the ends: the nearest row by height.
      const last = vis[vis.length - 1];
      const box = last.el.getBoundingClientRect();
      if (y > box.bottom) row = last;
      else row = vis.find((r) => {
        const b = r.el.getBoundingClientRect();
        return y >= b.top && y <= b.bottom;
      });
    }
    // Never inside its own family.
    if (!row || !from || (row.span.from >= from.span.from && row.span.from < from.span.to)) return this.draw(null, 'after');
    const r = row.el.getBoundingClientRect();
    const how: DropHow = this.o.nests && x - r.left > r.width * 0.5 ? 'under' : 'after';
    this.draw(row, how);
  }
  /** The insertion line: under the row, stepped in when the drop is under it. */
  private draw(row: RowItem<Id> | null, how: DropHow) {
    const d = this.drag!;
    const over = row ? row.id : null;
    if (d.over !== over || d.how !== how) {
      this.drag = { ...d, over, how };
      this.host.requestUpdate();
    }
    if (!row) {
      if (this.target) this.target.hidden = true;
      return;
    }
    if (!this.target) {
      this.target = document.createElement('div');
      this.target.className = 'to-rows-target';
      this.target.setAttribute('aria-hidden', 'true');
      document.body.append(this.target);
    }
    const r = row.el.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(row.el).paddingLeft) || 0;
    const step = how === 'under' ? 24 : 0;
    const left = r.left + pad + step;
    Object.assign(this.target.style, { left: `${Math.round(left)}px`, top: `${Math.round(r.bottom - 1)}px`, width: `${Math.max(24, Math.round(r.right - left - 8))}px` });
    this.target.dataset.how = how;
    this.target.hidden = false;
  }
  private scroller(): HTMLElement {
    const given = this.o.scroller?.();
    if (given) return given;
    for (let el = this.o.box()?.parentElement ?? null; el; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    }
    return (document.scrollingElement as HTMLElement) ?? document.documentElement;
  }
  /** Near the top or bottom of what scrolls, it scrolls to bring more rows under the finger. */
  private edges() {
    if (this.scrolling) return;
    const sc = this.scroller();
    const step = () => {
      this.scrolling = 0;
      if (!this.drag || !sc.isConnected) return;
      const page = sc === document.scrollingElement || sc === document.documentElement;
      const top = page ? 0 : sc.getBoundingClientRect().top;
      const bottom = page ? (window.visualViewport?.height ?? window.innerHeight) : sc.getBoundingClientRect().bottom;
      const { y } = this.point;
      const by = y < top + EDGE ? -12 : y > bottom - EDGE ? 12 : 0;
      if (!by) return;
      const before = sc.scrollTop;
      sc.scrollTop += by;
      if (sc.scrollTop !== before) this.aim();
      this.scrolling = requestAnimationFrame(step);
    };
    this.scrolling = requestAnimationFrame(step);
  }
}
