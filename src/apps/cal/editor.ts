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
 *
 * The month is a grid of days (docs/editing.md §8: a tap on an entry opens its dialog): the arrows walk the days,
 * PageUp/PageDown the months, Shift+arrows sweep a run of days that Enter makes a span over. A focused entry is the
 * thing in hand: Delete takes it out, Mod+D makes another, Mod+C/X/V copy, cut and paste it as TLO and our HTML.
 * The schedule's tasks are rows (§6, the kit's rows.ts): their words are typed in place and behave as an outline's
 * (Enter makes the next task, Backspace at the start joins), a tap on the grip chooses a task, and chosen tasks have
 * the contextual bar; Mod+Alt+Left/Right move a task a day, Alt+Enter opens its dates. An undo puts back the
 * caret, the chosen tasks or the month of what changed.
 */
import { html, nothing, svg, type PropertyDeclarations } from 'lit';
import { CalendarDays, ChartGantt, Check, CopyPlus, GripVertical, Grid3x3, Repeat as RepeatIcon } from 'lucide';
import { applyAll, dayToYmd, family, parse, placeFamily, runLength, write, ymdString, ymdToDay, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { btn, cmdBtn, cmdMenu, dateNav } from '../../kit/ui/bar.ts';
import { drawnIn, labelOf, run, runKey } from '../../kit/core/commands.ts';
import COMMANDS, { AT } from './commands.ts';
import { clipText, docToHtml, GENERATOR, htmlToBlocks } from '../../kit/text/clipboard.ts';
import type { ContextEntry } from '../../kit/ui/context.ts';
import type { ToDialog } from '../../kit/ui/dialog.ts';
import { DocElement, firstAt, type Entry } from '../../kit/core/element.ts';
import { Rows, type Clip, type DropHow, type RowItem, type RowRange, type RowSpan } from '../../kit/text/rows.ts';
import { icon, UI, type IconNode } from '../../kit/draw/icons.ts';
import { t } from '../../kit/core/i18n.ts';
import { dateWords } from '../../kit/core/dates.ts';
import { caret } from '../../kit/text/textops.ts';
import type { TextOps, ToText } from '../../kit/text/text.ts';
import {
  CAL_COLORS,
  copyTasks,
  duplicateTasks,
  enterTask,
  joinTask,
  mapAt,
  moveTasks,
  pasteItems,
  setLabel,
  shiftTasks,
  toggleDone,
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
  type Li,
} from './model.ts';
import { allZones, clockString, dayString, isValidZone, localZone, pad2, partsToUtc, utcToParts, zoneAbbr } from './tz.ts';
import '../../kit/ui/bar.ts';
import '../../kit/ui/dialog.ts';
import '../../kit/ui/insert.ts';
import '../../kit/ui/menu.ts';
import '../../kit/text/text.ts';
import '../../kit/ui/context.ts';
import { remScale } from '../../kit/ui/zoom.ts';
import './style.css';

export const tag = 'to-cal-editor';

type Mode = 'month' | 'year';
/** Where the selection was before an edit, handed back to undone(): tasks chosen whole, or the caret in a task's words. */
type Mark = { range: RowRange<number> } | { at: number; offset: number };
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

/** Keep a pointer's moves coming here; a pointer the browser no longer knows (lifted already) is let go. */
function capture(el: Element, id: number) {
  try {
    el.setPointerCapture(id);
  } catch {
    // Nothing to hold on to.
  }
}

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
    focusDay: { state: true },
    sweep: { state: true },
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
  /** The day the month's arrows are on (the one day button in the tab order); -1 for today or the month's first. */
  declare focusDay: number;
  /** Days swept by Shift+arrows on the month, for Enter to make a span over. */
  declare sweep: { from: number; to: number } | null;
  /** Where the focus goes back to when the dialog closes. */
  private opener: (() => HTMLElement | null) | null = null;
  /** One array per task block, so a row's words see the same `blocks` until the task changes. */
  private wordBlocks = new WeakMap<Li, Block[]>();
  /** The schedule's tasks as rows chosen whole: the kit's one implementation (keys, grip, drag, clipboard, the bar). */
  readonly rows = new Rows<number>(this, {
    rows: () => this.taskRows(),
    box: () => this.querySelector<HTMLElement>('.cal-tasks'),
    handle: '.cal-grip',
    nests: true,
    contextClass: 'cal-context',
    label: t('common-chosen-tasks'),
    current: () => (this.view.gantt && this.view.items.some((i) => i.at === this.cur) ? this.cur : null),
    edit: (at, offset) => this.focusWords(at, offset),
    remove: (s) => this.removeTasks(s),
    canMove: (s, by) => !!moveTasks(this.doc, s, by),
    move: (s, by) => this.rangeEdit(moveTasks(this.doc, s, by)),
    canShift: (s, by) => !!shiftTasks(this.doc, s, by),
    shift: (s, by) => this.rangeEdit(shiftTasks(this.doc, s, by)),
    duplicate: (s) => this.duplicateRange(s),
    copy: (s) => this.clip(copyTasks(this.doc, s)),
    paste: (data, s) => this.pasteData(data, s),
    drop: (at, to, how) => this.dropTask(at, to, how),
    extra: (s) => this.dayItems(s),
  });
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
    this.focusDay = -1;
    this.sweep = null;
    const now = utcToParts(Date.now(), this.zone);
    this.shown = { y: now.y, m: now.m };
  }

  protected read(doc: Doc): CalView {
    return readCal(doc);
  }
  connectedCallback() {
    super.connectedCallback();
    // The month, the year and the schedule are moved through by the bar, and the words are typed in a dialog: on a phone
    // the bar is shown whatever has the focus, as the Calculator's is (Paul, 2026-10-12: "Keep the navigation elements
    // for the calendar open all the time. It has a different editor pattern"; kit/ui/chrome.ts).
    this.dataset.bar = 'always';
    // Capturing, at the editor itself: before DocElement answers an undo the open dialog's draft would be left behind by.
    this.addEventListener('docundo', this.onHistory, true);
    this.addEventListener('docredo', this.onHistory, true);
    this.addEventListener('keydown', this.onKey);
    for (const type of ['copy', 'cut', 'paste']) document.addEventListener(type, this.onClipboard as EventListener);
    // Capturing: before a task's own words hear a paste of lines.
    this.addEventListener('paste', this.onWordsPaste, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('docundo', this.onHistory, true);
    this.removeEventListener('docredo', this.onHistory, true);
    this.removeEventListener('keydown', this.onKey);
    for (const type of ['copy', 'cut', 'paste']) document.removeEventListener(type, this.onClipboard as EventListener);
    this.removeEventListener('paste', this.onWordsPaste, true);
  }
  /** While the dialog is open its draft is the thing being edited: the document's history waits (a field keeps its own undo). */
  private onHistory = (e: Event) => {
    if (this.editing) e.stopImmediatePropagation();
  };
  /** Every edit carries where the selection was: the chosen tasks, or the caret in a task's words. */
  edit(ops: Op[], key?: string, mark?: unknown) {
    super.edit(ops, key, mark ?? this.markNow());
  }
  private markNow(): Mark | undefined {
    if (this.rows.range) return { range: { ...this.rows.range } };
    const tx = (document.activeElement as HTMLElement | null)?.closest?.<ToText>('.cal-trow to-text');
    const at = Number(tx?.closest<HTMLElement>('.cal-trow')?.dataset.at ?? -1);
    return tx && this.contains(tx) && at >= 0 ? { at, offset: tx.sel?.focus.offset ?? 0 } : undefined;
  }
  /** After an undo: the chosen tasks or the caret back as they were; else the task, or the month, of what changed. */
  protected undone(entry: Entry, redo: boolean) {
    this.rows.release();
    this.sweep = null;
    const ok = (at: number) => this.view.items.some((i) => i.at === at);
    const mark = entry.mark as Mark | undefined;
    if (this.view.gantt) {
      if (mark && 'range' in mark) {
        const r = redo ? { anchor: mapAt(entry.ops, mark.range.anchor), focus: mapAt(entry.ops, mark.range.focus) } : mark.range;
        if (ok(r.anchor) && ok(r.focus)) return void this.updateComplete.then(() => this.rows.select(r));
      } else if (mark && !redo && ok(mark.at)) return this.focusWords(mark.at, mark.offset);
    }
    const first = firstAt(entry);
    const near = [...this.view.items].reverse().find((i) => i.at <= first) ?? this.view.items[0];
    if (!near || first < 0) return;
    if (this.view.gantt) return this.focusWords(near.at);
    if (this.mode !== 'month') return;
    this.showDay(spanDays(near, this.zone)[0]);
    void this.updateComplete.then(() => this.querySelector<HTMLElement>(`.cal-chip[data-at="${near.at}"]`)?.focus({ preventScroll: true }));
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
  setMode(mode: Mode | 'gantt') {
    if (mode === 'gantt') return this.edit(setGantt(this.view, true));
    this.mode = mode;
    this.edit(setGantt(this.view, false));
  }
  /** The zone repeats keep their time of day in: the document's, or, with none named, this reader's own. */
  private get repeatZone() {
    return this.view.tz;
  }

  /* ---------- the dialog ---------- */

  /**
   * The dialog over a draft. The focus comes back on close to what had it (a day, an entry, a task), or, when a tap
   * on something that takes no focus opened it, to `back`: the day's button, the entry, the task's grip.
   */
  private async openDraft(item: Item | null, d: Draft, after?: Item, back?: string) {
    const had = document.activeElement as HTMLElement | null;
    const mine = had && had !== document.body && this.contains(had) ? had : null;
    this.opener = () => (mine?.isConnected ? mine : back ? this.querySelector<HTMLElement>(back) : null);
    this.rows.release();
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
  private open(item: Item, back?: string) {
    if (this.dragged) return;
    this.cur = item.at;
    void this.openDraft(item, draftOf(item), undefined, back ?? (this.view.gantt ? `.cal-trow[data-at="${item.at}"] .cal-grip` : `.cal-chip[data-at="${item.at}"]`));
  }
  /** A new span over these days (in the colour new spans take), or a new task after the current one. */
  create(from: number, to = from) {
    this.sweep = null;
    void this.openDraft(null, newDraft(from, to, this.ink), undefined, `.cal-cell[data-day="${Math.min(from, to)}"] .cal-n`);
  }
  createTask() {
    const cur = this.view.items.find((i) => i.at === this.cur) ?? this.view.items.at(-1);
    const bar = cur && ganttBars(this.view).find((b) => b.item === cur);
    const start = bar ? bar.start + bar.days : this.todayDay();
    void this.openDraft(null, { ...newDraft(start, start + 2, this.ink) }, cur);
  }
  /** The dialog closed (Done, Delete, Escape, the backdrop): the draft goes and the focus goes back where it came from. */
  private onDialogClose = async () => {
    this.editing = null;
    const back = this.opener;
    this.opener = null;
    await this.updateComplete;
    back?.()?.focus({ preventScroll: true });
  };
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
    if (e?.item) {
      // The thing is gone: the focus goes to its day (or its task's neighbour) instead.
      const day = spanDays(e.item, this.zone)[0];
      this.opener = this.view.gantt ? () => this.querySelector<HTMLElement>('.cal-trow .cal-grip') : () => this.querySelector<HTMLElement>(`.cal-cell[data-day="${day}"] .cal-n`);
    }
    this.close();
    if (e?.item) this.edit(removeSpan(this.doc, e.item));
  };
  /** The draft as another span or task beside it (the one it came from as it was): the dialog's Duplicate, for a finger as for keys. */
  private duplicateDraft = () => {
    const e = this.editing;
    if (!e?.item) return;
    this.editing = null;
    this.close();
    this.edit(putItem(this.doc, this.view, null, e.d, this.zone, this.view.gantt ? e.item : undefined));
    this.showMonthOf(e.d);
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
      if (!this.drag.moved) capture(e.currentTarget as Element, e.pointerId);
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
    capture(e.currentTarget as Element, e.pointerId);
    this.cur = b.at;
    this.bar = { at: b.at, how, x0: e.clientX, days: 0, id: e.pointerId };
  }
  private onBarMove = (e: PointerEvent) => {
    const d = this.bar;
    if (!d || e.pointerId !== d.id) return;
    const days = Math.round((e.clientX - d.x0) / (this.zoom * remScale()));
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
  /* ---------- the schedule's tasks as rows (kit/text/rows.ts) ---------- */

  /** The tasks on screen as the rows controller takes them: each with its row and its family's blocks. */
  private taskRows(): RowItem<number>[] {
    if (!this.view.gantt) return [];
    const host = this;
    return this.view.items.map((i) => ({
      id: i.at,
      span: { from: i.at, to: family(this.doc, i.at) },
      get el() {
        return host.querySelector<HTMLElement>(`.cal-trow[data-at="${i.at}"]`)!;
      },
    }));
  }
  private item(at: number): Item | undefined {
    return this.view.items.find((i) => i.at === at);
  }
  /** Where a person starts: today's day in the month (else the month's first), the first task's words in a Gantt chart, today in the year. */
  async focusFirst() {
    await this.updateComplete;
    if (this.view.gantt) {
      const row = this.querySelector<HTMLElement>('.cal-trow[data-at]');
      if (row) return this.focusWords(Number(row.dataset.at));
      return this.querySelector<HTMLElement>('.cal-gantt-scroll')?.focus({ preventScroll: true });
    }
    const day =
      this.mode === 'year'
        ? (this.querySelector<HTMLElement>('.cal-year [aria-current=date]') ?? this.querySelector<HTMLElement>('.cal-year button'))
        : this.querySelector<HTMLElement>('.cal-n[tabindex="0"]');
    day?.focus({ preventScroll: true });
  }
  /** The caret into a task's words (at the end, or at `offset`). */
  private focusWords(at: number, offset: number | 'end' = 'end') {
    this.cur = at;
    void this.updateComplete.then(() => {
      const tx = this.querySelector<ToText>(`.cal-trow[data-at="${at}"] to-text`);
      const it = this.item(at);
      if (!tx || !it) return;
      const len = runLength(it.label);
      tx.sel = caret(0, offset === 'end' ? len : Math.min(offset, len));
    });
  }
  private caretIn(at: number): number {
    const tx = this.querySelector<ToText>(`.cal-trow[data-at="${at}"] to-text`);
    return tx?.sel?.focus.offset ?? runLength(this.item(at)?.label ?? []);
  }
  private blocksFor(i: Item): Block[] {
    let arr = this.wordBlocks.get(i.block);
    if (!arr) this.wordBlocks.set(i.block, (arr = [{ k: 'p', runs: i.label }]));
    return arr;
  }
  /** Chosen tasks taken away, families and all; the caret to the task before (or after). */
  private removeTasks(s: RowSpan) {
    const before = [...this.view.items].reverse().find((i) => i.at < s.from);
    const next = this.view.items.find((i) => i.at >= s.to);
    this.edit([{ op: 'splice', at: s.from, n: s.to - s.from, blocks: [] }]);
    if (before) this.focusWords(before.at);
    else if (next) this.focusWords(next.at - (s.to - s.from), 0);
  }
  /** An edit of the chosen tasks that keeps them chosen, where it put them. */
  private rangeEdit(ops: Op[] | null): RowRange<number> | null {
    const r = this.rows.range;
    if (!ops || !r) return r;
    this.edit(ops);
    return { anchor: mapAt(ops, r.anchor), focus: mapAt(ops, r.focus) };
  }
  private duplicateRange(s: RowSpan): RowRange<number> | null {
    const r = this.rows.range;
    const d = duplicateTasks(this.doc, s);
    this.edit(d.ops);
    return r && { anchor: r.anchor - s.from + d.at, focus: r.focus - s.from + d.at };
  }
  /** A task carried by its grip onto another: under it (the right half of the row) or after its family. */
  private dropTask(at: number, to: number, how: DropHow) {
    const ops = placeFamily(this.doc, at, to, how);
    if (!ops) return;
    this.edit(ops);
    this.focusWords(mapAt(ops, at));
  }
  /** Chosen tasks a day earlier or later (the schedule's columns are days: Mod+Alt+Left/Right), or their dates (commands.ts). */
  private dayItems(_s: RowSpan): ContextEntry[] {
    return drawnIn(AT('rows'), 'context', this);
  }
  nudgeChosen(by: 1 | -1) {
    const s = this.rows.span();
    if (s) this.nudge(s, by);
  }
  datesChosen() {
    const s = this.rows.span();
    if (s) this.openTask(this.rows.range?.focus ?? s.from);
  }
  private nudge(s: RowSpan, by: 1 | -1) {
    const ops = this.view.items.filter((i) => i.at >= s.from && i.at < s.to).flatMap((i) => moveItem(this.view, i, by));
    this.edit(ops);
  }
  private openTask(at: number) {
    const it = this.item(at);
    if (it) this.open(it, `.cal-trow[data-at="${at}"] .cal-grip`);
  }

  /* ---------- a task's words, typed in place ---------- */

  private onWordsOps(was: Item, e: CustomEvent<TextOps>) {
    e.stopPropagation();
    const i = this.item(was.at) ?? was;
    const block = applyAll({ head: {}, blocks: [this.blocksFor(i)[0]] }, e.detail.ops).blocks[0];
    const runs: Run[] = 'runs' in block ? block.runs : [];
    // Words never start with a space: the "when" before them would swallow it.
    const label = runs.length && /^\s/.test(runs[0].t) ? [{ ...runs[0], t: runs[0].t.trimStart() }, ...runs.slice(1)].filter((r) => r.t) : runs;
    this.edit(setLabel(this.view, i, label), e.detail.kind === 'type' ? `type:${i.at}` : undefined);
  }
  private onWordsEnter(was: Item, e: Event) {
    e.stopPropagation();
    const i = this.item(was.at) ?? was;
    const r = enterTask(this.doc, this.view, i, this.caretIn(i.at));
    this.edit(r.ops);
    this.focusWords(r.at, r.offset);
  }
  private onWordsExit(was: Item, e: CustomEvent<{ dir: 'back' | 'forward' }>) {
    e.stopPropagation();
    const i = this.item(was.at) ?? was;
    const r = joinTask(this.doc, this.view, i, e.detail.dir);
    if (!r) return;
    this.edit(r.ops);
    if (r.at >= 0) this.focusWords(r.at, r.offset);
  }
  /** Keys in a task's words (commands.ts; the rows controller has had Shift+arrows, Escape and the range's keys): what the task's block `here` gets. */
  taskKey(what: 'nest' | 'move' | 'step' | 'duplicate' | 'tick' | 'earlier' | 'later' | 'dates', e?: Event): boolean {
    const at = this.here?.at ?? -1;
    const i = this.item(at);
    if (!i) return false;
    const offset = this.caretIn(at);
    const span = { from: at, to: family(this.doc, at) };
    const up = e instanceof KeyboardEvent && (e.key === 'ArrowUp' || e.shiftKey);
    let ops: Op[] | null = null;
    let to = at;
    if (what === 'nest') {
      ops = shiftTasks(this.doc, span, up ? -1 : 1);
      // Tab moves on as Tab does when there is no nesting to do.
      if (!ops) return false;
    } else if (what === 'move') {
      ops = moveTasks(this.doc, span, up ? -1 : 1);
      if (ops) to = mapAt(ops, at);
    } else if (what === 'step') {
      const next = this.view.items[this.view.items.indexOf(i) + (up ? -1 : 1)];
      if (next) this.focusWords(next.at, offset);
      return true;
    } else if (what === 'duplicate') {
      const d = duplicateTasks(this.doc, span);
      ops = d.ops;
      to = d.at;
    } else if (what === 'tick') ops = toggleDone(this.view, i);
    else if (what === 'earlier' || what === 'later') ops = moveItem(this.view, i, what === 'earlier' ? -1 : 1);
    else return (this.openTask(at), true);
    if (!ops?.length) return true;
    this.edit(ops);
    this.focusWords(to, offset);
    return true;
  }

  /* ---------- keys ---------- */

  /** What a key is on, while the commands answer it (commands.ts): a task's block, a day, an entry. */
  here: { at?: number; day?: number; el?: HTMLElement } | null = null;
  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.isComposing) return;
    const el = e.target as HTMLElement;
    if (el.closest('dialog, [popover], to-bar, to-context, input, select, textarea')) return;
    const words = el.closest<HTMLElement>('.cal-trow to-text');
    const day = el.closest<HTMLElement>('.cal-n');
    const thing = el.closest<HTMLElement>('.cal-chip, .cal-agenda-item');
    // Chosen tasks: a day earlier or later, or their dates (the rest of a range's keys are the rows controller's).
    const [where, here] = words
      ? (['words', { at: Number(words.closest<HTMLElement>('.cal-trow')!.dataset.at) }] as const)
      : this.rows.range
        ? (['rows', {}] as const)
        : day
          ? (['day', { day: Number(day.closest<HTMLElement>('.cal-cell')!.dataset.day) }] as const)
          : thing
            ? (['entry', { el: thing }] as const)
            : ([null, null] as const);
    if (!where) return;
    this.here = here;
    try {
      runKey(e, AT(where), this);
    } finally {
      this.here = null;
    }
  };
  /** Enter over a sweep of days: an event over them. */
  makeSweep() {
    if (this.sweep) this.create(this.sweep.from, this.sweep.to);
  }
  /** The month's days: arrows by a day and a week, PageUp/PageDown by a month, Home/End the week's ends; with Shift a sweep, which Enter makes a span over. */
  walkDay(e: KeyboardEvent): boolean {
    const day = this.here?.day;
    if (day === undefined) return false;
    const k = e.key;
    const p = dayToYmd(day);
    const wd = (p.wd - this.week0 + 7) % 7;
    const to: Record<string, number> = {
      ArrowLeft: day - 1,
      ArrowRight: day + 1,
      ArrowUp: day - 7,
      ArrowDown: day + 7,
      Home: day - wd,
      End: day - wd + 6,
      PageUp: ymdToDay(p.y, p.m - 1, Math.min(p.d, ymdToDay(p.y, p.m, 1) - ymdToDay(p.y, p.m - 1, 1))),
      PageDown: ymdToDay(p.y, p.m + 1, Math.min(p.d, ymdToDay(p.y, p.m + 2, 1) - ymdToDay(p.y, p.m + 1, 1))),
    };
    const n = to[k];
    if (n === undefined) return false;
    this.sweep = e.shiftKey && k.startsWith('Arrow') ? { from: this.sweep?.from ?? day, to: n } : null;
    this.goToDay(n);
    return true;
  }
  private goToDay(day: number) {
    this.focusDay = day;
    const p = dayToYmd(day);
    if (p.y !== this.shown.y || p.m !== this.shown.m) this.shown = { y: p.y, m: p.m };
    void this.updateComplete.then(() => this.querySelector<HTMLElement>(`.cal-cell[data-day="${day}"] .cal-n`)?.focus());
  }
  /** The day the month's arrows start from: the one last walked to, else today, else the month's first. */
  private rovingDay(first: number, last: number): number {
    if (this.focusDay >= first && this.focusDay <= last) return this.focusDay;
    const today = this.todayDay();
    return today >= first && today <= last ? today : first;
  }
  /** A focused entry (on a day or in the month's list): Delete takes it out, Mod+D makes another; the focus stays near. */
  entryKey(what: 'delete' | 'duplicate'): boolean {
    const el = this.here?.el;
    const it = el && this.item(Number(el.dataset.at));
    if (!el || !it) return false;
    const sel = el.classList.contains('cal-chip') ? '.cal-chip' : '.cal-agenda-item';
    const k = [...this.querySelectorAll<HTMLElement>(sel)].indexOf(el);
    if (what === 'delete') {
      const day = spanDays(it, this.zone)[0];
      this.edit(removeSpan(this.doc, it));
      void this.updateComplete.then(() => {
        const left = [...this.querySelectorAll<HTMLElement>(sel)];
        (left[k] ?? left[k - 1] ?? this.querySelector<HTMLElement>(`.cal-cell[data-day="${day}"] .cal-n`))?.focus();
      });
    } else {
      const ops = putItem(this.doc, this.view, null, draftOf(it), this.zone);
      this.edit(ops);
      const at = ops.find((o) => o.op === 'splice')?.at ?? -1;
      void this.updateComplete.then(() => this.querySelector<HTMLElement>(`${sel}[data-at="${at}"]`)?.focus());
    }
    return true;
  }

  /* ---------- the clipboard ---------- */

  /** Blocks as the clipboard holds them: TLO text, and our HTML with the generator's mark. */
  private clip(blocks: Block[]): Clip {
    return { text: write({ head: {}, blocks }), html: docToHtml(blocks) };
  }
  /** What was pasted, as blocks: our HTML or plain text read as TLO, HTML from elsewhere as blocks. */
  private blocksOf(data: Clip): Block[] {
    const theirs = data.html.trim() && !data.html.includes(`content="${GENERATOR}"`);
    const fromHtml = theirs ? htmlToBlocks(data.html) : [];
    return fromHtml.length ? fromHtml : parse(clipText(data).replace(/\r\n?/g, '\n')).blocks;
  }
  /** Pasted onto chosen tasks (in their place), after a task (`at`), or onto the month (on `day`, or on their own dates). */
  private pasteData(data: Clip, s: RowSpan | null, day?: number, after?: number) {
    const blocks = this.blocksOf(data);
    const fallback = this.picked >= 0 ? this.picked : this.todayDay();
    const end = after !== undefined ? family(this.doc, after) : this.doc.blocks.length;
    const target = s ?? (this.view.gantt ? { from: end, to: end } : null);
    const depth = after !== undefined ? this.item(after)?.depth : undefined;
    const r = pasteItems(this.doc, this.view, blocks, target, fallback, day, depth);
    if (!r) return false;
    this.edit(r.ops);
    if (this.view.gantt) this.focusWords(r.to - 1);
    else {
      const first = readCal(this.doc).items.find((i) => i.at === r.from);
      if (first && this.mode === 'month') this.showDay(spanDays(first, this.zone)[0]);
    }
    return true;
  }
  /** Lines or list items pasted into a task's words are tasks after it, on its first day unless they say their own. */
  private onWordsPaste = (e: ClipboardEvent) => {
    const dt = e.clipboardData;
    const row = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('.cal-trow');
    if (!dt || !row || this.rows.range) return;
    const text = dt.getData('text/plain').replace(/\r\n?/g, '\n');
    const lines = text.split('\n').filter((l) => l.trim());
    if (!(lines.length > 1 || /^\s*(?:[-*+]|\d+[.)])\s/.test(lines[0] ?? ''))) return;
    const it = this.item(Number(row.dataset.at));
    if (!it) return;
    e.preventDefault();
    e.stopPropagation();
    this.pasteData({ text, html: dt.getData('text/html') }, null, spanDays(it, this.zone)[0], it.at);
  };
  /**
   * Copy, cut and paste of the thing in hand that the rows controller (chosen tasks) and the words do not take: a focused
   * entry on the month is copied as its item; a paste onto a focused day lands there, onto an entry or the page keeps
   * its dates; lines or list items pasted into a task's words are tasks after it.
   */
  private onClipboard = (e: ClipboardEvent) => {
    const dt = e.clipboardData;
    if (!dt || e.defaultPrevented || this.editing || !this.isConnected) return;
    const at = e.target as HTMLElement | null;
    const active = document.activeElement as HTMLElement | null;
    const el = at && at !== document.body && at !== document.documentElement ? at : active;
    const inside = !el || el === document.body || this.contains(el);
    if (!inside || el?.closest?.('dialog, [popover], input, textarea, select, to-bar')) return;
    const data = { text: dt.getData('text/plain').replace(/\r\n?/g, '\n'), html: dt.getData('text/html') };
    if (el?.closest?.('to-text, .cal-trow')) return;
    const thing = el?.closest?.<HTMLElement>('.cal-chip, .cal-agenda-item');
    const it = thing ? this.item(Number(thing.dataset.at)) : undefined;
    if (e.type === 'paste') {
      if (this.view.gantt) return;
      const dayEl = el?.closest?.<HTMLElement>('.cal-cell');
      const onDay = el?.closest?.('.cal-n') && dayEl ? Number(dayEl.dataset.day) : undefined;
      if (this.pasteData(data, null, onDay)) e.preventDefault();
      return;
    }
    if (!it) return;
    e.preventDefault();
    const c = this.clip(copyTasks(this.doc, { from: it.at, to: it.at + 1 }));
    dt.setData('text/plain', c.text);
    dt.setData('text/html', c.html);
    if (e.type === 'cut') {
      this.edit(removeSpan(this.doc, it));
      const day = spanDays(it, this.zone)[0];
      void this.updateComplete.then(() => this.querySelector<HTMLElement>(`.cal-cell[data-day="${day}"] .cal-n`)?.focus());
    }
  };
  /** The schedule's first day: two before the earliest task. */
  private ganttFrom(): number {
    const range = ganttRange(ganttBars(this.view));
    return (range?.from ?? this.todayDay()) - 2;
  }
  private scrollDays(by: number, to?: number) {
    const box = this.querySelector<HTMLElement>('.cal-gantt-scroll');
    if (!box) return;
    // A day is `zoom` of the chart's own pixels, drawn as sixteenths of a rem.
    const day = this.zoom * remScale();
    box.scrollLeft = to === undefined ? box.scrollLeft + by * day : Math.max(0, (to - this.ganttFrom() - 1) * day);
    this.scrolled = Math.floor(box.scrollLeft / day);
  }

  /* ---------- the bar ---------- */

  /** Insert ▾ Event: on the day picked, else today where it is shown, else the month's first. */
  createEvent() {
    const day =
      this.picked >= 0
        ? this.picked
        : ymdToDay(this.shown.y, this.shown.m, 1) <= this.todayDay() && this.todayDay() < ymdToDay(this.shown.y, this.shown.m + 1, 1)
          ? this.todayDay()
          : ymdToDay(this.shown.y, this.shown.m, 1);
    this.create(day);
  }
  /** Back (-1) or on (1): a week of the schedule, a year, a month. */
  page(by: -1 | 1) {
    if (this.view.gantt) this.scrollDays(7 * by);
    else if (this.mode === 'year') this.shown = { ...this.shown, y: this.shown.y + by };
    else this.shiftMonth(by);
  }
  /** Today on view (and, in a month, no day picked). */
  toToday() {
    if (this.view.gantt) return this.scrollDays(0, this.todayDay());
    if (this.mode !== 'year') this.picked = -1;
    this.showDay(this.todayDay());
  }
  private nav() {
    const own = (id: string) => COMMANDS.find((c) => c.id === `cal.${id}`)!;
    const p = this.view.gantt ? dayToYmd(this.ganttFrom() + this.scrolled) : this.shown;
    const label = this.view.gantt || this.mode !== 'year' ? this.monthName(p.y, p.m) : String(this.shown.y);
    return dateNav({
      label,
      prev: labelOf(own('prev'), this),
      next: labelOf(own('next'), this),
      onPrev: () => run(own('prev'), this),
      onNext: () => run(own('next'), this),
      onToday: () => run(own('today'), this),
    });
  }
  private monthName(y: number, m: number) {
    return dateWords({ month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, 1));
  }
  openZones = async () => {
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
    const own = (id: string) => COMMANDS.find((c) => c.id === `cal.${id}`)!;
    return html`<to-bar class="cal-bar">
        ${this.nav()}
        ${cmdMenu(own('view'), this, COMMANDS, 'cal-view', { icon: v.gantt ? ChartGantt : this.mode === 'year' ? Grid3x3 : CalendarDays })}
        <to-insert data-tool-group="insert" .items=${drawnIn(COMMANDS, 'menu:insert', this)}></to-insert>
        ${cmdMenu(own('ink'), this, COMMANDS, 'cal-ink', { icon: dot(ink.hex) })}
        ${cmdBtn(own('zone'), this, { cls: 'cal-zone', keep: false })}
        ${this.undoTools()}
      </to-bar>
      ${v.gantt ? this.renderGantt() : this.mode === 'year' ? this.renderYear() : this.renderMonth()}
      ${this.rows.renderContext()}
      ${this.renderDialog()}
      <to-dialog class="cal-zones" heading=${t('cal-time-zone')} .body=${html`
        <label class="cal-field"><span>${t('cal-show-times-in')}</span>
          <select aria-label=${t('cal-time-zone')} @change=${(e: Event) => {
            const z = (e.target as HTMLSelectElement).value;
            if (isValidZone(z)) this.zone = z;
          }}>${(this.zones ?? []).map((z) => html`<option value=${z} ?selected=${z === this.zone}>${z.replace(/_/g, ' ')}</option>`)}</select>
        </label>
        <p class="to-hint">
          ${docZone ? t('cal-this-calendar-is-written-in', { zone: docZone.replace(/_/g, ' ') }) : t('cal-this-calendar-names-no-time', { zone: v.tz.replace(/_/g, ' ') })}
        </p>
        <div class="to-row">
          ${docZone && docZone !== this.zone ? btn({ label: t('cal-its-own-zone'), does: () => (this.zone = docZone) }) : nothing}
          ${this.zone !== localZone() ? btn({ label: t('cal-my-zone'), does: () => (this.zone = localZone()) }) : nothing}
          ${btn({ label: t('common-done'), icon: UI.check, cls: 'primary', does: () => this.querySelector<ToDialog>('to-dialog.cal-zones')?.close() })}
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
    // Each weekday's name in three lengths: the long for a reader and a pointer resting on it, the short where the
    // columns have the room, the narrow where they do not (the grid's container query, style.css).
    const wdFmts = (['long', 'short', 'narrow'] as const).map((weekday) => dateWords({ weekday, timeZone: 'UTC' }));
    const dayFmt = dateWords({ weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const swept = this.drag?.moved ? this.drag : this.sweep;
    const range = swept ? [Math.min(swept.from, swept.to), Math.max(swept.from, swept.to)] : null;
    const roving = this.rovingDay(first, last);
    // Every time of every span that lands on the grid (a day either side: a repeat keeps its time of day in another zone).
    const times = v.items.flatMap((s) => occurrences(s, gridStart - 1, gridStart + rows * 7, this.repeatZone));
    return html`<div class="cal-grid" role="grid" aria-label=${this.monthName(y, m)} @pointermove=${this.onGridMove} @pointerup=${this.onGridUp} @pointercancel=${() => (this.drag = null)}>
        <div class="cal-row" role="row">${Array.from({ length: 7 }, (_, i) => {
          const [long, short, narrow] = wdFmts.map((f) => f.format(Date.UTC(2023, 0, 1 + ((this.week0 + i) % 7))));
          return html`<div class="cal-wd" role="columnheader" aria-label=${long}><abbr title=${long}><span class="short">${short}</span><span class="narrow">${narrow}</span></abbr></div>`;
        })}</div>
        ${Array.from(
          { length: rows },
          (_, week) =>
            html`<div class="cal-row" role="row">${Array.from({ length: 7 }, (_, wd) => {
              const day = gridStart + week * 7 + wd;
              const p = dayToYmd(day);
              const dayStart = partsToUtc(p.y, p.m, p.d, 0, 0, this.zone);
              const dayEnd = partsToUtc(p.y, p.m, p.d + 1, 0, 0, this.zone);
              const chips = times.filter((s) => (s.kind === 'd' ? s.start <= day && day < s.start + s.dur : spanStartMs(s) < dayEnd && Math.max(spanEndMs(s), spanStartMs(s) + 1) > dayStart));
              const cls = ['cal-cell', p.m !== m ? 'out' : '', day === today ? 'today' : '', day === this.picked ? 'picked' : '', range && day >= range[0] && day <= range[1] ? 'range' : ''].join(' ');
              return html`<div class=${cls} role="gridcell" data-day=${day} @pointerdown=${(e: PointerEvent) => this.onCellDown(e, day)} @click=${(e: Event) => this.onCellClick(e, day)}>
            <button type="button" class="cal-n" tabindex=${day === roving ? 0 : -1} aria-label=${t('cal-new-event-on-day', { day: dayFmt.format(day * 86400000) })} aria-current=${day === today ? 'date' : nothing}>${p.d}</button>
            ${chips.map((s) => {
              const starts = s.kind === 'd' ? s.start === day : spanStartMs(s) >= dayStart;
              const ends = s.kind === 'd' ? s.start + s.dur - 1 === day : Math.max(spanEndMs(s), spanStartMs(s) + 1) <= dayEnd;
              return html`<button type="button" class="cal-chip ${s.kind === 'd' ? 'day' : ''} ${starts ? '' : 'cont'} ${ends ? '' : 'more'}" data-at=${s.at} style="--c:${CAL_COLORS[s.color]?.hex ?? CAL_COLORS[''].hex}" title=${this.whenWords(s) + (s.repeat ? `, ${repeatText(s.repeat)}` : '')} @click=${() => this.open(s)}>${starts && s.kind === 't' ? html`<b>${this.chipTime(s)}</b> ` : nothing}${s.repeat && starts ? icon(RepeatIcon, 10, 'cal-rep') : nothing}${s.words || t('common-untitled')}</button>`;
            })}
          </div>`;
            })}</div>`,
        )}
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
        const f = dateWords({ timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
        return s.dur > 1 ? f.formatRange(s.start * 86400000, (s.start + s.dur - 1) * 86400000) : f.format(s.start * 86400000);
      }
      const f = dateWords({ timeZone: this.zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return (s.dur > 0 ? f.formatRange(spanStartMs(s), spanEndMs(s)) : f.format(spanStartMs(s))) + ' ' + zoneAbbr(spanStartMs(s), this.zone);
    } catch {
      return '';
    }
  }

  /** The month as a list: each time of each span in it, in order; a tap opens it. */
  private renderAgenda(first: number, last: number) {
    const all = this.view.items.flatMap((s) => occurrences(s, first, last, this.repeatZone)).sort((a, b) => spanStartMs(a) - spanStartMs(b));
    if (!this.view.items.length) return html`<p class="to-hint cal-empty">${t('cal-nothing-on-calendar-yet-tap')}</p>`;
    return html`<ul class="cal-agenda" aria-label=${t('cal-this-month')}>
      ${
        all.length
          ? all.map(
              (s) =>
                html`<li><button type="button" class="cal-agenda-item" data-at=${s.at} style="--c:${CAL_COLORS[s.color]?.hex ?? CAL_COLORS[''].hex}" @click=${() => this.open(s, `.cal-agenda-item[data-at="${s.at}"]`)}><span class="when">${this.whenWords(s)}</span><span class="what">${s.words || t('common-untitled')}${s.repeat ? html` <small>${repeatText(s.repeat)}</small>` : nothing}</span></button></li>`,
            )
          : html`<li class="to-hint">${t('cal-nothing-this-month')}</li>`
      }
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
    const wdFmt = dateWords({ weekday: 'narrow', timeZone: 'UTC' });
    const monthFmt = dateWords({ month: 'long', timeZone: 'UTC' });
    const dayFmt = dateWords({ day: 'numeric', month: 'long', timeZone: 'UTC' });
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
    if (!bars.length) return html`<p class="to-hint cal-empty">${t('cal-no-tasks-yet-insert-task')}</p>`;
    const range = ganttRange(bars)!;
    const from = this.ganttFrom();
    const to = Math.max(range.to + 7, from + 28);
    const z = this.zoom;
    const width = (to - from) * z;
    const height = HEAD + bars.length * ROW;
    const now = this.todayDay();
    const months = dateWords({ month: 'short', year: 'numeric', timeZone: 'UTC' });
    const drag = this.bar;
    return html`<div class="cal-gantt">
      <ol class="cal-tasks" tabindex="-1" aria-label=${t('common-tasks')} style="--head:${HEAD / 16}rem">
        ${bars.map((b) => this.renderTask(b.item, b.parent, b.done))}
      </ol>
      <div class="cal-gantt-scroll" tabindex="0" role="group" aria-label=${t('cal-chart-scrolls-sideways')} @scroll=${(e: Event) => (this.scrolled = Math.floor((e.target as HTMLElement).scrollLeft / (z * remScale())))}>
        <svg class="cal-chart" width=${`${width / 16}rem`} height=${`${height / 16}rem`} font-size="11" viewBox="0 0 ${width} ${height}" aria-hidden="true" @pointermove=${this.onBarMove} @pointerup=${this.onBarUp} @pointercancel=${() => (this.bar = null)}>
          ${Array.from({ length: to - from }, (_, k) => {
            const day = from + k;
            const { d, wd, y, m } = dayToYmd(day);
            // The first column is named for its month only when the next month's name is not right behind it.
            const roomy = k === 0 && Array.from({ length: Math.ceil(80 / z) }, (_, j) => dayToYmd(day + j + 1).d).every((n) => n !== 1);
            return svg`${wd === 0 || wd === 6 ? svg`<rect class="weekend" x=${k * z} y=${HEAD} width=${z} height=${height - HEAD} />` : nothing}
              ${d === 1 || roomy ? svg`<text class="month" x=${k * z + 4} y="16">${months.format(Date.UTC(y, m - 1, 1))}</text>` : nothing}
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
              ${b.item.kind === 'd' ? svg`<rect class="grip" x=${x + w - 12} y=${y - 8} width="44" height=${ROW} data-at=${b.item.at} @pointerdown=${(e: PointerEvent) => this.onBarDown(e, b.item, 'size')} />` : nothing}
            </g>`;
          })}
        </svg>
      </div>
    </div>`;
  }

  /** A task as a row: its grip (a tap chooses it, a drag moves it), its words typed in place, its tick. */
  private renderTask(i: Item, parent: boolean, done: number) {
    const at = i.at;
    const ranged = this.rows.has(at);
    const name = i.words || t('common-task');
    const ticked = i.done >= 100;
    return html`<li class="cal-trow ${parent ? 'parent' : ''} ${at === this.cur ? 'cur' : ''} ${ranged ? 'ranged' : ''} ${this.rows.drag?.id === at ? 'dragging' : ''}" data-at=${at} style="--d:${i.depth}" aria-describedby=${`cal-when-${at}`}>
      <button type="button" class="cal-grip to-rows-handle" aria-pressed=${String(ranged)} aria-label=${t('cal-choose-task', { task: name })} title=${t('cal-choose-task', { task: name })}>${icon(GripVertical, 16)}</button>
      <to-text class="cal-words" shape="line" .blocks=${this.blocksFor(i)} label=${name} placeholder=${t('common-task')} @focusin=${() => (this.cur = at)} @text-ops=${(e: CustomEvent<TextOps>) => this.onWordsOps(i, e)} @text-enter=${(e: Event) => this.onWordsEnter(i, e)} @text-exit=${(e: CustomEvent<{ dir: 'back' | 'forward' }>) => this.onWordsExit(i, e)} @text-selectall=${(e: Event) => (e.stopPropagation(), this.rows.selectAll())}></to-text>
      ${parent ? nothing : html`<button type="button" class="cal-tick" role="checkbox" aria-checked=${ticked ? 'true' : 'false'} aria-label=${t('common-done-task', { task: name })} title=${t('common-done')} @click=${() => this.edit(toggleDone(this.view, i))}>${ticked ? icon(Check, 16) : nothing}</button>`}
      <span id=${`cal-when-${at}`} hidden>${this.whenWords(i)}${done ? `, ${t('cal-n-done', { n: done })}` : ''}</span>
    </li>`;
  }

  /** The dialog over the calendar; its body is drawn while it is open. */
  private renderDialog() {
    const e = this.editing;
    const task = this.view.gantt;
    const heading = e?.item ? (task ? t('cal-edit-task') : t('cal-edit-event')) : task ? t('cal-new-task') : t('cal-new-event');
    return html`<to-dialog class="cal-dialog" heading=${heading} @to-close=${this.onDialogClose} .body=${e ? this.renderFields(e) : nothing}></to-dialog>`;
  }
  private renderFields(e: Editing) {
    const s = e.d;
    const f = this.fields(s);
    const timed = s.kind === 't';
    const r = s.repeat;
    const task = this.view.gantt;
    const colour = CAL_COLORS[s.color] ?? CAL_COLORS[''];
    // Enter in a field, and Mod+Enter anywhere in the dialog, is Done.
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter' || ev.altKey || ev.shiftKey) return;
      if (ev.metaKey || ev.ctrlKey || (ev.target as HTMLElement).tagName === 'INPUT') {
        ev.preventDefault();
        this.done();
      }
    };
    return html`<div class="cal-form" @keydown=${onKey}>
      <div class="cal-field cal-what"><span>${t('cal-what')}</span>
        <to-text class="cal-label" shape="line" .blocks=${[e.block]} label=${t('cal-what')} placeholder=${task ? t('common-task') : t('common-event')} @text-ops=${this.onLabelOps} @text-enter=${(ev: Event) => (ev.stopPropagation(), this.done())}></to-text>
      </div>
      <label class="to-switch cal-allday"><input type="checkbox" .checked=${!timed} @change=${(ev: Event) => this.setAllDay((ev.target as HTMLInputElement).checked)} /><span class="to-switch-words">${t('cal-all-day')}</span></label>
      <div class="cal-field"><span>${t('cal-starts')}</span>
        <span class="cal-inputs">
          <input type="date" aria-label=${t('cal-start-date')} .value=${f.sd} @change=${(ev: Event) => this.setStart((ev.target as HTMLInputElement).value, f.st)} />
          ${timed ? html`<input type="time" aria-label=${t('cal-start-time')} .value=${f.st} @change=${(ev: Event) => this.setStart(f.sd, (ev.target as HTMLInputElement).value)} />` : nothing}
        </span>
      </div>
      <div class="cal-field"><span>${t('cal-ends')}</span>
        <span class="cal-inputs">
          <input type="date" aria-label=${t('cal-end-date')} .value=${f.ed} min=${f.sd} @change=${(ev: Event) => this.setEnd((ev.target as HTMLInputElement).value, f.et)} />
          ${timed ? html`<input type="time" aria-label=${t('cal-end-time')} .value=${f.et} @change=${(ev: Event) => this.setEnd(f.ed, (ev.target as HTMLInputElement).value)} />` : nothing}
        </span>
      </div>
      ${timed ? html`<p class="to-hint">${t('cal-times-in-zone', { zone: `${this.zone.replace(/_/g, ' ')} (${zoneAbbr(spanStartMs(s), this.zone)})` })}</p>` : nothing}
      <div class="cal-field"><span>${t('draw-color')}</span>
        <span class="cal-swatches" role="group" aria-label=${t('draw-color')}>${Object.entries(CAL_COLORS).map(([k, c]) => html`<button type="button" class="to-btn to-tool cal-swatch" aria-pressed=${String(s.color === k)} aria-label=${this.view.legend[k] ? `${c.name()}: ${this.view.legend[k]}` : c.name()} title=${this.view.legend[k] ?? c.name()} @click=${() => ((this.ink = k), this.patch({ color: k }))}><span class="to-swatch" style="--swatch:${c.hex}"></span></button>`)}</span>
      </div>
      <label class="cal-field"><span>${t('cal-color-stands-for', { color: colour.name() })}</span><input type="text" class="cal-legend-name" maxlength="24" placeholder=${t('cal-name-yours-say')} .value=${e.legend} @input=${(ev: Event) => this.editing && (this.editing = { ...this.editing, legend: (ev.target as HTMLInputElement).value })} /></label>
      <label class="cal-field"><span>${t('cal-repeats')}</span>
        <select @change=${(ev: Event) => {
          const val = (ev.target as HTMLSelectElement).value;
          this.setRepeat(val === 'never' ? '' : (val as Every));
        }}>
          <option value="never" ?selected=${!r}>${t('cal-never')}</option>
          ${(Object.keys(EVERY) as Every[]).map((k) => html`<option value=${k} ?selected=${r?.every === k}>${everyText(k)}</option>`)}
        </select>
      </label>
      ${
        r
          ? html`<div class="cal-field"><span>${t('cal-stops')}</span><span class="cal-inputs">
            <input type="number" class="cal-times" min="1" max="999" inputmode="numeric" aria-label=${t('cal-how-many-times')} placeholder="∞" .value=${r.count ? String(r.count) : ''} @change=${(ev: Event) => this.setRepeat(r.every, { count: +(ev.target as HTMLInputElement).value })} />
            <span class="to-hint">${t('cal-times-or-on')}</span>
            <input type="date" aria-label=${t('cal-last-day')} .value=${r.until !== undefined ? dayString(r.until) : ''} @change=${(ev: Event) => this.setRepeat(r.every, { until: (ev.target as HTMLInputElement).value })} />
          </span></div>`
          : nothing
      }
      ${
        task || s.done
          ? html`<label class="cal-field"><span>${t('cal-done')}</span><input type="number" class="cal-done" min="0" max="100" step="10" inputmode="numeric" .value=${String(s.done)} @change=${(ev: Event) => this.patch({ done: Math.max(0, Math.min(100, Math.round(+(ev.target as HTMLInputElement).value) || 0)) })} /></label>`
          : nothing
      }
      <div class="to-row cal-actions">
        ${e.item ? btn({ label: t('common-delete'), icon: UI.trash, cls: 'cal-delete', does: this.removeDraft }) : nothing}
        ${e.item ? btn({ label: t('common-duplicate'), icon: CopyPlus, cls: 'cal-dup', does: this.duplicateDraft }) : nothing}
        ${btn({ label: t('common-done'), icon: UI.check, cls: 'primary cal-done-btn', does: this.done })}
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
