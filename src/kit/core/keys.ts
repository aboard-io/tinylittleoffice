/**
 * The page's own commands (the registry's 'kit' scope, kit/core/commands.ts): undo and redo passed to the editor, find,
 * keep, share, download, print, the shortcuts, the size of everything and the search for anything (the drawer's). The shell answers their
 * keys (pageKey, which it listens with on the window, so every scope inside has answered first); the drawer draws
 * Share, Download and Find in this document from them; every bar ends with Undo and Redo
 * (DocElement.undoTools), and under a finger Undo and Redo are pinned there, outside the bar's scroll, so a phone always
 * has Undo on screen (the review of 2026-10-11).
 *
 * The keyboard shortcuts dialog (Mod+/, and found by the drawer's search) is the registry as it stands: the open
 * app's commands that have keys, then the words' (kit/text/text-commands.ts), then the page's, each key written the way
 * this device writes it (keysText: ⌘ on a Mac, Ctrl elsewhere).
 */
import { html, nothing, type TemplateResult } from 'lit';
import type { AppDef } from './app.ts';
import { command, inScope, keyboard, keysText, labelOf, register, runKey, type Command } from './commands.ts';
import { t } from './i18n.ts';
import { UI } from '../draw/icons.ts';
import { TEXT_COMMANDS } from '../text/text-commands.ts';
import { size, SIZE_MAX, SIZE_MIN, stepSize } from '../ui/zoom.ts';

/** What Undo and Redo act on: the editor (the shell's, or a bar's own). */
export interface HasEditor {
  editor: Element | null;
}
/** What the page's keys act on: the shell. */
export interface Page extends HasEditor {
  /** The link made current: a key with Alt or Mod may leave the page or the document (Back, a new tab). */
  flush(): void;
  print(): void;
  shortcuts(): void;
  find(): void;
  keep(): void;
  /** The Share dialog; the drawer with its Download table open. */
  share(): void;
  download(): void;
  /** The drawer, its search focused (Mod+K). */
  search(): void;
  /** A document is open (Mod+P), and for editing, not as its pages (Mod+F, Mod+S). */
  doc: boolean;
  editing: boolean;
}

/** Undo or redo asked of the editor, from a key typed inside it (or with nothing focused), or from its bar. */
const history = (which: 'docundo' | 'docredo') => (p: HasEditor, e?: Event) => {
  const editor = p.editor;
  if (!editor || (e instanceof KeyboardEvent && !fromEditor(e, editor))) return false;
  // The editor says whether it took it (it cancels the event): a key it did not take stays the browser's.
  return !editor.dispatchEvent(new CustomEvent(which, { cancelable: true, bubbles: true }));
};

export const UNDO = command<HasEditor>({
  id: 'kit.undo',
  scope: 'kit',
  label: 'bar-undo',
  group: 'history',
  icon: UI.undo,
  keys: 'Mod+Z',
  where: ['bar'],
  pinned: true,
  when: (p) => !!p.editor,
  does: history('docundo'),
});
export const REDO = command<HasEditor>({
  id: 'kit.redo',
  scope: 'kit',
  label: 'bar-redo',
  group: 'history',
  icon: UI.redo,
  keys: 'Mod+Shift+Z / Mod+Y',
  where: ['bar'],
  pinned: true,
  when: (p) => !!p.editor,
  does: history('docredo'),
});
export const SHARE = command<Page>({
  id: 'kit.share',
  scope: 'kit',
  label: 'common-share',
  icon: UI.share,
  keys: 'Mod+Shift+S',
  where: ['drawer'],
  document: true,
  takesFocus: true,
  when: (p) => p.editing,
  does: (p) => p.share(),
});
export const DOWNLOAD = command<Page>({
  id: 'kit.download',
  scope: 'kit',
  label: 'shell-download',
  icon: UI.download,
  keys: 'Mod+Shift+D',
  where: ['drawer'],
  document: true,
  takesFocus: true,
  when: (p) => p.editing,
  does: (p) => p.download(),
});
/**
 * The size of everything (kit/ui/zoom.ts), from the drawer's stepper and its search, with no keys: Ctrl+=, Ctrl+- and Ctrl+0
 * are the browser's own zoom, and a keyboard keeps them.
 */
