/**
 * <to-diagram-editor>: the picture is the editor. Tap empty space and a new thing is made there (in a lane,
 * or in the circles tapped), its words offered and chosen; tap a thing and its words are typed where they are
 * drawn, in a <to-text> laid exactly over them (the Drawing Tool's overlay, placed by `wordsOver`), with the few
 * things to do to it underneath (one more like it, a picture, a connection, take it away); Enter starts the
 * next; drag a thing onto another to put it under or after it, into a set to move it there, and a swimlane's step
 * by its grip to the lane and the place it is let go (the others keep theirs; a tap's new step goes last). The
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
 * plain (`no-bubble`, no marks), and plain whatever they hold: the line is written with its separators escaped
 * (model.ts `wordsInto`). Shift+Enter is a second line where the thing draws one ("Name | Role", a
 * date and what happened); a comma ending a thing of a list is the next, as Enter is, and a "+" ending a family's
 * name starts the partner's (anywhere else they are characters). Escape puts them back as they were when opened,
 * Enter or Mod+Enter or a tap elsewhere keeps them. No box ever holds the words apart from the picture (docs/editing.md §5). Undo brings
 * the focus back to the thing that changed.
 *
 * A seating chart's bar has Print place cards: a card a guest, their name large and their table small, eight to
 * a letter sheet with lines to cut along (view.ts `placeCards`), through the kit's print path.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { apply, applyAll, normalRuns, parse, runLength, sliceRuns, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { cmdMenu, cmdTool } from '../../kit/ui/bar.ts';
import { contextOf, drawnIn, runKey } from '../../kit/core/commands.ts';
import COMMANDS, { PICTURE, WORDS } from './commands.ts';
import { GENERATOR, docToHtml, pasteFrom } from '../../kit/text/clipboard.ts';
import { type ContextEntry, type ToContext } from '../../kit/ui/context.ts';
import { DocElement, firstAt, type Entry } from '../../kit/core/element.ts';
import { t } from '../../kit/core/i18n.ts';
import type { TextOps, ToText } from '../../kit/text/text.ts';
import { caret, insertRuns } from '../../kit/text/textops.ts';
import { isLink, wordsOver } from '../draw/model.ts';
import { arrowDefs, shapeSvg, type Theme } from '../draw/view.ts';
import { KIND_ICON, kindHint, kindName, newWords, thingName } from './kinds.ts';
import {
  charsOf,
  commitDraft,
  connect,
  dropIn,
  dropOn,
  duplicateThing,
  edgesOf,
  follow,
  isListed,
  joins,
  kindOf,
  lineOf,
  demoteThing,
  moveAcross,
  moveThing,
  nextThing,
  placeStep,
  newThing,
  partFor,
  promoteThing,
  hasLines,
  isDated,
  wordsInto,
  wordsOn,
  pasteThings,
  removeThing,
  rename,
  setEdge,
  setKind,
  thingBlocks,
  tidy,
  withIcon,
  type Draft,
  type Hit,
  type KindId,
} from './model.ts';
import { layout, placeCards, regionAt, type DShape, type Diagram } from './view.ts';
import { printPages } from '../../kit/file/exports.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/context.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/text/text.ts';
import { remScale } from '../../kit/ui/zoom.ts';
import { pinchZoom } from '../../kit/ui/pinch.ts';
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
  private unpinch: (() => void) | null = null;

  constructor() {
    super();
    this.target = null;
    this.joining = null;
    this.zoom = 0;
  }

  protected read(doc: Doc): DiagramView {
    return { kind: kindOf(doc), d: layout(doc, true) };
  }
  connectedCallback() {
    super.connectedCallback();
    // On the document: with nothing selected a browser may send the event to the body rather than the thing.
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener);
    document.addEventListener('pointerdown', this.onOutside, true);
    // Two fingers zoom the picture about them and pan it, read as every spatial canvas reads them.
    this.unpinch = pinchZoom(this, {
      frame: () => this.wrap,
      picture: () => this.querySelector('svg.dg-pic'),
      zoom: () => this.shown(),
      start: () => {
        // A second finger: the drag the first began is let go, and the tap it would end in is not one.
        this.onCancel();
        this.quietUntil = Infinity;
      },
      set: (z) => {
        this.zoom = Math.max(0.25, Math.min(3, z));
        return this.updateComplete;
      },
      end: (z) => {
        this.quietUntil = performance.now() + 400;
        this.zoom = Math.max(0.25, Math.min(3, Math.round(z * 4) / 4));
        return this.updateComplete;
      },
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener);
    document.removeEventListener('pointerdown', this.onOutside, true);
    this.unpinch?.();
    this.unpinch = null;
    this.ctx?.hide();
  }
  /** An edit that moves the thing in hand from `before` to `after`, so undo and redo can give it back. */
  change(ops: Op[], before: Hit | null, after: Hit | null = before, key?: string) {
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
    if (h?.k === 'edge') return { label: t('diagram-what-connection-says'), placeholder: t('diagram-what-connection-says') };
    if (h?.k === 'lane') return { label: t('diagram-lanes-name'), placeholder: t('diagram-who') };
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
    const kind = this.view.kind;
    const tg: Target = { hit, at: hit.at, span: [from, p.to], lines: hasLines(hit.part), dated: isDated(kind, hit.part), name: '' };
    return { tg, runs: wordsOn(kind, l, hit.part, from, p.to) };
  }
  /** The words over a line's thing, as its line writes them (model.ts `wordsInto`). */
  private lineRuns(tg: Target, runs: Run[]): Run[] {
    const b = this.doc.blocks[tg.at];
    return b?.k === 'li' && tg.hit.k === 'line' ? wordsInto(this.view.kind, lineOf(b, tg.at), tg.hit.part, runs) : runs;
  }

  /**
   * The words of a thing, over it, the caret (or a selection) at [from, to) of them, all of them chosen when none
   * is given. Focused here, synchronously, in the tap's, the key's or the menu's own handler, as the Drawing Tool's
   * are: iOS lets the focus in and raises the keyboard only so.
   */
  open(hit: Hit, sel?: [number, number], fresh = true) {
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
    // Measured on the screen, set in the wrap's own lengths, which are the screen's.
    const w = wordsOver(s, d.shapes, r.width / d.w, r.left - box.left + wrap.scrollLeft, r.top - box.top + wrap.scrollTop, THEME);
    Object.assign(el.style, w.style);
    el.classList.toggle('left', w.left);
    el.classList.toggle('wrap', w.wrap);
  }
  /**
   * A new thing: in the document at once, its words offered (the kind's "New idea", "Name", a table's next name)
   * and chosen, so the first letter typed replaces them; Escape takes it away again. The words open over it.
   */
  openDraft(d: Draft) {
    const kind = this.view.kind;
    let block = d.block;
    let [a, b] = d.sel;
    if (a === b) {
      const words = newWords(kind, isListed(kind) && !!lineOf(block, d.at).key);
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
  shut(tidyUp = true) {
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
  shutAndFocus() {
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
    const was = charsOf(this.wordsBlocks[0]?.k === 'p' ? this.wordsBlocks[0].runs : []);
    const blocks = applyAll({ head: {}, blocks: this.wordsBlocks }, ops).blocks;
    // One block of words: anything that came as more is folded into the first, a line break between.
    let runs: Run[] = blocks.flatMap((b, n) => [...(n ? [{ t: '\n' }] : []), ...('runs' in b ? b.runs : [])]);
    // The keys that act at the end of the words: a comma in a list is the next thing, as Enter is; a plus after a
    // family's name starts the partner's. Anywhere else they are the characters they are.
    let after: number | null = null;
    if (kind === 'type' && tg.hit.k === 'line') {
      const now = charsOf(runs);
      const head = was.split('\n')[0];
      if (typeof tg.hit.part === 'number' && isListed(this.view.kind) && now === was + ',' && was.trim()) return this.next(tg);
      if (this.view.kind === 'family' && tg.hit.part === 'all' && now === head + '+' + was.slice(head.length) && head.trim() && !head.trimEnd().endsWith('+')) {
        after = head.trimEnd().length + 3;
        runs = normalRuns([...sliceRuns(runs, 0, head.trimEnd().length), { t: ' + ' }, ...sliceRuns(runs, head.length + 1, now.length)]);
      }
    }
    this.wordsBlocks = [{ k: 'p', runs }];
    el.blocks = this.wordsBlocks;
    if (after !== null) el.sel = caret(0, after);
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
    // A name typed (a lane's, a connection's words) is done with Enter: no step or thing comes of it.
    if (tg.hit.k === 'edge' || tg.hit.k === 'lane') return this.shutAndFocus();
    this.next(tg);
  };
  /** Done with these words, and the next thing like this one made, its words open (Enter; a comma ending a thing of a list). */
  private next(tg: Target) {
    this.shut();
    const d = nextThing(this.doc, tg.hit);
    if (d) this.openDraft(d);
    else void this.focusThing(tg.hit);
  }
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
    if (runKey(e, WORDS, this)) return void e.stopPropagation();
    if (mod && !e.altKey && (e.shiftKey ? k === 'x' || k === 'h' : k === 'b' || k === 'i' || k === 'u' || k === 'k')) return void (e.preventDefault(), e.stopPropagation());
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

  async iconFor(hit: Hit) {
    const { chooseIcon } = await import('../../kit/ui/icons-picker.ts');
    const name = await chooseIcon({ emoji: false, none: true });
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
  move(hit: Hit, by: 1 | -1) {
    const r = moveThing(this.doc, hit, by);
    if (!r) return;
    const open = !!this.target;
    this.change(r.ops, hit, r.hit);
    void this.reopenOn(r.hit, open);
  }
  /** Whether a tree's thing can go in under the thing before it (1) or out to its grandparent (-1). */
  canShift(hit: Hit, by: 1 | -1): boolean {
    return !!(by > 0 ? demoteThing : promoteThing)(this.doc, hit);
  }
  /**
   * Indent (Tab) or bring out (Shift+Tab) a tree's thing with its family. Open words are kept first, as Enter keeps
   * them, and opened again on the thing where it now is, the caret where it was; one undo step takes the move back.
   */
  shift(hit: Hit, by: 1 | -1) {
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
  across(hit: Hit, by: 1 | -1) {
    const r = moveAcross(this.doc, hit, by);
    if (!r) return;
    const open = !!this.target;
    this.change(r.ops, hit, r.hit);
    void this.reopenOn(r.hit, open);
  }
  duplicate(hit: Hit) {
    const r = duplicateThing(this.doc, hit);
    if (!r.ops.length) return;
    this.shut();
    this.change(r.ops, hit, r.hit);
    void this.focusThing(r.hit);
  }
  removeHit(hit: Hit) {
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
  copyOut(hit: Hit, cut: boolean) {
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
  async pasteIn(hit: Hit | null) {
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

  /** The things to do to the thing open (commands.ts), in the standard's order: Move up, Move down, the kind's own, a tree's Indent and Bring out, Duplicate | Copy, Cut, Paste | Delete. */
  private contextItems(tg: Target | null): ContextEntry[] {
    return tg?.hit ? (contextOf(COMMANDS, this) as ContextEntry[]) : [];
  }
  /** A new thing, its words opened (Add under it, Add a step). */
  addFrom(d: Draft | null) {
    this.shut();
    if (d) this.openDraft(d);
  }
  /** Insert ▾'s thing: a new one, its words offered. */
  addThing() {
    this.shut();
    this.openDraft(newThing(this.doc));
  }
  setKindTo(k: KindId) {
    this.shut();
    this.change(setKind(this.doc, k), null);
  }
  /** A connection drawn as a plain line or an arrow. */
  toggleArrow(hit: Hit, arrow: boolean) {
    if (hit.k === 'edge') this.change(setEdge(this.doc, hit.at, { dir: arrow ? '--' : '->' }), hit);
  }
  printCards() {
    void printPages(placeCards(this.doc), this.doc.head.title || t('diagram-place-cards'));
  }
  /** A thing's name, for whether it can be joined from. */
  nameOfHit(hit: Hit): string {
    return this.nameOf(hit);
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
  armJoin() {
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
  /** The thing a key is typed on, while the commands answer it (commands.ts); null on the picture itself. */
  here: Hit | null = null;
  /** Keys on the picture (commands.ts): on a focused thing, the standard's (docs/editing.md §1, §5); on the picture, Escape stops a join. */
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing) return;
    const at = e.target as Element;
    if (at.closest('input, textarea, select, [contenteditable], to-text, dialog, [popover], to-bar, button')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    // Select all: never the page's words under the picture.
    if (mod && !e.altKey && !e.shiftKey && k === 'a') return void e.preventDefault();
    const g = at.closest<SVGGElement>('g.dg-thing');
    const hit = g ? this.view.d.shapes[+g.dataset.i!]?.hit : undefined;
    const clip = mod && !e.altKey && !e.shiftKey ? ({ c: 'copy', x: 'cut', v: 'paste' } as const)[k as 'c' | 'x' | 'v'] : undefined;
    if (clip && (hit || clip === 'paste') && this.joining === null) {
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
    this.here = g && hit ? hit : null;
    try {
      runKey(e, PICTURE, this);
    } finally {
      this.here = null;
    }
  };
  /** Enter or Space on a thing: its words open, or a join ends on it. */
  openKey(hit: Hit) {
    if (this.joining !== null) return this.joinTo(hit);
    this.open(hit);
  }
  /** An arrow on a thing: the nearest thing that way takes the focus. */
  nearestKey(e: KeyboardEvent): boolean {
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const to = g && this.nearest(g, e.key);
    to?.focus({ preventScroll: true });
    return !!g;
  }
  /** The first arrow on the picture goes in, to its first thing. */
  focusFirstThing() {
    this.querySelector<SVGGElement>('.dg-pic g.dg-thing')?.focus({ preventScroll: true });
  }
  private onDown = (e: PointerEvent) => {
    const g = (e.target as Element).closest<SVGGElement>('g.dg-thing');
    const i = g ? +g.dataset.i! : -1;
    const hit = this.view.d.shapes[i]?.hit;
    if (e.button !== 0 || !g || !hit || hit.k === 'edge' || hit.k === 'lane' || this.target) return;
    // A step of a swimlane moves by its grip alone: a press on its words is a tap, and nothing moves by accident.
    if (this.view.kind === 'lanes' && !(e.target as Element).closest('.dg-grip')) return;
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
    if (this.view.kind === 'lanes') return this.showSlot(x, y, d.i);
    const over = this.overAt(e, g);
    this.querySelectorAll('.dg-pic g.over').forEach((el) => el !== over && el.classList.remove('over'));
    over?.classList.add('over');
  };
  /**
   * Where a step of a swimlane let go at (x, y) would go: the lane under it, and its place among the other steps,
   * as many as stand to the left of the point; with where the line that shows it is drawn, between two steps.
   */
  private slotAt(x: number, y: number, i: number): { lane: string | undefined; slot: number; at: number; band?: DShape } {
    const shapes = this.view.d.shapes;
    const steps = shapes.filter((s, j) => j !== i && s.hit?.k === 'line').sort((a, b) => a.x - b.x);
    const slot = steps.filter((s) => s.x + s.w / 2 < x).length;
    const gap = 14;
    const at = !steps.length ? x : slot ? steps[slot - 1].x + steps[slot - 1].w + gap : steps[0].x - gap;
    const lane = regionAt(this.view.d, x, y);
    return { lane, slot, at, band: shapes.find((s) => s.region !== undefined && s.region === lane) };
  }
  private showSlot(x: number, y: number, i: number) {
    const line = this.querySelector<SVGLineElement>('.dg-slot');
    const { at, band } = this.slotAt(x, y, i);
    if (!line) return;
    line.toggleAttribute('hidden', !band);
    if (band) for (const [k, v] of Object.entries({ x1: at, x2: at, y1: band.y, y2: band.y + band.h })) line.setAttribute(k, String(v));
  }
  /** The thing under the pointer, the one being dragged aside. */
  private overAt(e: PointerEvent, dragged: Element | null): SVGGElement | null {
    return (
      (document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => el.closest('g.dg-thing:not(.edge)'))
        .find((el) => el && el !== dragged) as SVGGElement | null) ?? null
    );
  }
  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    this.drag = null;
    if (!d || !d.moved) return;
    this.quietUntil = performance.now() + 400;
    const g = this.querySelector<SVGGElement>(`.dg-pic g[data-i="${d.i}"]`);
    g?.removeAttribute('transform');
    g?.classList.remove('dragging');
    if (this.view.kind === 'lanes') {
      this.querySelector('.dg-slot')?.setAttribute('hidden', '');
      const [x, y] = this.point(e);
      const { lane, slot } = this.slotAt(x, y, d.i);
      if (lane !== undefined && d.hit.k === 'line') this.change(placeStep(this.doc, d.hit.at, lane, slot), d.hit, null);
      return;
    }
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
    this.querySelector('.dg-slot')?.setAttribute('hidden', '');
  };

  /* ---------- the bar ---------- */

  /** Mod with the wheel (a trackpad's pinch is one) zooms the picture; the wheel alone scrolls. */
  private onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    this.zoomBy(-Math.sign(e.deltaY) * 0.25);
  };
  zoomBy(by: number) {
    this.zoom = Math.max(0.25, Math.min(3, Math.round((this.shown() + by) * 4) / 4));
  }
  /** The zoom as the picture is drawn: its own, or (fitted to the width) the width it has over its natural one. */
  private shown(): number {
    const pic = this.querySelector<SVGSVGElement>('svg.dg-pic');
    return this.zoom || (pic ? pic.getBoundingClientRect().width / (this.view.d.w * remScale()) : 1);
  }

  /* ---------- drawing ---------- */

  private thing(s: DShape, i: number, all: DShape[], on: number) {
    const hit = s.hit;
    // The thing whose words are being typed is drawn without them: the words over it hold them, nothing doubles.
    const body = unsafeSVG(shapeSvg(i === on ? { ...s, text: '' } : s, all, THEME, !!hit));
    if (!hit) return svg`<g>${body}</g>`;
    const words = s.text.replace(/^:[a-z0-9-]+\s*/, '') || (isLink(s.k) || hit.k === 'edge' ? t('diagram-connection') : t('diagram-empty'));
    // A mind map's cross-link is a curve and its words beside it: one stop for the keys, the curve.
    const stop = hit.k === 'edge' && s.k === 't' ? '-1' : '0';
    // A swimlane's step has a grip on its top edge, the one way to drag it (Paul, 2026-10-18).
    const cx = s.x + s.w / 2;
    const grip =
      this.view.kind === 'lanes' && hit.k === 'line'
        ? svg`<g class="dg-grip"><title>${t('common-drag-to-move')}</title><rect x=${cx - 20} y=${s.y - 14} width="40" height="22" fill="transparent" />${[-6, 0, 6].flatMap((dx) => [-9, -4].map((dy) => svg`<circle cx=${cx + dx} cy=${s.y + dy} r="1.75" />`))}</g>`
        : nothing;
    return svg`<g class="dg-thing ${hit.k === 'edge' ? 'edge' : ''} ${i === on ? 'on' : ''}" data-i=${i} tabindex=${stop} role="button" aria-label=${words}>${body}${grip}</g>`;
  }
  render() {
    const { kind, d } = this.view;
    const tg = this.target;
    const on = tg ? this.indexOf(tg) : -1;
    const words = this.wording(tg);
    const width = this.zoom ? `width:${Math.round(d.w * this.zoom) / 16}rem;max-width:none` : `width:100%;max-width:${d.w / 16}rem`;
    const hint = this.joining === '' ? t('diagram-tap-first-thing-to-join') : this.joining !== null ? t('diagram-tap-thing-to-join-name', { name: this.joining }) : kindHint(kind);
    const own = (id: string) => COMMANDS.find((c) => c.id === `diagram.${id}`)!;
    return html`<to-bar class="dg-bar">
        ${cmdMenu(own('kind'), this, COMMANDS, 'dg-kind', { words: true, caret: true, icon: KIND_ICON[kind] })}
        <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
        ${joins(kind) ? cmdTool(own('join'), this) : nothing}
        ${cmdTool(own('cards'), this, { cls: 'dg-cards', keep: false })}
        ${cmdTool(own('zoomout'), this, { keep: false })} ${cmdTool(own('zoomin'), this, { keep: false })}
        ${this.undoTools()}
      </to-bar>
      <p class="dg-hint to-hint" aria-live="polite">${hint}</p>
      <div class="dg-wrap ${this.joining !== null ? 'joining' : ''}" data-spatial tabindex="-1" @click=${this.onClick} @keydown=${this.onKey} @wheel=${this.onWheel}>
        <svg class="dg-pic" viewBox="0 0 ${d.w} ${d.h}" style=${width} xmlns="http://www.w3.org/2000/svg" role="group" aria-label=${kindName(kind)}
          @pointerdown=${this.onDown} @pointermove=${this.onMove} @pointerup=${this.onUp} @pointercancel=${this.onCancel}>
          <defs>${unsafeSVG(arrowDefs('var(--to-ink)'))}</defs>
          ${d.shapes.map((s, i) => this.thing(s, i, d.shapes, on))}
          ${kind === 'lanes' ? svg`<line class="dg-slot" hidden />` : nothing}
        </svg>
        ${d.shapes.length ? nothing : html`<p class="dg-empty to-hint">${t('diagram-tap-here-to-add-first', { thing: thingName(kind).toLowerCase() })}</p>`}
        <to-text class="dg-words" hidden shape="line" no-bubble .blocks=${this.wordsBlocks} .label=${words.label} .placeholder=${words.placeholder}
          @keydown=${{ handleEvent: this.onWordsKey, capture: true }} @focusout=${this.onWordsBlur}
          @text-ops=${this.onOps} @text-enter=${this.onEnter} @text-exit=${this.onExit} @text-escape=${this.onEscape} @text-selectall=${this.onSelectAll}></to-text>
      </div>
      <to-context class="dg-context" .label=${t('diagram-this-thing')} .items=${this.contextItems(tg)}></to-context>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToDiagramEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-diagram-editor': ToDiagramEditor;
  }
}
