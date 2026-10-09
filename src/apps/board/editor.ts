/**
 * <to-board-editor>: the Board app. The stages are columns side by side (one and a bit at a time on a
 * phone, scrolling sideways), each with its name, how many cards it holds against its limit, and a menu.
 * A card is a line of rich text (a one-line <to-text>) with, if it has one, a checklist under it. Pick a
 * card up by its grip and drop it in any stage (the grip is a button too: a tap opens the card's menu, with
 * "Move to" for each stage); Alt+arrows move the card from the keys. Enter in a card starts the next card,
 * Enter in a checklist item the next item. Every change is operations on the document's headings and list
 * items (model.ts); the one bar holds Insert ▾, the marks for the words being typed, undo and redo.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { Columns3, Ellipsis, GripVertical, ListChecks } from 'lucide';
import { runLength, type Block, type Doc } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { embedOf } from '../../kit/embeds.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { caret } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { LIMITS, STAGE_COLORS, addCard, addItem, addStage, moveCard, moveStage, progress, readBoard, removeCard, removeItem, removeStage, setItemDone, setStage, shifted, type BoardView, type Card, type Item, type Stage } from './model.ts';
import '../../kit/bar.ts';
import '../../kit/embeds.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-board-editor';

/** Where a dragged card would land: before the `pos`th card of stage `stage`. */
interface Over {
  stage: number;
  pos: number;
}
/** What a menu is open for: a card or a stage, by block index. */
interface Menu {
  kind: 'card' | 'stage';
  at: number;
}

export class ToBoardEditor extends DocElement<BoardView> {
  static properties: PropertyDeclarations = { menu: { state: true }, drag: { state: true }, over: { state: true }, mark: { state: true } };
  declare menu: Menu | null;
  /** The card being carried: its block index. */
  declare drag: number | null;
  declare over: Over | null;
  /** The words last typed in, whose marks the bar shows; a change of it redraws the bar. */
  declare mark: ToText | null;
  /** The block the caret was last in (a stage's heading, a card, a checklist item): where Insert puts things. */
  private cur = -1;
  /** A block's one-item array, kept so <to-text> sees the same `blocks` until the block itself changes. */
  private ones = new WeakMap<Block, Block[]>();
  private press: { id: number; x: number; y: number; at: number; moved: boolean } | null = null;
  private lastPoint = { x: 0, y: 0 };
  private scroller = 0;
  /** A drag just ended on the grip: the click that follows it is not a tap. */
  private dragged = false;

  constructor() {
    super();
    this.menu = null;
    this.drag = null;
    this.over = null;
    this.mark = null;
  }

  protected read(doc: Doc): BoardView {
    return readBoard(doc);
  }
  private one(b: Block): Block[] {
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }

  /* ---------- finding things ---------- */

