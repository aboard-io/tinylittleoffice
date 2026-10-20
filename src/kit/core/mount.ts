/**
 * An editor put on a page that is not the site (docs/library.md): what the page does once (`setup`), an app's element
 * made ready (`editorTag`), and an editor of it drawn with a document in it (`mount`). Both library entry points serve
 * these, `tinylittleoffice/editors` to a page and `tinylittleoffice/kit` to an app built outside the suite, which
 * mounts its own editor the same way once it is registered (kit/core/apps.ts registerApp); they live here rather than
 * in either entry because each entry serves them, and the editors' entry serves everything the kit's does.
 *
 * An editor element (kit/core/app.ts Editor) takes the document's TLO text as `value` and fires "docchange" with the
 * new text on every edit; `mount` wires the two, and answers Mod+Z and Mod+Shift+Z inside it the way the site's page
 * does (kit/core/keys.ts), since the page the editor is in is where keys are heard. A page that shares a document hears
 * each change's ops too (`onOps`, the element's "docops") and hands another's in with `applyRemote`
 * (kit/core/element.ts). A page that only shows a document mounts it `readOnly`. A page's own commands, given to
 * `mount` with their context, are answered inside the editor after the words', the app's and undo's, so an inner scope
 * wins.
 */
import type { DocChange, Editor } from './app.ts';
import { appOf } from './apps.ts';
import type { DocElement, DocOps, OwnTools } from './element.ts';
import type { Op } from '../../doc/index.ts';
import { pageKey, type Page } from './keys.ts';
import { register, runKey, type Command } from './commands.ts';
import { initLanguage } from './i18n.ts';
import { installPlainCopy } from '../text/clipboard.ts';
import { pinchSizes } from '../ui/pinch.ts';
import { initTheme } from '../ui/theme.ts';
import { toastAnywhere } from '../ui/toast.ts';
import { applySize } from '../ui/zoom.ts';

let ready: Promise<void> | null = null;
/**
 * What the page does once, before an editor is drawn: the theme on the root, the size of everything, a pinch outside
 * the spatial canvases, a plain copy from what is drawn rather than edited, a toast for a page with none of its own
 * (kit/ui/toast.ts toastAnywhere), and the language (the browser's, or the one `setLanguage` chose). Idempotent: every
 * mount awaits it.
 */
export function setup(): Promise<void> {
  return (ready ??= (async () => {
    toastAnywhere();
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

/**
 * What else a page gives `mount`: its own commands and the context they act on (the page's own: its records, its
 * pipeline), their keys answered inside the editor and those `where` the bar drawn in the editor's bar, a group of their
 * own after the editor's tools and before Undo and Redo; and for a shared document `onOps`, told each change's ops and how many the editor had applied before them
 * (kit/core/element.ts DocOps), before `onChange` is told its text; `readOnly`, a document shown and not edited, drawn so
 * from the first (the element's `readonly`: no bar, no typing, and a "docpick" for an item activated).
 */
export interface Own<C> {
  commands?: readonly Command<C>[];
  context?: C;
  onOps?: (ops: Op[], base: number) => void;
  readOnly?: boolean;
}

/** An editor mounted: the element, and what takes another's ops in (DocElement's `applyRemote`: applied, nothing told, the history carried over them). */
export interface Mounted {
  editor: Editor;
  applyRemote(ops: Op[]): void;
}

/**
 * An editor of `app` holding `text`, appended to `into`, `onChange` told the new text on every edit; the page's keys
 * answered inside it: undo and redo, then `own`'s, the page's own commands, in their context. A key the kit's page
 * has nothing for here (find, keep, share, print, the shortcuts, the search) is not taken, and goes on to `own` and to
 * the browser. The element, drawn, and its `applyRemote`.
 */
export async function mount<C>(app: string, text: string, into: Element, onChange: (text: string) => void, own?: Own<C>): Promise<Mounted> {
  await setup();
  const tag = await editorTag(app);
  const editor = document.createElement(tag) as Editor;
  editor.classList.add('to-editor');
  editor.value = text;
  if (own?.readOnly) editor.readOnly = true;
  // The page's commands drawn in the editor's bar, a group of their own (kit/core/element.ts ownTools); their keys below.
  // (The element keeps a page's commands of any context: OwnTools<never>, which this page's are once their context is forgotten.)
  if (own?.commands?.length) (editor as unknown as DocElement<unknown>).own = { commands: own.commands, context: own.context } as unknown as OwnTools<never>;
  const onOps = own?.onOps;
  if (onOps) editor.addEventListener('docops', (e) => onOps((e as DocOps).detail.ops, (e as DocOps).detail.base));
  editor.addEventListener('docchange', (e) => onChange((e as DocChange).detail));
  into.append(editor);
  // false: it did not apply here (kit/core/commands.ts runKey), and the key goes on.
  const none = () => false;
  const page: Page = { flush: () => {}, print: none, shortcuts: none, find: none, keep: none, share: none, download: none, search: none, doc: true, editing: true, editor };
  // The editor's own listeners, the words' and the app's, were added as it was put in the page, so they answer first.
  editor.addEventListener('keydown', (e) => {
    pageKey(e, page);
    if (own?.commands) runKey(e, own.commands, own.context as C);
  });
  await (editor as Editor & { updateComplete?: Promise<unknown> }).updateComplete;
  // Every app's editor is a DocElement (kit/core/element.ts).
  const el = editor as unknown as DocElement<unknown>;
  return { editor, applyRemote: (ops) => el.applyRemote(ops) };
}
