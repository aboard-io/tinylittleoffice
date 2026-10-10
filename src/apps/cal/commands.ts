/**
 * The Calendar's commands (kit/commands.ts), its editor the context: the bar (back, Today, on; View ▾ month, year or
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
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { CAL_COLORS } from './model.ts';
import type { ToCalEditor } from './editor.ts';

type C = ToCalEditor;
const gantt = (c?: C) => !!c?.view.gantt;
const year = (c?: C) => !gantt(c) && c?.mode === 'year';
const view = (id: 'month' | 'year' | 'gantt', label: () => string, icon: Command['icon'], hint?: () => string) =>
  command<C>({ id: `cal.view.${id}`, scope: 'cal', label, icon, hint, where: ['menu:view'], pressed: (c) => (id === 'gantt' ? gantt(c) : !gantt(c) && c.mode === id), does: (c) => c.setMode(id) });

const CAL: Command<C>[] = [
  command<C>({ id: 'cal.prev', scope: 'cal', label: (c) => (gantt(c) ? t('A week earlier') : year(c) ? t('Previous year') : t('Previous month')), icon: ChevronLeft, where: ['bar'], document: true, does: (c) => c.page(-1) }),
  command<C>({ id: 'cal.today', scope: 'cal', label: () => t('Today'), where: ['bar'], document: true, does: (c) => c.toToday() }),
  command<C>({ id: 'cal.next', scope: 'cal', label: (c) => (gantt(c) ? t('A week later') : year(c) ? t('Next year') : t('Next month')), icon: ChevronRight, where: ['bar'], document: true, does: (c) => c.page(1) }),
  command<C>({ id: 'cal.view', scope: 'cal', label: () => t('View'), icon: CalendarDays, menu: 'view', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  view('month', () => t('Month'), CalendarDays),
  view('year', () => t('Year'), Grid3x3),
  view('gantt', () => t('Schedule'), ChartGantt, () => t('The same dates as a Gantt chart')),
  command<C>({ id: 'cal.insert', scope: 'cal', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  command<C>({ id: 'cal.insert.event', scope: 'cal', label: () => t('Event'), icon: UI.plus, where: ['menu:insert'], when: (c) => !gantt(c), does: (c) => c.createEvent() }),
  command<C>({ id: 'cal.insert.task', scope: 'cal', label: () => t('Task'), icon: UI.plus, where: ['menu:insert'], when: gantt, does: (c) => c.createTask() }),
  command<C>({ id: 'cal.ink', scope: 'cal', label: (c) => t('Colour for new: {colour}', { colour: c ? (c.view.legend[c.ink] ?? CAL_COLORS[c.ink].name()) : '' }), menu: 'ink', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...Object.entries(CAL_COLORS).map(([k, ink]) =>
    command<C>({ id: `cal.ink.${k}`, scope: 'cal', label: (c) => (c?.view.legend[k] ? `${ink.name()}: ${c.view.legend[k]}` : ink.name()), swatch: () => ink.hex, where: ['menu:ink'], pressed: (c) => c.ink === k, does: (c) => (c.ink = k) }),
  ),
  command<C>({ id: 'cal.zone', scope: 'cal', label: (c) => (c ? c.zone.split('/').pop()!.replace(/_/g, ' ') : t('Time zone')), hint: () => t('Time zone'), icon: Globe, where: ['bar'], document: true, takesFocus: true, does: (c) => c.openZones() }),
  // Chosen tasks of the schedule (the rows controller draws these after Move down).
  command<C>({ id: 'cal.earlier', scope: 'cal', at: 'rows', label: () => t('A day earlier'), icon: ArrowLeft, keys: 'Mod+Alt+ArrowLeft', where: ['context'], does: (c) => c.nudgeChosen(-1) }),
  command<C>({ id: 'cal.later', scope: 'cal', at: 'rows', label: () => t('A day later'), icon: ArrowRight, keys: 'Mod+Alt+ArrowRight', where: ['context'], does: (c) => c.nudgeChosen(1) }),
  command<C>({ id: 'cal.dates', scope: 'cal', at: 'rows', label: () => t('Dates…'), icon: CalendarDays, keys: 'Alt+Enter', where: ['context'], takesFocus: true, does: (c) => c.datesChosen() }),
  // A task's words.
  command<C>({ id: 'cal.task.nest', scope: 'cal', at: 'words', label: () => t('Indent or bring out in a list; the next cell in a grid'), keys: 'Tab / Shift+Tab', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('nest', e) }),
  command<C>({ id: 'cal.task.move', scope: 'cal', at: 'words', label: () => t('Move the selected items up or down'), keys: 'Alt+ArrowUp / Alt+ArrowDown', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('move', e) }),
  command<C>({ id: 'cal.task.step', scope: 'cal', at: 'words', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('step', e) }),
  command<C>({ id: 'cal.task.duplicate', scope: 'cal', at: 'words', label: () => t('Duplicate'), keys: 'Mod+D', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('duplicate', e) }),
  command<C>({ id: 'cal.task.tick', scope: 'cal', at: 'words', label: () => t('Tick or untick a task'), keys: 'Mod+Enter', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('tick', e) }),
  command<C>({ id: 'cal.task.earlier', scope: 'cal', at: 'words', label: () => t('A day earlier'), keys: 'Mod+Alt+ArrowLeft', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('earlier', e) }),
  command<C>({ id: 'cal.task.later', scope: 'cal', at: 'words', label: () => t('A day later'), keys: 'Mod+Alt+ArrowRight', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('later', e) }),
  command<C>({ id: 'cal.task.dates', scope: 'cal', at: 'words', label: () => t('Dates…'), keys: 'Alt+Enter', when: (c) => c.here?.at !== undefined, where: ['keys-only'], does: (c, e) => c.taskKey('dates', e) }),
  // A day of the month.
  command<C>({ id: 'cal.day.make', scope: 'cal', at: 'day', label: () => t('Event'), keys: 'Enter', where: ['keys-only'], when: (c) => !!c.sweep, does: (c) => c.makeSweep() }),
  command<C>({ id: 'cal.day.letgo', scope: 'cal', at: 'day', label: () => t('Step out: close, collapse, let go'), keys: 'Escape', where: ['keys-only'], when: (c) => !!c.sweep, does: (c) => void (c.sweep = null) }),
  command<C>({
    id: 'cal.day.walk',
    scope: 'cal',
    at: 'day',
    label: () => t('The next or the one before'),
    keys: 'ArrowLeft / ArrowRight / ArrowUp / ArrowDown / Shift+ArrowLeft / Shift+ArrowRight / Shift+ArrowUp / Shift+ArrowDown / Home / End / PageUp / PageDown',
    when: (c) => c.here?.day !== undefined, where: ['keys-only'],
    does: (c, e) => e instanceof KeyboardEvent && c.walkDay(e),
  }),
  // An entry on a day, or in the month's list.
  command<C>({ id: 'cal.entry.delete', scope: 'cal', at: 'entry', label: () => t('Delete'), keys: 'Delete / Backspace', when: (c) => !!c.here?.el, where: ['keys-only'], does: (c) => c.entryKey('delete') }),
  command<C>({ id: 'cal.entry.duplicate', scope: 'cal', at: 'entry', label: () => t('Duplicate'), keys: 'Mod+D', when: (c) => !!c.here?.el, where: ['keys-only'], does: (c) => c.entryKey('duplicate') }),
];
export const AT = (at: string) => CAL.filter((c) => c.at === at);

export default register(CAL) as Command<C>[];
