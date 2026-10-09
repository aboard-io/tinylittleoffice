/**
 * <to-text>: the one rich-text editor (docs/kernel.md §4). It is given a
 * span of blocks and draws them; every `beforeinput` is prevented and
 * turned into operations (textops.ts), fired as `text-ops` for the host to
 * apply; the host hands the new blocks back and only the blocks whose
 * identity changed are drawn again (Lit's repeat, keyed by the block
 * object). The selection lives in the model as a Pos pair and is written to
 * the DOM after each draw; `selectionchange` reads it back. The DOM is read
 * in one place only: the block the IME composed in, at compositionend.
 *
 * Three shapes. `doc`: any block, Enter splits, embeds are cards the caret
 * skips. `lines`: items and paragraphs (a slide's words), Backspace at the
 * start says `text-exit` ({dir: 'back'}). `line`: one block, Enter says
 * `text-enter`, Delete at its end says `text-exit` ({dir: 'forward'}), and
 * Select All with the line already whole says `text-selectall`: the host
 * owns what is around the line.
 *
 * What is not words (a table, a picture, another document, a web address
 * alone on its line) is a card: `contenteditable=false`, skipped by the caret,
 * taken out whole. The host may draw a card's inside through `card` (a table
 * as a grid, an address as a thing from the web); whatever it puts there
 * (inputs, buttons) keeps its own events. A task item's box is tapped to tick.
 *
 * Words selected bring up the selection bubble (a <to-context> centred
 * under them): the marks, Link, Footnote and, over whole blocks of words in
 * a doc or lines editor, the two lists. It goes when the selection collapses
 * or leaves, while an IME composes, and while the link or note box is open;
 * `no-bubble` turns it off.
 *
 * Nothing here calls execCommand, sets innerHTML, or reads it.
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { apply, hasClass, isAtomic, isEmbed, listNumbers, normalRuns, refFence, runLength, type Block, type Op, type Run } from '../doc/index.ts';
import { copyData, pasteFrom } from './clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from './context.ts';
import { t } from './i18n.ts';
import { UI, type IconNode } from './icons.ts';
import { align, alignAt, backspace, blockLength, caret, charAt, clampSel, collapsed, deleteSel, forwardDelete, insertBlocks, insertRuns, isWords, kindAt, marksOf, ordered, runAt, sameSel, setKind, setMark, shiftItems, shortcut, skipEmbed, smartQuote, splitAt, toggleMark, runsDiff, type Command, type Fmt, type Mark, type Pos, type Sel, type Shape } from './textops.ts';
import type { ToLinkPop } from './link-pop.ts';
import type { ToNotePop } from './note-pop.ts';
import './context.ts';
import './link-pop.ts';
import './note-pop.ts';

export type { Command, Fmt, Pos, Sel, Shape } from './textops.ts';

/** What `text-ops` carries: the ops, the selection after them, the one before, and 'type' when the edit is a letter typed or taken out (undo folds those). */
export interface TextOps {
  ops: Op[];
  sel: Sel;
  before: Sel | null;
  kind?: 'type';
}

const EMPTY: Block = { k: 'p', runs: [] };
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
const WEBKIT = typeof navigator !== 'undefined' && /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);
const DELETES = new Set(['deleteWordBackward', 'deleteWordForward', 'deleteSoftLineBackward', 'deleteSoftLineForward', 'deleteHardLineBackward', 'deleteHardLineForward', 'deleteContent', 'deleteByCut', 'deleteByDrag']);
const FORMATS: Record<string, Command> = { formatBold: 'b', formatItalic: 'i', formatUnderline: 'u', formatStrikeThrough: 's', insertOrderedList: 'ol', insertUnorderedList: 'ul', formatIndent: 'indent', formatOutdent: 'outdent', formatJustifyLeft: 'left', formatJustifyCenter: 'center', formatJustifyRight: 'right', formatJustifyFull: 'justify' };

/**
 * A block's element read back as runs: text nodes with the marks of the
 * elements around them, the two atomic chips, a marked <br> as a line
 * break. Used once, at compositionend.
 */
