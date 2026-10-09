/**
 * <to-cal-editor>: the Calendar app. A month of days (or the year at a glance, or the same items as a
 * schedule), every span drawn on the days it covers. A tap on a day, or a drag across several, starts a
 * span; a tap on a span opens it. Either way the span is edited in a native dialog that works on a draft:
 * Done writes it into the document as one operation, Escape throws it away. On the schedule a bar is dragged
 * to move it and by its end to make it longer; Tab nests a task under the one above, Alt+arrows move it.
 *
 * All-day spans are floating dates, the same in every country. A timed span is an instant, written in the
 * document's zone and shown in whichever zone the viewer picks (the globe in the bar). Every change is
 * operations on the document's list items (model.ts); the one bar holds where you are, the view, Insert ▾,
 * the colour new spans take, the zone, undo and redo.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { CalendarDays, ChartGantt, Globe, Grid3x3, Repeat as RepeatIcon } from 'lucide';
import { applyAll, dayToYmd, moveFamily, runLength, shiftFamily, ymdString, ymdToDay, type Block, type Doc, type Op } from '../../doc/index.ts';
import { btn, dateNav, tool } from '../../kit/bar.ts';
import type { ToDialog } from '../../kit/dialog.ts';
import { DocElement } from '../../kit/element.ts';
import { icon, UI, type IconNode } from '../../kit/icons.ts';
import { language, t } from '../../kit/i18n.ts';
import type { MenuItem } from '../../kit/menu.ts';
import { caret } from '../../kit/textops.ts';
import type { TextOps, ToText } from '../../kit/text.ts';
import {
  CAL_COLORS,
  EVERY,
  clockMinutes,
  dayOf,
  draftOf,
  everyText,
  ganttBars,
  ganttRange,
  moveItem,
  nameColor,
  newDraft,
  occurrences,
  openingDay,
  putItem,
  readCal,
  removeSpan,
  repeatText,
  resizeItem,
  setGantt,
  spanDays,
  spanEndMs,
  spanStartMs,
  type CalView,
  type Draft,
  type Every,
  type Item,
} from './model.ts';
import { allZones, clockString, dayString, isValidZone, localZone, pad2, partsToUtc, utcToParts, zoneAbbr } from './tz.ts';
import '../../kit/bar.ts';
import '../../kit/dialog.ts';
import '../../kit/insert.ts';
import '../../kit/menu.ts';
import '../../kit/text.ts';
import './style.css';

export const tag = 'to-cal-editor';

type Mode = 'month' | 'year';
/** The span in the dialog: what it was (null for a new one), the draft, where a new task goes, the colour's name as typed. */
interface Editing {
  item: Item | null;
  d: Draft;
  block: Block;
  after?: Item;
  legend: string;
}

const ROW = 44;
/** A colour as an icon: a filled dot, for the bar's button. */
const dot = (hex: string) => [['circle', { cx: 12, cy: 12, r: 8, fill: hex, stroke: hex }]] as IconNode;
const HEAD = 44;

function firstWeekday(): number {
  try {
    const loc = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info) return info.firstDay % 7; // Intl counts 1 = Monday … 7 = Sunday.
  } catch {
    // No week info here: weeks start on Sunday.
  }
  return 0;
}

export class ToCalEditor extends DocElement<CalView> {
  static properties: PropertyDeclarations = {
    mode: { state: true },
    shown: { state: true },
    picked: { state: true },
    zone: { state: true },
    ink: { state: true },
    editing: { state: true },
    drag: { state: true },
    bar: { state: true },
    scrolled: { state: true },
    cur: { state: true },
  };
  declare mode: Mode;
  /** The month on view (or the year, which is its year). */
  declare shown: { y: number; m: number };
  /** A day tapped on the year, marked in its month. */
  declare picked: number;
  /** The zone times are shown in: the viewer's own until they pick another. */
  declare zone: string;
  /** The colour new spans take: whoever is adding dates picks theirs. */
  declare ink: string;
  declare editing: Editing | null;
  /** Days being dragged across on the month. */
  declare drag: { from: number; to: number; moved: boolean } | null;
  /** A bar being dragged on the schedule: by how many days so far. */
  declare bar: { at: number; how: 'move' | 'size'; x0: number; days: number; id: number } | null;
  /** The schedule's scroll, in days from its first. */
  declare scrolled: number;
  /** The task the schedule's keys act on: its block. */
  declare cur: number;
  private week0 = firstWeekday();
  private zones: string[] | null = null;
  /** A drag just ended: the click that follows it is not a tap. */
  private dragged = false;

  constructor() {
    super();
    this.mode = 'month';
    this.picked = -1;
    this.zone = localZone();
    this.ink = '';
    this.editing = null;
    this.drag = null;
    this.bar = null;
    this.scrolled = 0;
    this.cur = -1;
    const now = utcToParts(Date.now(), this.zone);
    this.shown = { y: now.y, m: now.m };
  }

