/**
 * Tiny Little Office's kit for an app built outside the suite (docs/library.md, An app built outside): what an app's
 * author needs to make one as the suite's are made, register it beside them, and put it on a page. The first is the
 * app of cards in lanes, which Paul made a library of its own (2026-10-17: "our separate library on top of the new
 * tinylittleoffice library"). The npm package serves it as `tinylittleoffice/kit`.
 *
 *   import { DocElement, addStrings, defineApp, html, mount, registerApp, t } from 'tinylittleoffice/kit';
 *   import { plainText, type Doc } from 'tinylittleoffice/doc';
 *   class TallyEditor extends DocElement<Doc> {
 *     protected read(doc: Doc) { return doc; }
 *     render() { return html`<ol>${this.view.blocks.map((b) => html`<li>${'runs' in b ? plainText(b.runs) : ''}</li>`)}</ol>`; }
 *   }
 *   customElements.define('tally-editor', TallyEditor);
 *   addStrings('en', 'tally-name = Tally\n');   // and the same ids in any other language
 *   registerApp(defineApp({ id: 'tally', get name() { return t(…); }, …, editor: async () => ({ tag: 'tally-editor' }) }));
 *   const { editor } = await mount('tally', text, main, save);
 *
 * At run time this is the editors' own file, dist/editors.js: src/editors.ts exports everything this does
 * (test/kit-entry.test.ts holds it), and the package's "./kit" names that file, typed by this one's declarations
 * (dist/types/kit.d.ts). So an app and the editors share one of everything a module keeps: one Lit (one LitElement, one
 * html, one registry of custom elements), one registry of apps, one of commands, one set of words and one host. Lit is
 * served from here for that reason, with the directives the kit uses (Lit's `live` is `liveValue` here, `live` being
 * the commands'), and an app built outside runs no Lit of its own (it installs lit for its types alone); its icons are
 * Lucide's `IconNode`s, plain data. The kernel is `tinylittleoffice/doc`, as for any program: pure functions, nothing
 * kept, so its copy in the editors' file and the one an app imports never disagree.
 *
 * What is here, by what it is for:
 * - the contract: `defineApp` and the types of a definition (AppDef, Template, Export, Handoff, Page, ViewOpts) and of
 *   its editor (Editor, DocChange); `DocElement`, the editor's base, with its events' types (DocOps, DocPick, Picked)
 *   and its history's (Entry);
 * - the registry: `registerApp` (after the suite's apps; kit/core/apps.ts), `appOf`, and `setup`, `editorTag` and
 *   `mount` (kit/core/mount.ts); `host`, which an app asks where a document opens;
 * - commands (kit/core/commands.ts): declared (`command`, `commandsOf`, `register`, `registered`, `inScope`), run
 *   (`live`, `run`, `runKey`), drawn (`cmdTool`, `cmdBtn`, `cmdMenu`, `drawnIn`, `contextOf`, `labelOf`, `keysText`);
 * - words (kit/core/i18n.ts): `t`, `addStrings` (an app's own Fluent source, to English and any other language),
 *   `language`, `setLanguage` and `onLanguage`; and `toast`, the one voice;
 * - what an editor draws with: the bar (`<to-bar>`, `btn`, `tool`), the menus (`<to-menu>`, `<to-insert>`, MenuItem),
 *   the dialog (`<to-dialog>`), the one editor of words (`<to-text>` and its TextOps), rows chosen whole (`Rows`),
 *   `reveal` and `scrollerOf`; the clipboard's `clipText` and `docToHtml`; an option column's `choicesOf`;
 * - drawing a page with no DOM (kit/draw/draw.ts): the colors, `rect`, `text`, `clip`, `wrapText`, `textWidth`, `xml`,
 *   `utf8` for a file's bytes; the icons (`icon`, `iconNamed`, `UI`);
 * - the Spreadsheet's words for a table: `cellAsShown`, a cell's value as its column shows it (money in its currency, a
 *   date as a date, a rich cell's words), `tableAsCsv`, a document's first table as the Spreadsheet's CSV, and
 *   `asWords`, words written as a cell that reads back as those words whatever they start with ("'=SUM(1)": the
 *   kernel's, served here too); and a page's marks on a read-only sheet's rows and cells (its editor's `marks`,
 *   SheetMark).
 */
export { defineApp, isStill, type AppDef, type DocChange, type Editor, type Export, type ExportContext, type Handoff, type Page, type Template, type ViewOpts } from './kit/core/app.ts';
export { DocElement, firstAt, type DocOps, type DocPick, type Entry, type Picked } from './kit/core/element.ts';
export { appOf, registerApp } from './kit/core/apps.ts';
export { editorTag, mount, setup, type Mounted, type Own } from './kit/core/mount.ts';
export { host, type Host, type Placed } from './kit/core/host.ts';
export { command, commandsOf, contextOf, drawnIn, inScope, keysText, labelOf, live, register, registered, run, runKey, type Command, type Drawn, type Where, type Words } from './kit/core/commands.ts';
export { addStrings, language, onLanguage, setLanguage, t } from './kit/core/i18n.ts';
export { toast, type Action } from './kit/core/say.ts';
export { ToToast } from './kit/ui/toast.ts';
export { btn, cmdBtn, cmdMenu, cmdTool, tool, ToBar, type BtnOpts } from './kit/ui/bar.ts';
export { ToMenu, type MenuItem } from './kit/ui/menu.ts';
export { ToInsert } from './kit/ui/insert.ts';
export { ToDialog } from './kit/ui/dialog.ts';
export { reveal, scrollerOf, type Reveal } from './kit/ui/scroll.ts';
export { ToText, type TextOps } from './kit/text/text.ts';
export { caret, type Pos, type Sel } from './kit/text/textops.ts';
export { lastCopied, Rows, type DropHow, type RowDrag, type RowItem, type RowRange, type RowSpan, type RowsOptions } from './kit/text/rows.ts';
export { clipText, docToHtml, type Clip } from './kit/text/clipboard.ts';
export { choicesOf } from './kit/text/columns.ts';
export { icon, iconNamed, UI, type IconNode } from './kit/draw/icons.ts';
export { ACCENT, clip, FAINT, FONT, INK, LINE, MONO, MUTED, PAPER, rect, SHADE, text, textWidth, utf8, wrapText, xml, type TextStyle } from './kit/draw/draw.ts';
export { cellText as cellAsShown, sheetToCsv as tableAsCsv } from './apps/sheet/view.ts';
export type { SheetMark } from './apps/sheet/editor.ts';
export { asWords } from './doc/index.ts';
export {
  css,
  html,
  LitElement,
  nothing,
  render,
  svg,
  type CSSResult,
  type PropertyDeclarations,
  type PropertyValues,
  type ReactiveController,
  type ReactiveControllerHost,
  type TemplateResult,
} from 'lit';
export { guard } from 'lit/directives/guard.js';
export { keyed } from 'lit/directives/keyed.js';
export { live as liveValue } from 'lit/directives/live.js';
export { repeat } from 'lit/directives/repeat.js';
export { unsafeHTML } from 'lit/directives/unsafe-html.js';
export { unsafeSVG } from 'lit/directives/unsafe-svg.js';