export function domToRuns(el: HTMLElement): Run[] {
  const out: Run[] = [];
  const walk = (n: Node, m: Fmt) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const words = (n.textContent ?? '').replace(/ /g, ' ');
      if (words) out.push({ t: words, ...m });
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const e = n as HTMLElement;
    if (e.dataset.icon !== undefined) return void out.push({ t: '', ic: e.dataset.icon });
    if (e.dataset.fn !== undefined) return void out.push({ t: '', fn: e.dataset.fn });
    if (e.tagName === 'BR') return void (e.dataset.nl !== undefined && out.push({ t: '\n' }));
    const next: Fmt = { ...m };
    if (e.tagName === 'B' || e.tagName === 'STRONG') next.b = true;
    if (e.tagName === 'I' || e.tagName === 'EM') next.i = true;
    if (e.tagName === 'U') next.u = true;
    if (e.tagName === 'S' || e.tagName === 'DEL') next.s = true;
    if (e.tagName === 'MARK') next.h = true;
    if (e.tagName === 'A' && e.getAttribute('href')) next.href = e.getAttribute('href')!;
    for (const c of e.childNodes) walk(c, next);
  };
  for (const c of el.childNodes) walk(c, {});
  return normalRuns(out);
}

export class ToText extends LitElement {
  static properties = { blocks: { attribute: false }, shape: {}, noteStart: { type: Number, attribute: 'note-start' }, label: {}, placeholder: {}, card: { attribute: false }, noBubble: { type: Boolean, attribute: 'no-bubble' } };
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

  private _sel: Sel | null = null;
  /** The marks the next letter typed will carry. */
  private fmt: Fmt = {};
  private composing = false;
  private composingEl: HTMLElement | null = null;
  /** Write the model selection to the DOM after the next draw; 'focus' takes the focus too. */
  private pendingSel: 'keep' | 'focus' | null = null;
  /** A selection write is on its way (WebKit's is a frame later): what the DOM says meanwhile is stale and not read back. */
  private writing = false;
  /** The footnote open in the popover: its block, and which of the block's marks it is. */
  private noting: { block: number; nth: number } | null = null;
  /** The selection has left the editor (said once). */
  private away = false;
  /** The block an IME just composed in: drawn afresh on the next draw, not updated in place. */
  private fresh = -1;