  protected read(doc: Doc): CalView {
    return readCal(doc);
  }
  protected willUpdate(changed: Map<PropertyKey, unknown>) {
    const before = this.doc;
    super.willUpdate(changed);
    // The base read a document afresh (one from the shell, not an edit of ours): open on the month of what comes next.
    if (this.doc !== before) {
      const p = dayToYmd(openingDay(this.view, this.zone));
      this.shown = { y: p.y, m: p.m };
      this.picked = -1;
    }
  }

  /* ---------- where we are ---------- */

  private todayDay(): number {
    const p = utcToParts(Date.now(), this.zone);
    return ymdToDay(p.y, p.m, p.d);
  }
  private showDay(day: number) {
    const p = dayToYmd(day);
    this.shown = { y: p.y, m: p.m };
  }
  private shiftMonth(by: number) {
    const k = this.shown.y * 12 + this.shown.m - 1 + by;
    this.shown = { y: Math.floor(k / 12), m: (k % 12) + 1 };
  }
  private setMode(mode: Mode | 'gantt') {
    if (mode === 'gantt') return this.edit(setGantt(this.view, true));
    this.mode = mode;
    this.edit(setGantt(this.view, false));
  }
  /** The zone repeats keep their time of day in: the document's, or the viewer's until it has one. */
  private get repeatZone() {
    return this.view.zone || this.zone;
  }

  /* ---------- the dialog ---------- */

  private async openDraft(item: Item | null, d: Draft, after?: Item) {
    this.editing = { item, d, block: { k: 'p', runs: d.label }, after, legend: this.view.legend[d.color] ?? '' };
    await this.updateComplete;
    const dialog = this.querySelector<ToDialog>('to-dialog.cal-dialog')!;
    await dialog.show();
    await dialog.updateComplete;
    const label = dialog.querySelector<ToText>('to-text.cal-label');
    if (label) {
      await label.updateComplete;
      label.sel = caret(0, runLength(d.label));
    }
  }
  private open(item: Item) {
    if (this.dragged) return;
    this.cur = item.at;
    void this.openDraft(item, draftOf(item));
  }
  /** A new span over these days (in the colour new spans take), or a new task after the current one. */
  private create(from: number, to = from) {
    void this.openDraft(null, newDraft(from, to, this.ink));
  }
  private createTask() {
    const cur = this.view.items.find((i) => i.at === this.cur) ?? this.view.items.at(-1);
    const bar = cur && ganttBars(this.view).find((b) => b.item === cur);
    const start = bar ? bar.start + bar.days : this.todayDay();
    void this.openDraft(null, { ...newDraft(start, start + 2, this.ink) }, cur);
  }
  private patch(p: Partial<Draft>) {
    const e = this.editing;
    if (!e) return;
    const d = { ...e.d, ...p };
    this.editing = { ...e, d, legend: 'color' in p ? (this.view.legend[d.color] ?? '') : e.legend };
  }
  private close() {
    this.querySelector<ToDialog>('to-dialog.cal-dialog')?.close();
  }
  private done = () => {
    const e = this.editing;
    if (!e) return;
    const ops = putItem(this.doc, this.view, e.item, e.d, this.zone, e.after);
    if (e.legend.trim() !== (this.view.legend[e.d.color] ?? '')) ops.push(...nameColor(e.d.color, e.legend));
    this.editing = null;
    this.close();
    this.edit(ops);
    this.showMonthOf(e.d);
  };
  private removeDraft = () => {
    const e = this.editing;
    this.editing = null;
    this.close();
    if (e?.item) this.edit(removeSpan(this.doc, e.item));
  };
  private showMonthOf(d: Draft) {
    if (this.mode === 'month' && !this.view.gantt) this.showDay(spanDays(d, this.zone)[0]);
  }
  private onLabelOps = (e: CustomEvent<TextOps>) => {
    e.stopPropagation();
    const ed = this.editing;
    if (!ed) return;
    const block = applyAll({ head: {}, blocks: [ed.block] }, e.detail.ops).blocks[0];
    this.editing = { ...ed, block, d: { ...ed.d, label: 'runs' in block ? block.runs : [] } };
  };

  /* ---------- the draft's fields, in the viewer's zone ---------- */

