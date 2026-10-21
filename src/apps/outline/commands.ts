/**
 * The Outliner's commands (kit/core/commands.ts), its editor the context: the bar (Insert ▾, the marks and Link and
 * Footnote, which are the words' own with the row's <to-text> as their context, Icon, Indent, Bring out, Move up and
 * down, Numbered, the zoom, Fold all, Connect, View as ▾), and the keys of a row (docs/editing.md §3 and §8): Tab and
 * Shift+Tab, Alt+Up/Down, Mod+Alt+Up/Down fold and unfold, Mod+Shift+. and Mod+Shift+, zoom in and out, Mod+D, and
 * the arrows between rows at the edge of a row's words. A key acts on the row it is typed in; a button on the row
 * that has the caret. Rows chosen whole are the rows controller's (kit/text/rows-commands.ts).
 */
import { ArrowDown, ArrowUp, Eye, FoldVertical, Link2, ListChecks, ListOrdered, Plus, Tag, UnfoldVertical, ZoomIn, ZoomOut } from 'lucide';
import { appOf, apps } from '../../kit/core/apps.ts';
import { register, type Command, commandsOf } from '../../kit/core/commands.ts';
import { t } from '../../kit/core/i18n.ts';
import { UI } from '../../kit/draw/icons.ts';
import { hasChildren, indexAt, moveItem, shiftItem } from './model.ts';
import def from './def.ts';
import type { ToOutlineEditor } from './editor.ts';

type O = ToOutlineEditor;
const cmd = commandsOf<O>('outline');
/** The row a key was typed in, or the row with the caret for a button. */
const at = (o: O, e?: Event) => (e instanceof KeyboardEvent ? o.rowOfKey(e) : o.sel);
const none = (o: O) => !o.itemAt(o.sel);
const words = (o: O) => !!o.itemAt(o.sel) && !o.itemAt(o.sel)!.doc;

export const INSERTS: Command<O>[] = [
  cmd('insert.item', 'outline-item', { icon: Plus, where: ['menu:insert'], does: (o) => o.addItem() }),
  cmd('insert.doc', 'common-tiny-little-office-doc-ellipsis', { icon: UI.insert, where: ['menu:insert'], does: (o) => o.insertLinked() }),
  // The compound bullet (Paul, 2026-10-15): a task's box, a status of the document's set, a due day.
  cmd('insert.task', 'common-task', { icon: UI.check, where: ['menu:insert'], disabled: (o) => !words(o), does: (o) => o.addTask() }),
  cmd('insert.due', 'outline-due-date', { icon: UI.calendar, where: ['menu:insert'], disabled: (o) => !words(o), does: (o) => o.addDue() }),
  cmd('insert.statuses', 'outline-statuses', { icon: Tag, where: ['menu:insert'], does: (o) => o.editStatuses() }),
  ...apps()
    .filter((a) => a.id !== 'outline')
    .map((a) => cmd(`insert.app.${a.id}`, () => a.name, { icon: a.icon, data: true, heading: 'common-new-document', where: ['menu:insert'], does: (o) => o.insertApp(a.id) })),
];

