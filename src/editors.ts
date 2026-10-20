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
 *   const { editor, applyRemote } = await mount('write', text, main, (next) => save(next), { onOps: (ops, base) => send(ops, base) });
 *
 * An editor element (kit/core/app.ts Editor) takes the document's TLO text as `value` and fires "docchange" with the
 * new text on every edit; `mount` wires the two, and answers Mod+Z and Mod+Shift+Z inside it the way the site's page
 * does (kit/core/keys.ts), since the page the editor is in is where keys are heard. A page that shares a document
 * (docs/library.md, Shared editing from a page) hears each change's ops too (`onOps`, the element's "docops") and hands another's in with
 * `applyRemote` (kit/core/element.ts). A page that only shows a document mounts it `readOnly`: nothing of it is edited,
 * and an item activated in it (a calendar's entry, an outline's item, a sheet's cell) is told in a "docpick" event.
 *
 * A page's own commands (its records, its pipeline) are declared as the kit's and the apps' are (kit/core/commands.ts),
 * drawn by the same functions (cmdTool, cmdMenu, drawnIn) and answered by the same runKey; `mount` given them and
 * their context answers their keys inside the editor after the words', the app's and undo's, so an inner scope wins.
 *
 * `setup`, `editorTag` and `mount` are kit/core/mount.ts's. Everything `tinylittleoffice/kit` serves an app built
 * outside the suite (src/kit.ts) is served here too, since the package's "./kit" is this file at run time; beside it,
 * what only a page sets: the suite's apps in order (`apps`), the languages for a menu, the theme, the size of
 * everything, and the site's page keys for a bar of the page's own.
 */
import './editors.css';
import { KIT_COMMANDS } from './kit/core/keys.ts';

export * from './kit.ts';
export { apps } from './kit/core/apps.ts';
export { chosenLanguage, languages } from './kit/core/i18n.ts';
export { keepThemeAt } from './kit/ui/theme.ts';
export { keepSize, keepSizeAt, size } from './kit/ui/zoom.ts';

/** The site's page keys (undo, redo, print, share…), for a page that draws a bar of its own: kit/core/keys.ts. */
export const pageCommands = KIT_COMMANDS;
