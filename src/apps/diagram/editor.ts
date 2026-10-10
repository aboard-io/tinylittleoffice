/**
 * <to-diagram-editor>: the picture is the editor. Tap empty space and a new thing is typed there (in a lane,
 * or in the circles tapped); tap a thing and its words open over it in a one-line <to-text>, with the few
 * things to do to it underneath (one more like it, a picture, a connection, take it away); Enter starts the
 * next; drag a thing onto another to put it under or after it, into a lane or a set to move it there. The
 * kind is a menu in the one bar. Every change is the kernel's operations (model.ts): the line editor's own
 * `text` ops on the line, a `splice` when a thing comes or goes, a `move` when one moves; nothing else
 * touches the document.
 *
 * The thing open (or, with its words closed, the thing that has the focus) is the thing in hand: under the words a
 * <to-context> in the standard's order (Move up, Move down, the kind's own, Duplicate | Copy, Cut, Paste | Delete),
 * and the keys of docs/editing.md on a focused thing (arrows go to the nearest thing that way, Alt+Up/Down move it
 * past its neighbour, Mod+Alt+Left/Right into the next lane or table, Mod+D, Mod+C/X/V, Delete, Enter). The words are
 * plain (`no-bubble`, no marks); Escape puts them back as they were when opened, Enter or Mod+Enter or a tap
 * elsewhere keeps them. Undo brings the focus back to the thing that changed.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowDown, ArrowRight, ArrowUp, ClipboardPaste, CopyPlus, CornerDownRight, Minus, Scissors, Smile, Spline, ZoomIn, ZoomOut } from 'lucide';
import { applyAll, parse, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { GENERATOR, docToHtml, pasteFrom } from '../../kit/clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/context.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { place, type MenuItem } from '../../kit/menu.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { isLink } from '../draw/model.ts';
import { arrowDefs, shapeSvg, type Theme } from '../draw/view.ts';
import { KIND_ICON, kindHint, kindName, lineHint, thingName } from './kinds.ts';
import { KINDS, canDuplicate, charsOf, childOf, commitDraft, connect, dropIn, dropOn, duplicateThing, edgesOf, follow, isListed, isTree, joins, kindOf, lineOf, moveAcross, moveThing, nextThing, newThing, partFor, pasteThings, removeThing, rename, setEdge, setKind, thingBlocks, tidy, withIcon, type Draft, type Hit, type KindId } from './model.ts';
import { layout, regionAt, type DShape, type Diagram } from './view.ts';
import '../../kit/bar.ts';
import '../../kit/context.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-diagram-editor';

/** The page's own colours, so a diagram looks right in the dark too. */
const THEME: Theme = { ink: 'var(--to-ink)', paper: 'var(--to-surface)', shade: 'var(--to-surface-2)' };

export interface DiagramView {
  kind: KindId;
  d: Diagram;
}

/**
 * What the line editor over the picture is editing: a line of the document (`at`), a thing not yet in it
 * (`draft`), or a name that is not one line's words (a lane, a thing only connections name, a connection's
 * words), held as a block of its own (`block`) whose words are written back wherever the name is.
 */
interface Target {
  hit: Hit | null;
  at: number;
  draft: Draft | null;
  block: Extract<Block, { k: 'li' }> | null;
  /** The name as it stands, for a name renamed wherever it is. */
  name: string;
}

type Drag = { i: number; hit: Hit; x: number; y: number; moved: boolean };

const shifted = (ops: Op[], by: number): Op[] => ops.map((o) => (o.op === 'head' ? o : o.op === 'move' ? { ...o, at: o.at + by, to: o.to + by } : { ...o, at: o.at + by }));
const li = (words: string): Extract<Block, { k: 'li' }> => ({ k: 'li', depth: 0, runs: words ? [{ t: words }] : [] });
const plain = (b: Block) => ('runs' in b ? charsOf(b.runs).replace(/￼/g, '').trim() : '');
/** What the line editor holds while nothing is open: it is always there, so a tap can focus it at once. */
const IDLE: Block[] = [{ k: 'li', depth: 0, runs: [] }];
const sameHit = (a: Hit | null | undefined, b: Hit | null | undefined) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

/** Where an edit leaves the thing in hand: before it (what undo comes back to) and after it (what redo does). */
interface Mark {
  before: Hit | null;
  after: Hit | null;
}

/** What this page last copied: the bar's Paste falls back on it when the system's clipboard may not be read. */
let copied: { text: string; html: string } | null = null;

/** Clipboard data as blocks: our own TLO whole (connections too); anything else as lines of words. */
function pastedBlocks(data: { text: string; html: string }): Block[] {
  if (data.html.includes(`content="${GENERATOR}"`)) return parse(data.text).blocks;
  const p = pasteFrom(data, 'lines');
  if (!p) return [];
  return 'blocks' in p ? p.blocks : [{ k: 'li', depth: 0, runs: p.runs }];
}

