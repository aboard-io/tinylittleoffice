/**
 * <to-diagram-editor>: the picture is the editor. Tap empty space and a new thing is made there (in a lane,
 * or in the circles tapped), its words offered and chosen; tap a thing and its words are typed where they are
 * drawn, in a <to-text> laid exactly over them (the Drawing Tool's overlay, placed by `wordsOver`), with the few
 * things to do to it underneath (one more like it, a picture, a connection, take it away); Enter starts the
 * next; drag a thing onto another to put it under or after it, into a lane or a set to move it there. The
 * kind is a menu in the one bar. Every change is the kernel's operations (model.ts): a `text` op on the line
 * for the words typed, a `splice` when a thing comes or goes, a `move` when one moves; nothing else
 * touches the document.
 *
 * The thing open (or, with its words closed, the thing that has the focus) is the thing in hand: under the words a
 * <to-context> in the standard's order (Move up, Move down, the kind's own, Duplicate | Copy, Cut, Paste | Delete),
 * and the keys of docs/editing.md on a focused thing (arrows go to the nearest thing that way, Alt+Up/Down move it
 * past its neighbour, in a tree Tab and Shift+Tab indent it under the thing before it and bring it out to its grandparent
 * with its children, as the Outliner does, Mod+Alt+Left/Right into the next lane or table, Mod+D, Mod+C/X/V, Delete,
 * Enter). Where it cannot go further in or out Tab moves the focus on, so the keys are never trapped. The words are
 * plain (`no-bubble`, no marks); Shift+Enter is a second line where the thing draws one ("Name | Role", a
 * date and what happened); Escape puts them back as they were when opened, Enter or Mod+Enter or a tap
 * elsewhere keeps them. No box ever holds the words apart from the picture (docs/editing.md §5). Undo brings
 * the focus back to the thing that changed.
 *
 * A seating chart's bar has Print place cards: a card a guest, their name large and their table small, eight to
 * a letter sheet with lines to cut along (view.ts `placeCards`), through the kit's print path.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ArrowDown, ArrowRight, ArrowUp, ClipboardPaste, CopyPlus, CornerDownRight, Minus, Scissors, Smile, Spline, ZoomIn, ZoomOut } from 'lucide';
import { apply, applyAll, isAtomic, normalRuns, parse, runLength, sliceRuns, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { GENERATOR, docToHtml, pasteFrom } from '../../kit/clipboard.ts';
import { SEP, type ContextEntry, type ToContext } from '../../kit/context.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem } from '../../kit/menu.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { caret, insertRuns } from '../../kit/textops.ts';
import { isLink, wordsOver } from '../draw/model.ts';
import { arrowDefs, shapeSvg, type Theme } from '../draw/view.ts';
import { KIND_ICON, kindHint, kindName, newWords, thingName } from './kinds.ts';
import { KINDS, canDuplicate, charsOf, childOf, commitDraft, connect, dropIn, dropOn, duplicateThing, edgesOf, follow, isListed, isTree, joins, kindOf, lineOf, demoteThing, moveAcross, moveThing, nextThing, newThing, partFor, promoteThing, pasteThings, removeThing, rename, setEdge, setKind, thingBlocks, tidy, withIcon, type Draft, type Hit, type KindId } from './model.ts';
import { layout, placeCards, regionAt, type DShape, type Diagram } from './view.ts';
import { printPages } from '../../kit/exports.ts';
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
 * What the words over the picture are editing: a thing of a line of the document (`at`; the characters of the
 * line its words take, `span`), or a name that is not one line's words (a lane, a thing only connections name, a
 * connection's words), written back wherever the name is.
 */
interface Target {
  hit: Hit;
  at: number;
  span: [number, number];
  /** A second line is kept, as the line's " | " (a timeline's event: its date, then ": " and what happened). */
  lines: boolean;
  dated: boolean;
  /** The name as it stands, for a name renamed wherever it is. */
  name: string;
}

type Drag = { i: number; hit: Hit; x: number; y: number; moved: boolean };

