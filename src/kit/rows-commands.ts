/**
 * The commands of rows chosen whole (the registry's 'rows' scope, kit/commands.ts; kit/rows.ts is the controller and
 * their context): the bar under a range in the standard's order (Edit, Move up, Move down, [the app's own], Indent,
 * Bring out, Duplicate | Copy, Cut, Paste | Delete) and the keys a range answers (docs/editing.md §3 and §6): Enter or
 * Escape back to a caret, Alt+Up/Down move, Shift+Up/Down extend, a plain arrow lets go, Tab and Shift+Tab where rows
 * nest, Mod+A every row, Mod+D, Delete or Backspace. Copy, Cut and Paste keep the browser's keys (`native`), whose
 * events the controller answers.
 */
import { ArrowDown, ArrowUp, ClipboardPaste, Copy, CopyPlus, Scissors, SquarePen } from 'lucide';
import { command, register, type Command } from './commands.ts';
import { t } from './i18n.ts';
import { UI } from './icons.ts';
import type { Rows } from './rows.ts';

type R = Rows<unknown>;
const span = (r: R) => (r.range ? r.span() : null);
const nests = (r: R) => !!r.o.nests && !!r.o.shift;

export const ROWS_COMMANDS = register([
  command<R>({ id: 'rows.edit', scope: 'rows', label: () => t('Edit'), icon: SquarePen, keys: 'Enter', where: ['context'], group: 'edit', does: (r) => r.range && r.release(r.range.focus) }),
  command<R>({ id: 'rows.back', scope: 'rows', label: () => t('Step out: close, collapse, let go'), keys: 'Escape', where: ['keys-only'], does: (r) => r.range && r.release(r.range.focus) }),
  command<R>({ id: 'rows.up', scope: 'rows', label: () => t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', where: ['context'], group: 'edit', disabled: (r) => !span(r) || !r.o.canMove(span(r)!, -1), does: (r) => r.move(-1) }),
  command<R>({ id: 'rows.down', scope: 'rows', label: () => t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', where: ['context'], group: 'edit', disabled: (r) => !span(r) || !r.o.canMove(span(r)!, 1), does: (r) => r.move(1) }),
  command<R>({ id: 'rows.indent', scope: 'rows', label: () => t('Indent'), icon: UI.indent, keys: 'Tab', where: ['context'], group: 'edit', when: nests, disabled: (r) => !span(r) || !(r.o.canShift?.(span(r)!, 1) ?? true), does: (r) => r.shift(1) }),
  command<R>({ id: 'rows.outdent', scope: 'rows', label: () => t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', where: ['context'], group: 'edit', when: nests, disabled: (r) => !span(r) || !(r.o.canShift?.(span(r)!, -1) ?? true), does: (r) => r.shift(-1) }),
  command<R>({ id: 'rows.duplicate', scope: 'rows', label: () => t('Duplicate'), icon: CopyPlus, keys: 'Mod+D', where: ['context'], group: 'edit', does: (r) => r.duplicate() }),
  command<R>({ id: 'rows.copy', scope: 'rows', label: () => t('Copy'), icon: Copy, keys: 'Mod+C', native: true, where: ['context'], group: 'clip', does: (r) => r.copyOut(false) }),
  command<R>({ id: 'rows.cut', scope: 'rows', label: () => t('Cut'), icon: Scissors, keys: 'Mod+X', native: true, where: ['context'], group: 'clip', does: (r) => r.copyOut(true) }),
  command<R>({ id: 'rows.paste', scope: 'rows', label: () => t('Paste'), icon: ClipboardPaste, keys: 'Mod+V', native: true, where: ['context'], group: 'clip', does: (r) => r.pasteIn() }),
  command<R>({ id: 'rows.delete', scope: 'rows', label: () => t('Delete'), icon: UI.trash, keys: 'Delete / Backspace', where: ['context'], group: 'delete', does: (r) => r.remove() }),
  command<R>({ id: 'rows.extend', scope: 'rows', label: () => t('Extend the selection'), keys: 'Shift+ArrowUp / Shift+ArrowDown', where: ['keys-only'], does: (r, e) => r.extend(e instanceof KeyboardEvent && e.key === 'ArrowUp' ? -1 : 1) }),
  command<R>({ id: 'rows.leave', scope: 'rows', label: () => t('Back to the words'), keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight', where: ['keys-only'], does: (r, e) => r.leave(e instanceof KeyboardEvent ? e.key : 'ArrowDown') }),
  command<R>({ id: 'rows.all', scope: 'rows', label: () => t('Select all: the words of the box, then everything'), keys: 'Mod+A', where: ['keys-only'], does: (r) => r.selectAll() }),
]) as Command<R>[];