const OUTLINE: Command<O>[] = [
  cmd('insert', 'common-insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  cmd('icon', 'common-icon', { icon: UI.icon, where: ['bar'], disabled: (o) => !words(o), does: (o) => o.pickIcon() }),
  cmd('indent', 'common-indent', {
    at: 'words',
    icon: UI.indent,
    keys: 'Tab',
    where: ['bar'],
    group: 'structure',
    disabled: (o) => none(o) || !shiftItem(o.doc, o.view, o.sel, 1),
    does: (o, e) => o.shiftBy(at(o, e), 1),
  }),
  cmd('outdent', 'common-bring-out', {
    at: 'words',
    icon: UI.outdent,
    keys: 'Shift+Tab',
    where: ['bar'],
    group: 'structure',
    disabled: (o) => none(o) || !shiftItem(o.doc, o.view, o.sel, -1),
    does: (o, e) => o.shiftBy(at(o, e), -1),
  }),
  cmd('up', 'common-move-up', {
    at: 'words',
    icon: ArrowUp,
    keys: 'Alt+ArrowUp',
    where: ['bar'],
    group: 'structure',
    disabled: (o) => none(o) || !moveItem(o.doc, o.view, o.sel, -1),
    does: (o, e) => o.moveBy(at(o, e), -1),
  }),
  cmd('down', 'common-move-down', {
    at: 'words',
    icon: ArrowDown,
    keys: 'Alt+ArrowDown',
    where: ['bar'],
    group: 'structure',
    disabled: (o) => none(o) || !moveItem(o.doc, o.view, o.sel, 1),
    does: (o, e) => o.moveBy(at(o, e), 1),
  }),
  cmd('numbered', 'outline-numbered', { icon: ListOrdered, where: ['bar'], pressed: (o) => !!o.itemAt(o.sel)?.ord, disabled: (o) => !words(o), does: (o) => o.number() }),
  cmd('zoomout', 'common-zoom-out', { at: 'words', icon: ZoomOut, keys: 'Mod+Shift+,', where: ['bar'], group: 'view', document: true, when: (o) => o.zoom >= 0, does: (o) => o.zoomOut() }),
  cmd('zoomin', 'common-zoom-in', {
    at: 'words',
    icon: ZoomIn,
    keys: 'Mod+Shift+.',
    where: ['bar'],
    group: 'view',
    disabled: (o) => none(o) || !hasChildren(o.items, indexAt(o.view, o.sel)),
    does: (o, e) => o.zoomTo(at(o, e)),
  }),
  cmd('foldall', 'outline-fold-all', { icon: FoldVertical, where: ['bar'], group: 'view', document: true, does: (o) => o.foldAll(true) }),
  cmd('unfoldall', 'outline-unfold-all', { icon: UnfoldVertical, where: ['bar'], group: 'view', document: true, does: (o) => o.foldAll(false) }),
  cmd('connect', (o) => (o?.connecting ? t('outline-cancel-connecting') : t('outline-connect')), { icon: Link2, where: ['bar'], pressed: (o) => !!o.connecting, does: (o) => o.connect() }),
  cmd('view', 'outline-view-as', { icon: Eye, menu: 'view', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  cmd('view.page', 'outline-as-page', { icon: UI.print, where: ['menu:view'], does: (o) => o.showPage() }),
  // The compound bullet's views (Paul, 2026-10-15): the things to do as a table, sorted by status or by day; the items by status.
  cmd('view.agenda', 'outline-agenda', { icon: ListChecks, where: ['menu:view'], document: true, does: (o) => o.showAgenda() }),
  cmd('view.status', 'outline-by-status', { icon: Tag, where: ['menu:view'], document: true, does: (o) => o.showByStatus() }),
  ...(def.handoffs ?? []).map((h, i) => cmd(`view.${h.to}${i}`, () => h.label(), { icon: appOf(h.to)?.icon, where: ['menu:view'], when: () => !!appOf(h.to), does: (o) => o.openAs(h) })),
  cmd('tick', 'common-check-or-uncheck-task', { at: 'words', keys: 'Mod+Enter', where: ['keys-only'], does: (o, e) => o.tickAt(at(o, e)) }),
  cmd('fold', 'outline-fold-unfold', {
    at: 'words',
    keys: 'Mod+Alt+ArrowUp / Mod+Alt+ArrowDown',
    where: ['keys-only'],
    does: (o, e) => o.fold(at(o, e), !(e instanceof KeyboardEvent) || e.key === 'ArrowUp'),
  }),
  cmd('duplicate', 'common-duplicate', { at: 'words', keys: 'Mod+D', where: ['keys-only'], does: (o, e) => o.duplicateRow(at(o, e)) }),
  cmd('remove', 'common-delete', { at: 'words', keys: 'Delete / Backspace', where: ['keys-only'], does: (o, e) => o.removeDocRow(at(o, e), e) }),
  cmd('step', 'common-next-or-one-before', { at: 'words', keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight', where: ['keys-only'], does: (o, e) => e instanceof KeyboardEvent && o.stepRow(e) }),
];

export default register(OUTLINE) as Command<O>[];
