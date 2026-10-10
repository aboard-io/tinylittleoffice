/**
 * <to-outline-editor>: an outliner. Every row is an item, its words a <to-text shape=line> over the item's
 * block; Enter makes another, Tab and Shift+Tab take it in and out with its family, Alt+Up/Down move
 * it, Mod+Alt+Up/Down fold it, a handle drags it onto another item, and any item can be zoomed in on. The one bar formats the words of
 * the chosen row, arranges it, zooms, folds, connects and shows the outline as other things. Each item's
 * bullet is the line to its parent, tapped to turn it (plain, an arrow out, an arrow back, both ways) and to
 * name it; Connect joins any two items. Every change is operations on the document (model.ts): the kernel's
 * family helpers for the tree, splices for lines, joins and documents, and the row editor's own ops for words.
 * Folds, the zoom, the chosen row and connecting are the editor's state, not the document's.
 *
 * It behaves as a bulleted list does: Enter at the start of words pushes the row down, Backspace at the start joins
 * the row to the item before it and Delete at the end joins the next one in. Rows can be chosen whole, as nodes (a
 * range): Shift+arrows from the caret, Escape in the words, a tap on a row's handle, Select All twice. A range is a span
 * of blocks, every chosen row's family with it; it is copied, cut, pasted, deleted, duplicated, indented and moved as
 * one, from the keys or from a small bar that comes up under it. All of that is the kit's rows controller (kit/rows.ts);
 * this editor gives it the rows and the operations. Any list can be numbered ("1. " typed at the start of a row too).
 */
