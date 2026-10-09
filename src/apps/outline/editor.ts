/**
 * <to-outline-editor>: an outliner. Every row is an item, its words a <to-text shape=line> over the item's
 * block; Enter makes another, Tab and Shift+Tab take it in and out with its family, Alt+arrows move and fold
 * it, a handle drags it onto another item, and any item can be zoomed in on. The one bar formats the words of
 * the chosen row, arranges it, zooms, folds, connects and shows the outline as other things. Each item's
 * bullet is the line to its parent, tapped to turn it (plain, an arrow out, an arrow back, both ways) and to
 * name it; Connect joins any two items. Every change is operations on the document (model.ts): the kernel's
 * family helpers for the tree, splices for lines, joins and documents, and the row editor's own ops for words.
 * Folds, the zoom, the chosen row and connecting are the editor's state, not the document's.
 *
 * It behaves as a bulleted list does: Enter at the start of words pushes the row down, Backspace at the start joins
 * the row to the item before it and Delete at the end joins the next one in. Rows can be chosen whole, as nodes (a
 * range): Shift+arrows from the caret, a tap on a row's handle, Select All twice. A range is a span of blocks, every
 * chosen row's family with it; it is copied, cut, pasted, deleted, indented and moved as one, from the keys or from a
 * small bar that comes up under it. Any list can be numbered.
 */