const OBJ = '￼';
const plain = (runs: Run[]) => charsOf(runs).split(OBJ).join('').replace(/\s+/g, ' ').trim();
/** A line's " | " as the words over it show it, a line break; and back. */
const asLines = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: r.t.split(' | ').join('\n') }));
const asBars = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: r.t.replace(/[ \t]*\n[ \t]*/g, ' | ') }));
const oneLine = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: r.t.replace(/\s*\n\s*/g, ' ') }));
/** What the words over the picture hold while nothing is open: they are always there, so a tap can focus them at once. */
const IDLE: Block[] = [{ k: 'p', runs: [] }];
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
  /** The thing whose words are open, or null. */
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
  /** Counts the times the words are opened: a burst of typing is one undo step within one opening only. */
  private session = 0;
  /** The document as it was when the words were opened (Escape puts it back), and the thing they were opened on. */
  private openText: string | null = null;
  private openHitAt: Hit | null = null;
  /** The words over the thing open, as <to-text> holds them: one block, its lines the thing's lines. */
  private wordsBlocks: Block[] = IDLE;
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
    if (this.target) this.placeWords();
    this.syncContext();
  }
  /** The things to do to the thing open sit under its words while a thing is in hand. */
  private syncContext() {
    const ctx = this.ctx;
    const el = this.wordsEl;
    if (!ctx) return;
    if (this.target && el && !el.hidden) {
      if (!ctx.isOpen) ctx.show(el);
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
  /** Where a person starts: the picture itself, nothing being edited. */
  async focusFirst() {
    await this.updateComplete;
    this.wrap?.focus({ preventScroll: true });
  }
  /** The focus on a thing once the picture is drawn again; on the picture itself when the thing is gone. */
  private async focusThing(hit: Hit | null, at = -1) {
    await this.updateComplete;
    (this.gOf(hit, at) ?? this.wrap)?.focus({ preventScroll: true });
  }

  /* ---------- the words, typed where they are drawn ---------- */

  private get wordsEl(): ToText | null {
    return this.querySelector<ToText>('to-text.dg-words');
  }
  /** What the words are called, and what they say while empty, for a target. */
  private wording(tg: Target | null): { label: string; placeholder: string } {
    const kind = this.view.kind;
    const h = tg?.hit;
    if (h?.k === 'edge') return { label: t('What the connection says'), placeholder: t('What the connection says') };
    if (h?.k === 'lane') return { label: t('The lane\'s name'), placeholder: t('Who') };
    return { label: thingName(kind), placeholder: newWords(kind, h?.k === 'line' && typeof h.part === 'number') };
  }
  /**
   * A thing's words as a target and as the words over it show them: the part of its line the thing draws (an
   * icon in front left where it is, drawn on the thing), its " | " as line breaks; a timeline's date its first line.
   */
  private targetFor(hit: Hit): { tg: Target; runs: Run[] } | null {
    if (hit.k !== 'line') {
      const name = hit.k === 'edge' ? (edgesOf(this.doc).find((e) => e.at === hit.at)?.label ?? '') : hit.name;
      return { tg: { hit, at: -1, span: [0, 0], lines: false, dated: false, name }, runs: name ? [{ t: name }] : [] };
    }
    const b = this.doc.blocks[hit.at];
    if (b?.k !== 'li') return null;
    const l = lineOf(b, hit.at);
    const p = partFor(l, hit.part);
    if (!p) return null;
    let from = p.from;
    while (from < p.to && (/\s/.test(l.chars[from]) || (l.chars[from] === OBJ && sliceRuns(l.runs, from, from + 1)[0]?.ic))) from++;
    const lines = hit.part === 'all' || hit.part === 'words';
    const dated = this.view.kind === 'timeline' && hit.part === 'all';
    const tg: Target = { hit, at: hit.at, span: [from, p.to], lines, dated, name: '' };
    if (dated && l.key && l.key.from >= from) return { tg, runs: [...asLines(sliceRuns(l.runs, from, l.key.to)), { t: '\n' }, ...asLines(sliceRuns(l.runs, l.words.from, p.to))] };
    return { tg, runs: lines ? asLines(sliceRuns(l.runs, from, p.to)) : sliceRuns(l.runs, from, p.to) };
  }
  /** The words over a line's thing, as its line writes them: line breaks as " | " (a timeline's first as ": "). */
  private lineRuns(tg: Target, runs: Run[]): Run[] {
    if (!tg.lines) return normalRuns(oneLine(runs));
    const chars = charsOf(runs);
    const i = chars.indexOf('\n');
    if (tg.dated && i >= 0) return normalRuns([...sliceRuns(runs, 0, i), { t: ': ' }, ...asBars(sliceRuns(runs, i + 1, chars.length))]);
    return normalRuns(asBars(runs));
  }

  /**
   * The words of a thing, over it, the caret (or a selection) at [from, to) of them, all of them chosen when none
   * is given. Focused here, synchronously, in the tap's, the key's or the menu's own handler, as the Drawing Tool's
   * are: iOS lets the focus in and raises the keyboard only so.
   */
  private open(hit: Hit, sel?: [number, number], fresh = true) {
    const found = this.targetFor(hit);
    const el = this.wordsEl;
    if (!found || !el) return;
    if (fresh) {
      this.session++;
      this.openText = write(this.doc);
      this.openHitAt = hit;
    }
    this.target = found.tg;
    this.wordsBlocks = [{ k: 'p', runs: found.runs }];
    el.blocks = this.wordsBlocks;
    Object.assign(el, this.wording(found.tg));
    el.hidden = false;
    this.placeWords();
    el.tx?.focus({ preventScroll: true });
    const [from, to] = sel ?? [0, runLength(found.runs)];
    el.sel = { anchor: { block: 0, offset: from }, focus: { block: 0, offset: to } };
  }
  /**
   * The words laid exactly over the thing's own (which it draws blank meanwhile): the same font at the size the
   * picture shows it, in the wrap's frame so they scroll with the picture.
   */
  private placeWords() {
    const el = this.wordsEl;
    const tg = this.target;
    const wrap = this.wrap;
    const pic = this.querySelector<SVGSVGElement>('.dg-pic');
    const { d } = this.view;
    const s = tg ? d.shapes[this.indexOf(tg)] : undefined;
    if (!el || !s || !wrap || !pic) return;
    const r = pic.getBoundingClientRect();
    const box = wrap.getBoundingClientRect();
    const w = wordsOver(s, d.shapes, r.width / d.w, r.left - box.left + wrap.scrollLeft, r.top - box.top + wrap.scrollTop, THEME);
    Object.assign(el.style, w.style);
    el.classList.toggle('left', w.left);
    el.classList.toggle('wrap', w.wrap);
  }
  /**
   * A new thing: in the document at once, its words offered (the kind's "New idea", "Name", a table's next name)
   * and chosen, so the first letter typed replaces them; Escape takes it away again. The words open over it.
   */
  private openDraft(d: Draft) {
    const kind = this.view.kind;
    let block = d.block;
    let [a, b] = d.sel;
    if (a === b) {
      const words = newWords(kind, isListed(kind) && /:(\s|$)/.test(charsOf(block.runs)));
      block = { ...block, runs: normalRuns([...sliceRuns(block.runs, 0, a), { t: words }, ...sliceRuns(block.runs, a, runLength(block.runs))]) };
      b = a + words.length;
    }
    this.session++;
    this.openText = write(this.doc);
    const mark: Mark = { before: null, after: null };
    this.edit(commitDraft(d, block), `line:${d.at}:${this.session}`, mark);
    const hit = (mark.after = this.hitOn(d.at, a, b));
    this.openHitAt = hit;
    const tg = this.targetFor(hit)?.tg;
    const at = tg ? tg.span[0] : 0;
    this.open(hit, [Math.max(0, a - at), Math.max(0, b - at)], false);
  }
  /** The thing drawn for the characters [a, b) of line `at`: the smallest part of it that holds them. */
  private hitOn(at: number, a: number, b: number): Hit {
    const blk = this.doc.blocks[at];
    let best: Hit = { k: 'line', at, part: 'all' };
    if (blk?.k !== 'li') return best;
    const l = lineOf(blk, at);
    let size = Infinity;
    for (const s of this.view.d.shapes) {
      const h = s.hit;
      if (h?.k !== 'line' || h.at !== at) continue;
      const p = partFor(l, h.part);
      if (p && p.from <= a && p.to >= b && p.to - p.from < size) [best, size] = [h, p.to - p.from];
    }
    return best;
  }
  /** Done with the words: hidden, and a list they leave tidied. */
  private shut(tidyUp = true) {
    const tg = this.target;
    if (!tg) return;
    this.target = null;
    this.openText = null;
    this.wordsBlocks = IDLE;
    const el = this.wordsEl;
    if (el) {
      el.hidden = true;
      el.blocks = this.wordsBlocks;
    }
    this.ctx?.hide();
    if (tidyUp && tg.at >= 0) this.edit(tidy(this.doc, tg.at));
  }
  /** Done: the words kept, the focus back on the thing they were opened on. */
  private shutAndFocus() {
    const hit = this.target?.hit ?? null;
    this.shut();
    void this.focusThing(hit);
  }

  private onOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    this.applyWords(e.detail.ops, e.detail.kind);
  };
  /** The words' ops: applied to their block, handed back, and the thing's words written where they belong, so the picture follows. */
  private applyWords(ops: Op[], kind?: string) {
    const tg = this.target;
    const el = this.wordsEl;
    if (!tg || !el) return;
    const blocks = applyAll({ head: {}, blocks: this.wordsBlocks }, ops).blocks;
    // One block of words: anything that came as more is folded into the first, a line break between.
    const runs = blocks.flatMap((b, n) => [...(n ? [{ t: '\n' }] : []), ...('runs' in b ? b.runs : [])]);
    this.wordsBlocks = [{ k: 'p', runs }];
    el.blocks = this.wordsBlocks;
    if (tg.at >= 0) {
      const before = this.doc;
      const put = this.lineRuns(tg, runs);
      const op: Op = { op: 'text', at: tg.at, from: tg.span[0], to: tg.span[1], runs: put };
      this.target = { ...tg, span: [tg.span[0], tg.span[0] + runLength(put)] };
      this.change([op, ...follow(before, apply(before, op), tg.at)], tg.hit, tg.hit, kind ? `line:${tg.at}:${this.session}` : undefined);
      return;
    }
    const now = plain(runs);
    const done = rename(this.doc, tg.hit, tg.name, now);
    const hit: Hit = tg.hit.k === 'lane' && done.length ? { k: 'lane', name: now } : tg.hit.k === 'node' && done.length ? { k: 'node', name: now } : tg.hit;
    this.target = { ...tg, name: done.length || tg.hit.k === 'edge' ? now : tg.name, hit };
    this.change(done, tg.hit, hit, `name:${tg.hit.k}:${this.session}`);
  }
  /** Enter: the next thing like this one, made and its words open. Shift+Enter a second line, where the thing draws one. */
  private onEnter = (e: CustomEvent<{ shift: boolean }>) => {
    e.stopPropagation();
    const tg = this.target;
    const el = this.wordsEl;
    if (!tg) return;
    if (e.detail?.shift && tg.lines && el) {
      const runs = this.wordsBlocks[0]?.k === 'p' ? this.wordsBlocks[0].runs : [];
      const r = insertRuns(this.wordsBlocks, el.sel ?? caret(0, runLength(runs)), [{ t: '\n' }]);
      this.applyWords(r.ops, 'type');
      el.sel = r.sel;
      return;
    }
    if (tg.hit.k === 'edge') return this.shutAndFocus();
    this.shut();
    const d = nextThing(this.doc, tg.hit);
    if (d) this.openDraft(d);
    else void this.focusThing(tg.hit);
  };
  /** Backspace at the start: a thing with no words left goes. */
  private onExit = (e: Event) => {
    e.stopPropagation();
    const tg = this.target;
    if (tg?.hit.k !== 'line') return;
    const b = this.doc.blocks[tg.at];
    const p = b?.k === 'li' ? partFor(lineOf(b, tg.at), tg.hit.part) : null;
    if (p && !p.words && !p.icon) {
      const ops = removeThing(this.doc, tg.hit);
      this.shut(false);
      this.change(ops, tg.hit, null);
      void this.focusThing(null);
    }
  };
  /** Escape, once <to-text> has closed its boxes and collapsed its words: the words as they were when opened (a new thing gone again), the thing still in hand. */
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
  /** Mod+A with the words already whole: there is no choosing every thing of a picture, so the words stay chosen. */
  private onSelectAll = (e: Event) => e.stopPropagation();
  /**
   * Keys in the words, before <to-text> sees them: Mod+Enter is done; the words are plain, so the marks' keys do
   * nothing; Mod+D, Alt+Up/Down and, in a tree, Tab and Shift+Tab act on the thing open, as they do on a focused one.
   */
  private onWordsKey = (e: KeyboardEvent) => {
    if (e.isComposing || !(e.target as Element).closest?.('to-text')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    const stop = () => (e.preventDefault(), e.stopPropagation());
    if (mod && !e.altKey && e.key === 'Enter') return void (stop(), this.shutAndFocus());
    if (mod && !e.altKey && (e.shiftKey ? k === 'x' || k === 'h' : k === 'b' || k === 'i' || k === 'u' || k === 'k')) return void stop();
    const hit = this.target?.hit ?? null;
    if (!hit) return;
    if (mod && !e.altKey && !e.shiftKey && k === 'd') return void (stop(), this.duplicate(hit));
    if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) return void (stop(), this.move(hit, e.key === 'ArrowUp' ? -1 : 1));
    if (e.key === 'Tab' && !mod && !e.altKey && this.canShift(hit, e.shiftKey ? -1 : 1)) return void (stop(), this.shift(hit, e.shiftKey ? -1 : 1));
  };
  /** The focus gone from the words by the keys (Tab) to somewhere not the picture, the things under them or a box of theirs: done with them. */
  private onWordsBlur = (e: FocusEvent) => {
    const to = e.relatedTarget as Element | null;
    if (!this.target || !to || this.contains(to) || to.closest?.('to-context, [popover], dialog')) return;
    this.shut();
  };

  private indexOf(tg: Target): number {
    return this.view.d.shapes.findIndex((s) => sameHit(s.hit, tg.hit));
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
    if (tg) return tg.hit;
    const g = (document.activeElement as Element | null)?.closest?.('g.dg-thing');
    return g && this.contains(g) ? (this.view.d.shapes[+(g as SVGGElement).dataset.i!]?.hit ?? null) : null;
  }
  /** After an edit to the thing in hand: its words open on it again where it now is, or the focus on it. */
  private async reopenOn(hit: Hit | null, open: boolean, fresh = false, sel?: [number, number]) {
    if (!open || hit?.k !== 'line') return this.focusThing(hit);
    await this.updateComplete;
    if (!this.gOf(hit) || !this.targetFor(hit)) return this.focusThing(hit);
    this.open(hit, sel, fresh);
  }
  /** Past its neighbour (Alt+Up/Down, Move up/down); the words stay open on it if they were. */
  private move(hit: Hit, by: 1 | -1) {
    const r = moveThing(this.doc, hit, by);
    if (!r) return;
    const open = !!this.target;
    this.change(r.ops, hit, r.hit);
    void this.reopenOn(r.hit, open);
  }
  /** Whether a tree's thing can go in under the thing before it (1) or out to its grandparent (-1). */
  private canShift(hit: Hit, by: 1 | -1): boolean {
    return !!(by > 0 ? demoteThing : promoteThing)(this.doc, hit);
  }
  /**
   * Indent (Tab) or bring out (Shift+Tab) a tree's thing with its family. Open words are kept first, as Enter keeps
   * them, and opened again on the thing where it now is, the caret where it was; one undo step takes the move back.
   */
  private shift(hit: Hit, by: 1 | -1) {
    const r = (by > 0 ? demoteThing : promoteThing)(this.doc, hit);
    if (!r) return;
    const open = !!this.target;
    const s = this.wordsEl?.sel;
    const sel: [number, number] | undefined = open && s ? [s.anchor.offset, s.focus.offset] : undefined;
    this.shut();
    this.change(r.ops, hit, r.hit);
    void this.reopenOn(r.hit, open, true, sel);
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

  /** The things to do to the thing open, in the standard's order: Move up, Move down, the kind's own, a tree's Indent and Bring out, Duplicate | Copy, Cut, Paste | Delete. */
  private contextItems(tg: Target | null): ContextEntry[] {
    const hit = tg?.hit;
    if (!tg || !hit) return [];
    const kind = this.view.kind;
    const add = (d: Draft | null) => {
      this.shut();
      if (d) this.openDraft(d);
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
    if (hit.k === 'line' && isTree(kind)) {
      out.push({ label: t('Indent'), icon: UI.indent, keys: 'Tab', disabled: !this.canShift(hit, 1), does: () => this.shift(hit, 1) });
      out.push({ label: t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', disabled: !this.canShift(hit, -1), does: () => this.shift(hit, -1) });
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
  /** A tap on the picture: on a thing, its words (or the other end of a connection being made); on empty space, a new thing there. */
  private onClick = (e: MouseEvent) => {
    if (performance.now() < this.quietUntil || (e.target as Element).closest('.dg-words')) return;
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const hit = g ? this.view.d.shapes[+g.dataset.i!]?.hit : undefined;
    if (this.target) return this.shut();
    if (this.joining !== null) return this.joinTo(hit);
    if (hit) return this.open(hit);
    const [x, y] = this.point(e);
    this.openDraft(newThing(this.doc, regionAt(this.view.d, x, y)));
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
    if (!at || this.wrap?.contains(at) || at.closest?.('to-context, dialog, [popover], to-bar')) return;
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
    if (at.closest('input, textarea, select, [contenteditable], to-text, dialog, [popover], to-bar, button')) return;
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
      this.open(hit);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) {
      e.preventDefault();
      this.removeHit(hit);
    } else if (mod && !e.altKey && !e.shiftKey && k === 'd') {
      e.preventDefault();
      this.duplicate(hit);
    } else if (e.altKey && !mod && !e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.move(hit, e.key === 'ArrowUp' ? -1 : 1);
    } else if (e.key === 'Tab' && !mod && !e.altKey && this.canShift(hit, e.shiftKey ? -1 : 1)) {
      e.preventDefault();
      this.shift(hit, e.shiftKey ? -1 : 1);
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
          this.openDraft(newThing(this.doc));
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
    // The thing whose words are being typed is drawn without them: the words over it hold them, nothing doubles.
    const body = unsafeSVG(shapeSvg(i === on ? { ...s, text: '' } : s, all, THEME, !!hit));
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
    const words = this.wording(tg);
    const width = this.zoom ? `width:${Math.round(d.w * this.zoom)}px;max-width:none` : `width:100%;max-width:${d.w}px`;
    const hint = this.joining === '' ? t('Tap the first thing to join, then the other; tap empty space to stop.') : this.joining !== null ? t('Tap the thing to join {name} to; tap empty space to stop.', { name: this.joining }) : kindHint(kind);
    return html`<to-bar class="dg-bar">
        <to-menu class="dg-kind" caret .label=${kindName(kind)} .icon=${KIND_ICON[kind]} .items=${this.kindItems()}></to-menu>
        <to-insert .items=${this.inserts()}></to-insert>
        ${joins(kind) ? tool({ label: t('Join'), icon: Spline, keep: true, pressed: this.joining !== null, does: () => this.armJoin() }) : nothing}
        ${kind === 'seating' ? tool({ label: t('Print place cards'), icon: UI.print, cls: 'dg-cards', hint: t('Print place cards: a card a guest, eight to a letter sheet, to cut out'), does: () => void printPages(placeCards(this.doc), this.doc.head.title || t('Place cards')) }) : nothing}
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
        <to-text class="dg-words" hidden shape="line" no-bubble .blocks=${this.wordsBlocks} .label=${words.label} .placeholder=${words.placeholder}
          @keydown=${{ handleEvent: this.onWordsKey, capture: true }} @focusout=${this.onWordsBlur}
          @text-ops=${this.onOps} @text-enter=${this.onEnter} @text-exit=${this.onExit} @text-escape=${this.onEscape} @text-selectall=${this.onSelectAll}></to-text>
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
