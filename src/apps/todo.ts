/**
 * <to-todo>: a list of tasks to tick off, with stars and due dates.
 * Document format: see lib/todomodel.ts.
 */
import { LitElement, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, UI } from '../lib/icons.ts';
import { parseTodos, serializeTodos, type Task } from '../lib/todomodel.ts';
import { EPOCH_DAY } from '../lib/calmodel.ts';
import { dayToYmd, ymdString, ymdToDay } from '../lib/tz.ts';
import type { SlInput, SlSelect } from '../lib/shoelace.ts';

type Filter = 'all' | 'open' | 'done';

const dayToInput = (day: number | null) => {
  if (day === null) return '';
  const { y, m, d } = dayToYmd(EPOCH_DAY + day);
  return ymdString(y, m, d);
};
const inputToDay = (v: string): number | null => {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v);
  return m ? ymdToDay(+m[1], +m[2], +m[3]) - EPOCH_DAY : null;
};
const today = () => {
  const n = new Date();
  return ymdToDay(n.getFullYear(), n.getMonth() + 1, n.getDate()) - EPOCH_DAY;
};

@customElement('to-todo')
export class ToTodo extends LitElement {
  @property() value = '';
  @state() private tasks: Task[] = [];
  @state() private filter: Filter = 'all';
  @state() private draft = '';
  private lastEmitted = '';

  createRenderRoot() {
    return this;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && this.value !== this.lastEmitted) {
      this.tasks = parseTodos(this.value);
      this.lastEmitted = this.value;
    }
  }

  private commit(tasks: Task[]) {
    this.tasks = tasks;
    this.lastEmitted = serializeTodos(tasks);
    this.dispatchEvent(new CustomEvent('docchange', { detail: this.lastEmitted, bubbles: true, composed: true }));
  }

  private patch(i: number, p: Partial<Task>) {
    this.commit(this.tasks.map((t, j) => (j === i ? { ...t, ...p } : t)));
  }

  private add() {
    const text = this.draft.trim();
    if (!text) return;
    this.commit([...this.tasks, { text, done: false, star: false, due: null }]);
    this.draft = '';
  }

  private move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= this.tasks.length) return;
    const tasks = [...this.tasks];
    [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
    this.commit(tasks);
  }

  private onRowKey(e: KeyboardEvent, i: number) {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const j = i + (e.key === 'ArrowUp' ? -1 : 1);
      e.preventDefault();
      this.move(i, j - i);
      this.updateComplete.then(() => this.querySelector<HTMLInputElement>(`.todo-list input[aria-label="Task ${Math.max(0, Math.min(this.tasks.length - 1, j)) + 1}"]`)?.focus());
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.patch(i, { done: !this.tasks[i].done });
    }
  }

  render() {
    const done = this.tasks.filter((t) => t.done).length;
    const now = today();
    const rows = this.tasks.map((t, i) => [t, i] as const).filter(([t]) => this.filter === 'all' || (this.filter === 'done') === t.done);
    return html`
      <div class="to-toolbar">
        <sl-input
          class="todo-new sr-label"
          size="small"
          label="New task"
          placeholder="Add a task"
          .value=${this.draft}
          @sl-input=${(e: Event) => (this.draft = (e.target as SlInput).value)}
          @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this.add()}
        ></sl-input>
        <sl-button size="small" variant="primary" ?disabled=${!this.draft.trim()} @click=${this.add}>${icon(UI.plus, 14)} Add</sl-button>
        <span class="to-spacer"></span>
        <span class="to-hint">${done} / ${this.tasks.length}</span>
        <sl-select class="sr-label" size="small" label="Show" hoist style="width:104px" .value=${this.filter} @sl-change=${(e: Event) => (this.filter = (e.target as SlSelect).value as Filter)}>
          <sl-option value="all">All</sl-option>
          <sl-option value="open">Open</sl-option>
          <sl-option value="done">Done</sl-option>
        </sl-select>
        <sl-tooltip content="Remove finished tasks" hoist><sl-button class="icon" size="small" aria-label="Clear done" ?disabled=${!done} @click=${() => this.commit(this.tasks.filter((t) => !t.done))}>${icon(UI.trash, 14)}<span class="sr-only">Clear done</span></sl-button></sl-tooltip>
      </div>
      <ul class="todo-list">
        ${rows.map(
          ([t, i]) => html`<li class="${t.done ? 'done' : ''} ${t.due !== null && !t.done && t.due < now ? 'late' : ''}" @keydown=${(e: KeyboardEvent) => this.onRowKey(e, i)}>
            <sl-checkbox ?checked=${t.done} @sl-change=${(e: Event) => this.patch(i, { done: (e.target as HTMLInputElement).checked })}><span class="sr-only">Done: ${t.text}</span></sl-checkbox>
            <input class="text" aria-label="Task ${i + 1}" .value=${t.text} @input=${(e: Event) => this.patch(i, { text: (e.target as HTMLInputElement).value })} />
            <input class="due" type="date" aria-label="Due date" .value=${dayToInput(t.due)} @change=${(e: Event) => this.patch(i, { due: inputToDay((e.target as HTMLInputElement).value) })} />
            <button class="star" aria-label="Star" aria-pressed=${t.star ? 'true' : 'false'} @click=${() => this.patch(i, { star: !t.star })}>${icon(UI.star, 16)}</button>
            <button aria-label="Move up" ?disabled=${i === 0} @click=${() => this.move(i, -1)}>${icon(UI.up, 16)}</button>
            <button aria-label="Move down" ?disabled=${i === this.tasks.length - 1} @click=${() => this.move(i, 1)}>${icon(UI.down, 16)}</button>
            <button aria-label="Delete task" @click=${() => this.commit(this.tasks.filter((_, j) => j !== i))}>${icon(UI.close, 16)}</button>
          </li>`,
        )}
      </ul>
      ${rows.length ? nothing : html`<p class="to-empty">${this.tasks.length ? 'Nothing here.' : 'Nothing to do yet.'}</p>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-todo': ToTodo;
  }
}