export const LARGER = command<unknown>({
  id: 'kit.larger',
  scope: 'kit',
  label: 'keys-everything-larger',
  icon: UI.plus,
  where: ['drawer'],
  disabled: () => size() >= SIZE_MAX,
  does: () => stepSize(1),
});
export const SMALLER = command<unknown>({
  id: 'kit.smaller',
  scope: 'kit',
  label: 'keys-everything-smaller',
  icon: UI.minus,
  where: ['drawer'],
  disabled: () => size() <= SIZE_MIN,
  does: () => stepSize(-1),
});
export const NORMAL_SIZE = command<unknown>({ id: 'kit.normal-size', scope: 'kit', label: 'keys-normal-size', icon: UI.view, where: ['drawer'], does: () => stepSize(0) });
/** Mod+K: the drawer with its search focused, which finds an app, a document, a template or a command (kit/ui/drawer.ts). */
export const SEARCH = command<Pick<Page, 'search'>>({
  id: 'kit.search',
  scope: 'kit',
  label: 'common-find-app-doc-template-or',
  icon: UI.search,
  keys: 'Mod+K',
  where: ['keys-only'],
  takesFocus: true,
  does: (p) => p.search(),
});

/** The page's commands, in the order the dialog lists them. */
export const KIT_COMMANDS = register([
  UNDO,
  REDO,
  command<Page>({
    id: 'kit.find',
    scope: 'kit',
    label: 'common-in-this-document',
    icon: UI.search,
    keys: 'Mod+F',
    where: ['drawer'],
    takesFocus: true,
    when: (p) => p.editing && !!p.editor,
    does: (p) => p.find(),
  }),
  command<Page>({ id: 'kit.keep', scope: 'kit', label: 'keys-keep-this-document-on-device', icon: UI.device, keys: 'Mod+S', where: ['keys-only'], when: (p) => p.editing, does: (p) => p.keep() }),
  SHARE,
  DOWNLOAD,
  command<Page>({ id: 'kit.print', scope: 'kit', label: 'common-print-or-save-as-pdf', icon: UI.print, keys: 'Mod+P', where: ['keys-only'], when: (p) => p.doc, does: (p) => p.print() }),
  command<Page>({ id: 'kit.shortcuts', scope: 'kit', label: 'keys-show-these-shortcuts', icon: UI.keys, keys: 'Mod+/', where: ['keys-only'], takesFocus: true, does: (p) => p.shortcuts() }),
  LARGER,
  SMALLER,
  NORMAL_SIZE,
  SEARCH as Command<Page>,
]) as Command<Page>[];

/** The groups the dialog shows: the app's own first when there is an app, then the words', then the page's. */
export function shortcutGroups(def?: AppDef): { heading: string; keys: Command[] }[] {
  const keyed = (cmds: Command[]) => cmds.filter((c) => c.keys);
  const own = def ? keyed(inScope(def.id)) : [];
  return [...(def && own.length ? [{ heading: def.name, keys: own }] : []), { heading: t('common-words'), keys: keyed(TEXT_COMMANDS) }, { heading: t('keys-this-page'), keys: keyed(KIT_COMMANDS) }];
}

/** The dialog's body: a table a group. */
export function renderShortcuts(def?: AppDef): TemplateResult {
  return html`${shortcutGroups(def).map(
    (g) => html`<table class="to-table to-keys">
      <caption>${g.heading}</caption>
      <tbody>${g.keys.map((c) => html`<tr><th scope="row"><kbd>${keysText(c.keys!)}</kbd></th><td>${labelOf(c)}</td></tr>`)}</tbody>
    </table>`,
  )}${nothing}`;
}

/**
 * The page's keys: the kit's commands, answered last (from the window), so the words and the app have answered
 * theirs first and a key one of them took is not the page's. A key with Alt or Mod makes the link current first. Undo
 * and redo are the editor's (the kernel's history): the keys are only passed on, and only from the editor itself (or
 * from nowhere, the page's body). Typed in a dialog, a popover, the header, the link or note box, or a field of the
 * kit's own, Mod+Z is that place's own; during an IME composition it is the IME's.
 */
export function pageKey(e: KeyboardEvent, page: Page): void {
  // A key with Ctrl, ⌘ or Alt: a keyboard is here (a phone's own types none), so the menus write their keys again.
  if (e.metaKey || e.ctrlKey || e.altKey) keyboard.seen = true;
  if ((e.metaKey || e.ctrlKey || e.altKey) && !['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) page.flush();
  runKey(e, KIT_COMMANDS, page);
}

/** Whether a key is the editor's: typed inside it, outside every dialog, popover, box and field of the kit's own (or with nothing focused). */
function fromEditor(e: KeyboardEvent, editor: Element): boolean {
  const at = e.target as Element | null;
  if (!at || at === document.body || at === document.documentElement) return true;
  if (!(at instanceof Element) || !editor.contains(at)) return false;
  // An app's own fields (a sheet's cells) are the app's to answer; the kit's (class to-…) keep their own undo.
  return !at.closest('dialog, [popover], to-dialog, to-drawer, to-link-pop, .to-header') && !at.matches('input[class*="to-"], textarea[class*="to-"]');
}
