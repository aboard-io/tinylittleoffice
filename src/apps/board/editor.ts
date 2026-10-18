/**
 * <to-board-editor>: the Board app. The lanes are columns side by side, about 16rem each, that scroll sideways on a
 * wide screen; where the board is narrower than two lanes (a phone, or the size of everything grown by a pinch) they
 * stack, one under another the column's width, so the words reflow and the page never scrolls sideways. Each lane is
 * its name, how many cards it holds, the sum of their amounts where the table has a column of money, and a menu (Rename
 * lane, Add a card, Move left, Move right, Delete lane). A lane's name is renamed where it is drawn: a double click on
 * it, Enter or F2 on it, or its menu's Rename makes it a field, its words chosen; Enter keeps the name, Escape lets it
 * go, the focus leaving keeps it, and a name that is empty or another lane's is refused, said under the name.
 *
 * A card is its title (a one-line <to-text> of its cell's words as the Spreadsheet shows them), the line under it (a
 * deal's company) and a few of its fields, each drawn as what it is (an amount, a day, a person's initials, a chip, a
 * quiet name and value): which, and how, is the page's to say (`cardFields`), else the columns' types say
 * (model.ts `cardFieldsOf`).
 *
 * The title is words both ways (model.ts): it holds what its cell shows ("'007" written, 007 shown), and what is typed
 * is written as words of the title column's type (`setTitle`, `addCard`: 007 typed is "'007", =1+1 typed stays words,
 * never a formula), so the title shown after an edit is exactly what was typed. A split (Enter in the middle) and a
 * join (Backspace at the start, Delete at the end) work on the words shown and write them back so too. A rich title
 * column's words are its inline Markdown's, without their marks, written back as Markdown of words alone.
 *
 * The title follows the editing standard (docs/editing.md §6): Enter at its end makes the next
 * card in the lane, at its start a card above it, in the middle splits it; Backspace at the start of an empty card
 * takes it away, else joins it to the card before (where it has no fields to lose), and Delete at the end joins the
 * next in. A card's other keys, and how one is opened and carried across, are the Board's line of that standard's §8,
 * declared in commands.ts. Cards are rows of the kit's `Rows`: a tap on the grip (or a finger held on it), Escape or
 * Shift+Up/Down in the title choose them whole, and chosen cards are moved, duplicated, copied (a table as TLO and our
 * HTML), cut, pasted and deleted from the keys or the bar under them. A card opened shows its row's every cell as a
 * field in a dialog (the kit's <to-dialog>, as the Calendar's entries: the cells are fields that are not all words, a
 * date, an amount, a choice); Done writes the fields typed, and those alone, as one step (Opened, below).
 *
 * A card is carried from anywhere on it, with no grip (Paul, 2026-10-18: "draggable without having a handle"), by
 * pointer events, never HTML5 drag-and-drop: a mouse's press carries it once it has moved 6px, so a click is still a
 * click (the caret in its title, the card chosen, or picked); a finger's or a pen's once it has been held still for a
 * fifth of a second and then moves, so a finger that moves at once scrolls the page as ever (the card lifts when it may
 * be carried; held half a second it is chosen, the standard's hold, and may still be carried). A title being typed in
 * is the words', whose press selects them. While a card is carried a ghost of it follows the pointer, a slot its size
 * shows where it would land, and the board, the column and a lane that scrolls on its own scroll near their edges.
 * Escape lets it go where it was.
 * A page that opens what a card stands for asks for a pick (`pickable`): a card activated, a click or a tap on it outside
 * a title being typed, or Enter on it chosen whole, is a bubbling "docpick" with `{ at, row }`, as a
 * read-only board's is, while its cards are still carried and typed; a double click on it opens nothing, the pick
 * having been the page's.
 * Every edit carries where the caret or the chosen cards were, so an undo puts them back. Every change is operations on
 * the document's table and head (model.ts), and a table or a title column the editor makes is named in the reader's
 * language (words.ts). The bar holds Insert ▾ (a card, a lane), the cards opened in the Spreadsheet, the count, undo
 * and redo.
 *
 * It is built as the suite's editors are, on the kit: `DocElement` (the history, "docops", "docchange", `applyRemote`,
 * read-only and "docpick"), the kit's elements and Lit. The library builds it into a file of its own, dist/board.js,
 * which takes all of that from the editors' own file, so there is one Lit and one registry on the page (docs/library.md,
 * The library's own apps). Its stylesheet is style.css, which the library serves as board.css beside the editors'.
 *
 * A page that lets its cards be carried and nothing else be changed (a CRM's pipeline: a lead's stage changes there, the
 * rest on the lead's own page) sets `carry-only`. A card is carried by a drag, by the keys (Alt+Up/Down along
 * its lane and Mod+Alt+Left/Right across, in its title; on chosen cards Alt+Up/Down and Mod+Left/Right), by Move to…
 * and by its dialog's lane, and that is all: no bar and no lane's menu are drawn; the titles and the lanes' names are
 * shown, not typed (the kit's words inside `[readonly]`); the bar under chosen cards holds Move up, Move down, Open,
 * Move to… and Copy; the dialog shows every field and changes the lane alone; a thing typed, pasted, cut or dropped is
 * refused before anything hears it, and `edit` writes nothing, a move being `moved`. So every op it tells is a move's
 * (model.ts `moveCard`), and an undo is a move taken back as a move (`moveBack`), from the board's own history of the
 * moves made while it is carried only; what was done before is out of an undo's reach.
 *
 * A page whose lanes are its own records (a CRM's stages) hears each change to a lane before it is made: "lanerename"
 * `{ from, to }`, "laneadd" `{ name, at }`, "lanemove" `{ name, from, to }` and "lanedelete" `{ name, cards }`, each
 * bubbling and cancelable (LaneEvent). A page that calls `preventDefault()` refuses it, or makes it through its own
 * command and gives the board its new document; a page that sets `own-lanes` makes them all itself, and the board only
 * tells them, carried only too (where its lanes' names, their menus and Rename are then offered).
 */
