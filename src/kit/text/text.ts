/**
 * <to-text>: the one rich-text editor (docs/kernel.md §4). It is given a
 * span of blocks and draws them; every `beforeinput` is prevented and
 * turned into operations (textops.ts), kept as the format keeps what they
 * make (`settle`: no mark on a space at its edge, the marks typed with such a
 * space still in force after it) and fired as `text-ops` for the host to
 * apply; the host hands the new blocks back and only the blocks whose
 * identity changed are drawn again (Lit's repeat, keyed by the block
 * object). The selection lives in the model as a Pos pair and is written to
 * the DOM after each draw; `selectionchange` reads it back. The DOM is read
 * in one place only: the block the IME composed in, at compositionend.
 *
 * Three shapes. `doc`: any block, Enter splits, a card (a table, another document) the caret
 * skips. `lines`: items and paragraphs (a slide's words), Backspace at the
 * start says `text-exit` ({dir: 'back'}). `line`: one block, Enter says
 * `text-enter` ({shift}: whether it was Shift+Enter), Delete at its end says
 * `text-exit` ({dir: 'forward'}): the host owns what is around the line. In
 * a line or lines, Select All with the box already whole says
 * `text-selectall` (the host takes everything). In a doc the box is the
 * document: Select All is the editor's own, the model's selection from the
 * first words to the last, written to the DOM over every block, and an edit
 * over it (typing, Backspace, Delete, a cut, a paste) takes the cards at its
 * ends too and leaves one paragraph. Shift+Enter is a line break
 * in a paragraph, an item or a quote; a heading splits.
 *
 * The page scrolls to the caret only after something the person did here: a
 * letter typed, a key, a paste, a command from a bar or a tap, and only when
 * the caret is off the screen. A selection written for any other reason (a
 * draw, a host putting a selection back, an autosave, a selectionchange the
 * browser raised) leaves the page where the reader put it, and so does any
 * written after they scrolled it themselves (a wheel, a finger, Page Up or
 * Down). Every focus() here passes preventScroll.
 *
 * Escape steps out one step per press: the link box closes (and the
 * press stops there), else a range of words collapses to its focus,
 * else `text-escape` (bubbles, cancelable) tells the host, and the key goes
 * on to it. Alt+Up/Down moves an item with its family past its neighbour;
 * Mod+Enter ticks a task item (in a doc or lines; a line's host decides);
 * Tab indents an item only when it can move, else it moves the focus.
 *
 * What is not words (a table, another document, a rule) is a card:
 * `contenteditable=false`, skipped by the caret, taken out whole. The host
 * may draw a card's inside through `card` (a table as a grid, another
 * document as its first page); whatever it puts there (inputs, buttons)
 * keeps its own events.
 * A task item's box is tapped to tick.
 *
 * What a screen reader is given: a run of items is one element, role=list (the model stays flat: each item is a block
 * as every other is, blockEls()), each item a listitem with its level, its place and how many; a task's state is
 * words said before its words (data-said: the caret, the IME and the copy pass over them); the drawn marks and the
 * placeholder are drawn only (an empty alt in the stylesheet), the placeholder being the box's aria-placeholder.
 *
 * Words selected bring up the selection bubble (a <to-context> centred
 * under them): the marks, Link, Footnote (where the host lists the notes:
 * `notes`) and, over whole blocks of words in a doc or lines editor, the two
 * lists. It goes when the selection collapses or leaves, while an IME
 * composes, and while the link box is open; `no-bubble` turns it off.
 *
 * A footnote is a chip in the words (its mark, numbered on from
 * `note-start`); its words are typed where the host draws the notes (the end
 * of a page, a slide's foot, under an outline: kit/draw/notes.ts), never here. A
 * tap or Enter on a chip, and the Footnote command once it has put a new
 * mark in, say `text-note` ({block, nth}: the block, and which of its marks)
 * for the host to open that note. Only a host with `notes` is offered the
 * Footnote command. `marks-only` keeps the six marks alone (words
 * that are drawn, not read: a shape's label): no Link, no Footnote, no
 * lists, Mod+K does nothing, and a paste brings its words without links or notes.
 *
 * Typing ":" and a letter at the start of a block or after a space (never "10:30", never "re: that") opens a
 * completion under the caret (<to-complete>, kit/ui/complete.ts): the icons and emoji whose names or tags begin with
 * what follows the ":", best first, the first highlighted. Up/Down move the highlight, Enter or Tab picks it in
 * place of the ":word" (one undo step, the caret after it), Escape closes it and leaves the words as typed (the
 * press stops there), a space, a second ":", or the caret moving away closes it, a tap on a row picks it. A
 * known ":name:" typed in full becomes the icon (or the emoji) at once, like a Markdown shortcut: an undo gives
 * the words back. Where the words hold no icon runs (`marks-only`, a drawn label; `no-bubble`, plain words) only
 * emoji are offered. While it is open the editor is a combobox's box: `aria-autocomplete="list"`, its
 * `aria-activedescendant` the highlighted row.
 *
 * Inside a read-only editor (kit/core/element.ts) the words are shown and not edited: not contenteditable, but still a
 * stop in the focus order (aria-readonly), and its keys are not answered here.
 *
 * Nothing here calls execCommand, sets innerHTML, or reads it.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { applyAll, hasClass, isAtomic, listNumbers, normalRuns, runLength, type Block, type Op, type Run } from '../../doc/index.ts';
import { copyData, pasteFrom, readClip, writeClip } from './clipboard.ts';
import { contextOf, runKey } from '../core/commands.ts';
import { TEXT_COMMANDS } from './text-commands.ts';
import type { ToContext } from '../ui/context.ts';
import { lookup } from '../core/app.ts';
import { t } from '../core/i18n.ts';
import { dateString } from '../core/dates.ts';
import { icon, iconNamed, iconsComplete, isIconName, loadIcons, onIcons } from '../draw/icons.ts';
import {
  align,
  alignAt,
  backspace,
  blockLength,
  caret,
  carrySel,
  charAt,
  clampSel,
  collapsed,
  deleteSel,
  forwardDelete,
  insertBlocks,
  insertRuns,
  isWords,
  kindAt,
  marksOf,
  ordered,
  runAt,
  sameSel,
  moveItems,
  setKind,
  setMark,
  shiftItems,
  shortcut,
  skipCard,
  smartQuote,
  settle,
  splitAt,
  toggleMark,
  typeRuns,
  runsDiff,
  wholeSel,
  type Command,
  type Fmt,
  type Held,
  type Mark,
  type Pos,
  type Sel,
  type Shape,
} from './textops.ts';
import type { ToLinkPop } from '../ui/link-pop.ts';
import { completeNamed, completions, loadCompletions, type Completion, type ToComplete } from '../ui/complete.ts';
import { gliding, revealCaret, scrollerOf } from '../ui/scroll.ts';
import '../ui/context.ts';
import '../ui/link-pop.ts';
import '../ui/complete.ts';

export type { Sel, Shape } from './textops.ts';

/** What `text-ops` carries: the ops, the selection after them, the one before, and 'type' when the edit is a letter typed or taken out (undo folds those). */
export interface TextOps {
  ops: Op[];
  sel: Sel;
  before: Sel | null;
  kind?: 'type';
}
/** What `text-note` carries: the block of the mark asked for, and which of the block's marks it is. */
export interface NoteAt {
  block: number;
  nth: number;
}

const EMPTY: Block = { k: 'p', runs: [] };
/** A ":word" before the caret: its block, the offsets of its ":" and of its end, the letters after the ":". */
interface Trigger {
  block: number;
  start: number;
  end: number;
  query: string;
}
const keys = new WeakMap<Block, number>();
let nextKey = 0;
const keyOf = (b: Block) => keys.get(b) ?? (keys.set(b, ++nextKey), nextKey);
/**
 * Words are keyed by identity, so only a changed block is drawn again and a moved one keeps its element; a card by
 * its place, so a table edited in its grid keeps its element, and the focus in it. A block typed in inherits the
 * key of the block it replaces (`inherit`), so the element under the caret is updated in place rather than swapped:
 * a swap under a phone's keyboard loses its autocorrect context (iOS), and Safari drops a selection set in the same
 * task as one. The block an IME composed in is the exception: it gets a fresh key, so whatever the browser put in
 * its element is thrown away with it.
 */
