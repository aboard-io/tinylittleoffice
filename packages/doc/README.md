# Tiny Little Office from the command line, the API and the library

A document is a link: the whole thing is packed into the part of the URL after `#`, which no server ever sees.
`tinyoffice` makes those links from files and files from those links, over `src/api.ts`, the module the site
serves at `/api.js`.

**An agent's quick start**, with Node 24 and nothing installed:

```sh
npx tinylittleoffice shapes sheet                # what a sheet reads: a money column, a formula, a bar chart…
npx tinylittleoffice example sheet money         # the smallest sheet with a money column, its JSON, its lint and measures
npx tinylittleoffice try deck draft.tlo          # a draft's lint, measures and JSON in one call (- for stdin)
npx tinylittleoffice link deck draft.tlo         # its link, once the lint is clean
```

The npm package `tinylittleoffice` is this folder: `dist/tinyoffice.js` (the command line, as both
`tinylittleoffice` and `tinyoffice`) and `dist/api.js` (`import { link, read, lint } from 'tinylittleoffice'` in
Node), each built by `npm run build:cli` from the source here (vite.cli.config.ts: one file with everything it
needs, no dependencies), with every app's examples in `examples/<app>.json`. The deploy publishes it when its
version is new. In a clone, Node 24 runs the source as it is, with no build: `npm ci`, then
`node packages/doc/tinyoffice.ts …` (or `npm run tinyoffice -- …`).

```sh
tinyoffice apps                                  # every app, with a line on each
tinyoffice templates deck                        # a deck's templates; `template deck talk` prints one
echo "- [ ] Sweep" | tinyoffice link write --title Chores --by chores-agent
tinyoffice link plan.tlo                         # a .tlo file names its app in its head
tinyoffice link deck talk.md --view show         # a deck that opens presenting
tinyoffice link sheet budget.md --plain          # the readable form: /sheet/#title=…&doc=…
tinyoffice link write pay.md --seal              # under a password the app makes: the link, then the password
tinyoffice read <link>                           # the document's TLO text (--json for app, title, by and the JSON)
tinyoffice json <link>                           # the document as JSON, to the schema in schema/tlo.schema.json
tinyoffice link sheet --json budget.json         # a link from a document in JSON (its app given, or in its head)
tinyoffice read --text <link>                    # what it says, as Markdown: what a screen reader reads on its Display Link
tinyoffice file <link>                           # <title>.tlo; --as md|json|csv|ics|docx|… for the app's own formats
tinyoffice diff <old link> <new link>            # what the second changed, block by block; exit 1 when they differ
tinyoffice lint talk.tlo                         # what the eye would have seen, a line a finding; exit 1 on one
tinyoffice measure <link>                        # the sizes the layouts chose, slide by slide, and failing formulas, as JSON
tinyoffice shapes <app>                          # the shapes an app reads, a line each
tinyoffice example <app> [shape]                 # the smallest document that shows a shape (every shape without one)
tinyoffice try <app> <file|->                    # lint, measure and the JSON of a draft; exit 1 on a finding
tinyoffice skill --into ~/.claude/skills         # the agent skill, installed for Claude Code (below)
```

The examples are cut by `npm run skill` (scripts/make-skill.ts, scripts/shapes.ts) from the apps' own templates:
for each shape, the smallest document that still shows it, comes back from the kernel byte for byte and lints
clean. The site serves the same files at `https://tinylittleoffice.com/examples/<app>.json`, for an agent that
can only fetch.

Check a document with `lint` and `measure`, never by opening it: they read the same layout code that draws the
pages (a connection naming no thing, a comma splitting a number, a label too long for its box, bullets under a
chart that are not drawn, a headline shrunk or cut, a link too long to paste, a formula that works out to an error
such as `#CIRC`), so no browser is needed.

