/**
 * <to-todo-editor>: the Todo app. A list of tasks, each a row: a box to tick, the words (a one-line
 * <to-text>, so a task may carry bold, links and icons), a star and a menu. A due date shows under the words
 * once it is set, a native date input; the menu sets it. Enter in a task starts the next, Backspace in an
 * empty one takes it away, Alt+Up/Down move it, Mod+Enter ticks it. Every change is operations on the
 * document's list items (model.ts); the one bar holds Insert ▾, the filter, clear done, undo and redo.
 */
import { html, nothing, type PropertyDeclarations } from 'lit';
import { ArrowDown, ArrowUp, CalendarDays, Ellipsis, ListFilter, Star } from 'lucide';
import { runLength, type Block, type Doc } from '../../doc/index.ts';
import { tool } from '../../kit/bar.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import type { MenuItem, ToMenu } from '../../kit/menu.ts';
import { caret } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import { addAfter, clearDone, moveOver, readTodo, removeTask, setDone, setDue, setStar, shifted, today, type Task, type TodoView } from './model.ts';
import '../../kit/bar.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-todo-editor';

type Show = 'all' | 'open' | 'done';

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

  constructor() {
    super();
    this.show = 'all';
    this.menuAt = -1;
    this.dueAt = -1;
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

  /* ---------- editing ---------- */

  private onOps = (e: CustomEvent<TextOps>, at: number) => {
    e.stopPropagation();
    const { ops, kind } = e.detail;
    this.edit(shifted(ops, at), kind ? `type:${at}` : undefined);
  };
  /** Focus the words of the task at block `at`, once it is drawn. */
  private async focusTask(at: number, end = false) {
    await this.updateComplete;
    const x = this.querySelector<ToText>(`to-text[data-at="${at}"]`);
    if (!x) return;
    const b = this.doc.blocks[at];
    x.sel = caret(0, end && b && 'runs' in b ? runLength(b.runs) : 0);
  }
  /** A new task after the one at `at` (or after the last, or the first of all). */
  private add(after: number) {
    this.edit(addAfter(after), undefined);
    void this.focusTask(after + 1);
  }
  private onEnter = (x: Task) => {
    // An empty task already waiting at the end is enough.
    if (!x.words && this.view.tasks.at(-1) === x) return;
    this.add(x.at);
  };
  /** Backspace at the very start of a task (the line-shaped editor says so): an empty task goes, the caret to the one above; one with words stays. */
  private removeEmpty = (x: Task) => {
    if (x.words || this.view.tasks.length < 2) return;
    const i = this.view.tasks.indexOf(x);
    const before = this.view.tasks[i - 1] ?? this.view.tasks[i + 1];
    this.edit(removeTask(x));
    void this.focusTask(before.at > x.at ? before.at - 1 : before.at, true);
  };
  private move(x: Task, by: -1 | 1) {
    const rows = this.shown();
    const over = rows[rows.indexOf(x) + by];
    if (!over) return;
    this.edit(moveOver(x, over));
    void this.focusTask(over.at, true);
  }
  private onRowKey = (e: KeyboardEvent, x: Task) => {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.move(x, e.key === 'ArrowUp' ? -1 : 1);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      this.edit(setDone(x, !x.done));
    }
  };

  /* ---------- the due date and the row's menu ---------- */

  private async openMenu(x: Task, button: HTMLElement) {
    this.menuAt = x.at;
    await this.updateComplete;
    const menu = this.querySelector<ToMenu>('to-menu.todo-rowmenu');
    await menu?.updateComplete;
    menu?.openAt(button);
  }
  private rowItems(): MenuItem[] {
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
      { label: t('Move up'), icon: ArrowUp, disabled: i <= 0, does: () => this.move(x, -1) },
      { label: t('Move down'), icon: ArrowDown, disabled: i < 0 || i >= rows.length - 1, does: () => this.move(x, 1) },
      { label: t('Delete task'), icon: UI.trash, does: () => this.edit(removeTask(x)) },
    ];
  }

  /* ---------- the bar ---------- */

  private inserts(): MenuItem[] {
    return [{ label: t('Task'), icon: UI.plus, does: () => this.add(this.taskAt(this.cur)?.at ?? this.view.tasks.at(-1)?.at ?? -1) }];
  }
  private showItems(): MenuItem[] {
    const pick = (show: Show, label: string): MenuItem => ({ label, checked: this.show === show, does: () => (this.show = show) });
    return [pick('all', t('All')), pick('open', t('Open')), pick('done', t('Done'))];
  }

  /* ---------- drawing ---------- */

  private row(x: Task, now: string) {
    const late = !!x.due && !x.done && x.due < now;
    const name = x.words || t('empty task');
    return html`<li class="todo-row ${x.done ? 'done' : ''} ${late ? 'late' : ''}" data-at=${x.at} @focusin=${() => (this.cur = x.at)} @keydown=${(e: KeyboardEvent) => this.onRowKey(e, x)}>
      <label class="todo-tick"><input type="checkbox" .checked=${x.done} aria-label=${t('Done: {task}', { task: name })} @change=${(e: Event) => this.edit(setDone(x, (e.target as HTMLInputElement).checked))} /></label>
      <div class="todo-body">
        <to-text shape="line" data-at=${x.at} .blocks=${this.one(x.block)} label=${t('Task')} placeholder=${t('Task')} @text-ops=${(e: CustomEvent<TextOps>) => this.onOps(e, x.at)} @text-enter=${(e: Event) => (e.stopPropagation(), this.onEnter(x))} @text-exit=${(e: Event) => (e.stopPropagation(), this.removeEmpty(x))}></to-text>
        ${x.due || this.dueAt === x.at
          ? html`<input class="todo-due" type="date" .value=${x.due} aria-label=${t('Due date of {task}', { task: name })} @change=${(e: Event) => {
              this.dueAt = -1;
              this.edit(setDue(x, (e.target as HTMLInputElement).value));
            }} @blur=${() => this.dueAt === x.at && (this.dueAt = -1)} />`
          : nothing}
      </div>
      <button type="button" class="to-btn to-tool todo-star" aria-pressed=${String(x.star)} aria-label=${t('Star')} title=${t('Star')} @click=${() => this.edit(setStar(x, !x.star))}>${icon(Star, 18)}</button>
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
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
        <span class="to-hint todo-count">${t('{done} of {n} done', { done: v.ticked, n: v.tasks.length })}</span>
      </to-bar>
      ${rows.length ? html`<ul class="todo-list" aria-label=${t('Tasks')}>${rows.map((x) => this.row(x, now))}</ul>` : html`<p class="to-hint todo-empty">${v.tasks.length ? t('Nothing here.') : t('Nothing to do yet. Insert a task.')}</p>`}
      <to-menu class="todo-rowmenu" .label=${t('Task')} .items=${this.rowItems()}></to-menu>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToTodoEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-todo-editor': ToTodoEditor;
  }
}
