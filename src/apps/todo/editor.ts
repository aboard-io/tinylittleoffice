/**
 * <to-todo-editor>: the Todo app. A list of tasks, each a row: a grip, a box to tick, the words (a one-line <to-text>,
 * so a task may carry bold, links and icons), a star and a menu. A due date shows under the words once it is set, a
 * native date input; the menu sets it. The words follow docs/editing.md §3: Enter at the start pushes the task down,
 * at the end starts the next, in the middle splits it; Backspace at the start joins the task to the one before (an
 * empty one goes) and Delete at the end joins the next in; Up/Down go from task to task; Alt+Up/Down move it, Mod+D
 * duplicates it, Mod+Enter ticks it. Tasks are rows of the kit's rows.ts (§6): a tap on the grip, Escape or
 * Shift+Up/Down chooses them whole, and the chosen tasks are deleted, moved, duplicated, copied, cut and pasted from
 * the keys or the bar under them; the grip drags a task. A paste of several lines is several tasks. Every change is
 * operations on the document's list items (model.ts), each carrying where the caret or the chosen tasks were, so an
 * undo puts them back; the one bar holds Insert ▾, the filter, clear done, and ends with undo and redo.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { ArrowDown, ArrowUp, CalendarDays, CopyPlus, Ellipsis, GripVertical, ListFilter, Star } from 'lucide';
import { runLength, write, type Block, type Doc, type Op } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { docToHtml, GENERATOR, htmlToBlocks } from '../../kit/clipboard.ts';
import { DocElement, firstAt, type Entry } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { lastCopied, Rows, type Clip, type RowItem, type RowRange } from '../../kit/rows.ts';
import { caret } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { addAfter, asTasks, clearDone, duplicateTasks, enterAt, joinTasks, moveTasks, pastesAsTasks, pasteTasks, readTodo, removeTasks, setDone, setDue, setStar, shifted, textTasks, today, type Task, type TodoView } from './model.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-todo-editor';

type Show = 'all' | 'open' | 'done';
/** Where the selection was when an edit began (the entry's mark): tasks chosen whole, or the caret in a task's words. */
type Mark = { range: RowRange<number> } | { at: number; offset: number };

export class ToTodoEditor extends DocElement<TodoView> {
  static properties: PropertyDeclarations = { show: { state: true }, menuAt: { state: true }, dueAt: { state: true } };
  declare show: Show;
  /** The task whose menu is open: its block. */
  declare menuAt: number;
  /** The task whose date is being set (its input shown though it has none yet): its block. */
  declare dueAt: number;
  /** The task the caret last was in: where Insert puts the next one. */
  private cur = -1;
  /** A block's one-item array, kept so <to-text> sees the same `blocks` until the block itself changes. */
  private ones = new WeakMap<Block, Block[]>();
  /** Tasks chosen whole: the kit's one implementation (keys, the grip, drag, clipboard, the bar under them). */
  readonly rows = new Rows<number>(this, {
    rows: () => this.rowItems(),
    box: () => this.querySelector<HTMLElement>('.todo-list'),
    handle: '.todo-grip',
    label: t('Chosen tasks'),
    contextClass: 'todo-context',
    current: () => (this.shown().some((x) => x.at === this.cur) ? this.cur : null),
    edit: (at, offset) => void this.focusTask(at, offset),
    remove: (_s, ids) => this.deleteTasks(ids),
    canMove: (_s, by) => !!this.neighbour(this.chosenTasks(), by),
    move: (_s, by) => this.moveRange(by),
    duplicate: () => this.duplicateRange(),
    copy: () => this.clip(),
    paste: (data) => this.pasteData(data, this.chosenTasks().map((x) => x.at)),
    drop: (at, to) => this.dropAfter(at, to),
  });