import { ArrowDown, ArrowUp, CalendarDays, Copy, Ellipsis } from 'lucide';
import { applyAll, COL_NAMES, parse, parseInline, plainText, transform, write, writeInline, type Block, type ColType, type Doc, type Op, type TableBlock } from '../../doc/index.ts';
import { DocElement, type DocPick, type Entry } from '../../kit/core/element.ts';
import { Rows, lastCopied, type RowItem, type RowRange, type RowSpan } from '../../kit/text/rows.ts';
import { UI, icon } from '../../kit/draw/icons.ts';
import { btn, cmdBtn, cmdTool } from '../../kit/ui/bar.ts';
import { caret } from '../../kit/text/textops.ts';
import { choicesOf } from '../../kit/text/columns.ts';
import { clipText, docToHtml, type Clip } from '../../kit/text/clipboard.ts';
import { drawnIn, runKey } from '../../kit/core/commands.ts';
import { host } from '../../kit/core/host.ts';
import { html, nothing, render, type PropertyDeclarations, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { reveal, scrollerOf } from '../../kit/ui/scroll.ts';
import { t } from '../../kit/core/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/ui/menu.ts';
import type { TextOps, ToText } from '../../kit/text/text.ts';
import type { ToDialog } from '../../kit/ui/dialog.ts';
import BOARD, { CHOSEN, WORDS } from './commands.ts';
import {
  addCard,
  addLane,
  boardOf,
  cardFieldsOf,
  cardsTable,
  duplicateCards,
  moveBack,
  moveCard,
  moveCards,
  moveLane,
  laneSum,
  moneyColumn,
  pasteCards,
  removeCard,
  removeCards,
  removeLane,
  renameLane,
  setCells,
  setTitle,
  type BoardView,
  type Card,
  type CardField,
  type Field,
  type Lane,
  type ShownField,
} from './model.ts';
import { dayShort, hueOf, initials, moneyShort } from './fields.ts';
import { columnNames } from './words.ts';
import '../../kit/text/text.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/context.ts';
import '../../kit/ui/dialog.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import './style.css';

export const tag = 'to-board-editor';

/** What a "docpick" says of a card picked: the table's block, and the card's row in it. */
export type PickedCard = { at: number; row: number };
/**
 * What a change to a lane says before it is made, each a bubbling, cancelable event of the board's: "lanerename" a
 * lane's name `from` to `to`; "laneadd" a lane `name` at place `at` among the lanes; "lanemove" lane `name` from place
 * `from` to place `to`; "lanedelete" lane `name` and the `cards` it takes with it. A page that refuses it, or makes it
 * itself, calls `preventDefault()`.
 */
export interface LaneEvents {
  lanerename: { from: string; to: string };
  laneadd: { name: string; at: number };
  lanemove: { name: string; from: number; to: number };
  lanedelete: { name: string; cards: number };
}
export type LaneEvent<K extends keyof LaneEvents = keyof LaneEvents> = CustomEvent<LaneEvents[K]>;
/** Where the selection was when an edit began (the entry's mark): cards chosen whole, or the caret in a card's title. */
type Mark = { range: RowRange<number> } | { row: number; offset: number };
/** Where a carried card would land: lane `lane`, at place `pos` among its other cards. */
interface Over {
  lane: number;
  pos: number;
}
/**
 * A card opened in its dialog: its row, its cells as shown and typed (by column), the columns the person touched (the
 * lane's when a lane is chosen), the lane chosen, a rich cell's words as typed, and where the focus goes back to (the
 * card chosen, or its title's caret). Done writes the touched columns alone, so an edit from elsewhere to a field
 * nobody touched here, synced while the dialog was open, is not put back.
 */
interface Opened {
  row: number;
  values: Record<number, string>;
  touched: Set<number>;
  lane: string;
  rich: Map<number, Block>;
  back: 'rows' | number | 'end';
}
/**
 * How far a mouse moves pressed on a card before it is carried (a click moves less); how far a finger or a pen; how
 * long a finger or a pen is held still on a card before it may carry it (moved sooner, it scrolls the page); how long
 * before the hold chooses the card; how near an edge of what scrolls a carried card scrolls it, and how fast at most.
 */
const SLOP = 6;
const TOUCH_SLOP = 8;
const PRESS = 200;
const HOLD = 500;
const EDGE = 48;
const SPEED = 18;
/** A press on a card: the pointer, where it went down, the card, a finger's or a pen's, whether it may carry the card yet, has, or was held to choose it. */
interface Press {
  id: number;
  x: number;
  y: number;
  row: number;
  touch: boolean;
  armed: boolean;
  moved: boolean;
  held: boolean;
  timers: number[];
}
/** The keyboard a field asks a phone for, as the Spreadsheet's cell does: numbers for a number, digits for a date, letters for the rest. */
const KEYBOARD: Partial<Record<ColType, string>> = { number: 'decimal', money: 'decimal', percent: 'decimal', date: 'numeric' };
/** What a person does that would change a board carried only other than by a move, refused before anything hears it (as DocElement refuses it read-only). */
const UNCHANGED = ['beforeinput', 'paste', 'cut', 'drop', 'dragstart'];
/** A move a board carried only takes back or makes again: the ops that do it to the board as it now is, and where the selection was before the move. */
interface Step {
  ops: Op[];
  mark?: unknown;
}
/**
 * Ops made one after another (a step's) and another's made on the same board: the first as they apply after the
 * others, and the others as they apply after the first, to be carried on past the step below, as DocElement carries its
 * history (the kernel's `transform`). Throws where they cross, or where another's took away what a step moves.
 */
function cross(mine: Op[], theirs: Op[]): [Op[], Op[]] {
  const passed: Op[] = [];
  for (const op of theirs) {
    let t: Op | null = op;
    const next: Op[] = [];
    for (const p of mine) {
      if (!t) {
        next.push(p);
        continue;
      }
      const moved = transform(p, t, 'right');
      t = transform(t, p, 'left');
      if (!moved) throw new RangeError('a move another took away');
      next.push(moved);
    }
    mine = next;
    if (t) passed.push(t);
  }
  return [mine, passed];
}
/** A stack of steps carried over another's ops, the top first (each step's ops apply where the steps above it leave the board). */
function carried(stack: Step[], theirs: Op[]): Step[] {
  const out = [...stack];
  for (let i = out.length - 1; i >= 0 && theirs.length; i--) {
    const [ops, passed] = cross(out[i].ops, theirs);
    out[i] = { ...out[i], ops };
    theirs = passed;
  }
  return out;
}
/** A checkbox cell that is ticked, as the kernel's formulas read one. */
const TICKED = /^(x|y|yes|true|1|done|☑|✓|✔)$/i;
let boards = 0;

const words = (b: Block[]): string =>
  b
    .map((x) => ('runs' in x ? plainText(x.runs) : ''))
    .join(' ')
    .replace(/\n/g, ' ');
const plainBlock = (s: string): Block => ({ k: 'p', runs: s ? [{ t: s }] : [] });
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

export class ToBoardEditor extends DocElement<BoardView> {
  static properties: PropertyDeclarations = {
    pickable: { type: Boolean, reflect: true },
    carryOnly: { type: Boolean, attribute: 'carry-only', reflect: true },
    cur: { state: true },
    over: { state: true },
    ownLanes: { type: Boolean, attribute: 'own-lanes', reflect: true },
    cardFields: { attribute: false },
    carrying: { state: true },
    lifting: { state: true },
    menuAt: { state: true },
    opened: { state: true },
    renaming: { state: true },
    laneError: { state: true },
  };
  /** A card activated is picked ("docpick", as read-only) while the board can still be changed: the page asks for it (the attribute `pickable`). */
  declare pickable: boolean;
  /** Its cards carried among the lanes and nothing else changed (the attribute `carry-only`): the header's last paragraph. */
  declare carryOnly: boolean;
  /** The page makes every change to a lane itself (the attribute `own-lanes`): the board tells them (LaneEvents) and makes none. */
  declare ownLanes: boolean;
  /**
   * Which fields a card shows, and how (model.ts `CardField`: a column by name or place, `as` line, text, money, date,
   * person or badge), in this order; null (the default) for the columns' types to say (`cardFieldsOf`), [] for the title alone.
   */
  declare cardFields: CardField[] | null;
  /** The card a finger or a pen holds, lifted, ready to be carried, by its row; -1 for none. */
  declare lifting: number;
  /** The lane whose name is a field, being renamed, by its place; -1 for none. */
  declare renaming: number;
  /** Why the name typed was refused, said under it; '' for nothing. */
  declare laneError: string;
  /** The lane whose name was refused, where `laneError` is said. */
  private errorAt = -1;
  /** The card in hand (the caret's), by its row; -1 for none. */
  declare cur: number;
  /** The lane in hand (the caret's, in its name or a card), by its place; -1 for none. */
  curLane = -1;
  /** The card being carried by its grip, by its row; -1 for none. */
  declare carrying: number;
  declare over: Over | null;
  /** The lane whose menu is open, by its place; -1 for none. */
  declare menuAt: number;
  /** The card whose dialog is open; null for none. */
  declare opened: Opened | null;
  private readonly uid = `to-board-${++boards}`;
  /** Where the card the dialog's Done moved landed, for the focus to follow it. */
  private landed: number | null = null;
  /** The ghost of a carried card, under the pointer (on the page's body, as the rows' drop line is). */
  private ghost: HTMLElement | null = null;
  /** A card's title or a lane's name as its editor holds it (a space typed at the end the table does not keep; a name not yet kept). */
  private drafts = new Map<string, Block>();
  private ones = new WeakMap<Block, Block[]>();
  private press: Press | null = null;
  private point = { x: 0, y: 0 };
  private scrolling = 0;
  /** A drag just ended, or a hold chose the card: the click that follows it is not a tap. */
  private dragged = false;
  /**
   * Carried only, the board's own history, of moves alone: the moves made, to be taken back (Mod+Z), each as the move
   * that takes it back (model.ts `moveBack`), and those taken back, to be made again. DocElement's history still hears
   * every move and every move taken back, and is the board's again when it is no longer carried only.
   */
  private backs: Step[] = [];
  private agains: Step[] = [];
  /** Cards chosen whole: the kit's one implementation (keys, the bar under them, the clipboard). The grip's drag is the board's own, across lanes. */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.board'),
    // No handle: a card is pressed, carried and chosen by the board's own pointer (below), from anywhere on it.
    handle: '[data-board-handle]',
    label: t('board-chosen-cards'),
    contextClass: 'board-context',
    current: () => (this.cardAt(this.cur) ? this.cur : null),
    edit: (row, offset) => void this.focusTitle(row, offset),
    remove: (_s, ids) => void (this.carryOnly || this.deleteCards(ids)),
    canMove: (s, by) => !!this.runMove(s, by),
    move: (s, by) => this.moveRun(s, by),
    duplicate: (s): RowRange<number> | null => (this.carryOnly ? this.rows.range : this.duplicateRun(s)),
    copy: (s) => this.clip(s),
    paste: (data, s) => void (this.carryOnly || this.pasteData(data, s)),
    extra: () => drawnIn(CHOSEN, 'context', this),
  });

  constructor() {
    super();
    this.pickable = false;
    this.carryOnly = false;
    this.ownLanes = false;
    this.cardFields = null;
    this.cur = -1;
    this.carrying = -1;
    this.lifting = -1;
    this.renaming = -1;
    this.laneError = '';
    this.over = null;
    this.menuAt = -1;
    this.opened = null;
  }
  connectedCallback() {
    super.connectedCallback();
    // First, capturing: the click a drag or a hold ends with is no tap, before a pick or a choose hears it.
    this.addEventListener('click', this.onClickAfter, true);
    this.addEventListener('pointerdown', this.down);
    this.addEventListener('pointermove', this.move);
    this.addEventListener('pointerup', this.up);
    this.addEventListener('pointercancel', this.stop);
    this.addEventListener('mousedown', this.onMouseDown);
    this.addEventListener('contextmenu', this.onContextMenu);
    // Not passive: a finger that may carry a card is not a finger that scrolls.
    this.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.addEventListener('keydown', this.onKey);
    // Escape during a drag lets it go, before anything else hears the key.
    this.addEventListener('keydown', this.onEscape, true);
    // Capturing: before a title's own editor hears a paste.
    this.addEventListener('paste', this.onPaste, true);
    this.addEventListener('focusout', this.onFocusOut);
    // Capturing, as a read-only editor's pick: before the card, its title or the rows controller hears it.
    for (const type of ['click', 'keydown']) this.addEventListener(type, this.onPickCard, true);
    // Capturing: before the rows controller, which lets chosen cards go after any Delete.
    this.addEventListener('keydown', this.onKept, true);
    // On the window, capturing: before the rows controller, which hears the clipboard on the document.
    for (const type of UNCHANGED) window.addEventListener(type, this.onUnchanged, true);
    for (const type of ['docundo', 'docredo']) this.addEventListener(type, this.onHistory, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClickAfter, true);
    this.removeEventListener('pointerdown', this.down);
    this.removeEventListener('pointermove', this.move);
    this.removeEventListener('pointerup', this.up);
    this.removeEventListener('pointercancel', this.stop);
    this.removeEventListener('mousedown', this.onMouseDown);
    this.removeEventListener('contextmenu', this.onContextMenu);
    this.removeEventListener('touchmove', this.onTouchMove);
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('keydown', this.onEscape, true);
    this.removeEventListener('paste', this.onPaste, true);
    this.removeEventListener('focusout', this.onFocusOut);
    for (const type of ['click', 'keydown']) this.removeEventListener(type, this.onPickCard, true);
    this.removeEventListener('keydown', this.onKept, true);
    for (const type of UNCHANGED) window.removeEventListener(type, this.onUnchanged, true);
    for (const type of ['docundo', 'docredo']) this.removeEventListener(type, this.onHistory, true);
    this.stop();
  }

  protected read(doc: Doc): BoardView {
    return boardOf(doc);
  }

  /* ---------- undo: the caret or the chosen cards come back ---------- */

  private mark(): Mark | undefined {
    const r = this.rows.range;
    if (r) return { range: { ...r } };
    return this.cardAt(this.cur) ? { row: this.cur, offset: this.caretIn(this.cur) } : undefined;
  }
  /** Every edit carries where the selection was before it. Carried only, it writes nothing: a card's move is `moved`. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    if (this.carryOnly) return;
    super.edit(ops, key, mark ?? this.mark());
  }
  /** A card's move, or chosen cards' (model.ts `moveCard`, `moveCards`): the one edit a board carried only writes, and the one it takes back. */
  private moved(ops: Op[], mark?: unknown) {
    if (!ops.length || this.readOnly) return;
    const m = mark ?? this.mark();
    if (this.carryOnly) {
      this.backs.push({ ops: moveBack(this.doc, ops), mark: m });
      if (this.backs.length > 500) this.backs.shift();
      this.agains = [];
    }
    super.edit(ops, undefined, m);
  }
  protected willUpdate(changed: PropertyValues) {
    // A new document (not the text this editor wrote), or the board carried only or no longer: the moves' history starts over.
    if ((changed.has('value') && !this.ours(this.value)) || changed.has('carryOnly')) [this.backs, this.agains] = [[], []];
    super.willUpdate(changed);
    // The words are drawn typed or shown as the board is carried only or not, as DocElement draws them for read-only.
    if (changed.has('carryOnly') && this.hasUpdated) for (const x of this.querySelectorAll<ToText>('to-text')) x.requestUpdate();
  }
  /**
   * Carried only, an undo takes the last move back as a move and a redo makes it again, from the board's own history of
   * moves (`backs`, `agains`), before DocElement hears it: what was done before the board was carried only is out of
   * reach, and nothing but a move is ever told. The caret or the chosen cards come back as they were before the move
   * (`undone`); after a redo, the card it carried has the caret.
   */
  private onHistory = (e: Event) => {
    if (!this.carryOnly) return;
    e.stopImmediatePropagation();
    const redo = e.type === 'docredo';
    const step = (redo ? this.agains : this.backs).pop();
    if (!step || this.readOnly) return;
    e.preventDefault();
    (redo ? this.backs : this.agains).push({ ops: moveBack(this.doc, step.ops), mark: step.mark });
    super.edit(step.ops, undefined, step.mark);
    if (!redo) return this.undone({ ops: step.ops, inverse: [], at: 0, mark: step.mark }, false);
    this.rows.release();
    const put = [...step.ops].reverse().find((o) => o.op === 'rows' && !!o.rows) ?? step.ops.find((o) => o.op === 'cells');
    if (put && (put.op === 'rows' || put.op === 'cells') && this.cardAt(put.r)) void this.focusTitle(put.r, 'end');
  };
  /** Another's ops taken in (`applyRemote`): the moves' history carried over them, as DocElement carries its own; let go where they cross. */
  protected followed(ops: Op[]) {
    try {
      this.backs = carried(this.backs, ops);
      this.agains = carried(this.agains, ops);
    } catch {
      [this.backs, this.agains] = [[], []];
    }
  }
  /**
   * Carried only, a thing typed, pasted, cut or dropped into the board (its dialog too) is refused before anything hears
   * it, and so is a cut or a paste while cards are chosen and the focus is on the page's body, which the rows controller
   * would take as theirs.
   */
  private onUnchanged = (e: Event) => {
    if (!this.carryOnly) return;
    const el = e.target;
    // A lane's name being renamed where the page makes the lanes' changes (`own-lanes`): typed, then only told.
    if (e.type === 'beforeinput' && el instanceof Element && el.closest('.board-head.renaming')) return;
    const page = el === document.body || el === document.documentElement;
    if (!(el instanceof Node && this.contains(el)) && !(page && this.rows.range)) return;
    e.preventDefault();
    e.stopPropagation();
  };
  /** Carried only, Delete or Backspace on chosen cards takes nothing away, and they stay chosen, the bar under them up. */
  private onKept = (e: KeyboardEvent) => {
    if (!this.carryOnly || !this.rows.range || (e.key !== 'Delete' && e.key !== 'Backspace')) return;
    if ((e.composedPath()[0] as HTMLElement).closest?.('to-text, input, textarea, select, [popover], dialog')) return;
    e.preventDefault();
  };
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
  /** A card's title as its editor takes it: the words it holds (a draft kept while it says what the card shows, the words shown compared, never the cell as written). */
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
    if (!this.view.lanes.length) return this.querySelector<HTMLElement>('to-insert button')?.focus({ preventScroll: true });
    return this.focusLane(0, false, false);
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
    if (show) reveal(x.closest('.board-card'), { inline: true });
  }
  /** A lane's name, once drawn, focused: shown (a heading the keys rename), or a field with its words chosen whole to type over (`rename`). */
  async focusLane(i: number, rename = false, show = true) {
    this.curLane = i;
    if (rename) [this.renaming, this.laneError] = [i, ''];
    await this.updateComplete;
    const x = this.querySelector<ToText>(`.board-lane[data-lane="${i}"] .board-lane-name`);
    if (!x) return;
    await x.updateComplete;
    if (rename) {
      const n = words(x.blocks).length;
      x.sel = { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: n } };
    } else x.tx.focus({ preventScroll: true });
    if (show) reveal(x, { inline: true });
  }

  /* ---------- a card's title ---------- */

  private onTitleOps(e: CustomEvent<TextOps>, c: Card) {
    e.stopPropagation();
    const { ops, kind, before } = e.detail;
    const key = `card:${c.row}`;
    // The title is words: whatever the ops made is read back as words (no marks, one line), and written as words (setTitle).
    const now = words(applyAll({ head: {}, blocks: this.titleBlocks(c) }, ops).blocks);
    this.drafts.set(key, plainBlock(now));
    this.edit(setTitle(this.doc, c.row, now, columnNames()), kind ? key : undefined, { row: c.row, offset: before ? before.focus.offset : 0 });
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
      this.edit(addCard(this.doc, lane.name, '', at, columnNames()));
      return void this.focusTitle(this.view.lanes[c.lane].cards[at + 1]?.row ?? c.row, 0);
    }
    const head = setTitle(this.doc, c.row, text.slice(0, offset), columnNames());
    const ops = [...head, ...addCard(applyAll(this.doc, head), lane.name, text.slice(offset), at + 1, columnNames())];
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
    const ops = [...setTitle(this.doc, into.row, first + second, columnNames())];
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
  /** Which way an arrow key goes among the lanes as the screen shows them: -1 the lane before, 1 the lane after (right to left, the lane before is on the right). */
  sideOf(key: string): -1 | 1 {
    const rtl = getComputedStyle(this).direction === 'rtl';
    return key.endsWith('Left') !== rtl ? -1 : 1;
  }
  /**
   * Left at a title's start, Right at its end (toward the lane before, toward the lane after: the words run the same
   * way as the lanes): the card at the same place in that lane (its last where it holds fewer), else that lane's name.
   * Elsewhere in the words the arrow is the caret's.
   */
  besideCard(c: Card, side: -1 | 1): boolean {
    const x = this.titleBox(c.row);
    const s = x?.sel;
    const lane = this.view.lanes[c.lane + side];
    if (!x || !s || !lane || s.anchor.offset !== s.focus.offset || s.focus.offset !== (side < 0 ? 0 : words(x.blocks).length)) return false;
    const to = lane.cards[Math.min(this.placeOf(c), lane.cards.length - 1)];
    if (to) void this.focusTitle(to.row, side < 0 ? 'end' : 0);
    else void this.focusLane(c.lane + side);
    return true;
  }
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
    if (this.carryOnly) return true;
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
    this.moved(ops);
    const moved = this.view.lanes.find((l) => l.name === name)?.cards[pos];
    if (moved && focus) void this.focusTitle(moved.row, offset);
  }

  /* ---------- a lane's name ---------- */

  /** Whether a page hears a lane's change and lets the board make it: told first (LaneEvents), made unless refused, or where the page makes them all (`own-lanes`) or the board is carried only. */
  private tell<K extends keyof LaneEvents>(type: K, detail: LaneEvents[K]): boolean {
    const go = this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true, cancelable: true }));
    return go && !this.ownLanes && !this.carryOnly;
  }
  /** Whether a lane's name may be changed here: not read-only, and not carried only unless the page makes the lanes' changes. */
  get lanesChange(): boolean {
    return !this.readOnly && (!this.carryOnly || this.ownLanes);
  }
  private onLaneOps(e: CustomEvent<TextOps>, l: Lane) {
    e.stopPropagation();
    // A name is kept when it is done (Enter, or the focus leaving it): typed, it is a draft, never half a name on the cards.
    this.drafts.set(`lane:${l.name}`, plainBlock(words(applyAll({ head: {}, blocks: this.laneBlocks(l) }, e.detail.ops).blocks)));
    this.laneError = '';
    this.requestUpdate();
  }
  /** Rename lane: its name, where it is drawn, a field, its words chosen to type over. */
  startRename(i: number) {
    if (!this.lanesChange || !this.view.lanes[i]) return;
    void this.focusLane(i, true);
  }
  /**
   * A lane's name as typed, kept (Enter, the focus leaving it): told first ("lanerename"), then its cards' cells and
   * `lanes:` (model.ts `renameLane`). A name that is empty or another lane's is refused and said; the name stays a field
   * (`stay`, Enter's) or goes back as it was (the focus leaving). True where the name is done with.
   */
  private keepLane(i: number, stay: boolean): boolean {
    const l = this.view.lanes[i];
    if (!l || this.renaming !== i) return true;
    const key = `lane:${l.name}`;
    const typed = this.drafts.get(key);
    const name = typed ? flat(words([typed])) : l.name;
    const refused = !name ? t('board-lane-needs-a-name') : name !== l.name && this.view.lanes.some((x) => x.name === name) ? t('board-lane-name-taken', { lane: name }) : '';
    this.errorAt = i;
    if (refused && stay) {
      this.laneError = refused;
      return false;
    }
    this.drafts.delete(key);
    [this.renaming, this.laneError] = [-1, refused];
    if (!refused && name !== l.name && this.tell('lanerename', { from: l.name, to: name })) this.edit(renameLane(this.doc, l.name, name));
    this.requestUpdate();
    return true;
  }
  /** Escape in a lane's name being renamed: what was there comes back, the name shown and focused. */
  private resetLane(e: Event, l: Lane, i: number) {
    e.stopPropagation();
    e.preventDefault();
    if (this.renaming !== i) return;
    this.drafts.delete(`lane:${l.name}`);
    [this.renaming, this.laneError] = [-1, ''];
    void this.focusLane(i);
  }
  /** Enter in a lane's name being renamed: kept, and the name shown and focused again, wherever the lane now is; refused, it stays a field. */
  private laneEnter(l: Lane, i: number) {
    if (this.renaming !== i) return this.startRename(i);
    const from = l.name;
    if (!this.keepLane(i, true)) return;
    const typed = this.view.lanes.findIndex((x) => x.name === from);
    void this.focusLane(typed >= 0 ? typed : i);
  }
  /** The keys on a lane's name shown: Enter or F2 rename it, Down goes to its first card. */
  private laneKey(e: KeyboardEvent, i: number) {
    if (this.renaming === i || e.altKey || e.ctrlKey || e.metaKey || e.isComposing || e.defaultPrevented) return;
    if (!(e.target as HTMLElement).closest?.('.board-lane-name')) return;
    if (e.key === 'Enter' || e.key === 'F2') {
      if (!this.lanesChange) return;
      e.preventDefault();
      e.stopPropagation();
      this.startRename(i);
    } else if (e.key === 'ArrowDown' && this.view.lanes[i]?.cards[0]) {
      e.preventDefault();
      void this.focusTitle(this.view.lanes[i].cards[0].row, 'end');
    }
  }
  private onFocusOut = (e: FocusEvent) => {
    const from = (e.target as HTMLElement).closest?.('.board-lane-name');
    const i = from ? Number(from.closest<HTMLElement>('.board-lane')!.dataset.lane) : -1;
    if (i >= 0 && i === this.renaming && !(e.relatedTarget instanceof Node && from!.contains(e.relatedTarget))) this.keepLane(i, false);
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
      this.edit(addCard(this.doc, name, '', at, columnNames()));
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
    this.edit(addCard(this.doc, name, '', undefined, columnNames()));
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
    if (!this.tell('laneadd', { name, at })) return;
    this.edit(addLane(this.doc, name, at));
    this.startRename(this.view.lanes.findIndex((l) => l.name === name));
  }
  /** The lane menu's Rename lane. */
  renameMenuLane() {
    if (this.menuLane) this.startRename(this.menuAt);
  }
  /** The hand-off: the same table, opened in the Spreadsheet in a tab of its own, where the page says documents open. */
  openInSheet() {
    window.open(host.link('sheet', write(this.doc)), '_blank', 'noopener');
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
    if (!this.tell('lanemove', { name: l.name, from: at, to: at + by })) return;
    this.edit(moveLane(this.doc, l.name, at + by));
    this.menuAt = this.view.lanes.findIndex((x) => x.name === l.name);
  }
  deleteMenuLane() {
    const l = this.menuLane;
    if (!l) return;
    const i = this.menuAt;
    if (!this.tell('lanedelete', { name: l.name, cards: l.cards.length })) return;
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

  /* ---------- cards chosen whole (the kit's Rows) ---------- */

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
  /** The card the chosen ones end at (the range's focus), which Open opens. */
  chosenOne(): Card | undefined {
    const r = this.rows.range;
    return r ? this.cardAt(r.focus) : undefined;
  }
  /** Mod+Left/Right: the chosen cards carried to the end of the lane beside; they stay chosen. */
  carryChosen(by: -1 | 1) {
    const to = this.chosenLane(by);
    if (to) this.carryTo(this.view.lanes.indexOf(to));
  }
  /** Move to…: a menu of the lanes beside the bar under the chosen cards, the lane they are in checked. */
  async moveToMenu() {
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.board-moveto');
    const s = this.rows.range ? this.rows.span() : null;
    const first = s ? this.chosenCards(s)[0] : undefined;
    const from =
      this.querySelector<HTMLElement>(`.board-context button[aria-label="${t('board-move-to')}"]`) ??
      (first ? this.querySelector<HTMLElement>(`.board-card[data-row="${first.row}"] .board-grip`) : null);
    if (!menu || !from) return;
    await menu.updateComplete;
    menu.openAt(from);
  }
  /** The lanes, for Move to…: the one every chosen card is in checked, and not to be chosen. */
  private moveToItems(): MenuItem[] {
    const s = this.rows.range ? this.rows.span() : null;
    const cards = s ? this.chosenCards(s) : [];
    const own = cards.length && cards.every((c) => c.lane === cards[0].lane) ? cards[0].lane : -1;
    return this.view.lanes.map((l, i) => ({ label: l.name || '–', checked: i === own, disabled: i === own || !cards.length, does: () => this.carryTo(i) }));
  }
  /** The chosen cards carried to the end of lane `i`, in the board's order; they stay chosen. */
  private carryTo(i: number) {
    const s = this.rows.range ? this.rows.span() : null;
    const to = this.view.lanes[i];
    if (!s || !to) return;
    const cards = this.chosenCards(s);
    const n = to.cards.filter((c) => !cards.includes(c)).length;
    this.moved(
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
    this.moved(moveCard(this.doc, m.card.row, lane.name, m.to));
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

  /* ---------- a card opened: its fields in a dialog ---------- */

  /** Alt+Enter, Open, a double click: the card's every cell a field of a dialog, the first field focused (carried only, the lane's). */
  openCard(row: number): boolean {
    const c = this.cardAt(row);
    if (!c || this.readOnly) return false;
    const cells = (this.doc.blocks[this.view.at] as TableBlock).rows[row];
    const back = this.rows.range ? 'rows' : this.cur === row ? this.caretIn(row) : 'end';
    this.rows.release();
    this.opened = { row, values: Object.fromEntries(this.view.cols.map((_, i) => [i, cells[i] ?? ''])), touched: new Set(), lane: this.laneOf(c).name, rich: new Map(), back };
    void this.updateComplete.then(async () => {
      const dialog = this.querySelector<ToDialog>('to-dialog.board-dialog');
      if (!dialog) return;
      await dialog.show();
      await dialog.updateComplete;
      // Carried only, the lane is the one field that changes.
      dialog.querySelector<HTMLElement>(this.carryOnly ? '.board-form select' : '.board-form input, .board-form select, .board-form to-text')?.focus({ preventScroll: true });
    });
    return true;
  }
  /** A field typed: kept in the draft, and the column marked as touched; nothing written until Done. */
  private put(c: number, value: string) {
    if (this.opened) this.opened = { ...this.opened, values: { ...this.opened.values, [c]: value }, touched: new Set(this.opened.touched).add(c) };
  }
  /** A rich cell's words typed (as the Spreadsheet's rich cells: the marks kept, written as the cell's inline words). */
  private onRichOps(e: CustomEvent<TextOps>, c: number) {
    e.stopPropagation();
    const o = this.opened;
    if (!o) return;
    const block = this.richBlock(c);
    const runs = applyAll({ head: {}, blocks: [block] }, e.detail.ops).blocks.flatMap((b) => ('runs' in b ? b.runs : []));
    o.rich.set(c, { k: 'p', runs });
    this.put(c, writeInline(runs));
  }
  private richBlock(c: number): Block {
    const o = this.opened!;
    let b = o.rich.get(c);
    if (!b) o.rich.set(c, (b = { k: 'p', runs: parseInline(o.values[c] ?? '') }));
    return b;
  }
  /** Done: the cells typed and the lane chosen, those alone, one step (the card moved to the end of a new lane); carried only, the lane alone. */
  private doneCard = () => {
    const o = this.opened;
    const c = o && this.cardAt(o.row);
    if (!o || !c) return this.querySelector<ToDialog>('to-dialog.board-dialog')?.close();
    const cells = this.carryOnly ? [] : setCells(this.doc, o.row, Object.fromEntries([...o.touched].map((k) => [k, o.values[k] ?? ''])));
    const lane = o.touched.has(this.view.laneCol) ? this.view.lanes.find((l) => l.name === o.lane) : undefined;
    const moved = lane && lane.name !== this.laneOf(c).name ? moveCard(applyAll(this.doc, cells), o.row, lane.name, lane.cards.length) : [];
    const mark = { row: o.row, offset: 0 };
    if (cells.length) this.edit([...cells, ...moved], undefined, mark);
    else if (moved.length) this.moved(moved, mark);
    this.landed = moved.length ? (this.view.lanes.find((l) => l.name === o.lane)?.cards.at(-1)?.row ?? o.row) : o.row;
    this.querySelector<ToDialog>('to-dialog.board-dialog')?.close();
  };
  /** The dialog's Delete: the card taken away (one step), the caret to the card before it. */
  deleteOpened() {
    const o = this.opened;
    if (!o) return;
    this.opened = null;
    this.querySelector<ToDialog>('to-dialog.board-dialog')?.close();
    this.deleteCards([o.row]);
  }
  /** The dialog closed (Done, Delete, Cancel, Escape, the backdrop): the focus back on the card, chosen or in its title, wherever it now is. */
  private onDialogClose = () => {
    const o = this.opened;
    const row = this.landed ?? o?.row;
    this.opened = null;
    this.landed = null;
    if (!o || row === undefined || !this.cardAt(row)) return;
    if (o.back === 'rows') void this.updateComplete.then(() => this.rows.select({ anchor: row, focus: row }));
    else void this.focusTitle(row, row === o.row ? o.back : 'end');
  };
  /** Enter in a field (not a list's), and Mod+Enter anywhere in the dialog, is Done. */
  private formKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.altKey || e.shiftKey || e.isComposing) return;
    if (e.metaKey || e.ctrlKey || (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      this.doneCard();
    }
  };
  /** A cell as a field: the lane a list of the lanes; a checkbox a box; a rich cell its words; the rest a line that asks for the keyboard its column does, an option column's offering the words it holds. */
  private field(c: number, o: Opened) {
    const v = this.view;
    const col = v.cols[c];
    const name = col.name || (c === v.laneCol ? t('board-lane') : t('common-column-c', { c: COL_NAMES[c] ?? '' }));
    const value = o.values[c] ?? '';
    const id = `${this.uid}-f${c}`;
    if (c === v.laneCol)
      return html`<label class="board-field"><span>${name}</span><select @change=${(e: Event) => this.opened && (this.opened = { ...this.opened, lane: (e.target as HTMLSelectElement).value, touched: new Set(this.opened.touched).add(c) })}>
          ${v.lanes.map((l) => html`<option value=${l.name} ?selected=${l.name === o.lane}>${l.name || '–'}</option>`)}
        </select></label>`;
    if (col.type === 'check')
      return html`<label class="to-switch board-field board-check"><input type="checkbox" .checked=${TICKED.test(value.trim())} ?disabled=${this.carryOnly} @change=${(e: Event) => this.put(c, (e.target as HTMLInputElement).checked ? 'x' : '')} /><span class="to-switch-words">${name}</span></label>`;
    if (col.type === 'rich' && !value.startsWith('='))
      return html`<div class="board-field"><span>${name}</span><to-text
          shape="line"
          .blocks=${[this.richBlock(c)]}
          label=${name}
          @text-ops=${(e: CustomEvent<TextOps>) => this.onRichOps(e, c)}
          @text-enter=${(e: Event) => (e.stopPropagation(), this.doneCard())}
          @text-exit=${(e: Event) => e.stopPropagation()}
          @text-selectall=${(e: Event) => e.stopPropagation()}
        ></to-text></div>`;
    const choices = col.type === 'option' ? choicesOf((this.doc.blocks[v.at] as TableBlock).rows, c) : [];
    return html`<label class="board-field"><span>${name}</span><input
          type="text"
          autocomplete="off"
          ?readonly=${this.carryOnly}
          .value=${value}
          inputmode=${KEYBOARD[col.type] ?? 'text'}
          placeholder=${col.type === 'date' ? t('board-yyyy-mm-dd') : nothing}
          list=${choices.length ? id : nothing}
          @input=${(e: Event) => this.put(c, (e.target as HTMLInputElement).value)}
        />${choices.length ? html`<datalist id=${id}>${choices.map((x) => html`<option value=${x}></option>`)}</datalist>` : nothing}</label>`;
  }
  private renderDialog() {
    const o = this.opened;
    const c = o ? this.cardAt(o.row) : undefined;
    const close = () => this.querySelector<ToDialog>('to-dialog.board-dialog')?.close();
    const body =
      o && c
        ? html`<div class="board-form" ?readonly=${this.carryOnly} @keydown=${this.formKey}>
            ${this.view.cols.map((_, i) => this.field(i, o))}
            <div class="to-row board-actions">
              ${
                this.carryOnly
                  ? nothing
                  : cmdBtn(
                      BOARD.find((x) => x.id === 'board.card.delete')!,
                      this,
                      { cls: 'board-delete' },
                    )
              }
              ${btn({ label: t('common-cancel'), does: close })} ${btn({ label: t('common-done'), icon: UI.check, cls: 'primary', does: this.doneCard })}
            </div>
          </div>`
        : nothing;
    return html`<to-dialog class="board-dialog" heading=${c?.title || t('board-card')} @to-close=${this.onDialogClose} .body=${body}></to-dialog>`;
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
    const put = pasteCards(applyAll(this.doc, gone), name, at, text, columnNames());
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

  /* ---------- a card carried: pressed anywhere on it, moved, let go in a lane ---------- */

  /** Words being typed where `el` is: an editable title or name with the focus, whose press is the words' own (a caret, a selection). */
  private typing(el: Element): boolean {
    const words = el.closest<ToText>('to-text');
    return !!words && !words.locked && words.contains(document.activeElement);
  }
  /** A press on a card, outside its controls and outside words being typed: it may carry the card (`move`), or be a click (`cardTap`). */
  private down = (e: PointerEvent) => {
    if (this.laneError && this.renaming < 0) this.laneError = '';
    if (e.button !== 0 || !e.isPrimary || this.readOnly || this.press) return;
    const el = e.target instanceof Element ? e.target : null;
    const box = el?.closest<HTMLElement>('.board-card');
    if (!el || !box || !this.contains(box) || el.closest('button, a[href], input, select, textarea, [popover], dialog') || this.typing(el)) return;
    const c = this.cardAt(Number(box.dataset.row));
    if (!c) return;
    this.dragged = false;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    const press: Press = { id: e.pointerId, x: e.clientX, y: e.clientY, row: c.row, touch, armed: !touch, moved: false, held: false, timers: [] };
    if (touch)
      press.timers.push(
        // Held still a moment, the card lifts: it may be carried now, and the finger no longer scrolls (`onTouchMove`).
        window.setTimeout(() => {
          if (this.press !== press || press.moved) return;
          press.armed = true;
          this.lifting = press.row;
        }, PRESS),
        // Held still half a second, the card is chosen, or the chosen ones extended to it (the standard's hold); it may still be carried.
        window.setTimeout(() => {
          if (this.press !== press || press.moved) return;
          press.held = true;
          this.dragged = true;
          this.rows.choose(press.row, true);
        }, HOLD),
      );
    this.press = press;
    this.point = { x: e.clientX, y: e.clientY };
  };
  /** A mouse's press on a card is the board's: no caret and no words selected under it, so it can carry the card (a click puts the caret where it was, `cardTap`). */
  private onMouseDown = (e: MouseEvent) => {
    const el = e.target instanceof Element ? e.target : null;
    if (this.press && !this.press.touch && el?.closest('.board-card') && !this.typing(el)) e.preventDefault();
  };
  /** A finger that may carry a card does not scroll the page, nor bring up the browser's menu. */
  private onTouchMove = (e: TouchEvent) => {
    if (this.press?.armed && e.cancelable) e.preventDefault();
  };
  private onContextMenu = (e: Event) => {
    if (this.press?.touch) e.preventDefault();
  };
  private move = (e: PointerEvent) => {
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    this.point = { x: e.clientX, y: e.clientY };
    if (!p.moved) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < (p.touch ? TOUCH_SLOP : SLOP)) return;
      // A finger that moves before the card lifted is scrolling the page: no press of the board's.
      if (!p.armed) return this.stop();
      this.carryFrom(p);
    }
    e.preventDefault();
    this.follow();
    this.aim();
    this.edges();
  };
  /** The drag begins: the card lifted from its place (a slot its size there), a ghost of it under the pointer, the pointer the board's until it is let go. */
  private carryFrom(p: Press) {
    for (const x of p.timers) clearTimeout(x);
    p.moved = true;
    const c = this.cardAt(p.row);
    const box = this.querySelector<HTMLElement>(`.board-card[data-row="${p.row}"]`);
    // Words being typed elsewhere on the board keep what they hold; the focus goes to the board while the card is carried.
    if (this.contains(document.activeElement)) this.querySelector<HTMLElement>('.board')?.focus({ preventScroll: true });
    document.getSelection()?.removeAllRanges();
    this.rows.release();
    this.slotHeight = box ? box.getBoundingClientRect().height : 0;
    this.lift(p.row, p.x, p.y);
    this.carrying = p.row;
    this.lifting = -1;
    if (c) this.over = { lane: c.lane, pos: this.placeOf(c) };
    try {
      this.querySelector<HTMLElement>('.board')?.setPointerCapture(p.id);
    } catch {
      // A pointer that is not really down (a test's) cannot be captured; the board hears it as long as it is over it.
    }
  }
  /** The carried card's height, which the slot where it would land takes. */
  private slotHeight = 0;
  /** The ghost: the carried card's face, as wide as the card, held where the pointer took it (x, y), following the pointer. */
  private lift(row: number, x: number, y: number) {
    const card = this.querySelector<HTMLElement>(`.board-card[data-row="${row}"]`);
    const c = this.cardAt(row);
    if (!card || !c) return;
    const r = card.getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'board-card board-ghost';
    g.setAttribute('aria-hidden', 'true');
    render(this.face(c, html`<div class="board-title"><div class="tx">${c.title || '–'}</div></div>`), g);
    g.style.width = `${Math.round(r.width)}px`;
    this.ghostAt = { dx: x - r.left, dy: y - r.top };
    document.body.append(g);
    this.ghost = g;
    this.follow();
  }
  private ghostAt = { dx: 0, dy: 0 };
  private follow() {
    if (!this.ghost) return;
    this.ghost.style.left = `${Math.round(this.point.x - this.ghostAt.dx)}px`;
    this.ghost.style.top = `${Math.round(this.point.y - this.ghostAt.dy)}px`;
  }
  /** Where the carried card would land: the lane under the pointer, before the first of its other cards whose middle is below it; between lanes, where it was last. */
  private aim() {
    const { x, y } = this.point;
    const lane = document
      .elementsFromPoint(x, y)
      .map((el) => el.closest<HTMLElement>('.board-lane'))
      .find((el) => el && this.contains(el));
    if (!lane) return;
    const i = Number(lane.dataset.lane);
    const cards = [...lane.querySelectorAll<HTMLElement>('.board-card')].filter((el) => Number(el.dataset.row) !== this.carrying);
    let pos = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (pos < 0) pos = cards.length;
    if (this.over?.lane !== i || this.over.pos !== pos) this.over = { lane: i, pos };
  }
  /**
   * Near an edge of what scrolls, it scrolls to bring more of the board under the pointer, the faster the nearer: the
   * column (or the page) up and down, the board's lanes sideways where they are wider than it, and a lane's cards where
   * a page gives a lane a height of its own (`--to-board-lane-h`).
   */
  private edges() {
    if (this.scrolling) return;
    const board = this.querySelector<HTMLElement>('.board');
    const sc = scrollerOf(board);
    const speed = (d: number) => (d < EDGE ? Math.ceil(((EDGE - Math.max(0, d)) / EDGE) * SPEED) : 0);
    const step = () => {
      this.scrolling = 0;
      if (this.carrying < 0 || !sc.isConnected || !board) return;
      const { x, y } = this.point;
      const r = sc === document.scrollingElement ? new DOMRect(0, 0, innerWidth, innerHeight) : sc.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      const by = speed(y - r.top) ? -speed(y - r.top) : speed(r.bottom - y);
      const bx = board.scrollWidth > board.clientWidth ? (speed(x - b.left) ? -speed(x - b.left) : speed(b.right - x)) : 0;
      const list = document
        .elementsFromPoint(x, y)
        .map((el) => el.closest<HTMLElement>('.board-cards'))
        .find((el) => el && this.contains(el) && el.scrollHeight > el.clientHeight + 1);
      const l = list?.getBoundingClientRect();
      const ly = list && l ? (speed(y - l.top) ? -speed(y - l.top) : speed(l.bottom - y)) : 0;
      if (!by && !bx && !ly) return;
      const before = [sc.scrollTop, board.scrollLeft, list?.scrollTop ?? 0];
      sc.scrollTop += by;
      board.scrollLeft += bx;
      if (list) list.scrollTop += ly;
      if (sc.scrollTop !== before[0] || board.scrollLeft !== before[1] || (list?.scrollTop ?? 0) !== before[2]) this.aim();
      this.scrolling = requestAnimationFrame(step);
    };
    this.scrolling = requestAnimationFrame(step);
  }
  private up = (e: PointerEvent) => {
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
    for (const x of this.press?.timers ?? []) clearTimeout(x);
    this.press = null;
    this.ghost?.remove();
    this.ghost = null;
    this.carrying = -1;
    this.lifting = -1;
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
  /** The click a drag, or a finger's hold, ends with is not a tap: nothing picks, chooses or puts a caret on it. */
  private onClickAfter = (e: MouseEvent) => {
    if (!this.dragged) return;
    this.dragged = false;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  /** A card activated is picked (DocElement's "docpick", read-only; `onPickCard`, pickable): the table's block, and the card's row in it. */
  protected pickOf(el: Element): PickedCard | null {
    const card = el.closest<HTMLElement>('.board-card');
    return card && this.contains(card) ? { at: this.view.at, row: Number(card.dataset.row) } : null;
  }
  /**
   * Pickable, a card activated while the board can be changed is picked as a read-only board's is: a bubbling "docpick"
   * with `{ at, row }`. A click or a tap on the card (not one a drag ends with: `onClickAfter`), and never in
   * words being typed (a title where titles are typed in: a click there is the caret's, and Enter makes a card); Enter
   * on a title that is shown and not typed in; and Enter on cards chosen whole (Escape in a title chooses its card), the focus then on the board: the card they end at, the one Open opens. So a board whose
   * titles are typed is picked from the keys too. Read-only, the pick is DocElement's own.
   */
  private onPickCard = (e: Event) => {
    if (!this.pickable || this.readOnly) return;
    if (e instanceof KeyboardEvent && (e.key !== 'Enter' || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)) return;
    // Shift and a click chooses the card instead (`cardTap`): the pointer's way to choose one where a click picks.
    if (e instanceof MouseEvent && e.shiftKey) return;
    const el = e.target instanceof Element ? e.target : null;
    if (!el || el.closest('a[href], dialog, [popover]')) return;
    const words = el.closest<ToText>('to-text');
    const chosen = e instanceof KeyboardEvent && this.rows.range && el.matches('.board') ? this.chosenOne() : undefined;
    if (!chosen && ((words && !words.locked) || (e instanceof KeyboardEvent && !words))) return;
    const pick = chosen ? { at: this.view.at, row: chosen.row } : this.pickOf(el);
    if (!pick) return;
    e.preventDefault();
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('docpick', { detail: pick, bubbles: true }) as DocPick);
  };
  /**
   * A click or a tap on a card: on its title, where titles are typed, the caret where it was (the mouse's press having
   * been the board's, `onMouseDown`); anywhere else on it (its fields, the room round them, a title shown and not
   * typed) the card chosen, Shift extending. Pickable, it is a pick, heard first (`onPickCard`).
   */
  private cardTap(c: Card, e: MouseEvent) {
    const el = e.target as HTMLElement;
    const words = el.closest?.<ToText>('to-text');
    if (words && !words.locked) {
      if (!words.contains(document.activeElement)) void this.focusTitle(c.row, this.offsetAt(words, e.clientX, e.clientY), false);
      return;
    }
    if (el.closest?.('button, input, a, [popover], dialog')) return;
    // Pickable, a click picks; Shift and a click chooses the card, extending cards already chosen.
    this.rows.choose(c.row, e.shiftKey && (!this.pickable || !!this.rows.range));
  }
  /** The place in a title's words under a point; their end where none is. */
  private offsetAt(words: ToText, x: number, y: number): number | 'end' {
    const doc = document as Document & { caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null };
    const hit =
      doc.caretPositionFromPoint?.(x, y) ??
      (() => {
        const r = document.caretRangeFromPoint?.(x, y);
        return r ? { offsetNode: r.startContainer, offset: r.startOffset } : null;
      })();
    const pos = hit && words.tx.contains(hit.offsetNode) ? words.readPos(hit.offsetNode, hit.offset) : null;
    return pos ? pos.offset : 'end';
  }

  /* ---------- drawing ---------- */

  /** The fields cards show, and how, for the board as it is and the page's `cardFields`: worked out once a drawing. */
  private shown: { view: BoardView; given: CardField[] | null; fields: ShownField[] } | null = null;
  private shownFields(): ShownField[] {
    const v = this.view;
    if (this.shown?.view !== v || this.shown.given !== this.cardFields) this.shown = { view: v, given: this.cardFields, fields: cardFieldsOf(v, this.cardFields) };
    return this.shown.fields;
  }
  /** A column's currency: its own, else the document's, else dollars. */
  private currencyOf(col: number): string {
    return this.view.cols[col]?.currency || this.doc.head.currency || '$';
  }
  /** One field on a card's face, drawn as it is shown (model.ts `CardFieldAs`); its column's name said to a screen reader where the face leaves it out. */
  private chip(f: Field, as: ShownField['as']): TemplateResult {
    const said = html`<span class="sr-only">${f.name}: </span>`;
    if (as === 'money') {
      const v = typeof f.value === 'number' && isFinite(f.value) ? moneyShort(f.value, this.currencyOf(f.col)) : f.shown;
      return html`<span class="board-chip board-money" title=${`${f.name}: ${f.shown}`}>${said}${v}</span>`;
    }
    if (as === 'date') {
      const v = dayShort(f.value) ?? f.shown;
      return html`<span class="board-chip board-date" title=${`${f.name}: ${f.shown}`}>${icon(CalendarDays, 14)}${said}${v}</span>`;
    }
    if (as === 'person')
      return html`<span class="board-person" style=${`--to-board-hue: ${hueOf(f.shown)}`} title=${`${f.name}: ${f.shown}`}
        ><span aria-hidden="true">${initials(f.shown)}</span>${html`<span class="sr-only">${f.name}: ${f.shown}</span>`}</span
      >`;
    // A badge: a choice its words, a box ticked its name, a number its name and the number.
    const type = this.view.cols[f.col]?.type;
    const bare = type === 'option' || type === 'text' || type === 'rich' || !type;
    const words = bare ? f.shown : type === 'check' ? (TICKED.test(f.raw.trim()) || f.value === 1 ? `✓ ${f.name}` : '') : `${f.name} ${f.shown}`;
    return words ? html`<span class="board-chip board-badge" title=${`${f.name}: ${f.shown}`}>${bare ? said : nothing}${words}</span>` : html``;
  }
  /**
   * A card's face under its title: the line (a deal's company), the quiet names and values, then the row of its
   * amount, its day and its chips, the people at its end. The editor's cards and the ghost a drag carries are this.
   */
  private face(c: Card, title: TemplateResult): TemplateResult {
    const by = new Map(c.fields.filter((f) => f.shown).map((f) => [f.col, f]));
    const got = this.shownFields().flatMap((s) => (by.has(s.col) ? [{ f: by.get(s.col)!, as: s.as }] : []));
    const line = got.find((x) => x.as === 'line');
    const texts = got.filter((x) => x.as === 'text');
    const meta = got.filter((x) => x.as === 'money' || x.as === 'date' || x.as === 'badge');
    const people = got.filter((x) => x.as === 'person');
    return html`${title}${line ? html`<p class="board-line">${line.f.shown}</p>` : nothing}${
      texts.length ? html`<dl class="board-fields">${texts.map(({ f }) => html`<div><dt>${f.name}</dt><dd>${f.shown}</dd></div>`)}</dl>` : nothing
    }${
      meta.length || people.length
        ? html`<div class="board-meta">${meta.map(({ f, as }) => this.chip(f, as))}${people.length ? html`<span class="board-people">${people.map(({ f }) => this.chip(f, 'person'))}</span>` : nothing}</div>`
        : nothing
    }`;
  }
  private card(l: Lane, c: Card, j: number, i: number) {
    const ranged = this.rows.has(c.row);
    const n = j + 1;
    const lane = l.name || '–';
    const title = html`<to-text
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
    ></to-text>`;
    return html`<li
      class="board-card ${c.row === this.cur ? 'sel' : ''} ${ranged ? 'ranged' : ''} ${c.row === this.carrying ? 'dragging' : ''} ${c.row === this.lifting ? 'lifting' : ''}"
      data-row=${c.row}
      ?readonly=${this.carryOnly}
      aria-label=${c.title || '–'}
      aria-description=${t('board-card-n-tap-chooses-it', { n, lane })}
      @focusin=${() => ((this.cur = c.row), (this.curLane = i))}
      @click=${(e: MouseEvent) => this.cardTap(c, e)}
      @dblclick=${(e: MouseEvent) => !this.pickable && !(e.target as HTMLElement).closest?.('to-text:not([readonly] *)') && this.openCard(c.row)}
    >
      ${this.face(c, title)}
    </li>`;
  }
  /** Where the carried card would land in lane `i`, as a slot its height among the lane's cards: the place before which other card, or the end; -1 for none here. */
  private slotIn(l: Lane, i: number): number {
    if (this.carrying < 0 || this.over?.lane !== i) return -1;
    return Math.min(this.over.pos, l.cards.filter((c) => c.row !== this.carrying).length);
  }
  private lane(l: Lane, i: number) {
    const slot = this.slotIn(l, i);
    // The lane's cards, the carried one among them (drawn, not shown: the same element all the drag) and the slot at its place among the others.
    type Item = { card: Card; j: number } | 'slot';
    const items: Item[] = [];
    let k = 0;
    l.cards.forEach((card, j) => {
      if (card.row !== this.carrying && k++ === slot) items.push('slot');
      items.push({ card, j });
    });
    if (slot >= 0 && !items.includes('slot')) items.push('slot');
    const money = moneyColumn(this.view);
    const renaming = this.renaming === i;
    const sum = money >= 0 ? moneyShort(laneSum(this.view, i, money), this.currencyOf(money)) : '';
    return html`<section class="board-lane ${slot >= 0 ? 'over' : ''}" data-lane=${i} aria-label=${l.name || t('board-lane')}>
      <header class="board-head ${renaming ? 'renaming' : ''}" ?readonly=${!renaming} @focusin=${() => (this.curLane = i)} @keydown=${(e: KeyboardEvent) => this.laneKey(e, i)}>
        <to-text
          class="board-lane-name"
          shape="line"
          no-bubble
          .blocks=${this.laneBlocks(l)}
          label=${renaming ? t('board-lane-name') : l.name || t('board-lane')}
          title=${this.lanesChange && !renaming ? t('board-double-click-to-rename') : nothing}
          placeholder=${t('board-lane-name')}
          @dblclick=${() => this.renaming !== i && this.startRename(i)}
          @text-ops=${(e: CustomEvent<TextOps>) => this.onLaneOps(e, l)}
          @text-enter=${(e: Event) => (e.stopPropagation(), this.laneEnter(l, i))}
          @text-escape=${(e: Event) => this.resetLane(e, l, i)}
          @text-exit=${(e: Event) => e.stopPropagation()}
          @text-selectall=${(e: Event) => e.stopPropagation()}
        ></to-text>
        <span class="board-count" aria-label=${t('board-n-cards', { n: l.cards.length })}>${l.cards.length}</span>
        ${this.lanesChange ? this.laneMore(l, i) : nothing}
        ${sum ? html`<span class="board-sum" title=${t('board-lane-total', { sum })}><span class="sr-only">${t('board-lane-total', { sum })}</span><span aria-hidden="true">${sum}</span></span>` : nothing}
      </header>
      ${this.laneError && this.errorAt === i ? html`<p class="board-lane-error" role="alert">${this.laneError}</p>` : nothing}
      ${
        items.length
          ? html`<ol class="board-cards">
              ${repeat(
                items,
                (x) => (x === 'slot' ? 'slot' : x.card.row),
                (x) => (x === 'slot' ? html`<li class="board-slot" aria-hidden="true" style=${`height: ${Math.round(this.slotHeight)}px`}></li>` : this.card(l, x.card, x.j, i)),
              )}
            </ol>`
          : nothing
      }
      ${l.cards.some((c) => c.row !== this.carrying) || slot >= 0 ? nothing : html`<p class="to-hint board-none">${t('board-no-cards')}</p>`}
    </section>`;
  }
  /**
   * Carried only, the bar under chosen cards (the rows controller's, which shows it): what carries them, Move up, Move
   * down, Open (its lane alone) and Move to…, and Copy, which changes nothing; never Edit, Duplicate, Cut, Paste or Delete.
   */
  private carriedContext() {
    const s = this.rows.range ? this.rows.span() : null;
    const items = [
      { label: t('common-move-up'), icon: ArrowUp, keys: 'Alt+ArrowUp', disabled: !s || !this.runMove(s, -1), does: () => this.rows.move(-1) },
      { label: t('common-move-down'), icon: ArrowDown, keys: 'Alt+ArrowDown', disabled: !s || !this.runMove(s, 1), does: () => this.rows.move(1) },
      ...drawnIn(CHOSEN, 'context', this),
      '|',
      { label: t('common-copy'), icon: Copy, keys: 'Mod+C', does: () => this.rows.copyOut(false) },
    ];
    return html`<to-context class="to-rows-context board-context" .label=${t('board-chosen-cards')} .items=${items}></to-context>`;
  }
  /** A lane's menu's button: Rename lane, Add a card, Move left, Move right, Delete lane. */
  private laneMore(l: Lane, i: number) {
    return html`<button type="button" class="to-btn to-tool board-more" aria-haspopup="menu" aria-label=${t('board-options-for-lane', { lane: l.name || '–' })} title=${t('board-lane-options')} @click=${(e: Event) => void this.openMenu(i, e.currentTarget as HTMLElement)}>
          ${icon(Ellipsis, 18)}
        </button>`;
  }
  render() {
    const v = this.view;
    return html`${
      this.readOnly || this.carryOnly
        ? nothing
        : html`<to-bar class="board-bar">
            <to-insert .items=${drawnIn(BOARD, 'menu:insert', this)}></to-insert>
            ${cmdTool(
              BOARD.find((c) => c.id === 'board.view.sheet')!,
              this,
            )}
            <span class="to-hint board-total">${t('board-n-cards', { n: v.cards.length })}</span>
            ${this.undoTools()}
          </to-bar>`
    }
      <div class="board ${this.carrying >= 0 ? 'carrying' : ''}" role="group" tabindex="-1" aria-label=${t('board-board')}>${v.lanes.map((l, i) => this.lane(l, i))}</div>
      ${this.carryOnly ? this.carriedContext() : this.rows.renderContext()}
      ${
        !this.lanesChange
          ? nothing
          : html`<to-menu class="board-menu" .label=${this.menuLane ? t('board-options-for-lane', { lane: this.menuLane.name || '–' }) : t('board-lane-options')} .items=${drawnIn(BOARD, 'menu:lane', this)}></to-menu>`
      }
      <to-menu class="board-moveto" .label=${t('board-move-to')} .items=${this.moveToItems()}></to-menu>
      ${this.renderDialog()}`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToBoardEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-board-editor': ToBoardEditor;
  }
}
