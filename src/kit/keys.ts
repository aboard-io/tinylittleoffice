/**
 * The keyboard shortcuts dialog (Mod+/, and Keyboard shortcuts in the menu): the standard's table
 * (docs/editing.md §1) and the page's own keys, then the keys the open app answers (AppDef.keys), each
 * written the way this device writes them (⌘ on a Mac, Ctrl elsewhere). The page's own keys are answered here
 * too (pageKey, which the shell listens with), and Mod+Z and Mod+Shift+Z passed to the editor; each app answers its own.
 */
import { html, nothing, type TemplateResult } from 'lit';
import type { AppDef, Shortcut } from './app.ts';
import { keysText } from './bar.ts';
import { t } from './i18n.ts';

const k = (keys: string, does: () => string): Shortcut => ({ keys, does });

/** The keys that mean the same in every app (docs/editing.md §1). */
export const EVERYWHERE: Shortcut[] = [
  k('Mod+Z', () => t('Undo')),
  k('Mod+Shift+Z / Mod+Y', () => t('Redo')),
  k('Mod+C / Mod+X / Mod+V', () => t('Copy, cut, paste what is selected')),
  k('Mod+A', () => t('Select all: the words of the box, then everything')),
  k('Delete / Backspace', () => t('Remove what is selected')),
  k('Escape', () => t('Step out: close, collapse, let go')),
  k('Enter', () => t('Edit the thing selected; the primary button in a dialog')),
  k('Tab / Shift+Tab', () => t('Indent or bring out in a list; the next cell in a grid')),
  k('Alt+ArrowUp / Alt+ArrowDown', () => t('Move the selected items up or down')),
  k('Mod+D', () => t('Duplicate')),
  k('Mod+Enter', () => t('Tick or untick a task')),
];

/** The marks on words, wherever words are typed. */
export const WORDS: Shortcut[] = [
  k('Mod+B', () => t('Bold')),
  k('Mod+I', () => t('Italic')),
  k('Mod+U', () => t('Underline')),
  k('Mod+K', () => t('Link')),
];

/** Share… and Download, the drawer's This document (kit/drawer.ts writes them beside its rows). */
export const SHARE_KEYS = 'Mod+Shift+S';
export const DOWNLOAD_KEYS = 'Mod+Shift+D';

/** The page's own keys, the shell's. */
export const PAGE: Shortcut[] = [
  k('Mod+F', () => t('Find in this document')),
  k('Mod+S', () => t('Keep this document on the device')),
  k(SHARE_KEYS, () => t('Share…')),
  k(DOWNLOAD_KEYS, () => t('Download')),
  k('Mod+P', () => t('Print, or save as PDF')),
  k('Mod+/', () => t('Show these shortcuts')),
];

/** "Mod+Shift+Z / Mod+Y" as this device writes it. */
export const keysWritten = (keys: string) =>
  keys
    .split(' / ')
    .map((one) => keysText(one).replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('ArrowLeft', '←').replace('ArrowRight', '→'))
    .join(' / ');

/** The groups the dialog shows: the app's own first when there is an app. */
export function shortcutGroups(def?: AppDef): { heading: string; keys: Shortcut[] }[] {
  return [
    ...(def?.keys?.length ? [{ heading: def.name, keys: def.keys }] : []),
    { heading: t('Everywhere'), keys: EVERYWHERE },
    { heading: t('Words'), keys: WORDS },
    { heading: t('This page'), keys: PAGE },
  ];
}

/** The dialog's body: a table a group. */
export function renderShortcuts(def?: AppDef): TemplateResult {
  return html`${shortcutGroups(def).map(
    (g) => html`<table class="to-keys">
      <caption>${g.heading}</caption>
      <tbody>${g.keys.map((s) => html`<tr><th scope="row"><kbd>${keysWritten(s.keys)}</kbd></th><td>${s.does()}</td></tr>`)}</tbody>
    </table>`,
  )}${nothing}`;
}

/** What the page's keys act on: the shell. */
export interface Page {
  /** The link made current: a key with Alt or Mod may leave the page or the document (Back, a new tab). */
  flush(): void;
  print(): void;
  shortcuts(): void;
  find(): void;
  keep(): void;
  /** The Share dialog; the drawer with its Download table open. */
  share(): void;
  download(): void;
  /** A document is open (Mod+P), and for editing, not as its pages (Mod+F, Mod+S). */
  doc: boolean;
  editing: boolean;
  editor: Element | null;
}

/**
 * The page's keys (PAGE): Mod+P prints, Mod+/ the shortcuts, Mod+F finds, Mod+S keeps, Mod+Shift+S shares, Mod+Shift+D
 * downloads. Undo and redo are the
 * editor's (the kernel's history): the keys are only passed on, and only from the editor itself (or from nowhere, the
 * page's body). Typed in a dialog, a popover, the header, the link or note box, or a field of the kit's own, Mod+Z is
 * that place's own; during an IME composition it is the IME's.
 */
export function pageKey(e: KeyboardEvent, page: Page): void {
  if ((e.metaKey || e.ctrlKey || e.altKey) && !['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) page.flush();
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.isComposing) return;
  const k = e.key.toLowerCase();
  const act = k === 'p' && page.doc ? page.print : k === '/' || k === '?' ? page.shortcuts : k === 'f' && !e.shiftKey && page.editing && page.editor ? page.find : k === 's' && !e.shiftKey && page.editing ? page.keep : k === 's' && page.editing ? page.share : k === 'd' && e.shiftKey && page.editing ? page.download : null;
  if (act) {
    e.preventDefault();
    return act();
  }
  const editor = page.editor;
  if (!editor || !fromEditor(e, editor)) return;
  const which = k === 'z' && !e.shiftKey ? 'docundo' : (k === 'z' && e.shiftKey) || k === 'y' ? 'docredo' : '';
  if (which && !editor.dispatchEvent(new CustomEvent(which, { cancelable: true, bubbles: true }))) e.preventDefault();
}

/** Whether a key is the editor's: typed inside it, outside every dialog, popover, box and field of the kit's own (or with nothing focused). */
function fromEditor(e: KeyboardEvent, editor: Element): boolean {
  const at = e.target as Element | null;
  if (!at || at === document.body || at === document.documentElement) return true;
  if (!(at instanceof Element) || !editor.contains(at)) return false;
  // An app's own fields (a sheet's cells) are the app's to answer; the kit's (class to-…) keep their own undo.
  return !at.closest('dialog, [popover], to-dialog, to-drawer, to-link-pop, .to-header') && !at.matches('input[class*="to-"], textarea[class*="to-"]');
}