const keyAt = (b: Block, i: number): number | string => (isWords(b) ? keyOf(b) : `c${i}`);
/** New blocks given the keys of the words they replace, place by place, while the kind stays the same. */
function inherit(from: Block[] | undefined, to: Block[], fresh: number) {
  if (!from) return;
  const kept = new Set(to);
  to.forEach((b, i) => {
    const old = from[i];
    if (i === fresh || !old || old === b || kept.has(old) || keys.has(b) || !isWords(b) || !isWords(old) || old.k !== b.k) return;
    keys.set(b, keyOf(old));
  });
}
/**
 * When the person last did something on the page (a key, an input, a paste, a tap or a click) and when they last
 * scrolled it themselves (a wheel, a finger dragging, Page Up or Down): a selection written within a moment of the
 * first, and with no scroll of theirs since, is answering them and may bring the caret into view; any other (a
 * draw, a restore, an autosave) leaves the page where they put it. Answering an edit (typing, Enter, a paste: the
 * last thing done was an input), the caret is brought to the middle from below it (kit/ui/scroll.ts revealCaret's
 * `middle`); answering a tap or a key that only moves it (an arrow), it is only kept in sight.
 */
let acted = -Infinity;
let scrolled = -Infinity;
let edited = false;
const ANSWER_MS = 800;
if (typeof document !== 'undefined') {
  const act = (e: Event) => {
    acted = performance.now();
    edited = e.type !== 'pointerdown' && e.type !== 'keydown';
  };
  const scroll = () => void (scrolled = performance.now());
  for (const type of ['beforeinput', 'pointerdown', 'paste', 'cut', 'drop']) document.addEventListener(type, act, { capture: true, passive: true });
  document.addEventListener('keydown', (e) => (e.key === 'PageUp' || e.key === 'PageDown' ? scroll() : act(e)), { capture: true, passive: true });
  for (const type of ['wheel', 'touchmove']) document.addEventListener(type, scroll, { capture: true, passive: true });
}
/** Whether a selection written now answers something the person just did here. */
const answering = () => acted > scrolled && performance.now() - acted < ANSWER_MS;
const WEBKIT = typeof navigator !== 'undefined' && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);
const DELETES = new Set([
  'deleteWordBackward',
  'deleteWordForward',
  'deleteSoftLineBackward',
  'deleteSoftLineForward',
  'deleteHardLineBackward',
  'deleteHardLineForward',
  'deleteContent',
  'deleteByCut',
  'deleteByDrag',
]);
const FORMATS: Record<string, Command> = {
  formatBold: 'b',
  formatItalic: 'i',
  formatUnderline: 'u',
  formatStrikeThrough: 's',
  insertOrderedList: 'ol',
  insertUnorderedList: 'ul',
  formatIndent: 'indent',
  formatOutdent: 'outdent',
  formatJustifyLeft: 'left',
  formatJustifyCenter: 'center',
  formatJustifyRight: 'right',
  formatJustifyFull: 'justify',
};

/** A run of items, drawn as one element: a list to a screen reader. Its items are blocks as the box's children are. */
const LIST = 'tx-list';
/** What is said and not written: a task's state, read before its words, which the caret, the copy and the IME pass over. */
const SAID = 'data-said';

/**
 * A block's element read back as runs: text nodes with the marks of the
 * elements around them, the two atomic chips, a marked <br> as a line
 * break. Used once, at compositionend.
 */
function domToRuns(el: HTMLElement): Run[] {
  const out: Run[] = [];
  const walk = (n: Node, m: Fmt) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const words = (n.textContent ?? '').replace(/ /g, ' ');
      if (words) out.push({ t: words, ...m });
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const e = n as HTMLElement;
    if (e.hasAttribute(SAID)) return;
    if (e.dataset.icon !== undefined) return void out.push({ t: '', ic: e.dataset.icon });
    if (e.dataset.fn !== undefined) return void out.push({ t: '', fn: e.dataset.fn });
    if (e.tagName === 'BR') return void (e.dataset.nl !== undefined && out.push({ t: '\n' }));
    const next: Fmt = { ...m };
    if (e.tagName === 'B' || e.tagName === 'STRONG') next.b = true;
    if (e.tagName === 'I' || e.tagName === 'EM') next.i = true;
    if (e.tagName === 'U') next.u = true;
    if (e.tagName === 'S' || e.tagName === 'DEL') next.s = true;
    if (e.tagName === 'MARK') next.h = true;
    if (e.tagName === 'CODE') next.c = true;
    if (e.tagName === 'A' && e.getAttribute('href')) next.href = e.getAttribute('href')!;
    for (const c of e.childNodes) walk(c, next);
  };
  for (const c of el.childNodes) walk(c, {});
  return normalRuns(out);
}

/**
 * Each item's place in its list, as a screen reader says it: its position among the items of its level under the same
 * parent, and how many there are. A run of items is a list; a block that is not an item ends it, an item less deep
 * ends the deeper ones under it.
 */
function listPlaces(model: Block[]): ({ pos: number; size: number } | undefined)[] {
  const out: ({ pos: number; size: number } | undefined)[] = [];
  let open: { pos: number; size: number }[][] = [];
  model.forEach((b, i) => {
    if (b.k !== 'li') return void (open = []);
    open.length = Math.min(open.length, b.depth + 1);
    const group = (open[b.depth] ??= []);
    const place = { pos: group.length + 1, size: 0 };
    group.push(place);
    for (const p of group) p.size = group.length;
    out[i] = place;
  });
  return out;
}

export class ToText extends LitElement {
  static properties = {
    blocks: { attribute: false },
    shape: {},
    noteStart: { type: Number, attribute: 'note-start' },
    label: {},
    placeholder: {},
    card: { attribute: false },
    noBubble: { type: Boolean, attribute: 'no-bubble' },
    marksOnly: { type: Boolean, attribute: 'marks-only' },
    notes: { type: Boolean },
  };
  /** The blocks it owns; `at` in its ops counts from the first. */
  declare blocks: Block[];
  declare shape: Shape;
  /** How many footnotes come before this span, so its marks are numbered on from there. */
  declare noteStart: number;
  declare label: string;
  declare placeholder: string;
  /** The host's drawing of a card's inside, by block; null (or nothing returned) for the editor's own. */
  declare card: ((b: Block, at: number) => TemplateResult | typeof nothing | null) | null;
  /** No selection bubble (a host with marks of its own beside the words, or none). */
  declare noBubble: boolean;
  /** The marks and nothing else: no links, no footnotes, no lists. */
  declare marksOnly: boolean;
  /** The host draws the notes and answers `text-note`: the Footnote command is offered. */
  declare notes: boolean;

  private _sel: Sel | null = null;
  /** The marks the next letter typed will carry. */
  private fmt: Fmt = {};
  /** Marks the format let go of on the spaces just before the caret (a space typed after a bold word): still in force there. */
  private held: Held | null = null;
  /** What was held where a composition began: the words it makes are typed as letters are. */
  private composeHeld: Held | null = null;
  private composing = false;
  private composingEl: HTMLElement | null = null;
  /** Write the model selection to the DOM after the next draw; 'focus' takes the focus too. */
  private pendingSel: 'keep' | 'focus' | null = null;
  /** A selection write is on its way (WebKit's is a frame later): what the DOM says meanwhile is stale and not read back. */
  private writing = false;
  /** The selection has left the editor (said once). */
  private away = false;
  /** The block an IME just composed in: drawn afresh on the next draw, not updated in place. */
  private fresh = -1;
  /** Select All in a doc: the selection is the whole document, cards included; an edit over it takes everything. */
  private whole = false;
  /** The ":word" being completed: its block, where its ":" is, where the caret is, the letters after the ":". */
  private completing: Trigger | null = null;
  /** The ":word" Escape closed the completion on: it stays closed while the caret stays in it. */
  private dismissed: Trigger | null = null;
  /** A letter was just typed: the completion may open on the words it made. */
  private armed = false;