`file` makes what needs no browser: `.tlo`, `.md` and `.json` for every app, and the app's own formats that are text or
zipped XML (a sheet's `.csv` and `.xlsx`, a calendar's `.ics`, a text's `.docx`…). Pictures and the `.pdf` are
drawn by a browser: open the link with `view=pdf` (or `#/v1/<app>.pdf/…`) to have it downloaded on arrival.

## In code

```js
import { link, plain, read, text, compare, encode, decode, parse, write, toJson, fromJson, apps, templates, file, lint, measure, shapes, example, tryDraft } from 'https://tinylittleoffice.com/api.js';

const url = link('sheet', 'Item | Cost:money\n--- | ---\nRent | 1200\n', { title: 'Budget', by: 'planner-agent' });
read(url);               // { app: 'sheet', view: '', text: '---\ntitle: Budget\nby: planner-agent\n---\n…', title, by, display }
compare(url, revised);   // { same, removed, added, changes: [{ kind: ' ' | '-' | '+', line }…] }
await link('write', 'Salaries…\n', { seal: true });  // { url, password }: the app makes the password; one given is refused
parse(read(url).text);   // the kernel's document: { head, blocks }; write() gives the text back
read(url).json;          // the same document as JSON (toJson(text)); fromJson(json) gives the text back, or throws naming where it does not fit
await text(url);         // '# Budget\n\nItem | Cost\n--- | ---\nRent | $1,200.00\n': what it says, as Markdown
await templates('deck'); // [{ id, name, blurb, text }…]
await lint('deck', text); // [{ app, at: 'slide 3', block, kind, words, fix }…]; [] when clean
await measure('deck', text); // { app, length, words, headings, slides: [{ slide, title: { px, lines, cut }, body: { px, over }, hidden }…] }
await shapes('sheet');   // [{ id: 'money', name: 'a money column', for }…]
await example('sheet', 'money'); // [{ id, name, for, from, text, link, json, lint, measure }]
await tryDraft('deck', text); // { lint, measure, json }
```

The guide an agent reads first is `/llms.txt` (short); the guide to every app's format is served whole as
`/llms-full.txt`, with a page per app at `/llms/<app>.txt`, and is the skill below, cut into its folder.

## As a library

A program or a page that keeps documents of its own, in a database rather than in links, builds on the same modules
as the site (docs/library.md), through five more entry points, each built by `npm run build:lib`
(vite.lib.config.ts):

- `tinylittleoffice/doc`, `dist/doc.js`: the kernel (src/kernel.ts), the document's model, TLO in and out, the
  operations and their inverses, tables and formulas, the document as JSON, what a server that orders several
  people's operations needs (`transform`, `rebase`, `applyEdits`), and who did what in a document several people
  write (`track`, `trackOn`, `changesOf`, `rejectOps`, as the kit serves them). One file, no dependencies, no DOM:
  Node 24, a Worker or a page.
- `tinylittleoffice/commands`, `dist/commands.js`: the command registry for a program (src/commands.ts). A command is
  declared as the editors' are, and may carry what a program reads of it: `input` and `output` as JSON Schema objects,
  `who` may run it, `reads` when it changes nothing, and `doc`, a sentence saying what it does. `tools(commands, actor)`
  is the tool list an assistant or an MCP server serves that actor (`{ name, description, inputSchema }`), and
  `docsOf(commands)` their documentation as Markdown. One file, no dependencies, no DOM; a label that is a message's
  id is said in English.
- `tinylittleoffice/editors`, `dist/editors.js`: every app's editor element, the registry, and the host an app asks
  where a document opens (src/editors.ts), with no shell, no link and no library of kept documents. Its stylesheet is
  `tinylittleoffice/editors.css`, one file; what is fetched only when asked for (an app's templates, a language other
  than English, the trip's map) is in `dist/editors/` beside it. Lit and the rest are inside, as on the site. The
  faces, IBM Plex, are in `dist/fonts/` with their license (the SIL Open Font License), and the stylesheet names them
  there, `./fonts/…`: a page serves that folder beside `editors.css`, at the same path relative to it (a bundler that
  copies the stylesheet's assets does it), or sets the fonts to faces of its own (docs/library.md, Theming).
- `tinylittleoffice/kit`: an app of your own beside the suite's (src/kit.ts): `defineApp`, `DocElement` for its editor,
  `registerApp` to put it beside the suite's apps and `addStrings` for its words, then `mount` as for any app; the
  commands, the kit's elements, its drawing and Lit itself, all from the editors' own file (`dist/editors.js`, so there
  is one Lit and one registry; docs/library.md, An app built outside). What a host's own pages are made of: a typed
  table (`<to-table>`), a search box, a page's header, a template picker, and the small pieces, `<to-segmented>`,
  `confirm`, `<to-field>` (a fact edited where it is shown, a record among its types, picked from the host's search),
  `<to-section>`, `<to-tabs>`, `<to-avatar>` with `initial` and `hueOf`, and `<to-comments plain>` for a record's
  thread (docs/library.md, A typed table and after). And who did what in a document several people write: `track` and
  `changesOf` from its versions by their authors, `rejectOps` for the edit that takes a change back, drawn over a Word
  Processor's words with `ghostsOf`, `paint` and `pinComments`, and "@" offering the page's people (docs/library.md,
  Tracked changes and comments for a host).
- `tinylittleoffice/board`, `dist/board.js`: the Board, cards in lanes by their status over a table, an app of the
  library's that the site does not list (src/board.ts): `registerBoard()` puts it beside the suite's apps, once, and
  `mount('board', …)` draws it, its kit taken from the editors' own file. Its stylesheet is `tinylittleoffice/board.css`,
  beside `editors.css`; its model alone, pure and with no DOM, for a server that makes and changes boards, is
  `tinylittleoffice/board/model` (`dist/board-model.js`, which imports the kernel from `dist/doc.js`). Its words are in
  the editors' languages (docs/library.md, The library's own apps). A page sets on the editor what a card shows
  (`cardFields`), each lane's kind (`laneTone`: won, lost), each lane's look (`laneLook`: narrow or wide, collapsed to
  a strip, a color of the palette: blue, green, amber, red, violet, teal, gray) and each card's (`cardLook`: a tone),
  and hears each change to a lane before it is made (`lanerename`, `laneadd`, `lanemove`, `lanedelete`, `lanelook`); a
  board document keeps its lanes' looks itself, in the head's `lane-looks:` beside `lanes:` (the model's
  `setLaneLook`, and `boardDoc`'s fourth argument), and a lane is reordered from its menu or by dragging its head.

Each is typed, and so is the API (`tinylittleoffice`): the declarations are in `dist/types/` (the stylesheets', empty,
are `editors.css.d.ts` and `board.css.d.ts`), and a TypeScript program reads them with nothing more installed, under `skipLibCheck`, since the commands' declarations name Lucide's `IconNode`
and the editors' name the types of Lit and Lucide, which are bundled in, not installed. An app built on the kit, whose
editor is a `LitElement`, installs `lit` at the kit's version (3.3.3) for its types alone, and imports Lit from the kit.

```js
import { parse, write, apply, applyAll, invert } from 'tinylittleoffice/doc';
const doc = parse('# Plan\n\nShip it.\n');
const op = { op: 'head', key: 'title', value: 'Plan' };
const next = apply(doc, op);
write(next); // the canonical TLO text
write(applyAll(next, invert(doc, op))); // the undo: invert gives the ops that put it back

import { command, register, registered, tools } from 'tinylittleoffice/commands';
register([command({ id: 'lead.create', scope: 'records', label: () => 'New lead', where: ['keys-only'], who: ['team'],
  input: { type: 'object', properties: { company: { type: 'string' } } }, doc: 'Create a lead.', does: (ctx) => ctx.create() })]);
tools(registered(), 'team'); // [{ name: 'lead.create', description: 'Create a lead.', inputSchema: { … } }]

import { mount, host } from 'tinylittleoffice/editors';
import 'tinylittleoffice/editors.css';
Object.assign(host, { link: (app, text) => `/doc/${save(app, text)}` }); // where a placed document opens
const { editor } = await mount('write', text, main, (next) => save(next)); // the editor, drawn; told every edit
```

A page that shares a document with others gives `mount` an `onOps(ops, base)`, told each change's operations, and
hands others' in with the `applyRemote(ops)` it returns, rebased with `rebase` from `/doc`. A page that only shows a
document mounts it `{ readOnly: true }`: nothing in it is edited, and an item activated (a calendar's entry, a sheet's
cell, an outline's item) fires a bubbling `docpick` event (`DocPick`) saying which. `toast(words, { action: { label,
does } })` says something with a button after it, an Undo for one. docs/library.md has each: Shared editing from a
page, and the steps.

## The skill

The package carries the skill, the folder `dist/skill/tinyoffice/`, as Claude Code reads one: `SKILL.md`, under front
matter that says when to use it, holds what every document needs (the link, the rules, the format, the apps, how to
check), and `references/` the rest, a file an app (`deck.md`), one for the files and the API (`api.md`) and one for
the editors' keys (`editors.md`), each read when the task needs it. `npm run skill` writes the folder from one
template and `npm run build:cli` puts it in the package; nothing copies it by hand.

```sh
npx tinylittleoffice skill                              # SKILL.md on stdout
npx tinylittleoffice skill --into ~/.claude/skills      # installs ~/.claude/skills/tinyoffice/, for every project
npx tinylittleoffice skill --into .claude/skills        # for this project alone; --force replaces one already there
```
