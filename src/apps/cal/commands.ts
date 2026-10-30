/**
 * The Calendar's commands (kit/core/commands.ts), its editor the context: the bar (back, Today, on; View ▾ month, year or
 * schedule; Insert ▾ an event or a task; the colour for new entries ▾; the time zone), the schedule's own items in the
 * bar under chosen tasks (a day earlier, a day later, Dates…), and the keys (docs/editing.md §6 and §8): in a task's
 * words Tab and Shift+Tab nest it, Alt+Up/Down move it, Up and Down go to the task before or after, Mod+D duplicates
 * it, Mod+Enter ticks it, Mod+Alt+Left/Right move it a day, Alt+Enter opens its dates; on a day of the month the
 * arrows walk by a day and a week, PageUp and PageDown by a month, Home and End to the week's ends, Shift with an
 * arrow sweeps and Enter makes an event over the sweep, Escape lets it go; on an entry Delete takes it out and Mod+D
 * makes another; chosen tasks move a day with Mod+Alt+Left/Right and open with Alt+Enter. What a key acts on is
 * `here` (the task's block, or the day, or the entry), which the editor sets as the key comes.
 */
import { ArrowLeft, ArrowRight, CalendarDays, ChartGantt, ChevronLeft, ChevronRight, Globe, Grid3x3 } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import { CAL_COLORS } from './model.ts';
import type { ToCalEditor } from './editor.ts';

type C = ToCalEditor;
const cmd = commandsOf<C>('cal');
const gantt = (c?: C) => !!c?.view.gantt;
const year = (c?: C) => !gantt(c) && c?.mode === 'year';
const view = (id: 'month' | 'year' | 'gantt', label: string, icon: Command['icon'], hint?: string) =>
  cmd(`view.${id}`, label, { icon, hint, where: ['menu:view'], pressed: (c) => (id === 'gantt' ? gantt(c) : !gantt(c) && c.mode === id), does: (c) => c.setMode(id) });

const CAL: Command<C>[] = [
  cmd('prev', (c) => (gantt(c) ? t('cal-week-earlier') : year(c) ? t('cal-previous-year') : t('cal-previous-month')), { icon: ChevronLeft, where: ['bar'], document: true, does: (c) => c.page(-1) }),
  cmd('today', 'common-today', { where: ['bar'], document: true, does: (c) => c.toToday() }),
  cmd('next', (c) => (gantt(c) ? t('cal-week-later') : year(c) ? t('cal-next-year') : t('cal-next-month')), { icon: ChevronRight, where: ['bar'], document: true, does: (c) => c.page(1) }),
  cmd('view', 'cal-view', { icon: CalendarDays, menu: 'view', where: ['bar'], group: 'view', document: true, takesFocus: true, does: () => undefined }),
  view('month', 'cal-month', CalendarDays),
  view('year', 'cal-year', Grid3x3),
  view('gantt', 'cal-schedule', ChartGantt, 'cal-same-dates-as-gantt-chart'),
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.event', 'common-event', { icon: UI.plus, where: ['menu:insert'], when: (c) => !gantt(c), does: (c) => c.createEvent() }),
  cmd('insert.task', 'common-task', { icon: UI.plus, where: ['menu:insert'], when: gantt, does: (c) => c.createTask() }),
  cmd('ink', (c) => t('cal-color-for-new-color', { color: c ? (c.view.legend[c.ink] ?? CAL_COLORS[c.ink].name()) : '' }), {
    menu: 'ink',
    where: ['bar'],
    group: 'insert',
    takesFocus: true,
    does: () => undefined,
  }),
  ...Object.entries(CAL_COLORS).map(([k, ink]) =>
    cmd(`ink.${k}`, (c) => (c?.view.legend[k] ? `${ink.name()}: ${c.view.legend[k]}` : ink.name()), {
      data: true,
      swatch: () => ink.hex,
      where: ['menu:ink'],
      pressed: (c) => c.ink === k,
      does: (c) => (c.ink = k),
    }),
  ),
  cmd('zone', (c) => (c ? c.zone.split('/').pop()!.replace(/_/g, ' ') : t('cal-time-zone')), {
    hint: 'cal-time-zone',
    icon: Globe,
    where: ['bar'],
    document: true,
    takesFocus: true,
    does: (c) => c.openZones(),
  }),
  cmd('earlier', 'cal-day-earlier', { at: 'rows', icon: ArrowLeft, keys: 'Mod+Alt+ArrowLeft', where: ['context'], does: (c) => c.nudgeChosen(-1) }),
  cmd('later', 'cal-day-later', { at: 'rows', icon: ArrowRight, keys: 'Mod+Alt+ArrowRight', where: ['context'], does: (c) => c.nudgeChosen(1) }),
  cmd('dates', 'cal-dates', { at: 'rows', icon: CalendarDays, keys: 'Alt+Enter', where: ['context'], takesFocus: true, does: (c) => c.datesChosen() }),
  cmd('task.nest', 'common-indent-or-bring-out-in', {
    at: 'words',
    keys: 'Tab / Shift+Tab',
    when: (c) => c.here?.at !== undefined,
    where: ['keys-only'],
    does: (c, e) => c.taskKey('nest', e),
  }),
  cmd('task.move', 'common-move-selected-items-up-or', {
    at: 'words',
    keys: 'Alt+ArrowUp / Alt+ArrowDown',
    when: (c) => c.here?.at !== undefined,
    where: ['keys-only'],
    does: (c, e) => c.taskKey('move', e),
  }),
  cmd('task.step', 'common-next-or-one-before', { at: 'words', keys: 'ArrowUp / ArrowDown', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('step', e) }),
  cmd('task.duplicate', 'common-duplicate', { at: 'words', keys: 'Mod+D', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('duplicate', e) }),
  cmd('task.tick', 'common-check-or-uncheck-task', { at: 'words', keys: 'Mod+Enter', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('tick', e) }),
  cmd('task.earlier', 'cal-day-earlier', { at: 'words', keys: 'Mod+Alt+ArrowLeft', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('earlier', e) }),
  cmd('task.later', 'cal-day-later', { at: 'words', keys: 'Mod+Alt+ArrowRight', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('later', e) }),
  cmd('task.dates', 'cal-dates', { at: 'words', keys: 'Alt+Enter', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('dates', e) }),
  cmd('day.make', 'common-event', { at: 'day', keys: 'Enter', where: ['keys-only'], when: (c) => !!c.sweep, does: (c) => c.makeSweep() }),
  cmd('day.letgo', 'common-step-out-close-collapse-let', { at: 'day', keys: 'Escape', where: ['keys-only'], when: (c) => !!c.sweep, does: (c) => void (c.sweep = null) }),
  cmd('day.walk', 'common-next-or-one-before', {
    at: 'day',
    keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Shift+ArrowLeft / Shift+ArrowRight / Shift+ArrowUp / Shift+ArrowDown / Home / End / PageUp / PageDown',
    when: (c) => c.here?.day !== undefined,
    where: ['keys-only'],
    does: (c, e) => e instanceof KeyboardEvent && c.walkDay(e),
  }),
  cmd('entry.delete', 'common-delete', { at: 'entry', keys: 'Delete / Backspace', when: (c) => !!c.here?.el, where: ['keys-only'], does: (c) => c.entryKey('delete') }),
  cmd('entry.duplicate', 'common-duplicate', { at: 'entry', keys: 'Mod+D', when: (c) => !!c.here?.el, where: ['keys-only'], does: (c) => c.entryKey('duplicate') }),
];
export const AT = (at: string) => CAL.filter((c) => c.at === at);

export default register(CAL) as Command<C>[];
