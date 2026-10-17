/**
 * <to-board-editor>: the Board app. The lanes are columns side by side, as many as the column holds, the rest wrapping
 * under them (a lane a row on a phone, so the words reflow with the size of everything and nothing scrolls sideways):
 * each its name (typed where it is drawn, kept on Enter or when the focus leaves it, put back by Escape), how many cards
 * it holds, and a menu (Add a card, Move left, Move right, Delete lane). A card is its grip, its title (a one-line
 * <to-text> over the table's plain cell) and its fields under it, as the Spreadsheet shows them.
 *
 * The title follows docs/editing.md §6: Enter at its end makes the next card in the lane, at its start a card above it,
 * in the middle splits it; Backspace at the start of an empty card takes it away, else joins it to the card before
 * (where it has no fields to lose), and Delete at the end joins the next in; Up and Down go from card to card in the
 * lane, Alt+Up/Down move the card along it, Mod+Alt+Left/Right carry it to the lane before or after, Mod+D duplicates
 * it, the caret kept where it was. Cards are rows of the kit's rows.ts: a tap on the grip, Escape or Shift+Up/Down in
 * the title choose them whole, and chosen cards are moved, duplicated, copied (a table as TLO and our HTML), cut,
 * pasted and deleted from the keys or the bar under them, which also carries them to the lane before or after. The
 * grip carries a card into any lane by a drag (pointer events, never HTML5 drag-and-drop), the place it would land
 * drawn. Every edit carries where the caret or the chosen cards were, so an undo puts them back. Every change is
 * operations on the document's table and head (model.ts). The bar holds Insert ▾ (a card, a lane), the count, undo
 * and redo.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { Ellipsis, GripVertical } from 'lucide';
import { applyAll, parse, plainText, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { drawnIn, runKey } from '../../kit/core/commands.ts';
import BOARD, { CHOSEN, WORDS } from './commands.ts';
import { clipText, docToHtml } from '../../kit/text/clipboard.ts';
import { DocElement, type Entry } from '../../kit/core/element.ts';
import { icon } from '../../kit/draw/icons.ts';
import { t } from '../../kit/core/i18n.ts';
import type { ToMenu } from '../../kit/ui/menu.ts';
import { lastCopied, Rows, type Clip, type RowItem, type RowRange, type RowSpan } from '../../kit/text/rows.ts';
import { caret } from '../../kit/text/textops.ts';
import type { TextOps, ToText } from '../../kit/text/text.ts';
import { reveal, scrollerOf } from '../../kit/ui/scroll.ts';
import {
  addCard,
  addLane,
  boardOf,
  cardsTable,
  duplicateCards,
  moveCard,
  moveCards,
  moveLane,
  pasteCards,
  removeCard,
  removeCards,
  removeLane,
  renameLane,
  setTitle,
  type BoardView,
  type Card,
  type Lane,
} from './model.ts';
import { shownCards, type Shown } from './view.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/text/text.ts';
import './style.css';

export const tag = 'to-board-editor';

type View = BoardView & { shown: Map<number, Shown> };
/** Where the selection was when an edit began (the entry's mark): cards chosen whole, or the caret in a card's title. */
type Mark = { range: RowRange<number> } | { row: number; offset: number };
/** Where a carried card would land: lane `lane`, at place `pos` among its other cards. */
interface Over {
  lane: number;
  pos: number;
}
/** How far a pointer moves before a press on a grip is a drag; how near an edge of what scrolls a drag scrolls it. */
const SLOP = 6;
const EDGE = 48;

const words = (b: Block[]): string =>
  b
    .map((x) => ('runs' in x ? plainText(x.runs) : ''))
    .join(' ')
    .replace(/\n/g, ' ');
const plainBlock = (s: string): Block => ({ k: 'p', runs: s ? [{ t: s }] : [] });
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