  constructor() {
    super();
    this.blocks = [];
    this.shape = 'doc';
    this.noteStart = 0;
    this.label = '';
    this.placeholder = '';
    this.card = null;
    this.noBubble = false;
    this.marksOnly = false;
    this.notes = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.onSelectionChange);
    this.offIcons = onIcons(() => this.requestUpdate());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this.onSelectionChange);
    window.removeEventListener('keydown', this.onCompleteKey, true);
    this.offIcons();
  }
  private offIcons = () => {};

  /** The blocks as drawn: an editor with none shows one empty paragraph to type into. */
  get model(): Block[] {
    return this.blocks.length ? this.blocks : [EMPTY];
  }
  /** Inside a read-only editor: shown, not edited (the header). */
  get locked(): boolean {
    return !!this.closest('[readonly]');
  }
  /** The editable box. */
  get tx(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > .tx')!;
  }
  private get linkPop(): ToLinkPop {
    return this.querySelector<ToLinkPop>(':scope > to-link-pop')!;
  }
  private get completePop(): ToComplete | null {
    return this.querySelector<ToComplete>(':scope > to-complete');
  }
  private get bubble(): ToContext | null {
    return this.querySelector<ToContext>(':scope > to-context.tx-bubble');
  }

  /* ---------- the selection ---------- */

  /** Where the selection is, in the model; null when there has been none. */
  get sel(): Sel | null {
    return this._sel;
  }
  /** Put the selection here (and the focus with it). */
  set sel(s: Sel | null) {
    this._sel = s ? clampSel(this.model, s) : null;
    if (!this.heldAt(this._sel)) this.held = null;
    this.whole = false;
    if (!s) return;
    this.pendingSel = 'focus';
    // Drawn and nothing pending: written now; otherwise updated() writes it after the draw.
    if (this.hasUpdated && !this.isUpdatePending) this.flushSel();
  }
  /**
   * Ops someone else applied to the blocks (a shared document: DocElement's `applyRemote`): the selection carried over
   * them and held within `blocks`, the blocks as they are after; written back once they are drawn, where the box has
   * the focus, and never taking it.
   */
  carry(ops: Op[], blocks: Block[]) {
    this.held = null;
    if (!this._sel || this.whole) return;
    this._sel = clampSel(blocks, carrySel(this._sel, ops));
    this.pendingSel ??= 'keep';
    // Drawn again after the host hands the blocks down (it asked first), so the selection is written over them.
    this.requestUpdate();
  }
  /** The marks at the caret (what a bar shows pressed). */
  get marks(): Fmt {
    return this.fmt;
  }
  /** The marks held at a caret (textops.ts Held): while the caret stays where they were let go of. */
  private heldAt(s: Sel | null): Fmt | null {
    const h = this.held;
    return h && s && collapsed(s) && s.anchor.block === h.block && s.anchor.offset === h.to ? h.fmt : null;
  }
  /** The kind of block the caret is in. */
  get kind() {
    return this._sel ? kindAt(this.model, this._sel) : null;
  }
  get alignment() {
    return this._sel ? alignAt(this.model, this._sel) : 'left';
  }
  focus(opts?: FocusOptions) {
    this.tx?.focus({ preventScroll: true, ...opts });
  }
  hasFocus(): boolean {
    const a = document.activeElement;
    return !!a && (a === this.tx || this.tx.contains(a));
  }

  /** Each block's element, in order: the box's children, a list's items in its place (render). */
  blockEls(): HTMLElement[] {
    return [...this.tx.children].flatMap((c) => (c.classList.contains(LIST) ? [...c.children] : [c])) as HTMLElement[];
  }
  private blockElOf(node: Node | null): HTMLElement | null {
    const tx = this.tx;
    const inBox = (n: Node) => n.parentNode === tx || (n.parentNode as Element | null)?.classList?.contains(LIST) === true;
    while (node && !inBox(node)) node = node.parentNode;
    return node instanceof HTMLElement && !node.classList.contains(LIST) ? node : null;
  }
  /** The block a point between blocks (in the box, or in a list) comes before; the model's length at the very end. */
  private blockAfter(node: Node, offset: number): number {
    const at = document.createRange();
    at.setStart(node, offset);
    const i = this.blockEls().findIndex((el) => at.comparePoint(el, 0) >= 0);
    return i < 0 ? this.model.length : i;
  }

  /**
   * A DOM point as a position: characters counted through the block's text nodes, chips and line breaks as one each,
   * held within `model` (the blocks as drawn; at compositionend, with the composed block as the browser left it).
   */
  readPos(node: Node, offset: number, model: Block[] = this.model): Pos | null {
    const tx = this.tx;
    if (node === tx || (node as Element).classList?.contains(LIST)) {
      const n = model.length;
      offset = this.blockAfter(node, offset);
      return offset >= n ? skipCard(model, { block: n - 1, offset: blockLength(model[n - 1]) }, -1) : skipCard(model, { block: offset, offset: 0 }, 1);
    }
    const el = this.blockElOf(node);
    if (!el) return null;
    const block = this.blockEls().indexOf(el);
    if (block < 0) return null;
    if (!isWords(model[block])) return skipCard(model, { block, offset: 0 }, 1);
    let count = 0;
    const walk = (n: Node): boolean => {
      if (n === node && n.nodeType !== Node.TEXT_NODE) {
        for (let i = 0; i < offset && i < n.childNodes.length; i++) walk(n.childNodes[i]);
        return true;
      }
      if (n.nodeType === Node.TEXT_NODE) {
        if (n === node) {
          count += offset;
          return true;
        }
        count += (n as Text).length;
        return false;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return false;
      const e = n as HTMLElement;
      if (e.hasAttribute(SAID)) return false;
      if (e.dataset.atomic !== undefined) {
        count += 1;
        return false;
      }
      if (e.tagName === 'BR') {
        if (e.dataset.nl !== undefined) count += 1;
        return false;
      }
      for (const c of e.childNodes) if (walk(c)) return true;
      return false;
    };
    walk(el);
    return { block, offset: Math.min(count, blockLength(model[block])) };
  }
  /** A position as a DOM point: the text node holding the character, or the block itself around a chip. */
  domPoint(pos: Pos): [Node, number] | null {
    const el = this.blockEls()[pos.block];
    if (!el) return null;
    const index = (e: Node) => Array.prototype.indexOf.call(e.parentNode!.childNodes, e);
    if (!isWords(this.model[pos.block])) return [el.parentNode!, index(el)];
    let left = pos.offset;
    let last: [Node, number] = [el, 0];
    const walk = (n: Node): [Node, number] | null => {
      if (n.nodeType === Node.TEXT_NODE) {
        const len = (n as Text).length;
        if (left <= len) return [n, left];
        left -= len;
        last = [n, len];
        return null;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return null;
      const e = n as HTMLElement;
      if (e.hasAttribute(SAID)) return null;
      if (e.dataset.atomic !== undefined || e.tagName === 'BR') {
        const w = e.tagName === 'BR' ? (e.dataset.nl !== undefined ? 1 : 0) : 1;
        // Before a chip or a line break the position reaches; and before the placeholder <br> of a block with no words
        // (renderRuns), never after it: Safari draws no caret after a block's last <br>, so a new slide's empty boxes took
        // the typing with nothing to show for it (Paul, 2026-10-13: "no cursor appears. I can type but it doesn't look like I can").
        if (left === 0) return [e.parentNode!, index(e)];
        left -= w;
        last = [e.parentNode!, index(e) + 1];
        return null;
      }
      for (const c of e.childNodes) {
        const r = walk(c);
        if (r) return r;
      }
      return null;
    };
    return walk(el) ?? last;
  }
  private rangeSel(r: AbstractRange): Sel | null {
    const anchor = this.readPos(r.startContainer, r.startOffset);
    const focus = this.readPos(r.endContainer, r.endOffset);
    return anchor && focus ? { anchor, focus } : null;
  }
  /** The DOM selection as a model selection, when it sits in this editor. */
  readSel(model: Block[] = this.model): Sel | null {
    const s = document.getSelection();
    if (!s?.anchorNode || !s.focusNode || !this.tx) return null;
    if (!this.tx.contains(s.anchorNode) || !this.tx.contains(s.focusNode)) return null;
    const anchor = this.readPos(s.anchorNode, s.anchorOffset, model);
    const focus = this.readPos(s.focusNode, s.focusOffset, model);
    return anchor && focus ? { anchor, focus } : null;
  }
  private onSelectionChange = () => {
    // While a write is pending the DOM caret is wherever the draw left it (WebKit puts it at 0 of a text node updated in place): not ours to read.
    if (this.composing || this.pendingSel || this.writing || !this.isConnected) return;
    const s = this.readSel();
    if (!s) {
      if (!this.away) {
        this.away = true;
        // Gone into the link box's own address field: the box stays (it is what was asked for).
        const into = document.getSelection()?.anchorNode;
        if (!(into && this.linkPop?.contains(into))) this.linkPop?.hide();
        this.bubble?.hide();
        this.endComplete();
        this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: null, bubbles: true }));
      }
      return;
    }
    this.away = false;
    if (sameSel(s, this._sel)) return this.syncBubble();
    this.whole = false;
    this._sel = s;
    this.held = null;
    this.fmt = marksOf(this.model, s);
    this.showLink();
    this.syncBubble();
    this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: s, bubbles: true }));
  };
  private flushSel() {
    const how = this.pendingSel;
    // Never a selection written under an IME: it waits for compositionend.
    if (!how || this.composing) return;
    this.pendingSel = null;
    this.writing = true;
    const go = () => {
      this.writing = false;
      const s = this._sel;
      if (!s || !this.isConnected || !this.tx) return;
      if (how === 'focus') this.focus();
      else if (!this.hasFocus()) return;
      const dom = document.getSelection();
      if (!dom) return;
      // The whole document: the box from its first child to its last, so the cards at the ends are in it too.
      if (this.whole) dom.setBaseAndExtent(this.tx, 0, this.tx, this.tx.childNodes.length);
      else {
        const a = this.domPoint(s.anchor);
        const f = this.domPoint(s.focus);
        if (!a || !f) return;
        const sc = scrollerOf(this);
        const y = sc.scrollTop;
        dom.setBaseAndExtent(a[0], a[1], f[0], f[1]);
        if (answering()) this.keepCaretVisible(dom);
        // Not answering anyone: the column stays where the reader put it, even where a browser reveals a selection written.
        else if (sc.scrollTop !== y) sc.scrollTop = y;
      }
      this.syncBubble();
    };
    // Safari drops a selection set in the same task as a DOM swap.
    WEBKIT ? requestAnimationFrame(go) : go();
  }
  /** The caret kept inside what can be seen of the column (above a phone's keyboard) after something the person did moved it, and at the middle from below after an edit (kit/ui/scroll.ts). */
  private keepCaretVisible(dom: Selection) {
    // In flight for the keyboard, the column's box is not yet where it is going: it keeps the caret in sight when it settles.
    // (Paul, 2026-10-10: the outline's new row appeared under the bar, out of reach.)
    if (dom.rangeCount && !gliding()) revealCaret(this, { middle: edited });
  }

  /* ---------- edits ---------- */

  /**
   * The ops are the host's to apply; the selection after them is kept here
   * and written once the host's new `blocks` are drawn (the draw comes from
   * that property alone, whether the host applies the ops in the event or
   * in a render of its own).
   */
  private emit(ops: Op[], sel: Sel, kind?: 'type', how: 'keep' | 'focus' | null = 'keep', first = true) {
    if (!ops.length) return;
    const before = this._sel;
    if (first && !this.blocks.length) ops = [{ op: 'splice', at: 0, n: 0, blocks: [EMPTY] }, ...ops];
    // What the ops make, as the format keeps it: the model is what its text reads back as (docs/kernel.md §2).
    const kept = settle(this.blocks, ops, sel);
    if (!kept.ops.length) return;
    ops = kept.ops;
    sel = kept.sel;
    this.held = kept.held;
    this._sel = sel;
    this.whole = false;
    if (how) this.pendingSel = how;
    this.dispatchEvent(new CustomEvent<TextOps>('text-ops', { detail: { ops, sel, before, ...(kind ? { kind } : {}) }, bubbles: true }));
  }
  private current(): Sel {
    const m = this.model;
    return this._sel ? clampSel(m, this._sel) : (this.readSel() ?? caret(m.length - 1, blockLength(m[m.length - 1])));
  }

  /** What an edit replaces: the selection, or with everything selected (Select All in a doc) the whole document, its cards too. */
  private span(): Sel {
    return this.whole ? wholeSel(this.model) : this.current();
  }

  /** Whether an event comes from a control the host put inside a card (an input, a button): its own, not the editor's. */
  private ownEvent(e: Event): boolean {
    const el = e.target as HTMLElement | null;
    return (
      !!el?.closest?.('.tx-card') &&
      (el.matches?.('input, textarea, select, button, a, [contenteditable="true"]') || !!el.closest?.('input, textarea, select, button, a, .tx-card [contenteditable="true"]'))
    );
  }

  private onBeforeInput = (e: InputEvent) => {
    if (this.ownEvent(e)) return;
    if (this.composing || e.isComposing || /Composition/.test(e.inputType)) return;
    e.preventDefault();
    const model = this.model;
    // With everything selected the browser's own range is not asked: it stops at the cards.
    const target = this.whole ? undefined : e.getTargetRanges?.()[0];
    const sel = this.span();
    const type = e.inputType;
    const exit = (dir: 'back' | 'forward') => this.dispatchEvent(new CustomEvent<{ dir: 'back' | 'forward' }>('text-exit', { detail: { dir }, bubbles: true }));
    // Backspace at the very start says `text-exit` (back); in a line, Delete at the very end says it too (forward): the host owns what is around the line.
    const edit = (r: ReturnType<typeof backspace>, forward = false) =>
      r === 'exit' ? exit('back') : r ? this.emit(r.ops, r.sel, 'type') : forward && this.shape === 'line' && collapsed(sel) ? exit('forward') : undefined;
    // Enter from a keyboard that sends no key (Android's) picks, as the key would.
    if (type === 'insertParagraph' && this.completeOpen()) return this.pickCompletion();
    switch (type) {
      case 'insertText':
        this.armed = true;
        return this.typed(e.data ?? '', sel);
      case 'insertReplacementText':
        return this.typed(e.data ?? e.dataTransfer?.getData('text/plain') ?? '', (target && this.rangeSel(target)) ?? sel, false);
      case 'insertParagraph':
        return this.enter(sel);
      case 'insertLineBreak': {
        // A line break inside a paragraph, an item or a quote; a heading splits; a line tells its host, saying it was Shift.
        const [a] = ordered(sel);
        if (this.shape !== 'line' && ['p', 'li', 'quote'].includes(model[a.block].k)) return this.put(sel, [{ t: '\n' }]);
        return this.enter(sel, true);
      }
      case 'deleteContentBackward':
        return edit(backspace(model, sel, this.shape));
      case 'deleteContentForward':
        return edit(forwardDelete(model, sel), true);
      case 'insertFromPaste':
      case 'insertFromDrop': {
        const dt = e.dataTransfer;
        if (dt) this.paste({ text: dt.getData('text/plain'), html: dt.getData('text/html') }, (type === 'insertFromDrop' && target && this.rangeSel(target)) || sel);
        return;
      }
      case 'historyUndo':
      case 'historyRedo':
        this.dispatchEvent(new CustomEvent(type === 'historyUndo' ? 'docundo' : 'docredo', { bubbles: true, cancelable: true }));
        return;
    }
    if (DELETES.has(type)) {
      const range = (target && this.rangeSel(target)) ?? sel;
      if (!collapsed(range)) return edit(deleteSel(model, range));
      return /Forward/.test(type) ? edit(forwardDelete(model, sel), true) : edit(backspace(model, sel, this.shape));
    }
    if (FORMATS[type]) this.exec(FORMATS[type]);
  };

  /** Letters typed: a space may finish a Markdown shortcut, a straight quote curls, the rest go in with the marks in force. */
  private typed(data: string, sel: Sel, marks = true) {
    const model = this.model;
    // ":name:" typed in full, the name known: the ":" as typed, then the icon (or emoji) in place of the words, as a shortcut is (two steps).
    const tr = data === ':' ? this.trigger(sel) : null;
    const named = tr && completeNamed(tr.query, this.iconsHere);
    if (tr && named) {
      const colon = insertRuns(model, sel, [{ t: ':', ...this.fmt }]);
      this.emit(colon.ops, colon.sel, 'type');
      const now = applyAll({ head: {}, blocks: model }, colon.ops).blocks;
      const r = insertRuns(now, { anchor: { block: tr.block, offset: tr.start }, focus: { block: tr.block, offset: tr.end + 1 } }, [this.completed(named)]);
      return this.emit(r.ops, r.sel, undefined, 'keep', false);
    }
    if (data === ' ') {
      const s = shortcut(model, sel, this.shape);
      // Two steps: the space as typed, then the kind; an undo gives the marker back as it was written.
      if (s) {
        const sp = insertRuns(model, sel, [{ t: ' ', ...this.fmt }]);
        this.emit(sp.ops, sp.sel, 'type');
        return this.emit(s.ops, s.sel, undefined, 'keep', false);
      }
      // A space at the end of a link ends it (Paul, 2026-10-15: "when I'm typing a link in the outliner and want to stop
      // linking, there's no way out"): typing letters after a link stays in it (Mod+K or the bubble made it; the word
      // typed next is its too), and the space typed at its end is plain, so what comes next is normal text, as in Gmail,
      // Notes and Slack. It had taken two spaces (2026-10-11), which a phone never sends: iOS makes the second a period,
      // and its keyboard has no Escape and no arrow. A space inside a link's words is the link's, as before.
      const [a] = ordered(sel);
      const link = collapsed(sel) && this.fmt.href ? this.linkSpan(a) : null;
      if (link && a.offset === link.sel.focus.offset) return this.put(sel, [{ t: ' ' }]);
    }
    let words = data;
    if (data === '"' || data === "'") {
      const [a] = ordered(sel);
      const b = model[a.block];
      words = smartQuote(data, isWords(b) ? charAt(b.runs, a.offset - 1) : '');
    }
    const e = typeRuns(model, sel, [{ t: words, ...(marks ? this.fmt : {}) }], marks ? this.held : null);
    this.emit(e.ops, e.sel, 'type');
  }
  private put(sel: Sel, runs: Run[]) {
    const e = insertRuns(this.model, sel, runs);
    this.emit(e.ops, e.sel, 'type');
  }
  private enter(sel: Sel, shift = false) {
    if (this.shape === 'line') return void this.dispatchEvent(new CustomEvent<{ shift: boolean }>('text-enter', { detail: { shift }, bubbles: true }));
    const e = splitAt(this.model, sel);
    this.emit(e.ops, e.sel);
  }
  private paste(data: { text: string; html: string }, sel: Sel) {
    // (Words as they were marked: what they make where they go is settled whole, emit.)
    let got = pasteFrom(data, this.shape, false);
    if (!got) return;
    if (this.marksOnly && 'runs' in got) got = { runs: got.runs.filter((r) => r.fn === undefined).map(({ href: _href, ...r }) => r) };
    const e = 'runs' in got ? insertRuns(this.model, sel, got.runs) : insertBlocks(this.model, sel, got.blocks);
    this.emit(e.ops, e.sel);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.ownEvent(e) || e.isComposing || this.composing || this.locked) return;
    const chip = (e.target as HTMLElement).closest?.('.fn');
    if (chip && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      return this.askNote(chip as HTMLElement);
    }
    if (e.key === 'Escape') return this.escape(e);
    // In a line, Backspace at the very start and Delete at the very end are the host's (text-exit), decided here on the
    // key: with nothing in the line to delete, Safari on iOS sends no beforeinput for either (Paul, 2026-10-10: at the
    // start of an outline's row, delete did nothing), so the key itself says it, and the beforeinput that may follow is
    // prevented by taking it.
    if (this.shape === 'line' && (e.key === 'Backspace' || e.key === 'Delete') && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const sel = this.current();
      const at = collapsed(sel) ? sel.anchor : null;
      const dir =
        at && e.key === 'Backspace' && at.block === 0 && at.offset === 0
          ? 'back'
          : at && e.key === 'Delete' && at.block === this.model.length - 1 && at.offset >= blockLength(this.model[at.block])
            ? 'forward'
            : null;
      if (dir) {
        e.preventDefault();
        return void this.dispatchEvent(new CustomEvent<{ dir: 'back' | 'forward' }>('text-exit', { detail: { dir }, bubbles: true }));
      }
    }
    // The words' commands (kit/text/text-commands.ts): the marks, Link, Tab and Shift+Tab on an item, Alt+Up/Down, Mod+Enter, Mod+A.
    runKey(e, TEXT_COMMANDS, this);
  };

  /* ---------- what the words' commands do (kit/text/text-commands.ts) ---------- */

  /** Alt+Up/Down: the item, with its family, past its neighbour; false where there is none to move. */
  moveItem(by: -1 | 1): boolean {
    const r = moveItems(this.model, this.current(), by);
    if (r) this.emit(r.ops, r.sel, undefined, 'focus');
    return !!r;
  }
  /** Tab, Shift+Tab: an item shifted when it can move; false otherwise, so Tab moves the focus on (never trapped). */
  shiftItem(by: -1 | 1): boolean {
    const model = this.model;
    const sel = this.current();
    const r = model[ordered(sel)[0].block].k === 'li' ? shiftItems(model, sel, by) : null;
    if (r) this.emit(r.ops, r.sel, undefined, 'focus');
    return !!r;
  }
  /** Mod+Enter on a task item ticks it (Docs' checklist key); anywhere else it is the host's (false). */
  tick(e?: Event): boolean {
    const sel = this.current();
    if (!this.toggleDone(ordered(sel)[0].block, sel)) return false;
    e?.stopPropagation();
    return true;
  }
  /**
   * Mod+A. In a doc: the whole document as the model's selection, cards and all, written to the DOM by us (the browser's
   * own stops short of a card at either end). In a line or lines the first press is the browser's own (false), taking the
   * box; with the box already whole, or empty, the host is asked for everything (`text-selectall`).
   */
  selectAllKey(): boolean {
    if (this.shape === 'doc') return (this.selectAll(), true);
    const m = this.model;
    const [a, b] = ordered(this.current());
    if (!(a.offset === 0 && b.offset >= blockLength(m[m.length - 1]) && a.block === 0 && b.block === m.length - 1)) return false;
    this.dispatchEvent(new CustomEvent('text-selectall', { bubbles: true }));
    return true;
  }
  /** Copy or Cut from a button (a phone's row): the words selected onto the clipboard as the keys put them, our TLO and our HTML. */
  copyOut(cut: boolean) {
    const sel = this.whole ? wholeSel(this.model) : this._sel;
    if (!sel || collapsed(sel)) return;
    void writeClip(copyData(this.model, sel));
    if (cut) {
      const d = deleteSel(this.model, sel);
      this.emit(d.ops, d.sel, undefined, 'focus');
    }
  }
  /** Paste from a button: the clipboard read where the browser allows; where it refuses, a line under the row says to use the keyboard's paste. */
  async pasteIn() {
    const sel = this.span();
    const got = await readClip();
    if (!got) {
      const bub = this.bubble;
      if (bub) bub.hint = t('editor-this-browser-lets-page-paste');
      return;
    }
    this.paste(got, sel);
  }
  /** Whether the selection is whole blocks of words that can be a list: the lists are offered in the bubble then. */
  listable(): boolean {
    return !!this._sel && this.wholeBlocks(this._sel);
  }
  /** Everything selected: the model's selection runs from the first words to the last (what `sel` says), and an edit takes the cards too. */
  selectAll() {
    const m = this.model;
    this._sel = clampSel(m, wholeSel(m));
    this.whole = true;
    this.held = null;
    this.fmt = marksOf(m, this._sel);
    this.pendingSel = 'focus';
    if (this.hasUpdated && !this.isUpdatePending) this.flushSel();
    this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: this._sel, bubbles: true }));
  }
  /** Escape, one step per press: a box closes; else a range collapses to its focus; else the host hears `text-escape` and the key goes on. */
  private escape(e: KeyboardEvent) {
    if (this.closePops()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const sel = this._sel;
    if (sel && !collapsed(sel)) {
      e.preventDefault();
      e.stopPropagation();
      this.sel = { anchor: sel.focus, focus: sel.focus };
      this.bubble?.hide();
      return;
    }
    this.dispatchEvent(new CustomEvent('text-escape', { bubbles: true, cancelable: true }));
  }
  /** A task item ticked or unticked; false when the block is no task. */
  private toggleDone(block: number, sel: Sel | null): boolean {
    const b = this.model[block];
    if (b?.k !== 'li' || b.done === undefined) return false;
    this.emit([{ op: 'splice', at: block, n: 1, blocks: [{ ...b, done: !b.done }] }], sel ?? caret(block, 0), undefined, sel ? 'keep' : null);
    return true;
  }
  private onClick = (e: MouseEvent) => {
    if (this.ownEvent(e)) return;
    const el = e.target as HTMLElement;
    const chip = el.closest?.('.fn');
    if (chip && this.tx.contains(chip)) return this.askNote(chip as HTMLElement);
    const card = el.closest?.('.tx-card');
    if (card && this.tx.contains(card)) {
      const block = this.blockEls().indexOf(card as HTMLElement);
      this.dispatchEvent(new CustomEvent<{ block: number }>('text-embed', { detail: { block }, bubbles: true }));
      return;
    }
    // A tap on a task's box ticks it: the box is drawn in the item's left padding (a finger's 44 wide under a finger, text.css).
    const li = el.closest?.('li[data-done]') as HTMLElement | null;
    if (li && this.tx.contains(li) && e.clientX < li.getBoundingClientRect().left + parseFloat(getComputedStyle(li).paddingLeft)) {
      const block = this.blockEls().indexOf(li);
      const b = this.model[block];
      if (b?.k !== 'li' || b.done === undefined) return;
      e.preventDefault();
      this.emit([{ op: 'splice', at: block, n: 1, blocks: [{ ...b, done: !b.done }] }], this._sel ?? caret(block, 0), undefined, null);
    }
  };

  private onCopy = (e: ClipboardEvent) => {
    if (this.ownEvent(e)) return;
    const sel = this.whole ? wholeSel(this.model) : (this.readSel() ?? this._sel);
    if (!sel || collapsed(sel) || !e.clipboardData) return;
    e.preventDefault();
    const { text, html } = copyData(this.model, sel);
    e.clipboardData.setData('text/plain', text);
    e.clipboardData.setData('text/html', html);
    if (e.type === 'cut') {
      const d = deleteSel(this.model, sel);
      this.emit(d.ops, d.sel);
    }
  };
  private onPaste = (e: ClipboardEvent) => {
    if (this.ownEvent(e)) return;
    e.preventDefault();
    const dt = e.clipboardData;
    if (dt) this.paste({ text: dt.getData('text/plain'), html: dt.getData('text/html') }, this.span());
  };

  private onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (!to || !this.completePop?.contains(to)) this.endComplete();
    if (!to || !this.bubble?.contains(to)) this.bubble?.hide();
  };
  private onCompositionStart = () => {
    this.composing = true;
    this.composeHeld = this.heldAt(this._sel) ? this.held : null;
    this.composingEl = this.blockElOf(document.getSelection()?.anchorNode ?? null);
    this.closePops();
  };
  /** The composed block read back once, and the one op that takes the model there. */
  private onCompositionEnd = () => {
    this.composing = false;
    const el = this.composingEl ?? this.blockElOf(document.getSelection()?.anchorNode ?? null);
    this.composingEl = null;
    if (!el) return;
    const i = this.blockEls().indexOf(el);
    const b = this.model[i];
    if (i < 0 || !b || !isWords(b)) return;
    const runs = domToRuns(el);
    let op = runsDiff(i, b.runs, runs);
    // (The caret is read against the block as composed: words composed at its end are past what the model had.)
    const sel = this.readSel(this.model.map((x, k) => (k === i ? { ...b, runs } : x))) ?? caret(i, runLength(runs));
    const held = this.composeHeld;
    this.composeHeld = null;
    // Words composed just after spaces whose marks the format let go of (a bold word and a space) are typed as letters
    // are: with the marks in force, and the spaces take them back (typeRuns).
    if (op?.op === 'text' && held?.block === i && op.from === held.to && op.to === held.to) {
      const marked = op.runs.map((r): Run => (isAtomic(r) ? r : { ...r, ...this.fmt }));
      op = typeRuns(this.model, caret(i, held.to), marked, held).ops[0] ?? op;
    }
    this.fresh = i;
    this.armed = !!op;
    if (op) this.emit([op], sel, 'type');
    else {
      this._sel = sel;
      // A selection the host asked for during the composition is written now.
      if (this.pendingSel && !this.isUpdatePending) this.flushSel();
    }
  };

  /* ---------- commands ---------- */

  /** The linked words around a position, as a selection; null when the caret is not in a link. */
  private linkSpan(pos: Pos): { sel: Sel; href: string } | null {
    const b = this.model[pos.block];
    if (!isWords(b)) return null;
    const hit = (pos.offset > 0 ? runAt(b.runs, pos.offset - 1) : null) ?? runAt(b.runs, pos.offset);
    if (!hit?.run.href) return null;
    return { sel: { anchor: { block: pos.block, offset: hit.start }, focus: { block: pos.block, offset: hit.start + hit.run.t.length } }, href: hit.run.href };
  }

  /** Do a thing: a mark, a kind of block, an insertion. Some take a word: the address for 'link', the name for 'icon' (or an emoji, put in as words). */
  exec(cmd: Command, arg?: string) {
    const model = this.model;
    const sel = this.current();
    const go = (e: { ops: Op[]; sel: Sel } | null) => e && this.emit(e.ops, e.sel, undefined, 'focus');
    switch (cmd) {
      case 'b':
      case 'i':
      case 'u':
      case 's':
      case 'h':
      case 'c':
        if (collapsed(sel)) {
          const fmt = { ...this.fmt };
          fmt[cmd as Mark] ? delete fmt[cmd as Mark] : (fmt[cmd as Mark] = true);
          this.fmt = fmt;
          this.focus();
          return void this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: sel, bubbles: true }));
        }
        return go(toggleMark(model, sel, cmd as Mark));
      case 'link': {
        const link = collapsed(sel) ? this.linkSpan(sel.anchor) : null;
        if (arg === undefined) return void (this.bubble?.hide(), this.linkPop.ask(this.selRect(link?.sel ?? sel), link?.href ?? ''));
        if (!arg) return go(setMark(model, link?.sel ?? sel, 'href', ''));
        if (link) return go(setMark(model, link.sel, 'href', arg));
        if (collapsed(sel)) return go(insertRuns(model, sel, [{ t: arg, href: arg }]));
        return go(setMark(model, sel, 'href', arg));
      }
      case 'unlink': {
        const link = collapsed(sel) ? this.linkSpan(sel.anchor) : null;
        return go(setMark(model, link?.sel ?? sel, 'href', ''));
      }
      case 'fn': {
        if (!this.notes || this.marksOnly) return;
        // Over words selected, the mark goes after them (the words stay); then the host opens its note where the notes are.
        const [, a] = ordered(sel);
        const e = insertRuns(model, { anchor: a, focus: a }, [{ t: '', fn: '' }]);
        const b = model[a.block];
        const nth = isWords(b) ? b.runs.slice(0, runAt(b.runs, a.offset)?.index ?? b.runs.length).filter((r) => r.fn !== undefined).length : 0;
        this.bubble?.hide();
        this.emit(e.ops, e.sel, undefined, null);
        return void this.dispatchEvent(new CustomEvent<NoteAt>('text-note', { detail: { block: a.block, nth }, bubbles: true }));
      }
      case 'icon':
        // An icon's name is an icon; an emoji (the picker's other set) is a character, typed in like any other.
        return arg ? go(insertRuns(model, sel, [isIconName(arg) ? { t: '', ic: arg } : { t: arg, ...this.fmt }])) : undefined;
      case 'date':
        return go(insertRuns(model, sel, [{ t: dateString(new Date(), { dateStyle: 'long' }), ...this.fmt }]));
      case 'title':
      case 'h1':
      case 'h2':
      case 'p':
      case 'quote':
      case 'ul':
      case 'ol':
        return go(setKind(model, sel, cmd));
      case 'indent':
      case 'outdent':
        return go(shiftItems(model, sel, cmd === 'indent' ? 1 : -1));
      case 'left':
      case 'center':
      case 'right':
      case 'justify':
        return go(align(model, sel, cmd));
    }
  }

  /* ---------- footnotes and links ---------- */

  /** A footnote's mark tapped, or Enter on it: the host is asked to open its note (`text-note`), where it draws the notes. */
  private askNote(chip: HTMLElement) {
    const el = this.blockElOf(chip);
    if (!el) return;
    const block = this.blockEls().indexOf(el);
    const nth = [...el.querySelectorAll('.fn')].indexOf(chip);
    this.linkPop.hide();
    this.bubble?.hide();
    this.dispatchEvent(new CustomEvent<NoteAt>('text-note', { detail: { block, nth }, bubbles: true }));
  }
  /** The link box closed, and the bubble; whether the box was open (an Escape that closed it goes no further). */
  private closePops(): boolean {
    const open = !!this.linkPop?.shown;
    this.endComplete();
    this.linkPop?.hide();
    this.bubble?.hide();
    return open;
  }
  /** Whether the selection is whole blocks of words that can be a list (a paragraph, an item, a heading). */
  private wholeBlocks(sel: Sel): boolean {
    const m = this.model;
    const [a, b] = ordered(sel);
    if (a.offset !== 0 || b.offset < blockLength(m[b.block])) return false;
    for (let i = a.block; i <= b.block; i++) if (!['p', 'li', 'h'].includes(m[i].k) || !isWords(m[i])) return false;
    return true;
  }
  /** The selection bubble, as the selection is now: up under words selected while the editor has the focus, else gone. */
  private syncBubble() {
    this.syncComplete();
    const bub = this.bubble;
    if (!bub) return;
    // Held within the blocks as they are now: a host may have taken blocks away under a selection it has not moved yet.
    const sel = this._sel && clampSel(this.model, this._sel);
    const a = document.activeElement;
    const focused = this.hasFocus() || (!!a && bub.contains(a));
    // A DOM selection inside a card is the card's own (a grid's cell, a document's words), not words of ours.
    const dom = !this.writing && !this.pendingSel ? document.getSelection() : null;
    const inCard = (n: Node | null | undefined) => !!(n && (n instanceof Element ? n : n.parentElement)?.closest('.tx-card'));
    if (this.noBubble || this.composing || !sel || collapsed(sel) || !focused || this.linkPop?.shown || inCard(dom?.anchorNode) || inCard(dom?.focusNode)) return bub.hide();
    const items = contextOf(TEXT_COMMANDS, this);
    bub.items = items;
    bub.show(() => (this._sel && !collapsed(this._sel) && this.isConnected ? this.selRect(this._sel) : null));
  }
  /** Where a selection is on the screen, for a bubble. */
  private selRect(sel: Sel): DOMRect {
    const a = this.domPoint(sel.anchor);
    const f = this.domPoint(sel.focus);
    const r = document.createRange();
    if (a && f) {
      const [s, e] = ordered(sel);
      const sp = this.domPoint(s)!;
      const ep = this.domPoint(e)!;
      r.setStart(sp[0], sp[1]);
      r.setEnd(ep[0], ep[1]);
      const rect = r.getBoundingClientRect();
      if (rect.height || rect.width) return rect;
    }
    return this.tx.getBoundingClientRect();
  }
  /** The link bubble, when the caret sits in linked words. */
  private showLink() {
    const s = this._sel;
    const link = s && collapsed(s) ? this.linkSpan(s.anchor) : null;
    if (!link) return void this.linkPop.hide();
    if (this.linkPop.editing) return;
    this.linkPop.show(this.selRect(link.sel), link.href);
  }
  private onLinkSet = (e: CustomEvent<string>) => {
    e.stopPropagation();
    this.exec('link', e.detail);
    // An empty box set where there was no link changes nothing: the focus comes back to the words all the same (walks: Mod+K, Enter).
    if (!this.hasFocus()) this.onLinkCancel(e);
  };
  private onLinkRemove = (e: Event) => {
    e.stopPropagation();
    this.exec('unlink');
  };
  /** The address box let go of (Escape, a tap outside): the focus and the selection come back to the words. */
  private onLinkCancel = (e: Event) => {
    e.stopPropagation();
    if (this._sel) this.sel = this._sel;
    else this.focus();
  };

  /* ---------- completing ":word" ---------- */

  /** Whether icons may go in here: not in a drawn label (marks-only) nor in plain words (no-bubble), whose hosts keep no icon run. */
  private get iconsHere(): boolean {
    return !this.marksOnly && !this.noBubble;
  }
  /** The ":word" just before a caret: a ":" at the start of the block or after a space, then letters, digits or hyphens. */
  private trigger(sel: Sel | null): Trigger | null {
    if (!sel || !collapsed(sel)) return null;
    const { block, offset } = sel.focus;
    const b = this.model[block];
    if (!b || !isWords(b)) return null;
    const before = b.runs
      .map((r) => (isAtomic(r) ? '\uFFFC' : r.t))
      .join('')
      .slice(0, offset);
    const m = /(?:^|\s):([A-Za-z0-9][A-Za-z0-9-]*)$/.exec(before);
    return m ? { block, start: offset - m[1].length - 1, end: offset, query: m[1].toLowerCase() } : null;
  }
  private completeOpen(): boolean {
    return !!this.completing && !!this.completePop?.shown;
  }
  /** The completion as the words and the caret are now: opened by a letter typed, kept while the caret is in the same ":word", else closed. */
  private syncComplete() {
    // A write on its way: the words and the caret are not settled yet.
    if (this.pendingSel || this.composing) return;
    const tr = this.hasFocus() ? this.trigger(this._sel) : null;
    const same = (a: Trigger | null) => !!a && !!tr && a.block === tr.block && a.start === tr.start;
    const armed = this.armed;
    this.armed = false;
    if (!tr) this.dismissed = null;
    if (!tr || same(this.dismissed) || (!same(this.completing) && !armed)) return this.endComplete();
    if (!this.completing) void loadCompletions().then(() => this.completing && this.showCompletions());
    this.completing = tr;
    this.showCompletions();
  }
  private showCompletions() {
    const pop = this.completePop;
    const tr = this.completing;
    if (!pop || !tr) return;
    const items = completions(tr.query, this.iconsHere);
    if (!items.length) return this.ariaComplete(false);
    void pop.show(this.selRect({ anchor: { block: tr.block, offset: tr.start }, focus: { block: tr.block, offset: tr.end } }), items).then(() => this.ariaComplete(this.completeOpen()));
  }
  private ariaComplete(open: boolean) {
    const tx = this.tx;
    const pop = this.completePop;
    if (!tx) return;
    if (open && pop) {
      if (!pop.shown) return;
      window.addEventListener('keydown', this.onCompleteKey, true);
      tx.setAttribute('aria-autocomplete', 'list');
      tx.setAttribute('aria-controls', pop.uid);
      tx.setAttribute('aria-activedescendant', pop.activeId);
    } else {
      pop?.hide();
      window.removeEventListener('keydown', this.onCompleteKey, true);
      for (const a of ['aria-autocomplete', 'aria-controls', 'aria-activedescendant']) tx.removeAttribute(a);
    }
  }
  private endComplete() {
    this.completing = null;
    this.ariaComplete(false);
  }
  /**
   * The keys while the list is up: Up/Down, Enter or Tab, Escape. Taken on the window before anyone else (a host
   * that moves between cells or rows on these keys listens around the editor, some in the capture phase), and
   * stopped there; every other key goes on as ever.
   */
  private onCompleteKey = (e: KeyboardEvent) => {
    const pop = this.completePop;
    if (!pop || !this.completeOpen() || e.isComposing || this.composing || e.altKey || e.metaKey || e.ctrlKey) return;
    if (!(e.target instanceof Node) || !this.tx?.contains(e.target)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      pop.move(e.key === 'ArrowDown' ? 1 : -1);
      this.tx.setAttribute('aria-activedescendant', pop.activeId);
    } else if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) this.pickCompletion();
    else if (e.key === 'Escape') {
      this.dismissed = this.completing;
      this.endComplete();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };
  /** What a pick puts in: an icon run, or the emoji as words with the marks in force. */
  private completed(c: Completion): Run {
    return c.kind === 'icon' ? { t: '', ic: c.value } : { t: c.value, ...this.fmt };
  }
  /** The ":word" replaced by the row picked (the highlighted one by default): one edit, the caret after it. */
  private pickCompletion(c = this.completePop?.current) {
    const tr = this.completing;
    this.endComplete();
    if (!tr || !c) return;
    const r = insertRuns(this.model, { anchor: { block: tr.block, offset: tr.start }, focus: { block: tr.block, offset: tr.end } }, [this.completed(c)]);
    this.emit(r.ops, r.sel, undefined, 'focus');
  }
  private onCompletePick = (e: CustomEvent<Completion>) => {
    e.stopPropagation();
    this.pickCompletion(e.detail);
  };
  private onCompleteCancel = (e: Event) => {
    e.stopPropagation();
    this.dismissed = this.completing;
    this.endComplete();
  };

  /* ---------- drawing ---------- */

  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('blocks')) {
      inherit(changed.get('blocks') as Block[] | undefined, this.blocks, this.fresh);
      this.fresh = -1;
    }
  }
  protected updated(changed: Map<string, unknown>) {
    this.flushSel();
    // New blocks under the same selection: the marks there may have changed (Bold over a range); the host's bar is told.
    if (changed.has('blocks') && this._sel && this.hasUpdated && changed.get('blocks') !== undefined) {
      this.fmt = this.heldAt(this._sel) ?? marksOf(this.model, this._sel);
      this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: this._sel, bubbles: true }));
    }
    this.syncBubble();
  }

  private words(s: string): unknown[] {
    const out: unknown[] = [];
    s.split('\n').forEach((part, i) => {
      if (i) out.push(html`<br data-nl />`);
      if (part) out.push(part);
    });
    return out;
  }
  private renderRuns(runs: Run[], notes: () => number): unknown[] {
    if (!runs.length) return [html`<br />`];
    const out: unknown[] = runs.map((r) => {
      if (r.ic) {
        // The icon itself; a name outside the starter set brings the rest of Lucide (drawn again when it joins); a name nothing has stays its name, small.
        const node = iconNamed(r.ic);
        if (!node && !iconsComplete()) void loadIcons();
        return html`<span class="ic ${node ? '' : 'ic-name'}" data-icon=${r.ic} data-atomic contenteditable="false" role="img" aria-label=${r.ic}>${node ? icon(node, 16) : r.ic}</span>`;
      }
      if (r.fn !== undefined) {
        const n = notes();
        return html`<sup class="fn" data-fn=${r.fn} data-atomic contenteditable="false" tabindex="0" role="button" aria-label=${t('common-footnote-n', { n })}>${n}</sup>`;
      }
      let node: unknown = this.words(r.t);
      if (r.c) node = html`<code>${node}</code>`;
      if (r.h) node = html`<mark>${node}</mark>`;
      if (r.s) node = html`<s>${node}</s>`;
      if (r.u) node = html`<u>${node}</u>`;
      if (r.i) node = html`<i>${node}</i>`;
      if (r.b) node = html`<b>${node}</b>`;
      if (r.href) node = html`<a href=${r.href} rel="noopener">${node}</a>`;
      return node;
    });
    const last = runs[runs.length - 1];
    if (!isAtomic(last) && last.t.endsWith('\n')) out.push(html`<br />`);
    return out;
  }
  private renderCard(b: Block, at: number): TemplateResult {
    const own = this.card?.(b, at);
    if (own) return html`<div class="tx-card tx-card-own" data-k=${b.k} contenteditable="false" tabindex="0">${own}</div>`;
    switch (b.k) {
      case 'hr':
        return html`<div class="tx-card" data-k="hr" contenteditable="false" tabindex="0" role="separator"><hr /></div>`;
      case 'table':
        return html`<div class="tx-card" data-k="table" contenteditable="false" tabindex="0" role="group" aria-label=${t('common-table')}><span class="tx-card-kind">${t('common-table')}</span><span class="tx-card-gist">${b.cols.map((c) => c.name).join(' · ')} — ${t('editor-n-rows', { n: b.rows.length })}</span></div>`;
      case 'fence': {
        const def = b.lang ? lookup.appOf(b.lang) : undefined;
        const kind = def ? t('common-noun', { noun: def.noun }) : b.lang ? t('common-app-document', { app: b.lang }) : t('editor-code');
        // A locked document's body is its sealed link: nothing to read (kit/share/locked.ts).
        const gist = b.lang === 'locked' ? '' : (b.body.split('\n').find((l) => l.trim() && !/^---/.test(l)) ?? '');
        return html`<div class="tx-card" data-k="fence" contenteditable="false" tabindex="0" role="group" aria-label=${kind}><span class="tx-card-kind">${kind}</span><span class="tx-card-gist">${gist.slice(0, 80)}</span></div>`;
      }
      case 'edge':
        return html`<div class="tx-card" data-k="edge" contenteditable="false" tabindex="0" role="group" aria-label=${t('editor-connection')}><span class="tx-card-gist">${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}</span></div>`;
      default:
        return html`<div class="tx-card" contenteditable="false"></div>`;
    }
  }
  private renderBlock(b: Block, at: number, n: number | undefined, notes: () => number, place?: { pos: number; size: number }): TemplateResult {
    if (!isWords(b)) return this.renderCard(b, at);
    const cls = (b.a?.cls ?? []).filter((c) => c === 'center' || c === 'right' || c === 'justify' || c === 'title').join(' ');
    const inner = this.renderRuns(b.runs, notes);
    switch (b.k) {
      case 'h':
        if (b.level === 1) return hasClass(b, 'title') ? html`<h1 class="title ${cls}">${inner}</h1>` : html`<h1 class=${cls}>${inner}</h1>`;
        if (b.level === 2) return html`<h2 class=${cls}>${inner}</h2>`;
        if (b.level === 3) return html`<h3 class=${cls}>${inner}</h3>`;
        return html`<h4 class=${cls} data-level=${b.level}>${inner}</h4>`;
      case 'li':
        return html`<li
          role=${place ? 'listitem' : 'none'}
          aria-level=${place ? b.depth + 1 : nothing}
          aria-posinset=${place?.pos ?? nothing}
          aria-setsize=${place?.size ?? nothing}
          class=${cls}
          style=${`--d:${b.depth}`}
          data-n=${n ?? nothing}
          data-done=${b.done === undefined ? nothing : String(b.done)}
        >${b.done === undefined || !place ? nothing : html`<span class="sr-only" data-said contenteditable="false">${b.done ? t('editor-done-lowercase') : t('editor-not-done')} </span>`}${inner}</li>`;
      case 'quote':
        return html`<blockquote class=${cls}>${inner}</blockquote>`;
      default:
        return html`<p class=${cls}>${inner}</p>`;
    }
  }
  render() {
    const model = this.model;
    const numbers = listNumbers();
    let notes = this.noteStart;
    const next = () => ++notes;
    const blank = model.length === 1 && isWords(model[0]) && !model[0].runs.length;
    const locked = this.locked;
    // A line is one block whose host says what is round it (a task's row has its own box): no list there.
    const places = this.shape === 'line' ? [] : listPlaces(model);
    // Each block drawn in order (the numbers and the notes count as they go), then placed: a run of items is one list.
    const drawn = model.map((b, i) => this.renderBlock(b, i, numbers(b), next, places[i]));
    const parts: number[][] = [];
    model.forEach((_, i) => (places[i] && places[i - 1] ? parts[parts.length - 1].push(i) : parts.push([i])));
    const part = (p: number[]) =>
      places[p[0]]
        ? html`<div class=${LIST} role="list">${repeat(
            p,
            (i) => keyAt(model[i], i),
            (i) => drawn[i],
          )}</div>`
        : drawn[p[0]];
    // Nothing but the blocks inside the box: it keeps white space as typed, so a newline of this template would be a line.
    return html`<div
        class="tx ${blank ? 'blank' : ''}"
        contenteditable=${locked ? 'false' : 'true'}
        tabindex=${locked ? '0' : nothing}
        aria-readonly=${locked ? 'true' : nothing}
        role="textbox"
        aria-multiline=${this.shape === 'line' ? 'false' : 'true'}
        aria-label=${this.label || nothing}
        data-placeholder=${this.placeholder || nothing}
        aria-placeholder=${this.placeholder || nothing}
        spellcheck="true"
        autocapitalize="sentences"
        enterkeyhint=${this.shape === 'line' ? 'done' : 'enter'}
        @beforeinput=${this.onBeforeInput}
        @keydown=${this.onKeyDown}
        @focusout=${this.onFocusOut}
        @click=${this.onClick}
        @compositionstart=${this.onCompositionStart}
        @compositionend=${this.onCompositionEnd}
        @copy=${this.onCopy}
        @cut=${this.onCopy}
        @paste=${this.onPaste}
      >${repeat(parts, (p) => (places[p[0]] ? `list${keyAt(model[p[0]], p[0])}` : keyAt(model[p[0]], p[0])), part)}</div>
      <to-link-pop @link-set=${this.onLinkSet} @link-remove=${this.onLinkRemove} @link-cancel=${this.onLinkCancel}></to-link-pop>
      <to-complete @complete-pick=${this.onCompletePick} @complete-cancel=${this.onCompleteCancel}></to-complete>
      <to-context class="tx-bubble" .label=${t('common-format')}></to-context>`;
  }
}
if (!customElements.get('to-text')) customElements.define('to-text', ToText);

declare global {
  interface HTMLElementTagNameMap {
    'to-text': ToText;
  }
}