import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { gateSvg } from '../../kit/pictures.ts';
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ChevronDown, ChevronRight, Eye, FoldVertical, GripVertical, Link2, ListOrdered, Minus, Plus, UnfoldVertical, ZoomIn, ZoomOut } from 'lucide';
import { applyAll, family, fenceRef, isAtomic, isText, listNumbers, plainText, runLength, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { btn, tool } from '../../kit/bar.ts';
import { appOf, apps } from '../../kit/apps.ts';
import { docToHtml, GENERATOR, htmlToBlocks } from '../../kit/clipboard.ts';
import type { ContextEntry } from '../../kit/context.ts';
import { lastCopied, Rows, type Clip, type RowItem, type RowRange, type RowSpan } from '../../kit/rows.ts';
import { decodeDoc, encodeDoc } from '../../kit/codec.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { editFence, makeDoc } from '../../kit/doc-dialog.ts';
import { pageSvg } from '../../kit/draw.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { noteWords } from '../../kit/note-pop.ts';
import { askDocLink, askEmbed } from '../../kit/insert-dialogs.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { parseHash, routeHash } from '../../kit/route.ts';
import type { Sel, TextOps, ToText } from '../../kit/text.ts';
import { caret } from '../../kit/textops.ts';
import { appendItem, connect, copySpan, docBlock, duplicateSpan, enterAt, familyEnd, hasChildren, indexAt, insertDoc, itemBlock, itemsEnd, joinBack, joinForward, listify, liveLinks, mapAt, moveItem, moveSpan, nameOf, parentOf, pasteBlocks, pastesAsItems, pasteText, placeItem, readOutline, removeAt, removeSpan, renameIn, setDoc, setLine, setLink, setOrdered, shiftItem, shiftSpan, siblingsOf, spanOf, topsOf, unlink, webAddress, type Dir, type Item, type Link, type OutlineView } from './model.ts';
import { appName, docGist, outlinePage } from './view.ts';
import def from './def.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/dialog.ts';
import '../../kit/doc-dialog.ts';
import '../../kit/text.ts';
import '../../kit/context.ts';
import './style.css';

export const tag = 'to-outline-editor';

/** How each kind of line is said. */
export const DIR_NAME: Record<Dir, () => string> = { '--': () => t('a plain line'), '->': () => t('an arrow from the parent'), '<-': () => t('an arrow to the parent'), '<->': () => t('arrows both ways') };
const DIR_ICON: Record<Dir, typeof ArrowRight | null> = { '--': null, '->': ArrowRight, '<-': ArrowLeft, '<->': ArrowLeftRight };

/** A Tiny Little Office link as a ref ("<app>\n<text>"), or null when the words are not one. */
export function refOfLink(words: string): string | null {
  const s = words.trim();
  if (!/^https?:\/\/\S+#\/v\d+\//.test(s)) return null;
  const { app, payload } = parseHash(s.slice(s.indexOf('#')));
  if (!app) return null;
  const text = decodeDoc(payload);
  return payload && !text ? null : `${app}\n${text}`;
}

/** Where the selection was before an edit: rows chosen whole, or the caret in a row's words. What an undo puts back (the entry's mark). */
type Mark = { range: RowRange<number> } | { at: number; offset: number };
type Ends = { from: string; to: string; dir: Dir; label?: string; edge: boolean };
/** A line's two ends, as t() takes them. */
const ft = (e: Ends) => ({ from: e.from, to: e.to });

export class ToOutlineEditor extends DocElement<OutlineView> {
  static properties: PropertyDeclarations = { folded: { state: true }, zoom: { state: true }, sel: { state: true }, connecting: { state: true }, menuFor: { state: true }, naming: { state: true }, showing: { state: true } };
  /** Items folded shut, by block index. */
  declare folded: Set<number>;
  /** The item zoomed in on, by block index; -1 for the whole outline. */
  declare zoom: number;
  /** The chosen row, by block index; -1 for none. */
  declare sel: number;
  /** Connecting: the item the join starts from (-1 until it is picked); null when not connecting. */
  declare connecting: { from: number } | null;
  /** The block (an item or a join) whose line menu is open; -1 for none. */
  declare menuFor: number;
  /** The block whose line is being named, and the name so far; -1 when the dialog is closed. */
  declare naming: number;
  /** The outline shown as a page, in a dialog. */
  declare showing: boolean;
  /** The row editor last focused: what the bar's text tools act on. */
  private field: ToText | null = null;
  /** One array per block, so a row's editor sees the same `blocks` until its block changes. */
  private rowBlocks = new WeakMap<Block, Block[]>();
  /** The block a row shows when the outline has none yet; it enters the document with the first letter typed. */
  private ghost: Block = { k: 'li', depth: 0, runs: [] };
  /** Rows chosen whole, as nodes: the kit's one implementation (keys, handle, drag, clipboard, the bar under them). */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.ol'),
    handle: '.ol-handle',
    nests: true,
    contextClass: 'ol-context',
    label: t('Chosen items'),
    current: () => (this.visible().some((x) => x.at === this.sel) ? this.sel : null),
    span: (rows) => spanOf(this.doc, this.view, rows.map((r) => r.id)),
    edit: (at, offset) => this.focusRow(at, offset),
    remove: (s) => this.deleteSpan(s),
    canMove: (s, by) => !!moveSpan(this.doc, this.view, s, by),
    move: (s, by) => this.moveRange(s, by),
    canShift: (s, by) => !!shiftSpan(this.doc, this.view, s, by, this.floor),
    shift: (s, by) => this.shiftRange(s, by),
    duplicate: (s) => this.duplicate(s),
    copy: (s) => this.clip(s),
    paste: (data, s) => this.pasteData(data, s),
    drop: (at, to, how) => this.dropAt(at, to, how),
    extra: (s) => this.extraItems(s),
  });

  constructor() {
    super();
    this.folded = new Set();
    this.zoom = -1;
    this.sel = -1;
    this.connecting = null;
    this.menuFor = -1;
    this.naming = -1;
    this.showing = false;
  }
  protected read(doc: Doc) {
    return readOutline(doc);
  }
  protected willUpdate(changed: Map<string, unknown>) {
    super.willUpdate(changed);
    // Loose words (headings, paragraphs) arriving are made an outline: one splice, undoable like any edit (a document
    // arriving has no history yet; one undone back to loose words is left as the undo left it).
    if (changed.has('value') && this.view.loose && !this.canUndo && !this.canRedo) this.edit(listify(this.doc));
    if (this.zoom >= 0 && indexAt(this.view, this.zoom) < 0) this.zoom = -1;
  }
  /** Every edit: folds and the zoom follow the blocks they belong to; the selection before it is kept for its undo. */
  protected edit(ops: Op[], key?: string, mark?: unknown) {
    const r = this.rows.range;
    const now: Mark | undefined = r ? { range: { ...r } } : this.sel >= 0 ? { at: this.sel, offset: this.caretIn(this.sel) } : undefined;
    super.edit(ops, key, mark ?? now);
    this.remap(ops);
  }
  /** After an undo the selection comes back as it was before the edit; after a redo, where the edit left it. */
  protected undone(entry: Entry, redo: boolean) {
    this.menuFor = -1;
    this.connecting = null;
    this.rows.release();
    this.remap(redo ? entry.ops : entry.inverse);
    const mark = entry.mark as Mark | undefined;
    const ok = (at: number) => at >= 0 && indexAt(this.view, at) >= 0;
    if (mark && 'range' in mark) {
      const r = redo ? { anchor: mapAt(entry.ops, mark.range.anchor), focus: mapAt(entry.ops, mark.range.focus) } : mark.range;
      if (ok(r.anchor) && ok(r.focus)) return this.rows.select(r);
    } else if (mark && !redo && ok(mark.at)) return this.focusRow(mark.at, mark.offset);
    // Else the row the change touched first.
    const first = firstAt(entry);
    if (first < 0 || !this.items.length) return;
    const near = [...this.items].reverse().find((it) => it.at <= first) ?? this.items[0];
    this.focusRow(near.at);
  }
  /** Folds and the zoom are block indices: moved with their blocks, dropped with them. */
  private remap(ops: Op[]) {
    if (this.folded.size) this.folded = new Set([...this.folded].map((at) => mapAt(ops, at)).filter((at) => at >= 0));
    if (this.zoom >= 0) this.zoom = mapAt(ops, this.zoom);
  }
  connectedCallback() {
    super.connectedCallback();
    // (The rows controller hears the keys first; Escape while connecting is connecting's, so it is caught on the way down.)
    this.addEventListener('keydown', this.onEscape, true);
    this.addEventListener('keydown', this.onKey);
    // Capturing: before a row's own editor hears a paste.
    this.addEventListener('paste', this.onPaste, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onEscape, true);
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('paste', this.onPaste, true);
  }

  private blocksFor(b: Block): Block[] {
    let arr = this.rowBlocks.get(b);
    if (!arr) this.rowBlocks.set(b, (arr = [b]));
    return arr;
  }
  private get items(): Item[] {
    return this.view.items;
  }
  private itemAt(at: number): Item | undefined {
    return this.items[indexAt(this.view, at)];
  }

  /** The rows on screen: those inside the zoom, not hidden under a fold. */
  private visible(): Item[] {
    const items = this.items;
    const z = indexAt(this.view, this.zoom);
    const from = z >= 0 ? z : 0;
    const to = z >= 0 ? familyEnd(items, z) : items.length;
    const out: Item[] = [];
    let hideBelow = Infinity;
    for (let i = from; i < to; i++) {
      if (items[i].depth > hideBelow) continue;
      hideBelow = Infinity;
      out.push(items[i]);
      if (this.folded.has(items[i].at)) hideBelow = items[i].depth;
    }
    return out;
  }
  /** The depth the zoom starts at: rows are drawn stepped in from there. */
  private get base(): number {
    return this.itemAt(this.zoom)?.depth ?? 0;
  }

  /* ---------- focus ---------- */

  /** Choose the row at `at` and put the caret in its words (at the end, or at `offset`). */
  private focusRow(at: number, offset: number | 'end' = 'end') {
    this.sel = at;
    void this.updateComplete.then(() => {
      const row = this.querySelector<HTMLElement>(`.ol-row[data-at="${at}"]`);
      const tx = row?.querySelector<ToText>('to-text');
      if (!tx) return void row?.querySelector<HTMLElement>('.ol-doc')?.focus({ preventScroll: true });
      const b = this.doc.blocks[at];
      const len = b && isText(b) ? runLength(b.runs) : 0;
      tx.sel = caret(0, offset === 'end' ? len : Math.min(offset, len));
    });
  }
  /** Where the caret is in a row's words, or its end. */
  private caretIn(at: number): number {
    const tx = this.querySelector<ToText>(`.ol-row[data-at="${at}"] to-text`);
    const s = tx?.sel;
    const b = this.doc.blocks[at];
    return s ? s.focus.offset : b && isText(b) ? runLength(b.runs) : 0;
  }

  /* ---------- the words ---------- */

  /* ---------- rows chosen whole (kit/rows.ts) ---------- */

  /** The rows on screen as the rows controller takes them: each with its element and its family's blocks. */
  private rowItems(): RowItem<number>[] {
    return this.visible().map((it) => {
      const host = this;
      return {
        id: it.at,
        span: { from: it.at, to: family(this.doc, it.at, this.view.depths) },
        get el() {
          return host.querySelector<HTMLElement>(`.ol-row[data-at="${it.at}"]`)!;
        },
      };
    });
  }
  /** The rows inside the zoom go no shallower than its first level. */
  private get floor(): number {
    return this.zoom >= 0 ? this.base + 1 : 0;
  }
  /** The chosen rows taken away, families and all; the caret into the row before (or after, or the empty outline's first row). */
  private deleteSpan(s: RowSpan) {
    const vis = this.visible();
    const first = vis.findIndex((x) => x.at >= s.from);
    const before = first > 0 ? vis[first - 1] : undefined;
    const next = vis.find((x) => x.at >= s.to);
    this.edit(removeSpan(s));
    if (before) this.focusRow(before.at);
    else if (next) this.focusRow(next.at - (s.to - s.from), 0);
    else this.focusRow(-1);
  }
  private shiftRange(s: RowSpan, by: 1 | -1): RowRange<number> | null {
    const r = this.rows.range;
    const ops = shiftSpan(this.doc, this.view, s, by, this.floor);
    if (ops) this.edit(ops);
    return r;
  }
  private moveRange(s: RowSpan, by: 1 | -1): RowRange<number> | null {
    const r = this.rows.range;
    const ops = moveSpan(this.doc, this.view, s, by);
    if (!ops || !r) return r;
    this.edit(ops);
    return { anchor: mapAt(ops, r.anchor), focus: mapAt(ops, r.focus) };
  }
  /** The chosen rows again, right after them; the copy is chosen. */
  private duplicate(s: RowSpan): RowRange<number> | null {
    const r = this.rows.range;
    const d = duplicateSpan(this.doc, this.view, s);
    if (!d.ops.length) return r;
    this.edit(d.ops);
    return r && { anchor: r.anchor - s.from + d.at, focus: r.focus - s.from + d.at };
  }
  /** Mod+D in a row's words: the row and its family again after it, the caret in the copy where it was. */
  private duplicateRow(at: number) {
    const s = { from: at, to: family(this.doc, at, this.view.depths) };
    const offset = this.caretIn(at);
    const d = duplicateSpan(this.doc, this.view, s);
    this.edit(d.ops);
    this.focusRow(d.at, offset);
  }
  /** Numbered or not: the range's top rows, or the list the chosen row belongs to. */
  private number() {
    const s = this.rows.range ? this.rows.span() : null;
    if (s) {
      const tops = topsOf(this.view, s).map((it) => it.at);
      return this.edit(setOrdered(this.doc, tops, !tops.every((at) => this.isOrd(at))));
    }
    const it = this.itemAt(this.sel);
    if (it && !it.doc) this.edit(setOrdered(this.doc, siblingsOf(this.view, it.at), !it.ord));
  }
  private isOrd(at: number): boolean {
    const b = this.doc.blocks[at];
    return b?.k === 'li' && !!b.ord;
  }
  /** The outline's own item in the bar under chosen rows: Numbered, after Move down. */
  private extraItems(s: RowSpan): ContextEntry[] {
    const tops = topsOf(this.view, s);
    return [{ label: t('Numbered'), icon: ListOrdered, pressed: tops.length > 0 && tops.every((it) => this.isOrd(it.at)), disabled: !tops.some((it) => !it.doc), does: () => this.number() }];
  }

  /* ---------- the clipboard ---------- */

  /** What chosen rows put on the clipboard: their blocks as TLO, the shallowest at the margin, and as HTML. */
  private clip(s: RowSpan): Clip {
    const blocks = copySpan(this.doc, this.view, s);
    return { text: write({ head: {}, blocks }), html: docToHtml(blocks) };
  }
  /**
   * A paste into a row (chosen rows are the rows controller's): lines or list items go in as items after the row's
   * family (words alone, and words copied from a row, are the row's to paste).
   */
  private onPaste = (e: ClipboardEvent) => {
    const el = e.target as HTMLElement;
    const dt = e.clipboardData;
    if (!dt || this.rows.range || el.closest?.('.ol-doc, dialog, [popover], input, textarea')) return;
    const row = el.closest?.<HTMLElement>('.ol-row');
    if (!row) return;
    const data = { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') };
    const ours = data.html.includes(`content="${GENERATOR}"`);
    const oneLine = !data.text.trim().includes('\n');
    if (!(lastCopied()?.text === data.text || (pastesAsItems(data.text) && !(ours && oneLine)))) return;
    e.preventDefault();
    e.stopPropagation();
    const at = Number(row.dataset.at);
    this.pasteData(data, at >= 0 ? at : null);
  };
  /** Pasted data put in as items: ours (or plain text) read as TLO, HTML from elsewhere as blocks; the caret at the end of the last. */
  private pasteData(data: Clip, target: RowSpan | number | null) {
    const html = !data.html.includes(`content="${GENERATOR}"`) && data.html.trim() ? htmlToBlocks(data.html) : [];
    const t0 = target ?? (this.itemAt(this.sel) ? this.sel : null);
    const r = pasteBlocks(this.doc, this.view, html.length ? html : pasteText(data.text), t0);
    if (!r) return;
    this.edit(r.ops);
    this.rows.release();
    this.focusRow(r.to - 1);
  }

  private onOps(at: number, e: CustomEvent<TextOps>) {
    e.stopPropagation();
    const { ops, kind } = e.detail;
    const ghost = at < 0;
    const where = ghost ? Math.min(this.doc.blocks.length, ...this.view.links.map((l) => l.at)) : at;
    const shifted: Op[] = ops.map((o) => ('at' in o ? ({ ...o, at: o.at + where, ...(o.op === 'move' ? { to: o.to + where } : {}) } as Op) : o));
    const all: Op[] = ghost ? [{ op: 'splice', at: where, n: 0, blocks: [this.ghost] }, ...shifted] : shifted;
    const it = this.itemAt(at);
    const was = it && !it.doc ? nameOf(it.runs) : '';
    const doc = applyAll(this.doc, all);
    const after = doc.blocks[where];
    // Joins name items by their words, so they follow a renamed item.
    const now = after && isText(after) ? nameOf(after.runs) : '';
    const renames = was && now !== was ? renameIn(doc, readOutline(doc), was, now) : [];
    // A Tiny Little Office link pasted as an item is that document, under this item.
    const link = after?.k === 'li' ? refOfLink(plainText(after.runs)) : null;
    const asDoc: Op[] = link && after?.k === 'li' ? [{ op: 'splice', at: where, n: 1, blocks: [docBlock(after.depth, link)] }] : [];
    this.edit([...all, ...renames, ...asDoc], kind === 'type' && !asDoc.length ? `type:${where}` : undefined);
    if (ghost) this.focusRow(where, e.detail.sel.focus.offset);
    else if (asDoc.length) this.focusRow(where);
    // "1. " typed at the start of a row numbers its list: a step of its own, so an undo gives the marker back.
    const o = ops.length === 1 ? ops[0] : null;
    if (!asDoc.length && o?.op === 'text' && o.from === 2 && o.to === 2 && plainText(o.runs) === ' ') this.numberShortcut(where);
  }
  private numberShortcut(at: number) {
    const b = this.doc.blocks[at];
    if (b?.k !== 'li' || b.ord || !/^1[.)] $/.test(plainText(b.runs).slice(0, 3))) return;
    const ops: Op[] = [{ op: 'text', at, from: 0, to: 3, runs: [] }];
    const next = applyAll(this.doc, ops);
    this.edit([...ops, ...setOrdered(next, siblingsOf(readOutline(next), at), true)]);
    this.focusRow(at, 0);
  }
  /** Enter: at the start of words the row is pushed down, at the end a new item, in the middle the words split (model.ts, enterAt). */
  private onEnter(at: number) {
    if (at < 0) return;
    const r = enterAt(this.doc, this.view, at, this.caretIn(at), this.folded.has(at));
    this.edit(r.ops);
    this.focusRow(r.at, r.offset);
  }
  /**
   * Backspace at the start of a row, or Delete at its end. An empty row goes (its family comes out a level) and the
   * caret goes to the row above (Delete: below). A row with words is joined to the item before it, unfolded first if
   * it is hidden; Delete joins the next item into the row.
   */
  private onExit(at: number, dir: 'back' | 'forward') {
    const it = this.itemAt(at);
    const b = this.doc.blocks[at];
    if (!it || !b || !isText(b)) return;
    if (!plainText(b.runs).trim() && !b.runs.some(isAtomic)) return this.removeRow(at, dir === 'forward');
    const i = indexAt(this.view, at);
    if (dir === 'back') {
      if (at === this.zoom || i < 1) return;
      const r = joinBack(this.doc, this.view, at);
      if (!r) return;
      this.unhide(i - 1);
      this.edit(r.ops);
      return this.focusRow(r.at, r.offset);
    }
    const z = indexAt(this.view, this.zoom);
    if (z >= 0 && i + 1 >= familyEnd(this.items, z)) return;
    const r = joinForward(this.doc, this.view, at);
    if (!r) return;
    if (this.folded.has(at)) this.fold(at, false);
    this.edit(r.ops);
    this.focusRow(r.at, r.offset);
  }
  /** The folds that hide item i opened. */
  private unhide(i: number) {
    const f = new Set(this.folded);
    for (let p = parentOf(this.items, i); p >= 0; p = parentOf(this.items, p)) f.delete(this.items[p].at);
    if (f.size !== this.folded.size) this.folded = f;
  }
  private removeRow(at: number, forward = false) {
    const vis = this.visible();
    const i = vis.findIndex((x) => x.at === at);
    const to = (forward ? (vis[i + 1] ?? vis[i - 1]) : (vis[i - 1] ?? vis[i + 1]))?.at ?? -1;
    this.edit(removeAt(this.doc, this.view, at));
    if (to >= 0) this.focusRow(to > at ? to - 1 : to, to > at && forward ? 0 : 'end');
    else this.sel = -1;
  }

  /* ---------- the tree ---------- */

  private shiftBy(at: number, by: 1 | -1) {
    const ops = shiftItem(this.doc, this.view, at, by);
    if (!ops) return;
    const offset = this.caretIn(at);
    this.edit(ops);
    this.focusRow(at, offset);
  }
  private moveBy(at: number, by: 1 | -1) {
    const ops = moveItem(this.doc, this.view, at, by);
    if (!ops) return;
    const offset = this.caretIn(at);
    this.edit(ops);
    this.focusRow(this.landing(ops, at), offset);
  }
  /** Where a family moved by these ops now starts: the move's `to`. */
  private landing(ops: Op[], at: number): number {
    const move = ops.find((o) => o.op === 'move');
    return move && move.op === 'move' ? move.to : at;
  }
  private fold(at: number, shut = !this.folded.has(at)) {
    const f = new Set(this.folded);
    shut ? f.add(at) : f.delete(at);
    this.folded = f;
  }
  private foldAll(shut: boolean) {
    this.folded = new Set(shut ? this.items.filter((_, i) => hasChildren(this.items, i)).map((it) => it.at) : []);
  }
  private zoomTo(at: number) {
    this.zoom = at;
    if (at >= 0) this.fold(at, false);
    this.focusRow(at >= 0 ? at : (this.items[0]?.at ?? -1));
  }
  private zoomOut() {
    const i = indexAt(this.view, this.zoom);
    if (i < 0) return;
    const p = parentOf(this.items, i);
    this.zoomTo(p >= 0 ? this.items[p].at : -1);
  }
  /** A new item at the end of what is shown, from Insert or a tap under the last row: at the margin, or last inside the zoomed item. */
  private addItem() {
    const vis = this.visible();
    const last = vis[vis.length - 1];
    if (last && !last.doc && !plainText(last.runs).trim()) return this.focusRow(last.at);
    const z = indexAt(this.view, this.zoom);
    const end = z >= 0 ? familyEnd(this.items, z) : -1;
    const r = z < 0 ? appendItem(this.doc, this.view, 0) : { at: end < this.items.length ? this.items[end].at : itemsEnd(this.doc, this.view), depth: this.base + 1 };
    const ops: Op[] = 'ops' in r ? r.ops : [{ op: 'splice', at: r.at, n: 0, blocks: [itemBlock(r.depth, [])] }];
    this.edit(ops);
    this.focusRow(r.at, 0);
  }

  /* ---------- lines and joins ---------- */

  private async openLineMenu(at: number, from: HTMLElement) {
    this.menuFor = at;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('.ol-line-menu')!;
    await menu.updateComplete;
    menu.openAt(from);
    // (A toggle event does not bubble: the popover itself says when it has closed.)
    menu.menu.addEventListener('toggle', (e) => (e as ToggleEvent).newState === 'closed' && this.menuFor === at && (this.menuFor = -1), { once: true });
  }
  /** The two ends of a line: an item's parent and the item, or a join's. */
  private endsOf(at: number): Ends | null {
    const b = this.doc.blocks[at];
    if (b?.k === 'edge') return { from: b.from, to: b.to, dir: b.dir, label: b.label, edge: true };
    const i = indexAt(this.view, at);
    if (i < 0) return null;
    const it = this.items[i];
    const p = parentOf(this.items, i);
    if (p < 0) return null;
    return { from: plainText(this.items[p].runs).trim() || t('the item above'), to: plainText(it.runs).trim() || t('this item'), dir: it.dir ?? '--', label: it.label, edge: false };
  }
  private setDir(at: number, dir: Dir) {
    const b = this.doc.blocks[at];
    this.edit(b?.k === 'edge' ? setLink(this.doc, at, { dir }) : setLine(this.doc, this.view, at, { dir }));
  }
  private lineItems(): MenuItem[] {
    const at = this.menuFor;
    const ends = at >= 0 ? this.endsOf(at) : null;
    if (!ends) return [];
    const said = ends.edge ? t('Connection from {from} to {to}', ft(ends)) : t('Line from {from} to {to}', ft(ends));
    const kinds: [Dir, string][] = [
      ['--', t('Plain line')],
      ['->', t('Arrow from {from} to {to}', { from: ends.from, to: ends.to })],
      ['<-', t('Arrow from {from} to {to}', { from: ends.to, to: ends.from })],
      ['<->', t('Arrows both ways')],
    ];
    const i = indexAt(this.view, at);
    return [
      ...kinds.map(([dir, label]) => ({ group: said, label, icon: DIR_ICON[dir] ?? Minus, checked: ends.dir === dir, does: () => this.setDir(at, dir) })),
      { label: t('Name the line'), icon: UI.pen, hint: ends.label, does: () => this.openNaming(at) },
      ...(i >= 0 && hasChildren(this.items, i) ? [{ label: t('Zoom in'), icon: ZoomIn, does: () => this.zoomTo(at) }] : []),
      ...(ends.edge ? [{ label: t('Take the connection away'), icon: UI.trash, does: () => this.edit(unlink(this.doc, at)) }] : []),
    ];
  }
  /**
   * The line's name typed where it is shown: its chip becomes a field (one comes where there was none), drawn and
   * focused at once, in the menu's or the tap's own handler (iOS raises its keyboard only so). Enter or a tap
   * elsewhere keeps it, emptied takes the name away; Escape leaves it be.
   */
  private openNaming(at: number) {
    this.naming = at;
    this.performUpdate();
    const box = this.querySelector<HTMLInputElement>('input.ol-label-in');
    box?.focus({ preventScroll: true });
    box?.select();
  }
  private saveName(keep: boolean, value: string) {
    const at = this.naming;
    if (at < 0) return;
    this.naming = -1;
    const b = this.doc.blocks[at];
    const label = value.replace(/\s+/g, ' ').trim();
    if (keep && label !== (this.endsOf(at)?.label ?? '')) this.edit(b?.k === 'edge' ? setLink(this.doc, at, { label }) : setLine(this.doc, this.view, at, { label }));
  }
  /** Connect: start from the chosen item, or pick one first; everything else goes grey until the other end is tapped. */
  private connect() {
    const it = this.itemAt(this.sel);
    this.connecting = this.connecting ? null : { from: it && !it.doc && plainText(it.runs).trim() ? it.at : -1 };
  }
  private pick(at: number) {
    const c = this.connecting;
    if (!c) return;
    if (c.from < 0) return void (this.connecting = { from: at });
    this.connecting = null;
    this.edit(connect(this.doc, this.view, c.from, at));
  }

  /* ---------- documents ---------- */

  /** A document (or a thing from the web, `web\n<address>`) under the item chosen when it was asked for (or at the end). */
  private putDoc(sel: number, ref: string) {
    const r = insertDoc(this.doc, this.view, sel, ref);
    this.edit(r.ops);
    this.focusRow(r.at);
  }
  /** A new document of that app, made in its own editor in the dialog: Done puts it under the chosen item, Cancel puts nothing. */
  private async insertApp(id: string) {
    const sel = this.sel;
    const fence = await makeDoc(id);
    if (fence) this.putDoc(sel, fenceRef(fence));
  }
  private async insertWeb() {
    const sel = this.sel;
    const url = await askEmbed();
    if (url) this.putDoc(sel, refOfLink(url) ?? `web\n${url}`);
  }
  private async insertLinked() {
    const sel = this.sel;
    const fence = await askDocLink();
    if (fence?.k === 'fence') this.putDoc(sel, fenceRef(fence));
  }
  /** The document under an item, edited in its own app in the dialog: Done writes it back as one step. */
  private async editRow(at: number) {
    const b = this.doc.blocks[at];
    if (b?.k !== 'fence' || !appOf(b.lang)) return;
    const next = await editFence(b);
    if (next && this.doc.blocks[at] === b) this.edit(setDoc(this.doc, at, fenceRef(next)));
    this.focusRow(at);
  }
  /** A document's link pasted over its card replaces it: the way an edit made in its own app comes back. */
  private onDocPaste(at: number, e: ClipboardEvent) {
    const ref = refOfLink(e.clipboardData?.getData('text/plain') ?? '');
    const b = this.doc.blocks[at];
    if (!ref || b?.k !== 'fence' || !ref.startsWith(`${b.lang}\n`)) return;
    e.preventDefault();
    this.edit(setDoc(this.doc, at, ref));
  }

  /* ---------- keys ---------- */

  /** Escape while connecting cancels it (before the rows controller would take the Escape for the row). */
  private onEscape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this.connecting) return;
    const target = e.composedPath()[0] as HTMLElement;
    if (target.closest?.('[popover]') || target.closest?.('dialog')) return;
    e.preventDefault();
    e.stopPropagation();
    this.connecting = null;
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.composedPath()[0] as HTMLElement;
    if (target.closest?.('[popover]') || target.closest?.('dialog')) return;
    // Rows chosen whole: the rows controller has the keys.
    if (this.rows.range && !target.closest?.('to-text')) return;
    const row = target.closest?.('.ol-row') as HTMLElement | null;
    const at = row ? Number(row.dataset.at) : NaN;
    if (!Number.isFinite(at) || at < 0) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const plain = !mod && !e.altKey && !e.shiftKey;
    const vis = this.visible();
    const i = vis.findIndex((x) => x.at === at);
    const tx = target.closest?.('to-text') as ToText | null;
    const s = tx?.sel;
    const flat = !!s && s.anchor.offset === s.focus.offset;
    if (k === 'Tab' && !mod && !e.altKey) this.shiftBy(at, e.shiftKey ? -1 : 1);
    else if (mod && e.altKey && k === 'ArrowUp') this.fold(at, true);
    else if (mod && e.altKey && k === 'ArrowDown') this.fold(at, false);
    else if (e.altKey && !mod && k === 'ArrowUp') this.moveBy(at, -1);
    else if (e.altKey && !mod && k === 'ArrowDown') this.moveBy(at, 1);
    else if (plain && (k === 'ArrowUp' || k === 'ArrowDown')) {
      const to = vis[k === 'ArrowUp' ? i - 1 : i + 1];
      if (!to || !tx || !this.atEdgeLine(tx, k === 'ArrowUp')) return;
      this.focusRow(to.at, this.columnIn(to.at, k === 'ArrowUp'));
    } else if (plain && k === 'ArrowLeft' && flat && tx && s.focus.offset === 0 && i > 0) this.focusRow(vis[i - 1].at, 'end');
    else if (plain && k === 'ArrowRight' && flat && tx && s.focus.offset >= this.lengthOf(at) && i >= 0 && i < vis.length - 1) this.focusRow(vis[i + 1].at, 0);
    else if (mod && e.shiftKey && !e.altKey && (e.code === 'Period' || k === '.' || k === '>')) this.zoomTo(at);
    else if (mod && e.shiftKey && !e.altKey && (e.code === 'Comma' || k === ',' || k === '<')) this.zoomOut();
    else if (mod && !e.shiftKey && !e.altKey && k.toLowerCase() === 'd') this.duplicateRow(at);
    else if ((k === 'Backspace' || k === 'Delete') && this.itemAt(at)?.doc && !target.closest('to-text')) this.removeRow(at);
    else return;
    e.preventDefault();
  };
  private lengthOf(at: number): number {
    const b = this.doc.blocks[at];
    return b && isText(b) ? runLength(b.runs) : 0;
  }
  /** Whether the caret is on the first (up) or last (down) line of its words, where Up/Down leave the row; inside a long item they walk its lines. */
  private atEdgeLine(tx: ToText, up: boolean): boolean {
    const dom = document.getSelection();
    if (!dom?.rangeCount) return true;
    const caretRect = [...dom.getRangeAt(0).getClientRects()].at(up ? 0 : -1);
    const all = document.createRange();
    all.selectNodeContents(tx.tx);
    const lines = [...all.getClientRects()].filter((r) => r.height > 0);
    if (!caretRect || !caretRect.height || lines.length < 2) return true;
    const lh = parseFloat(getComputedStyle(tx.tx).lineHeight) || 24;
    const top = Math.min(...lines.map((r) => r.top));
    const bottom = Math.max(...lines.map((r) => r.bottom));
    return up ? caretRect.top - top < lh / 2 : bottom - caretRect.bottom < lh / 2;
  }
  /** Where the caret lands in the row it moves to: under where it was (its last line going up, its first going down). */
  private columnIn(at: number, up: boolean): number | 'end' {
    const dom = document.getSelection();
    const x = dom?.rangeCount ? dom.getRangeAt(0).getBoundingClientRect().left : NaN;
    const tx = this.querySelector<ToText>(`.ol-row[data-at="${at}"] to-text`);
    if (!tx || !Number.isFinite(x) || !x) return up ? 'end' : 0;
    const all = document.createRange();
    all.selectNodeContents(tx.tx);
    const lines = [...all.getClientRects()].filter((r) => r.height > 0);
    const line = up ? lines.at(-1) : lines[0];
    if (!line) return up ? 'end' : 0;
    const y = line.top + line.height / 2;
    const doc = document as Document & { caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null };
    const hit = doc.caretPositionFromPoint?.(x, y) ?? (() => {
      const r = document.caretRangeFromPoint?.(x, y);
      return r ? { offsetNode: r.startContainer, offset: r.startOffset } : null;
    })();
    const pos = hit && tx.tx.contains(hit.offsetNode) ? tx.readPos(hit.offsetNode, hit.offset) : null;
    return pos ? pos.offset : x > line.right ? 'end' : 0;
  }

  /* ---------- dragging (the rows controller's pointer drag lands here) ---------- */

  /** The family at `at` placed under or after the item at `to`; the caret follows it. */
  dropAt(at: number, to: number, how: 'under' | 'after') {
    const ops = placeItem(this.doc, this.view, at, to, how);
    if (!ops) return;
    this.edit(ops);
    this.focusRow(this.landing(ops, at));
  }

  /* ---------- the bar ---------- */

  private inserts(): MenuItem[] {
    return [
      { label: t('Item'), icon: Plus, does: () => this.addItem() },
      { label: t('Web Embed…'), icon: UI.globe, does: () => void this.insertWeb() },
      { label: t('Tiny Little Office Doc…'), icon: UI.insert, does: () => void this.insertLinked() },
      ...apps()
        .filter((a) => a.id !== def.id)
        .map((a) => ({ group: t('A new document'), label: a.name, icon: a.icon, does: () => void this.insertApp(a.id) })),
    ];
  }
  /** The outline seen as another kind of document: as a page here; in another app, in a new tab, where that app exists. */
  private viewItems(): MenuItem[] {
    return [
      { label: t('As a page'), icon: UI.print, does: () => this.showPage() },
      ...(def.handoffs ?? [])
        .filter((h) => appOf(h.to))
        .map((h) => ({ label: h.label(), icon: appOf(h.to)!.icon, does: () => window.open(location.pathname + routeHash(h.to, encodeDoc(h.convert(write(this.doc)))), '_blank', 'noopener') })),
    ];
  }
  private showPage() {
    this.showing = true;
    void this.updateComplete.then(() => this.querySelector<ToDialog>('.ol-page-dialog')?.show());
  }
  private async pickIcon() {
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon();
    if (name) this.field?.exec('icon', name);
  }

  private renderBar() {
    const s = this.sel;
    const it = this.itemAt(s);
    const i = indexAt(this.view, s);
    const none = !it;
    const words = !!it && !it.doc;
    const m = this.field?.marks ?? {};
    const c = this.connecting;
    const on = (k: 'b' | 'i' | 'u' | 's' | 'h') => !!m[k];
    return html`<to-bar class="ol-bar">
      <to-insert .items=${this.inserts()}></to-insert>
      ${tool({ label: t('Bold'), icon: UI.bold, keys: 'Mod+B', keep: true, pressed: on('b'), disabled: !words, does: () => this.field?.exec('b') })}
      ${tool({ label: t('Italic'), icon: UI.italic, keys: 'Mod+I', keep: true, pressed: on('i'), disabled: !words, does: () => this.field?.exec('i') })}
      ${tool({ label: t('Underline'), icon: UI.underline, keys: 'Mod+U', keep: true, pressed: on('u'), disabled: !words, does: () => this.field?.exec('u') })}
      ${tool({ label: t('Strikethrough'), icon: UI.strike, keep: true, pressed: on('s'), disabled: !words, does: () => this.field?.exec('s') })}
      ${tool({ label: t('Highlight'), icon: UI.highlight, keep: true, pressed: on('h'), disabled: !words, does: () => this.field?.exec('h') })}
      ${tool({ label: t('Link'), icon: UI.link, keys: 'Mod+K', keep: true, pressed: !!m.href, disabled: !words, does: () => this.field?.exec('link') })}
      ${tool({ label: t('Icon'), icon: UI.icon, keep: true, disabled: !words, does: () => void this.pickIcon() })}
      ${tool({ label: t('Footnote'), icon: UI.footnote, keep: true, disabled: !words, does: () => this.field?.exec('fn') })}
      ${tool({ label: t('Indent'), icon: UI.indent, keys: 'Tab', keep: true, disabled: none || !shiftItem(this.doc, this.view, s, 1), does: () => this.shiftBy(s, 1) })}
      ${tool({ label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', keep: true, disabled: none || !shiftItem(this.doc, this.view, s, -1), does: () => this.shiftBy(s, -1) })}
      ${tool({ label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', keep: true, disabled: none || !moveItem(this.doc, this.view, s, -1), does: () => this.moveBy(s, -1) })}
      ${tool({ label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', keep: true, disabled: none || !moveItem(this.doc, this.view, s, 1), does: () => this.moveBy(s, 1) })}
      ${tool({ label: t('Numbered'), icon: ListOrdered, keep: true, pressed: !!it?.ord, disabled: !words, does: () => this.number() })}
      ${this.zoom >= 0 ? tool({ label: t('Zoom out'), icon: ZoomOut, keys: 'Mod+Shift+,', keep: true, does: () => this.zoomOut() }) : nothing}
      ${tool({ label: t('Zoom in'), icon: ZoomIn, keys: 'Mod+Shift+.', keep: true, disabled: none || !hasChildren(this.items, i), does: () => this.zoomTo(s) })}
      ${tool({ label: t('Fold all'), icon: FoldVertical, keep: true, does: () => this.foldAll(true) })}
      ${tool({ label: t('Unfold all'), icon: UnfoldVertical, keep: true, does: () => this.foldAll(false) })}
      ${btn({ label: c ? t('Cancel connecting') : t('Connect'), icon: c ? UI.close : Link2, pressed: !!c, keep: true, does: () => this.connect() })}
      <to-menu class="ol-view-as" .label=${t('View as')} .icon=${Eye} caret .items=${this.viewItems()}></to-menu>
      ${this.undoTools()}
    </to-bar>`;
  }

  /* ---------- the rows ---------- */

  /** The bullet that is a line to the parent: a dot, or an arrow which way it points; tapped, it opens the line's menu. */
  private bullet(at: number, ends: Ends, n?: number): TemplateResult {
    const glyph = DIR_ICON[ends.dir];
    const label = `${ends.edge ? t('Connection from {from} to {to}', ft(ends)) : t('Line from {from} to {to}', ft(ends))}: ${DIR_NAME[ends.dir]()}${ends.label ? t(', named “{label}”', { label: ends.label }) : ''}. ${t('Change it')}`;
    return html`<button type="button" class="ol-kind" data-dir=${ends.dir} aria-label=${label} title=${label} aria-haspopup="menu" aria-expanded=${this.menuFor === at ? 'true' : 'false'} @mousedown=${(e: Event) => e.preventDefault()} @click=${(e: MouseEvent) => (e.shiftKey && this.itemAt(at) ? this.rows.choose(at, true) : void this.openLineMenu(at, e.currentTarget as HTMLElement))}>${n ? html`<b class="ol-n">${n}.</b>` : glyph ? icon(glyph, 14) : html`<span></span>`}</button>`;
  }
  /** A line's name, as a chip before the words; tapped, its name is typed there. */
  private chip(at: number, label?: string) {
    if (this.naming === at)
      return html`<input class="ol-label ol-label-in" aria-label=${t('Name of the line')} placeholder=${t('e.g. owns, feeds, reports to')} .value=${label ?? ''} autocomplete="off" spellcheck="false"
        @keydown=${(e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
          e.preventDefault();
          this.saveName(e.key === 'Enter', (e.target as HTMLInputElement).value);
        }}
        @blur=${(e: FocusEvent) => this.saveName(true, (e.target as HTMLInputElement).value)} />`;
    return label ? html`<button type="button" class="ol-label" aria-label=${t('Line named “{label}”: change it', { label })} @click=${() => this.openNaming(at)}>${label}</button>` : nothing;
  }
  /** Another document under an item: its app and first line, a way to open it in its own app, and the way back (its link pasted over the card). */
  private renderDoc(it: Item) {
    const web = it.doc!.startsWith('web\n');
    const { app, gist } = docGist(it.doc!);
    const body = it.doc!.slice(it.doc!.indexOf('\n') + 1);
    const href = web ? it.doc!.slice(4) : location.pathname + routeHash(app, encodeDoc(body));
    return html`<div class="ol-doc" tabindex="0" role="group" aria-label=${web ? t('From the web: {url}', { url: href }) : appOf(app) ? t('A {noun}', { noun: appOf(app)!.noun }) : t('{app} document', { app: appName(app) })} @paste=${(e: ClipboardEvent) => this.onDocPaste(it.at, e)}>
      <span class="ol-doc-kind">${web ? icon(UI.globe, 16) : appOf(app) ? icon(appOf(app)!.icon, 16) : nothing}<b>${web ? t('From the web') : appName(app)}</b></span>
      <span class="ol-doc-gist">${web ? href : gist || t('Empty')}</span>
      ${!web && appOf(app) ? tool({ label: t('Edit'), icon: UI.pen, cls: 'ol-doc-edit', does: () => void this.editRow(it.at) }) : nothing}
      <a class="to-btn to-tool" href=${href} target="_blank" rel="noopener" aria-label=${t('Open in a new tab')} title=${t('Open in a new tab')}>${icon(UI.open, 16)}</a>
      ${tool({ label: t('Take it away'), icon: UI.close, does: () => this.removeRow(it.at) })}
    </div>`;
  }
  private renderRow(it: Item, noteStart: number, placeholder: string, n: number | undefined, ranged: boolean): TemplateResult {
    const items = this.items;
    const i = indexAt(this.view, it.at);
    const at = it.at;
    const kids = i >= 0 && hasChildren(items, i);
    const shut = this.folded.has(at);
    const ends = at >= 0 ? this.endsOf(at) : null;
    const d = this.rows.drag;
    const c = this.connecting;
    const block = at >= 0 ? this.doc.blocks[at] : this.ghost;
    const words = plainText(it.runs).trim();
    // A row that is one web address shows as a thing from the web once the caret has left it.
    const asDoc = !!it.doc && !(it.doc.startsWith('web\n') && this.sel === at && block.k === 'li' && webAddress(block.runs));
    const inside = kids ? familyEnd(items, i) - i - 1 : 0;
    return html`<div
      class="ol-row ${at === this.sel && !this.rows.range ? 'sel' : ''} ${ranged ? 'ranged' : ''} ${kids ? 'parent' : ''} ${kids && shut ? 'shut' : ''} ${d?.id === at ? 'dragging' : ''} ${c?.from === at ? 'source' : ''}"
      data-at=${at}
      role="treeitem"
      aria-level=${it.depth - this.base + 1}
      aria-expanded=${kids ? (shut ? 'false' : 'true') : nothing}
      aria-selected=${ranged || (at === this.sel && !this.rows.range) ? 'true' : 'false'}
      style="--d:${it.depth - this.base}"
      @focusin=${() => (this.sel = at)}
    >
      <span class="ol-gutter">
        <button type="button" class="ol-handle to-rows-handle" aria-label=${t('Move this item: drag it onto another')} title=${t('Drag to move')} tabindex="-1">${icon(GripVertical, 14)}</button>
        ${kids ? html`<button type="button" class="ol-fold" aria-label=${shut ? t('Unfold, {n|one inside|# inside}', { n: inside }) : t('Fold')} aria-expanded=${shut ? 'false' : 'true'} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.fold(at)}>${icon(shut ? ChevronRight : ChevronDown, 14)}</button>` : nothing}
      </span>
      ${ends ? html`<span class="ol-bullet">${this.bullet(at, ends, n)}</span>${this.chip(at, it.label)}` : html`<span class="ol-bullet" @click=${(e: MouseEvent) => e.shiftKey && this.rows.choose(at, true)}><span class="ol-kind root" aria-hidden="true">${n ? html`<b class="ol-n">${n}.</b>` : html`<span></span>`}</span></span>`}
      ${asDoc
        ? this.renderDoc(it)
        : html`<to-text shape="line" .blocks=${this.blocksFor(block)} .noteStart=${noteStart} label=${t('Item {n}', { n: i + 1 })} placeholder=${placeholder} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(at, e)} @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(at))} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(at, e.detail.dir))} @text-selectall=${(e: Event) => (e.stopPropagation(), this.rows.selectAll())} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect(at, e)}></to-text>`}
      ${kids && shut ? html`<span class="ol-count" aria-hidden="true">${inside}</span>` : nothing}
      ${c && words && !it.doc && at !== c.from ? html`<button type="button" class="ol-pick" aria-label=${c.from < 0 ? t('Connect from “{words}”', { words }) : t('Connect “{from}” to “{to}”', { from: plainText(this.itemAt(c.from)?.runs ?? []).trim(), to: words })} @click=${() => this.pick(at)}></button>` : nothing}
    </div>`;
  }
  private onSelect(at: number, e: CustomEvent<Sel | null>) {
    e.stopPropagation();
    if (e.detail) {
      this.field = e.target as ToText;
      this.sel = at;
    }
    this.requestUpdate();
  }

  private crumbs() {
    const z = indexAt(this.view, this.zoom);
    if (z < 0) return nothing;
    const trail: number[] = [];
    for (let p = z; p >= 0; p = parentOf(this.items, p)) trail.unshift(p);
    return html`<nav class="ol-crumbs" aria-label=${t('Zoomed in on')}>
      <button type="button" @click=${() => this.zoomTo(-1)}>${icon(UI.home, 14)} ${t('Everything')}</button>
      ${trail.map((p) => html`<span aria-hidden="true">›</span><button type="button" @click=${() => this.zoomTo(this.items[p].at)} aria-current=${p === z ? 'true' : 'false'}>${plainText(this.items[p].runs).trim() || t('Untitled')}</button>`)}
    </nav>`;
  }

  /** The joins, under the outline: each with its kind of line, its name, and a way to take it away. */
  private renderLinks(links: Link[]) {
    if (!links.length) return nothing;
    return html`<section class="ol-links" aria-label=${t('Connections')}>
      <h2>${t('Connections')}</h2>
      ${links.map((l) => {
        const ends = this.endsOf(l.at)!;
        return html`<div class="ol-link" data-at=${l.at}>
          <span class="ol-end">${l.from}</span>
          <span class="ol-bullet">${this.bullet(l.at, ends)}</span>${this.chip(l.at, l.label)}
          <span class="ol-end">${l.to}</span>
          ${tool({ label: t('Take away the connection from {from} to {to}', { from: l.from, to: l.to }), icon: UI.close, does: () => this.edit(unlink(this.doc, l.at)) })}
        </div>`;
      })}
    </section>`;
  }

  render() {
    const items = this.items;
    const vis = this.visible();
    const c = this.connecting;
    // Footnotes number through the whole outline, as the page does: each item's marks count on from the items before.
    const noteStart = new Map<number, number>();
    let noted = 0;
    for (const it of items) {
      noteStart.set(it.at, noted);
      noted += it.runs.filter((r) => r.fn !== undefined).length;
    }
    const first = t('Start with an idea; Enter for the next; Tab to put it under');
    // Numbered items show their numbers as the text writes them.
    const count = listNumbers();
    const numbers = this.doc.blocks.map((b) => count(b));
    const s = this.rows.range ? this.rows.span() : null;
    const rows = items.length ? vis : [{ at: -1, depth: this.base, runs: [] } as Item];
    return html`${this.renderBar()}
      ${c ? html`<p class="ol-hint to-hint" role="status">${c.from < 0 ? t('Tap the item to connect from.') : t('Tap the item to connect “{words}” to.', { words: plainText(this.itemAt(c.from)?.runs ?? []).trim() })}</p>` : nothing}
      ${this.crumbs()}
      <div class="ol ${c ? 'connecting' : ''}" role="tree" tabindex="-1" aria-multiselectable="true" aria-label=${t('Outline')}>
        ${repeat(
          rows,
          (it) => it.at,
          (it) => this.renderRow(it, noteStart.get(it.at) ?? 0, items.length <= 1 ? first : '', numbers[it.at], !!s && it.at >= s.from && it.at < s.to),
        )}
        <div class="ol-below" aria-hidden="true" @click=${() => (this.rows.release(), this.addItem())}></div>
      </div>
      ${this.renderLinks(liveLinks(this.view))}
      ${this.rows.renderContext()}
      <to-menu class="ol-line-menu" .label=${t('Kind of line')} .items=${this.lineItems()}></to-menu>
      ${this.renderNotes(items)}
      ${this.renderPageDialog()}`;
  }

  /** The footnotes, under the outline, numbered as their marks are (as a slide's are at its foot). */
  private renderNotes(items: Item[]) {
    const notes = items.flatMap((it) => it.runs.filter((r) => r.fn !== undefined).map((r) => r.fn!));
    if (!notes.length) return nothing;
    return html`<ol class="ol-fn" aria-label=${t('Footnotes')}>
      ${notes.map((fn) => html`<li>${noteWords(fn)}</li>`)}
    </ol>`;
  }
  private renderPageDialog() {
    return html`<to-dialog class="ol-page-dialog" heading=${t('As a page')} @to-close=${() => (this.showing = false)} .body=${this.showing ? html`<div class="ol-page">${unsafeSVG(gateSvg(pageSvg(outlinePage(this.doc))))}</div>` : nothing}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToOutlineEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-outline-editor': ToOutlineEditor;
  }
}
