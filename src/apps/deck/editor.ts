/**
 * <to-deck-editor>: the Deck app. One bar (Insert ▾, Present, the marks, link, footnote, the slide's icon,
 * indent, Layout, Look, Transition, Format, the QR toggle, move, delete, then undoTools()) over the current
 * slide, which fills the editor in its format's shape: the headline is a <to-text shape=line> over the
 * slide's heading block, the words a <to-text shape=lines> over its items and paragraphs (two of them for
 * two columns, either side of the "|"), the speaker notes a <to-text shape=lines> over its quote blocks.
 * Every op from an editor is offset by its span's start and applied through DocElement's edit(), with a mark
 * of the slide and the caret (or the slides chosen) that undone() puts back. The footnotes are at the slide's
 * foot (<to-notes>, kit/notes.ts), their words typed there: a mark tapped, or Footnote, puts the caret in its
 * note; Enter or Escape come back to the mark. A slide that shows another
 * document (a fence, a table, a picture) shows it as a card with a menu; a thing from the web (a web address or a
 * titled link alone) is the live card (<to-embed>, kit/embeds.ts) in the editor and in the show, loaded on a tap.
 * A link in a slide's words, in the show, is followed through the link guard (kit/link-guard.ts) and turns no slide.
 *
 * The rail's thumbnails are the slides as rows (kit/rows.ts, docs/editing.md §6): a tap chooses one (Shift
 * extends), its grip drags it, and chosen slides have the contextual bar and the keys (Delete, Alt+Up/Down,
 * Mod+D, Shift+arrows, Mod+A, Mod+C/X/V as TLO with our HTML). Escape in a box chooses its slide; Select All
 * with a box whole takes every slide; Enter or a double tap on a thumbnail edits it. The keys of §8: a new
 * slide is Mod+Shift+Enter, Present Mod+Alt+Enter, PageUp/PageDown on the rail only. A printed format shows
 * its sheets on request; presenting takes the focus and shows one slide at a time with the transition the
 * header names, and ends on the QR code of the deck. Two fingers on the slide in the show zoom it in place, as in a
 * spatial canvas (kit/pinch.ts pinchZoom): the show is its frame, scrolled to the rest; a pinch never turns a slide.
 */
