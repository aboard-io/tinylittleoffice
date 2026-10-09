/**
 * <to-gantt>: tasks as bars on a calendar. Drag a bar to move it, drag its
 * right edge to change how long it takes.
 * Document format: see lib/ganttmodel.ts.
 */
import { goLinks } from '../widgets/link-guard.ts';
import { DocElement, defineElement, html, svg, nothing, state, tool, stepper, dateNav, icon, clamp, swap, UI } from '../kit.ts';
import { dayToYmd } from '../lib/tz.ts';
import { MAX_INDENT, MAX_TASKS, ganttRange, ganttSpans, parseGantt, serializeGantt, type GanttTask } from '../lib/ganttmodel.ts';
import { EPOCH_DAY, fromIsoDay, isoDay, today } from '../lib/calmodel.ts';

const ROW = 36;
const HEAD = 44;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ymd = (day: number) => dayToYmd(EPOCH_DAY + day);

export class ToGantt extends DocElement<GanttTask[]> {
  @state() private cur = 0;
  /** Pixels per day. */
  @state() private zoom = 24;
  /** How far the chart has scrolled, in px: the month at its left edge is named in the bar. */
  @state() private scrolled = 0;
  private drag: { i: number; mode: 'move' | 'size'; x0: number; start: number; days: number } | null = null;

  protected parse = parseGantt;
  protected serialize = serializeGantt;

  protected loaded() {
    this.cur = clamp(this.cur, 0, this.doc.length - 1);
  }

  private patch(i: number, p: Partial<GanttTask>) {
    this.commit(this.doc.map((t, j) => (j === i ? { ...t, ...p } : t)));
  }

  /** Add a task under row `after` (by default, at the end). It starts where that one ends, at the same level. */
  private add(after = this.doc.length - 1) {
    if (this.doc.length >= MAX_TASKS) return;
    const prev = this.doc[after];
    const task: GanttTask = { start: prev ? prev.start + prev.days : today(), days: 3, done: 0, label: '' };
    if (prev?.depth) task.depth = prev.depth;
    const tasks = [...this.doc];
    tasks.splice(after + 1, 0, task);
    this.commit(tasks);
    this.cur = after + 1;
    this.focusCurrent();
  }

  private focusCurrent() {
    this.focusSoon(`.gantt-rows tbody tr:nth-child(${this.cur + 1}) input.label`);
  }

  private removeTask() {
    this.commit(this.doc.filter((_, j) => j !== this.cur));
    this.cur = clamp(this.cur, 0, this.doc.length - 1);
  }

  private move(d: number) {
    const tasks = swap(this.doc, this.cur, this.cur + d);
    if (tasks === this.doc) return;
    this.commit(tasks);
    this.cur += d;
  }

  /** Put the task under the one above it (or bring it back out). The first task cannot be anyone's part. */
  private indent(d: number, i = this.cur) {
    const t = this.doc[i];
    if (!t) return;
    const above = i > 0 ? (this.doc[i - 1].depth ?? 0) : -1;
    const depth = clamp((t.depth ?? 0) + d, 0, Math.min(MAX_INDENT, above + 1));
    if (depth !== (t.depth ?? 0)) this.patch(i, { depth: depth || undefined });
  }