  constructor() {
    super();
    this.blocks = [];
    this.shape = 'doc';
    this.noteStart = 0;
    this.label = '';
    this.placeholder = '';
    this.card = null;
    this.noBubble = false;
  }
  createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('selectionchange', this.onSelectionChange);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('selectionchange', this.onSelectionChange);
  }

  /** The blocks as drawn: an editor with none shows one empty paragraph to type into. */
  get model(): Block[] {
    return this.blocks.length ? this.blocks : [EMPTY];
  }
  /** The editable box. */
  get tx(): HTMLElement {
    return this.querySelector<HTMLElement>(':scope > .tx')!;
  }
  private get notePop(): ToNotePop {
    return this.querySelector<ToNotePop>(':scope > to-note-pop')!;
  }
  private get linkPop(): ToLinkPop {
    return this.querySelector<ToLinkPop>(':scope > to-link-pop')!;
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
    if (!s) return;
    this.pendingSel = 'focus';
    // Drawn and nothing pending: written now; otherwise updated() writes it after the draw.
    if (this.hasUpdated && !this.isUpdatePending) this.flushSel();
  }
  /** The marks at the caret (what a bar shows pressed). */
  get marks(): Fmt {
    return this.fmt;
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

  private blockEls(): HTMLElement[] {
    return [...this.tx.children] as HTMLElement[];
  }
  private blockElOf(node: Node | null): HTMLElement | null {
    const tx = this.tx;
    while (node && node.parentNode !== tx) node = node.parentNode;
    return node instanceof HTMLElement ? node : null;
  }

  /** A DOM point as a position: characters counted through the block's text nodes, chips and line breaks as one each. */
  readPos(node: Node, offset: number): Pos | null {
    const model = this.model;
    const tx = this.tx;
    if (node === tx) {
      const n = model.length;
      return offset >= n ? skipEmbed(model, { block: n - 1, offset: blockLength(model[n - 1]) }, -1) : skipEmbed(model, { block: offset, offset: 0 }, 1);
    }
    const el = this.blockElOf(node);
    if (!el) return null;
    const block = this.blockEls().indexOf(el);
    if (block < 0) return null;
    if (!isWords(model[block])) return skipEmbed(model, { block, offset: 0 }, 1);
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
    if (!isWords(this.model[pos.block])) return [this.tx, pos.block];
    let left = pos.offset;
    let last: [Node, number] = [el, 0];
    const index = (e: Node) => Array.prototype.indexOf.call(e.parentNode!.childNodes, e);
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
      if (e.dataset.atomic !== undefined || e.tagName === 'BR') {
        const w = e.tagName === 'BR' ? (e.dataset.nl !== undefined ? 1 : 0) : 1;
        if (left === 0 && w) return [e.parentNode!, index(e)];
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
  readSel(): Sel | null {
    const s = document.getSelection();
    if (!s?.anchorNode || !s.focusNode || !this.tx) return null;
    if (!this.tx.contains(s.anchorNode) || !this.tx.contains(s.focusNode)) return null;
    const anchor = this.readPos(s.anchorNode, s.anchorOffset);
    const focus = this.readPos(s.focusNode, s.focusOffset);
    return anchor && focus ? { anchor, focus } : null;
  }
  private onSelectionChange = () => {
    // While a write is pending the DOM caret is wherever the draw left it (WebKit puts it at 0 of a text node updated in place): not ours to read.
    if (this.composing || this.pendingSel || this.writing || !this.isConnected) return;
    const s = this.readSel();
    if (!s) {
      if (!this.away) {
        this.away = true;
        this.linkPop?.hide();
        this.bubble?.hide();
        this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: null, bubbles: true }));
      }
      return;
    }
    this.away = false;
    if (sameSel(s, this._sel)) return this.syncBubble();
    this._sel = s;
    this.fmt = marksOf(this.model, s);
    this.showLink();
    this.syncBubble();
    this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: s, bubbles: true }));
  };
  private flushSel() {
    const how = this.pendingSel;
    if (!how) return;
    this.pendingSel = null;
    this.writing = true;
    const go = () => {
      this.writing = false;
      const s = this._sel;
      if (!s || !this.isConnected || !this.tx) return;
      if (how === 'focus') this.focus();
      else if (!this.hasFocus()) return;
      const a = this.domPoint(s.anchor);
      const f = this.domPoint(s.focus);
      const dom = document.getSelection();
      if (!a || !f || !dom) return;
      dom.setBaseAndExtent(a[0], a[1], f[0], f[1]);
      this.keepCaretVisible(dom);
      this.syncBubble();
    };
    // Safari drops a selection set in the same task as a DOM swap.
    WEBKIT ? requestAnimationFrame(go) : go();
  }
  /** The caret kept inside the visual viewport (above a phone's keyboard) after a draw moved it. */
  private keepCaretVisible(dom: Selection) {
    if (!dom.rangeCount) return;
    const r = dom.getRangeAt(0).getBoundingClientRect();
    if (!r.height) return;
    const vv = window.visualViewport;
    const top = (vv?.offsetTop ?? 0) + 8;
    const bottom = (vv?.offsetTop ?? 0) + (vv?.height ?? window.innerHeight) - 8;
    if (r.bottom > bottom) window.scrollBy({ top: r.bottom - bottom });
    else if (r.top < top) window.scrollBy({ top: r.top - top });
  }

  /* ---------- edits ---------- */

  /**
   * The ops are the host's to apply; the selection after them is kept here
   * and written once the host's new `blocks` are drawn (the draw comes from
   * that property alone, whether the host applies the ops in the event or
   * in a render of its own).
   */
  private emit(ops: Op[], sel: Sel, kind?: 'type', how: 'keep' | 'focus' | null = 'keep') {
    if (!ops.length) return;
    const before = this._sel;
    if (!this.blocks.length) ops = [{ op: 'splice', at: 0, n: 0, blocks: [EMPTY] }, ...ops];
    this._sel = sel;
    if (how) this.pendingSel = how;
    this.dispatchEvent(new CustomEvent<TextOps>('text-ops', { detail: { ops, sel, before, ...(kind ? { kind } : {}) }, bubbles: true }));
  }
  private current(): Sel {
    const m = this.model;
    return this._sel ? clampSel(m, this._sel) : this.readSel() ?? caret(m.length - 1, blockLength(m[m.length - 1]));
  }

  /** Whether an event comes from a control the host put inside a card (an input, a button): its own, not the editor's. */
  private ownEvent(e: Event): boolean {
    const el = e.target as HTMLElement | null;
    return !!el?.closest?.('.tx-card') && (el.matches?.('input, textarea, select, button, a, [contenteditable="true"]') || !!el.closest?.('input, textarea, select, button, a, .tx-card [contenteditable="true"]'));
  }

  private onBeforeInput = (e: InputEvent) => {
    if (this.ownEvent(e)) return;
    if (this.composing || e.isComposing || /Composition/.test(e.inputType)) return;
    e.preventDefault();
    const model = this.model;
    const target = e.getTargetRanges?.()[0];
    const sel = this.current();
    const type = e.inputType;
    const exit = (dir: 'back' | 'forward') => this.dispatchEvent(new CustomEvent<{ dir: 'back' | 'forward' }>('text-exit', { detail: { dir }, bubbles: true }));
    // Backspace at the very start says `text-exit` (back); in a line, Delete at the very end says it too (forward): the host owns what is around the line.
    const edit = (r: ReturnType<typeof backspace>, forward = false) => (r === 'exit' ? exit('back') : r ? this.emit(r.ops, r.sel, 'type') : forward && this.shape === 'line' && collapsed(sel) ? exit('forward') : undefined);
    switch (type) {
      case 'insertText':
        return this.typed(e.data ?? '', sel);
      case 'insertReplacementText':
        return this.typed(e.data ?? e.dataTransfer?.getData('text/plain') ?? '', (target && this.rangeSel(target)) ?? sel, false);
      case 'insertParagraph':
        return this.enter(sel);
      case 'insertLineBreak': {
        const [a] = ordered(sel);
        if (this.shape === 'doc' && model[a.block].k === 'p') return this.put(sel, [{ t: '\n' }]);
        return this.enter(sel);
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
    if (data === ' ') {
      const s = shortcut(model, sel, this.shape);
      if (s) return this.emit(s.ops, s.sel);
    }
    let words = data;
    if (data === '"' || data === "'") {
      const [a] = ordered(sel);
      const b = model[a.block];
      words = smartQuote(data, isWords(b) ? charAt(b.runs, a.offset - 1) : '');
    }
    this.put(sel, [{ t: words, ...(marks ? this.fmt : {}) }]);
  }
  private put(sel: Sel, runs: Run[]) {
    const model = this.model;
    const e = insertRuns(model, sel, runs);
    const [a] = ordered(sel);
    const op = e.ops[0];
    // The words typed have made the paragraph one web address: it is a card now, and the caret goes on to the words after it (a new paragraph when there are none).
    if (e.ops.length === 1 && op.op === 'text' && isEmbed(apply({ head: {}, blocks: [model[a.block]] }, { ...op, at: 0 }).blocks[0])) {
      const next = model[a.block + 1];
      if (next && isWords(next)) return this.emit(e.ops, caret(a.block + 1, 0), 'type');
      return this.emit([...e.ops, { op: 'splice', at: a.block + 1, n: 0, blocks: [{ k: 'p', runs: [] }] }], caret(a.block + 1, 0), 'type');
    }
    this.emit(e.ops, e.sel, 'type');
  }
  private enter(sel: Sel) {
    if (this.shape === 'line') return void this.dispatchEvent(new CustomEvent('text-enter', { bubbles: true }));
    const e = splitAt(this.model, sel);
    this.emit(e.ops, e.sel);
  }
  private paste(data: { text: string; html: string }, sel: Sel) {
    const got = pasteFrom(data, this.shape);
    if (!got) return;
    const e = 'runs' in got ? insertRuns(this.model, sel, got.runs) : insertBlocks(this.model, sel, got.blocks);
    this.emit(e.ops, e.sel);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.ownEvent(e)) return;
    const chip = (e.target as HTMLElement).closest?.('.fn');
    if (chip && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      return this.openNoteOf(chip as HTMLElement);
    }
    if (e.key === 'Escape') return this.closePops();
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      // Select all in a line: the first press takes the line (the browser's own); with the line already whole, or empty, the host is asked for everything (`text-selectall`).
      if (k === 'a' && this.shape === 'line' && !e.shiftKey) {
        const m = this.model;
        const sel = this.current();
        const [a, b] = ordered(sel);
        const whole = a.offset === 0 && b.offset >= blockLength(m[m.length - 1]) && a.block === 0 && b.block === m.length - 1;
        if (whole) {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent('text-selectall', { bubbles: true }));
        }
        return;
      }
      const cmd = k === 'b' ? 'b' : k === 'i' ? 'i' : k === 'u' ? 'u' : k === 'k' ? 'link' : null;
      if (cmd && !(e.shiftKey && cmd !== 'link')) {
        e.preventDefault();
        this.exec(cmd);
      }
      return;
    }
    if (e.key === 'Tab' && this.shape !== 'line' && !e.altKey) {
      const sel = this.current();
      if (this.model[ordered(sel)[0].block].k === 'li') {
        e.preventDefault();
        this.exec(e.shiftKey ? 'outdent' : 'indent');
      }
    }
  };
  private onClick = (e: MouseEvent) => {
    if (this.ownEvent(e)) return;
    const el = e.target as HTMLElement;
    const chip = el.closest?.('.fn');
    if (chip && this.tx.contains(chip)) return this.openNoteOf(chip as HTMLElement);
    const card = el.closest?.('.tx-card');
    if (card && this.tx.contains(card)) {
      const block = this.blockEls().indexOf(card as HTMLElement);
      this.dispatchEvent(new CustomEvent<{ block: number }>('text-embed', { detail: { block }, bubbles: true }));
      return;
    }
    // A tap on a task's box ticks it: the box is drawn in the item's left padding.
    const li = el.closest?.('li[data-done]') as HTMLElement | null;
    if (li && this.tx.contains(li) && e.clientX < li.getBoundingClientRect().left + parseFloat(getComputedStyle(li).paddingLeft)) {
      const block = this.blockEls().indexOf(li);
      const b = this.model[block];
      if (b?.k !== 'li') return;
      e.preventDefault();
      this.emit([{ op: 'splice', at: block, n: 1, blocks: [{ ...b, done: !b.done }] }], this._sel ?? caret(block, 0), undefined, null);
    }
  };

  private onCopy = (e: ClipboardEvent) => {
    if (this.ownEvent(e)) return;
    const sel = this.readSel() ?? this._sel;
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
    if (dt) this.paste({ text: dt.getData('text/plain'), html: dt.getData('text/html') }, this.current());
  };

  private onFocusOut = (e: FocusEvent) => {
    const to = e.relatedTarget as Node | null;
    if (!to || !this.bubble?.contains(to)) this.bubble?.hide();
  };
  private onCompositionStart = () => {
    this.composing = true;
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
    const op = runsDiff(i, b.runs, runs);
    const sel = this.readSel() ?? caret(i, runLength(runs));
    this.fresh = i;
    if (op) this.emit([op], sel, 'type');
    else this._sel = sel;
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

  /** Do a thing: a mark, a kind of block, an insertion. Some take a word: the address for 'link', the name for 'icon', the ref for 'embed'. */
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
        // Over words selected, the mark goes after them (the words stay).
        const [, a] = ordered(sel);
        const e = insertRuns(model, { anchor: a, focus: a }, [{ t: '', fn: '' }]);
        const b = model[a.block];
        const nth = isWords(b) ? b.runs.slice(0, runAt(b.runs, a.offset)?.index ?? b.runs.length).filter((r) => r.fn !== undefined).length : 0;
        this.noting = { block: a.block, nth };
        return this.emit(e.ops, e.sel, undefined, null);
      }
      case 'icon':
        return arg ? go(insertRuns(model, sel, [{ t: '', ic: arg }])) : undefined;
      case 'date':
        return go(insertRuns(model, sel, [{ t: new Date().toLocaleDateString(document.documentElement.lang || undefined, { dateStyle: 'long' }), ...this.fmt }]));
      case 'title':
      case 'h1':
      case 'h2':
      case 'p':
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
      case 'embed':
        return arg ? go(insertBlocks(model, sel, [refFence(arg)])) : undefined;
    }
  }

  /* ---------- footnotes and links ---------- */

  /** Which run of the block is its nth footnote mark, and the character offset it sits at. */
  private fnAt(block: number, nth: number): { index: number; offset: number; fn: string } | null {
    const b = this.model[block];
    if (!b || !isWords(b)) return null;
    let offset = 0;
    let seen = 0;
    for (let i = 0; i < b.runs.length; i++) {
      const r = b.runs[i];
      if (r.fn !== undefined && seen++ === nth) return { index: i, offset, fn: r.fn };
      offset += isAtomic(r) ? 1 : r.t.length;
    }
    return null;
  }
  private chipOf(block: number, nth: number): HTMLElement | null {
    return this.blockEls()[block]?.querySelectorAll<HTMLElement>('.fn')[nth] ?? null;
  }
  private openNoteOf(chip: HTMLElement) {
    const el = this.blockElOf(chip);
    if (!el) return;
    const block = this.blockEls().indexOf(el);
    const nth = [...el.querySelectorAll('.fn')].indexOf(chip);
    this.noting = { block, nth };
    this.openNote();
  }
  private openNote() {
    const n = this.noting;
    const hit = n && this.fnAt(n.block, n.nth);
    const chip = n && this.chipOf(n.block, n.nth);
    if (!hit || !chip) return void (this.noting = null);
    this.linkPop.hide();
    this.bubble?.hide();
    void this.notePop.open(chip, hit.fn, Number(chip.textContent));
  }
  private onNoteChange = (e: CustomEvent<string>) => {
    e.stopPropagation();
    const n = this.noting;
    const hit = n && this.fnAt(n.block, n.nth);
    if (!hit) return;
    this.emit([{ op: 'text', at: n.block, from: hit.offset, to: hit.offset + 1, runs: [{ t: '', fn: e.detail }] }], caret(n.block, hit.offset + 1), undefined, null);
  };
  private onNoteRemove = (e: Event) => {
    e.stopPropagation();
    const n = this.noting;
    const hit = n && this.fnAt(n.block, n.nth);
    this.noting = null;
    if (hit) this.emit([{ op: 'text', at: n.block, from: hit.offset, to: hit.offset + 1, runs: [] }], caret(n.block, hit.offset), undefined, 'focus');
  };
  /** The box closed: a note with no words goes with it; the caret lands after the mark. */
  private onNoteClose = (e: Event) => {
    e.stopPropagation();
    const n = this.noting;
    const hit = n && this.fnAt(n.block, n.nth);
    this.noting = null;
    if (!hit) return;
    if (!hit.fn.trim()) this.emit([{ op: 'text', at: n.block, from: hit.offset, to: hit.offset + 1, runs: [] }], caret(n.block, hit.offset), undefined, 'focus');
    else this.sel = caret(n.block, hit.offset + 1);
  };
  private closePops() {
    this.notePop?.close();
    this.linkPop?.hide();
    this.bubble?.hide();
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
    const bub = this.bubble;
    if (!bub) return;
    const sel = this._sel;
    const a = document.activeElement;
    const focused = this.hasFocus() || (!!a && bub.contains(a));
    // A DOM selection inside a card is the card's own (a grid's cell, a web thing's words), not words of ours.
    const dom = !this.writing && !this.pendingSel ? document.getSelection() : null;
    const inCard = (n: Node | null | undefined) => !!(n && (n instanceof Element ? n : n.parentElement)?.closest('.tx-card'));
    if (this.noBubble || this.composing || !sel || collapsed(sel) || !focused || this.linkPop?.shown || this.notePop?.isOpen || inCard(dom?.anchorNode) || inCard(dom?.focusNode)) return bub.hide();
    const m = marksOf(this.model, sel);
    const mark = (cmd: Mark, label: string, icon: IconNode, keys?: string): ContextEntry => ({ label, icon, keys, pressed: !!m[cmd], does: () => this.exec(cmd) });
    const items: ContextEntry[] = [
      mark('b', t('Bold'), UI.bold, 'Mod+B'),
      mark('i', t('Italic'), UI.italic, 'Mod+I'),
      mark('u', t('Underline'), UI.underline, 'Mod+U'),
      mark('s', t('Strikethrough'), UI.strike),
      mark('h', t('Highlight'), UI.highlight),
      SEP,
      { label: t('Link'), icon: UI.link, keys: 'Mod+K', pressed: !!m.href, does: () => this.exec('link') },
      { label: t('Footnote'), icon: UI.footnote, does: () => this.exec('fn') },
    ];
    if (this.shape !== 'line' && this.wholeBlocks(sel)) {
      const kind = kindAt(this.model, sel);
      items.push(SEP, { label: t('Bulleted list'), icon: UI.list, pressed: kind === 'ul', does: () => this.exec('ul') }, { label: t('Numbered list'), icon: UI.listOrdered, pressed: kind === 'ol', does: () => this.exec('ol') });
    }
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
  };
  private onLinkRemove = (e: Event) => {
    e.stopPropagation();
    this.exec('unlink');
  };
  /** Events of the editors inside the popovers stay there. */
  private swallow = (e: Event) => e.stopPropagation();

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
      this.fmt = marksOf(this.model, this._sel);
      this.dispatchEvent(new CustomEvent<Sel | null>('text-select', { detail: this._sel, bubbles: true }));
    }
    this.syncBubble();
    if (this.noting) {
      const n = this.noting;
      const chip = this.chipOf(n.block, n.nth);
      if (!chip) this.noting = null;
      else if (this.notePop.isOpen) this.notePop.anchorTo(chip);
      else this.openNote();
    }
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
      if (r.ic) return html`<span class="ic" data-icon=${r.ic} data-atomic contenteditable="false" role="img" aria-label=${r.ic}></span>`;
      if (r.fn !== undefined) {
        const n = notes();
        return html`<sup class="fn" data-fn=${r.fn} data-atomic contenteditable="false" tabindex="0" role="button" aria-label=${t('Footnote {n}', { n })}>${n}</sup>`;
      }
      let node: unknown = this.words(r.t);
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
      case 'p':
        return html`<div class="tx-card" data-k="web" contenteditable="false" tabindex="0" role="group" aria-label=${t('From the web')}><span class="tx-card-kind">${t('From the web')}</span><span class="tx-card-gist">${b.runs[0]?.t ?? ''}</span></div>`;
      case 'img':
        return html`<figure class="tx-card" data-k="img" contenteditable="false" tabindex="0"><img src=${b.url} alt=${b.alt} referrerpolicy="no-referrer" /></figure>`;
      case 'hr':
        return html`<div class="tx-card" data-k="hr" contenteditable="false" tabindex="0" role="separator"><hr /></div>`;
      case 'table':
        return html`<div class="tx-card" data-k="table" contenteditable="false" tabindex="0" role="group" aria-label=${t('Table')}><span class="tx-card-kind">${t('Table')}</span><span class="tx-card-gist">${b.cols.map((c) => c.name).join(' · ')} — ${t('{n|one row|# rows}', { n: b.rows.length })}</span></div>`;
      case 'fence': {
        const kind = b.lang ? t('{app} document', { app: b.lang }) : t('Code');
        const gist = b.body.split('\n').find((l) => l.trim() && !/^---/.test(l)) ?? '';
        return html`<div class="tx-card" data-k="fence" contenteditable="false" tabindex="0" role="group" aria-label=${kind}><span class="tx-card-kind">${kind}</span><span class="tx-card-gist">${gist.slice(0, 80)}</span></div>`;
      }
      case 'edge':
        return html`<div class="tx-card" data-k="edge" contenteditable="false" tabindex="0" role="group" aria-label=${t('Connection')}><span class="tx-card-gist">${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}</span></div>`;
      default:
        return html`<div class="tx-card" contenteditable="false"></div>`;
    }
  }
  private renderBlock(b: Block, at: number, n: number | undefined, notes: () => number): TemplateResult {
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
        return html`<li class=${cls} style=${`--d:${b.depth}`} data-n=${n ?? nothing} data-done=${b.done === undefined ? nothing : String(b.done)}>${inner}</li>`;
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
    // Nothing but the blocks inside the box: it keeps white space as typed, so a newline of this template would be a line.
    return html`<div
        class="tx ${blank ? 'blank' : ''}"
        contenteditable="true"
        role="textbox"
        aria-multiline=${this.shape === 'line' ? 'false' : 'true'}
        aria-label=${this.label || nothing}
        data-placeholder=${this.placeholder || nothing}
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
      >${repeat(model, keyAt, (b, i) => this.renderBlock(b, i, numbers(b), next))}</div>
      <to-note-pop @note-change=${this.onNoteChange} @note-remove=${this.onNoteRemove} @note-close=${this.onNoteClose} @text-ops=${this.swallow} @text-select=${this.swallow} @text-enter=${this.swallow} @text-exit=${this.swallow} @text-selectall=${this.swallow} @docundo=${this.swallow} @docredo=${this.swallow}></to-note-pop>
      <to-link-pop @link-set=${this.onLinkSet} @link-remove=${this.onLinkRemove}></to-link-pop>
      <to-context class="tx-bubble" .label=${t('Format')}></to-context>`;
  }
}
if (!customElements.get('to-text')) customElements.define('to-text', ToText);

declare global {
  interface HTMLElementTagNameMap {
    'to-text': ToText;
  }
}