import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, ChevronDown, ChevronRight, ClipboardPaste, Copy, Eye, FoldVertical, GripVertical, Link2, ListOrdered, Minus, Plus, Scissors, UnfoldVertical, ZoomIn, ZoomOut } from 'lucide';
import { applyAll, family, isAtomic, isText, listNumbers, plainText, runLength, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { btn, tool } from '../../kit/bar.ts';
import { appOf, apps } from '../../kit/apps.ts';
import { docToHtml, GENERATOR, htmlToBlocks } from '../../kit/clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/context.ts';
import { decodeDoc, encodeDoc } from '../../kit/codec.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { pageSvg } from '../../kit/draw.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { parseHash, routeHash } from '../../kit/route.ts';
import type { Sel, TextOps, ToText } from '../../kit/text.ts';
import { caret } from '../../kit/textops.ts';
import { appendItem, connect, copySpan, docBlock, enterAt, familyEnd, hasChildren, indexAt, insertDoc, itemBlock, itemsEnd, joinBack, joinForward, listify, liveLinks, mapAt, moveItem, moveSpan, nameOf, parentOf, pasteBlocks, pastesAsItems, pasteText, placeItem, readOutline, removeAt, removeSpan, renameIn, setDoc, setLine, setLink, setOrdered, shiftItem, shiftSpan, siblingsOf, spanOf, topsOf, unlink, webAddress, type Dir, type Item, type Link, type OutlineView, type Span } from './model.ts';
import { appName, docGist, outlinePage } from './view.ts';
import def from './def.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/dialog.ts';
import '../../kit/text.ts';
import '../../kit/context.ts';
import './style.css';

export const tag = 'to-outline-editor';

/** How each kind of line is said. */
export const DIR_NAME: Record<Dir, () => string> = { '--': () => t('a plain line'), '->': () => t('an arrow from the parent'), '<-': () => t('an arrow to the parent'), '<->': () => t('arrows both ways') };
const DIR_ICON: Record<Dir, typeof ArrowRight | null> = { '--': null, '->': ArrowRight, '<-': ArrowLeft, '<->': ArrowLeftRight };

/** A TinyLittleOffice link as a ref ("<app>\n<text>"), or null when the words are not one. */
export function refOfLink(words: string): string | null {
  const s = words.trim();
  if (!/^https?:\/\/\S+#\/v\d+\//.test(s)) return null;
  const { app, payload } = parseHash(s.slice(s.indexOf('#')));
  if (!app) return null;
  const text = decodeDoc(payload);
  return payload && !text ? null : `${app}\n${text}`;
}

type Drag = { at: number; over: number; how: 'under' | 'after' };
/** Rows chosen whole: where the choosing started and where it is now, by block index. */
type Range = { anchor: number; focus: number };
/** The last rows copied here, so a paste in this page knows them (and works when the clipboard is refused). */
let copied: { text: string; html: string } | null = null;
type Ends = { from: string; to: string; dir: Dir; label?: string; edge: boolean };
/** A line's two ends, as t() takes them. */
const ft = (e: Ends) => ({ from: e.from, to: e.to });

export class ToOutlineEditor extends DocElement<OutlineView> {
  static properties: PropertyDeclarations = { folded: { state: true }, zoom: { state: true }, sel: { state: true }, connecting: { state: true }, range: { state: true }, drag: { state: true }, menuFor: { state: true }, naming: { state: true }, nameDraft: { state: true }, webDraft: { state: true }, showing: { state: true } };
  /** Items folded shut, by block index. */
  declare folded: Set<number>;
  /** The item zoomed in on, by block index; -1 for the whole outline. */
  declare zoom: number;
  /** The chosen row, by block index; -1 for none. */
  declare sel: number;
  /** Connecting: the item the join starts from (-1 until it is picked); null when not connecting. */
  declare connecting: { from: number } | null;
  /** Rows chosen whole, as nodes; null when the caret is in words (or nowhere). */
  declare range: Range | null;
  declare drag: Drag | null;
  /** The block (an item or a join) whose line menu is open; -1 for none. */
  declare menuFor: number;
  /** The block whose line is being named, and the name so far; -1 when the dialog is closed. */
  declare naming: number;
  declare nameDraft: string;
  /** The address being typed for a thing from the web; null when that dialog is closed. */
  declare webDraft: string | null;
  /** The outline shown as a page, in a dialog. */
  declare showing: boolean;
  /** The row editor last focused: what the bar's text tools act on. */
  private field: ToText | null = null;
  /** One array per block, so a row's editor sees the same `blocks` until its block changes. */
  private rowBlocks = new WeakMap<Block, Block[]>();
  /** The block a row shows when the outline has none yet; it enters the document with the first letter typed. */
  private ghost: Block = { k: 'li', depth: 0, runs: [] };

  constructor() {
    super();
    this.folded = new Set();
    this.zoom = -1;
    this.sel = -1;
    this.connecting = null;
    this.range = null;
    this.drag = null;
    this.menuFor = -1;
    this.naming = -1;
    this.nameDraft = '';
    this.webDraft = null;
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
    if (this.range && !this.rangeRows().length) this.range = null;
  }
  /** Every edit: folds and the zoom follow the blocks they belong to. */
  protected edit(ops: Op[], key?: string) {
    super.edit(ops, key);
    this.remap(ops);
  }
  protected undone(entry: { ops: Op[]; inverse: Op[] }, redo: boolean) {
    this.menuFor = -1;
    this.connecting = null;
    this.range = null;
    this.remap(redo ? entry.ops : entry.inverse);
  }
  /** Folds and the zoom are block indices: moved with their blocks, dropped with them. */
  private remap(ops: Op[]) {
    if (this.folded.size) this.folded = new Set([...this.folded].map((at) => mapAt(ops, at)).filter((at) => at >= 0));
    if (this.zoom >= 0) this.zoom = mapAt(ops, this.zoom);
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    // Capturing, on the document: before a row's own editor, and when nothing in the page is focused (a range's copy
    // can land on the body).
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener, true);
  }
  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);
    const bar = this.querySelector<ToContext>('.ol-context');
    if (!bar) return;
    if (this.range) bar.show(() => this.rangeRect());
    else if (bar.isOpen) bar.hide();
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

  /* ---------- rows chosen whole ---------- */

  /** The chosen rows: the rows on screen from the anchor to the focus, in order. */
  private rangeRows(): Item[] {
    const r = this.range;
    if (!r) return [];
    const vis = this.visible();
    const a = vis.findIndex((x) => x.at === r.anchor);
    const f = vis.findIndex((x) => x.at === r.focus);
    return a < 0 || f < 0 ? [] : vis.slice(Math.min(a, f), Math.max(a, f) + 1);
  }
  /** The blocks the range covers: each chosen row with its family. */
  private span(): Span | null {
    return spanOf(this.doc, this.view, this.rangeRows().map((it) => it.at));
  }
  /** The rows inside the zoom go no shallower than its first level. */
  private get floor(): number {
    return this.zoom >= 0 ? this.base + 1 : 0;
  }
  /** Choose the row at `at` whole (or, extending, from where the range began to it): the words' caret goes, the tree takes the keys. */
  private choose(at: number, extend = false) {
    if (at < 0 || indexAt(this.view, at) < 0) return;
    const from = this.range?.anchor ?? (this.visible().some((x) => x.at === this.sel) ? this.sel : at);
    this.range = extend ? { anchor: from, focus: at } : { anchor: at, focus: at };
    this.sel = at;
    this.menuFor = -1;
    document.getSelection()?.removeAllRanges();
    this.querySelector<HTMLElement>('.ol')?.focus({ preventScroll: true });
  }
  /** Shift+Down: the focus to the next row after its family; Shift+Up: to the row before. Past the anchor the range turns. */
  private extend(by: 1 | -1) {
    const r = this.range!;
    const vis = this.visible();
    const a = vis.findIndex((x) => x.at === r.anchor);
    const f = vis.findIndex((x) => x.at === r.focus);
    let to: Item | undefined;
    if (by < 0) to = vis[f - 1];
    else if (f < a) to = vis[f + 1];
    else {
      const end = family(this.doc, r.focus, this.view.depths);
      to = vis.find((x) => x.at >= end);
    }
    if (to) this.range = { ...r, focus: to.at };
  }
  /** Everything on screen chosen. */
  private selectAll() {
    const vis = this.visible();
    if (!this.items.length || !vis.length) return;
    this.choose(vis[0].at);
    this.range = { anchor: vis[0].at, focus: vis[vis.length - 1].at };
  }
  /** The range let go, the caret into a row. */
  private release(at: number, offset: number | 'end' = 'end') {
    this.range = null;
    this.focusRow(at, offset);
  }
  /** The chosen rows taken away, families and all; the caret into the row before (or after, or the empty outline's first row). */
  private deleteRange() {
    const s = this.span();
    const rows = this.rangeRows();
    if (!s || !rows.length) return;
    const vis = this.visible();
    const before = vis[vis.indexOf(rows[0]) - 1];
    const next = vis.find((x) => x.at >= s.to);
    this.range = null;
    this.edit(removeSpan(s));
    if (before) this.focusRow(before.at);
    else if (next) this.focusRow(next.at - (s.to - s.from), 0);
    else this.focusRow(-1);
  }
  private shiftRange(by: 1 | -1) {
    const s = this.span();
    const ops = s && shiftSpan(this.doc, this.view, s, by, this.floor);
    if (ops) this.edit(ops);
  }
  private moveRange(by: 1 | -1) {
    const s = this.span();
    const r = this.range;
    const ops = s && moveSpan(this.doc, this.view, s, by);
    if (!ops || !r) return;
    this.edit(ops);
    this.range = { anchor: mapAt(ops, r.anchor), focus: mapAt(ops, r.focus) };
  }
  /** Numbered or not: the range's top rows, or the list the chosen row belongs to. */
  private number() {
    const s = this.span();
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
  /** Where the chosen rows are on screen: from the first to the last. */
  private rangeRect(): DOMRect | null {
    const els = this.querySelectorAll<HTMLElement>('.ol-row.ranged');
    if (!els.length) return null;
    const a = els[0].getBoundingClientRect();
    const b = els[els.length - 1].getBoundingClientRect();
    return new DOMRect(Math.min(a.left, b.left), a.top, Math.max(a.right, b.right) - Math.min(a.left, b.left), b.bottom - a.top);
  }

  /** The keys a range answers to; true when the key was the range's. */
  private onRangeKey(e: KeyboardEvent): boolean {
    const r = this.range!;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const up = k === 'ArrowUp';
    if (k === 'Escape') this.release(r.focus);
    else if ((up || k === 'ArrowDown') && e.altKey) this.moveRange(up ? -1 : 1);
    else if ((up || k === 'ArrowDown') && e.shiftKey && !mod) this.extend(up ? -1 : 1);
    else if (up || k === 'ArrowDown') {
      const rows = this.rangeRows();
      const s = this.span();
      const vis = this.visible();
      const to = up ? (vis[vis.indexOf(rows[0]) - 1] ?? rows[0]) : (vis.find((x) => s && x.at >= s.to) ?? rows[rows.length - 1]);
      this.release(to.at);
    } else if (k === 'Backspace' || k === 'Delete') this.deleteRange();
    else if (k === 'Tab' && !mod && !e.altKey) this.shiftRange(e.shiftKey ? -1 : 1);
    else if (mod && k.toLowerCase() === 'a') this.selectAll();
    else return false;
    return true;
  }

  /* ---------- the clipboard ---------- */

  /** What the range puts on the clipboard: its blocks as TLO, the shallowest at the margin, and as HTML. */
  private clip(s: Span): { text: string; html: string } {
    const blocks = copySpan(this.doc, this.view, s);
    return (copied = { text: write({ head: {}, blocks }), html: docToHtml(blocks) });
  }
  /** Whether an event is this editor's to answer: inside it, or on the page's body while rows are chosen. */
  private mine(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el === document.body || el === document.documentElement) return !!this.range;
    return this.contains(el) && !el.closest?.('dialog, [popover], input, textarea');
  }
  private onClipboard = (e: ClipboardEvent) => {
    if (!this.mine(e.target)) return;
    const dt = e.clipboardData;
    if (e.type === 'paste') return this.onPaste(e);
    const s = this.range && this.span();
    if (!s || !dt) return;
    e.preventDefault();
    e.stopPropagation();
    const c = this.clip(s);
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') this.deleteRange();
  };
  /**
   * A paste: with rows chosen, it takes their place; into a row, lines or list items go in as items after the row's
   * family (words alone, and words copied from a row, are the row's to paste).
   */
  private onPaste(e: ClipboardEvent) {
    const el = e.target as HTMLElement;
    const dt = e.clipboardData;
    if (!dt || el.closest?.('.ol-doc')) return;
    const data = { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') };
    const row = el.closest?.<HTMLElement>('.ol-row');
    if (this.range) {
      e.preventDefault();
      e.stopPropagation();
      return this.pasteData(data, this.span());
    }
    if (!row) return;
    const ours = data.html.includes(`content="${GENERATOR}"`);
    const oneLine = !data.text.trim().includes('\n');
    if (!(copied?.text === data.text || (pastesAsItems(data.text) && !(ours && oneLine)))) return;
    e.preventDefault();
    e.stopPropagation();
    const at = Number(row.dataset.at);
    this.pasteData(data, at >= 0 ? at : null);
  }
  /** Pasted data put in as items: ours (or plain text) read as TLO, HTML from elsewhere as blocks; the caret at the end of the last. */
  private pasteData(data: { text: string; html: string }, target: Span | number | null) {
    const html = !data.html.includes(`content="${GENERATOR}"`) && data.html.trim() ? htmlToBlocks(data.html) : [];
    const r = pasteBlocks(this.doc, this.view, html.length ? html : pasteText(data.text), target);
    if (!r) return;
    this.range = null;
    this.edit(r.ops);
    this.focusRow(r.to - 1);
  }
  /** The bar's Copy and Cut: the system clipboard as the page may write it, and this page's own memory of it. */
  private copyOut(cut: boolean) {
    const s = this.span();
    if (!s) return;
    const c = this.clip(s);
    const plain = () => navigator.clipboard?.writeText(c.text).catch(() => undefined);
    try {
      void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([c.text], { type: 'text/plain' }), 'text/html': new Blob([c.html], { type: 'text/html' }) })]).catch(plain);
    } catch {
      void plain();
    }
    if (cut) this.deleteRange();
  }
  /** The bar's Paste: the system clipboard's words if the page may read them, else what was last copied here. */
  private async pasteIn() {
    const target = this.span() ?? (this.itemAt(this.sel) ? this.sel : null);
    let text = '';
    try {
      text = (await navigator.clipboard.readText()).replace(/\r\n?/g, '\n');
    } catch {
      // Refused: this page's own copy.
    }
    const data = text ? { text, html: copied?.text === text ? copied.html : '' } : copied;
    if (data) this.pasteData(data, target);
  }
  private contextItems(): ContextEntry[] {
    const s = this.range ? this.span() : null;
    if (!s) return [];
    const tops = topsOf(this.view, s);
    return [
      { label: t('Indent'), icon: UI.indent, keys: 'Tab', disabled: !shiftSpan(this.doc, this.view, s, 1, this.floor), does: () => this.shiftRange(1) },
      { label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', disabled: !shiftSpan(this.doc, this.view, s, -1, this.floor), does: () => this.shiftRange(-1) },
      { label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', disabled: !moveSpan(this.doc, this.view, s, -1), does: () => this.moveRange(-1) },
      { label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', disabled: !moveSpan(this.doc, this.view, s, 1), does: () => this.moveRange(1) },
      SEP,
      { label: t('Copy'), icon: Copy, keys: 'Mod+C', does: () => this.copyOut(false) },
      { label: t('Cut'), icon: Scissors, keys: 'Mod+X', does: () => this.copyOut(true) },
      { label: t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', does: () => void this.pasteIn() },
      SEP,
      { label: t('Numbered'), icon: ListOrdered, pressed: tops.length > 0 && tops.every((it) => this.isOrd(it.at)), disabled: !tops.some((it) => !it.doc), does: () => this.number() },
      { label: t('Delete'), icon: UI.trash, keys: 'Delete', does: () => this.deleteRange() },
    ];
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
    // A TinyLittleOffice link pasted as an item is that document, under this item.
    const link = after?.k === 'li' ? refOfLink(plainText(after.runs)) : null;
    const asDoc: Op[] = link && after?.k === 'li' ? [{ op: 'splice', at: where, n: 1, blocks: [docBlock(after.depth, link)] }] : [];
    this.edit([...all, ...renames, ...asDoc], kind === 'type' && !asDoc.length ? `type:${where}` : undefined);
    if (ghost) this.focusRow(where, e.detail.sel.focus.offset);
    else if (asDoc.length) this.focusRow(where);
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
      { label: t('Name the line…'), icon: UI.pen, hint: ends.label, does: () => this.openNaming(at) },
      ...(i >= 0 && hasChildren(this.items, i) ? [{ label: t('Zoom in'), icon: ZoomIn, does: () => this.zoomTo(at) }] : []),
      ...(ends.edge ? [{ label: t('Take the connection away'), icon: UI.trash, does: () => this.edit(unlink(this.doc, at)) }] : []),
    ];
  }
  private openNaming(at: number) {
    this.naming = at;
    this.nameDraft = this.endsOf(at)?.label ?? '';
    void this.updateComplete.then(() => this.querySelector<ToDialog>('.ol-name-dialog')?.show().then(() => this.querySelector<HTMLInputElement>('.ol-name-dialog input')?.focus()));
  }
  private saveName() {
    const at = this.naming;
    if (at < 0) return;
    const b = this.doc.blocks[at];
    const label = this.nameDraft.trim();
    this.edit(b?.k === 'edge' ? setLink(this.doc, at, { label }) : setLine(this.doc, this.view, at, { label }));
    this.querySelector<ToDialog>('.ol-name-dialog')?.close();
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

  /** Another document under the chosen item (or at the end), as an empty document of that app. */
  private insertApp(id: string) {
    const app = appOf(id);
    if (!app) return;
    const r = insertDoc(this.doc, this.view, this.sel, `${id}\n${app.blank()}`);
    this.edit(r.ops);
    this.focusRow(r.at);
  }
  private openWeb() {
    this.webDraft = '';
    void this.updateComplete.then(() => this.querySelector<ToDialog>('.ol-web-dialog')?.show().then(() => this.querySelector<HTMLInputElement>('.ol-web-dialog input')?.focus()));
  }
  private saveWeb() {
    const url = (this.webDraft ?? '').trim();
    if (!/^https?:\/\/\S+$/.test(url)) return;
    const ref = refOfLink(url);
    const r = insertDoc(this.doc, this.view, this.sel, ref ?? `web\n${url}`);
    this.edit(r.ops);
    this.querySelector<ToDialog>('.ol-web-dialog')?.close();
    this.focusRow(r.at);
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

  private onKey = (e: KeyboardEvent) => {
    const target = e.composedPath()[0] as HTMLElement;
    if (target.closest?.('[popover]') || target.closest?.('dialog')) return;
    if (e.key === 'Escape' && this.connecting) {
      e.preventDefault();
      this.connecting = null;
      return;
    }
    if (this.range && !target.closest?.('to-text')) {
      if (this.onRangeKey(e)) e.preventDefault();
      return;
    }
    const row = target.closest?.('.ol-row') as HTMLElement | null;
    const at = row ? Number(row.dataset.at) : NaN;
    if (!Number.isFinite(at) || at < 0) return;
    const mod = e.metaKey || e.ctrlKey;
    const vis = this.visible();
    const i = vis.findIndex((x) => x.at === at);
    if (e.key === 'Tab' && !mod && !e.altKey) this.shiftBy(at, e.shiftKey ? -1 : 1);
    else if (e.altKey && e.key === 'ArrowUp') this.moveBy(at, -1);
    else if (e.altKey && e.key === 'ArrowDown') this.moveBy(at, 1);
    else if (e.altKey && e.key === 'ArrowLeft') this.fold(at, true);
    else if (e.altKey && e.key === 'ArrowRight') this.fold(at, false);
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.shiftKey && !mod) this.choose(at);
    else if (e.key === 'ArrowUp' && !e.shiftKey && !mod && i > 0) this.focusRow(vis[i - 1].at);
    else if (e.key === 'ArrowDown' && !e.shiftKey && !mod && i >= 0 && i < vis.length - 1) this.focusRow(vis[i + 1].at);
    else if (mod && e.key === '.') this.zoomTo(at);
    else if (mod && e.key === ',') this.zoomOut();
    else if ((e.key === 'Backspace' || e.key === 'Delete') && this.itemAt(at)?.doc && !target.closest('to-text')) this.removeRow(at);
    else return;
    e.preventDefault();
  };

  /* ---------- dragging ---------- */

  private onDragStart(e: DragEvent, at: number) {
    this.drag = { at, over: -1, how: 'after' };
    e.dataTransfer?.setData('text/plain', plainText(this.itemAt(at)?.runs ?? []));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
  private onDragOver(e: DragEvent, at: number) {
    const d = this.drag;
    if (!d || at === d.at) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    // The right half of a row means "inside it"; the rest, "after it".
    const how = e.clientX - r.left > r.width * 0.5 ? 'under' : 'after';
    if (d.over !== at || d.how !== how) this.drag = { ...d, over: at, how };
  }
  private onDrop(e: DragEvent) {
    e.preventDefault();
    const d = this.drag;
    this.drag = null;
    if (!d || d.over < 0) return;
    this.dropAt(d.at, d.over, d.how);
  }
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
      { label: t('From the web: a video, a post, a place, a picture'), icon: UI.globe, does: () => this.openWeb() },
      ...apps()
        .filter((a) => a.id !== def.id)
        .map((a) => ({ group: t('A document'), label: a.name, icon: a.icon, does: () => this.insertApp(a.id) })),
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
      ${tool({ label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', keep: true, disabled: none || !shiftItem(this.doc, this.view, s, -1), does: () => this.shiftBy(s, -1) })}
      ${tool({ label: t('Indent'), icon: UI.indent, keys: 'Tab', keep: true, disabled: none || !shiftItem(this.doc, this.view, s, 1), does: () => this.shiftBy(s, 1) })}
      ${tool({ label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', keep: true, disabled: none || !moveItem(this.doc, this.view, s, -1), does: () => this.moveBy(s, -1) })}
      ${tool({ label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', keep: true, disabled: none || !moveItem(this.doc, this.view, s, 1), does: () => this.moveBy(s, 1) })}
      ${tool({ label: t('Numbered'), icon: ListOrdered, keep: true, pressed: !!it?.ord, disabled: !words, does: () => this.number() })}
      ${this.zoom >= 0 ? tool({ label: t('Zoom out'), icon: ZoomOut, keys: 'Mod+,', does: () => this.zoomOut() }) : nothing}
      ${tool({ label: t('Zoom in'), icon: ZoomIn, keys: 'Mod+.', keep: true, disabled: none || !hasChildren(this.items, i), does: () => this.zoomTo(s) })}
      ${tool({ label: t('Fold all'), icon: FoldVertical, keep: true, does: () => this.foldAll(true) })}
      ${tool({ label: t('Unfold all'), icon: UnfoldVertical, keep: true, does: () => this.foldAll(false) })}
      ${btn({ label: c ? t('Cancel connecting') : t('Connect'), icon: c ? UI.close : Link2, pressed: !!c, does: () => this.connect() })}
      <to-menu class="ol-view-as" .label=${t('View as')} .icon=${Eye} caret .items=${this.viewItems()}></to-menu>
    </to-bar>`;
  }

  /* ---------- the rows ---------- */

  /** The bullet that is a line to the parent: a dot, or an arrow which way it points; tapped, it opens the line's menu. */
  private bullet(at: number, ends: Ends, n?: number): TemplateResult {
    const glyph = DIR_ICON[ends.dir];
    const label = `${ends.edge ? t('Connection from {from} to {to}', ft(ends)) : t('Line from {from} to {to}', ft(ends))}: ${DIR_NAME[ends.dir]()}${ends.label ? t(', named “{label}”', { label: ends.label }) : ''}. ${t('Change it')}`;
    return html`<button type="button" class="ol-kind" data-dir=${ends.dir} aria-label=${label} title=${label} aria-haspopup="menu" aria-expanded=${this.menuFor === at ? 'true' : 'false'} @mousedown=${(e: Event) => e.preventDefault()} @click=${(e: MouseEvent) => (e.shiftKey && this.itemAt(at) ? this.choose(at, true) : void this.openLineMenu(at, e.currentTarget as HTMLElement))}>${n ? html`<b class="ol-n">${n}.</b>` : glyph ? icon(glyph, 14) : html`<span></span>`}</button>`;
  }
  /** A line's name, as a chip before the words; tapped, it opens the name dialog. */
  private chip(at: number, label?: string) {
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
      <a class="to-btn to-tool" href=${href} target="_blank" rel="noopener" aria-label=${t('Open in a new tab')} title=${t('Open in a new tab')}>${icon(UI.open, 16)}</a>
      ${tool({ label: t('Take it away'), icon: UI.close, does: () => this.removeRow(it.at) })}
    </div>`;
  }
  /** A tap on a row's handle chooses the row whole; with Shift (or, on a touch screen, with rows already chosen) it extends the range to it. */
  private onHandle(e: PointerEvent | MouseEvent, at: number) {
    const touch = (e as PointerEvent).pointerType === 'touch';
    this.choose(at, e.shiftKey || (touch && !!this.range && this.range.anchor !== at));
  }
  private renderRow(it: Item, noteStart: number, placeholder: string, n: number | undefined, ranged: boolean): TemplateResult {
    const items = this.items;
    const i = indexAt(this.view, it.at);
    const at = it.at;
    const kids = i >= 0 && hasChildren(items, i);
    const shut = this.folded.has(at);
    const ends = at >= 0 ? this.endsOf(at) : null;
    const d = this.drag;
    const c = this.connecting;
    const block = at >= 0 ? this.doc.blocks[at] : this.ghost;
    const words = plainText(it.runs).trim();
    // A row that is one web address shows as a thing from the web once the caret has left it.
    const asDoc = !!it.doc && !(it.doc.startsWith('web\n') && this.sel === at && block.k === 'li' && webAddress(block.runs));
    const inside = kids ? familyEnd(items, i) - i - 1 : 0;
    return html`<div
      class="ol-row ${at === this.sel && !this.range ? 'sel' : ''} ${ranged ? 'ranged' : ''} ${kids ? 'parent' : ''} ${kids && shut ? 'shut' : ''} ${d?.over === at ? `drop-${d.how}` : ''} ${c?.from === at ? 'source' : ''}"
      data-at=${at}
      role="treeitem"
      aria-level=${it.depth - this.base + 1}
      aria-expanded=${kids ? (shut ? 'false' : 'true') : nothing}
      aria-selected=${ranged || (at === this.sel && !this.range) ? 'true' : 'false'}
      style="--d:${it.depth - this.base}"
      @dragover=${(e: DragEvent) => this.onDragOver(e, at)}
      @focusin=${(e: FocusEvent) => {
        this.sel = at;
        if (this.range && (e.target as HTMLElement).closest('to-text')) this.range = null;
      }}
    >
      <span class="ol-gutter">
        <button type="button" class="ol-handle" draggable="true" aria-label=${t('Move this item: drag it onto another')} title=${t('Drag to move')} tabindex="-1" @click=${(e: MouseEvent) => this.onHandle(e, at)} @dragstart=${(e: DragEvent) => this.onDragStart(e, at)} @dragend=${() => (this.drag = null)}>${icon(GripVertical, 14)}</button>
        ${kids ? html`<button type="button" class="ol-fold" aria-label=${shut ? t('Unfold, {n|one inside|# inside}', { n: inside }) : t('Fold')} aria-expanded=${shut ? 'false' : 'true'} @click=${() => this.fold(at)}>${icon(shut ? ChevronRight : ChevronDown, 14)}</button>` : nothing}
      </span>
      ${ends ? html`<span class="ol-bullet">${this.bullet(at, ends, n)}</span>${this.chip(at, it.label)}` : html`<span class="ol-bullet" @click=${(e: MouseEvent) => e.shiftKey && this.choose(at, true)}><span class="ol-kind root" aria-hidden="true">${n ? html`<b class="ol-n">${n}.</b>` : html`<span></span>`}</span></span>`}
      ${asDoc
        ? this.renderDoc(it)
        : html`<to-text shape="line" .blocks=${this.blocksFor(block)} .noteStart=${noteStart} label=${t('Item {n}', { n: i + 1 })} placeholder=${placeholder} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(at, e)} @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(at))} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(at, e.detail.dir))} @text-selectall=${(e: Event) => (e.stopPropagation(), this.selectAll())} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect(at, e)}></to-text>`}
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
      <h3>${t('Connections')}</h3>
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
    const s = this.range ? this.span() : null;
    const rows = items.length ? vis : [{ at: -1, depth: this.base, runs: [] } as Item];
    return html`${this.renderBar()}
      ${c ? html`<p class="ol-hint to-hint" role="status">${c.from < 0 ? t('Tap the item to connect from.') : t('Tap the item to connect “{words}” to.', { words: plainText(this.itemAt(c.from)?.runs ?? []).trim() })}</p>` : nothing}
      ${this.crumbs()}
      <div class="ol ${c ? 'connecting' : ''}" role="tree" tabindex="-1" aria-multiselectable="true" aria-label=${t('Outline')} @drop=${this.onDrop} @dragover=${(e: DragEvent) => this.drag && e.preventDefault()}>
        ${repeat(
          rows,
          (it) => it.at,
          (it) => this.renderRow(it, noteStart.get(it.at) ?? 0, items.length <= 1 ? first : '', numbers[it.at], !!s && it.at >= s.from && it.at < s.to),
        )}
        <div class="ol-below" aria-hidden="true" @click=${() => ((this.range = null), this.addItem())}></div>
      </div>
      ${this.renderLinks(liveLinks(this.view))}
      <to-context class="ol-context" .label=${t('Chosen items')} .items=${this.contextItems()}></to-context>
      <to-menu class="ol-line-menu" .label=${t('Kind of line')} .items=${this.lineItems()}></to-menu>
      ${this.renderNameDialog()}
      ${this.renderWebDialog()}
      ${this.renderPageDialog()}`;
  }

  private renderNameDialog() {
    const ends = this.naming >= 0 ? this.endsOf(this.naming) : null;
    return html`<to-dialog class="ol-name-dialog" heading=${t('Name of the line')} @to-close=${() => (this.naming = -1)} .body=${html`
      <label class="ol-field"><span>${ends ? t('From {from} to {to}', ft(ends)) : nothing}</span>
        <input type="text" .value=${this.nameDraft} placeholder=${t('e.g. owns, feeds, reports to')} autocomplete="off" @input=${(e: Event) => (this.nameDraft = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.saveName())} />
      </label>
      <div class="to-row">
        <button type="button" class="to-btn primary ol-name-done" @click=${() => this.saveName()}>${icon(UI.check, 16)}<span>${t('Done')}</span></button>
      </div>`}></to-dialog>`;
  }
  private renderWebDialog() {
    return html`<to-dialog class="ol-web-dialog" heading=${t('From the web')} @to-close=${() => (this.webDraft = null)} .body=${html`
      <label class="ol-field"><span>${t('The address of a video, a post, a place, a picture, or another TinyLittleOffice document')}</span>
        <input type="url" .value=${this.webDraft ?? ''} placeholder="https://" autocomplete="off" inputmode="url" @input=${(e: Event) => (this.webDraft = (e.target as HTMLInputElement).value)} @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && (e.preventDefault(), this.saveWeb())} />
      </label>
      <p class="to-hint">${t('Nothing is fetched until the item is opened.')}</p>
      <div class="to-row">
        <button type="button" class="to-btn primary ol-web-done" ?disabled=${!/^https?:\/\/\S+$/.test((this.webDraft ?? '').trim())} @click=${() => this.saveWeb()}>${icon(UI.check, 16)}<span>${t('Done')}</span></button>
      </div>`}></to-dialog>`;
  }
  private renderPageDialog() {
    return html`<to-dialog class="ol-page-dialog" heading=${t('As a page')} @to-close=${() => (this.showing = false)} .body=${this.showing ? html`<div class="ol-page">${unsafeSVG(pageSvg(outlinePage(this.doc)))}</div>` : nothing}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToOutlineEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-outline-editor': ToOutlineEditor;
  }
}