  private onRowKey(e: KeyboardEvent, i: number) {
    if (e.key === 'Tab' && (e.target as HTMLElement).classList.contains('label') && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // Tab indents only when it can; otherwise it moves on as Tab always does.
      const before = this.doc[i].depth ?? 0;
      this.indent(e.shiftKey ? -1 : 1, i);
      if ((this.doc[i].depth ?? 0) !== before) e.preventDefault();
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.cur = i;
      this.move(e.key === 'ArrowUp' ? -1 : 1);
      this.focusCurrent();
    } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      // Return in any field of a task starts the next one, right below it.
      e.preventDefault();
      this.add(i);
    }
  }

  private onBarDown(e: PointerEvent, i: number, mode: 'move' | 'size') {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    this.cur = i;
    this.drag = { i, mode, x0: e.clientX, start: this.doc[i].start, days: this.doc[i].days };
  }

  private onBarMove(e: PointerEvent) {
    const d = this.drag;
    if (!d) return;
    const delta = Math.round((e.clientX - d.x0) / this.zoom);
    const t = this.doc[d.i];
    if (d.mode === 'move') {
      const start = Math.max(0, d.start + delta);
      if (start !== t.start) this.patch(d.i, { start });
    } else {
      const days = Math.max(1, d.days + delta);
      if (days !== t.days) this.patch(d.i, { days });
    }
  }

  /** The first day the chart draws: two before the earliest task. */
  private chartFrom() {
    return ganttRange(this.doc)!.from - 2;
  }
  /** Scroll the chart by so many days, or (with `to`) so that a day is at its left edge. */
  private scrollDays(by: number, to?: number) {
    const box = this.querySelector<HTMLElement>('.gantt-scroll');
    if (!box) return;
    box.scrollLeft = to === undefined ? box.scrollLeft + by * this.zoom : Math.max(0, (to - this.chartFrom() - 1) * this.zoom);
  }

  private renderChart() {
    const range = ganttRange(this.doc)!;
    const spans = ganttSpans(this.doc);
    const now = today();
    const from = this.chartFrom();
    const to = Math.max(range.to + 3, from + 21);
    const z = this.zoom;
    const width = (to - from) * z;
    const height = HEAD + this.doc.length * ROW;
    const days = Array.from({ length: to - from }, (_, k) => from + k);
    // Days until the next month label, so the first one is dropped when there is no room for it.
    const firstOfMonth = days.findIndex((day, k) => k > 0 && ymd(day).d === 1);
    const nextMonth = firstOfMonth < 0 ? Infinity : firstOfMonth;
    return svg`<svg class="gantt-chart" width=${width} height=${height} viewBox="0 0 ${width} ${height}" role="img" aria-label="Chart" @pointermove=${this.onBarMove} @pointerup=${() => (this.drag = null)} @pointercancel=${() => (this.drag = null)}>
      ${days.map((day, k) => {
        const { y, m, d, wd } = ymd(day);
        return svg`
          ${wd === 0 || wd === 6 ? svg`<rect class="weekend" x=${k * z} y=${HEAD} width=${z} height=${height - HEAD} />` : nothing}
          ${d === 1 || (k === 0 && nextMonth * z > 70) ? svg`<text class="month" x=${k * z + 4} y="16">${MONTHS[m - 1]} ${y}</text>` : nothing}
          ${z >= 18 || wd === 1 ? svg`<text class="day" x=${k * z + z / 2} y="36" text-anchor="middle">${d}</text>` : nothing}
          <line class=${wd === 1 ? 'week' : 'tick'} x1=${k * z} y1=${wd === 1 ? 22 : HEAD} x2=${k * z} y2=${height} />`;
      })}
      <line class="head" x1="0" y1=${HEAD} x2=${width} y2=${HEAD} />
      ${now >= from && now < to ? svg`<line class="today" x1=${(now - from + 0.5) * z} y1="22" x2=${(now - from + 0.5) * z} y2=${height} />` : nothing}
      ${this.doc.map((t, i) => {
        const sp = spans[i];
        const x = (sp.start - from) * z;
        const w = sp.days * z;
        const y = HEAD + i * ROW + 7;
        const label = svg`<text x=${x + w + 8} y=${y + (ROW - 14) / 2} dominant-baseline="central" pointer-events="none">${t.label}</text>`;
        // A task with parts under it is a bracket around them; it moves when they do.
        if (sp.parent)
          return svg`<g class="bar parent ${i === this.cur ? 'sel' : ''}" data-idx=${i} @pointerdown=${() => (this.cur = i)}>
            <path d="M${x} ${y + 4}h${w}v14l-7 -7h${-(w - 14)}l-7 7z" />
            ${label}
          </g>`;
        return svg`<g class="bar ${i === this.cur ? 'sel' : ''}" data-idx=${i}>
          <rect class="track" x=${x} y=${y} width=${w} height=${ROW - 14} rx="5" @pointerdown=${(e: PointerEvent) => this.onBarDown(e, i, 'move')} />
          ${t.done ? svg`<rect class="done" x=${x} y=${y} width=${(w * t.done) / 100} height=${ROW - 14} rx="5" pointer-events="none" />` : nothing}
          <rect class="grip" x=${x + w - 8} y=${y} width="12" height=${ROW - 14} @pointerdown=${(e: PointerEvent) => this.onBarDown(e, i, 'size')} />
          ${label}
        </g>`;
      })}
    </svg>`;
  }

  render() {
    const n = this.doc.length;
    const range = ganttRange(this.doc);
    const spans = ganttSpans(this.doc);
    return html`
      <div class="to-toolbar">
        <sl-button size="small" ?disabled=${n >= MAX_TASKS} @click=${() => this.add()}>${icon(UI.plus, 14)} Task</sl-button>
        ${tool('Delete task', 'trash', () => this.removeTask(), { disabled: !n })}
        <sl-button-group label="Reorder">
          ${tool('Move task up', 'up', () => this.move(-1), { disabled: this.cur === 0, key: 'Alt+ArrowUp' })}
          ${tool('Move task down', 'down', () => this.move(1), { disabled: this.cur >= n - 1, key: 'Alt+ArrowDown' })}
        </sl-button-group>
        <sl-button-group label="Indent">
          ${tool('Bring out', 'shiftOut', () => this.indent(-1), { disabled: !(this.doc[this.cur]?.depth ?? 0), key: 'Shift+Tab' })}
          ${tool('Indent under the task above', 'shiftIn', () => this.indent(1), { disabled: this.cur === 0 || !n, key: 'Tab' })}
        </sl-button-group>
        ${range
          ? dateNav(((d) => `${MONTHS[d.m - 1]} ${d.y}`)(ymd(this.chartFrom() + Math.floor(this.scrolled / this.zoom))), { prev: 'A week earlier', next: 'A week later', onPrev: () => this.scrollDays(-7), onNext: () => this.scrollDays(7), onToday: () => this.scrollDays(0, today()) })
          : nothing}
        <span class="to-spacer"></span>
        ${range ? html`<span class="to-hint">${range.to - range.from} days</span>` : nothing}
        ${stepper('Zoom', `${this.zoom}px`, { less: 'Zoom out', more: 'Zoom in', onLess: () => (this.zoom = Math.max(8, this.zoom - 8)), onMore: () => (this.zoom = Math.min(40, this.zoom + 8)), canLess: this.zoom > 8, canMore: this.zoom < 40, reset: 'Back to the usual zoom', onReset: () => (this.zoom = 24) })}
      </div>
      ${n
        ? html`<div class="gantt">
            <table class="gantt-rows">
              <thead>
                <tr><th>Task</th><th>Start</th><th>Days</th><th>Done</th></tr>
              </thead>
              <tbody>
                ${this.doc.map(
                  (t, i) => html`<tr class="${i === this.cur ? 'sel' : ''} ${spans[i].parent ? 'parent' : ''}" @focusin=${() => (this.cur = i)} @keydown=${(e: KeyboardEvent) => this.onRowKey(e, i)}>
                    <td><input class="label" style="padding-left:${4 + (t.depth ?? 0) * 18}px" aria-label="Task ${i + 1}" placeholder="Task" .value=${t.label} @input=${(e: Event) => this.patch(i, { label: (e.target as HTMLInputElement).value })} />${goLinks(t.label)}</td>
                    <td>
                      <input type="date" aria-label="Start of task ${i + 1}" .value=${isoDay(t.start)} @change=${(e: Event) => {
                        const start = fromIsoDay((e.target as HTMLInputElement).value);
                        if (start !== null) this.patch(i, { start: Math.max(0, start) });
                      }} />
                    </td>
                    <td><input class="n" type="number" min="1" max="999" aria-label="Days for task ${i + 1}" .value=${String(t.days)} @change=${(e: Event) => this.patch(i, { days: clamp(parseInt((e.target as HTMLInputElement).value, 10) || 1, 1, 999) })} /></td>
                    <td><input class="n" type="number" min="0" max="100" step="10" aria-label="Percent done for task ${i + 1}" .value=${String(t.done)} @change=${(e: Event) => this.patch(i, { done: clamp(parseInt((e.target as HTMLInputElement).value, 10) || 0, 0, 100) })} /></td>
                  </tr>`,
                )}
              </tbody>
            </table>
            <div class="gantt-scroll" tabindex="0" role="group" aria-label="Chart, scrolls sideways" @scroll=${(e: Event) => (this.scrolled = (e.target as HTMLElement).scrollLeft)}>${this.renderChart()}</div>
          </div>`
        : html`<p class="to-empty">No tasks yet.</p>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'to-gantt': ToGantt;
  }
}
defineElement('gantt', ToGantt);
