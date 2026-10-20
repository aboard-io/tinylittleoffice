/**
 * <to-outline-editor>: an outliner. Every row is an item, its words a <to-text shape=line> over the item's
 * block; Enter makes another, Tab and Shift+Tab take it in and out with its family, Alt+Up/Down move
 * it, Mod+Alt+Up/Down fold it, a handle drags it onto another item, and any item can be zoomed in on. The one bar formats the words of
 * the chosen row, arranges it, zooms, folds, connects and shows the outline as other things. Each item's
 * bullet is the line to its parent, tapped to turn it (plain, an arrow out, an arrow back, both ways) and to
 * name it; Connect joins any two items. Every change is operations on the document (model.ts): the kernel's
 * family helpers for the tree, splices for lines, joins and documents, and the row editor's own ops for words.
 * Folds, the zoom, the chosen row and connecting are the editor's state, not the document's. The footnotes are
 * listed under the outline (<to-notes>, kit/draw/notes.ts), each typed there: a mark tapped, or Footnote, puts the caret
 * in its note; Enter or Escape come back to the mark.
 *
 * It behaves as a bulleted list does: Enter at the start of words pushes the row down, Backspace at the start joins
 * the row to the item before it and Delete at the end joins the next one in. Rows can be chosen whole, as nodes (a
 * range): Shift+arrows from the caret, Escape in the words, a tap on a row's handle, Select All twice. A range is a span
 * of blocks, every chosen row's family with it; it is copied, cut, pasted, deleted, duplicated, indented and moved as
 * one, from the keys or from a small bar that comes up under it. All of that is the kit's rows controller (kit/text/rows.ts);
 * this editor gives it the rows and the operations. Any list can be numbered ("1. " typed at the start of a row too).
 */
