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
import { command, register, type Command } from '../../kit/commands.ts';
import { t } from '../../kit/i18n.ts';
import { UI } from '../../kit/icons.ts';
import { hasChildren, indexAt, moveItem, shiftItem } from './model.ts';
import def from './def.ts';
import type { ToOutlineEditor } from './editor.ts';

type O = ToOutlineEditor;
/** The row a key was typed in, or the row with the caret for a button. */
const at = (o: O, e?: Event) => (e instanceof KeyboardEvent ? o.rowOfKey(e) : o.sel);
const none = (o: O) => !o.itemAt(o.sel);
const words = (o: O) => !!o.itemAt(o.sel) && !o.itemAt(o.sel)!.doc;

export const INSERTS: Command<O>[] = [
  command<O>({ id: 'outline.insert.item', scope: 'outline', label: () => t('Item'), icon: Plus, where: ['menu:insert'], does: (o) => o.addItem() }),
  command<O>({ id: 'outline.insert.web', scope: 'outline', label: () => t('Web Embed…'), icon: UI.globe, where: ['menu:insert'], does: (o) => o.insertWeb() }),
  command<O>({ id: 'outline.insert.doc', scope: 'outline', label: () => t('Tiny Little Office Doc…'), icon: UI.insert, where: ['menu:insert'], does: (o) => o.insertLinked() }),
  ...apps()
    .filter((a) => a.id !== 'outline')
    .map((a) => command<O>({ id: `outline.insert.app.${a.id}`, scope: 'outline', label: () => a.name, icon: a.icon, heading: () => t('A new document'), where: ['menu:insert'], does: (o) => o.insertApp(a.id) })),
];

const OUTLINE: Command<O>[] = [
  command<O>({ id: 'outline.insert', scope: 'outline', label: () => t('Insert'), icon: UI.insert, menu: 'insert', where: ['bar'], takesFocus: true, does: () => undefined }),
  ...INSERTS,
  command<O>({ id: 'outline.icon', scope: 'outline', label: () => t('Icon'), icon: UI.icon, where: ['bar'], disabled: (o) => !words(o), does: (o) => o.pickIcon() }),
  command<O>({ id: 'outline.indent', scope: 'outline', label: () => t('Indent'), icon: UI.indent, keys: 'Tab', where: ['bar'], disabled: (o) => none(o) || !shiftItem(o.doc, o.view, o.sel, 1), does: (o, e) => o.shiftBy(at(o, e), 1) }),
  command<O>({ id: 'outline.outdent', scope: 'outline', label: () => t('Bring out'), icon: UI.outdent, keys: 'Shift+Tab', where: ['bar'], disabled: (o) => none(o) || !shiftItem(o.doc, o.view, o.sel, -1), does: (o, e) => o.shiftBy(at(o, e), -1) }),
  command<O>({ id: 'outline.up', scope: 'outline', label: () => t('Move up'), icon: ArrowUp, keys: 'Alt+ArrowUp', where: ['bar'], disabled: (o) => none(o) || !moveItem(o.doc, o.view, o.sel, -1), does: (o, e) => o.moveBy(at(o, e), -1) }),
  command<O>({ id: 'outline.down', scope: 'outline', label: () => t('Move down'), icon: ArrowDown, keys: 'Alt+ArrowDown', where: ['bar'], disabled: (o) => none(o) || !moveItem(o.doc, o.view, o.sel, 1), does: (o, e) => o.moveBy(at(o, e), 1) }),
  command<O>({ id: 'outline.numbered', scope: 'outline', label: () => t('Numbered'), icon: ListOrdered, where: ['bar'], pressed: (o) => !!o.itemAt(o.sel)?.ord, disabled: (o) => !words(o), does: (o) => o.number() }),
  command<O>({ id: 'outline.zoomout', scope: 'outline', label: () => t('Zoom out'), icon: ZoomOut, keys: 'Mod+Shift+,', where: ['bar'], document: true, when: (o) => o.zoom >= 0, does: (o) => o.zoomOut() }),
  command<O>({ id: 'outline.zoomin', scope: 'outline', label: () => t('Zoom in'), icon: ZoomIn, keys: 'Mod+Shift+.', where: ['bar'], disabled: (o) => none(o) || !hasChildren(o.items, indexAt(o.view, o.sel)), does: (o, e) => o.zoomTo(at(o, e)) }),
  command<O>({ id: 'outline.foldall', scope: 'outline', label: () => t('Fold all'), icon: FoldVertical, where: ['bar'], document: true, does: (o) => o.foldAll(true) }),
  command<O>({ id: 'outline.unfoldall', scope: 'outline', label: () => t('Unfold all'), icon: UnfoldVertical, where: ['bar'], document: true, does: (o) => o.foldAll(false) }),
  command<O>({ id: 'outline.connect', scope: 'outline', label: (o) => (o?.connecting ? t('Cancel connecting') : t('Connect')), icon: Link2, where: ['bar'], pressed: (o) => !!o.connecting, does: (o) => o.connect() }),
  command<O>({ id: 'outline.view', scope: 'outline', label: () => t('View as'), icon: Eye, menu: 'view', where: ['bar'], document: true, takesFocus: true, does: () => undefined }),
  command<O>({ id: 'outline.view.page', scope: 'outline', label: () => t('As a page'), icon: UI.print, where: ['menu:view'], does: (o) => o.showPage() }),
  ...(def.handoffs ?? []).map((h, i) =>
    command<O>({ id: `outline.view.${h.to}${i}`, scope: 'outline', label: () => h.label(), icon: appOf(h.to)?.icon, where: ['menu:view'], when: () => !!appOf(h.to), does: (o) => o.openAs(h) }),
  ),
  command<O>({ id: 'outline.fold', scope: 'outline', label: () => t('Fold'), keys: 'Mod+Alt+ArrowUp', where: ['keys-only'], does: (o, e) => o.fold(at(o, e), true) }),
  command<O>({ id: 'outline.unfold', scope: 'outline', label: () => t('Unfold'), keys: 'Mod+Alt+ArrowDown', where: ['keys-only'], does: (o, e) => o.fold(at(o, e), false) }),
  command<O>({ id: 'outline.duplicate', scope: 'outline', label: () => t('Duplicate'), keys: 'Mod+D', where: ['keys-only'], does: (o, e) => o.duplicateRow(at(o, e)) }),
  command<O>({ id: 'outline.remove', scope: 'outline', label: () => t('Delete'), keys: 'Delete / Backspace', where: ['keys-only'], does: (o, e) => o.removeDocRow(at(o, e), e) }),
  command<O>({ id: 'outline.step', scope: 'outline', label: () => t('The row before or after, at the edge of the words'), keys: 'ArrowUp / ArrowDown / ArrowLeft / ArrowRight', where: ['keys-only'], does: (o, e) => e instanceof KeyboardEvent && o.stepRow(e) }),
];

export default register(OUTLINE) as Command<O>[];
