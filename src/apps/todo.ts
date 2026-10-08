/**
 * <to-todo>: a list of tasks to tick off, with stars and due dates.
 * Document format: see lib/todomodel.ts.
 */
import { goLinks } from '../widgets/link-guard.ts';
import { DocElement, defineElement, html, nothing, state, btn, tool, icon, swap, isKey, UI, EPOCH_DAY, dayToYmd, ymdString, ymdToDay, type SlInput, type SlSelect } from '../kit.ts';
import { parseTodos, serializeTodos, type Task } from '../lib/todomodel.ts';

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

export class ToTodo extends DocElement<Task[]> {
  @state() private filter: Filter = 'all';
  @state() private draft = '';

  protected parse = parseTodos;
  protected serialize = serializeTodos;

  private patch(i: number, p: Partial<Task>) {
    this.commit(this.doc.map((t, j) => (j === i ? { ...t, ...p } : t)));
  }

  private add() {
    const text = this.draft.trim();
    if (!text) return;
    this.commit([...this.doc, { text, done: false, star: false, due: null }]);
    this.draft = '';
  }

  private move(i: number, d: number) {
    const tasks = swap(this.doc, i, i + d);
    if (tasks !== this.doc) this.commit(tasks);
  }

  private onRowKey(e: KeyboardEvent, i: number) {
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const j = i + (e.key === 'ArrowUp' ? -1 : 1);
      e.preventDefault();
      this.move(i, j - i);
      this.focusSoon(`.todo-list input[aria-label="Task ${Math.max(0, Math.min(this.doc.length - 1, j)) + 1}"]`);
    } else if (isKey(e, 'Mod+Enter')) {
      e.preventDefault();
      this.patch(i, { done: !this.doc[i].done });
    }
  }

  render() {
    const done = this.doc.filter((t) => t.done).length;
    const now = today();
    const rows = this.doc.map((t, i) => [t, i] as const).filter(([t]) => this.filter === 'all' || (this.filter === 'done') === t.done);
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
        <span class="to-hint">${done} / ${this.doc.length}</span>
        <sl-select class="sr-label" size="small" label="Show" hoist style="width:104px" .value=${this.filter} @sl-change=${(e: Event) => (this.filter = (e.target as SlSelect).value as Filter)}>
          <sl-option value="all">All</sl-option>
          <sl-option value="open">Open</sl-option>
          <sl-option value="done">Done</sl-option>
        </sl-select>
        ${tool('Clear done', 'trash', () => this.commit(this.doc.filter((t) => !t.done)), { disabled: !done })}
      </div>
      <ul class="todo-list">
        ${rows.map(
          ([t, i]) => html`<li class="${t.done ? 'done' : ''} ${t.due !== null && !t.done && t.due < now ? 'late' : ''}" @keydown=${(e: KeyboardEvent) => this.onRowKey(e, i)}>
            <sl-checkbox ?checked=${t.done} @sl-change=${(e: Event) => this.patch(i, { done: (e.target as HTMLInputElement).checked })}><span class="sr-only">Done: ${t.text}</span></sl-checkbox>
            <input class="text" aria-label="Task ${i + 1}" .value=${t.text} @input=${(e: Event) => this.patch(i, { text: (e.target as HTMLInputElement).value })} />
            ${goLinks(t.text)}
            <input class="due" type="date" aria-label="Due date" .value=${dayToInput(t.due)} @change=${(e: Event) => this.patch(i, { due: inputToDay((e.target as HTMLInputElement).value) })} />
            <button class="star" aria-label="Star" aria-pressed=${t.star ? 'true' : 'false'} @click=${() => this.patch(i, { star: !t.star })}>${icon(UI.star, 16)}</button>
            ${btn('Move up', 'up', () => this.move(i, -1), { disabled: i === 0, size: 16 })}
            ${btn('Move down', 'down', () => this.move(i, 1), { disabled: i === this.doc.length - 1, size: 16 })}
            ${btn('Delete task', 'close', () => this.commit(this.doc.filter((_, j) => j !== i)), { size: 16 })}
          </li>`,
        )}
      </ul>
      ${rows.length ? nothing : html`<p class="to-empty">${this.doc.length ? 'Nothing here.' : 'Nothing to do yet.'}</p>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-todo': ToTodo;
  }
}
defineElement('todo', ToTodo);