import { html, nothing, type PropertyDeclarations, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowLeft, ArrowLeftRight, ArrowRight, ChevronDown, ChevronRight, GripVertical, ListOrdered, Minus, ZoomIn } from 'lucide';
import { applyAll, family, fenceRef, isAtomic, isText, listNumbers, plainText, runLength, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { cmdBtn, cmdTool, tool } from '../../kit/ui/bar.ts';
import { drawnIn, labelOf, runKey } from '../../kit/core/commands.ts';
import { BOLD, CODE, FOOTNOTE, HIGHLIGHT, ITALIC, LINK, STRIKE, UNDERLINE } from '../../kit/text/text-commands.ts';
import type { Handoff } from '../../kit/core/app.ts';
import COMMANDS from './commands.ts';
import { appOf } from '../../kit/core/apps.ts';
import { clipText, docToHtml, GENERATOR, htmlToBlocks, plainOf } from '../../kit/text/clipboard.ts';
import type { ContextEntry } from '../../kit/ui/context.ts';
import { lastCopied, Rows, type Clip, type RowItem, type RowRange, type RowSpan } from '../../kit/text/rows.ts';
import { host } from '../../kit/core/host.ts';
import { LOCKED_LANG } from '../../kit/share/locked.ts';
import type { ToDialog } from '../../kit/ui/dialog.ts';
import { highlights, rangesIn, type Found } from '../../kit/ui/find.ts';
import { fold } from '../../kit/share/search.ts';
import { reveal } from '../../kit/ui/scroll.ts';
import { editFence, makeDoc } from '../../kit/ui/doc-dialog.ts';
import { pageSvg } from '../../kit/draw/draw.ts';
import { DocElement, firstAt, type Entry, type Picked } from '../../kit/core/element.ts';
import { icon, UI } from '../../kit/draw/icons.ts';
import { t } from '../../kit/core/i18n.ts';
import { dateWords } from '../../kit/core/dates.ts';
import { noteMarks, type NoteMark, type ToNotes } from '../../kit/draw/notes.ts';
import { askDocLink } from '../../kit/ui/insert-dialogs.ts';
import type { MenuItem, ToMenu } from '../../kit/ui/menu.ts';
import type { NoteAt, Sel, TextOps, ToText } from '../../kit/text/text.ts';
import { caret } from '../../kit/text/textops.ts';
import {
  appendItem,
  connect,
  copySpan,
  docBlock,
  duplicateSpan,
  enterAt,
  familyEnd,
  hasChildren,
  indexAt,
  insertDoc,
  itemBlock,
  itemsEnd,
  joinBack,
  joinForward,
  listify,
  liveLinks,
  mapAt,
  moveItem,
  moveSpan,
  nameOf,
  parentOf,
  pasteBlocks,
  pastesAsItems,
  pasteText,
  placeItem,
  readOutline,
  removeAt,
  removeSpan,
  renameIn,
  setDoc,
  setLine,
  setLink,
  setOrdered,
  shiftItem,
  shiftSpan,
  siblingsOf,
  spanOf,
  topsOf,
  unlink,
  type Dir,
  type Item,
  type Link,
  type OutlineView,
  applyStatuses,
  DEFAULT_STATUSES,
  defaultDue,
  followTick,
  makeTask,
  setDue,
  setShut,
  setShutAll,
  setStatus,
  STATUS_COLORS,
  statusesOf,
  tick,
  type Status,
} from './model.ts';
import { appName, docGist, outlinePage } from './view.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/ui/dialog.ts';
import '../../kit/ui/doc-dialog.ts';
import '../../kit/draw/notes.ts';
import '../../kit/text/text.ts';
import '../../kit/ui/context.ts';
import './style.css';

/** A few words of an item, for a menu or a label: the first four, or 28 characters, then an ellipsis. */
function short(words: string): string {
  const w = words.replace(/\s+/g, ' ').trim();
  const cut = w.split(' ').slice(0, 4).join(' ').slice(0, 28);
  return cut.length < w.length ? `${cut.replace(/[\s,;:.]+$/, '')}…` : w;
}

/** A status color's name, by its word (the Calendar's names, with yellow and gray). */
const COLOR_NAMES: Record<string, () => string> = {
  red: () => t('common-red'),
  orange: () => t('common-orange'),
  yellow: () => t('common-yellow'),
  green: () => t('common-green'),
  blue: () => t('common-blue'),
  purple: () => t('common-purple'),
  indigo: () => t('common-indigo'),
  gray: () => t('outline-gray'),
};

export const tag = 'to-outline-editor';

/** How each kind of line is said. */
const DIR_NAME: Record<Dir, () => string> = {
  '--': () => t('outline-a-plain-line'),
  '->': () => t('outline-arrow-from-parent'),
  '<-': () => t('outline-arrow-to-parent'),
  '<->': () => t('outline-arrows-both-ways-lowercase'),
};
const DIR_ICON: Record<Dir, typeof ArrowRight | null> = { '--': null, '->': ArrowRight, '<-': ArrowLeft, '<->': ArrowLeftRight };

/** A document's link as a ref ("<app>\n<text>"), or null when the words are not one (the host reads it: kit/core/host.ts). */
function refOfLink(words: string): string | null {
  const placed = host.read(words);
  return placed ? fenceRef(placed) : null;
}

/** Where the selection was before an edit: rows chosen whole, or the caret in a row's words. What an undo puts back (the entry's mark). */
/** Where the selection was: the rows chosen, a caret in a row, or the footnote whose words were typed. */
type Mark = { range: RowRange<number> } | { at: number; offset: number } | { note: number };
type Ends = { from: string; to: string; dir: Dir; label?: string; edge: boolean };
/** A line's two ends, as t() takes them. */
const ft = (e: Ends) => ({ from: e.from, to: e.to });

export class ToOutlineEditor extends DocElement<OutlineView> {
  static properties: PropertyDeclarations = {
    zoom: { state: true },
    sel: { state: true },
    connecting: { state: true },
    menuFor: { state: true },
    naming: { state: true },
    dating: { state: true },
    statusDraft: { state: true },
    filter: { state: true },
    agenda: { state: true },
    agendaSort: { state: true },
    byStatus: { state: true },
    showing: { state: true },
  };
  /**
   * Items folded shut, by block index: the document's own (`{.shut}`, model.ts SHUT), so the link carries the folds and
   * an undo brings them back. Read-only, a reader's own folds over them (`viewFolds`), which write nothing.
   */
  get folded(): Set<number> {
    const shut = new Set(this.items.flatMap((it) => (it.shut ? [it.at] : [])));
    if (this.readOnly) for (const [at, s] of this.viewFolds) s ? shut.add(at) : shut.delete(at);
    return shut;
  }
  /** Read-only, the items a reader folded or opened by their arrows, by block index: the view's, never the document's (a new document starts without them). */
  private viewFolds = new Map<number, boolean>();
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
  /** The row whose due day is being typed (a date field where its chip was), -1 for none. */
  declare dating: number;
  /** The statuses as they are being edited in their dialog (`was`: the name before, for the items that carry it); null while it is closed. */
  declare statusDraft: { name: string; word: string; was: string }[] | null;
  /** Find's terms while it is open: only the rows whose words hold every one are shown (sparse); null otherwise. */
  declare filter: string[] | null;
  /** The agenda dialog open, and its order: by status (the set's order), by due day, or the outline's. */
  declare agenda: boolean;
  declare agendaSort: 'status' | 'due' | null;
  declare byStatus: boolean;
  /** The outline shown as a page, in a dialog. */
  declare showing: boolean;
  /** The row editor last focused: what the bar's text tools act on. */
  field: ToText | null = null;
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
    label: t('common-chosen-items'),
    current: () => (this.visible().some((x) => x.at === this.sel) ? this.sel : null),
    span: (rows) =>
      spanOf(
        this.doc,
        this.view,
        rows.map((r) => r.id),
      ),
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
    this.zoom = -1;
    this.sel = -1;
    this.connecting = null;
    this.menuFor = -1;
    this.naming = -1;
    this.dating = -1;
    this.statusDraft = null;
    this.filter = null;
    this.agenda = false;
    this.agendaSort = null;
    this.byStatus = false;
    this.showing = false;
  }
  protected read(doc: Doc) {
    return readOutline(doc);
  }
  protected willUpdate(changed: Map<string, unknown>) {
    // A new document (not this editor's own text, nor another's ops on it) is read with its own folds alone.
    if (changed.has('value') && !this.ours(this.value)) this.viewFolds.clear();
    super.willUpdate(changed);
    // Loose words (headings, paragraphs) arriving are made an outline: one splice, undoable like any edit (a document
    // arriving has no history yet; one undone back to loose words is left as the undo left it).
    if (changed.has('value') && this.view.loose && !this.canUndo && !this.canRedo) this.edit(listify(this.doc));
    if (this.zoom >= 0 && indexAt(this.view, this.zoom) < 0) this.zoom = -1;
  }
  /** Every edit: folds and the zoom follow the blocks they belong to; the selection before it is kept for its undo. */
  edit(ops: Op[], key?: string, mark?: unknown) {
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
    if (mark && 'note' in mark && mark.note < this.marks().length) return void this.updateComplete.then(() => this.notesEl?.focusNote(mark.note));
    if (mark && 'range' in mark) {
      const r = redo ? { anchor: mapAt(entry.ops, mark.range.anchor), focus: mapAt(entry.ops, mark.range.focus) } : mark.range;
      if (ok(r.anchor) && ok(r.focus)) return this.rows.select(r);
    } else if (mark && 'at' in mark && !redo && ok(mark.at)) return this.focusRow(mark.at, mark.offset);
    // Else the row the change touched first.
    const first = firstAt(entry);
    if (first < 0 || !this.items.length) return;
    const near = [...this.items].reverse().find((it) => it.at <= first) ?? this.items[0];
    this.focusRow(near.at);
  }
  /** The zoom is a block index: moved with its block, dropped with it (the folds are the blocks' own). */
  private remap(ops: Op[]) {
    if (this.zoom >= 0) this.zoom = mapAt(ops, this.zoom);
  }
  /** Another's ops: a reader's own folds follow the items they belong to. */
  protected followed(ops: Op[]) {
    if (!this.viewFolds.size) return;
    const was = [...this.viewFolds];
    this.viewFolds = new Map(was.map(([at, s]) => [mapAt(ops, at), s] as const).filter(([at]) => at >= 0));
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
  get items(): Item[] {
    return this.view.items;
  }
  itemAt(at: number): Item | undefined {
    return this.items[indexAt(this.view, at)];
  }

  /** The rows on screen: those inside the zoom, not hidden under a fold; with Find open, only those whose words hold every term, folds aside. */
  visible(): Item[] {
    const items = this.items;
    const z = indexAt(this.view, this.zoom);
    const from = z >= 0 ? z : 0;
    const to = z >= 0 ? familyEnd(items, z) : items.length;
    const out: Item[] = [];
    if (this.filter) {
      for (let i = from; i < to; i++) if (this.matchesFind(items[i])) out.push(items[i]);
      return out;
    }
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

  /** Where a person starts: the first row's words, the caret at their end (the empty outline's one row). */
  async focusFirst() {
    await this.updateComplete;
    const first = this.querySelector<HTMLElement>('.ol-row');
    if (first) this.focusRow(Number(first.dataset.at));
  }
  /** Choose the row at `at` and put the caret in its words (at the end, or at `offset`). */
  focusRow(at: number, offset: number | 'end' = 'end') {
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

  /* ---------- rows chosen whole (kit/text/rows.ts) ---------- */

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
  duplicateRow(at: number) {
    const s = { from: at, to: family(this.doc, at, this.view.depths) };
    const offset = this.caretIn(at);
    const d = duplicateSpan(this.doc, this.view, s);
    this.edit(d.ops);
    this.focusRow(d.at, offset);
  }
  /** Numbered or not: the range's top rows, or the list the chosen row belongs to. */
  number() {
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
    return [{ label: t('outline-numbered'), icon: ListOrdered, pressed: tops.length > 0 && tops.every((it) => this.isOrd(it.at)), disabled: !tops.some((it) => !it.doc), does: () => this.number() }];
  }

  /* ---------- the clipboard ---------- */

  /** What chosen rows put on the clipboard: their words as items, the shallowest at the margin, and our HTML with the TLO in it. */
  private clip(s: RowSpan): Clip {
    const blocks = copySpan(this.doc, this.view, s);
    return { text: plainOf(blocks), html: docToHtml(blocks) };
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
    const r = pasteBlocks(this.doc, this.view, html.length ? html : pasteText(clipText(data)), t0);
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
    // A task's box checked or unchecked in the words (a tap on it, Mod+Enter): the status follows it.
    const before = this.doc.blocks[where];
    const ticked = after?.k === 'li' && before?.k === 'li' && after.done !== undefined && after.done !== before.done ? followTick(doc, where) : [];
    // A Tiny Little Office link pasted as an item is that document, under this item.
    const link = after?.k === 'li' ? refOfLink(plainText(after.runs)) : null;
    const asDoc: Op[] = link && after?.k === 'li' ? [{ op: 'splice', at: where, n: 1, blocks: [docBlock(after.depth, link)] }] : [];
    this.edit([...all, ...renames, ...ticked, ...asDoc], kind === 'type' && !asDoc.length ? `type:${where}` : undefined);
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
    const ops: Op[] = [];
    for (let p = parentOf(this.items, i); p >= 0; p = parentOf(this.items, p)) if (this.items[p].shut) ops.push(...setShut(this.doc, this.items[p].at, false));
    if (ops.length) this.edit(ops);
  }
  removeRow(at: number, forward = false) {
    const vis = this.visible();
    const i = vis.findIndex((x) => x.at === at);
    const to = (forward ? (vis[i + 1] ?? vis[i - 1]) : (vis[i - 1] ?? vis[i + 1]))?.at ?? -1;
    this.edit(removeAt(this.doc, this.view, at));
    if (to >= 0) this.focusRow(to > at ? to - 1 : to, to > at && forward ? 0 : 'end');
    else this.sel = -1;
  }

  /* ---------- the tree ---------- */

  shiftBy(at: number, by: 1 | -1) {
    const ops = shiftItem(this.doc, this.view, at, by);
    if (!ops) return;
    const offset = this.caretIn(at);
    this.edit(ops);
    this.focusRow(at, offset);
  }
  moveBy(at: number, by: 1 | -1) {
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
  /**
   * Read-only, an item activated (its row, anything on it) is picked (kit/core/element.ts): its block, and its place
   * among the items, from 0. Its fold arrow is picked too, and says so (`part: 'fold'`, with `shut`, 1 where the arrow
   * folds it and 0 where it opens it), so a page tells a fold from a pick; the arrow folds it as well (`chose`), in the
   * view alone.
   */
  protected pickOf(el: Element): Picked | null {
    const row = el.closest<HTMLElement>('.ol-row[data-at]');
    const at = Number(row?.dataset.at ?? -1);
    if (!row || at < 0 || !this.contains(row)) return null;
    const item = indexAt(this.view, at);
    return el.closest('.ol-fold') ? { at, item, part: 'fold', shut: this.folded.has(at) ? 0 : 1 } : { at, item };
  }
  /** Read-only, a fold arrow picked folds or opens its item in the view. */
  protected chose(pick: Picked) {
    if (pick.part === 'fold') this.fold(pick.at, pick.shut === 1);
  }
  /** An item folded or opened: written in the document (`{.shut}`); read-only, in the view alone, nothing written. */
  fold(at: number, shut = !this.folded.has(at)) {
    if (!this.readOnly) return this.edit(setShut(this.doc, at, shut));
    this.viewFolds.set(at, shut);
    this.requestUpdate();
  }
  foldAll(shut: boolean) {
    if (!this.readOnly) return this.edit(setShutAll(this.doc, this.view, shut));
    this.view.items.forEach((it, i) => (hasChildren(this.view.items, i) || !shut) && this.viewFolds.set(it.at, shut));
    this.requestUpdate();
  }
  zoomTo(at: number) {
    this.zoom = at;
    if (at >= 0) this.fold(at, false);
    this.focusRow(at >= 0 ? at : (this.items[0]?.at ?? -1));
  }
  zoomOut() {
    const i = indexAt(this.view, this.zoom);
    if (i < 0) return;
    const p = parentOf(this.items, i);
    this.zoomTo(p >= 0 ? this.items[p].at : -1);
  }
  /** A new item at the end of what is shown, from Insert or a tap under the last row: at the margin, or last inside the zoomed item. */
  addItem() {
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
    if (b?.k === 'edge') return { from: short(b.from), to: short(b.to), dir: b.dir, label: b.label, edge: true };
    const i = indexAt(this.view, at);
    if (i < 0) return null;
    const it = this.items[i];
    const p = parentOf(this.items, i);
    if (p < 0) return null;
    return { from: short(plainText(this.items[p].runs)) || t('outline-item-above'), to: short(plainText(it.runs)) || t('outline-this-item'), dir: it.dir ?? '--', label: it.label, edge: false };
  }
  private setDir(at: number, dir: Dir) {
    const b = this.doc.blocks[at];
    this.edit(b?.k === 'edge' ? setLink(this.doc, at, { dir }) : setLine(this.doc, this.view, at, { dir }));
  }
  private lineItems(): MenuItem[] {
    const at = this.menuFor;
    const ends = at >= 0 ? this.endsOf(at) : null;
    if (!ends) return [];
    // The item's own things first (its status, its due day, its line's name, the zoom); the kinds of line last, under the
    // parent's name alone, a few words of it (Paul, 2026-10-15: the menu named both items in full, a sentence each).
    // (A document's own words in a menu are quoted, as everywhere: “Building it…”.)
    const said = ends.edge ? t('outline-connection-from-from-to-to', ft(ends)) : t('outline-line-to-parent', { parent: ends.from });
    const kinds: [Dir, string][] = [
      ['--', t('outline-plain-line')],
      ['->', ends.edge ? t('outline-arrow-from-from-to-to', { from: ends.from, to: ends.to }) : t('outline-arrow-from-parent-item', { parent: ends.from })],
      ['<-', ends.edge ? t('outline-arrow-from-from-to-to', { from: ends.to, to: ends.from }) : t('outline-arrow-to-parent-item', { parent: ends.from })],
      ['<->', t('outline-arrows-both-ways')],
    ];
    const i = indexAt(this.view, at);
    return [
      ...this.statusItems(at),
      { label: t('outline-name-line'), icon: UI.pen, hint: ends.label, does: () => this.openNaming(at) },
      ...(i >= 0 && hasChildren(this.items, i) ? [{ label: t('common-zoom-in'), icon: ZoomIn, does: () => this.zoomTo(at) }] : []),
      ...(ends.edge ? [{ label: t('outline-take-connection-away'), icon: UI.trash, does: () => this.edit(unlink(this.doc, at)) }] : []),
      ...kinds.map(([dir, label]) => ({ group: said, label, icon: DIR_ICON[dir] ?? Minus, checked: ends.dir === dir, does: () => this.setDir(at, dir) })),
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
    this.dating = -1;
    this.statusDraft = null;
    this.filter = null;
    this.agenda = false;
    this.agendaSort = null;
    this.byStatus = false;
    const b = this.doc.blocks[at];
    const label = value.replace(/\s+/g, ' ').trim();
    if (keep && label !== (this.endsOf(at)?.label ?? '')) this.edit(b?.k === 'edge' ? setLink(this.doc, at, { label }) : setLine(this.doc, this.view, at, { label }));
  }
  /** Connect: start from the chosen item, or pick one first; everything else goes grey until the other end is tapped. */
  connect() {
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

  /** A document under the item chosen when it was asked for (or at the end). */
  private putDoc(sel: number, ref: string) {
    const r = insertDoc(this.doc, this.view, sel, ref);
    this.edit(r.ops);
    this.focusRow(r.at);
  }
  /** A new document of that app, made in its own editor in the dialog: Done puts it under the chosen item, Cancel puts nothing. */
  async insertApp(id: string) {
    const sel = this.sel;
    const fence = await makeDoc(id);
    if (fence) this.putDoc(sel, fenceRef(fence));
  }
  async insertLinked() {
    const sel = this.sel;
    const fence = await askDocLink();
    if (fence?.k === 'fence') this.putDoc(sel, fenceRef(fence));
  }
  /** The document under an item, edited in its own app in the dialog: Done writes it back as one step. */
  private async editRow(at: number) {
    const b = this.doc.blocks[at];
    if (b?.k !== 'fence' || (!appOf(b.lang) && b.lang !== LOCKED_LANG)) return;
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
  /** The Outliner's keys (commands.ts), in a row: never from a popover or a dialog, nor while rows are chosen whole (the rows controller's). */
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.composedPath()[0] as HTMLElement;
    if (target.closest?.('[popover]') || target.closest?.('dialog')) return;
    if (this.rows.range && !target.closest?.('to-text')) return;
    if (this.rowOfKey(e) < 0) return;
    runKey(e, COMMANDS, this);
  };
  /** The row a key was typed in (-1: none). */
  rowOfKey(e: KeyboardEvent): number {
    const row = (e.composedPath()[0] as HTMLElement).closest?.('.ol-row') as HTMLElement | null;
    const at = row ? Number(row.dataset.at) : NaN;
    return Number.isFinite(at) && at >= 0 ? at : -1;
  }
  /** Delete or Backspace on a document's row (not in words): the row goes. False anywhere else. */
  removeDocRow(at: number, e?: Event): boolean {
    if (!this.itemAt(at)?.doc || (e?.target as HTMLElement | null)?.closest?.('to-text')) return false;
    this.removeRow(at);
    return true;
  }
  /** A plain arrow at the edge of a row's words: on to the row before or after (Up and Down under where the caret was). False inside the words. */
  stepRow(e: KeyboardEvent): boolean {
    const at = this.rowOfKey(e);
    const vis = this.visible();
    const i = vis.findIndex((x) => x.at === at);
    const tx = (e.composedPath()[0] as HTMLElement).closest?.('to-text') as ToText | null;
    const s = tx?.sel;
    const flat = !!s && s.anchor.offset === s.focus.offset;
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      const to = vis[k === 'ArrowUp' ? i - 1 : i + 1];
      if (!to || !tx || !this.atEdgeLine(tx, k === 'ArrowUp')) return false;
      this.focusRow(to.at, this.columnIn(to.at, k === 'ArrowUp'));
      return true;
    }
    if (k === 'ArrowLeft' && flat && tx && s.focus.offset === 0 && i > 0) return (this.focusRow(vis[i - 1].at, 'end'), true);
    if (k === 'ArrowRight' && flat && tx && s.focus.offset >= this.lengthOf(at) && i >= 0 && i < vis.length - 1) return (this.focusRow(vis[i + 1].at, 0), true);
    return false;
  }
  lengthOf(at: number): number {
    const b = this.doc.blocks[at];
    return b && isText(b) ? runLength(b.runs) : 0;
  }
  /** Whether the caret is on the first (up) or last (down) line of its words, where Up/Down leave the row; inside a long item they walk its lines. */
  atEdgeLine(tx: ToText, up: boolean): boolean {
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
  columnIn(at: number, up: boolean): number | 'end' {
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
    const hit =
      doc.caretPositionFromPoint?.(x, y) ??
      (() => {
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

  /** The outline opened as another kind of document, in that app, in a new tab. */
  openAs(h: Handoff) {
    window.open(host.link(h.to, h.convert(write(this.doc))), '_blank', 'noopener');
  }
  showPage() {
    this.showing = true;
    void this.updateComplete.then(() => this.querySelector<ToDialog>('.ol-page-dialog')?.show());
  }
  async pickIcon() {
    const { chooseIcon } = await import('../../kit/ui/icons-picker.ts');
    const name = await chooseIcon();
    if (name) this.field?.exec('icon', name);
  }

  /** The bar, drawn from the registry (commands.ts): the marks are the words', the row's <to-text> their context. */
  private renderBar() {
    const it = this.itemAt(this.sel);
    const x = it && !it.doc ? this.field : null;
    const own = (id: string) => COMMANDS.find((c) => c.id === `outline.${id}`)!;
    const view = own('view');
    return html`<to-bar class="ol-bar">
      <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
      ${[BOLD, ITALIC, UNDERLINE, STRIKE, HIGHLIGHT, CODE, LINK].map((c) => cmdTool(c, x))}
      ${cmdTool(own('icon'), this)}
      ${cmdTool(FOOTNOTE, x)}
      ${['indent', 'outdent', 'up', 'down', 'numbered', 'zoomout', 'zoomin', 'foldall', 'unfoldall'].map((id) => cmdTool(own(id), this))}
      ${cmdBtn(own('connect'), this, { icon: this.connecting ? UI.close : undefined })}
      <to-menu class="ol-view-as" .label=${labelOf(view, this)} .icon=${view.icon} caret .items=${drawnIn(COMMANDS, 'menu:view', this)}></to-menu>
      ${this.undoTools()}
    </to-bar>`;
  }

  /* ---------- the rows ---------- */

  /** The bullet that is a line to the parent: a dot, or an arrow which way it points; tapped, it opens the line's menu. */
  private bullet(at: number, ends: Ends, n?: number): TemplateResult {
    const glyph = DIR_ICON[ends.dir];
    const label = `${ends.edge ? t('outline-connection-from-from-to-to', ft(ends)) : t('outline-line-from-from-to-to', ft(ends))}: ${DIR_NAME[ends.dir]()}${ends.label ? t('outline-named-label', { label: ends.label }) : ''}. ${t('outline-change-it')}`;
    return html`<button type="button" class="ol-kind" data-dir=${ends.dir} aria-label=${label} title=${label} aria-haspopup="menu" aria-expanded=${this.menuFor === at ? 'true' : 'false'} @mousedown=${(e: Event) => e.preventDefault()} @click=${(e: MouseEvent) => (e.shiftKey && this.itemAt(at) ? this.rows.choose(at, true) : void this.openLineMenu(at, e.currentTarget as HTMLElement))}>${n ? html`<b class="ol-n">${n}.</b>` : glyph ? icon(glyph, 14) : html`<span></span>`}</button>`;
  }
  /** A line's name, as a chip before the words; tapped, its name is typed there. */
  private chip(at: number, label?: string) {
    // -1 is "no row is naming" and also the empty document's ghost row: the ghost never shows the field.
    if (this.naming === at && at >= 0)
      return html`<input class="ol-label ol-label-in" aria-label=${t('outline-name-of-line')} placeholder=${t('outline-e-g-owns-feeds-reports')} .value=${label ?? ''} autocomplete="off" spellcheck="false"
        @keydown=${(e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
          e.preventDefault();
          this.saveName(e.key === 'Enter', (e.target as HTMLInputElement).value);
        }}
        @blur=${(e: FocusEvent) => this.saveName(true, (e.target as HTMLInputElement).value)} />`;
    return label
      ? html`<button type="button" class="ol-label to-chip accent" aria-label=${t('outline-line-named-label-change-it', { label })} @click=${() => this.openNaming(at)}>${label}</button>`
      : nothing;
  }
  /* ---------- the compound bullet: a status of the document's set, a task's box, a due day (Paul, 2026-10-15) ---------- */

  /** The document's statuses, from its head. */
  get statuses(): Status[] {
    return statusesOf(this.doc);
  }
  /** The status, a pill before the words in its color; tapped, the next of the set (round the end). */
  private statusChip(at: number, it: Item) {
    if (!it.status) return nothing;
    const s = this.statuses.find((x) => x.name === it.status) ?? { name: it.status, color: STATUS_COLORS.gray };
    return html`<button type="button" class="ol-status to-chip tint" style="--chip:${s.color}" aria-label=${t('outline-status-status-tap-for-next', { status: s.name })} title=${t('outline-status')} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.cycleStatus(at)}>${s.name}</button>`;
  }
  /**
   * A task's box, drawn in the row (the words' own marker is hidden in a row, style.css, so without this a task showed
   * nothing; Paul, 2026-10-15: "What happened to statuses on the outliner and checkboxes"): a checkbox, tapped to check
   * or uncheck, the status following (tick).
   */
  private taskBox(at: number, block: Block | undefined) {
    if (block?.k !== 'li' || block.done === undefined) return nothing;
    const done = !!block.done;
    return html`<button type="button" class="ol-task" role="checkbox" aria-checked=${String(done)} aria-label=${t('common-check-or-uncheck-task')} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.tickAt(at)}>${done ? icon(UI.check, 12) : nothing}</button>`;
  }
  cycleStatus(at: number) {
    const st = this.statuses;
    const it = this.itemAt(at);
    if (!st.length || !it) return;
    const i = st.findIndex((x) => x.name === it.status);
    this.edit(setStatus(this.doc, at, st[(i + 1) % st.length].name, st));
  }
  /** The line menu's rows for the status (the set, and none) and the due day. */
  private statusItems(at: number): MenuItem[] {
    const it = this.itemAt(at);
    if (!it || it.doc) return [];
    const st = this.statuses;
    const due = it.due;
    return [
      ...st.map((s) => ({ group: t('outline-status'), label: s.name, checked: it.status === s.name, does: () => this.edit(setStatus(this.doc, at, s.name, st)) })),
      ...(st.length ? [{ group: t('outline-status'), label: t('outline-no-status'), checked: !it.status, does: () => this.edit(setStatus(this.doc, at, undefined, st)) }] : []),
      { group: t('outline-status'), label: t('outline-edit-statuses'), icon: UI.pen, does: () => this.editStatuses() },
      { label: due ? t('outline-due-date-change-it', { date: this.dayWords(due) }) : t('outline-due-date-ellipsis'), icon: UI.calendar, does: () => this.openDating(at) },
      ...(due ? [{ label: t('outline-remove-due-date'), icon: UI.close, does: () => this.edit(setDue(this.doc, at, undefined)) }] : []),
    ];
  }
  /** A day as the reader's language says it: "Oct 20", with the year when it is not this one. */
  private dayWords(due: string): string {
    const [y, m, d] = due.split('-').map(Number);
    if (!y || !m || !d) return due;
    const thisYear = new Date().getFullYear() === y;
    return dateWords({ month: 'short', day: 'numeric', ...(thisYear ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
  }
  /** The due day, a chip after the words; tapped, a date field where it was. */
  private dueChip(at: number, it: Item) {
    // -1 is "no row is dating" and also the empty document's ghost row, which showed a date field on every new outline (Paul, 2026-10-15).
    if (this.dating === at && at >= 0)
      return html`<input type="date" class="ol-due-in" aria-label=${t('outline-due-date')} .value=${it.due ?? defaultDue(this.view, indexAt(this.view, at))} autocomplete="off"
        @keydown=${(e: KeyboardEvent) => {
          e.stopPropagation();
          if (e.key !== 'Enter' && e.key !== 'Escape') return;
          e.preventDefault();
          this.saveDue(e.key === 'Enter', (e.target as HTMLInputElement).value);
        }}
        @change=${(e: Event) => this.saveDue(true, (e.target as HTMLInputElement).value)}
        @blur=${(e: FocusEvent) => this.saveDue(true, (e.target as HTMLInputElement).value)} />`;
    return it.due
      ? html`<button type="button" class="ol-due to-chip quiet" aria-label=${t('outline-due-date-change-it', { date: this.dayWords(it.due) })} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.openDating(at)}>${icon(UI.calendar, 12)}<span>${this.dayWords(it.due)}</span></button>`
      : nothing;
  }
  private openDating(at: number) {
    this.naming = -1;
    this.dating = at;
    this.performUpdate();
    const box = this.querySelector<HTMLInputElement>('input.ol-due-in');
    box?.focus({ preventScroll: true });
    // The browser's own picker, opened at once where the browser allows it (a tap; not a key's command, which throws).
    try {
      box?.showPicker?.();
    } catch {
      /* the field is there to type in */
    }
  }
  private saveDue(keep: boolean, value: string) {
    const at = this.dating;
    if (at < 0) return;
    this.dating = -1;
    this.statusDraft = null;
    this.filter = null;
    this.agenda = false;
    this.agendaSort = null;
    this.byStatus = false;
    if (keep) this.edit(setDue(this.doc, at, value || undefined));
    if (!this.agenda && !this.byStatus) void this.updateComplete.then(() => this.focusRow(at));
  }
  /** Insert ▾: the item in hand a task (a box before its words), or, a task already, its box checked or unchecked. */
  addTask() {
    const it = this.itemAt(this.sel);
    if (!it || it.doc) return;
    const b = this.doc.blocks[it.at];
    this.edit(b?.k === 'li' && b.done !== undefined ? tick(this.doc, it.at) : makeTask(this.doc, it.at, true));
  }
  /** Mod+Enter in a row: its task's box checked or unchecked (a row that is no task is left alone). */
  tickAt(at: number) {
    this.edit(tick(this.doc, at));
  }
  /** Insert ▾: a due day on the item in hand, starting from today or the nearest day to come above it, typed where it shows. */
  addDue() {
    const it = this.itemAt(this.sel);
    if (!it || it.doc) return;
    if (!it.due) this.edit(setDue(this.doc, it.at, defaultDue(this.view, indexAt(this.view, it.at))));
    void this.updateComplete.then(() => this.openDating(it.at));
  }
  /**
   * Insert ▾'s Statuses, and the line menu's Edit statuses…: the set in a dialog, a name and a color a row, to rename, recolor,
   * add, take away and reorder by taking away and adding (Paul, 2026-10-15: "Can I edit statuses"). A document with no set
   * gets TODO, DOING and DONE to start from, and the item in hand the first, once Done.
   */
  editStatuses() {
    const st = this.statuses.length ? this.statuses : statusesOf({ head: { statuses: DEFAULT_STATUSES }, blocks: [] });
    this.statusDraft = st.map((s) => ({ name: s.name, word: s.word, was: this.statuses.length ? s.name : '' }));
    void this.updateComplete.then(async () => {
      await this.querySelector<ToDialog>('to-dialog.ol-statuses')?.show();
      this.querySelector<HTMLInputElement>('.ol-statuses-row input')?.focus();
    });
  }
  private statusesBody() {
    const draft = this.statusDraft;
    if (!draft) return nothing;
    const colors = Object.keys(STATUS_COLORS);
    const set = (i: number, patch: Partial<{ name: string; word: string }>) => (this.statusDraft = draft.map((s, k) => (k === i ? { ...s, ...patch } : s)));
    return html`<p class="to-hint">${t('outline-last-status-means-done')}</p>
      <div class="ol-statuses-list" role="list">
        ${draft.map(
          (s, i) => html`<div class="ol-statuses-row" role="listitem">
            <input type="text" class="ol-status-in" style="--chip:${STATUS_COLORS[s.word] ?? STATUS_COLORS.gray}" .value=${s.name} aria-label=${t('common-name')} autocomplete="off" spellcheck="false" @input=${(e: Event) => set(i, { name: (e.target as HTMLInputElement).value })} />
            <to-menu class="ol-color-menu" icon-only caret .swatch=${STATUS_COLORS[s.word]} .label=${COLOR_NAMES[s.word]()} .items=${colors.map((w) => ({ label: COLOR_NAMES[w](), swatch: STATUS_COLORS[w], checked: w === s.word, does: () => set(i, { word: w }) }))}></to-menu>
            ${tool({ label: t('outline-take-it-away'), icon: UI.close, does: () => (this.statusDraft = draft.filter((_, k) => k !== i)) })}
          </div>`,
        )}
      </div>
      <div class="ol-statuses-foot">
        <button type="button" class="to-btn" @click=${() => (this.statusDraft = [...draft, { name: '', word: colors[draft.length % colors.length], was: '' }])}>${icon(UI.insert, 16)}<span>${t('outline-add-status')}</span></button>
        <button type="button" class="to-btn primary ol-statuses-done" @click=${() => this.saveStatuses()}>${t('common-done')}</button>
      </div>`;
  }
  private saveStatuses() {
    const draft = this.statusDraft;
    if (!draft) return;
    const fresh = !this.statuses.length;
    const ops = applyStatuses(this.doc, this.view, draft);
    // A set made just now: the item in hand gets its first status.
    const it = this.itemAt(this.sel);
    if (fresh && ops.length && it && !it.doc && !it.status) {
      const doc = applyAll(this.doc, ops);
      const st = statusesOf(doc);
      if (st.length) ops.push(...setStatus(doc, it.at, st[0].name, st));
    }
    if (ops.length) this.edit(ops);
    this.querySelector<ToDialog>('to-dialog.ol-statuses')?.close();
    this.statusDraft = null;
    this.filter = null;
    this.agenda = false;
    this.agendaSort = null;
    this.byStatus = false;
  }
  /** Another document under an item: its app and first line, a way to open it in its own app, and the way back (its link pasted over the card). */
  private renderDoc(it: Item) {
    const { app, gist } = docGist(it.doc!);
    const body = it.doc!.slice(it.doc!.indexOf('\n') + 1);
    const locked = app === LOCKED_LANG;
    const href = host.link(app, body);
    return html`<div class="ol-doc" tabindex="0" role="group" aria-label=${appOf(app) ? t('common-noun', { noun: appOf(app)!.noun }) : t('common-app-document', { app: appName(app) })} @paste=${(e: ClipboardEvent) => this.onDocPaste(it.at, e)}>
      <span class="ol-doc-kind">${locked ? icon(UI.lock, 16) : appOf(app) ? icon(appOf(app)!.icon, 16) : nothing}<b>${appName(app)}</b></span>
      <span class="ol-doc-gist">${locked ? t('common-with-password') : gist || t('outline-empty')}</span>
      ${locked || appOf(app) ? tool({ label: t('common-edit'), icon: UI.pen, cls: 'ol-doc-edit', does: () => void this.editRow(it.at) }) : nothing}
      <a class="to-btn to-tool" href=${href} target="_blank" rel="noopener" aria-label=${t('common-open-in-new-tab')} title=${t('common-open-in-new-tab')}>${icon(UI.open, 16)}</a>
      ${tool({ label: t('outline-take-it-away'), icon: UI.close, does: () => this.removeRow(it.at) })}
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
    const asDoc = !!it.doc;
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
      @click=${(e: MouseEvent) => (this.filter ? this.land(at) : e.target === e.currentTarget && this.focusRow(at))}
    >
      <span class="ol-gutter">
        <button type="button" class="ol-handle to-rows-handle" aria-label=${t('outline-move-this-item-drag-it')} title=${t('common-drag-to-move')} tabindex="-1">${icon(GripVertical, 14)}</button>
        ${kids ? html`<button type="button" class="ol-fold" aria-label=${shut ? t('outline-unfold-n-inside', { n: inside }) : t('outline-fold')} aria-expanded=${shut ? 'false' : 'true'} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.fold(at)}>${icon(shut ? ChevronRight : ChevronDown, 14)}</button>` : nothing}
      </span>
      ${ends ? html`<span class="ol-bullet">${this.bullet(at, ends, n)}</span>` : html`<span class="ol-bullet" @click=${(e: MouseEvent) => e.shiftKey && this.rows.choose(at, true)}><span class="ol-kind root" aria-hidden="true">${n ? html`<b class="ol-n">${n}.</b>` : html`<span></span>`}</span></span>`}
      ${asDoc ? nothing : this.taskBox(at, block)}
      ${
        asDoc
          ? this.renderDoc(it)
          : html`<to-text shape="line" notes .blocks=${this.blocksFor(block)} .noteStart=${noteStart} label=${t('outline-item-n', { n: i + 1 })} placeholder=${placeholder} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(at, e)} @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(at))} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(at, e.detail.dir))} @text-selectall=${(e: Event) => (e.stopPropagation(), this.rows.selectAll())} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect(at, e)} @text-note=${(e: CustomEvent<NoteAt>) => this.onNote(at, e)} @focusin=${(e: FocusEvent) => (this.field = e.currentTarget as ToText)}></to-text>`
      }
      ${asDoc ? nothing : html`<span class="ol-meta">${ends ? this.chip(at, it.label) : nothing}${this.statusChip(at, it)}${this.dueChip(at, it)}</span>`}
      ${kids && shut ? html`<span class="ol-count" aria-hidden="true">${inside}</span>` : nothing}
      ${c && words && !it.doc && at !== c.from ? html`<button type="button" class="ol-pick" aria-label=${c.from < 0 ? t('outline-connect-from-words', { words }) : t('outline-connect-from-to-to', { from: plainText(this.itemAt(c.from)?.runs ?? []).trim(), to: words })} @click=${() => this.pick(at)}></button>` : nothing}
    </div>`;
  }
  private onSelect(at: number, e: CustomEvent<Sel | null>) {
    e.stopPropagation();
    if (e.detail) {
      this.field = e.target as ToText;
      this.sel = at;
    }
    if (this.selectionMoved(`${this.sel} ${!!e.detail} ${JSON.stringify(this.field?.marks ?? {})}`)) this.requestUpdate();
  }

  private crumbs() {
    const z = indexAt(this.view, this.zoom);
    if (z < 0) return nothing;
    const trail: number[] = [];
    for (let p = z; p >= 0; p = parentOf(this.items, p)) trail.unshift(p);
    return html`<nav class="ol-crumbs" aria-label=${t('outline-zoomed-in-on')}>
      <button type="button" @click=${() => this.zoomTo(-1)}>${icon(UI.home, 14)} ${t('outline-everything')}</button>
      ${trail.map((p) => html`<span aria-hidden="true">›</span><button type="button" @click=${() => this.zoomTo(this.items[p].at)} aria-current=${p === z ? 'true' : 'false'}>${plainText(this.items[p].runs).trim() || t('common-untitled')}</button>`)}
    </nav>`;
  }

  /** The joins, under the outline: each with its kind of line, its name, and a way to take it away. */
  private renderLinks(links: Link[]) {
    if (!links.length) return nothing;
    return html`<section class="ol-links" aria-label=${t('common-connections')}>
      <h2>${t('common-connections')}</h2>
      ${links.map((l) => {
        const ends = this.endsOf(l.at)!;
        return html`<div class="ol-link" data-at=${l.at}>
          <span class="ol-end">${l.from}</span>
          <span class="ol-bullet">${this.bullet(l.at, ends)}</span>${this.chip(l.at, l.label)}
          <span class="ol-end">${l.to}</span>
          ${tool({ label: t('outline-take-away-connection-from-from', { from: l.from, to: l.to }), icon: UI.close, does: () => this.edit(unlink(this.doc, l.at)) })}
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
    // Numbered items show their numbers as the text writes them.
    const count = listNumbers();
    const numbers = this.doc.blocks.map((b) => count(b));
    const s = this.rows.range ? this.rows.span() : null;
    const rows = items.length ? vis : [{ at: -1, depth: this.base, runs: [] } as Item];
    return html`${this.readOnly ? nothing : this.renderBar()}
      ${c ? html`<p class="ol-hint to-hint" role="status">${c.from < 0 ? t('outline-tap-item-to-connect-from') : t('outline-tap-item-to-connect-words', { words: plainText(this.itemAt(c.from)?.runs ?? []).trim() })}</p>` : nothing}
      ${this.crumbs()}
      <div class="ol ${c ? 'connecting' : ''}" role="tree" tabindex="-1" aria-multiselectable="true" aria-label=${t('common-outline')}>
        ${repeat(
          rows,
          (it) => it.at,
          (it) => this.renderRow(it, noteStart.get(it.at) ?? 0, '', numbers[it.at], !!s && it.at >= s.from && it.at < s.to),
        )}
        <div class="ol-below" aria-hidden="true" @click=${() => (this.rows.release(), this.addItem())}></div>
      </div>
      ${this.renderLinks(liveLinks(this.view))}
      ${this.rows.renderContext()}
      <to-menu class="ol-line-menu" .label=${t('outline-kind-of-line')} .items=${this.lineItems()}></to-menu>
      ${this.renderNotes()}
      ${this.renderPageDialog()}
      <to-dialog class="ol-statuses" heading=${t('outline-statuses')} @to-close=${() => (this.statusDraft = null)} .body=${this.statusesBody()}></to-dialog>
      <to-dialog class="ol-agenda" heading=${t('outline-agenda')} @to-close=${() => (this.agenda = false)} .body=${this.agenda ? this.agendaBody() : nothing}></to-dialog>
      <to-dialog class="ol-by-status" heading=${t('outline-by-status')} @to-close=${() => (this.byStatus = false)} .body=${this.byStatus ? this.byStatusBody() : nothing}></to-dialog>`;
  }

  /* ---------- the views of the compound bullet: an agenda, the items by status (Paul, 2026-10-15) ---------- */

  /** The row's element, by its block. */
  private rowEl(at: number): HTMLElement | null {
    return at < 0 ? null : this.querySelector<HTMLElement>(`.ol-row[data-at="${at}"]`);
  }
  /** The items with something to do: a task, a status or a due day; never a document. */
  private todo(): Item[] {
    return this.items.filter((it) => !it.doc && (it.status || it.due || (this.doc.blocks[it.at] as { done?: boolean }).done !== undefined));
  }
  showAgenda() {
    this.agenda = true;
    void this.updateComplete.then(() => this.querySelector<ToDialog>('to-dialog.ol-agenda')?.show());
  }
  showByStatus() {
    this.byStatus = true;
    void this.updateComplete.then(() => this.querySelector<ToDialog>('to-dialog.ol-by-status')?.show());
  }
  /** A row of a view tapped: the dialog closes and the item has the caret, as the central thing. */
  private goTo(at: number) {
    this.agenda = false;
    this.byStatus = false;
    this.querySelector<ToDialog>('to-dialog.ol-agenda')?.close();
    this.querySelector<ToDialog>('to-dialog.ol-by-status')?.close();
    this.unhide(indexAt(this.view, at));
    void this.updateComplete.then(() => this.focusRow(at));
  }
  /**
   * A row of a view (the agenda, by status): the item's box, its status, its words and its due day, each the row's own
   * (the box ticks, the status goes to the next, the day is picked, as in the outline: Paul, 2026-10-15, "If I click on a
   * TODO in a view or a status or a checkbox I should be able to change that in the data"); the words tapped close the
   * view and give the item the caret ("If I click on a line close the window and let me edit").
   */
  private viewRow(it: Item) {
    const block = this.doc.blocks[it.at];
    return html`<li class="ol-view-row">
      ${this.taskBox(it.at, block)}${this.statusChip(it.at, it)}
      <button type="button" class="ol-agenda-item" @click=${() => this.goTo(it.at)}>${plainText(it.runs).trim() || t('common-untitled')}</button>
      ${this.dueChip(it.at, it)}
    </li>`;
  }
  private agendaBody() {
    const st = this.statuses;
    const rank = new Map(st.map((s, i) => [s.name, i]));
    const items = [...this.todo()];
    const sort = this.agendaSort;
    if (sort === 'status') items.sort((a, b) => (rank.get(a.status ?? '') ?? st.length) - (rank.get(b.status ?? '') ?? st.length));
    else if (sort === 'due') items.sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
    if (!items.length) return html`<p class="to-hint">${t('outline-nothing-to-do-yet')}</p>`;
    const sorter = (key: 'status' | 'due', label: string) =>
      html`<button type="button" class="to-btn ol-agenda-sort" aria-pressed=${String(sort === key)} @click=${() => (this.agendaSort = sort === key ? null : key)}>${label}</button>`;
    return html`<div class="ol-agenda-sorts" role="group" aria-label=${t('sheet-sort-rows-by-it')}>${sorter('status', t('outline-status'))}${sorter('due', t('outline-due-date'))}</div>
      <ul class="ol-agenda-list">
        ${items.map((it) => this.viewRow(it))}
      </ul>`;
  }
  private byStatusBody() {
    const st = this.statuses;
    const items = this.todo();
    const groups = [
      ...st.map((s) => ({ name: s.name, color: s.color, items: items.filter((it) => it.status === s.name) })),
      { name: t('outline-no-status'), color: STATUS_COLORS.gray, items: items.filter((it) => !it.status || !st.some((s) => s.name === it.status)) },
    ];
    if (!items.length) return html`<p class="to-hint">${t('outline-nothing-to-do-yet')}</p>`;
    return html`<div class="ol-by-status-groups">${groups
      .filter((g) => g.items.length)
      .map(
        (g) => html`<section class="ol-by-status-group">
          <h3><span class="ol-status to-chip tint" style="--chip:${g.color}">${g.name}</span> <small>${g.items.length}</small></h3>
          <ul class="ol-agenda-list bulleted">
            ${g.items.map((it) => this.viewRow(it))}
          </ul>
        </section>`,
      )}</div>`;
  }

  /* ---------- Find: the matching rows alone, the terms marked; a tap lands on one (Paul, 2026-10-15) ---------- */

  /** Whether an item's words hold every term (case and accents aside, as the find bar reads them). */
  private matchesFind(it: Item): boolean {
    if (!this.filter?.length || it.doc) return false;
    const f = fold(plainText(it.runs));
    return this.filter.every((term) => f.includes(term));
  }
  /** The find bar's search: the rows that match are the ones shown, the terms marked in them; each in turn brought into view. */
  find(terms: string[]): Found {
    this.filter = terms;
    const rows = this.visible();
    const hl = highlights();
    let now = -1;
    const mark = () => {
      const tree = this.querySelector('.ol-tree');
      if (!tree) return;
      hl?.set('to-find', new Highlight(...rangesIn(tree, terms)));
    };
    void this.updateComplete.then(mark);
    return {
      count: rows.length,
      go: (i) => {
        now = i;
        void this.updateComplete.then(() => {
          mark();
          const row = this.rowEl(rows[i]?.at ?? -1);
          if (!row) return;
          const own = rangesIn(row, terms);
          if (own.length) hl?.set('to-find-now', new Highlight(...own));
          reveal(row, { block: 'center' });
        });
      },
      clear: () => {
        hl?.delete('to-find');
        hl?.delete('to-find-now');
        this.filter = null;
      },
      leave: () => {
        const at = rows[now]?.at;
        if (at !== undefined) this.land(at);
      },
    };
  }
  /** A row tapped while Find shows the matches: the filter lifts, the item is zoomed to, and its words have the caret. */
  land(at: number) {
    this.filter = null;
    highlights()?.delete('to-find');
    highlights()?.delete('to-find-now');
    const i = indexAt(this.view, at);
    if (i >= 0 && hasChildren(this.items, i)) this.zoomTo(at);
    else this.unhide(i);
    void this.updateComplete.then(() => this.focusRow(at));
  }

  /* ---------- the footnotes, under the outline ---------- */

  /** Every item's footnote marks, in the order of the outline (their blocks are the items' own). */
  private marks(): NoteMark[] {
    return this.items.flatMap((it) => (it.doc ? [] : noteMarks([this.doc.blocks[it.at]]).map((m) => ({ ...m, block: it.at }))));
  }
  get notesEl(): ToNotes | null {
    return this.querySelector<ToNotes>('to-notes.ol-fn');
  }
  /** A mark tapped in a row, or a footnote just put in: the caret in its note's words under the outline. */
  private onNote(at: number, e: CustomEvent<NoteAt>) {
    e.stopPropagation();
    const first = this.marks().findIndex((m) => m.block === at);
    if (first >= 0) void this.updateComplete.then(() => this.notesEl?.focusNote(first + e.detail.nth));
  }
  private onNoteChange = (e: CustomEvent<{ nth: number; fn: string }>) => {
    const m = this.marks()[e.detail.nth];
    if (!m || m.fn === e.detail.fn) return;
    this.edit([{ op: 'text', at: m.block, from: m.offset, to: m.offset + 1, runs: [{ t: '', fn: e.detail.fn }] }], `note:${e.detail.nth}`, { note: e.detail.nth } satisfies Mark);
  };
  /** Back from a note to its row, the caret after the mark. */
  private onNoteBack = (e: CustomEvent<{ nth: number }>) => {
    const m = this.marks()[e.detail.nth];
    if (m) this.focusRow(m.block, m.offset + 1);
  };
  /** A note left empty: its mark goes (the caret where it was, when the note was left for the words). */
  private onNoteRemove = (e: CustomEvent<{ nth: number; back: boolean }>) => {
    const m = this.marks()[e.detail.nth];
    if (!m) return;
    this.edit([{ op: 'text', at: m.block, from: m.offset, to: m.offset + 1, runs: [] }], undefined, { at: m.block, offset: m.offset + 1 } satisfies Mark);
    if (e.detail.back) this.focusRow(m.block, m.offset);
  };
  /** The footnotes, under the outline, numbered as their marks are (as a slide's are at its foot). */
  private renderNotes() {
    const notes = this.marks().map((m) => m.fn);
    if (!notes.length) return nothing;
    return html`<to-notes class="ol-fn" role="group" aria-label=${t('common-footnotes')} .notes=${notes} @note-change=${this.onNoteChange} @note-back=${this.onNoteBack} @note-remove=${this.onNoteRemove}></to-notes>`;
  }
  private renderPageDialog() {
    return html`<to-dialog class="ol-page-dialog" heading=${t('outline-as-page')} @to-close=${() => (this.showing = false)} .body=${this.showing ? html`<div class="ol-page">${unsafeSVG(pageSvg(outlinePage(this.doc)))}</div>` : nothing}></to-dialog>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToOutlineEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-outline-editor': ToOutlineEditor;
  }
}