  private fields(s: Draft) {
    if (s.kind === 'd') return { sd: dayString(s.start), st: '', ed: dayString(s.start + s.dur - 1), et: '' };
    const a = utcToParts(spanStartMs(s), this.zone);
    const b = utcToParts(spanEndMs(s), this.zone);
    return { sd: ymdString(a.y, a.m, a.d), st: clockString(a), ed: ymdString(b.y, b.m, b.d), et: clockString(b) };
  }
  /** A date field and a time field as the draft counts them: a day, or for a timed span a minute in the viewer's zone. */
  private at(date: string, time: string): number | null {
    const day = dayOf(date);
    if (day === null || this.editing!.d.kind === 'd') return day;
    const hm = /^(\d{2}):(\d{2})/.exec(time);
    return clockMinutes(day, hm ? +hm[1] : 0, hm ? +hm[2] : 0, this.zone);
  }
  private setStart(date: string, time: string) {
    const s = this.editing!.d;
    const at = this.at(date, time);
    // Moving the start moves the whole span; its length stays.
    if (at !== null && at !== s.start) this.patch({ start: at });
  }
  private setEnd(date: string, time: string) {
    const s = this.editing!.d;
    const at = this.at(date, time);
    if (at !== null) this.patch({ dur: s.kind === 'd' ? Math.max(1, at - s.start + 1) : Math.max(0, at - s.start) });
  }
  private setAllDay(allDay: boolean) {
    const s = this.editing!.d;
    if (allDay && s.kind === 't') {
      const [a, b] = spanDays(s, this.zone);
      this.patch({ kind: 'd', start: a, dur: Math.max(1, b - a + 1) });
    } else if (!allDay && s.kind === 'd') this.patch({ kind: 't', start: clockMinutes(s.start, 9, 0, this.zone), dur: 60 });
  }
  /** How the draft repeats: every so often, for ever, so many times, or until a day (never before its first). */
  private setRepeat(every: Every | '', end: { count?: number; until?: string } = {}) {
    const d = this.editing!.d;
    if (!every) return this.patch({ repeat: undefined });
    const repeat = { ...(d.repeat?.every === every ? d.repeat : {}), every };
    if ('count' in end) {
      delete repeat.until;
      if (end.count && end.count > 0) repeat.count = Math.min(999, Math.floor(end.count));
      else delete repeat.count;
    }
    if ('until' in end) {
      delete repeat.count;
      const until = dayOf(end.until);
      if (until !== null) repeat.until = Math.max(spanDays(d, this.zone)[0], until);
      else delete repeat.until;
    }
    this.patch({ repeat });
  }

  /* ---------- the month: a tap or a drag across days ---------- */

  private dayAt(e: PointerEvent): number | null {
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.cal-cell');
    return cell ? parseInt(cell.dataset.day!, 10) : null;
  }
  private onCellDown = (e: PointerEvent, day: number) => {
    if (e.button !== 0 || (e.target as Element).closest('.cal-chip')) return;
    this.drag = { from: day, to: day, moved: false };
  };
  private onGridMove = (e: PointerEvent) => {
    if (!this.drag) return;
    const day = this.dayAt(e);
    if (day !== null && day !== this.drag.to) {
      if (!this.drag.moved) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      this.drag = { ...this.drag, to: day, moved: true };
    }
  };
  private onGridUp = () => {
    const d = this.drag;
    this.drag = null;
    if (!d?.moved) return;
    // The click after a drag is not a tap on a day.
    this.dragged = true;
    setTimeout(() => (this.dragged = false), 0);
    this.create(d.from, d.to);
  };
  private onCellClick = (e: Event, day: number) => {
    if (this.dragged || (e.target as Element).closest('.cal-chip')) return;
    this.create(day);
  };

  /* ---------- the schedule: drag a bar, keys on a task ---------- */