export class ToDiagramEditor extends DocElement<DiagramView> {
  static properties: PropertyDeclarations = { target: { state: true }, joining: { state: true }, zoom: { state: true } };
  /** The thing open in the line editor, or null. */
  declare target: Target | null;
  /**
   * Joining, armed (the bar's Join, the thing's own Join): the name of the thing the connection starts from, and the
   * next thing tapped is its other end; '' while the first end is still to be tapped. Null when not joining.
   */
  declare joining: string | null;
  /** The picture's scale: 0 fits it to the width. */
  declare zoom: number;
  private drag: Drag | null = null;
  /** When a drag last ended: the click that follows it is not a tap. */
  private quietUntil = 0;
  private ones = new WeakMap<Block, Block[]>();
  /** Counts the times the words are opened: a burst of typing is one undo step within one opening only. */
  private session = 0;
  /** The document as it was when the words were opened (Escape puts it back), and the thing they were opened on. */
  private openText: string | null = null;
  private openHitAt: Hit | null = null;
  /** Escape is taking the typing back: the undos it makes move nothing. */
  private restoring = false;
  /** A Mod+C, X or V whose clipboard event has not come (Safari sends none with nothing selected): done by hand. */
  private clipPending: 'copy' | 'cut' | 'paste' | null = null;

  constructor() {
    super();
    this.target = null;
    this.joining = null;
    this.zoom = 0;
  }

