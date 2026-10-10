/**
 * The To-Do List's commands (kit/commands.ts), its editor the context: the bar (Insert ▾ Task, Show ▾ all, open or
 * done, Clear done), a task's menu (its due date, Move up and down, Duplicate, Delete task) and the keys in a task's
 * words (docs/editing.md §3 and §6): Alt+Up/Down move it, Mod+Enter ticks it, Mod+D duplicates it, Up and Down at the
 * edge of the words go to the task before or after, Left at the start and Right at the end too. A key acts on the
 * task it is typed in (`here`, which the editor sets); a menu on the task whose menu is open.
 */
import { ArrowDown, ArrowUp, CalendarDays, CopyPlus, ListFilter } from 'lucide';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { clearDone, setDone, setDue } from './model.ts';
import type { ToTodoEditor } from './editor.ts';

type T = ToTodoEditor;
const cmd = commandsOf<T>('todo');
const menuTask = (d: T) => d.taskAt(d.menuAt);
const place = (d: T) => d.shown().indexOf(menuTask(d)!);
const show = (s: 'all' | 'open' | 'done', label: string) => cmd(`show.${s}`, label, { where: ['menu:show'], pressed: (d) => d.show === s, does: (d) => d.showOnly(s) });

const TODO: Command<T>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  cmd('insert.task', 'Task', { icon: UI.plus, where: ['menu:insert'], does: (d) => d.addHere() }),
  cmd('show', 'Show', { icon: ListFilter, menu: 'show', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  show('all', 'All'),
  show('open', 'Open'),
  show('done', 'Done'),
  cmd('clear', 'Clear done', { icon: UI.trash, where: ['bar'], document: true, disabled: (d) => !d.view.ticked, does: (d) => d.edit(clearDone(d.view)) }),
  cmd('task', 'Task options', { menu: 'task', where: ['in-doc'], does: () => undefined }),
  cmd('task.due', (d) => (d && menuTask(d)?.due ? t('Change the due date…') : t('Due date…')), {
    icon: CalendarDays,
    when: (d) => !!(d.here ?? menuTask(d)),
    where: ['menu:task'],
    does: (d) => d.askDue(menuTask(d)!),
  }),
  cmd('task.nodue', 'No due date', { icon: UI.close, where: ['menu:task'], when: (d) => !!menuTask(d)?.due, does: (d) => d.edit(setDue(menuTask(d)!, '')) }),
  cmd('task.up', 'Move up', {
    at: 'words',
    icon: ArrowUp,
    keys: 'Alt+ArrowUp',
    when: (d) => !!(d.here ?? menuTask(d)),
    where: ['menu:task'],
    disabled: (d) => !d.here && place(d) <= 0,
    does: (d) => d.moveOne(d.here ?? menuTask(d)!, -1),
  }),
  cmd('task.down', 'Move down', {
    at: 'words',
    icon: ArrowDown,
    keys: 'Alt+ArrowDown',
    when: (d) => !!(d.here ?? menuTask(d)),
    where: ['menu:task'],
    disabled: (d) => !d.here && (place(d) < 0 || place(d) >= d.shown().length - 1),
    does: (d) => d.moveOne(d.here ?? menuTask(d)!, 1),
  }),
  cmd('task.duplicate', 'Duplicate', { at: 'words', icon: CopyPlus, keys: 'Mod+D', when: (d) => !!(d.here ?? menuTask(d)), where: ['menu:task'], does: (d) => d.duplicateOne(d.here ?? menuTask(d)!) }),
  cmd('task.delete', 'Delete task', { icon: UI.trash, when: (d) => !!(d.here ?? menuTask(d)), where: ['menu:task'], does: (d) => d.deleteTasks([menuTask(d)!.at]) }),
  cmd('tick', 'Tick or untick a task', { at: 'words', keys: 'Mod+Enter', where: ['keys-only'], when: (d) => !!d.here, does: (d) => d.edit(setDone(d.here!, !d.here!.done)) }),
  cmd('step', 'The next or the one before', {
    at: 'words',
    keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight',
    where: ['keys-only'],
    when: (d) => !!d.here,
    does: (d, e) => e instanceof KeyboardEvent && d.stepKey(e),
  }),
];
/** What a key in a task's words answers. */
export const WORDS = TODO.filter((c) => c.keys);

export default register(TODO) as Command<T>[];
