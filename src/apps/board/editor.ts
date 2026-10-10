/**
 * <to-board-editor>: the Board app. The stages are columns side by side (one and a bit at a time on a
 * phone, scrolling sideways), each with its name, how many cards it holds against its limit, and a menu; or,
 * with the bar's Stages as rows (`look: rows`), bands one under another whose cards flow across and wrap, so a
 * phone reads them top to bottom. Each stage has its colour (the one chosen, else the palette's by its place):
 * its heading's tint and a thin top edge on its cards. In rows the stage beside is the one above or below: the
 * same keys (Mod+Alt+Left/Right) and the same bar items carry a card there, named and drawn for up and down.
 * A card is a line of rich text (a one-line <to-text>) with, if it has one, a checklist under it. Cards are
 * the kit's rows (kit/rows.ts): a tap on a card's grip, Escape or Shift+Up/Down in its words choose it whole,
 * and chosen cards are moved, duplicated, copied, cut, pasted and deleted from the keys or the small bar
 * under them. The grip also carries a card into any stage by a drag; Alt+Up/Down move a card along its
 * stage and Mod+Alt+Left/Right to the stage beside, the caret going with it. The words of each line follow
 * the outliner's rules: Enter splits (at the start it pushes the line down), Backspace at the start joins the
 * line before, Delete at the end joins the next one in. Every change is operations on the document's headings
 * and list items (model.ts); the one bar holds Insert ▾, the marks for the words being typed, undo and redo.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { Ellipsis, GripVertical } from 'lucide';
import { runLength, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { cmdTool } from '../../kit/bar.ts';
import { drawnIn, runKey } from '../../kit/commands.ts';
import { BOLD, HIGHLIGHT, ITALIC, LINK, STRIKE, UNDERLINE } from '../../kit/text-commands.ts';
import COMMANDS, { CHOSEN, WORDS } from './commands.ts';
import { docToHtml, pasteFrom } from '../../kit/clipboard.ts';
import type { ContextEntry } from '../../kit/context.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { embedOf } from '../../kit/embeds.ts';
import { icon } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { ToMenu } from '../../kit/menu.ts';
import { lastCopied, Rows, type Clip, type RowItem, type RowRange, type RowSpan } from '../../kit/rows.ts';
import { caret } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { STAGE_COLORS, addCard, addItem, addStage, asCards, asItems, blocksOf, cardsIn, carryCards, duplicateCard, duplicateCards, joinLine, moveCard, moveCards, moveItem, moveStage, progress, readBoard, removeCard, removeCards, setItemDone, shifted, splitCard, splitItem, stageOf, type BoardView, type Card, type Item, type Stage } from './model.ts';
import '../../kit/bar.ts';
import '../../kit/context.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import { reveal } from '../../kit/scroll.ts';
import './style.css';

export const tag = 'to-board-editor';

/** Where a dragged card would land: before the `pos`th card of stage `stage`. */
interface Over {
  stage: number;
  pos: number;
}
/** Where the selection was before an edit: cards chosen whole, or the caret in a line's words. What an undo puts back. */
type Mark = { range: RowRange<number> } | { at: number; offset: number };