import { html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { gateSvg } from '../../kit/pictures.ts';
import { motion, reducedMotion } from '../../kit/motion.ts';
import { pinchZoom } from '../../kit/pinch.ts';
import { ChevronDown, ChevronUp, GripVertical, StickyNote } from 'lucide';
import { applyAll, parse, plainText, webOf, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { lookup } from '../../kit/app.ts';
import { cmdMenu, cmdTool, tool } from '../../kit/bar.ts';
import { coarse, drawnIn, runKey } from '../../kit/commands.ts';
import { BOLD, FOOTNOTE, HIGHLIGHT, INDENT, ITALIC, LINK, OUTDENT, STRIKE, UNDERLINE } from '../../kit/text-commands.ts';
import COMMANDS, { EDIT, SHOW } from './commands.ts';
import { docToHtml, linkToFence, pasteFrom } from '../../kit/clipboard.ts';
import { encodeDoc } from '../../kit/codec.ts';
import { editFence, editTable, makeDoc, newTable } from '../../kit/doc-dialog.ts';
import { pageSvg } from '../../kit/draw.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { icon, iconNamed, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { noteMarks, type NoteMark, type ToNotes } from '../../kit/notes.ts';
import { askDocLink, askEmbed, askPicture } from '../../kit/insert-dialogs.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { LOCKED_LANG, isOpened, placedLink } from '../../kit/locked.ts';
import { OPENED_EVENT, openPlaced } from '../../kit/locked-doc.ts';
import { Rows, type Clip, type RowItem, type RowRange, type RowSpan } from '../../kit/rows.ts';
import type { Sel } from '../../kit/textops.ts';
import type { NoteAt, TextOps, ToText } from '../../kit/text.ts';
import {
  addSlide,
  duplicateSlides,
  isBlank,
  joinHeadline,
  loosen,
  moveSlide,
  removeSlide,
  setHead,
  slideBlocks,
  setIcon,
  setLayout,
  setSub,
  settingsOf,
  slidesOf,
  webBlock,
  type Format,
  type Layout,
  type Settings,
  type Slide,
} from './model.ts';
import { closingPage, emptySlide, geometryOf, layoutSlide, lookOf, pageCount, pageOf, pageSize, sheetsOf, SH, slidePage, slideSteps, subPage, SW, type Look } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/doc-dialog.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/notes.ts';
import '../../kit/text.ts';
import './style.css';
import { qrBlock } from '../../kit/qr-picture.ts';

export const tag = 'to-deck-editor';

/** Which box the bar's text buttons work on. */
type Field = 'title' | 'words' | 'right' | 'notes';
/** Where the selection was when an edit began, handed back to undone(): the slide, and the slides chosen or the caret in a box. */
interface Mark {
  slide: number;
  range?: RowRange<number>;
  field?: Field;
  sel?: Sel | null;
  /** The footnote whose words were typed: an undo puts the caret back in it. */
  note?: number;
}
/** What answers a tap on the live card itself (embeds.ts): its buttons, its links, the thing once loaded. */
const LIVE = 'to-embed button, to-embed a, to-embed iframe, to-embed video, to-embed audio, to-embed img';

/** Two clicks closer together than this are a double click: show the whole slide. */
const FAST = 350;

/** Ops from an editor over a span, moved to where the span sits in the document. */
export function offset(ops: Op[], by: number): Op[] {
  return ops.map((op) => {
    if (op.op === 'head') return op;
    if (op.op === 'move') return { ...op, at: op.at + by, to: op.to + by };
    return { ...op, at: op.at + by };
  });
}

export class ToDeckEditor extends DocElement<Slide[]> {
  static properties = { cur: { state: true }, showing: { state: true }, shown: { state: true }, leaving: { state: true }, noting: { state: true }, sheets: { state: true }, subMenu: { state: true } };
  /** The slide open for editing. */
  declare cur: number;
  /** The slide being presented, -1 when not presenting. */
  declare showing: number;
  /** Reveals made on the slide being presented. */
  declare shown: number;
  /** The slide being left, while the next one arrives over it; -1 otherwise. */
  declare leaving: number;
  /** Speaker notes showing while presenting (N toggles). */
  declare noting: boolean;
  /** A printed format showing the sheets to print rather than its pages. */
  declare sheets: boolean;
  /** The sub-document's menu is open. */
  declare subMenu: boolean;
  /** Presenting began with the deck's show link ("?show"): the way out says "Edit this deck". */
  private fromLink = false;
  /** The selection the editor last reported, and which box it was in. */
  private sel: Sel | null = null;
  private field: Field = 'title';
  private forwards = true;
  private settle = 0;
  private lastClick = 0;
  /** The slide's width in the show over its whole-screen width, 1 to 4: what two fingers set (--deck-zoom). */
  private showZoom = 1;
  /** When two fingers last lifted from the show: the tap a pinch may leave behind turns no slide. */
  private pinched = 0;
  private unpinch: (() => void) | null = null;
  /** Focus asked for after the next draw: the box, and the caret's place in it (or a selection to put back). */
  private focusNext: { field: Field; at: 'start' | 'end' | Sel } | null = null;
  /** A document has been read: a value after it is either ours, the head edited, or another document. */
  private loaded = false;

  /** The slides chosen whole on the rail (kit/rows.ts): a tap on a thumbnail, its grip, Shift+arrows, Select All twice. */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.deck-rail'),
    handle: '.deck-grip',
    fromWords: false,
    current: () => (this.cur < this.slides.length ? this.cur : null),
    // A chosen slide's span runs to the rule after it, so an empty slide (no blocks) is still inside it.
    span: (rows) => ({ from: this.slides[rows[0].id].from, to: this.slides[rows[rows.length - 1].id].to + 1 }),
    edit: (id, offset) => {
      this.go(id);
      this.focusBox('title', offset === 0 ? 'start' : 'end');
    },
    remove: (span) => this.removeRange(span),
    canMove: (span, by) => {
      const [lo, hi] = this.idsOf(span);
      return by < 0 ? lo > 0 : hi + 1 < this.count;
    },
    move: (span, by) => this.moveRange(span, by),
    duplicate: (span) => this.duplicateRange(span),
    copy: (span) => this.copyRange(span),
    paste: (data, span) => this.pasteSlides(data, span ? this.idsOf(span)[1] : this.cur),
    drop: (id, to) => this.dropSlide(id, to),
    label: t('Chosen slides'),
    contextClass: 'deck-context',
  });

  constructor() {
    super();
    this.cur = 0;
    this.showing = -1;
    this.shown = 0;
    this.leaving = -1;
    // Under a finger the notes start hidden: a phone's screen is the slide's (Paul, 2026-10-10: the notes superimposed); the show's Notes button and N show them.
    this.noting = !coarse();
    this.sheets = false;
    this.subMenu = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    // After the rows controller's own (added as the element connects): what it answers is not answered again.
    this.addEventListener('keydown', this.onEditKey);
    this.addEventListener('text-escape', this.onTextEscape);
    this.addEventListener('text-selectall', this.onSelectAll);
    window.addEventListener('keydown', this.onShowKey);
    window.addEventListener(OPENED_EVENT, this.onOpened);
    // The show is a picture to two fingers (Paul, 2026-10-11: "I should be able to pinch zoom where appropriate in view
    // modes too"): the slide zooms in place about the fingers, kept in quarters when they lift, and the show scrolls.
    const zoomTo = (z: number) => {
      this.showZoom = Math.min(4, Math.max(1, z));
      this.querySelector<HTMLElement>('.deck-show')?.style.setProperty('--deck-zoom', String(this.showZoom));
    };
    this.unpinch = pinchZoom(this, {
      frame: () => this.querySelector<HTMLElement>('.deck-show[data-spatial]'),
      picture: () => this.querySelector('.deck-show > .frame'),
      zoom: () => this.showZoom,
      start: () => (this.pinched = Infinity),
      set: zoomTo,
      end: (z) => {
        zoomTo(Math.round(z * 4) / 4);
        this.pinched = performance.now();
      },
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onEditKey);
    this.removeEventListener('text-escape', this.onTextEscape);
    this.removeEventListener('text-selectall', this.onSelectAll);
    window.removeEventListener('keydown', this.onShowKey);
    window.removeEventListener(OPENED_EVENT, this.onOpened);
    this.unpinch?.();
    this.unpinch = null;
    clearTimeout(this.settle);
  }
  protected read(doc: Doc): Slide[] {
    return slidesOf(doc);
  }

  /* ---------- the document ---------- */

  get slides(): Slide[] {
    return this.view ?? slidesOf(this.doc);
  }
  get settings(): Settings {
    return settingsOf(this.doc);
  }
  /** How many pages there are to edit: the slides written, or the format's count. */
  get count(): number {
    return Math.max(1, pageCount(this.doc, this.settings, this.slides.length));
  }
  /** The current slide; past what is written, an empty one at the document's end. */
  get slide(): Slide {
    return this.slides[this.cur] ?? emptySlide(this.doc.blocks.length);
  }
  text(field: Field): ToText | null {
    return this.querySelector<ToText>(`to-text.deck-${field}`);
  }
  /** The box last typed in, for the bar's buttons. */
  get current(): ToText | null {
    return this.text(this.field) ?? this.text('words') ?? this.text('title');
  }
  /** The spans of blocks each box owns, cut once per document and slide: the same arrays on every draw, so <to-text> redraws only what changed. */
  private spans: { doc: Doc; cur: number; title: Block[]; words: Block[]; right: Block[]; notes: Block[] } | null = null;
  private boxes(s: Slide): { title: Block[]; words: Block[]; right: Block[]; notes: Block[] } {
    if (this.spans && this.spans.doc === this.doc && this.spans.cur === this.cur) return this.spans;
    const b = this.doc.blocks;
    const written = this.cur < this.slides.length;
    this.spans = {
      doc: this.doc,
      cur: this.cur,
      // The headline box owns the words alone: the icon is the button beside it (the ops come back joined, see onOps).
      title: written && s.head >= 0 ? [{ ...(b[s.head] as Extract<Block, { k: 'h' }>), runs: s.title }] : [],
      words: written ? b.slice(s.words[0], s.layout === '2' && s.pipe >= 0 ? s.pipe : s.words[1]) : [],
      right: written && s.layout === '2' && s.pipe >= 0 ? b.slice(s.pipe + 1, s.words[1]) : [],
      notes: written ? b.slice(s.notes[0], s.notes[1]) : [],
    };
    return this.spans;
  }

  protected willUpdate(changed: PropertyValues<this>) {
    if (changed.has('value') || !this.loaded) this.take(this.value ?? '');
    super.willUpdate(changed);
    if (this.cur >= this.count) this.cur = this.count - 1;
    // The slide on show follows the slides chosen.
    const r = this.rows.range;
    if (r && r.focus !== this.seenFocus && r.focus < this.count) this.cur = r.focus;
    this.seenFocus = r?.focus ?? null;
  }
  /** The slide the range last reached: the slide on show follows it when it moves, and is free while it stays. */
  private seenFocus: number | null = null;
  /** A value from outside: ours is nothing new; the same blocks with another head is the head edited (undoable); anything else is another document, loosened if written loosely. */
  private take(text: string) {
    if (this.loaded && (this.ours(text) || text === write(this.doc))) return;
    const parsed = parse(text);
    if (this.loaded && parsed.blocks.length === this.doc.blocks.length && write({ head: {}, blocks: parsed.blocks }) === write({ head: {}, blocks: this.doc.blocks })) {
      const keys = new Set([...Object.keys(this.doc.head), ...Object.keys(parsed.head)]);
      this.edit([...keys].filter((k) => this.doc.head[k] !== parsed.head[k]).map((key): Op => ({ op: 'head', key, value: parsed.head[key] })));
      return;
    }
    if (this.loaded) this.cur = 0;
    this.loaded = true;
    const next = loosen(parsed);
    if (next === parsed) return;
    this.value = write(next);
    this.dispatchEvent(new CustomEvent<string>('docchange', { detail: this.value, bubbles: true }));
  }
  /** Where the selection is now, for an edit to carry to its undo. */
  private mark(): Mark {
    const r = this.rows.range;
    return r ? { slide: this.cur, range: { ...r } } : { slide: this.cur, field: this.field, sel: this.sel };
  }
  /** Ops from anywhere: applied, recorded with where the selection was, the shell told. */
  change(ops: Op[], key?: string, mark: Mark = this.mark()) {
    this.edit(ops, key, mark);
  }
  /** After an undo or a redo: the slide it changed shown, and the slides chosen or the caret put back as they were. */
  protected undone(entry: Entry) {
    const m = entry.mark as Mark | undefined;
    const at = firstAt(entry);
    if (!m && at < 0) return;
    const slide = m ? m.slide : this.slideAt(at);
    this.rows.release();
    this.go(slide);
    if (m?.range) {
      const r = m.range;
      void this.updateComplete.then(() => (r.anchor < this.slides.length && r.focus < this.slides.length ? this.rows.select(r) : undefined));
    } else if (m?.note !== undefined) void this.updateComplete.then(() => this.notesEl?.focusNote(m.note!));
    else if (m?.field && m.sel) this.focusNext = { field: m.field, at: m.sel };
    else this.focusNext = { field: 'title', at: 'end' };
    this.requestUpdate();
  }
  /** The slide holding block `at`. */
  private slideAt(at: number): number {
    const i = this.slides.findIndex((s) => at <= s.to);
    return i < 0 ? this.slides.length - 1 : i;
  }
  /** The rules that make slide i exist, when it is a page past what is written: the ops, and where its (empty) span will sit. */
  private ensure(i: number): { ops: Op[]; start: number } {
    const n = this.slides.length;
    if (i < n) return { ops: [], start: -1 };
    const hrs = Array.from({ length: i - n + 1 }, () => ({ k: 'hr' }) as Block);
    return { ops: [{ op: 'splice', at: this.doc.blocks.length, n: 0, blocks: hrs }], start: this.doc.blocks.length + hrs.length };
  }
  /** Ops from one of the boxes: offset to its span, the first block of an empty span given the kind the box is for. */
  private onOps(field: Field, e: CustomEvent<TextOps>) {
    e.stopPropagation();
    const { ops, before, kind } = e.detail;
    this.boxOps(field, ops, kind ? `type:${this.cur}:${field}` : undefined, { slide: this.cur, field, sel: before });
  }
  /** Ops over one of the boxes' blocks, as the box would send them. */
  private boxOps(field: Field, ops: Op[], key: string | undefined, mark: Mark) {
    const s = this.slide;
    const made = this.ensure(this.cur);
    if (field === 'title') {
      // The headline: the ops are applied to the words alone, and the block put back whole with its icon in front.
      const was = s.head >= 0 ? (this.doc.blocks[s.head] as Extract<Block, { k: 'h' }>) : null;
      const next = applyAll({ head: {}, blocks: this.boxes(s).title }, ops).blocks[0];
      const runs = next && 'runs' in next ? next.runs : [];
      const h: Block = { k: 'h', level: was?.level ?? 2, runs: joinHeadline(s.icon, runs), ...(was?.a ? { a: was.a } : {}) };
      const put: Op = was ? { op: 'splice', at: s.head, n: 1, blocks: [h] } : { op: 'splice', at: made.start >= 0 ? made.start : s.from, n: 0, blocks: [h] };
      this.change([...made.ops, put], key, mark);
      return;
    }
    const start = made.start >= 0 ? made.start : field === 'words' ? s.words[0] : field === 'right' ? s.pipe + 1 : s.notes[0];
    let moved = offset(ops, start);
    const first = moved[0];
    // The editor over an empty span puts a paragraph in first: here it is the block the box is for.
    if (first?.op === 'splice' && first.n === 0 && first.blocks.length === 1 && first.blocks[0].k === 'p' && !first.blocks[0].runs.length)
      moved = [{ ...first, blocks: [this.born(field, s)] }, ...moved.slice(1)];
    this.change([...made.ops, ...moved], key, mark);
  }

  /* ---------- the footnotes, at the slide's foot ---------- */

  /** The slide's footnote marks in order (the headline's, then the words', then the right column's), each with its box. */
  private marks(s: Slide = this.slide): { field: Field; m: NoteMark }[] {
    const b = this.boxes(s);
    const fields: Field[] = s.sub >= 0 ? ['title'] : ['title', 'words', 'right'];
    return fields.flatMap((field) => noteMarks(b[field]).map((m) => ({ field, m })));
  }
  get notesEl(): ToNotes | null {
    return this.querySelector<ToNotes>('to-notes.deck-fn');
  }
  /** A mark tapped in a box, or a footnote just put in: the caret in its note's words at the foot. */
  private onNote(field: Field, e: CustomEvent<NoteAt>) {
    e.stopPropagation();
    const first = this.marks().findIndex((x) => x.field === field && x.m.block === e.detail.block);
    if (first >= 0) void this.updateComplete.then(() => this.notesEl?.focusNote(first + e.detail.nth));
  }
  private onNoteChange = (e: CustomEvent<{ nth: number; fn: string }>) => {
    const x = this.marks()[e.detail.nth];
    if (!x || x.m.fn === e.detail.fn) return;
    this.boxOps(x.field, [{ op: 'text', at: x.m.block, from: x.m.offset, to: x.m.offset + 1, runs: [{ t: '', fn: e.detail.fn }] }], `note:${this.cur}:${e.detail.nth}`, {
      slide: this.cur,
      note: e.detail.nth,
    });
  };
  /** Back from a note to its box, the caret after the mark. */
  private onNoteBack = (e: CustomEvent<{ nth: number }>) => {
    const x = this.marks()[e.detail.nth];
    if (x) this.focusBox(x.field, { anchor: { block: x.m.block, offset: x.m.offset + 1 }, focus: { block: x.m.block, offset: x.m.offset + 1 } });
  };
  /** A note left empty: its mark goes (the caret where it was, when the note was left for the words). */
  private onNoteRemove = (e: CustomEvent<{ nth: number; back: boolean }>) => {
    const x = this.marks()[e.detail.nth];
    if (!x) return;
    const at = { block: x.m.block, offset: x.m.offset };
    this.boxOps(x.field, [{ op: 'text', at: x.m.block, from: x.m.offset, to: x.m.offset + 1, runs: [] }], undefined, { slide: this.cur, field: x.field, sel: { anchor: at, focus: at } });
    if (e.detail.back) this.focusBox(x.field, { anchor: at, focus: at });
  };
  /** The block an empty box's first words make: a headline, a bullet (prose on a printed page), a note. */
  private born(field: Field, s: Slide): Block {
    if (field === 'title') return { k: 'h', level: 2, runs: [] };
    if (field === 'notes') return { k: 'quote', runs: [] };
    const prose = !!this.settings.format && this.settings.format !== 'comic' && !s.layout;
    return prose ? { k: 'p', runs: [] } : { k: 'li', depth: 0, runs: [] };
  }
  /** A box's selection, for the bar's pressed states (the box itself is known from its focus). */
  private onSelect(field: Field, e: CustomEvent<Sel | null>) {
    e.stopPropagation();
    if (e.detail) this.field = field;
    this.sel = e.detail;
    const box = this.sel ? this.current : null;
    if (this.selectionMoved(`${this.field} ${!!box} ${box?.kind} ${JSON.stringify(box?.marks ?? {})}`)) this.requestUpdate();
  }
  /** Where a person starts: the first slide, the caret at the end of its headline. */
  focusFirst() {
    this.go(0);
    this.focusBox('title', 'end');
  }
  /** The caret into a box: at its start, its end, or a selection. */
  focusBox(field: Field, at: 'start' | 'end' | Sel = 'end') {
    this.focusNext = { field, at };
    this.requestUpdate();
  }
  private placeFocus() {
    const f = this.focusNext;
    if (!f) return;
    this.focusNext = null;
    const box = this.text(f.field);
    if (!box) return;
    const model = box.model;
    const last = model.length - 1;
    const len = (b: Block) => ('runs' in b ? b.runs.reduce((n, r) => n + (r.ic || r.fn !== undefined ? 1 : r.t.length), 0) : 0);
    if (typeof f.at === 'object') box.sel = f.at;
    else {
      const pos = f.at === 'start' ? { block: 0, offset: 0 } : { block: last, offset: len(model[last]) };
      box.sel = { anchor: pos, focus: pos };
    }
    box.focus({ preventScroll: true });
  }

  /* ---------- slides ---------- */

  go(i: number) {
    this.cur = Math.max(0, Math.min(this.count - 1, i));
    this.sheets = false;
  }
  /** A new slide after this one, of a layout, opened with the caret in its headline. */
  newSlide(layout: Layout = '', blocks?: Block[]) {
    const g = geometryOf(this.settings.format);
    if (g?.grow && this.count >= g.grow) return;
    const made = this.ensure(this.cur);
    const doc = applyAll(this.doc, made.ops);
    const added = addSlide(doc, this.cur, layout, blocks);
    this.change([...made.ops, ...added.ops]);
    this.cur = added.at;
    this.focusBox('title');
  }
  deleteSlide() {
    if (this.cur >= this.slides.length) return;
    this.change(removeSlide(this.doc, this.cur));
    this.cur = Math.max(0, Math.min(this.cur, this.count - 1));
  }
  move(by: 1 | -1) {
    const j = this.cur + by;
    if (j < 0 || j >= this.count) return;
    // Moving against a page not yet written: the rules are written first, so that both exist.
    const made = this.ensure(Math.max(j, this.cur));
    const doc = applyAll(this.doc, made.ops);
    this.change([...made.ops, ...moveSlide(doc, this.cur, j)]);
    this.cur = j;
  }
  /* ---------- slides chosen whole (kit/rows.ts) ---------- */

  /** The thumbnails of the slides written, as the rows controller takes them: each with the blocks of its slide. */
  private rowItems(): RowItem<number>[] {
    const els = this.querySelectorAll<HTMLElement>('.deck-slot');
    const out: RowItem<number>[] = [];
    this.slides.forEach((s, i) => els[i] && out.push({ id: i, el: els[i], span: { from: s.from, to: s.to } }));
    return out;
  }
  /** The first and last slides a span covers. */
  private idsOf(span: RowSpan): [number, number] {
    const ids = this.slides.flatMap((s, i) => (s.from >= span.from && s.from < span.to ? [i] : []));
    return [ids[0] ?? this.cur, ids[ids.length - 1] ?? this.cur];
  }
  /** The chosen slides taken out; the focus on the thumbnail of the slide now in their place. */
  private removeRange(span: RowSpan) {
    const [lo, hi] = this.idsOf(span);
    this.change(removeSlide(this.doc, lo, hi));
    this.cur = Math.max(0, Math.min(lo, this.count - 1));
    void this.updateComplete.then(() => this.querySelectorAll<HTMLElement>('.deck-thumb')[this.cur]?.focus({ preventScroll: true }));
  }
  /** The chosen slides past the slide before them or after them; they stay chosen. */
  private moveRange(span: RowSpan, by: 1 | -1): RowRange<number> | null {
    const [lo, hi] = this.idsOf(span);
    const r = this.rows.range;
    if (by < 0 ? lo === 0 : hi + 1 >= this.count) return null;
    // Moving against a page not yet written: the rules are written first, so that both exist.
    const made = this.ensure(hi + 1);
    const doc = applyAll(this.doc, made.ops);
    this.change([...made.ops, ...(by < 0 ? moveSlide(doc, lo - 1, hi) : moveSlide(doc, hi + 1, lo))]);
    this.cur += by;
    return r ? { anchor: r.anchor + by, focus: r.focus + by } : { anchor: lo + by, focus: hi + by };
  }
  /** The chosen slides again, right after them; the copies are chosen. */
  private duplicateRange(span: RowSpan): RowRange<number> | null {
    const [lo, hi] = this.idsOf(span);
    const d = duplicateSlides(this.doc, lo, hi);
    if (!d.ops.length) return null;
    this.change(d.ops);
    return { anchor: d.at, focus: d.at + hi - lo };
  }
  /** Mod+D with the caret in a slide's words: the slide again after it, the caret in the copy's headline. */
  duplicateSlide() {
    if (this.cur >= this.slides.length) return;
    const d = duplicateSlides(this.doc, this.cur);
    this.change(d.ops);
    this.cur = d.at;
    this.focusBox('title');
  }
  /** What chosen slides put on the clipboard: their blocks as TLO, the rules between them kept, and as HTML with our marker. */
  private copyRange(span: RowSpan): Clip {
    const [lo, hi] = this.idsOf(span);
    const blocks = slideBlocks(this.doc, lo, hi);
    return { text: write({ head: {}, blocks }), html: docToHtml(blocks) };
  }
  /** Slides pasted after slide `after`: our own copy comes back as the slides it was; anything else is read as a slide's blocks (a line of words, its headline). */
  private pasteSlides(data: Clip, after: number) {
    const got = pasteFrom(data, 'doc');
    if (!got) return;
    const blocks: Block[] = 'runs' in got ? [{ k: 'h', level: 2, runs: got.runs }] : got.blocks;
    if (!blocks.length) return;
    const made = this.ensure(after);
    const doc = applyAll(this.doc, made.ops);
    const added = addSlide(doc, after, '', blocks);
    this.change([...made.ops, ...added.ops]);
    this.cur = added.at;
  }
  /** A slide dragged by its grip and let go over another: it comes after that one. */
  private dropSlide(id: number, to: number) {
    const j = id < to ? to : to + 1;
    if (j === id) return;
    this.change(moveSlide(this.doc, id, j));
    this.cur = j;
  }

  /** The current slide, made to exist first: the ops that make it, and the slide as it then is. */
  private existing(): { ops: Op[]; doc: Doc; s: Slide } {
    const made = this.ensure(this.cur);
    const doc = applyAll(this.doc, made.ops);
    return { ops: made.ops, doc, s: made.start >= 0 ? emptySlide(made.start) : this.slide };
  }
  setLayout(layout: Layout) {
    const { ops, doc, s } = this.existing();
    this.change([...ops, ...setLayout(doc, s, layout)]);
  }
  /** The slide's icon, from the library, its own words suggesting; the deck's icon colour is in the Look menu. */
  async pickIcon() {
    const s = this.slide;
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const { suggestIcons } = await import('../../kit/icons-search.ts');
    const name = await chooseIcon({
      emoji: false,
      current: s.icon,
      none: true,
      suggested: suggestIcons(
        plainText(s.title),
        s.items.map((it) => plainText(it.runs)),
      ),
    });
    if (name === null) return;
    const made = this.existing();
    this.change([...made.ops, ...setIcon(made.doc, made.s, name)]);
  }
  /** Another document on the slide: on this one if it has nothing on it, else on a new slide after it. */
  private putSub(block: Block) {
    const s = this.slide;
    const blank = this.cur >= this.slides.length || (s.sub < 0 && !s.items.length && !s.right.length && !plainText(s.title).trim() && !s.icon);
    if (!blank) return this.newSlide('', [block]);
    const made = this.existing();
    this.change([...made.ops, ...setSub(made.s, block)]);
  }
  private subItems(): MenuItem[] {
    const s = this.slide;
    const b = s.sub >= 0 ? this.doc.blocks[s.sub] : null;
    if (!b) return [];
    const here = `${location.origin}${location.pathname}`;
    const remove = { label: t('Remove from the slide'), icon: UI.trash, does: () => this.change(setSub(s, null)) };
    if (b.k === 'fence' && b.lang) {
      const known = !!lookup.appOf(b.lang);
      return [
        ...(known ? [{ label: t('Edit'), icon: UI.pen, does: () => void this.editSub() }] : []),
        { label: t('Open in a new tab'), icon: UI.open, does: () => void window.open(placedLink(b.lang, b.body, encodeDoc, here), '_blank', 'noopener') },
        remove,
      ];
    }
    if (b.k === 'table') return [{ label: t('Edit'), icon: UI.pen, does: () => void this.editSub() }, remove];
    return [
      {
        label: t('Change the address…'),
        icon: UI.pen,
        does: async () => {
          if (b.k === 'img') {
            const pic = await askPicture({ url: b.url, alt: b.alt });
            if (pic) this.change(setSub(this.slide, { ...b, url: pic.url, alt: pic.alt }));
          } else {
            const web = webOf(b);
            const url = await askEmbed(web?.url ?? '');
            // A new address keeps the title its author gave the old one.
            if (url) this.change(setSub(this.slide, webBlock(url, web?.title)));
          }
        },
      },
      remove,
    ];
  }
  /** The document or table on the slide, edited in its app in the dialog: Done writes it back as one step. */
  private async editSub() {
    const s = this.slide;
    const b = s.sub >= 0 ? this.doc.blocks[s.sub] : null;
    let next: Block | null = null;
    if (b?.k === 'table') next = await editTable(b);
    else if (b?.k === 'fence' && b.lang) next = await editFence(b);
    if (next && this.doc.blocks[s.sub] === b) this.change(setSub(this.slide, next));
    void this.updateComplete.then(() => this.querySelector<HTMLElement>('.deck-sub')?.focus({ preventScroll: true }));
  }
  /** A locked document opened (here or in another card): the slide draws it. */
  private onOpened = () => this.requestUpdate();
  private openSubMenu = (e: Event) => {
    // The live card's own controls (load, open on the provider, the frame) are its own, not the menu's.
    if ((e.target as Element).closest?.(LIVE)) return;
    // A locked document not yet opened: a tap asks for its password (kit/locked-doc.ts); opened, the menu.
    const b = this.slide.sub >= 0 ? this.doc.blocks[this.slide.sub] : null;
    if (b?.k === 'fence' && b.lang === LOCKED_LANG && !isOpened(b.body)) return void openPlaced(b.body);
    this.subMenu = true;
    const card = e.currentTarget as HTMLElement;
    void this.updateComplete.then(async () => {
      const menu = this.querySelector<ToMenu>('to-menu.deck-submenu');
      if (!menu) return;
      await menu.updateComplete;
      menu.openAt(card);
    });
  };

  /* ---------- putting things on the slide ---------- */

  async insertPicture() {
    const pic = await askPicture();
    if (pic) this.putSub({ k: 'img', alt: pic.alt, url: pic.url });
  }
  async insertWeb() {
    const url = await askEmbed();
    if (url) this.putSub(linkToFence(url) ?? webBlock(url));
  }
  async insertDocument() {
    const fence = await askDocLink();
    if (fence) this.putSub(fence);
  }
  /** A table, three by three, made in the Spreadsheet in the dialog; Cancel puts it on blank. */
  async insertTable() {
    const blank = newTable();
    this.putSub((await editTable(blank)) ?? blank);
  }
  /** A new document of another app, made in its own editor in the dialog: Done puts it on the slide, Cancel puts nothing. */
  async insertApp(id: string) {
    const fence = await makeDoc(id);
    if (fence) this.putSub(fence);
  }
  /** Insert ▾'s QR code of this document, on the slide. */
  insertQr() {
    this.putSub(qrBlock());
  }
  /** Four more pages, in a format that grows by sheets. */
  morePages() {
    const g = geometryOf(this.settings.format);
    if (g?.grow) this.change(setHead('pages', String(Math.min(g.grow, this.count + (g.by ?? 4)))));
  }

  /* ---------- the menus ---------- */

  setFormat(format: Format) {
    this.change([...setHead('format', format), ...setHead('sides', ''), ...setHead('pages', '')]);
    this.sheets = false;
  }

  /* ---------- presenting ---------- */

  /** The closing code, drawn from the deck as it stands. */
  private get end() {
    return closingPage(this.value || write(this.doc), this.doc, this.settings);
  }
  private total(): number {
    return this.slides.length + (this.end ? 1 : 0);
  }
  steps(i = this.showing): number {
    return i < this.slides.length ? slideSteps(this.slides[i], this.doc) : 0;
  }
  show(i: number, shown = 0) {
    clearTimeout(this.settle);
    this.leaving = i >= 0 && this.showing >= 0 && i !== this.showing ? this.showing : -1;
    this.forwards = i >= this.showing;
    if (this.leaving >= 0) this.settle = window.setTimeout(() => (this.leaving = -1), 650);
    const was = this.showing;
    if (i < 0) this.fromLink = false;
    this.showing = i;
    this.shown = shown;
    // Each slide arrives whole: a zoom is the slide's it was set on.
    if (i !== was) {
      this.showZoom = 1;
      this.querySelector<HTMLElement>('.deck-show')?.style.removeProperty('--deck-zoom');
    }
    // Into the show, the focus goes with it: no key reaches the box behind.
    if (i >= 0 && was < 0) {
      this.rows.release();
      void this.updateComplete.then(() => this.querySelector<HTMLElement>('.deck-show')?.focus({ preventScroll: true }));
    }
    // Out of the show, the focus comes back to the button that began it.
    if (i < 0 && was >= 0) void this.updateComplete.then(() => this.querySelector<HTMLButtonElement>('button.deck-present')?.focus({ preventScroll: true }));
  }
  /** Present from the first slide: what a show link ("…?show", kit/route.ts) asks of the deck on arrival. */
  present(fromLink = false) {
    this.fromLink = fromLink;
    if (this.slides.length) this.show(0);
  }
  forward() {
    if (this.shown < this.steps()) this.shown++;
    else if (this.showing + 1 < this.total()) this.show(this.showing + 1);
    else this.show(-1);
  }
  back() {
    if (this.shown > 0) this.shown--;
    else if (this.showing > 0) this.show(this.showing - 1, this.steps(this.showing - 1));
  }
  private onShowClick = (e: Event) => {
    // A tap on the live card's controls is the card's; a tap anywhere else turns the slide.
    if ((e.target as Element).closest?.(LIVE)) return;
    const now = performance.now();
    // Two fingers zoom; they never turn a slide, nor does a tap they leave as they lift.
    if (now - this.pinched < 300) return;
    // A fast second click means "just show me the slide".
    if (now - this.lastClick < FAST) this.shown = this.steps();
    else this.forward();
    this.lastClick = now;
  };
  /** While presenting, the keys are the show's (commands.ts SHOW): nothing reaches the boxes behind it. */
  private onShowKey = (e: KeyboardEvent) => {
    if (!this.isConnected || this.showing < 0) return;
    // Enter or Space on the live card's button loads the thing; the arrows still turn the slide.
    if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element).closest?.('.deck-live')) return;
    if (runKey(e, SHOW, this)) return;
    if (e.key.length === 1 && !(e.metaKey || e.ctrlKey)) e.preventDefault();
  };
  /**
   * The editor's own keys, after the boxes and the rows controller have had theirs: Mod+Shift+Enter a new slide
   * (in every format), Mod+Alt+Enter present, Mod+Enter in the headline on to the words (a line's "done"), Mod+D
   * the slide again, Alt+Up/Down in the headline the slide past its neighbour (the caret stays). Never from a
   * dialog, a popover, a field or a bar button.
   */
  private onEditKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || this.showing >= 0) return;
    const el = e.target as HTMLElement;
    if (el.closest?.('dialog, [popover], input, textarea, select, to-bar, to-context, .deck-show')) return;
    if (this.rows.range && !el.closest?.('to-text')) return;
    runKey(e, EDIT, this);
  };
  /** Whether a key was typed in the headline. */
  private inTitle(e?: Event): boolean {
    return !!(e?.target as HTMLElement | null)?.closest?.('to-text')?.classList.contains('deck-title');
  }
  /** Move slide up or down: from the bar; from the keys only in the headline (the slide past its neighbour, the caret staying). */
  moveKey(by: 1 | -1, e?: Event): boolean | void {
    if (!(e instanceof KeyboardEvent)) return this.move(by);
    if (!this.inTitle(e)) return false;
    const sel = this.text('title')?.sel ?? null;
    if (this.cur + by < 0 || this.cur + by >= this.count) return false;
    this.move(by);
    this.focusNext = { field: 'title', at: sel ?? 'end' };
  }
  /** Mod+Enter in the headline: on to the words (a line's "done"). */
  ontoWords(e?: Event): boolean | void {
    if (!this.inTitle(e)) return false;
    this.focusBox(this.slide.sub >= 0 ? 'notes' : 'words', 'start');
  }
  /** Mod+D in the words or on the slide: the slide again. */
  duplicateKey(e?: Event): boolean | void {
    const el = e?.target as HTMLElement | null;
    if (!el?.closest?.('to-text') && !el?.closest?.('.deck-canvas')) return false;
    this.duplicateSlide();
  }
  /** PageUp and PageDown on the rail (not in a box): the slide before or after. */
  railStep(e?: Event): boolean | void {
    if (!(e instanceof KeyboardEvent) || !(e.target as HTMLElement).closest?.('.deck-rail')) return false;
    this.rows.release();
    this.go(this.cur + (e.key === 'PageDown' ? 1 : -1));
    void this.updateComplete.then(() => this.querySelectorAll<HTMLElement>('.deck-thumb')[this.cur]?.focus({ preventScroll: true }));
  }
  /** Escape in a box, once it has closed its boxes and collapsed its words: out of the words, the slide chosen on the rail. */
  private onTextEscape = (e: Event) => {
    if (e.defaultPrevented || this.cur >= this.slides.length) return;
    e.preventDefault();
    this.rows.choose(this.cur);
  };
  /** Select All with a box already whole: every slide. */
  private onSelectAll = (e: Event) => {
    e.stopPropagation();
    this.rows.selectAll();
  };
  /** A thumbnail tapped: its slide on show, and chosen (Shift extends). */
  private onThumb(i: number, e: MouseEvent) {
    this.go(i);
    if (i < this.slides.length) this.rows.choose(i, e.shiftKey);
  }
  /** Keys on the rail: PageUp/PageDown change slides; on a thumbnail, Enter edits its words, and the keys that act on a chosen slide choose it first (the rows controller then answers them). */
  private onRailKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const mod = e.metaKey || e.ctrlKey;
    if (
      runKey(
        e,
        EDIT.filter((c) => c.id === 'deck.rail'),
        this,
      )
    )
      return;
    const thumb = (e.target as HTMLElement).closest?.<HTMLElement>('.deck-thumb');
    if (!thumb || this.rows.range) return;
    const i = Number(thumb.dataset.i);
    if (e.key === 'Enter' && !mod && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      this.go(i);
      this.focusBox('title');
      return;
    }
    if (i >= this.slides.length) return;
    const k = e.key.toLowerCase();
    const vertical = e.key === 'ArrowUp' || e.key === 'ArrowDown';
    const takes = e.key === 'Delete' || e.key === 'Backspace' || (vertical && (e.altKey || e.shiftKey) && !mod) || (mod && !e.altKey && ['a', 'c', 'd', 'v', 'x'].includes(k));
    if (takes) this.rows.choose(i);
  };
  /** The headline's edges: Backspace at the start of an empty slide takes the slide away (the caret to the end of the one before); Delete at its end goes on to the words. */
  private onTitleExit(e: CustomEvent<{ dir: 'back' | 'forward' }>) {
    e.stopPropagation();
    const s = this.slide;
    if (e.detail.dir === 'forward') return this.focusBox(s.sub >= 0 ? 'notes' : 'words', 'start');
    if (this.cur === 0 || this.cur >= this.slides.length || !isBlank(s) || s.layout) return;
    this.change(removeSlide(this.doc, this.cur));
    this.go(this.cur - 1);
    this.focusBox(this.slide.sub >= 0 ? 'title' : 'words', 'end');
  }
  /** A lone web address pasted into empty words: the thing from the web on the slide, as Insert ▾ would put it. */
  private onWordsPaste = {
    capture: true,
    handleEvent: (e: ClipboardEvent) => {
      const text = (e.clipboardData?.getData('text/plain') ?? '').trim();
      const box = this.text('words');
      if (!/^https?:\/\/\S+$/.test(text) || !box || box.model.some((b) => 'runs' in b && plainText(b.runs).trim())) return;
      e.preventDefault();
      e.stopPropagation();
      const made = this.existing();
      this.change([...made.ops, ...setSub(made.s, linkToFence(text) ?? webBlock(text))]);
    },
  };
  /** Delete or Backspace on the document on the slide takes it off; Enter or Space opens its menu. */
  private onSubKey = (e: KeyboardEvent) => {
    // A key on the live card's button is the button's.
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.openSubMenu(e);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.change(setSub(this.slide, null));
      this.focusBox('title');
    }
  };

  /* ---------- drawing ---------- */

  /** The thing from the web a slide shows, if it shows one: its address and its author's title. */
  private webOn(s: Slide | undefined): { url: string; title: string } | null {
    const b = s && s.sub >= 0 ? this.doc.blocks[s.sub] : undefined;
    return b ? webOf(b) : null;
  }
  /** In the show, the live card over the card the slide draws, in the same box: a tap loads it, a tap elsewhere turns the slide. */
  private renderLive(s: Slide | undefined) {
    const web = this.webOn(s);
    if (!web || !s) return nothing;
    const box = layoutSlide(s).sub!;
    const pc = (n: number, of: number) => `${Math.round((n / of) * 10000) / 100}%`;
    return html`<div class="deck-live" style=${`left:${pc(box.x, SW)};top:${pc(box.y, SH)};width:${pc(box.w, SW)};height:${pc(box.h, SH)}`}><to-embed url=${web.url} alt=${web.title}></to-embed></div>`;
  }

  /** The theme as the canvas wears it: its colours, the sizes the layout chose (in the canvas's own width), and its decoration as the background. */
  private canvasStyle(s: Slide, look: Look, size: { w: number; h: number }): string {
    const loud = this.settings.format === 'poster' ? 2 : this.settings.format && s.layout === 't' ? 1.6 : 1;
    const L = layoutSlide(s, { w: size.w, h: size.h, loud });
    const T = look.theme;
    const deco =
      look.themed && T.deco
        ? `--deck-deco:url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="none">${T.deco}</svg>`)}");`
        : '';
    const colours = look.themed ? `--deck-paper:${T.paper};--deck-ink:${T.ink};--deck-muted:${T.muted};--deck-accent:${T.accent};` : '';
    const px = (n: number) => `${Math.round((n / size.w) * 10000) / 100}cqw`;
    return `--deck-w:${size.w};--deck-h:${size.h};--deck-title:${px(L.titlePx || 40)};--deck-body:${px(L.bodyPx || 20)};--deck-icon:${look.icon};${colours}${deco}`;
  }
  private renderCanvas(s: Slide, look: Look) {
    const st = this.settings;
    const g = geometryOf(st.format);
    const size = pageSize(st);
    const n = this.count;
    const { title: titleBlocks, words: wordsBlocks, right: rightBlocks, notes: noteBlocks } = this.boxes(s);
    const marks = this.marks(s);
    const titleNotes = marks.filter((x) => x.field === 'title').length;
    const leftNotes = marks.filter((x) => x.field === 'words').length;
    const notes = marks.map((x) => x.m.fn);
    const sub = s.sub >= 0 ? subPage(this.doc, s, undefined, true) : null;
    // A thing from the web is the live card (kit/embeds.ts), the Word Processor's: nothing asked of its provider until it is tapped.
    const web = this.webOn(s);
    const prose = !!st.format && st.format !== 'comic' && !s.layout;
    const wordsHint =
      st.format === 'comic'
        ? t('A panel a line: what is said | the caption. Icon gives it a picture.')
        : prose
          ? t('What this page says. The type shrinks to fit the page.')
          : s.layout === 't'
            ? t('A line or two under the title')
            : t('One bullet a line. Tab steps it in.');
    const foot = g ? g.name(this.cur, n) : t('{n} / {total}', { n: this.cur + 1, total: n });
    const pickLabel = s.icon ? t('Change the icon') : t('Add an icon');
    const pick = html`<button type="button" class="deck-pick ${s.icon ? '' : 'empty'}" aria-label=${pickLabel} title=${pickLabel} @click=${() => void this.pickIcon()}>${s.icon && iconNamed(s.icon) ? icon(iconNamed(s.icon)!, 32) : icon(UI.icon, 20)}</button>`;
    return html`<div class="deck-canvas lay-${s.layout || 'b'} ${look.themed ? 'themed' : ''} ${look.theme.dark ? 'dark' : ''} ${sub ? 'has-sub' : ''} ${prose ? 'prose' : ''}" style=${this.canvasStyle(s, look, size)} data-format=${st.format || 'deck'}>
        <div class="deck-head">
          ${s.layout === 'i' ? nothing : pick}
          <to-text class="deck-title" shape="line" notes .blocks=${titleBlocks} label=${t('Headline')} placeholder=${s.layout === 't' || (g && this.cur === 0) ? t('Title') : t('Headline')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('title', e)} @focusin=${() => (this.field = 'title')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('title', e)} @text-enter=${() => this.focusBox(sub ? 'notes' : 'words', 'start')} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => this.onTitleExit(e)} @text-note=${(e: CustomEvent<NoteAt>) => this.onNote('title', e)}></to-text>
        </div>
        ${
          sub
            ? html`<figure class="deck-sub ${web ? 'web' : ''}" tabindex="0" role="group" aria-label=${sub.alt || t('A document on the slide')} @click=${this.openSubMenu} @keydown=${this.onSubKey}>
              ${web ? html`<to-embed url=${web.url} alt=${web.title}></to-embed>` : html`<svg viewBox="0 0 ${sub.w} ${sub.h}" aria-hidden="true">${unsafeSVG(gateSvg(sub.svg))}</svg>`}
            </figure>`
            : html`<div class="deck-words-row">
              <to-text class="deck-words" shape="lines" notes @paste=${this.onWordsPaste} .blocks=${wordsBlocks} note-start=${titleNotes} label=${s.layout === '2' ? t('Left column') : t('Words')} placeholder=${wordsHint} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('words', e)} @focusin=${() => (this.field = 'words')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('words', e)} @text-exit=${() => this.focusBox('title')} @text-note=${(e: CustomEvent<NoteAt>) => this.onNote('words', e)}></to-text>
              ${
                s.layout === '2'
                  ? html`<to-text class="deck-right" shape="lines" notes .blocks=${rightBlocks} note-start=${titleNotes + leftNotes} label=${t('Right column')} placeholder=${t('One bullet a line.')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('right', e)} @focusin=${() => (this.field = 'right')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('right', e)} @text-exit=${() => this.focusBox('words')} @text-note=${(e: CustomEvent<NoteAt>) => this.onNote('right', e)}></to-text>`
                  : s.layout === 'i'
                    ? html`<button type="button" class="deck-big ${s.icon ? '' : 'empty'}" aria-label=${pickLabel} @click=${() => void this.pickIcon()}>${s.icon && iconNamed(s.icon) ? icon(iconNamed(s.icon)!, 120) : html`${icon(UI.icon, 40)}<span>${t('Pick an icon')}</span>`}</button>`
                    : nothing
              }
            </div>`
        }
        ${
          notes.length
            ? html`<to-notes class="deck-fn" role="group" aria-label=${t('Footnotes')} .notes=${notes} @note-change=${this.onNoteChange} @note-back=${this.onNoteBack} @note-remove=${this.onNoteRemove}></to-notes>`
            : nothing
        }
        <span class="deck-num">${foot}</span>
      </div>
      <h3 class="deck-notes-head" id="deck-notes-head">${t('Speaker notes')}</h3>
      <to-text class="deck-notes" shape="lines" .blocks=${noteBlocks} label=${t('Speaker notes')} placeholder=${t('For you when presenting, never on the slide')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps('notes', e)} @focusin=${() => (this.field = 'notes')} @text-select=${(e: CustomEvent<Sel | null>) => this.onSelect('notes', e)} @text-exit=${() => this.focusBox(sub ? 'title' : 'words')}></to-text>`;
  }
  private renderRail(look: Look) {
    const st = this.settings;
    const g = geometryOf(st.format);
    const n = this.count;
    const slides = this.slides;
    const end = g ? null : this.end;
    const d = this.rows.drag;
    // The rail's thumbnails stand still: a deck of ten animations runs no clocks on the side.
    const still: Look = { ...look, still: true };
    return html`<nav class="deck-rail" tabindex="-1" aria-label=${g ? t('Pages') : t('Slides')} @keydown=${this.onRailKey}>
      ${Array.from({ length: n }, (_, i) => {
        const s = slides[i];
        const p = pageOf(this.doc, i, st, slides, still);
        const words = s ? plainText(s.title).trim() || plainText(s.items[0]?.runs ?? []).trim() : '';
        const name = (g ? g.name(i, n) : t('Slide {n}', { n: i + 1 })) + (words ? `: ${words}` : '');
        const ranged = !!s && this.rows.has(i);
        return html`<div class="deck-slot ${ranged ? 'ranged' : ''} ${d?.id === i ? 'dragging' : ''}">
          <button type="button" class="deck-thumb" data-i=${i} aria-label=${name} aria-current=${i === this.cur ? 'true' : 'false'} aria-pressed=${s ? String(ranged) : nothing} @click=${(e: MouseEvent) => this.onThumb(i, e)} @dblclick=${() => (this.rows.release(), this.go(i), this.focusBox('title'))}><span class="n">${i + 1}</span><svg viewBox="0 0 ${p.w} ${p.h}" aria-hidden="true">${unsafeSVG(gateSvg(p.svg, true))}</svg></button>
          ${s ? html`<button type="button" class="deck-grip to-rows-handle" tabindex="-1" aria-label=${t('Move this slide: drag it onto another')} title=${t('Drag to move')}>${icon(GripVertical, 14)}</button>` : nothing}
        </div>`;
      })}
      ${end ? html`<div class="deck-end" role="img" aria-label=${t('Last slide, added for you: a QR code of this whole deck')} title=${t('Ends with a QR code of this deck, so the room can take it home. The QR button turns it off.')}>${icon(UI.qr, 28)}<span>${t('QR code of this deck')}</span></div>` : nothing}
    </nav>`;
  }
  private renderSheets() {
    const st = this.settings;
    const g = geometryOf(st.format)!;
    return html`<div class="deck-sheets">
      <p class="to-hint">${g.how(st.two)}</p>
      ${sheetsOf(this.doc, st).map((p, i) => html`<div class="deck-sheet">${unsafeSVG(gateSvg(pageSvg(p, `role="img" aria-label="${t('Sheet, side {n}', { n: i + 1 })}"`)))}</div>`)}
    </div>`;
  }
  private renderShow(look: Look) {
    const slides = this.slides;
    const end = this.end;
    const total = slides.length + (end ? 1 : 0);
    const page = (i: number, shown = Infinity) => (i < slides.length ? slidePage(this.doc, slides[i], look, shown) : end!);
    const p = page(this.showing, this.shown);
    const s = slides[this.showing];
    const motion = `tr-${this.settings.transition || 'fade'} ${this.forwards ? '' : 'back'}`;
    return html`<div class="deck-show" data-spatial role="dialog" aria-modal="true" tabindex="-1" aria-label=${t('Presentation')} @click=${this.onShowClick}>
      ${this.leaving >= 0 && this.leaving < total ? keyed(this.leaving, html`<div class="was ${motion}" aria-hidden="true"><svg viewBox="0 0 ${SW} ${SH}">${unsafeSVG(gateSvg(page(this.leaving).svg))}</svg></div>`) : nothing}
      ${keyed(this.showing, html`<div class="frame ${motion}"><svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label=${p.alt || ''}>${unsafeSVG(gateSvg(p.svg))}</svg>${this.renderLive(s)}</div>`)}
      <p class="sr-only" aria-live="polite">${t('Slide {n} of {total}', { n: this.showing + 1, total })}: ${p.alt ?? ''}</p>
      <div class="ctl" role="group" aria-label=${t('Presentation')} @click=${(e: Event) => e.stopPropagation()}>
        ${tool({ label: t('Previous'), icon: ChevronUp, disabled: this.showing === 0 && this.shown === 0, does: () => this.back() })}
        ${tool({ label: t('Next'), icon: ChevronDown, does: () => this.forward() })}
        ${s?.noteLines.length ? tool({ label: t('Notes'), icon: StickyNote, keys: 'N', pressed: this.noting, does: () => (this.noting = !this.noting) }) : nothing}
        ${tool({ label: this.fromLink ? t('Edit this deck') : t('Stop presenting'), icon: UI.close, keys: 'Esc', does: () => this.show(-1) })}
      </div>
      <span class="pos">${this.showing + 1} / ${total}</span>
      ${s?.noteLines.length && this.noting ? html`<div class="notes" @click=${(e: Event) => e.stopPropagation()}><b>${t('Notes')}</b> ${s.noteLines.map((ln) => html`<p>${ln}</p>`)}${coarse() ? nothing : html`<small>${t('N hides them')}</small>`}</div>` : nothing}
    </div>`;
  }

  render() {
    const st = this.settings;
    const look = lookOf(st);
    const g = geometryOf(st.format);
    const s = this.slide;
    const box = this.sel ? this.current : null;
    const canIndent = this.field !== 'title' && box?.kind === 'ul';
    const size = pageSize(st);
    const own = (id: string) => COMMANDS.find((c) => c.id === `deck.${id}`)!;
    const x = this.current;
    return html`<to-bar class="deck-bar">
        <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
        ${g ? cmdTool(own('sheets'), this, { cls: 'deck-present' }) : cmdTool(own('present'), this, { cls: 'deck-present' })}
        ${[BOLD, ITALIC, UNDERLINE, STRIKE, HIGHLIGHT, LINK].map((c) => cmdTool(c, x))}
        ${cmdTool(FOOTNOTE, x, { disabled: !x })}
        ${cmdTool(own('icon'), this)}
        ${cmdTool(OUTDENT, x, { disabled: !canIndent })} ${cmdTool(INDENT, x, { disabled: !canIndent })}
        ${cmdMenu(own('layout'), this, COMMANDS, 'deck-layout')} ${cmdMenu(own('look'), this, COMMANDS, 'deck-look')}
        ${g ? nothing : cmdMenu(own('transition'), this, COMMANDS, 'deck-transition')}
        ${cmdMenu(own('format'), this, COMMANDS, 'deck-format')}
        ${cmdTool(own('qr'), this)} ${cmdTool(own('up'), this)} ${cmdTool(own('down'), this)} ${cmdTool(own('delete'), this)}
        ${this.undoTools()}
      </to-bar>
      ${
        this.sheets && g
          ? this.renderSheets()
          : html`<div class="deck-body">
            <div class="deck-stage" style=${`--deck-w:${size.w};--deck-h:${size.h}`} data-format=${st.format || 'deck'}>${this.renderCanvas(s, look)}</div>
            ${this.renderRail(look)}
          </div>`
      }
      ${this.showing >= 0 ? this.renderShow(look) : nothing}
      ${this.rows.renderContext()}
      <to-menu class="deck-submenu" .label=${t('This document')} .items=${this.subMenu ? this.subItems() : []}></to-menu>`;
  }
  protected updated(changed: PropertyValues<this>) {
    if (this.focusNext) void this.updateComplete.then(() => this.placeFocus());
    // A slide that comes on in the show starts its animations from the beginning; the one leaving is paused.
    // With reduced motion, every animation here rests where it ends (kit/motion.ts).
    const show = this.querySelector('.deck-show');
    if (show && changed.has('showing')) {
      const was = show.querySelector('.was');
      if (was) motion(was, false);
      motion(show.querySelector('.frame') ?? show, true);
    } else if (reducedMotion()) motion(this, true);
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDeckEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-deck-editor': ToDeckEditor;
  }
}