export class ToBoardEditor extends DocElement<View> {
  static properties: PropertyDeclarations = { cur: { state: true }, over: { state: true }, carrying: { state: true }, menuAt: { state: true } };
  /** The card in hand (the caret's), by its row; -1 for none. */
  declare cur: number;
  /** The lane in hand (the caret's, in its name or a card), by its place; -1 for none. */
  curLane = -1;
  /** The card being carried by its grip, by its row; -1 for none. */
  declare carrying: number;
  declare over: Over | null;
  /** The lane whose menu is open, by its place; -1 for none. */
  declare menuAt: number;
  /** A card's title or a lane's name as its editor holds it (a space typed at the end the table does not keep; a name not yet kept). */
  private drafts = new Map<string, Block>();
  private ones = new WeakMap<Block, Block[]>();
  private press: { id: number; x: number; y: number; row: number; moved: boolean } | null = null;
  private point = { x: 0, y: 0 };
  private scrolling = 0;
  /** A drag just ended on the grip: the click that follows it is not a tap. */
  private dragged = false;
  /** Cards chosen whole: the kit's one implementation (keys, the bar under them, the clipboard). The grip's drag is the board's own, across lanes. */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.board'),
    handle: '.board-grip',
    label: t('board-chosen-cards'),
    contextClass: 'board-context',
    current: () => (this.cardAt(this.cur) ? this.cur : null),
    edit: (row, offset) => void this.focusTitle(row, offset),
    remove: (_s, ids) => this.deleteCards(ids),
    canMove: (s, by) => !!this.runMove(s, by),
    move: (s, by) => this.moveRun(s, by),
    duplicate: (s) => this.duplicateRun(s),
    copy: (s) => this.clip(s),
    paste: (data, s) => this.pasteData(data, s),
    extra: () => drawnIn(CHOSEN, 'context', this),
  });

  constructor() {
    super();
    this.cur = -1;
    this.carrying = -1;
    this.over = null;
    this.menuAt = -1;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    // Escape during a drag lets it go, before anything else hears the key.
    this.addEventListener('keydown', this.onEscape, true);
    // Capturing: before a title's own editor hears a paste.
    this.addEventListener('paste', this.onPaste, true);
    this.addEventListener('focusout', this.onFocusOut);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('keydown', this.onEscape, true);
    this.removeEventListener('paste', this.onPaste, true);
    this.removeEventListener('focusout', this.onFocusOut);
    cancelAnimationFrame(this.scrolling);
  }

  protected read(doc: Doc): View {
    const v = boardOf(doc);
    return { ...v, shown: shownCards(doc, v) };
  }

  /* ---------- undo: the caret or the chosen cards come back ---------- */

  private mark(): Mark | undefined {
    const r = this.rows.range;
    if (r) return { range: { ...r } };
    return this.cardAt(this.cur) ? { row: this.cur, offset: this.caretIn(this.cur) } : undefined;
  }
  /** Every edit carries where the selection was before it. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    super.edit(ops, key, mark ?? this.mark());
  }
  /** After an undo the caret or the chosen cards come back as they were before the edit; else (and after a redo) the card the change touched first. */
  protected undone(entry: Entry, redo: boolean) {
    this.rows.release();
    const m = entry.mark as Mark | undefined;
    if (m && !redo && 'range' in m) {
      if (this.cardAt(m.range.anchor) && this.cardAt(m.range.focus)) return void this.updateComplete.then(() => this.rows.select(m.range));
    } else if (m && !redo && 'row' in m && this.cardAt(m.row)) return void this.focusTitle(m.row, m.offset);
    const op = entry.ops.find((o) => o.op === 'rows' || o.op === 'cells');
    const r = op && (op.op === 'rows' || op.op === 'cells') ? op.r : 0;
    const cards = [...this.view.cards].sort((a, b) => a.row - b.row);
    const card = cards.find((c) => c.row >= r) ?? cards[cards.length - 1];
    if (card) void this.focusTitle(card.row, 'end');
  }

  /* ---------- finding things ---------- */

  cardAt(row: number): Card | undefined {
    return row < 0 ? undefined : this.view.cards.find((c) => c.row === row);
  }
  private laneOf(card: Card): Lane {
    return this.view.lanes[card.lane];
  }
  /** A card's place among its lane's cards. */
  private placeOf(card: Card): number {
    return this.laneOf(card).cards.indexOf(card);
  }
  private titleBox(row: number): ToText | null {
    return this.querySelector<ToText>(`.board-card[data-row="${row}"] to-text`);
  }
  /** Where the caret is in a card's title, or its end. */
  private caretIn(row: number): number {
    const x = this.titleBox(row);
    return x?.sel ? x.sel.focus.offset : words(x?.blocks ?? []).length;
  }
  /** A card's title as its editor takes it: the words it holds (a draft kept while it says what the table says). */
  private titleBlocks(c: Card): Block[] {
    const key = `card:${c.row}`;
    let b = this.drafts.get(key);
    if (!b || flat(words([b])) !== c.title) this.drafts.set(key, (b = plainBlock(c.title)));
    return this.one(b);
  }
  /** A lane's name as its editor takes it: the name being typed, kept apart from the document until it is done. */
  private laneBlocks(l: Lane): Block[] {
    const key = `lane:${l.name}`;
    let b = this.drafts.get(key);
    if (!b) this.drafts.set(key, (b = plainBlock(l.name)));
    return this.one(b);
  }
  private one(b: Block): Block[] {
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }

  /** Where a person starts: the first card's title, the caret at its end; else the first lane's name (the page held still). */
  async focusFirst() {
    await this.updateComplete;
    const first = this.view.cards[0];
    if (first) return this.focusTitle(first.row, 'end', false);
    const x = this.querySelector<ToText>('.board-lane-name');
    if (!x) return this.querySelector<HTMLElement>('to-insert button')?.focus({ preventScroll: true });
    await x.updateComplete;
    x.sel = caret(0, words(x.blocks).length);
  }
  /** A card's title, once drawn, with the caret at `offset`. */
  async focusTitle(row: number, offset: number | 'end' = 'end', show = true) {
    this.cur = row;
    await this.updateComplete;
    const x = this.titleBox(row);
    if (!x) return;
    await x.updateComplete;
    const n = words(x.blocks).length;
    x.sel = caret(0, offset === 'end' ? n : Math.min(offset, n));
    if (show) reveal(x.closest('.board-card'));
  }
  /** A lane's name, once drawn, its words chosen whole (a new lane's, which typing replaces). */
  private async focusLane(i: number) {
    this.curLane = i;
    await this.updateComplete;
    const x = this.querySelector<ToText>(`.board-lane[data-lane="${i}"] .board-lane-name`);
    if (!x) return;
    await x.updateComplete;
    x.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: words(x.blocks).length } };
    reveal(x);
  }

  /* ---------- a card's title ---------- */

  private onTitleOps(e: CustomEvent<TextOps>, c: Card) {
    e.stopPropagation();
    const { ops, kind, before } = e.detail;
    const key = `card:${c.row}`;
    // The title is a plain cell: whatever the ops made is read back as words (no marks, one line).
    const now = words(applyAll({ head: {}, blocks: this.titleBlocks(c) }, ops).blocks);
    this.drafts.set(key, plainBlock(now));
    this.edit(setTitle(this.doc, c.row, now), kind ? key : undefined, { row: c.row, offset: before ? before.focus.offset : 0 });
    this.requestUpdate();
  }
  /** Enter in a title: at its end the next card, at its start a card above it, in the middle the card split there. */
  private onEnter(c: Card) {
    const lane = this.laneOf(c);
    const at = this.placeOf(c);
    const text = words(this.titleBlocks(c));
    const offset = this.caretIn(c.row);
    // An empty card at the end of its lane is enough.
    if (!flat(text) && at === lane.cards.length - 1) return;
    if (offset === 0 && flat(text)) {
      this.edit(addCard(this.doc, lane.name, '', at));
      return void this.focusTitle(this.view.lanes[c.lane].cards[at + 1]?.row ?? c.row, 0);
    }
    const head = setTitle(this.doc, c.row, text.slice(0, offset));
    const ops = [...head, ...addCard(applyAll(this.doc, head), lane.name, text.slice(offset), at + 1)];
    this.edit(ops);
    const made = this.view.lanes.find((l) => l.name === lane.name)?.cards[at + 1];
    if (made) void this.focusTitle(made.row, 0);
  }
  /**
   * Backspace at the start of a title, or Delete at its end (the line says which). Backspace takes an empty card away
   * (the caret to the card before, else the one after, else the lane's name), else joins the card to the one before;
   * Delete joins the next card in. A card is joined into another only when it has no fields to lose.
   */
  private onExit(c: Card, dir: 'back' | 'forward') {
    const lane = this.laneOf(c);
    const at = this.placeOf(c);
    const mine = words(this.titleBlocks(c));
    if (dir === 'back' && !flat(mine) && !c.fields.length) {
      this.edit(removeCard(this.doc, c.row));
      const left = this.view.lanes.find((l) => l.name === lane.name)?.cards ?? [];
      const to = left[Math.max(0, at - 1)];
      if (to) return void this.focusTitle(to.row, at > 0 ? 'end' : 0);
      return void this.focusLane(this.view.lanes.findIndex((l) => l.name === lane.name));
    }
    const [into, gone] = dir === 'back' ? [lane.cards[at - 1], c] : [c, lane.cards[at + 1]];
    if (!into || !gone || gone.fields.length) return;
    const first = into === c ? mine : into.title;
    const second = gone === c ? mine : gone.title;
    const ops = [...setTitle(this.doc, into.row, first + second)];
    const all = [...ops, ...removeCard(applyAll(this.doc, ops), gone.row)];
    this.edit(all);
    const row = into.row < gone.row ? into.row : into.row - 1;
    void this.focusTitle(row, first.length);
  }

  /* ---------- the keys in a title (commands.ts) ---------- */

  /** The card a key is typed in, while the commands answer it. */
  here: Card | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.composedPath()[0] as HTMLElement;
    if (target.closest?.('[popover], dialog')) return;
    // Chosen cards: the board's own keys for them (to the lane before or after); the rest are the rows controller's.
    if (this.rows.range && !target.closest?.('to-text')) return void runKey(e, CHOSEN, this);
    const box = target.closest?.<HTMLElement>('.board-card');
    if (!box || !target.closest('to-text')) return;
    const card = this.cardAt(Number(box.dataset.row));
    if (!card) return;
    this.here = card;
    try {
      runKey(e, WORDS, this);
    } finally {
      this.here = null;
    }
  };
  /** Up and Down in a title: the card before or after in its lane, the caret where it was. */
  stepCard(c: Card, by: -1 | 1): boolean {
    const to = this.laneOf(c).cards[this.placeOf(c) + by];
    if (!to) return false;
    void this.focusTitle(to.row, this.caretIn(c.row));
    return true;
  }
  /** Alt+Up/Down: the card past its neighbor in its lane, the caret where it was. */
  moveOne(c: Card, by: -1 | 1): boolean {
    const lane = this.laneOf(c);
    const to = this.placeOf(c) + by;
    if (to < 0 || to >= lane.cards.length) return true;
    this.carry(c, c.lane, to);
    return true;
  }
  /** Mod+Alt+Left/Right: the card to the end of the lane before or after, the caret where it was. */
  carryOne(c: Card, side: -1 | 1): boolean {
    const to = this.view.lanes[c.lane + side];
    if (to) this.carry(c, c.lane + side, to.cards.length);
    return true;
  }
  /** Mod+D: the card again after it, the caret in the copy where it was. */
  duplicateOne(c: Card): boolean {
    const offset = this.caretIn(c.row);
    const at = this.placeOf(c);
    const name = this.laneOf(c).name;
    this.edit(duplicateCards(this.doc, [c.row]));
    const copy = this.view.lanes.find((l) => l.name === name)?.cards[at + 1];
    if (copy) void this.focusTitle(copy.row, offset);
    return true;
  }
  /** Card `c` into lane `lane` at place `pos` among its other cards; the caret goes with it. */
  private carry(c: Card, lane: number, pos: number, focus = true) {
    const name = this.view.lanes[lane]?.name;
    if (name === undefined) return;
    const offset = this.cur === c.row ? this.caretIn(c.row) : 'end';
    const ops = moveCard(this.doc, c.row, name, pos);
    if (!ops.length) return;
    this.edit(ops);
    const moved = this.view.lanes.find((l) => l.name === name)?.cards[pos];
    if (moved && focus) void this.focusTitle(moved.row, offset);
  }

  /* ---------- a lane's name ---------- */

  private onLaneOps(e: CustomEvent<TextOps>, l: Lane) {
    e.stopPropagation();
    // A name is kept when it is done (Enter, or the focus leaving it): typed, it is a draft, never half a name on the cards.
    this.drafts.set(`lane:${l.name}`, plainBlock(words(applyAll({ head: {}, blocks: this.laneBlocks(l) }, e.detail.ops).blocks)));
    this.requestUpdate();
  }
  /** A lane's name as typed, kept: its cards' cells and `lanes:`. An empty name puts the old one back. */
  private keepLane(l: Lane) {
    const key = `lane:${l.name}`;
    const typed = this.drafts.get(key);
    if (!typed) return;
    const name = flat(words([typed]));
    this.drafts.delete(key);
    if (name && name !== l.name) this.edit(renameLane(this.doc, l.name, name));
    else this.requestUpdate();
  }
  /** Escape in a lane's name: what was there comes back. */
  private resetLane(e: Event, l: Lane) {
    e.stopPropagation();
    this.drafts.delete(`lane:${l.name}`);
    this.requestUpdate();
  }
  /** Enter in a lane's name: kept, and the caret into its first card (a first card made in an empty lane). */
  private laneEnter(l: Lane, i: number) {
    this.keepLane(l);
    const lane = this.view.lanes[i];
    if (!lane) return;
    if (lane.cards[0]) return void this.focusTitle(lane.cards[0].row, 'end');
    this.addToLane(lane.name);
  }
  private onFocusOut = (e: FocusEvent) => {
    const from = (e.target as HTMLElement).closest?.('.board-lane-name');
    const lane = from ? this.view.lanes[Number(from.closest<HTMLElement>('.board-lane')!.dataset.lane)] : undefined;
    if (lane) this.keepLane(lane);
    const to = e.relatedTarget as Node | null;
    if (!to || !this.contains(to)) this.cur = -1;
  };

  /* ---------- the bar and a lane's menu ---------- */

  /** Insert ▾ Card: an empty card after the one in hand (the last chosen, or the caret's), else at the end of the lane in hand or the first. */
  insertCard() {
    const s = this.rows.range ? this.rows.span() : null;
    const card = s ? this.view.cards[s.to - 1] : this.cardAt(this.cur);
    this.rows.release();
    if (card) {
      const name = this.laneOf(card).name;
      const at = this.placeOf(card) + 1;
      this.edit(addCard(this.doc, name, '', at));
      const made = this.view.lanes.find((l) => l.name === name)?.cards[at];
      if (made) void this.focusTitle(made.row, 0);
      return;
    }
    const lane = this.view.lanes[this.curLane] ?? this.view.lanes[0];
    this.addToLane(lane?.name ?? t('board-to-do'));
  }
  /** An empty card at the end of lane `name`, its title focused. */
  addToLane(name: string) {
    this.rows.release();
    this.edit(addCard(this.doc, name, ''));
    const made = this.view.lanes.find((l) => l.name === name)?.cards.at(-1);
    if (made) void this.focusTitle(made.row, 0);
  }
  /** Insert ▾ Lane: a lane after the one in hand (else at the end), named "New lane" (made unique), its name chosen to type over. */
  insertLane() {
    this.rows.release();
    const names = this.view.lanes.map((l) => l.name);
    const base = t('board-new-lane');
    let name = base;
    for (let n = 2; names.includes(name); n++) name = `${base} ${n}`;
    const at = this.curLane >= 0 && this.curLane < names.length ? this.curLane + 1 : names.length;
    this.edit(addLane(this.doc, name, at));
    void this.focusLane(this.view.lanes.findIndex((l) => l.name === name));
  }
  /** The lane whose menu is open. */
  get menuLane(): Lane | undefined {
    return this.view.lanes[this.menuAt];
  }
  laneCanMove(by: -1 | 1): boolean {
    const l = this.menuLane;
    return !!l && !!l.name && !!this.view.lanes[this.menuAt + by]?.name;
  }
  moveMenuLane(by: -1 | 1) {
    const l = this.menuLane;
    if (!l || !this.laneCanMove(by)) return;
    const at = this.view.lanes.filter((x) => x.name).indexOf(l);
    this.edit(moveLane(this.doc, l.name, at + by));
    this.menuAt = this.view.lanes.findIndex((x) => x.name === l.name);
  }
  deleteMenuLane() {
    const l = this.menuLane;
    if (!l) return;
    const i = this.menuAt;
    this.edit(removeLane(this.doc, l.name));
    this.menuAt = -1;
    const near = this.view.lanes[Math.min(i, this.view.lanes.length - 1)];
    if (near?.cards[0]) void this.focusTitle(near.cards[0].row, 'end');
    else if (near) void this.focusLane(this.view.lanes.indexOf(near));
    else void this.updateComplete.then(() => this.querySelector<HTMLElement>('to-insert button')?.focus({ preventScroll: true }));
  }
  private async openMenu(i: number, from: HTMLElement) {
    this.menuAt = i;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.board-menu');
    await menu?.updateComplete;
    menu?.openAt(from);
  }

  /* ---------- cards chosen whole (kit/text/rows.ts) ---------- */

  /** The cards on screen as the rows controller takes them, lane by lane: each its row's id and its place in that order. */
  private rowItems(): RowItem<number>[] {
    const host = this;
    return this.view.cards.map((c, k) => ({
      id: c.row,
      span: { from: k, to: k + 1 },
      get el() {
        return host.querySelector<HTMLElement>(`.board-card[data-row="${c.row}"]`)!;
      },
    }));
  }
  /** Chosen cards, in the board's order. */
  private chosenCards(s: RowSpan): Card[] {
    return this.view.cards.slice(s.from, s.to);
  }
  /** The lane beside the chosen cards (all in one lane), where Move to the lane before or after takes them. */
  chosenLane(by: -1 | 1): Lane | undefined {
    const s = this.rows.range ? this.rows.span() : null;
    const cards = s ? this.chosenCards(s) : [];
    if (!cards.length || cards.some((c) => c.lane !== cards[0].lane)) return undefined;
    return this.view.lanes[cards[0].lane + by];
  }
  /** The chosen cards carried to the end of the lane beside; they stay chosen. */
  carryChosen(by: -1 | 1) {
    const s = this.rows.span();
    const to = this.chosenLane(by);
    if (!s || !to) return;
    const cards = this.chosenCards(s);
    const n = to.cards.length;
    this.edit(
      moveCards(
        this.doc,
        cards.map((c) => c.row),
        to.name,
        n,
      ),
    );
    const moved = this.view.lanes.find((l) => l.name === to.name)?.cards.slice(n, n + cards.length) ?? [];
    if (moved.length) void this.updateComplete.then(() => this.rows.select({ anchor: moved[0].row, focus: moved[moved.length - 1].row }));
  }
  /** Chosen cards [from, to) of one lane, past the card before or after them: that card moved to their other side. */
  private runMove(s: RowSpan, by: 1 | -1): { card: Card; to: number } | null {
    const cards = this.chosenCards(s);
    if (!cards.length || cards.some((c) => c.lane !== cards[0].lane)) return null;
    const lane = this.laneOf(cards[0]);
    const first = this.placeOf(cards[0]);
    const last = first + cards.length - 1;
    const card = lane.cards[by < 0 ? first - 1 : last + 1];
    return card ? { card, to: by < 0 ? last : first } : null;
  }
  private moveRun(s: RowSpan, by: 1 | -1): RowRange<number> | null {
    const r = this.rows.range;
    const m = this.runMove(s, by);
    if (!r || !m) return r;
    const lane = this.laneOf(m.card);
    const first = this.placeOf(this.chosenCards(s)[0]);
    const flip = this.view.cards.findIndex((c) => c.row === r.anchor) > this.view.cards.findIndex((c) => c.row === r.focus);
    this.edit(moveCard(this.doc, m.card.row, lane.name, m.to));
    const now = this.view.lanes.find((l) => l.name === lane.name)!.cards.slice(first + by, first + by + s.to - s.from);
    const [a, b] = [now[0].row, now[now.length - 1].row];
    return flip ? { anchor: b, focus: a } : { anchor: a, focus: b };
  }
  /** The chosen cards again, after the last of them; the copies are chosen when they are of one lane. */
  private duplicateRun(s: RowSpan): RowRange<number> | null {
    const cards = this.chosenCards(s);
    if (!cards.length) return null;
    const lane = this.laneOf(cards[cards.length - 1]);
    const one = cards.every((c) => c.lane === cards[0].lane);
    const at = this.placeOf(cards[cards.length - 1]) + 1;
    this.edit(
      duplicateCards(
        this.doc,
        cards.map((c) => c.row),
      ),
    );
    if (!one) return null;
    const copies = this.view.lanes.find((l) => l.name === lane.name)!.cards.slice(at, at + cards.length);
    return copies.length ? { anchor: copies[0].row, focus: copies[copies.length - 1].row } : null;
  }
  /** Cards taken away; the caret into the card before the first of them in its lane (or after, or the lane's name). */
  deleteCards(rows: number[]) {
    const first = this.view.cards.find((c) => rows.includes(c.row));
    if (!first) return;
    const name = this.laneOf(first).name;
    const at = this.placeOf(first);
    this.edit(removeCards(this.doc, rows));
    const lane = this.view.lanes.findIndex((l) => l.name === name);
    const left = this.view.lanes[lane]?.cards ?? [];
    const to = left[Math.max(0, at - 1)];
    if (to) void this.focusTitle(to.row, at > 0 ? 'end' : 0);
    else if (lane >= 0) void this.focusLane(lane);
  }

  /* ---------- the clipboard ---------- */

  /** What chosen cards put on the clipboard: a table of them (the board's columns) as TLO, and as our HTML (a sheet takes it as a table). */
  private clip(s: RowSpan): Clip {
    const table = cardsTable(
      this.doc,
      this.chosenCards(s).map((c) => c.row),
    );
    return { text: write({ head: {}, blocks: [table] }), html: docToHtml([table]) };
  }
  /** Pasted cards: in place of the chosen ones (into the lane of the first), else after the card in hand, else at the end of the first lane. */
  private pasteData(data: Clip, s: RowSpan | null) {
    const text = clipText(data);
    const chosen = s ? this.chosenCards(s) : [];
    const card = chosen[0] ?? this.cardAt(this.cur);
    const name = card ? this.laneOf(card).name : (this.view.lanes[0]?.name ?? t('board-to-do'));
    const at = card ? this.placeOf(card) + (chosen.length ? 0 : 1) : (this.view.lanes[0]?.cards.length ?? 0);
    const gone = chosen.length
      ? removeCards(
          this.doc,
          chosen.map((c) => c.row),
        )
      : [];
    const put = pasteCards(applyAll(this.doc, gone), name, at, text);
    if (!put.n) return;
    this.edit([...gone, ...put.ops]);
    this.rows.release();
    const last = this.view.lanes.find((l) => l.name === name)?.cards[at + put.n - 1];
    if (last) void this.focusTitle(last.row, 'end');
  }
  /** A paste into a card's title (chosen cards are the rows controller's): cards copied here, a table or several lines are cards after it; words alone are its own. */
  private onPaste = (e: ClipboardEvent) => {
    const el = e.target as HTMLElement;
    const dt = e.clipboardData;
    if (!dt || this.rows.range || el.closest?.('dialog, [popover]')) return;
    const box = el.closest?.<HTMLElement>('.board-card');
    if (!box || !el.closest('to-text')) return;
    const text = dt.getData('text/plain').replace(/\r\n?/g, '\n');
    const mine = lastCopied();
    const data = { text, html: dt.getData('text/html') || (mine?.text === text ? mine.html : '') };
    const got = parse(clipText(data));
    const lines = text.split('\n').filter((l) => l.trim()).length;
    if (!got.blocks.some((b) => b.k === 'table') && lines < 2) return;
    e.preventDefault();
    e.stopPropagation();
    this.cur = Number(box.dataset.row);
    this.pasteData(data, null);
  };

  /* ---------- the grip: a drag across lanes, or a tap to choose the card ---------- */

  private down = (e: PointerEvent, c: Card) => {
    // The grip's drag is the board's (across lanes); the rows controller hears none of it.
    e.stopPropagation();
    if (e.button !== 0 || !e.isPrimary) return;
    this.dragged = false;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, row: c.row, moved: false };
    this.point = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is not really down (a test's) cannot be captured; the grip hears it as long as it is over it.
    }
  };
  private move = (e: PointerEvent) => {
    e.stopPropagation();
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    this.point = { x: e.clientX, y: e.clientY };
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < SLOP) return;
    e.preventDefault();
    if (!p.moved) {
      p.moved = true;
      this.carrying = p.row;
      this.rows.release();
    }
    this.aim();
    this.edges();
  };
  /** Where the carried card would land: the lane under the pointer, before the first of its other cards whose middle is below it. */
  private aim() {
    const { x, y } = this.point;
    const lane = document
      .elementsFromPoint(x, y)
      .map((el) => el.closest<HTMLElement>('.board-lane'))
      .find((el) => el && this.contains(el));
    if (!lane) return void (this.over = null);
    const i = Number(lane.dataset.lane);
    const cards = [...lane.querySelectorAll<HTMLElement>('.board-card')].filter((el) => Number(el.dataset.row) !== this.carrying);
    let pos = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (pos < 0) pos = cards.length;
    if (this.over?.lane !== i || this.over.pos !== pos) this.over = { lane: i, pos };
  }
  /** Near the top or bottom of what scrolls (the column), it scrolls to bring more of the board under the pointer. */
  private edges() {
    if (this.scrolling) return;
    const sc = scrollerOf(this.querySelector('.board'));
    const step = () => {
      this.scrolling = 0;
      if (this.carrying < 0 || !sc.isConnected) return;
      const r = sc.getBoundingClientRect();
      const by = this.point.y < r.top + EDGE ? -12 : this.point.y > r.bottom - EDGE ? 12 : 0;
      if (!by) return;
      const before = sc.scrollTop;
      sc.scrollTop += by;
      if (sc.scrollTop !== before) this.aim();
      this.scrolling = requestAnimationFrame(step);
    };
    this.scrolling = requestAnimationFrame(step);
  }
  private up = (e: PointerEvent) => {
    e.stopPropagation();
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    const over = this.over;
    this.stop();
    if (!p.moved) return;
    this.dragged = true;
    const c = this.cardAt(p.row);
    if (c && over) this.carry(c, over.lane, over.pos, false);
  };
  private stop = () => {
    if (this.press?.moved) this.dragged = true;
    this.press = null;
    this.carrying = -1;
    this.over = null;
    cancelAnimationFrame(this.scrolling);
    this.scrolling = 0;
  };
  private onEscape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this.press) return;
    e.preventDefault();
    e.stopPropagation();
    this.stop();
  };
  /** A tap (or Enter, Space) on the grip chooses the card; Shift extends the range. */
  private tapGrip = (e: MouseEvent, c: Card) => {
    e.stopPropagation();
    if (this.dragged) return void (this.dragged = false);
    this.rows.choose(c.row, e.shiftKey);
  };
  /** A tap on a card outside its title and grip (its fields, the space round them) chooses it, as a tap on its grip does. */
  private cardTap(c: Card, e: MouseEvent) {
    if ((e.target as HTMLElement).closest?.('to-text, button, input, a, [popover], dialog')) return;
    this.rows.choose(c.row, e.shiftKey);
  }

  /* ---------- drawing ---------- */

  private card(l: Lane, c: Card, j: number, i: number) {
    const s = this.view.shown.get(c.row);
    const ranged = this.rows.has(c.row);
    const before =
      this.carrying >= 0 && this.over?.lane === i && this.over.pos === j - (this.carrying >= 0 && l.cards.slice(0, j).some((x) => x.row === this.carrying) ? 1 : 0) && c.row !== this.carrying;
    const n = j + 1;
    const lane = l.name || '–';
    return html`<li class="board-card ${c.row === this.cur ? 'sel' : ''} ${ranged ? 'ranged' : ''} ${c.row === this.carrying ? 'dragging' : ''} ${before ? 'before' : ''}" data-row=${c.row} @focusin=${() => ((this.cur = c.row), (this.curLane = i))} @click=${(e: MouseEvent) => this.cardTap(c, e)}>
      <button type="button" class="to-btn to-tool board-grip to-rows-handle" aria-pressed=${String(ranged)} aria-label=${t('board-card-n-tap-chooses-it', { n, lane })} title=${t('common-drag-to-move-tap-to')} @pointerdown=${(e: PointerEvent) => this.down(e, c)} @pointermove=${this.move} @pointerup=${this.up} @pointercancel=${this.stop} @click=${(e: MouseEvent) => this.tapGrip(e, c)}>${icon(GripVertical, 18)}</button>
      <div class="board-main">
        <to-text
          class="board-title"
          shape="line"
          no-bubble
          .blocks=${this.titleBlocks(c)}
          label=${t('board-title-of-card-n', { n, lane })}
          placeholder=${t('common-title')}
          @text-ops=${(e: CustomEvent<TextOps>) => this.onTitleOps(e, c)}
          @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(c))}
          @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(c, e.detail.dir))}
          @text-selectall=${(e: Event) => (e.stopPropagation(), this.rows.selectAll())}
        ></to-text>
        ${s?.fields.length ? html`<dl class="board-fields">${s.fields.map((f) => html`<div><dt>${f.name}</dt><dd>${f.value}</dd></div>`)}</dl>` : nothing}
      </div>
    </li>`;
  }
  private lane(l: Lane, i: number) {
    const end = this.carrying >= 0 && this.over?.lane === i && this.over.pos >= l.cards.filter((c) => c.row !== this.carrying).length;
    return html`<section class="board-lane ${this.carrying >= 0 && this.over?.lane === i ? 'over' : ''}" data-lane=${i} aria-label=${l.name || t('board-lane')}>
      <header class="board-head" @focusin=${() => (this.curLane = i)}>
        <to-text
          class="board-lane-name"
          shape="line"
          no-bubble
          .blocks=${this.laneBlocks(l)}
          label=${t('board-lane-name')}
          placeholder=${t('board-lane-name')}
          @text-ops=${(e: CustomEvent<TextOps>) => this.onLaneOps(e, l)}
          @text-enter=${(e: Event) => (e.stopPropagation(), this.laneEnter(l, i))}
          @text-escape=${(e: Event) => this.resetLane(e, l)}
          @text-exit=${(e: Event) => e.stopPropagation()}
          @text-selectall=${(e: Event) => e.stopPropagation()}
        ></to-text>
        <span class="board-count">${l.cards.length}</span>
        <button type="button" class="to-btn to-tool board-more" aria-haspopup="menu" aria-label=${t('board-options-for-lane', { lane: l.name || '–' })} title=${t('board-lane-options')} @click=${(e: Event) => void this.openMenu(i, e.currentTarget as HTMLElement)}>
          ${icon(Ellipsis, 18)}
        </button>
      </header>
      ${l.cards.length ? html`<ol class="board-cards ${end ? 'end' : ''}">${l.cards.map((c, j) => this.card(l, c, j, i))}</ol>` : html`<p class="to-hint board-none ${end ? 'end' : ''}">${t('board-no-cards')}</p>`}
    </section>`;
  }
  render() {
    const v = this.view;
    return html`<to-bar class="board-bar">
        <to-insert .items=${drawnIn(BOARD, 'menu:insert', this)}></to-insert>
        <span class="to-hint board-total">${t('board-n-cards', { n: v.cards.length })}</span>
        ${this.undoTools()}
      </to-bar>
      <div class="board ${this.carrying >= 0 ? 'carrying' : ''}" role="group" tabindex="-1" aria-label=${t('board-board')}>${v.lanes.map((l, i) => this.lane(l, i))}</div>
      ${this.rows.renderContext()}
      <to-menu class="board-menu" .label=${this.menuLane ? t('board-options-for-lane', { lane: this.menuLane.name || '–' }) : t('board-lane-options')} .items=${drawnIn(BOARD, 'menu:lane', this)}></to-menu>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToBoardEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-board-editor': ToBoardEditor;
  }
}