  private zoom = 24;
  private onBarDown(e: PointerEvent, b: Item, how: 'move' | 'size') {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    this.cur = b.at;
    this.bar = { at: b.at, how, x0: e.clientX, days: 0, id: e.pointerId };
  }
  private onBarMove = (e: PointerEvent) => {
    const d = this.bar;
    if (!d || e.pointerId !== d.id) return;
    const days = Math.round((e.clientX - d.x0) / this.zoom);
    if (days !== d.days) this.bar = { ...d, days };
  };
  private onBarUp = (e: PointerEvent) => {
    const d = this.bar;
    if (!d || e.pointerId !== d.id) return;
    this.bar = null;
    const item = this.view.items.find((i) => i.at === d.at);
    if (!item) return;
    if (!d.days) return this.open(item);
    this.edit(d.how === 'move' ? moveItem(this.view, item, d.days) : resizeItem(this.view, item, item.dur + d.days));
  };
  private onTaskKey(e: KeyboardEvent, item: Item) {
    let ops: Op[] | null = null;
    if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) ops = shiftFamily(this.doc, item.at, e.shiftKey ? -1 : 1);
    else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) ops = moveFamily(this.doc, item.at, e.key === 'ArrowUp' ? -1 : 1);
    else if (e.key === 'Delete' || e.key === 'Backspace') ops = removeSpan(this.doc, item);
    else return;
    // Tab moves on as Tab does when there is no nesting to do.
    if (!ops) return e.key === 'Tab' ? undefined : e.preventDefault();
    e.preventDefault();
    const words = item.words;
    this.edit(ops);
    // The task is where its ops put it: find it again by its words and focus it.
    void this.updateComplete.then(() => {
      const again = this.view.items.find((i) => i.words === words && i.at >= 0);
      if (!again || e.key === 'Delete' || e.key === 'Backspace') return;
      this.cur = again.at;
      void this.updateComplete.then(() => this.querySelector<HTMLElement>(`.cal-task[data-at="${again.at}"]`)?.focus());
    });
  }
  /** The schedule's first day: two before the earliest task. */
  private ganttFrom(): number {
    const range = ganttRange(ganttBars(this.view));
    return (range?.from ?? this.todayDay()) - 2;
  }
  private scrollDays(by: number, to?: number) {
    const box = this.querySelector<HTMLElement>('.cal-gantt-scroll');
    if (!box) return;
    box.scrollLeft = to === undefined ? box.scrollLeft + by * this.zoom : Math.max(0, (to - this.ganttFrom() - 1) * this.zoom);
    this.scrolled = Math.floor(box.scrollLeft / this.zoom);
  }

  /* ---------- the bar ---------- */

  private inserts(): MenuItem[] {
    if (this.view.gantt) return [{ label: t('Task'), icon: UI.plus, does: () => this.createTask() }];
    const day = this.picked >= 0 ? this.picked : ymdToDay(this.shown.y, this.shown.m, 1) <= this.todayDay() && this.todayDay() < ymdToDay(this.shown.y, this.shown.m + 1, 1) ? this.todayDay() : ymdToDay(this.shown.y, this.shown.m, 1);
    return [{ label: t('Event'), icon: UI.plus, does: () => this.create(day) }];
  }
  private views(): MenuItem[] {
    const g = this.view.gantt;
    return [
      { label: t('Month'), icon: CalendarDays, checked: !g && this.mode === 'month', does: () => this.setMode('month') },
      { label: t('Year'), icon: Grid3x3, checked: !g && this.mode === 'year', does: () => this.setMode('year') },
      { label: t('Schedule'), hint: t('The same dates as a Gantt chart'), icon: ChartGantt, checked: g, does: () => this.setMode('gantt') },
    ];
  }
  private inks(): MenuItem[] {
    return Object.entries(CAL_COLORS).map(([k, c]) => ({ label: this.view.legend[k] ? `${c.name()}: ${this.view.legend[k]}` : c.name(), swatch: c.hex, checked: this.ink === k, does: () => (this.ink = k) }));
  }
  private nav() {
    if (this.view.gantt) {
      const day = this.ganttFrom() + this.scrolled;
      const p = dayToYmd(day);
      return dateNav({ label: this.monthName(p.y, p.m), prev: t('A week earlier'), next: t('A week later'), onPrev: () => this.scrollDays(-7), onNext: () => this.scrollDays(7), onToday: () => this.scrollDays(0, this.todayDay()) });
    }
    if (this.mode === 'year') return dateNav({ label: String(this.shown.y), prev: t('Previous year'), next: t('Next year'), onPrev: () => (this.shown = { ...this.shown, y: this.shown.y - 1 }), onNext: () => (this.shown = { ...this.shown, y: this.shown.y + 1 }), onToday: () => this.showDay(this.todayDay()) });
    return dateNav({ label: this.monthName(this.shown.y, this.shown.m), prev: t('Previous month'), next: t('Next month'), onPrev: () => this.shiftMonth(-1), onNext: () => this.shiftMonth(1), onToday: () => ((this.picked = -1), this.showDay(this.todayDay())) });
  }
  private monthName(y: number, m: number) {
    return new Intl.DateTimeFormat(language(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
  }
  private openZones = async () => {
    this.zones ??= allZones();
    this.requestUpdate();
    await this.updateComplete;
    await this.querySelector<ToDialog>('to-dialog.cal-zones')?.show();
  };

  /* ---------- drawing ---------- */

  render() {
    const v = this.view;
    const docZone = v.zone;
    const ink = CAL_COLORS[this.ink];
    return html`<to-bar class="cal-bar">
        ${this.nav()}
        <to-menu class="cal-view" icon-only .label=${t('View')} .icon=${v.gantt ? ChartGantt : this.mode === 'year' ? Grid3x3 : CalendarDays} .items=${this.views()}></to-menu>
        <to-insert .items=${this.inserts()}></to-insert>
        <to-menu class="cal-ink" icon-only .label=${t('Colour for new: {colour}', { colour: v.legend[this.ink] ?? ink.name() })} .icon=${dot(ink.hex)} .items=${this.inks()}></to-menu>
        ${btn({ label: this.zone.split('/').pop()!.replace(/_/g, ' '), icon: Globe, cls: 'cal-zone', does: () => void this.openZones() })}
        ${tool({ label: t('Undo'), icon: UI.undo, keys: 'Mod+Z', keep: true, disabled: !this.canUndo, does: () => this.dispatchEvent(new CustomEvent('docundo', { cancelable: true })) })}
        ${tool({ label: t('Redo'), icon: UI.redo, keys: 'Mod+Shift+Z', keep: true, disabled: !this.canRedo, does: () => this.dispatchEvent(new CustomEvent('docredo', { cancelable: true })) })}
      </to-bar>
      ${v.gantt ? this.renderGantt() : this.mode === 'year' ? this.renderYear() : this.renderMonth()}
      ${this.renderDialog()}
      <to-dialog class="cal-zones" heading=${t('Time zone')} .body=${html`
        <label class="cal-field"><span>${t('Show times in')}</span>
          <select aria-label=${t('Time zone')} @change=${(e: Event) => {
            const z = (e.target as HTMLSelectElement).value;
            if (isValidZone(z)) this.zone = z;
          }}>${(this.zones ?? []).map((z) => html`<option value=${z} ?selected=${z === this.zone}>${z.replace(/_/g, ' ')}</option>`)}</select>
        </label>
        ${docZone ? html`<p class="to-hint">${t('This calendar is written in {zone} time.', { zone: docZone.replace(/_/g, ' ') })}</p>` : nothing}
        <div class="to-row">
          ${docZone && docZone !== this.zone ? btn({ label: t('Its own zone'), does: () => (this.zone = docZone) }) : nothing}
          ${this.zone !== localZone() ? btn({ label: t('My zone'), does: () => (this.zone = localZone()) }) : nothing}
          ${btn({ label: t('Done'), icon: UI.check, cls: 'primary', does: () => this.querySelector<ToDialog>('to-dialog.cal-zones')?.close() })}
        </div>`}></to-dialog>`;
  }

  private chipTime(s: Item): string {
    const p = utcToParts(spanStartMs(s), this.zone);
    return `${p.h}:${pad2(p.min)}`;
  }
  private renderMonth() {
    const { y, m } = this.shown;
    const v = this.view;
    const first = ymdToDay(y, m, 1);
    const lead = (dayToYmd(first).wd - this.week0 + 7) % 7;
    const gridStart = first - lead;
    const last = ymdToDay(y, m + 1, 1) - 1;
    const rows = Math.ceil((lead + last - first + 1) / 7);
    const today = this.todayDay();
    const wdFmt = new Intl.DateTimeFormat(language(), { weekday: 'short', timeZone: 'UTC' });
    const dayFmt = new Intl.DateTimeFormat(language(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const range = this.drag?.moved ? [Math.min(this.drag.from, this.drag.to), Math.max(this.drag.from, this.drag.to)] : null;
    // Every time of every span that lands on the grid (a day either side: a repeat keeps its time of day in another zone).
    const times = v.items.flatMap((s) => occurrences(s, gridStart - 1, gridStart + rows * 7, this.repeatZone));
    return html`<div class="cal-grid" role="grid" aria-label=${this.monthName(y, m)} @pointermove=${this.onGridMove} @pointerup=${this.onGridUp} @pointercancel=${() => (this.drag = null)}>
        <div class="cal-row" role="row">${Array.from({ length: 7 }, (_, i) => html`<div class="cal-wd" role="columnheader">${wdFmt.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7)))}</div>`)}</div>
        ${Array.from({ length: rows }, (_, week) => html`<div class="cal-row" role="row">${Array.from({ length: 7 }, (_, wd) => {
          const day = gridStart + week * 7 + wd;
          const p = dayToYmd(day);
          const dayStart = partsToUtc(p.y, p.m, p.d, 0, 0, this.zone);
          const dayEnd = partsToUtc(p.y, p.m, p.d + 1, 0, 0, this.zone);
          const chips = times.filter((s) => (s.kind === 'd' ? s.start <= day && day < s.start + s.dur : spanStartMs(s) < dayEnd && Math.max(spanEndMs(s), spanStartMs(s) + 1) > dayStart));
          const cls = ['cal-cell', p.m !== m ? 'out' : '', day === today ? 'today' : '', day === this.picked ? 'picked' : '', range && day >= range[0] && day <= range[1] ? 'range' : ''].join(' ');
          return html`<div class=${cls} role="gridcell" data-day=${day} @pointerdown=${(e: PointerEvent) => this.onCellDown(e, day)} @click=${(e: Event) => this.onCellClick(e, day)}>
            <button type="button" class="cal-n" aria-label=${t('New event on {day}', { day: dayFmt.format(day * 86400000) })} aria-current=${day === today ? 'date' : nothing}>${p.d}</button>
            ${chips.map((s) => {
              const starts = s.kind === 'd' ? s.start === day : spanStartMs(s) >= dayStart;
              const ends = s.kind === 'd' ? s.start + s.dur - 1 === day : Math.max(spanEndMs(s), spanStartMs(s) + 1) <= dayEnd;
              return html`<button type="button" class="cal-chip ${s.kind === 'd' ? 'day' : ''} ${starts ? '' : 'cont'} ${ends ? '' : 'more'}" style="--c:${CAL_COLORS[s.color]?.hex ?? CAL_COLORS[''].hex}" title=${this.whenWords(s) + (s.repeat ? `, ${repeatText(s.repeat)}` : '')} @click=${() => this.open(s)}>${starts && s.kind === 't' ? html`<b>${this.chipTime(s)}</b> ` : nothing}${s.repeat && starts ? icon(RepeatIcon, 10, 'cal-rep') : nothing}${s.words || t('Untitled')}</button>`;
            })}
          </div>`;
        })}</div>`)}
      </div>
      ${this.renderLegend()}
      ${this.renderAgenda(first, last)}`;
  }

  /** What the colours in use stand for. */
  private renderLegend() {
    const used = Object.entries(this.view.legend).filter(([k]) => this.view.items.some((s) => s.color === k));
    return used.length ? html`<p class="cal-legend">${used.map(([k, name]) => html`<span><i style="--c:${CAL_COLORS[k].hex}"></i>${name}</span>`)}</p>` : nothing;
  }

  /** When a span is, in words, in the viewer's zone. */
  private whenWords(s: Draft): string {
    try {
      if (s.kind === 'd') {
        const f = new Intl.DateTimeFormat(language(), { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
        return s.dur > 1 ? f.formatRange(s.start * 86400000, (s.start + s.dur - 1) * 86400000) : f.format(s.start * 86400000);
      }
      const f = new Intl.DateTimeFormat(language(), { timeZone: this.zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return (s.dur > 0 ? f.formatRange(spanStartMs(s), spanEndMs(s)) : f.format(spanStartMs(s))) + ' ' + zoneAbbr(spanStartMs(s), this.zone);
    } catch {
      return '';
    }
  }

  /** The month as a list: each time of each span in it, in order; a tap opens it. */
  private renderAgenda(first: number, last: number) {
    const all = this.view.items.flatMap((s) => occurrences(s, first, last, this.repeatZone)).sort((a, b) => spanStartMs(a) - spanStartMs(b));
    if (!this.view.items.length) return html`<p class="to-hint cal-empty">${t('Nothing on the calendar yet. Tap a day, or drag across several.')}</p>`;
    return html`<ul class="cal-agenda" aria-label=${t('This month')}>
      ${all.length
        ? all.map((s) => html`<li><button type="button" class="cal-agenda-item" style="--c:${CAL_COLORS[s.color]?.hex ?? CAL_COLORS[''].hex}" @click=${() => this.open(s)}><span class="when">${this.whenWords(s)}</span><span class="what">${s.words || t('Untitled')}${s.repeat ? html` <small>${repeatText(s.repeat)}</small>` : nothing}</span></button></li>`)
        : html`<li class="to-hint">${t('Nothing this month.')}</li>`}
    </ul>`;
  }

  /** Twelve small months, a day tinted with the colour of what it holds; a month's name opens it, a day too. */
  private renderYear() {
    const { y } = this.shown;
    const from = ymdToDay(y, 1, 1);
    const to = ymdToDay(y + 1, 1, 1);
    const tint = new Map<number, string>();
    for (const s of this.view.items)
      for (const o of occurrences(s, from - 1, to, this.repeatZone)) {
        const [a, b] = spanDays(o, this.zone);
        for (let d = Math.max(a, from); d <= Math.min(b, to - 1); d++) if (!tint.has(d)) tint.set(d, CAL_COLORS[o.color]?.hex ?? CAL_COLORS[''].hex);
      }
    const today = this.todayDay();
    const wdFmt = new Intl.DateTimeFormat(language(), { weekday: 'narrow', timeZone: 'UTC' });
    const monthFmt = new Intl.DateTimeFormat(language(), { month: 'long', timeZone: 'UTC' });
    const dayFmt = new Intl.DateTimeFormat(language(), { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const openMonth = (m: number, day = -1) => {
      this.shown = { y, m };
      this.picked = day;
      this.mode = 'month';
    };
    return html`<div class="cal-year" aria-label=${String(y)}>
      ${Array.from({ length: 12 }, (_, k) => {
        const m = k + 1;
        const first = ymdToDay(y, m, 1);
        const lead = (dayToYmd(first).wd - this.week0 + 7) % 7;
        const days = ymdToDay(y, m + 1, 1) - first;
        return html`<section class="cal-mini">
          <button type="button" class="cal-mini-name" @click=${() => openMonth(m)}>${monthFmt.format(Date.UTC(y, k, 1))}</button>
          <div class="cal-mini-days">
            ${Array.from({ length: 7 }, (_, i) => html`<span class="wd" aria-hidden="true">${wdFmt.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7)))}</span>`)}
            ${Array.from({ length: lead }, () => html`<span></span>`)}
            ${Array.from({ length: days }, (_, i) => {
              const day = first + i;
              const c = tint.get(day);
              return html`<button type="button" class="d ${c ? 'has' : ''} ${day === today ? 'today' : ''}" style=${c ? `--c:${c}` : nothing} aria-label=${dayFmt.format(day * 86400000)} @click=${() => openMonth(m, day)}>${i + 1}</button>`;
            })}
          </div>
        </section>`;
      })}
    </div>`;
  }

  /** The same items as a schedule: the tasks down the side, their bars on days that scroll sideways. */
  private renderGantt() {
    const v = this.view;
    const bars = ganttBars(v);
    if (!bars.length) return html`<p class="to-hint cal-empty">${t('No tasks yet. Insert a task.')}</p>`;
    const range = ganttRange(bars)!;
    const from = this.ganttFrom();
    const to = Math.max(range.to + 7, from + 28);
    const z = this.zoom;
    const width = (to - from) * z;
    const height = HEAD + bars.length * ROW;
    const now = this.todayDay();
    const months = new Intl.DateTimeFormat(language(), { month: 'short', year: 'numeric', timeZone: 'UTC' });
    const drag = this.bar;
    return html`<div class="cal-gantt">
      <ol class="cal-tasks" aria-label=${t('Tasks')} style="--head:${HEAD}px">
        ${bars.map((b) => html`<li><button type="button" class="cal-task ${b.parent ? 'parent' : ''} ${b.item.at === this.cur ? 'cur' : ''}" data-at=${b.item.at} style="--d:${b.item.depth}" aria-describedby=${`cal-when-${b.item.at}`} @focus=${() => (this.cur = b.item.at)} @click=${() => this.open(b.item)} @keydown=${(e: KeyboardEvent) => this.onTaskKey(e, b.item)}>${b.item.words || t('Task')}</button><span id=${`cal-when-${b.item.at}`} hidden>${this.whenWords(b.item)}${b.done ? `, ${t('{n}% done', { n: b.done })}` : ''}</span></li>`)}
      </ol>
      <div class="cal-gantt-scroll" tabindex="0" role="group" aria-label=${t('Chart, scrolls sideways')} @scroll=${(e: Event) => (this.scrolled = Math.floor((e.target as HTMLElement).scrollLeft / z))}>
        <svg class="cal-chart" width=${width} height=${height} viewBox="0 0 ${width} ${height}" aria-hidden="true" @pointermove=${this.onBarMove} @pointerup=${this.onBarUp} @pointercancel=${() => (this.bar = null)}>
          ${Array.from({ length: to - from }, (_, k) => {
            const day = from + k;
            const { d, wd, y, m } = dayToYmd(day);
            return svg`${wd === 0 || wd === 6 ? svg`<rect class="weekend" x=${k * z} y=${HEAD} width=${z} height=${height - HEAD} />` : nothing}
              ${d === 1 || k === 0 ? svg`<text class="month" x=${k * z + 4} y="16">${months.format(Date.UTC(y, m - 1, 1))}</text>` : nothing}
              ${z >= 18 || wd === 1 ? svg`<text class="day" x=${k * z + z / 2} y="36" text-anchor="middle">${d}</text>` : nothing}
              <line class=${wd === 1 ? 'week' : 'tick'} x1=${k * z} y1=${wd === 1 ? 22 : HEAD} x2=${k * z} y2=${height} />`;
          })}
          <line class="head" x1="0" y1=${HEAD} x2=${width} y2=${HEAD} />
          ${now >= from && now < to ? svg`<line class="now" x1=${(now - from + 0.5) * z} y1="22" x2=${(now - from + 0.5) * z} y2=${height} />` : nothing}
          ${bars.map((b, i) => {
            const moving = drag && drag.at === b.item.at ? drag : null;
            const start = b.start + (moving?.how === 'move' ? moving.days : 0);
            const days = Math.max(1, b.days + (moving?.how === 'size' ? moving.days : 0));
            const x = (start - from) * z;
            const w = days * z;
            const y = HEAD + i * ROW + 8;
            const h = ROW - 16;
            const c = CAL_COLORS[b.item.color]?.hex ?? CAL_COLORS[''].hex;
            if (b.parent) return svg`<g class="bar parent"><path d="M${x} ${y + 4}h${w}v14l-7 -7h${-(w - 14)}l-7 7z" /></g>`;
            return svg`<g class="bar ${moving ? 'moving' : ''}" style="--c:${c}">
              <rect class="track" x=${x} y=${y} width=${w} height=${h} rx="5" data-at=${b.item.at} @pointerdown=${(e: PointerEvent) => this.onBarDown(e, b.item, 'move')} />
              ${b.done ? svg`<rect class="done" x=${x} y=${y} width=${(w * b.done) / 100} height=${h} rx="5" pointer-events="none" />` : nothing}
              ${b.item.kind === 'd' ? svg`<rect class="grip" x=${x + w - 10} y=${y} width="16" height=${h} data-at=${b.item.at} @pointerdown=${(e: PointerEvent) => this.onBarDown(e, b.item, 'size')} />` : nothing}
            </g>`;
          })}
        </svg>
      </div>
    </div>`;
  }

  /** The dialog over the calendar; its body is drawn while it is open. */
  private renderDialog() {
    const e = this.editing;
    const task = this.view.gantt;
    const heading = e?.item ? (task ? t('Edit task') : t('Edit event')) : task ? t('New task') : t('New event');
    return html`<to-dialog class="cal-dialog" heading=${heading} @to-close=${() => (this.editing = null)} .body=${e ? this.renderFields(e) : nothing}></to-dialog>`;
  }
  private renderFields(e: Editing) {
    const s = e.d;
    const f = this.fields(s);
    const timed = s.kind === 't';
    const r = s.repeat;
    const task = this.view.gantt;
    const colour = CAL_COLORS[s.color] ?? CAL_COLORS[''];
    return html`<div class="cal-form" @keydown=${(ev: KeyboardEvent) => ev.key === 'Enter' && (ev.target as HTMLElement).tagName === 'INPUT' && (ev.preventDefault(), this.done())}>
      <div class="cal-field cal-what"><span>${t('What')}</span>
        <to-text class="cal-label" shape="line" .blocks=${[e.block]} label=${t('What')} placeholder=${task ? t('Task') : t('Event')} @text-ops=${this.onLabelOps} @text-enter=${(ev: Event) => (ev.stopPropagation(), this.done())}></to-text>
      </div>
      <label class="to-switch cal-allday"><input type="checkbox" .checked=${!timed} @change=${(ev: Event) => this.setAllDay((ev.target as HTMLInputElement).checked)} /><span class="to-switch-words">${t('All day')}</span></label>
      <div class="cal-field"><span>${t('Starts')}</span>
        <span class="cal-inputs">
          <input type="date" aria-label=${t('Start date')} .value=${f.sd} @change=${(ev: Event) => this.setStart((ev.target as HTMLInputElement).value, f.st)} />
          ${timed ? html`<input type="time" aria-label=${t('Start time')} .value=${f.st} @change=${(ev: Event) => this.setStart(f.sd, (ev.target as HTMLInputElement).value)} />` : nothing}
        </span>
      </div>
      <div class="cal-field"><span>${t('Ends')}</span>
        <span class="cal-inputs">
          <input type="date" aria-label=${t('End date')} .value=${f.ed} min=${f.sd} @change=${(ev: Event) => this.setEnd((ev.target as HTMLInputElement).value, f.et)} />
          ${timed ? html`<input type="time" aria-label=${t('End time')} .value=${f.et} @change=${(ev: Event) => this.setEnd(f.ed, (ev.target as HTMLInputElement).value)} />` : nothing}
        </span>
      </div>
      ${timed ? html`<p class="to-hint">${t('Times in {zone}', { zone: `${this.zone.replace(/_/g, ' ')} (${zoneAbbr(spanStartMs(s), this.zone)})` })}</p>` : nothing}
      <div class="cal-field"><span>${t('Colour')}</span>
        <span class="cal-swatches" role="group" aria-label=${t('Colour')}>${Object.entries(CAL_COLORS).map(([k, c]) => html`<button type="button" class="to-btn to-tool cal-swatch" aria-pressed=${String(s.color === k)} aria-label=${this.view.legend[k] ? `${c.name()}: ${this.view.legend[k]}` : c.name()} title=${this.view.legend[k] ?? c.name()} @click=${() => ((this.ink = k), this.patch({ color: k }))}><span class="to-swatch" style="--swatch:${c.hex}"></span></button>`)}</span>
      </div>
      <label class="cal-field"><span>${t('{colour} stands for', { colour: colour.name() })}</span><input type="text" class="cal-legend-name" maxlength="24" placeholder=${t('A name (yours, say)')} .value=${e.legend} @input=${(ev: Event) => this.editing && (this.editing = { ...this.editing, legend: (ev.target as HTMLInputElement).value })} /></label>
      <label class="cal-field"><span>${t('Repeats')}</span>
        <select @change=${(ev: Event) => {
          const val = (ev.target as HTMLSelectElement).value;
          this.setRepeat(val === 'never' ? '' : (val as Every));
        }}>
          <option value="never" ?selected=${!r}>${t('Never')}</option>
          ${(Object.keys(EVERY) as Every[]).map((k) => html`<option value=${k} ?selected=${r?.every === k}>${everyText(k)}</option>`)}
        </select>
      </label>
      ${r
        ? html`<div class="cal-field"><span>${t('Stops')}</span><span class="cal-inputs">
            <input type="number" class="cal-times" min="1" max="999" inputmode="numeric" aria-label=${t('How many times')} placeholder="∞" .value=${r.count ? String(r.count) : ''} @change=${(ev: Event) => this.setRepeat(r.every, { count: +(ev.target as HTMLInputElement).value })} />
            <span class="to-hint">${t('times, or on')}</span>
            <input type="date" aria-label=${t('Last day')} .value=${r.until !== undefined ? dayString(r.until) : ''} @change=${(ev: Event) => this.setRepeat(r.every, { until: (ev.target as HTMLInputElement).value })} />
          </span></div>`
        : nothing}
      ${task || s.done
        ? html`<label class="cal-field"><span>${t('Done %')}</span><input type="number" class="cal-done" min="0" max="100" step="10" inputmode="numeric" .value=${String(s.done)} @change=${(ev: Event) => this.patch({ done: Math.max(0, Math.min(100, Math.round(+(ev.target as HTMLInputElement).value) || 0)) })} /></label>`
        : nothing}
      <div class="to-row cal-actions">
        ${e.item ? btn({ label: t('Delete'), icon: UI.trash, cls: 'cal-delete', does: this.removeDraft }) : nothing}
        ${btn({ label: t('Done'), icon: UI.check, cls: 'primary cal-done-btn', does: this.done })}
      </div>
    </div>`;
  }
}
if (!customElements.get(tag)) customElements.define(tag, ToCalEditor);

declare global {
  interface HTMLElementTagNameMap {
    'to-cal-editor': ToCalEditor;
  }
}