  private stageAt(at: number): Stage | undefined {
    return this.view.stages.find((s) => at >= s.start && at < s.end);
  }
  private cardAt(at: number): Card | undefined {
    return this.view.stages.flatMap((s) => s.cards).find((c) => at >= c.at && at < c.end);
  }
  private textAt(at: number): ToText | null {
    return this.querySelector<ToText>(`to-text[data-at="${at}"]`);
  }
  /** Focus the words of the block at `at`, once it is drawn; `end` puts the caret after them, `all` selects them. */
  private async focusText(at: number, how: 'start' | 'end' | 'all' = 'start') {
    await this.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));
    const x = this.textAt(at);
    const b = this.doc.blocks[at];
    if (!x) return;
    const n = b && 'runs' in b ? runLength(b.runs) : 0;
    x.sel = how === 'all' ? { anchor: { block: 0, offset: 0 }, focus: { block: 0, offset: n } } : caret(0, how === 'end' ? n : 0);
    x.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    else this.requestUpdate();
  };
  /**
   * Backspace at the very start of a line (the line-shaped editor says so). A line is its own item here, so an
   * empty card or checklist item goes (the caret to the line above) and one with words stays.
   */
  private onExit(at: number) {
    const b = this.doc.blocks[at];
    const card = this.cardAt(at);
    if (b?.k !== 'li' || runLength(b.runs) || !card) return;
    if (card.at === at) {
      // An empty card with a checklist keeps it; one without goes, and the caret to the card above (or the heading).
      if (card.items.length) return;
      const stage = this.stageAt(at)!;
      const before = stage.cards[stage.cards.indexOf(card) - 1];
      this.edit(removeCard(card));
      void this.focusText(before ? before.at : stage.at, 'end');
    } else {
      const item = card.items.find((i) => i.at === at)!;
      const prev = card.items[card.items.indexOf(item) - 1];
      this.edit(removeItem(item));
      void this.focusText(prev ? prev.at : card.at, 'end');
    }
  }
  /** Enter in a card: the next card, below this one's checklist. */
  private onCardEnter(s: Stage, c: Card) {
    // An empty card at the end is enough.
    if (!c.words && !c.items.length && s.cards.at(-1) === c) return;
    const made = addCard(s, c);
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
    const made = addItem(c, k);
    this.edit(made.ops);
    void this.focusText(made.at);
  }

  /* ---------- moving ---------- */

  /** Card `c` into stage `to` before its `pos`th card; the caret stays in its words. */
  private carry(c: Card, to: Stage, pos: number, focus = true) {
    const moved = moveCard(c, to, pos);
    if (!moved) return;
    this.edit(moved.ops);
    if (focus) void this.focusText(moved.at, 'end');
  }
  /** Alt+arrows: left and right carry the card to the end of the stage beside, up and down along its own. */
  private onCardKey(e: KeyboardEvent, s: Stage, c: Card) {
    if (!e.altKey || !e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const i = this.view.stages.indexOf(s);
    const j = s.cards.indexOf(c);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const to = this.view.stages[i + (e.key === 'ArrowLeft' ? -1 : 1)];
      if (to) this.carry(c, to, to.cards.length);
    } else if (e.key === 'ArrowUp' && j > 0) this.carry(c, s, j - 1);
    else if (e.key === 'ArrowDown' && j < s.cards.length - 1) this.carry(c, s, j + 2);
  }

  /* ---------- the grip: a drag, or a tap for the menu ---------- */

  private down = (e: PointerEvent, c: Card) => {
    if (e.button !== 0 || !e.isPrimary) return;
    this.dragged = false;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, at: c.at, moved: false };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // A pointer that is not really down (a test's) cannot be captured; the grip hears it as long as it is over it.
    }
  };
  private move = (e: PointerEvent) => {
    const p = this.press;
    if (!p || e.pointerId !== p.id) return;
    this.lastPoint = { x: e.clientX, y: e.clientY };
    if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
    if (!p.moved) {
      p.moved = true;
      this.drag = p.at;
      this.menu = null;
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
    let pos = cards.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return y < r.top + r.height / 2;
    });
    if (pos < 0) pos = cards.length;
    if (!this.over || this.over.stage !== stage || this.over.pos !== pos) this.over = { stage, pos };
  }
  /** Near either side of the board, it scrolls to bring more stages under the pointer. */
  private edges() {
    if (this.scroller) return;
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
  private cancel = () => {
    this.press = null;
    this.drag = null;
    this.over = null;
  };
  private tapGrip = (e: Event, c: Card) => {
    if (this.dragged) return void (this.dragged = false);
    void this.openMenu({ kind: 'card', at: c.at }, e.currentTarget as HTMLElement);
  };

  /* ---------- the menus ---------- */

  private async openMenu(m: Menu, anchor: HTMLElement) {
    this.menu = m;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.board-menu');
    await menu?.updateComplete;
    menu?.openAt(anchor);
  }
  private menuItems(): MenuItem[] {
    const m = this.menu;
    if (!m) return [];
    const v = this.view;
    if (m.kind === 'card') {
      const c = this.cardAt(m.at);
      const here = c && this.stageAt(c.at);
      if (!c || !here) return [];
      const group = t('Move to');
      return [
        ...v.stages.filter((s) => s !== here).map((s) => ({ label: s.name || t('Stage'), group, does: () => this.carry(c, s, s.cards.length) })),
        { label: c.items.length ? t('Another checklist item') : t('A checklist'), icon: UI.plus, group: t('Card'), does: () => this.checklist(c) },
        { label: t('Delete card'), icon: UI.trash, group: t('Card'), does: () => this.edit(removeCard(c)) },
      ];
    }
    const i = v.stages.findIndex((s) => s.at === m.at || (m.at < 0 && s.at < 0));
    const s = v.stages[i];
    if (!s) return [];
    const limit = t('Limit');
    const colour = t('Colour');
    return [
      { label: t('Add a card'), icon: UI.plus, does: () => this.newCard(s) },
      { label: t('Move left'), icon: UI.outdent, disabled: i === 0, does: () => this.edit(moveStage(v, i, -1)) },
      { label: t('Move right'), icon: UI.indent, disabled: i === v.stages.length - 1, does: () => this.edit(moveStage(v, i, 1)) },
      ...LIMITS.map((n) => ({ label: n ? String(n) : t('No limit'), group: limit, checked: s.limit === n, does: () => this.edit(setStage(s, { limit: n })) })),
      { label: t('No colour'), group: colour, checked: !s.color, does: () => this.edit(setStage(s, { color: '' })) },
      ...Object.entries(STAGE_COLORS).map(([k, c]) => ({ label: c.name(), swatch: c.hex, group: colour, checked: s.color === k, does: () => this.edit(setStage(s, { color: k })) })),
      { label: t('Delete stage'), icon: UI.trash, group: t('Stage'), does: () => this.edit(removeStage(s)) },
    ];
  }

  /* ---------- the bar ---------- */

  private newCard(s: Stage) {
    const made = addCard(s);
    this.edit(made.ops);
    void this.focusText(made.at);
  }
  private checklist(c: Card) {
    const made = addItem(c);
    this.edit(made.ops);
    void this.focusText(made.at);
  }
  private newStage() {
    this.edit(addStage(this.doc, t('New stage')));
    void this.focusText(this.doc.blocks.length - 1, 'all');
  }
  private inserts(): MenuItem[] {
    const stage = this.stageAt(this.cur) ?? this.view.stages[0];
    const card = this.cardAt(this.cur);
    return [
      { label: t('Card'), icon: UI.plus, disabled: !stage, does: () => stage && this.newCard(stage) },
      { label: t('Checklist item'), icon: ListChecks, disabled: !card, does: () => card && this.checklist(card) },
      { label: t('Stage'), icon: Columns3, does: () => this.newStage() },
    ];
  }
  private async insertIcon() {
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
      <to-text shape="line" data-at=${it.at} .blocks=${this.one(it.block)} label=${t('Checklist item {n}', { n: k + 1 })} placeholder=${t('To do')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, it.at)} @text-select=${this.onSelect} @text-enter=${(e: Event) => (e.stopPropagation(), this.onItemEnter(c, k))} @text-exit=${(e: Event) => (e.stopPropagation(), this.onExit(it.at))} @focusin=${(e: Event) => this.at(it.at, e)}></to-text>
    </li>`;
  }
  private card(s: Stage, c: Card, j: number) {
    const web = c.words.trim() && !/\s/.test(c.words.trim()) && embedOf(c.words.trim()) ? c.words.trim() : '';
    const dragging = this.drag === c.at;
    const before = this.over?.stage === this.view.stages.indexOf(s) && this.over.pos === j && this.drag !== null;
    return html`<li class="board-card ${dragging ? 'dragging' : ''} ${before ? 'before' : ''}" data-at=${c.at}>
      <div class="board-main" @keydown=${(e: KeyboardEvent) => this.onCardKey(e, s, c)}>
        <to-text shape="line" data-at=${c.at} .blocks=${this.one(c.block)} label=${t('Card')} placeholder=${t('Card')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, c.at)} @text-select=${this.onSelect} @text-enter=${(e: Event) => (e.stopPropagation(), this.onCardEnter(s, c))} @text-exit=${(e: Event) => (e.stopPropagation(), this.onExit(c.at))} @focusin=${(e: Event) => this.at(c.at, e)}></to-text>
        <button type="button" class="to-btn to-tool board-grip" aria-haspopup="menu" aria-label=${t('Card options')} title=${t('Drag to move; tap for options')} @pointerdown=${(e: PointerEvent) => this.down(e, c)} @pointermove=${this.move} @pointerup=${this.up} @pointercancel=${this.cancel} @click=${(e: Event) => this.tapGrip(e, c)}>${icon(GripVertical, 18)}</button>
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
    return html`<section class="board-col ${s.color ? 'tinted' : ''} ${over ? 'full' : ''} ${this.drag !== null && this.over?.stage === i ? 'over' : ''}" data-stage=${i} style=${s.color ? `--c:${STAGE_COLORS[s.color].hex}` : nothing} aria-label=${s.name || t('Stage')}>
      <header class="board-head" @focusin=${(e: Event) => this.at(s.at, e)}>
        ${s.block
          ? html`<to-text shape="line" data-at=${s.at} .blocks=${this.one(s.block)} label=${t('Stage name')} placeholder=${t('Stage name')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, s.at)} @text-select=${this.onSelect} @text-enter=${(e: Event) => (e.stopPropagation(), this.onStageEnter(s))} @text-exit=${(e: Event) => e.stopPropagation()}></to-text>`
          : html`<h2 class="board-static">${s.name}</h2>`}
        <span class="board-count" aria-label=${over ? t('{n} cards, over the limit of {limit}', { n: s.cards.length, limit: s.limit }) : s.limit ? t('{n} cards, limit {limit}', { n: s.cards.length, limit: s.limit }) : t('{n|one card|# cards}', { n: s.cards.length })}>${count}</span>
        <button type="button" class="to-btn to-tool board-more" aria-haspopup="menu" aria-label=${t('Stage options: {stage}', { stage: s.name || t('Stage') })} title=${t('Stage options')} @click=${(e: Event) => void this.openMenu({ kind: 'stage', at: s.at }, e.currentTarget as HTMLElement)}>${icon(Ellipsis, 18)}</button>
      </header>
      <ul class="board-cards ${end ? 'end' : ''}">${s.cards.map((c, j) => this.card(s, c, j))}</ul>
      ${s.cards.length ? nothing : html`<p class="board-none to-hint">${t('No cards.')}</p>`}
    </section>`;
  }
  render() {
    const x = this.mark?.isConnected ? this.mark : null;
    const m = x?.marks ?? {};
    const on = (c: 'b' | 'i' | 'u' | 's' | 'h') => !!m[c];
    const v = this.view;
    const words = (cmd: 'b' | 'i' | 'u' | 's' | 'h' | 'link', label: string, ic: typeof UI.bold, keys?: string) => tool({ label, icon: ic, keys, keep: true, disabled: !x, pressed: cmd === 'link' ? !!m.href : on(cmd), does: () => x?.exec(cmd) });
    return html`<to-bar class="board-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        ${words('b', t('Bold'), UI.bold, 'Mod+B')}${words('i', t('Italic'), UI.italic, 'Mod+I')}${words('u', t('Underline'), UI.underline, 'Mod+U')}${words('s', t('Strikethrough'), UI.strike)}${words('h', t('Highlight'), UI.highlight)}${words('link', t('Link'), UI.link, 'Mod+K')}
        ${tool({ label: t('Icon'), icon: UI.icon, keep: true, disabled: !x, does: () => void this.insertIcon() })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
        <span class="to-hint board-total">${t('{n|one card|# cards}', { n: v.cards })}</span>
      </to-bar>
      ${v.stages.length ? html`<div class="board" role="group" aria-label=${t('Board')}>${v.stages.map((s, i) => this.stage(s, i))}</div>` : html`<p class="to-hint board-none">${t('No stages. Insert a stage.')}</p>`}
      <to-menu class="board-menu" .label=${this.menu?.kind === 'stage' ? t('Stage') : t('Card')} .items=${this.menuItems()}></to-menu>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToBoardEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-board-editor': ToBoardEditor;
  }
}
