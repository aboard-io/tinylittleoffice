/**
 * The keyboard shortcuts dialog (Mod+/, and Keyboard shortcuts in the menu): the standard's table
 * (docs/editing.md §1) and the page's own keys, then the keys the open app answers (AppDef.keys), each
 * written the way this device writes them (⌘ on a Mac, Ctrl elsewhere). Nothing here listens for a key:
 * the shell does (shell.ts onKey), and each app its own.
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

/** The page's own keys, the shell's. */
export const PAGE: Shortcut[] = [
  k('Mod+F', () => t('Find in this document')),
  k('Mod+S', () => t('Keep this document on the device')),
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