  constructor() {
    super();
    this.show = 'all';
    this.menuAt = -1;
    this.dueAt = -1;
  }
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKey);
    // Capturing: before a task's own editor hears a paste.
    this.addEventListener('paste', this.onPaste, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKey);
    this.removeEventListener('paste', this.onPaste, true);
  }

  protected read(doc: Doc): TodoView {
    return readTodo(doc);
  }
  private one(b: Block): Block[] {
    let a = this.ones.get(b);
    if (!a) this.ones.set(b, (a = [b]));
    return a;
  }
  private taskAt(at: number): Task | undefined {
    return this.view.tasks.find((x) => x.at === at);
  }
  private shown(): Task[] {
    return this.view.tasks.filter((x) => this.show === 'all' || (this.show === 'done') === x.done);
  }

  /* ---------- undo: the caret or the chosen tasks come back ---------- */

  private mark(): Mark | undefined {
    const r = this.rows.range;
    if (r) return { range: { ...r } };
    const x = this.taskAt(this.cur);
    return x ? { at: x.at, offset: this.caretIn(x.at) } : undefined;
  }
  /** Every edit carries where the selection was before it. */
  protected edit(ops: Op[], key?: string, mark?: unknown) {
    super.edit(ops, key, mark ?? this.mark());
  }
  /** After an undo the caret or the chosen tasks come back as they were before the edit; after a redo, the task the change touched first. */
  protected undone(entry: Entry, redo: boolean) {
    this.menuAt = -1;
    this.rows.release();
    const m = entry.mark as Mark | undefined;
    const shown = this.shown();
    const ok = (at: number) => shown.some((x) => x.at === at);
    if (m && !redo && 'range' in m) {
      const r = m.range;
      if (ok(r.anchor) && ok(r.focus)) return void this.updateComplete.then(() => this.rows.select(r));
    } else if (m && !redo && 'at' in m && ok(m.at)) return void this.focusTask(m.at, m.offset);
    const first = firstAt(entry);
    if (first < 0 || !shown.length) return;
    const near = [...shown].reverse().find((x) => x.at <= first) ?? shown[0];
    void this.focusTask(near.at, 'end');
  }

  /* ---------- the words ---------- */

  private onOps = (e: CustomEvent<TextOps>, at: number) => {
    e.stopPropagation();
    const { ops, kind, before } = e.detail;
    const mark: Mark = { at, offset: before ? before.focus.offset : 0 };
    this.edit(shifted(ops, at), kind ? `type:${at}` : undefined, mark);
  };
  /** Where a person starts: the first task's words, the caret at their end. */
  async focusFirst() {
    const first = this.shown()[0];
    if (first) await this.focusTask(first.at, 'end');
  }
  /** The words of the task at block `at`, once it is drawn, with the caret at `offset`. */
  private async focusTask(at: number, offset: number | 'end' = 0) {
    this.cur = at;
    await this.updateComplete;
    const x = this.querySelector<ToText>(`to-text[data-at="${at}"]`);
    if (!x) return;
    const b = this.doc.blocks[at];
    const len = b && 'runs' in b ? runLength(b.runs) : 0;
    x.sel = caret(0, offset === 'end' ? len : Math.min(offset, len));
  }
  /** Where the caret is in a task's words, or their end. */
  private caretIn(at: number): number {
    const s = this.querySelector<ToText>(`to-text[data-at="${at}"]`)?.sel;
    const b = this.doc.blocks[at];
    return s ? s.focus.offset : b && 'runs' in b ? runLength(b.runs) : 0;
  }
  /** A new task after the one at `at` (or after the last, or the first of all). */
  private add(after: number) {
    this.edit(addAfter(after));
    void this.focusTask(after + 1);
  }
  /** Enter: at the start the task is pushed down, at the end a new task, in the middle the words split (model.ts, enterAt). */
  private onEnter = (x: Task) => {
    // An empty task already waiting at the end is enough.
    if (!x.runs.length && this.view.tasks.at(-1) === x) return;
    const r = enterAt(x, this.caretIn(x.at));
    this.edit(r.ops);
    void this.focusTask(r.at, r.offset);
  };
  /**
   * Backspace at the very start of a task, or Delete at its very end (the line-shaped editor says which). An empty task
   * goes (never the only one), the caret to the task above (Delete: below); one with words is joined to the task before
   * (Backspace), or takes the next one in (Delete).
   */
  private onExit = (x: Task, dir: 'back' | 'forward') => {
    const rows = this.shown();
    const i = rows.indexOf(x);
    if (!runLength(x.runs)) {
      if (this.view.tasks.length < 2) return;
      const to = dir === 'forward' ? (rows[i + 1] ?? rows[i - 1]) : (rows[i - 1] ?? rows[i + 1]);
      this.edit(removeTasks([x.at]));
      if (to) void this.focusTask(to.at > x.at ? to.at - 1 : to.at, to.at > x.at ? 0 : 'end');
      return;
    }
    const other = rows[dir === 'back' ? i - 1 : i + 1];
    if (!other) return;
    const r = dir === 'back' ? joinTasks(other, x) : joinTasks(x, other);
    this.edit(r.ops);
    void this.focusTask(r.at, r.offset);
  };
  /** Alt+Up/Down in the words, or the menu's Move up/down: the task past its neighbour as shown, the caret where it was. */
  private moveOne(x: Task, by: -1 | 1) {
    const over = this.neighbour([x], by);
    if (!over) return;
    const offset = this.caretIn(x.at);
    const r = moveTasks([x], over, by);
    this.edit(r.ops);
    void this.focusTask(r.ats[0], offset);
  }
  /** Mod+D in the words, or the menu's Duplicate: the task again after it, the caret in the copy where it was. */
  private duplicateOne(x: Task) {
    const offset = this.caretIn(x.at);
    const d = duplicateTasks([x]);
    this.edit(d.ops);
    void this.focusTask(d.at, offset);
  }
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return;
    const target = e.composedPath()[0] as HTMLElement;
    // Only words being typed in a task: never a bar button, a field, the box, a popover or a dialog.
    if (target.closest?.('[popover], dialog')) return;
    const tx = target.closest?.('to-text') as ToText | null;
    const row = target.closest?.<HTMLElement>('.todo-row');
    if (!tx || !row) return;
    const x = this.taskAt(Number(row.dataset.at));
    if (!x) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const plain = !mod && !e.altKey && !e.shiftKey;
    const rows = this.shown();
    const i = rows.indexOf(x);
    const s = tx.sel;
    const flat = !!s && s.anchor.offset === s.focus.offset;
    if (e.altKey && !mod && !e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) this.moveOne(x, k === 'ArrowUp' ? -1 : 1);
    else if (mod && !e.altKey && !e.shiftKey && k === 'Enter') this.edit(setDone(x, !x.done));
    else if (mod && !e.altKey && !e.shiftKey && k.toLowerCase() === 'd') this.duplicateOne(x);
    else if (plain && (k === 'ArrowUp' || k === 'ArrowDown')) {
      const to = rows[k === 'ArrowUp' ? i - 1 : i + 1];
      if (!to || !this.atEdgeLine(tx, k === 'ArrowUp')) return;
      void this.focusTask(to.at, s ? s.focus.offset : 0);
    } else if (plain && k === 'ArrowLeft' && flat && s.focus.offset === 0 && i > 0) void this.focusTask(rows[i - 1].at, 'end');
    else if (plain && k === 'ArrowRight' && flat && s.focus.offset >= runLength(x.runs) && i >= 0 && i < rows.length - 1) void this.focusTask(rows[i + 1].at, 0);
    else return;
    e.preventDefault();
  };
  /** Whether the caret is on the first (up) or last (down) line of a task's words, where Up/Down leave it; inside a long task they walk its lines. */
  private atEdgeLine(tx: ToText, up: boolean): boolean {
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

  /* ---------- tasks chosen whole (kit/rows.ts) ---------- */

  /** The tasks on screen as the rows controller takes them. */
  private rowItems(): RowItem<number>[] {
    const host = this;
    return this.shown().map((x) => ({
      id: x.at,
      span: { from: x.at, to: x.at + 1 },
      get el() {
        return host.querySelector<HTMLElement>(`.todo-row[data-at="${x.at}"]`)!;
      },
    }));
  }
  /** The chosen tasks, in order (a filter may leave hidden ones between them: those are not chosen). */
  private chosenTasks(): Task[] {
    return this.rows
      .chosen()
      .map((r) => this.taskAt(r.id))
      .filter((x): x is Task => !!x);
  }
  /** The task shown just before the first of these (-1) or after the last (1). */
  private neighbour(ts: Task[], by: -1 | 1): Task | undefined {
    if (!ts.length) return undefined;
    const rows = this.shown();
    return by < 0 ? rows[rows.indexOf(ts[0]) - 1] : rows[rows.indexOf(ts[ts.length - 1]) + 1];
  }
  /** Tasks taken away (block indices); the caret into the task before them (or after, as it is then). */
  private deleteTasks(ats: number[]) {
    if (!ats.length) return;
    const rows = this.shown();
    const set = new Set(ats);
    const first = rows.findIndex((x) => set.has(x.at));
    const before = first > 0 ? rows[first - 1] : undefined;
    const next = rows.find((x, i) => i > first && !set.has(x.at));
    this.edit(removeTasks(ats));
    if (before) void this.focusTask(before.at, 'end');
    else if (next) void this.focusTask(next.at - ats.filter((a) => a < next.at).length, 0);
  }
  private moveRange(by: 1 | -1): RowRange<number> | null {
    const r = this.rows.range;
    const ts = this.chosenTasks();
    const over = this.neighbour(ts, by);
    if (!r || !over) return r;
    const m = moveTasks(ts, over, by);
    this.edit(m.ops);
    const to = (at: number) => m.ats[ts.findIndex((x) => x.at === at)];
    return { anchor: to(r.anchor), focus: to(r.focus) };
  }
  /** The chosen tasks again, right after them; the copies are chosen. */
  private duplicateRange(): RowRange<number> | null {
    const r = this.rows.range;
    const ts = this.chosenTasks();
    if (!r || !ts.length) return r;
    const d = duplicateTasks(ts);
    this.edit(d.ops);
    const to = (at: number) => d.at + ts.findIndex((x) => x.at === at);
    return { anchor: to(r.anchor), focus: to(r.focus) };
  }
  /** A task carried by its grip, put after another; the caret follows it. */
  private dropAfter(at: number, to: number) {
    if (at === to || !this.taskAt(at) || !this.taskAt(to)) return;
    const land = at < to ? to : to + 1;
    this.edit([{ op: 'move', at, n: 1, to: land }]);
    void this.focusTask(land, 'end');
  }

  /* ---------- the clipboard ---------- */

  /** What chosen tasks put on the clipboard: their items as TLO, and as our HTML. */
  private clip(): Clip {
    const blocks = this.chosenTasks().map((x) => x.block);
    return { text: write({ head: {}, blocks }), html: docToHtml(blocks) };
  }
  /** A paste into a task's words (chosen tasks are the rows controller's): several lines, or tasks copied here, are tasks after it; words alone are its own. */
  private onPaste = (e: ClipboardEvent) => {
    const el = e.target as HTMLElement;
    const dt = e.clipboardData;
    if (!dt || this.rows.range || !el.closest?.('to-text') || el.closest('dialog, [popover]')) return;
    const row = el.closest<HTMLElement>('.todo-row');
    if (!row) return;
    const data = { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') };
    const ours = data.html.includes(`content="${GENERATOR}"`);
    const oneLine = !data.text.trim().includes('\n');
    if (!(lastCopied()?.text === data.text || (pastesAsTasks(data.text) && !(ours && oneLine)))) return;
    e.preventDefault();
    e.stopPropagation();
    this.pasteData(data, Number(row.dataset.at));
  };
  /** Pasted data put in as tasks: ours (or plain text) read as TLO, HTML from elsewhere as blocks; the caret at the end of the last. */
  private pasteData(data: Clip, target: number[] | number | null) {
    const ours = data.html.includes(`content="${GENERATOR}"`);
    const fromHtml = !ours && data.html.trim() ? asTasks(htmlToBlocks(data.html)) : [];
    const r = pasteTasks(this.view, this.doc, fromHtml.length ? fromHtml : textTasks(data.text), target);
    if (!r) return;
    this.edit(r.ops);
    this.rows.release();
    void this.focusTask(r.to - 1, 'end');
  }

  /* ---------- the due date and the row's menu ---------- */

  private async openMenu(x: Task, button: HTMLElement) {
    this.menuAt = x.at;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.todo-rowmenu');
    await menu?.updateComplete;
    menu?.openAt(button);
  }
  private menuItems(): MenuItem[] {
    const x = this.taskAt(this.menuAt);
    if (!x) return [];
    const rows = this.shown();
    const i = rows.indexOf(x);
    return [
      {
        label: x.due ? t('Change the due date…') : t('Due date…'),
        icon: CalendarDays,
        does: () => {
          this.dueAt = x.at;
          void this.updateComplete.then(() => {
            const input = this.querySelector<HTMLInputElement>(`.todo-row[data-at="${x.at}"] input[type=date]`);
            input?.focus();
            try {
              input?.showPicker();
            } catch {
              // No picker to show here: the focused input is typed into.
            }
          });
        },
      },
      ...(x.due ? [{ label: t('No due date'), icon: UI.close, does: () => this.edit(setDue(x, '')) }] : []),
      { label: t('Move up'), icon: ArrowUp, disabled: i <= 0, does: () => this.moveOne(x, -1) },
      { label: t('Move down'), icon: ArrowDown, disabled: i < 0 || i >= rows.length - 1, does: () => this.moveOne(x, 1) },
      { label: t('Duplicate'), icon: CopyPlus, does: () => this.duplicateOne(x) },
      { label: t('Delete task'), icon: UI.trash, does: () => this.deleteTasks([x.at]) },
    ];
  }

  /* ---------- the bar ---------- */

  private inserts(): MenuItem[] {
    return [{ label: t('Task'), icon: UI.plus, does: () => this.add(this.taskAt(this.cur)?.at ?? this.view.tasks.at(-1)?.at ?? -1) }];
  }
  private showItems(): MenuItem[] {
    const pick = (show: Show, label: string): MenuItem => ({
      label,
      checked: this.show === show,
      does: () => {
        this.rows.release();
        this.show = show;
      },
    });
    return [pick('all', t('All')), pick('open', t('Open')), pick('done', t('Done'))];
  }

  /* ---------- drawing ---------- */

  private row(x: Task, now: string) {
    const late = !!x.due && !x.done && x.due < now;
    const name = x.words || t('empty task');
    const ranged = this.rows.has(x.at);
    return html`<li class="todo-row ${x.done ? 'done' : ''} ${late ? 'late' : ''} ${ranged ? 'ranged' : ''} ${this.rows.drag?.id === x.at ? 'dragging' : ''}" data-at=${x.at} @focusin=${() => (this.cur = x.at)}>
      <button type="button" class="todo-grip to-rows-handle" tabindex="-1" aria-pressed=${String(ranged)} aria-label=${t('Move this task: drag it onto another')} title=${t('Drag to move')}>${icon(GripVertical, 16)}</button>
      <label class="todo-tick"><input type="checkbox" .checked=${x.done} aria-label=${t('Done: {task}', { task: name })} @change=${(e: Event) => this.edit(setDone(x, (e.target as HTMLInputElement).checked))} /></label>
      <div class="todo-body">
        <to-text
          shape="line"
          data-at=${x.at}
          .blocks=${this.one(x.block)}
          label=${t('Task')}
          placeholder=${t('Task')}
          @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, x.at)}
          @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(x))}
          @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => (e.stopPropagation(), this.onExit(x, e.detail.dir))}
          @text-selectall=${(e: Event) => (e.stopPropagation(), this.rows.selectAll())}
        ></to-text>
        ${x.due || this.dueAt === x.at
          ? html`<input class="todo-due" type="date" .value=${x.due} aria-label=${t('Due date of {task}', { task: name })} @change=${(e: Event) => {
              this.dueAt = -1;
              this.edit(setDue(x, (e.target as HTMLInputElement).value));
            }} @blur=${() => this.dueAt === x.at && (this.dueAt = -1)} />`
          : nothing}
      </div>
      <button type="button" class="to-btn to-tool todo-star" aria-pressed=${String(x.star)} aria-label=${t('Star')} title=${t('Star')} @mousedown=${(e: Event) => e.preventDefault()} @click=${() => this.edit(setStar(x, !x.star))}>${icon(Star, 18)}</button>
      <button type="button" class="to-btn to-tool todo-more" aria-haspopup="menu" aria-label=${t('Task options')} title=${t('Task options')} @click=${(e: Event) => void this.openMenu(x, e.currentTarget as HTMLElement)}>${icon(Ellipsis, 18)}</button>
    </li>`;
  }
  render() {
    const v = this.view;
    const rows = this.shown();
    const now = today();
    return html`<to-bar class="todo-bar">
        <to-insert .items=${this.inserts()}></to-insert>
        <to-menu class="todo-show" icon-only .label=${t('Show')} .icon=${ListFilter} .items=${this.showItems()}></to-menu>
        ${tool({ label: t('Clear done'), icon: UI.trash, disabled: !v.ticked, does: () => this.edit(clearDone(v)) })}
        <span class="to-hint todo-count">${t('{done} of {n} done', { done: v.ticked, n: v.tasks.length })}</span>
        ${this.undoTools()}
      </to-bar>
      ${rows.length ? html`<ul class="todo-list" tabindex="-1" aria-label=${t('Tasks')}>${rows.map((x) => this.row(x, now))}</ul>` : html`<p class="to-hint todo-empty">${v.tasks.length ? t('Nothing here.') : t('Nothing to do yet. Insert a task.')}</p>`}
      <to-menu class="todo-rowmenu" .label=${t('Task')} .items=${this.menuItems()}></to-menu>
      ${this.rows.renderContext()}`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToTodoEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-todo-editor': ToTodoEditor;
  }
}
