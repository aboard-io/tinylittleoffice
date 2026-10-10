/**
 * The To-Do List's commands (kit/commands.ts), its editor the context: the bar (Insert ▾ Task, Show ▾ all, open or
 * done, Clear done), a task's menu (its due date, Move up and down, Duplicate, Delete task) and the keys in a task's
 * words (docs/editing.md §3 and §6): Alt+Up/Down move it, Mod+Enter ticks it, Mod+D duplicates it, Up and Down at the
 * edge of the words go to the task before or after, Left at the start and Right at the end too. A key acts on the
 * task it is typed in (`here`, which the editor sets); a menu on the task whose menu is open.
 */
import { ArrowDown, ArrowUp, CalendarDays, CopyPlus, ListFilter } from 'lucide';
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { clearDone, setDone, setDue } from './model.ts';
import type { ToTodoEditor } from './editor.ts';

type T = ToTodoEditor;
const menuTask = (d: T) => d.taskAt(d.menuAt);
const place = (d: T) => d.shown().indexOf(menuTask(d)!);
const show = (s: 'all' | 'open' | 'done', label: () => string) => command<T>({ id: `todo.show.${s}`, scope: 'todo', label, where: ['menu:show'], pressed: (d) => d.show === s, does: (d) => d.showOnly(s) });

const TODO: Command<T>[] = [
  command<T>({ id: 'todo.insert', scope: 'todo', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  command<T>({ id: 'todo.insert.task', scope: 'todo', label: () => t('Task'), icon: UI.plus, where: ['menu:insert'], does: (d) => d.addHere() }),
  command<T>({ id: 'todo.show', scope: 'todo', label: () => t('Show'), icon: ListFilter, menu: 'show', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  show('all', () => t('All')),
  show('open', () => t('Open')),
  show('done', () => t('Done')),
  command<T>({ id: 'todo.clear', scope: 'todo', label: () => t('Clear done'), icon: UI.trash, where: ['bar'], document: true, disabled: (d) => !d.view.ticked, does: (d) => d.edit(clearDone(d.view)) }),
  // A task's menu (its options button).
  command<T>({ id: 'todo.task', scope: 'todo', label: () => t('Task options'), menu: 'task', where: ['in-doc'], does: () => undefined }),
  command<T>({ id: 'todo.task.due', scope: 'todo', label: (d) => (d && menuTask(d)?.due ? t('Change the due date…') : t('Due date…')), icon: CalendarDays, where: ['menu:task'], does: (d) => d.askDue(menuTask(d)!) }),
  command<T>({ id: 'todo.task.nodue', scope: 'todo', label: () => t('No due date'), icon: UI.close, where: ['menu:task'], when: (d) => !!menuTask(d)?.due, does: (d) => d.edit(setDue(menuTask(d)!, '')) }),
  command<T>({ id: 'todo.task.up', scope: 'todo', at: 'words', label: () => t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', where: ['menu:task'], disabled: (d) => !d.here && place(d) <= 0, does: (d) => d.moveOne(d.here ?? menuTask(d)!, -1) }),
  command<T>({ id: 'todo.task.down', scope: 'todo', at: 'words', label: () => t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', where: ['menu:task'], disabled: (d) => !d.here && (place(d) < 0 || place(d) >= d.shown().length - 1), does: (d) => d.moveOne(d.here ?? menuTask(d)!, 1) }),
  command<T>({ id: 'todo.task.duplicate', scope: 'todo', at: 'words', label: () => t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', where: ['menu:task'], does: (d) => d.duplicateOne(d.here ?? menuTask(d)!) }),
  command<T>({ id: 'todo.task.delete', scope: 'todo', label: () => t('Delete task'), icon: UI.trash, where: ['menu:task'], does: (d) => d.deleteTasks([menuTask(d)!.at]) }),
  // In a task's words.
  command<T>({ id: 'todo.tick', scope: 'todo', at: 'words', label: () => t('Tick or untick a task'), keys: 'Mod+Enter', where: ['keys-only'], when: (d) => !!d.here, does: (d) => d.edit(setDone(d.here!, !d.here!.done)) }),
  command<T>({ id: 'todo.step', scope: 'todo', at: 'words', label: () => t('The next or the one before'), keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight', where: ['keys-only'], when: (d) => !!d.here, does: (d, e) => e instanceof KeyboardEvent && d.stepKey(e) }),
];
/** What a key in a task's words answers. */
export const WORDS = TODO.filter((c) => c.keys);

export default register(TODO) as Command<T>[];