  protected read(doc: Doc): DiagramView {
    return { kind: kindOf(doc), d: layout(doc) };
  }
  connectedCallback() {
    super.connectedCallback();
    // On the document: with nothing selected a browser may send the event to the body rather than the thing.
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener);
    document.addEventListener('pointerdown', this.onOutside, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener);
    document.removeEventListener('pointerdown', this.onOutside, true);
    this.ctx?.hide();
  }
  /** An edit that moves the thing in hand from `before` to `after`, so undo and redo can give it back. */
  private change(ops: Op[], before: Hit | null, after: Hit | null = before, key?: string) {
    this.edit(ops, key, { before, after } satisfies Mark);
  }
  /** Undo or redo: the words close, and the focus goes to the thing that changed (where it was, else where the change begins). */
  protected undone(entry: Entry, redo: boolean) {
    if (this.restoring) return;
    this.shut(false);
    const m = entry.mark as Mark | undefined;
    void this.focusThing((redo ? m?.after : m?.before) ?? null, firstAt(entry));
  }
  protected updated(changed: Map<string, unknown>) {
    super.updated(changed);
    this.syncContext();
  }
  /** The things to do to the thing open sit under its words while there is a thing (not a draft) in hand. */
  private syncContext() {
    const ctx = this.ctx;
    const pop = this.pop;
    if (!ctx) return;
    if (this.target?.hit && !this.target.draft && pop?.matches(':popover-open')) {
      if (!ctx.isOpen) ctx.show(pop);
      else ctx.refresh();
    } else ctx.hide();
  }
  private get ctx(): ToContext | null {
    return this.querySelector<ToContext>('to-context.dg-context');
  }
  private get wrap(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.dg-wrap');
  }
  /** The drawn thing for a hit (or, with none, for the line at `at`). */
  private gOf(hit: Hit | null, at = -1): SVGGElement | null {
    const shapes = this.view.d.shapes;
    let i = hit ? shapes.findIndex((s) => sameHit(s.hit, hit)) : -1;
    if (i < 0 && at >= 0) i = shapes.findIndex((s) => s.hit?.k === 'line' && s.hit.at === at);
    return i >= 0 ? this.querySelector<SVGGElement>(`.dg-pic g.dg-thing[data-i="${i}"]`) : null;
  }
  /** The focus on a thing once the picture is drawn again; on the picture itself when the thing is gone. */
  private async focusThing(hit: Hit | null, at = -1) {
    await this.updateComplete;
    (this.gOf(hit, at) ?? this.wrap)?.focus({ preventScroll: true });
  }
  private one(b: Block): Block[] {
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }

  /* ---------- the line editor over the picture ---------- */

  private get pop(): HTMLElement | null {
    return this.querySelector<HTMLElement>('.dg-pop');
  }
  private get line(): ToText | null {
    return this.querySelector<ToText>('.dg-pop to-text');
  }
  /** The block the line editor shows (for the target given, else the one open). */
  private shown(tg = this.target): Block | null {
    if (!tg) return null;
    if (tg.draft) return tg.draft.block;
    if (tg.at >= 0) return this.doc.blocks[tg.at]?.k === 'li' ? this.doc.blocks[tg.at] : null;
    return tg.block;
  }
  /** What the line editor is called, and what it says while empty, for a target. */
  private wording(tg: Target | null): { label: string; placeholder: string } {
    const kind = this.view.kind;
    const edge = tg?.hit?.k === 'edge';
    return { label: edge ? t('What the connection says') : thingName(kind), placeholder: edge ? t('What the connection says') : tg?.hit?.k === 'lane' ? t('Who') : lineHint(kind) };
  }

  /**
   * Open the line editor on a target, over `anchor`, the caret (or a selection) at [from, to). The words are focused
   * here, synchronously, in the tap's, the key's or the menu's own handler, as the Drawing Tool's are: iOS lets the
   * focus in and raises the keyboard only so. The selection is written once the words are drawn.
   */
  private open(tg: Target, anchor: Element, sel?: [number, number], fresh = true) {
    if (fresh) {
      this.session++;
      this.openText = write(this.doc);
      this.openHitAt = tg.hit;
    }
    this.target = tg;
    const pop = this.pop;
    const x = this.line;
    if (!pop || !x) return;
    const b = this.shown(tg);
    x.blocks = b ? this.one(b) : IDLE;
    Object.assign(x, this.wording(tg));
    if (!pop.matches(':popover-open')) pop.showPopover();
    place(pop, anchor as HTMLElement, 6);
    x.focus();
    const end = b && 'runs' in b ? charsOf(b.runs).length : 0;
    const [from, to] = sel ?? [end, end];
    x.sel = { anchor: { block: 0, offset: from }, focus: { block: 0, offset: to } };
  }
  /** A thing of the picture, tapped: its words open over it. */
  private openHit(hit: Hit, anchor: Element) {
    if (hit.k === 'line') {
      const b = this.doc.blocks[hit.at];
      if (b?.k !== 'li') return;
      const p = partFor(lineOf(b, hit.at), hit.part);
      return this.open({ hit, at: hit.at, draft: null, block: null, name: '' }, anchor, p ? [p.from, p.to] : undefined);
    }
    const name = hit.k === 'edge' ? (edgesOf(this.doc).find((e) => e.at === hit.at)?.label ?? '') : hit.name;
    const block = li(name);
    this.open({ hit, at: -1, draft: null, block, name }, anchor, [0, charsOf(block.runs).length]);
  }
  /** A new thing, typed over `anchor`: it is in the document from its first letter. */
  private openDraft(d: Draft, anchor: Element) {
    this.open({ hit: null, at: -1, draft: d, block: null, name: '' }, anchor, d.sel);
  }
  /** The line editor closed; a list it leaves is tidied. */
  private shut(tidyUp = true) {
    const tg = this.target;
    if (!tg) return;
    this.target = null;
    this.openText = null;
    const pop = this.pop;
    if (pop?.matches(':popover-open')) pop.hidePopover();
    this.ctx?.hide();
    if (tidyUp && tg.at >= 0 && !tg.draft) this.edit(tidy(this.doc, tg.at));
  }
  /** Done: the words kept, the focus back on the thing they were opened on. */
  private shutAndFocus() {
    const hit = this.target?.draft ? null : (this.target?.hit ?? null);
    this.shut();
    void this.focusThing(hit);
  }

  private onOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    const tg = this.target;
    if (!tg) return;
    const { ops, kind } = e.detail;
    if (tg.draft) {
      const block = applyAll({ head: {}, blocks: [tg.draft.block] }, ops).blocks[0] as Extract<Block, { k: 'li' }>;
      const d = tg.draft;
      // Nothing worth keeping typed yet: the draft waits, out of the document.
      if (charsOf(block.runs).trim() === charsOf(d.block.runs).trim()) return void (this.target = { ...tg, draft: { ...d, block } });
      this.change(commitDraft(d, block), null, { k: 'line', at: d.at, part: 'all' }, `line:${d.at}:${this.session}`);
      this.target = { hit: { k: 'line', at: d.at, part: 'all' }, at: d.at, draft: null, block: null, name: '' };
      return;
    }
    if (tg.at >= 0) {
      const before = this.doc;
      const mine = shifted(ops, tg.at);
      this.change([...mine, ...follow(before, applyAll(before, mine), tg.at)], tg.hit, tg.hit, kind ? `line:${tg.at}:${this.session}` : undefined);
      return;
    }
    if (!tg.block || !tg.hit) return;
    const block = applyAll({ head: {}, blocks: [tg.block] }, ops).blocks[0] as Extract<Block, { k: 'li' }>;
    const now = plain(block);
    const done = rename(this.doc, tg.hit, tg.name, now);
    this.target = { ...tg, block, name: done.length || tg.hit.k === 'edge' ? now : tg.name, hit: tg.hit.k === 'lane' && done.length ? { k: 'lane', name: now } : tg.hit.k === 'node' && done.length ? { k: 'node', name: now } : tg.hit };
    this.change(done, tg.hit, this.target.hit, `name:${tg.hit.k}:${this.session}`);
  };
  /** Enter: the next thing like this one, typed where this one is. */
  private onEnter = (e: Event) => {
    e.stopPropagation();
    const tg = this.target;
    const anchor = this.pop ? this.anchorOf(tg) : null;
    const hit = tg?.hit;
    if (!tg || !hit || tg.draft || hit.k === 'edge') return this.shutAndFocus();
    const d = nextThing(this.doc, hit);
    this.shut();
    if (d && anchor) this.openDraft(d, anchor);
  };
  /** Backspace at the start: a thing with no words left goes. */
  private onExit = (e: Event) => {
    e.stopPropagation();
    const tg = this.target;
    const b = this.shown();
    if (!tg || !b) return;
    if (tg.draft) return this.shutAndFocus();
    if (tg.hit?.k === 'line') {
      const p = partFor(lineOf(b as Extract<Block, { k: 'li' }>, tg.at), tg.hit.part);
      if (p && !p.words && !p.icon) {
        const ops = removeThing(this.doc, tg.hit);
        this.shut(false);
        this.change(ops, tg.hit, null);
        void this.focusThing(null);
      }
    }
  };
  /** Escape, once <to-text> has closed its boxes and collapsed its words: the words as they were when opened, and the focus back on the thing. */
  private onEscape = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const was = this.openText;
    const hit = this.openHitAt;
    if (was !== null && write(this.doc) !== was) {
      this.restoring = true;
      try {
        for (let n = 0; n < 200 && this.canUndo && write(this.doc) !== was; n++) this.dispatchEvent(new CustomEvent('docundo', { cancelable: true }));
      } finally {
        this.restoring = false;
      }
    }
    this.shut(false);
    void this.focusThing(hit);
  };
  /** Mod+A with the line already whole: there is no choosing every thing of a picture, so the words stay chosen. */
  private onSelectAll = (e: Event) => e.stopPropagation();
  /**
   * Keys in the words, before <to-text> sees them: Mod+Enter is done; the words are plain, so the marks' keys do
   * nothing; Mod+D and Alt+Up/Down act on the thing open, as they do on a focused one.
   */
  private onPopKey = (e: KeyboardEvent) => {
    if (e.isComposing || !(e.target as Element).closest?.('to-text')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    const stop = () => (e.preventDefault(), e.stopPropagation());
    if (mod && !e.altKey && e.key === 'Enter') return void (stop(), this.shutAndFocus());
    if (mod && !e.altKey && (e.shiftKey ? k === 'x' || k === 'h' : k === 'b' || k === 'i' || k === 'u' || k === 'k')) return void stop();
    const hit = this.target?.draft ? null : (this.target?.hit ?? null);
    if (!hit) return;
    if (mod && !e.altKey && !e.shiftKey && k === 'd') return void (stop(), this.duplicate(hit));
    if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return void (stop(), this.move(hit, e.key === 'ArrowUp' ? -1 : 1));
  };

  /** Where the line editor sits: over the shape it edits, else over the place it was opened. */
  private anchorOf(tg: Target | null): Element | null {
    const i = tg ? this.indexOf(tg) : -1;
    return (i >= 0 ? this.querySelector(`.dg-pic g[data-i="${i}"]`) : null) ?? this.querySelector('.dg-anchor');
  }
  private indexOf(tg: Target): number {
    const h = tg.hit;
    if (!h) return -1;
    return this.view.d.shapes.findIndex((s) => s.hit && JSON.stringify(s.hit) === JSON.stringify(h));
  }

  /* ---------- the things to do to the thing open ---------- */

  private async iconFor(hit: Hit) {
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon({ none: true });
    if (name === null) return;
    this.change(withIcon(this.doc, hit, name), hit);
  }
  /* ---------- the thing in hand: moved, duplicated, copied, pasted, taken away ---------- */

  /** The thing open, or the thing that has the focus. */
  private inHand(): Hit | null {
    const tg = this.target;
    if (tg) return tg.draft ? null : tg.hit;
    const g = (document.activeElement as Element | null)?.closest?.('g.dg-thing');
    return g && this.contains(g) ? (this.view.d.shapes[+(g as SVGGElement).dataset.i!]?.hit ?? null) : null;
  }
  /** After an edit to the thing in hand: its words open on it again where it now is, or the focus on it. */
  private async reopenOn(hit: Hit | null, open: boolean) {
    if (!open || hit?.k !== 'line') return this.focusThing(hit);
    await this.updateComplete;
    const g = this.gOf(hit);
    const b = this.doc.blocks[hit.at];
    const p = b?.k === 'li' ? partFor(lineOf(b, hit.at), hit.part) : null;
    if (!g || !p) return this.focusThing(hit);
    this.open({ hit, at: hit.at, draft: null, block: null, name: '' }, g, [p.from, p.to], false);
  }
  /** Past its neighbour (Alt+Up/Down, Move up/down); the words stay open on it if they were. */
  private move(hit: Hit, by: 1 | -1) {
    const r = moveThing(this.doc, hit, by);
    if (!r) return;
    const open = !!this.target;
    this.change(r.ops, hit, r.hit);
    void this.reopenOn(r.hit, open);
  }
  /** Into the next lane or to the next table (Mod+Alt+Left/Right). */
  private across(hit: Hit, by: 1 | -1) {
    const r = moveAcross(this.doc, hit, by);
    if (!r) return;
    const open = !!this.target;
    this.change(r.ops, hit, r.hit);
    void this.reopenOn(r.hit, open);
  }
  private duplicate(hit: Hit) {
    const r = duplicateThing(this.doc, hit);
    if (!r.ops.length) return;
    this.shut();
    this.change(r.ops, hit, r.hit);
    void this.focusThing(r.hit);
  }
  private removeHit(hit: Hit) {
    const ops = removeThing(this.doc, hit);
    this.shut(false);
    this.change(ops, hit, null);
    void this.focusThing(null);
  }
  /** The thing as our clipboard carries it: TLO, and our HTML with the marker. */
  private clip(hit: Hit): { text: string; html: string } | null {
    const blocks = thingBlocks(this.doc, hit);
    if (!blocks.length) return null;
    return (copied = { text: write({ head: {}, blocks }), html: docToHtml(blocks) });
  }
  private paste(hit: Hit | null, blocks: Block[]) {
    const r = pasteThings(this.doc, hit, blocks);
    if (!r.ops.length) return;
    this.shut();
    this.change(r.ops, hit, r.hit);
    void this.focusThing(r.hit);
  }
  /** Copy, cut and paste from the keys while a thing (or the picture) has the focus; words being typed are <to-text>'s own. */
  private onClipboard = (e: ClipboardEvent) => {
    const active = document.activeElement as Element | null;
    const wrap = this.wrap;
    if (!wrap || !active || this.target || !wrap.contains(active)) return;
    this.clipPending = null;
    const hit = this.inHand();
    const dt = e.clipboardData;
    if (e.type === 'paste') {
      const blocks = pastedBlocks({ text: dt?.getData('text/plain') ?? '', html: dt?.getData('text/html') ?? '' });
      if (!blocks.length) return;
      e.preventDefault();
      return this.paste(hit, blocks);
    }
    const c = hit ? this.clip(hit) : null;
    if (!hit || !c || !dt) return;
    e.preventDefault();
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') this.removeHit(hit);
  };
  /** The context bar's Copy and Cut: the system clipboard as the page may write it, and this page's own memory of it. */
  private copyOut(hit: Hit, cut: boolean) {
    const c = this.clip(hit);
    if (!c) return;
    const plainText = () => navigator.clipboard?.writeText(c.text).catch(() => undefined);
    try {
      void navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([c.text], { type: 'text/plain' }), 'text/html': new Blob([c.html], { type: 'text/html' }) })]).catch(plainText);
    } catch {
      void plainText();
    }
    if (cut) this.removeHit(hit);
  }
  /** The context bar's Paste: the system clipboard if the page may read it, else what was last copied here. */
  private async pasteIn(hit: Hit | null) {
    let data = { text: '', html: '' };
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        if (it.types.includes('text/plain')) data.text = await (await it.getType('text/plain')).text();
        if (it.types.includes('text/html')) data.html = await (await it.getType('text/html')).text();
      }
    } catch {
      try {
        data.text = await navigator.clipboard.readText();
      } catch {
        // Refused: this page's own copy.
      }
    }
    if (!data.text && copied) data = copied;
    const blocks = pastedBlocks(data);
    if (blocks.length) this.paste(hit, blocks);
  }

  /** The things to do to the thing open, in the standard's order: Move up, Move down, the kind's own, Duplicate | Copy, Cut, Paste | Delete. */
  private contextItems(tg: Target | null): ContextEntry[] {
    const hit = tg?.hit;
    if (!tg || !hit || tg.draft) return [];
    const kind = this.view.kind;
    const anchor = () => this.anchorOf(tg) ?? this;
    const add = (d: Draft | null) => {
      this.shut();
      if (d) this.openDraft(d, anchor());
    };
    const name = this.nameOf(hit);
    const out: ContextEntry[] = [];
    if (hit.k === 'line') {
      out.push({ label: t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', disabled: !moveThing(this.doc, hit, -1), does: () => this.move(hit, -1) });
      out.push({ label: t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', disabled: !moveThing(this.doc, hit, 1), does: () => this.move(hit, 1) });
      const addLabel = isTree(kind) ? t('Add under it') : isListed(kind) ? t('Add one more') : t('Add after it');
      out.push({ label: addLabel, icon: isTree(kind) ? CornerDownRight : UI.plus, does: () => add(isTree(kind) || isListed(kind) ? childOf(this.doc, hit.at) : nextThing(this.doc, hit)) });
      out.push({ label: t('Icon'), icon: Smile, does: () => void this.iconFor(hit) });
    }
    if (hit.k === 'lane') out.push({ label: t('Add a step'), icon: UI.plus, does: () => add(newThing(this.doc, hit.name)) });
    if (joins(kind) && hit.k !== 'edge' && name) out.push({ label: t('Join'), icon: Spline, does: () => this.armJoin() });
    if (hit.k === 'edge' && joins(kind)) {
      const e = edgesOf(this.doc).find((x) => x.at === hit.at);
      const arrow = e?.dir === '->' || e?.dir === '<-';
      out.push({ label: arrow ? t('Make it a plain line') : t('Make it an arrow'), icon: arrow ? Minus : ArrowRight, does: () => this.change(setEdge(this.doc, hit.at, { dir: arrow ? '--' : '->' }), hit) });
    }
    if (canDuplicate(this.doc, hit)) out.push({ label: t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', does: () => this.duplicate(hit) });
    out.push(SEP);
    out.push({ label: t('Copy'), icon: UI.copy, keys: 'Mod+C', does: () => this.copyOut(hit, false) });
    out.push({ label: t('Cut'), icon: Scissors, keys: 'Mod+X', does: () => this.copyOut(hit, true) });
    out.push({ label: t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', does: () => void this.pasteIn(hit) });
    out.push(SEP);
    out.push({ label: t('Delete'), icon: UI.trash, keys: 'Delete', does: () => this.removeHit(hit) });
    return out;
  }

  /* ---------- tapping, joining and dragging on the picture ---------- */

  private point(e: { clientX: number; clientY: number }): [number, number] {
    const el = this.querySelector<SVGSVGElement>('.dg-pic');
    const m = el?.getScreenCTM();
    if (!el || !m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  /** Put the anchor where the pointer is, for a line editor opened on empty space. */
  private anchorAt(e: { clientX: number; clientY: number }): HTMLElement {
    const a = this.querySelector<HTMLElement>('.dg-anchor')!;
    const box = this.querySelector<HTMLElement>('.dg-wrap')!.getBoundingClientRect();
    a.style.left = `${e.clientX - box.left + (a.parentElement?.scrollLeft ?? 0)}px`;
    a.style.top = `${e.clientY - box.top + (a.parentElement?.scrollTop ?? 0)}px`;
    return a;
  }
  /** A tap on the picture: on a thing, its words (or the other end of a connection being made); on empty space, a new thing there. */
  private onClick = (e: MouseEvent) => {
    if (performance.now() < this.quietUntil) return;
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const hit = g ? this.view.d.shapes[+g.dataset.i!]?.hit : undefined;
    if (this.target) return this.shut();
    if (this.joining !== null) return this.joinTo(hit);
    if (hit && g) return this.openHit(hit, g);
    const [x, y] = this.point(e);
    this.openDraft(newThing(this.doc, regionAt(this.view.d, x, y)), this.anchorAt(e));
  };
  /**
   * Join, from the bar or the thing's own row: armed from the thing in hand (open or focused), the next thing tapped
   * is joined to it; with nothing in hand, the next two tapped are joined. Pressed again, or Escape, disarms it.
   */
  private armJoin() {
    if (this.joining !== null) return void (this.joining = null);
    const hit = this.inHand();
    const from = hit && hit.k !== 'edge' && hit.k !== 'lane' ? this.nameOf(hit) : '';
    this.shut();
    this.joining = from;
    // The focus on the picture, where Escape is heard.
    void this.focusThing(from ? hit : null);
  }
  /** A thing tapped (or Enter on it) while joining: the first end taken, or the connection made and joining done. */
  private joinTo(hit: Hit | undefined) {
    const from = this.joining;
    const name = hit && hit.k !== 'edge' && hit.k !== 'lane' ? this.nameOf(hit) : '';
    if (from === '' && name) return void (this.joining = name);
    this.joining = null;
    if (from && name) this.change(connect(this.doc, from, name), hit!);
  }
  private nameOf(hit: Hit): string {
    if (hit.k === 'line') {
      const b = this.doc.blocks[hit.at];
      return b?.k === 'li' ? lineOf(b, hit.at).all.words : '';
    }
    return hit.k === 'edge' ? '' : hit.name;
  }
  /** A press outside the words, the things under them, the picture and the bar: the words close (kept), as a menu's would. */
  private onOutside = (e: PointerEvent) => {
    if (!this.target) return;
    const at = e.target as Element | null;
    if (!at || this.pop?.contains(at) || this.wrap?.contains(at) || at.closest?.('to-context, dialog, [popover], to-bar')) return;
    this.shut();
  };
  /** The thing nearest the focused one in an arrow's direction. */
  private nearest(from: Element, key: string): SVGGElement | null {
    const r = from.getBoundingClientRect();
    const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
    const [dx, dy] = key === 'ArrowLeft' ? [-1, 0] : key === 'ArrowRight' ? [1, 0] : key === 'ArrowUp' ? [0, -1] : [0, 1];
    let best: SVGGElement | null = null;
    let score = Infinity;
    for (const g of this.querySelectorAll<SVGGElement>('.dg-pic g.dg-thing:not(.edge)')) {
      if (g === from) continue;
      const q = g.getBoundingClientRect();
      const [x, y] = [q.left + q.width / 2 - cx, q.top + q.height / 2 - cy];
      const along = x * dx + y * dy;
      if (along <= 1) continue;
      const s = along + 2 * Math.abs(x * dy + y * dx);
      if (s < score) [best, score] = [g, s];
    }
    return best;
  }
  /** Keys on the picture: on a focused thing, the standard's (docs/editing.md §1, §5); on the picture, Escape stops a join. */
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing) return;
    const at = e.target as Element;
    if (at.closest('input, textarea, select, [contenteditable], dialog, [popover], to-bar, button')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    // Select all: never the page's words under the picture.
    if (mod && !e.altKey && !e.shiftKey && k === 'a') return void e.preventDefault();
    if (e.key === 'Escape' && this.joining !== null) {
      e.preventDefault();
      this.joining = null;
      return;
    }
    const g = at.closest<SVGGElement>('g.dg-thing');
    const hit = g ? this.view.d.shapes[+g.dataset.i!]?.hit : undefined;
    const clip = mod && !e.altKey && !e.shiftKey ? ({ c: 'copy', x: 'cut', v: 'paste' } as const)[k as 'c' | 'x' | 'v'] : undefined;
    if (clip && (hit || clip === 'paste')) {
      // Not prevented: the browser's own copy, cut or paste event follows and does it. If none comes, by hand.
      this.clipPending = clip;
      setTimeout(() => {
        if (this.clipPending !== clip) return;
        this.clipPending = null;
        if (clip === 'paste') void this.pasteIn(hit ?? null);
        else if (hit) this.copyOut(hit, clip === 'cut');
      });
      return;
    }
    if (!g || !hit) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.querySelector<SVGGElement>('.dg-pic g.dg-thing')?.focus({ preventScroll: true });
      }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && !mod && !e.altKey) {
      e.preventDefault();
      if (this.joining !== null) return this.joinTo(hit);
      this.openHit(hit, g);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) {
      e.preventDefault();
      this.removeHit(hit);
    } else if (mod && !e.altKey && !e.shiftKey && k === 'd') {
      e.preventDefault();
      this.duplicate(hit);
    } else if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.move(hit, e.key === 'ArrowUp' ? -1 : 1);
    } else if (e.altKey && mod && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      this.across(hit, e.key === 'ArrowLeft' ? -1 : 1);
    } else if (!mod && !e.altKey && !e.shiftKey && e.key.startsWith('Arrow')) {
      e.preventDefault();
      this.nearest(g, e.key)?.focus({ preventScroll: true });
    }
  };
  private onDown = (e: PointerEvent) => {
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const i = g ? +g.dataset.i! : -1;
    const hit = this.view.d.shapes[i]?.hit;
    if (e.button !== 0 || !g || !hit || hit.k === 'edge' || hit.k === 'lane' || this.target) return;
    const [x, y] = this.point(e);
    this.drag = { i, hit, x, y, moved: false };
    try {
      g.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer knows of: the drag goes on without the capture.
    }
  };
  private onMove = (e: PointerEvent) => {
    const d = this.drag;
    if (!d) return;
    const [x, y] = this.point(e);
    if (!d.moved && Math.hypot(x - d.x, y - d.y) < 6) return;
    d.moved = true;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.setAttribute('transform', `translate(${x - d.x} ${y - d.y})`);
    g?.classList.add('dragging');
    const over = this.overAt(e, g);
    this.querySelectorAll('.dg-pic g.over').forEach((el) => el !== over && el.classList.remove('over'));
    over?.classList.add('over');
  };
  /** The thing under the pointer, the one being dragged aside. */
  private overAt(e: PointerEvent, dragged: Element | null): SVGGElement | null {
    return (document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest('g.dg-thing:not(.edge)')).find((el) => el && el !== dragged) as SVGGElement | null) ?? null;
  }
  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    this.quietUntil = performance.now() + 400;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
    const over = this.overAt(e, g);
    this.querySelectorAll('.dg-pic g.over').forEach((el) => el.classList.remove('over'));
    const onto = over ? this.view.d.shapes[+over.dataset.i!]?.hit : undefined;
    if (onto && onto.k !== 'lane' && onto.k !== 'edge') return void this.change(dropOn(this.doc, d.hit, onto), d.hit, null);
    const [x, y] = this.point(e);
    const key = regionAt(this.view.d, x, y);
    if (key !== undefined) this.change(dropIn(this.doc, d.hit, key), d.hit, null);
  };
  private onCancel = () => {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
  };

  /* ---------- the bar ---------- */

  private kindItems(): MenuItem[] {
    return KINDS.map((k) => ({ label: kindName(k), icon: KIND_ICON[k], checked: this.view.kind === k, does: () => (this.shut(), this.change(setKind(this.doc, k), null)) }));
  }
  private inserts(): MenuItem[] {
    const kind = this.view.kind;
    return [
      {
        label: thingName(kind),
        icon: UI.plus,
        does: () => {
          this.shut();
          const wrap = this.querySelector<HTMLElement>('.dg-wrap')!.getBoundingClientRect();
          this.openDraft(newThing(this.doc), this.anchorAt({ clientX: wrap.left + Math.min(wrap.width / 2, 160), clientY: wrap.top + 24 }));
        },
      },
    ];
  }
  /** Mod with the wheel (a trackpad's pinch is one) zooms the picture; the wheel alone scrolls. */
  private onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.zoomBy(-Math.sign(e.deltaY) * 0.25);
  };
  private zoomBy(by: number) {
    const wrap = this.querySelector<HTMLElement>('.dg-wrap');
    const now = this.zoom || Math.min(1, (wrap?.clientWidth ?? this.view.d.w) / this.view.d.w);
    this.zoom = Math.max(0.25, Math.min(3, Math.round((now + by) * 4) / 4));
  }

  /* ---------- drawing ---------- */

  private thing(s: DShape, i: number, all: DShape[], on: number) {
    const hit = s.hit;
    const body = unsafeSVG(shapeSvg(s, all, THEME, !!hit));
    if (!hit) return svg`<g>${body}</g>`;
    const words = s.text.replace(/^:[a-z0-9-]+\s*/, '') || (isLink(s.k) || hit.k === 'edge' ? t('a connection') : t('empty'));
    // A mind map's cross-link is a curve and its words beside it: one stop for the keys, the curve.
    const stop = hit.k === 'edge' && s.k === 't' ? '-1' : '0';
    return svg`<g class="dg-thing ${hit.k === 'edge' ? 'edge' : ''} ${i === on ? 'on' : ''}" data-i=${i} tabindex=${stop} role="button" aria-label=${words}>${body}</g>`;
  }
  render() {
    const { kind, d } = this.view;
    const tg = this.target;
    const on = tg ? this.indexOf(tg) : -1;
    const shown = this.shown();
    const words = this.wording(tg);
    const width = this.zoom ? `width:${Math.round(d.w * this.zoom)}px;max-width:none` : `width:100%;max-width:${d.w}px`;
    const hint = this.joining === '' ? t('Tap the first thing to join, then the other; tap empty space to stop.') : this.joining !== null ? t('Tap the thing to join {name} to; tap empty space to stop.', { name: this.joining }) : kindHint(kind);
    return html`<to-bar class="dg-bar">
        <to-menu class="dg-kind" caret .label=${kindName(kind)} .icon=${KIND_ICON[kind]} .items=${this.kindItems()}></to-menu>
        <to-insert .items=${this.inserts()}></to-insert>
        ${joins(kind) ? tool({ label: t('Join'), icon: Spline, keep: true, pressed: this.joining !== null, does: () => this.armJoin() }) : nothing}
        ${tool({ label: t('Zoom out'), icon: ZoomOut, does: () => this.zoomBy(-0.25) })}
        ${tool({ label: t('Zoom in'), icon: ZoomIn, does: () => this.zoomBy(0.25) })}
        ${this.undoTools()}
      </to-bar>
      <p class="dg-hint to-hint" aria-live="polite">${hint}</p>
      <div class="dg-wrap ${this.joining !== null ? 'joining' : ''}" tabindex="-1" @click=${this.onClick} @keydown=${this.onKey} @wheel=${this.onWheel}>
        <svg class="dg-pic" viewBox="0 0 ${d.w} ${d.h}" style=${width} xmlns="http://www.w3.org/2000/svg" role="group" aria-label=${kindName(kind)}
          @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onCancel}>
          <defs>${unsafeSVG(arrowDefs('var(--to-ink)'))}</defs>
          ${d.shapes.map((s, i) => this.thing(s, i, d.shapes, on))}
        </svg>
        ${d.shapes.length ? nothing : html`<p class="dg-empty to-hint">${t('Tap here to add the first {thing}.', { thing: thingName(kind).toLowerCase() })}</p>`}
        <span class="dg-anchor" aria-hidden="true"></span>
      </div>
      <div class="dg-pop" popover="manual" @keydown=${{ handleEvent: this.onPopKey, capture: true }}>
        <to-text shape="line" .blocks=${shown ? this.one(shown) : IDLE} .label=${words.label} .placeholder=${words.placeholder}
          no-bubble @text-ops=${this.onOps} @text-enter=${this.onEnter} @text-exit=${this.onExit} @text-escape=${this.onEscape} @text-selectall=${this.onSelectAll}></to-text>
      </div>
      <to-context class="dg-context" .label=${t('This thing')} .items=${this.contextItems(tg)}></to-context>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDiagramEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-diagram-editor': ToDiagramEditor;
  }
}
