/**
 * Tiny Little Office's editors for a page that is not the site (docs/library.md): the registry, every app's editor
 * element, the host an app asks instead of the address, and what a page sets up once. No shell, no link, no library of
 * kept documents: the page holds the documents, and gives an editor its text and takes the text back. The npm package
 * serves it as `tinylittleoffice/editors`, with its stylesheet beside it.
 *
 *   import { setup, mount, host } from 'tinylittleoffice/editors';
 *   import 'tinylittleoffice/editors.css';
 *   Object.assign(host, { link: (app, text) => `/doc/${save(app, text)}`, read: (words) => … });
 *   await setup();
 *   const editor = await mount('write', text, main, (next) => save(next));
 *
 * An editor element (kit/core/app.ts Editor) takes the document's TLO text as `value` and fires "docchange" with the
 * new text on every edit; `mount` wires the two, and answers Mod+Z and Mod+Shift+Z inside it the way the site's page
 * does (kit/core/keys.ts), since the page the editor is in is where keys are heard.
 *
 * A page's own commands (its records, its board) are declared as the kit's and the apps' are (kit/core/commands.ts),
 * drawn by the same functions (cmdTool, cmdMenu, drawnIn) and answered by the same runKey; `mount` given them and
 * their context answers their keys inside the editor after the words', the app's and undo's, so an inner scope wins.
 */
import './editors.css';
import type { DocChange, Editor } from './kit/core/app.ts';
import { appOf } from './kit/core/apps.ts';
import { KIT_COMMANDS, pageKey, type Page } from './kit/core/keys.ts';
import { register, runKey, type Command } from './kit/core/commands.ts';
import { initLanguage } from './kit/core/i18n.ts';
import { installPlainCopy } from './kit/text/clipboard.ts';
import { pinchSizes } from './kit/ui/pinch.ts';
import { initTheme } from './kit/ui/theme.ts';
import { applySize } from './kit/ui/zoom.ts';
import './kit/ui/toast.ts';

export type { AppDef, DocChange, Editor } from './kit/core/app.ts';
export { host, type Host, type Placed } from './kit/core/host.ts';
export { appOf, apps } from './kit/core/apps.ts';
export { command, contextOf, drawnIn, inScope, keysText, labelOf, live, register, registered, run, runKey, type Command, type Drawn, type Where, type Words } from './kit/core/commands.ts';
export { cmdBtn, cmdMenu, cmdTool } from './kit/ui/bar.ts';
export { chosenLanguage, languages, setLanguage, t } from './kit/core/i18n.ts';
export { setTheme, theme, type Theme } from './kit/ui/theme.ts';
export { keepSize, size } from './kit/ui/zoom.ts';
export { toast } from './kit/core/say.ts';

let ready: Promise<void> | null = null;
/**
 * What the page does once, before an editor is drawn: the theme on the root, the size of everything, a pinch outside
 * the spatial canvases, a plain copy from what is drawn rather than edited, and the language (the browser's, or the
 * one `setLanguage` chose). Idempotent: every mount awaits it.
 */
export function setup(): Promise<void> {
  return (ready ??= (async () => {
    initTheme();
    applySize();
    pinchSizes();
    installPlainCopy();
    await initLanguage();
  })());
}

/**
 * An app's editor element, ready to create: its module loaded and its commands registered (the bar, the menus and the
 * keys are drawn and answered from them). The tag, "to-write-editor".
 */
export async function editorTag(app: string): Promise<string> {
  const def = appOf(app);
  if (!def) throw new Error(`no app "${app}"`);
  const [{ tag }, cmds] = await Promise.all([def.editor(), def.commands?.()]);
  if (cmds) register(cmds.default);
  return tag;
}

/** A page's own commands, and the context they act on (the page's own: its records, its board), for `mount`. */
export interface Own<C> {
  commands: readonly Command<C>[];
  context: C;
}

/**
 * An editor of `app` holding `text`, appended to `into`, `onChange` told the new text on every edit; the page's keys
 * answered inside it: undo and redo, then `own`'s, the page's own commands, in their context. A key the kit's page
 * has nothing for here (find, keep, share, print, the shortcuts, the search) is not taken, and goes on to `own` and to
 * the browser. The element, drawn.
 */
export async function mount<C>(app: string, text: string, into: Element, onChange: (text: string) => void, own?: Own<C>): Promise<Editor> {
  await setup();
  const tag = await editorTag(app);
  const editor = document.createElement(tag) as Editor;
  editor.classList.add('to-editor');
  editor.value = text;
  editor.addEventListener('docchange', (e) => onChange((e as DocChange).detail));
  into.append(editor);
  // false: it did not apply here (kit/core/commands.ts runKey), and the key goes on.
  const none = () => false;
  const page: Page = { flush: () => {}, print: none, shortcuts: none, find: none, keep: none, share: none, download: none, search: none, doc: true, editing: true, editor };
  // The editor's own listeners, the words' and the app's, were added as it was put in the page, so they answer first.
  editor.addEventListener('keydown', (e) => {
    pageKey(e, page);
    if (own) runKey(e, own.commands, own.context);
  });
  await (editor as Editor & { updateComplete?: Promise<unknown> }).updateComplete;
  return editor;
}

/** The page's own commands (undo, redo, print, share…), for a page that draws a bar of its own: kit/core/keys.ts. */
export const pageCommands = KIT_COMMANDS;