export class ToBoardEditor extends DocElement<BoardView> {
  static properties: PropertyDeclarations = { menu: { state: true }, drag: { state: true }, over: { state: true }, mark: { state: true } };
  /** The stage whose menu is open, by its heading's block index. */
  declare menu: number | null;
  /** The card being carried: its block index. */
  declare drag: number | null;
  declare over: Over | null;
  /** The words last typed in, whose marks the bar shows; a change of it redraws the bar. */
  declare mark: ToText | null;
  /** The block the caret was last in (a stage's heading, a card, a checklist item): where Insert puts things. */
  cur = -1;
  /** A block's one-item array, kept so <to-text> sees the same `blocks` until the block itself changes. */
  private ones = new WeakMap<Block, Block[]>();
  private press: { id: number; x: number; y: number; at: number; moved: boolean; touch: boolean } | null = null;
  private lastPoint = { x: 0, y: 0 };
  private scroller = 0;
  /** A drag just ended on the grip: the click that follows it is not a tap. */
  private dragged = false;
  /** Cards chosen whole: the kit's one implementation (keys, the bar under them, the clipboard). The grip's drag is the board's own (across stages). */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.board'),
    handle: '.board-grip',
    label: t('Chosen cards'),
    contextClass: 'board-context',
    current: () => this.cardAt(this.cur)?.at ?? null,
    edit: (at, offset) => void this.focusText(at, offset === 'end' ? 'end' : offset),
    remove: (s) => this.removeSpan(s),
    canMove: (s, by) => !!moveCards(this.view, cardsIn(this.view, s.from, s.to), by),
    move: (s, by) => this.moveSpan(s, by),
    duplicate: (s) => this.duplicateSpan(s),
    copy: (s) => this.clip(s),
    paste: (data, s) => this.pasteCards(data, s ? (cardsIn(this.view, s.from, s.to).at(-1) ?? null) : null),
    extra: (s) => this.extraItems(s),
  });

  constructor() {
    super();
    this.menu = null;
    this.drag = null;
    this.over = null;
    this.mark = null;
  }
  connectedCallback() {
    super.connectedCallback();
    // After the rows controller's own: it has the keys of chosen cards first.
    this.addEventListener('keydown', this.onKey);
    // Escape during a drag lets it go, before anything else hears the key.
    this.addEventListener('keydown', this.onEscape, true);
    // Capturing: before a line's own editor hears a paste.
    this.addEventListener('paste', this.onPaste, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('keydown', this.onEscape, true);
    this.removeEventListener('paste', this.onPaste, true);
  }

  protected read(doc: Doc): BoardView {
    return readBoard(doc);
  }
  private one(b: Block): Block[] {
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }

  /* ---------- undo ---------- */

  /** Every edit keeps where the selection was before it, for its undo. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    const r = this.rows.range;
    const now: Mark | undefined = r ? { range: { ...r } } : this.cur >= 0 && this.textAt(this.cur) ? { at: this.cur, offset: this.caretIn(this.cur) } : undefined;
    super.edit(ops, key, mark ?? now);
  }
  /** After an undo the selection comes back as it was before the edit; after a redo, the line the change touched first. */
  protected undone(entry: Entry, redo: boolean) {
    this.menu = null;
    this.rows.release();
    const mark = entry.mark as Mark | undefined;
    const card = (at: number) => this.cardAt(at)?.at === at;
    if (!redo && mark && 'range' in mark) {
      const r = mark.range;
      if (card(r.anchor) && card(r.focus)) return void this.updateComplete.then(() => this.rows.select(r));
    } else if (!redo && mark && !('range' in mark) && this.lines().includes(mark.at)) return void this.focusText(mark.at, mark.offset);
    const first = firstAt(entry);
    const lines = this.lines();
    if (first < 0 || !lines.length) return;
    void this.focusText([...lines].reverse().find((at) => at <= first) ?? lines[0], 'end');
  }

  /* ---------- finding things ---------- */

  stageAt(at: number): Stage | undefined {
    return this.view.stages.find((s) => at >= s.start && at < s.end);
  }
  cardAt(at: number): Card | undefined {
    return this.view.stages.flatMap((s) => s.cards).find((c) => at >= c.at && at < c.end);
  }
  itemAt(at: number): { card: Card; item: Item; k: number } | undefined {
    const card = this.cardAt(at);
    const k = card ? card.items.findIndex((i) => i.at === at) : -1;
    return card && k >= 0 ? { card, item: card.items[k], k } : undefined;
  }
  /** Every line with words a caret can be in, in a stage's order: its name, then each card and its checklist. */
  stageLines(s: Stage): number[] {
    return [...(s.block ? [s.at] : []), ...s.cards.flatMap((c) => [c.at, ...c.items.map((i) => i.at)])];
  }
  private lines(): number[] {
    return this.view.stages.flatMap((s) => this.stageLines(s));
  }
  private textAt(at: number): ToText | null {
    return this.querySelector<ToText>(`to-text[data-at="${at}"]`);
  }
  private lengthOf(at: number): number {
    const b = this.doc.blocks[at];
    return b && 'runs' in b ? runLength(b.runs) : 0;
  }
  /** Where the caret is in a line's words (the end when it is not there). */
  caretIn(at: number): number {
    const s = this.textAt(at)?.sel;
    return s ? s.focus.offset : this.lengthOf(at);
  }
  /** Where a person starts: the first stage's first card's words, else the stage's name, the caret at their end (the page held still). */
  async focusFirst() {
    await this.updateComplete;
    const s = this.view.stages[0];
    const at = s?.cards[0]?.at ?? (s?.block ? s.at : -1);
    const x = at >= 0 ? this.textAt(at) : null;
    if (x) x.sel = caret(0, this.lengthOf(at));
  }
  /** Focus the words of the block at `at`, once it is drawn; `end` puts the caret after them, `all` selects them, a number there. */
  async focusText(at: number, how: 'start' | 'end' | 'all' | number = 'start') {
    await this.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));
    const x = this.textAt(at);
    if (!x) return;
    const n = this.lengthOf(at);
    x.sel = how === 'all' ? { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: n } } : caret(0, how === 'end' ? n : how === 'start' ? 0 : Math.min(how, n));
    reveal(x, { inline: true });
  }

  /** The caret is in the block at `at`: Insert is told, so it offers what makes sense there. */
  private at(at: number, e?: Event) {
    const x = (e?.target as HTMLElement | undefined)?.closest?.('to-text') as ToText | null | undefined;
    if (x) this.mark = x;
    if (this.cur === at) return;
    this.cur = at;
    this.requestUpdate();
  }

  /* ---------- the words ---------- */

  private onOps = (e: CustomEvent<TextOps>, at: number) => {
    e.stopPropagation();
    const { ops, kind } = e.detail;
    this.edit(shifted(ops, at), kind ? `type:${at}` : undefined);
  };
  private onSelect = (e: CustomEvent<unknown>) => {
    // A field the caret has left says so too; the bar goes on working the one it went to.
    if (!e.detail) return;
    const x = e.currentTarget as ToText;
    if (this.mark !== x) this.mark = x;
    else if (this.selectionMoved(JSON.stringify(x.marks))) this.requestUpdate();
  };
  /**
   * Backspace at the very start of a line, or Delete at its very end (the line-shaped editor says which). Backspace joins
   * the line to the one before (a card's checklist goes with it), and on an empty first card removes it; an empty card
   * with a checklist and nothing before it stays. Delete joins the next card or item in.
   */
  private onExit(at: number, dir: 'back' | 'forward') {
    const card = this.cardAt(at);
    if (!card) return;
    if (dir === 'forward') {
      const ops = this.doc.blocks[at + 1] && this.stageAt(at + 1) === this.stageAt(at) ? joinLine(this.doc, at + 1) : [];
      if (!ops.length) return;
      const offset = this.lengthOf(at);
      this.edit(ops);
      return void this.focusText(at, offset);
    }
    const empty = !this.lengthOf(at);
    if (card.at === at && card.items.length && empty) return;
    const ops = joinLine(this.doc, at);
    if (ops.length) {
      const offset = this.lengthOf(at - 1);
      this.edit(ops);
      return void this.focusText(at - 1, offset);
    }
    // The first card of its stage: an empty one goes, the caret to the stage's name.
    const stage = this.stageAt(at);
    if (card.at !== at || !empty || !stage) return;
    this.edit(removeCard(card));
    if (stage.block) void this.focusText(stage.at, 'end');
  }
  /** Enter in a card: at its end the next card, below its checklist; at the start of its words a card above; in the middle a split. */
  private onCardEnter(s: Stage, c: Card) {
    // An empty card at the end is enough.
    if (!c.words && !c.items.length && s.cards.at(-1) === c) return;
    const made = splitCard(c, this.caretIn(c.at));
    this.edit(made.ops);
    void this.focusText(made.at);
  }
  /** Enter in the heading: into the first card, or a first card if there is none. */
  private onStageEnter(s: Stage) {
    if (s.cards[0]) return void this.focusText(s.cards[0].at, 'end');
    const made = addCard(s);
    this.edit(made.ops);
    void this.focusText(made.at);
  }
  private onItemEnter(c: Card, k: number) {
    const made = splitItem(c.items[k], this.caretIn(c.items[k].at));
    this.edit(made.ops);
    void this.focusText(made.at);
  }

  /* ---------- the keys ---------- */

  private onEscape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !this.press) return;
    e.preventDefault();
    e.stopPropagation();
    this.cancel();
  };
  /**
   * The keys in the words: Alt+Up/Down move the card (or the checklist item) along, Mod+Alt+Left/Right carry the card to
   * the stage beside (a stage's name: the stage itself), Up/Down go from line to line, Mod+D duplicates the card,
   * Mod+Enter ticks an item. Chosen cards: Mod+Alt+Left/Right carry them (the rest are the rows controller's).
   */
  /** The line a key is typed in (a card's, a checklist item's, a stage's name), while the commands answer it. */
  here: { at: number; tx: ToText } | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.composedPath()[0] as HTMLElement;
    if (target.closest?.('[popover], dialog, to-bar, input, textarea, select')) return;
    const tx = target.closest?.('to-text') as ToText | null;
    if (this.rows.range && !tx) return void runKey(e, CHOSEN, this);
    if (!tx || !this.contains(tx)) return;
    const at = Number(tx.dataset.at);
    if (!this.stageAt(at) || !Number.isFinite(at)) return;
    this.here = { at, tx };
    try {
      runKey(e, WORDS, this);
    } finally {
      this.here = null;
    }
  };
  /** Mod+Alt+Left/Right in a card: to the stage beside; on a stage's name, the stage itself. */
  carryKey(side: -1 | 1): boolean {
    const { at } = this.here!;
    const stage = this.stageAt(at)!;
    const card = this.cardAt(at);
    const i = this.view.stages.indexOf(stage);
    if (card && card.at === at) {
      const to = this.view.stages[i + side];
      if (to) this.carry(card, to, to.cards.length);
    } else if (!card && stage.at === at) this.moveStageBy(i, side);
    else return false;
    return true;
  }
  /** Alt+Up/Down: the checklist item, or the card, along. */
  moveKey(by: -1 | 1): boolean {
    const { at } = this.here!;
    const stage = this.stageAt(at)!;
    const card = this.cardAt(at);
    const item = this.itemAt(at);
    if (item) this.moveItemBy(item.card, item.k, by);
    else if (card) {
      const j = stage.cards.indexOf(card);
      if (by < 0 && j > 0) this.carry(card, stage, j - 1);
      else if (by > 0 && j < stage.cards.length - 1) this.carry(card, stage, j + 2);
    } else return false;
    return true;
  }
  /** Up and Down at the edge of the words: the line before or after. */
  lineKey(up: boolean): boolean {
    const { at, tx } = this.here!;
    const lines = this.stageLines(this.stageAt(at)!);
    const to = lines[lines.indexOf(at) + (up ? -1 : 1)];
    if (to === undefined || !this.atEdgeLine(tx, up)) return false;
    void this.focusText(to, up ? 'end' : 'start');
    return true;
  }
  /** Mod+D in a card: the card again, the caret where it was. */
  duplicateKey(): boolean {
    const { at } = this.here!;
    const card = this.cardAt(at);
    if (!card) return false;
    const made = duplicateCard(card);
    const offset = this.caretIn(at);
    this.edit(made.ops);
    void this.focusText(made.at + (at - card.at), offset);
    return true;
  }
  /** Mod+Enter on a checklist item ticks it. */
  tickKey(): boolean {
    const item = this.itemAt(this.here!.at);
    if (!item) return false;
    this.edit(setItemDone(item.item, !item.item.done));
    return true;
  }
  /** Whether the caret is on the first (up) or last (down) line of its words, where Up/Down leave the line; inside long words they walk its lines. */
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
  moveItemBy(c: Card, k: number, by: -1 | 1) {
    const made = moveItem(c, k, by);
    if (!made) return;
    const offset = this.caretIn(c.items[k].at);
    this.edit(made.ops);
    void this.focusText(made.at, offset);
  }
  moveStageBy(i: number, by: -1 | 1) {
    const ops = moveStage(this.view, i, by);
    if (!ops.length) return;
    const offset = this.caretIn(this.view.stages[i].at);
    this.edit(ops);
    const s = this.view.stages[i + by];
    if (s?.block) void this.focusText(s.at, offset);
  }

  /* ---------- moving ---------- */

  /** Card `c` into stage `to` before its `pos`th card; the caret stays in its words. */
  carry(c: Card, to: Stage, pos: number, focus = true) {
    const moved = moveCard(c, to, pos);
    if (!moved) return;
    const offset = this.cur === c.at ? this.caretIn(c.at) : this.lengthOf(c.at);
    this.edit(moved.ops);
    if (focus) void this.focusText(moved.at, offset);
  }
  /** The chosen cards carried to the end of the stage beside; they stay chosen. */
  carryChosen(by: -1 | 1) {
    const s = this.rows.span();
    if (!s) return;
    const cards = cardsIn(this.view, s.from, s.to);
    const from = stageOf(this.view, cards);
    const to = from && this.view.stages[this.view.stages.indexOf(from) + by];
    const made = to && carryCards(this.view, cards, to);
    if (!made) return;
    const last = cards.length - 1;
    const r = this.rows.range!;
    const flip = r.anchor > r.focus;
    this.edit(made.ops);
    const moved = this.view.stages.flatMap((x) => x.cards).filter((c) => c.at >= made.at).slice(0, last + 1);
    const a = moved[0].at;
    const b = moved[last].at;
    void this.updateComplete.then(() => this.rows.select(flip ? { anchor: b, focus: a } : { anchor: a, focus: b }));
  }

  /* ---------- cards chosen whole (kit/rows.ts) ---------- */

  /** The cards on screen as the rows controller takes them: each with its element and its checklist's blocks. */
  private rowItems(): RowItem<number>[] {
    const host = this;
    return this.view.stages.flatMap((s) =>
      s.cards.map((c) => ({
        id: c.at,
        span: { from: c.at, to: c.end },
        get el() {
          return host.querySelector<HTMLElement>(`.board-card[data-at="${c.at}"]`)!;
        },
      })),
    );
  }
  /** The chosen cards taken away; the caret into the line before the first of them (the card before, or the stage's name). */
  private removeSpan(s: RowSpan) {
    const cards = cardsIn(this.view, s.from, s.to);
    if (!cards.length) return;
    const stage = this.stageAt(cards[0].at)!;
    const lines = this.stageLines(stage);
    const before = [...lines].reverse().find((at) => at < cards[0].at);
    const after = stage.cards.find((c) => c.at >= s.to && !cards.includes(c));
    this.edit(removeCards(cards));
    if (before !== undefined) void this.focusText(before, 'end');
    else if (after) void this.focusText(after.at - cards.filter((c) => c.at < after.at).reduce((n, c) => n + c.end - c.at, 0), 'end');
  }
  private moveSpan(s: RowSpan, by: 1 | -1): RowRange<number> | null {
    const r = this.rows.range;
    const made = moveCards(this.view, cardsIn(this.view, s.from, s.to), by);
    if (!made || !r) return r;
    this.edit(made.ops);
    return { anchor: r.anchor - s.from + made.at, focus: r.focus - s.from + made.at };
  }
  /** The chosen cards again, right after them; the copies are chosen when they are one run. */
  private duplicateSpan(s: RowSpan): RowRange<number> | null {
    const r = this.rows.range;
    const cards = cardsIn(this.view, s.from, s.to);
    const made = duplicateCards(this.view, cards);
    if (!made.ops.length) return r;
    this.edit(made.ops);
    if (!r || made.ops.length > 1) return null;
    return { anchor: r.anchor - s.from + made.at, focus: r.focus - s.from + made.at };
  }
  /** What chosen cards put on the clipboard: their blocks (the stages' names left out) as TLO, and as HTML. */
  private clip(s: RowSpan): Clip {
    const blocks = cardsIn(this.view, s.from, s.to).flatMap(blocksOf);
    return { text: write({ head: {}, blocks }), html: docToHtml(blocks) };
  }
  /** The board's own items in the bar under chosen cards (commands.ts): to the stage before and the stage after. */
  private extraItems(_s: RowSpan): ContextEntry[] {
    return drawnIn(CHOSEN, 'context', this);
  }
  /**
   * Pasted data as cards after `after` (the end of the first stage without one); in an empty card without a checklist,
   * in place of it. The caret goes to the end of the last.
   */
  private pasteCards(data: Clip, after: Card | null, replace?: Card) {
    const got = pasteFrom(data, 'doc');
    if (!got) return;
    const blocks = asCards('blocks' in got ? got.blocks : [{ k: 'p', runs: got.runs }]);
    if (!blocks.length) return;
    const stage = after ? this.stageAt(after.at) : this.view.stages[0];
    if (!stage && !after) {
      // No stages yet: the cards are a stage of their own at the top.
      this.edit([{ op: 'splice', at: 0, n: 0, blocks }]);
      return void this.focusText(this.lastLineOf(0, blocks), 'end');
    }
    const at = replace ? replace.at : after ? after.end : (stage!.cards.at(-1)?.end ?? stage!.start + 1);
    this.edit([{ op: 'splice', at, n: replace ? replace.end - replace.at : 0, blocks }]);
    this.rows.release();
    void this.focusText(this.lastLineOf(at, blocks), 'end');
  }
  private lastLineOf(at: number, blocks: Block[]): number {
    return at + blocks.length - 1;
  }
  /**
   * A paste into a line's words (chosen cards are the rows controller's): several lines, or cards copied here, are cards
   * after the card (items after the item, in a checklist); words alone are the line's to paste.
   */
  private onPaste = (e: ClipboardEvent) => {
    const el = e.target as HTMLElement;
    const dt = e.clipboardData;
    if (!dt || this.rows.range || el.closest?.('dialog, [popover], input, textarea, .board-head')) return;
    const tx = el.closest?.('to-text') as ToText | null;
    if (!tx || !this.contains(tx)) return;
    const data = { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') };
    const lines = data.text.split('\n').filter((l) => l.trim()).length;
    if (lastCopied()?.text !== data.text && lines < 2) return;
    const at = Number(tx.dataset.at);
    const card = this.cardAt(at);
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    const item = this.itemAt(at);
    if (item) {
      const got = pasteFrom(data, 'doc');
      const blocks = got ? asItems('blocks' in got ? got.blocks : [{ k: 'p', runs: got.runs }]) : [];
      if (!blocks.length) return;
      const empty = !this.lengthOf(at);
      this.edit([{ op: 'splice', at: empty ? at : at + 1, n: empty ? 1 : 0, blocks }]);
      return void this.focusText((empty ? at : at + 1) + blocks.length - 1, 'end');
    }
    this.pasteCards(data, card, !card.words && !card.items.length ? card : undefined);
  };

  /* ---------- the grip: a drag, or a tap to choose the card ---------- */

  private down = (e: PointerEvent, c: Card) => {
    // The grip's drag is the board's (across stages); the rows controller hears none of it.
    e.stopPropagation();
    if (e.button !== 0 || !e.isPrimary) return;
    this.dragged = false;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: c.at, moved: false, touch: e.pointerType === 'touch' || e.pointerType === 'pen' };
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
    this.lastPoint = { x: e.clientX, y: e.clientY };
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
    if (!p.moved) {
      p.moved = true;
      this.drag = p.at;
      this.menu = null;
      this.rows.release();
    }
    this.aim();
    this.edges();
  };
  /** Where the carried card would land: the stage under the pointer, before the card whose middle is below it. */
  private aim() {
    const { x, y } = this.lastPoint;
    const col = document.elementsFromPoint(x, y).map((el) => el.closest<HTMLElement>('.board-col')).find((el) => el && this.contains(el));
    if (!col) return void (this.over = null);
    const stage = Number(col.dataset.stage);
    const cards = [...col.querySelectorAll<HTMLElement>(':scope .board-card')];
    // In columns, before the card whose middle is below the pointer; in rows (cards across, wrapping), before the
    // first card on a line below the pointer, or on its line and whose middle is right of it.
    const rows = this.view.rows;
    let pos = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return rows ? y < r.top || (y < r.bottom && x < r.left + r.width / 2) : y < r.top + r.height / 2;
    });
    if (pos < 0) pos = cards.length;
    if (!this.over || this.over.stage !== stage || this.over.pos !== pos) this.over = { stage, pos };
  }
  /** Near either side of the board, it scrolls to bring more stages under the pointer. */
  private edges() {
    // In rows the page itself scrolls; only columns scroll sideways in a box of their own.
    if (this.scroller || this.view.rows) return;
    const board = this.querySelector<HTMLElement>('.board');
    if (!board) return;
    const step = () => {
      this.scroller = 0;
      if (this.drag === null || !board.isConnected) return;
      const r = board.getBoundingClientRect();
      const { x } = this.lastPoint;
      const by = x < r.left + 48 ? -14 : x > r.right - 48 ? 14 : 0;
      if (!by) return;
      const before = board.scrollLeft;
      board.scrollLeft += by;
      if (board.scrollLeft !== before) this.aim();
      this.scroller = requestAnimationFrame(step);
    };
    this.scroller = requestAnimationFrame(step);
  }
  private up = (e: PointerEvent) => {
    e.stopPropagation();
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    this.press = null;
    const over = this.over;
    const moved = p.moved;
    this.drag = null;
    this.over = null;
    cancelAnimationFrame(this.scroller);
    this.scroller = 0;
    if (!moved) return;
    this.dragged = true;
    const c = this.cardAt(p.at);
    const to = over && this.view.stages[over.stage];
    if (c && to) this.carry(c, to, over.pos, false);
  };
  private cancel = (e?: Event) => {
    e?.stopPropagation();
    if (this.press?.moved) this.dragged = true;
    this.press = null;
    this.drag = null;
    this.over = null;
    cancelAnimationFrame(this.scroller);
    this.scroller = 0;
  };
  /** A tap (or Enter, Space) on the grip chooses the card; Shift, or on a touch screen a second card's grip, extends the range. */
  private tapGrip = (e: MouseEvent, c: Card) => {
    e.stopPropagation();
    if (this.dragged) return void (this.dragged = false);
    const touch = !!this.press?.touch || (e as PointerEvent).pointerType === 'touch';
    const r = this.rows.range;
    this.rows.choose(c.at, e.shiftKey || (touch && !!r && r.anchor !== c.at));
  };

  /* ---------- the stage menu ---------- */

  private async openMenu(at: number, anchor: HTMLElement) {
    this.menu = at;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.board-menu');
    await menu?.updateComplete;
    menu?.openAt(anchor);
  }
  /* ---------- the bar ---------- */

  /** A new empty card after card `after` (the end of the stage without one). */
  newCard(s: Stage, after?: Card) {
    const made = addCard(s, after);
    this.rows.release();
    this.edit(made.ops);
    void this.focusText(made.at);
  }
  checklist(c: Card) {
    const made = addItem(c);
    this.rows.release();
    this.edit(made.ops);
    void this.focusText(made.at);
  }
  newStage() {
    this.rows.release();
    this.edit(addStage(this.doc, t('New stage')));
    void this.focusText(this.doc.blocks.length - 1, 'all');
  }
  /** What Insert ▾ puts things after: the last chosen card, or the card (and stage) the caret is in. */
  inHand(): { stage: Stage | undefined; card: Card | undefined } {
    const s = this.rows.range ? this.rows.span() : null;
    const chosen = s ? cardsIn(this.view, s.from, s.to).at(-1) : undefined;
    const at = chosen ? chosen.at : this.cur;
    return { stage: this.stageAt(at) ?? this.view.stages[0], card: this.cardAt(at) };
  }
  insertCard() {
    const { stage, card } = this.inHand();
    if (stage) this.newCard(stage, card);
  }
  insertItem() {
    const { card } = this.inHand();
    if (card) this.checklist(card);
  }
  async insertIcon() {
    const x = this.mark;
    const sel = x?.sel;
    const { chooseIcon } = await import('../../kit/icons-picker.ts');
    const name = await chooseIcon();
    if (!name || !x) return;
    if (sel) x.sel = sel;
    x.exec('icon', name);
  }

  /* ---------- drawing ---------- */

  private item(c: Card, k: number, it: Item) {
    const name = it.words || t('empty item');
    return html`<li class="board-item ${it.done ? 'done' : ''}">
      <label class="board-tick"><input type="checkbox" .checked=${it.done} aria-label=${t('Done: {task}', { task: name })} @change=${(e: Event) => this.edit(setItemDone(it, (e.target as HTMLInputElement).checked))} /></label>
      <to-text shape="line" data-at=${it.at} .blocks=${this.one(it.block)} label=${t('Checklist item {n}', { n: k + 1 })} placeholder=${t('To do')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, it.at)} @text-select=${this.onSelect} @text-enter=${(e: Event) => (e.stopPropagation(), this.onItemEnter(c, k))} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(it.at, e.detail.dir))} @text-selectall=${this.onSelectAll} @focusin=${(e: Event) => this.at(it.at, e)}></to-text>
    </li>`;
  }
  private onSelectAll = (e: Event) => {
    e.stopPropagation();
    this.rows.selectAll();
  };
  private card(s: Stage, c: Card, j: number) {
    const web = c.words.trim() && !/\s/.test(c.words.trim()) && embedOf(c.words.trim()) ? c.words.trim() : '';
    const dragging = this.drag === c.at;
    const before = this.over?.stage === this.view.stages.indexOf(s) && this.over.pos === j && this.drag !== null;
    const ranged = this.rows.has(c.at);
    return html`<li class="board-card ${dragging ? 'dragging' : ''} ${before ? 'before' : ''} ${ranged ? 'ranged' : ''}" data-at=${c.at}>
      <div class="board-main">
        <to-text shape="line" data-at=${c.at} .blocks=${this.one(c.block)} label=${t('Card')} placeholder=${t('Card')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, c.at)} @text-select=${this.onSelect} @text-enter=${(e: Event) => (e.stopPropagation(), this.onCardEnter(s, c))} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(c.at, e.detail.dir))} @text-selectall=${this.onSelectAll} @focusin=${(e: Event) => this.at(c.at, e)}></to-text>
        <button type="button" class="to-btn to-tool board-grip to-rows-handle" aria-pressed=${String(ranged)} aria-label=${t('Choose this card: drag it to move it')} title=${t('Drag to move; tap to choose')} @pointerdown=${(e: PointerEvent) => this.down(e, c)} @pointermove=${this.move} @pointerup=${this.up} @pointercancel=${this.cancel} @click=${(e: MouseEvent) => this.tapGrip(e, c)}>${icon(GripVertical, 18)}</button>
      </div>
      ${web ? html`<to-embed class="board-web" url=${web}></to-embed>` : nothing}
      ${c.items.length
        ? html`<ul class="board-items" aria-label=${t('Checklist')}>${c.items.map((it, k) => this.item(c, k, it))}</ul>
            <span class="board-progress" aria-label=${t('{done} of {n} done', { done: c.items.filter((i) => i.done).length, n: c.items.length })}>☑ ${progress(c)}</span>`
        : nothing}
    </li>`;
  }
  private stage(s: Stage, i: number) {
    const over = s.limit > 0 && s.cards.length > s.limit;
    const count = s.limit ? `${s.cards.length} / ${s.limit}` : String(s.cards.length);
    const end = this.drag !== null && this.over?.stage === i && this.over.pos >= s.cards.length;
    return html`<section class="board-col ${over ? 'full' : ''} ${this.drag !== null && this.over?.stage === i ? 'over' : ''}" data-stage=${i} data-hue=${s.hue} style=${`--c:${STAGE_COLORS[s.hue].hex}`} aria-label=${s.name || t('Stage')}>
      <header class="board-head" @focusin=${(e: Event) => this.at(s.at, e)}>
        ${s.block
          ? html`<to-text shape="line" data-at=${s.at} .blocks=${this.one(s.block)} label=${t('Stage name')} placeholder=${t('Stage name')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, s.at)} @text-select=${this.onSelect} @text-enter=${(e: Event) => (e.stopPropagation(), this.onStageEnter(s))} @text-exit=${(e: Event) => e.stopPropagation()} @text-selectall=${this.onSelectAll}></to-text>`
          : html`<h2 class="board-static">${s.name}</h2>`}
        <span class="board-count" aria-label=${over ? t('{n} cards, over the limit of {limit}', { n: s.cards.length, limit: s.limit }) : s.limit ? t('{n} cards, limit {limit}', { n: s.cards.length, limit: s.limit }) : t('{n|one card|# cards}', { n: s.cards.length })}>${count}</span>
        <button type="button" class="to-btn to-tool board-more" aria-haspopup="menu" aria-label=${t('Stage options: {stage}', { stage: s.name || t('Stage') })} title=${t('Stage options')} @click=${(e: Event) => void this.openMenu(s.at, e.currentTarget as HTMLElement)}>${icon(Ellipsis, 18)}</button>
      </header>
      <ul class="board-cards ${end ? 'end' : ''}">${s.cards.map((c, j) => this.card(s, c, j))}</ul>
      ${s.cards.length ? nothing : html`<p class="board-none to-hint">${t('No cards.')}</p>`}
    </section>`;
  }
  render() {
    const x = this.mark?.isConnected ? this.mark : null;
    const v = this.view;
    const own = (id: string) => COMMANDS.find((c) => c.id === `board.${id}`)!;
    return html`<to-bar class="board-bar">
        <to-insert .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
        ${[BOLD, ITALIC, UNDERLINE, STRIKE, HIGHLIGHT, LINK].map((c) => cmdTool(c, x))}
        ${cmdTool(own('icon'), this)} ${cmdTool(own('rows'), this)}
        <span class="to-hint board-total">${t('{n|one card|# cards}', { n: v.cards })}</span>
        ${this.undoTools()}
      </to-bar>
      ${v.stages.length ? html`<div class="board ${v.rows ? 'rows' : ''}" role="group" tabindex="-1" aria-label=${t('Board')}>${v.stages.map((s, i) => this.stage(s, i))}</div>` : html`<p class="to-hint board-none">${t('No stages. Insert a stage.')}</p>`}
      ${this.rows.renderContext()}
      <to-menu class="board-menu" .label=${t('Stage')} .items=${this.menu === null ? [] : drawnIn(COMMANDS, 'menu:stage', this)}></to-menu>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToBoardEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-board-editor': ToBoardEditor;
  }
}
