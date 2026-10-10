/**
 * The Outliner's commands (kit/commands.ts), its editor the context: the bar (Insert ▾, the marks and Link and
 * Footnote, which are the words' own with the row's <to-text> as their context, Icon, Indent, Bring out, Move up and
 * down, Numbered, the zoom, Fold all, Connect, View as ▾), and the keys of a row (docs/editing.md §3 and §8): Tab and
 * Shift+Tab, Alt+Up/Down, Mod+Alt+Up/Down fold and unfold, Mod+Shift+. and Mod+Shift+, zoom in and out, Mod+D, and
 * the arrows between rows at the edge of a row's words. A key acts on the row it is typed in; a button on the row
 * that has the caret. Rows chosen whole are the rows controller's (kit/rows-commands.ts).
 */
import { ArrowDown, ArrowUp, Eye, FoldVertical, Link2, ListOrdered, Plus, UnfoldVertical, ZoomIn, ZoomOut } from 'lucide';
import { appOf, apps } from '../../kit/apps.ts';
import { register, type Command, commandsOf } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
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
  cmd('insert.item', 'Item', { icon: Plus, where: ['menu:insert'], does: (o) => o.addItem() }),
  cmd('insert.web', 'Web Embed…', { icon: UI.globe, where: ['menu:insert'], does: (o) => o.insertWeb() }),
  cmd('insert.doc', 'Tiny Little Office Doc…', { icon: UI.insert, where: ['menu:insert'], does: (o) => o.insertLinked() }),
  ...apps()
    .filter((a) => a.id !== 'outline')
    .map((a) => cmd(`insert.app.${a.id}`, () => a.name, { icon: a.icon, data: true, heading: 'A new document', where: ['menu:insert'], does: (o) => o.insertApp(a.id) })),
];

const OUTLINE: Command<O>[] = [
  cmd('insert', 'Insert', { icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  cmd('icon', 'Icon', { icon: UI.icon, where: ['bar'], disabled: (o) => !words(o), does: (o) => o.pickIcon() }),
  cmd('indent', 'Indent', { at: 'words', icon: UI.indent, keys: 'Tab', where: ['bar'], disabled: (o) => none(o) || !shiftItem(o.doc, o.view, o.sel, 1), does: (o, e) => o.shiftBy(at(o, e), 1) }),
  cmd('outdent', 'Bring out', { at: 'words', icon: UI.outdent, keys: 'Shift+Tab', where: ['bar'], disabled: (o) => none(o) || !shiftItem(o.doc, o.view, o.sel, -1), does: (o, e) => o.shiftBy(at(o, e), -1) }),
  cmd('up', 'Move up', { at: 'words', icon: ArrowUp, keys: 'Alt+ArrowUp', where: ['bar'], disabled: (o) => none(o) || !moveItem(o.doc, o.view, o.sel, -1), does: (o, e) => o.moveBy(at(o, e), -1) }),
  cmd('down', 'Move down', { at: 'words', icon: ArrowDown, keys: 'Alt+ArrowDown', where: ['bar'], disabled: (o) => none(o) || !moveItem(o.doc, o.view, o.sel, 1), does: (o, e) => o.moveBy(at(o, e), 1) }),
  cmd('numbered', 'Numbered', { icon: ListOrdered, where: ['bar'], pressed: (o) => !!o.itemAt(o.sel)?.ord, disabled: (o) => !words(o), does: (o) => o.number() }),
  cmd('zoomout', 'Zoom out', { at: 'words', icon: ZoomOut, keys: 'Mod+Shift+,', where: ['bar'], document: true, when: (o) => o.zoom >= 0, does: (o) => o.zoomOut() }),
  cmd('zoomin', 'Zoom in', { at: 'words', icon: ZoomIn, keys: 'Mod+Shift+.', where: ['bar'], disabled: (o) => none(o) || !hasChildren(o.items, indexAt(o.view, o.sel)), does: (o, e) => o.zoomTo(at(o, e)) }),
  cmd('foldall', 'Fold all', { icon: FoldVertical, where: ['bar'], document: true, does: (o) => o.foldAll(true) }),
  cmd('unfoldall', 'Unfold all', { icon: UnfoldVertical, where: ['bar'], document: true, does: (o) => o.foldAll(false) }),
  cmd('connect', (o) => (o?.connecting ? t('Cancel connecting') : t('Connect')), { icon: Link2, where: ['bar'], pressed: (o) => !!o.connecting, does: (o) => o.connect() }),
  cmd('view', 'View as', { icon: Eye, menu: 'view', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  cmd('view.page', 'As a page', { icon: UI.print, where: ['menu:view'], does: (o) => o.showPage() }),
  ...(def.handoffs ?? []).map((h, i) =>
    cmd(`view.${h.to}${i}`, () => h.label(), { icon: appOf(h.to)?.icon, where: ['menu:view'], when: () => !!appOf(h.to), does: (o) => o.openAs(h) }),
  ),
  cmd('fold', 'Fold, unfold', { at: 'words', keys: 'Mod+Alt+ArrowUp / Mod+Alt+ArrowDown', where: ['keys-only'], does: (o, e) => o.fold(at(o, e), !(e instanceof KeyboardEvent) || e.key === 'ArrowUp') }),
  cmd('duplicate', 'Duplicate', { at: 'words', keys: 'Mod+D', where: ['keys-only'], does: (o, e) => o.duplicateRow(at(o, e)) }),
  cmd('remove', 'Delete', { at: 'words', keys: 'Delete / Backspace', where: ['keys-only'], does: (o, e) => o.removeDocRow(at(o, e), e) }),
  cmd('step', 'The next or the one before', { at: 'words', keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight', where: ['keys-only'], does: (o, e) => e instanceof KeyboardEvent && o.stepRow(e) }),
];

export default register(OUTLINE) as Command<O>[];
