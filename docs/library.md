# Tiny Little Office as a library

Tiny Little Office is becoming a library other pages build on, first among them Atlas (github.com/aboard-io/atlas,
its docs/plan.md): its documents are built with the kernel and edited with these editors, kept in Postgres rather than in
links. The site stays what it is, and is the library's first user: whatever an editor needs from the page it is in, the
site gives it the way any other page would. And an app need not be the suite's: one built outside it, on
`tinylittleoffice/kit`, registers beside the suite's apps and is mounted as they are (An app built outside). The
first is the app of cards in lanes, which Paul made a library of its own (2026-10-17: "our separate library on top of
the new tinylittleoffice library").

## What a page that holds an editor needs

The contract is already small. An app is a definition (kit/core/app.ts `AppDef`, read under node) and an editor element
that takes the document's TLO text as `value` and fires `docchange` with the new text on every edit; the editor draws
its own bar. `<to-shell>` is the site's page: it owns the address, the library of kept documents, the chrome, Share, the
password, and hands the editor its text. Nothing in an app reaches for the shell.

What an app still asked of the site itself, and what replaces it:

| what | where it was | now |
|---|---|---|
| where a document opens on its own (Open in new tab, See more, a hand-off, a deck's take-home link) | `location` in deck, outline, write | `host.link()` (kit/core/host.ts) |
| which document a pasted link names | the route's `parseHash` in outline | `host.read()` |
| a device preference (the trip's map) | kit/core/store.ts | stays: localStorage on the page's own origin, memory without it |
| the services a trip reaches (place search, map tiles) | kit/core/network.ts | stays, a list a page may override later |

`host` is an object every app asks, the site's answers its defaults, and a page with its own puts them in
(`Object.assign(host, …)`), as kit/core/apps.ts fills `lookup`. A lint (test/lints.test.ts) holds that no app names
`location` or `history`.

## The steps

1. **The host.** Done: kit/core/host.ts, and the lint.
2. **The entry points.** Done: src/kernel.ts and src/editors.ts, built by `npm run build:lib` (vite.lib.config.ts)
   into packages/doc/dist beside the command line's files, and published with them by the deploy. The package serves
   `tinylittleoffice/doc` (dist/doc.js: the kernel, the model, ops, TLO, JSON and formulas, and who did what in a
   document several people write, one file with no dependencies and no DOM, for Node 24 or a page), `tinylittleoffice/editors` (dist/editors.js: the registry, each
   app's editor element, the host, and what a page sets up once, the language, the theme and the size, with no shell;
   Lit and the rest bundled in, as the site bundles its app file) and `tinylittleoffice/editors.css` (its stylesheet,
   one file). What the editors fetch only when asked for, an app's templates, a language other than English and the
   trip's map and its worker, is in dist/editors/ beside them. The site's build keeps its own entry; both are built
   from the same modules. test/package.test.ts packs and installs the package and runs the kernel from it; the
   stylesheet names the fonts the package carries beside it (./fonts/…): see Theming. The package is typed: build:lib
   writes the declarations of `/doc`, `/editors`, `/commands` (step 6) and `/kit` (step 11) and of the API into dist/types
   (tsconfig.lib.json), which each export names first, `/editors.css` has an empty one of its own
   (packages/doc/editors.css.d.ts), and test/package.test.ts type-checks a strict program that imports all of them
   against them as installed (with `skipLibCheck`, since the commands' declarations name Lucide's `IconNode` and the
   editors' name Lit's and Lucide's types, which are bundled in, not installed).

   `tinylittleoffice/editors` exports everything `tinylittleoffice/kit` does (step 11: among it the commands'
   functions, A page's own commands; `setup`, `mount` and `editorTag`, an app's element ready to create, from
   kit/core/mount.ts; `host`; `appOf` and `registerApp`; `setLanguage`, `t` and `addStrings`; `toast`; and the types
   `AppDef`, `Editor`, `DocChange`, `DocOps`, `DocPick`, `Picked`, `Mounted`, `Host`, `Placed` and `Action`, a
   toast's), and beside it what only a page sets: `apps` (the suite's, in order), `chosenLanguage` and `languages`,
   `setTheme`, `theme` and the type `Theme`, `keepSize` and `size`, and `pageCommands` (the site's page keys, for a page
   that draws a bar of its own).
3. **The stylesheet for a page that is not the site.** Done: src/editors.css is everything an editor needs (the
   fonts, the tokens, the kit, the text editor, the rules by width and by a person's settings, and each app's own sheet,
   which its editor brings), and src/styles/page.css is the site's page and chrome (`html` and `body`, `<to-shell>`,
   `<to-chrome>`, the header, the column and the bar's place in it, the drawer, the banners, the home page, Share,
   Privacy, the Display Link's view, Compare). The site's styles.css is the two, in the same layers: the same rules,
   page.css's at the end of each layer, which the cascade allows because none of them meets a rule of the editors'
   on one element at the same weight (one did, a Share link's face, and stays where it was in kit.css). The editors'
   sheet adds one rule the site's body makes needless (src/styles/standalone.css: the type and the ink on the
   editors and what they put on the page). test/browser/editors.test.ts holds that no rule of it names the root, the
   body or the shell, and that a page's own body keeps its own margin, ground and type.
4. **A page's own commands.** Done: a page declares a scope of its own beside the kit's (Atlas's records, its
   pipeline), and draws and answers it with the kit's functions: see A page's own commands.
5. **A bare page.** Done: test/browser/editors.test.ts mounts `<to-write-editor>` on a bare page with a host of its
   own, types in it and reads the `docchange`.
6. **Commands for a program.** Done: src/commands.ts, served as `tinylittleoffice/commands` (dist/commands.js), the
   registry with a program's half and the two derivations Atlas's docs/commands.md asks of it: see Commands for a
   program.
7. **Editors speak in ops, and take remote ops.** Done: every editor tells each change as its operations and takes
   another's in, for a page that shares a document: see Shared editing from a page. For the server that orders them
   (Atlas's plan, phase 3), `tinylittleoffice/doc` serves `transform`, `rebase` and `applyEdits` (src/doc/sync.ts);
   docs/kernel.md §12 is the design, its rules and its properties.
8. **Read-only.** Done: `readonly` on an editor (`mount(…, { readOnly: true })`) draws no bar (a calendar keeps back,
   on and Today) and takes no typing, drag or edit; an item activated fires `docpick`, `{ at }` and the app's key (a
   calendar's `date`, `time` or `row`, an outline's `item`, a deck's `slide`, a sheet's `row`, `col`).
   Those four apps pick; the Word Processor, the Drawing Tool, the Diagram Maker, the Animator, the Trip Planner and the
   Calculator have no item to open (their `pickOf` is the element's, null), so they are shown read-only and fire no
   `docpick`. An outline's fold button picks its item too, and folds nothing: a fold is the document's own
   (`{.shut}`), so a read-only outline shows the folds it was given. An Animator's Draw mode is a read-only Draw. A
   read-only Spreadsheet takes a page's marks on its rows and cells, `editor.marks = [{ row, col?, text, title? }]`
   (`SheetMark`: a count of comments, say), each a small badge at the end of the row's first cell or of the cell named,
   its title said on hover and to a screen reader, drawn over the sheet and never written into the document; a marked
   cell picks as any cell does, and a sheet that edits draws none.
9. **A toast with an action.** Done: `toast(words, { action: { label, does } })` draws a button after the words, the
   toast held while it has the focus (kit/core/say.ts, kit/ui/toast.ts).
10. **The fonts in the package.** Done: build:lib copies the faces editors.css names, and their license, into
    dist/fonts/, and editors.css names them there (`./fonts/…`).
11. **An app built outside.** Done: `tinylittleoffice/kit` (src/kit.ts) is what an app's author needs to make an app
    as the suite's are made; `registerApp` puts it in the registry after the suite's, and `addStrings` gives it its
    words in any language; test/browser/kit.test.ts builds one with the kit and the kernel alone, mounts it, types in
    it and reads its ops, runs its command, shows it read-only and speaks Spanish. The app of cards in lanes, which
    this branch had added to the suite, left it to be the first such app, a package of its own: see An app built
    outside.
12. **Tracked changes and comments for a host.** Done: who did what in a document several people write, as the
    Contract Editor shows it (Paul, 2026-10-17: "the way it shows who did what is good"), is the kit's:
    kit/text/changes.ts says it and kit/text/redline.ts draws it over a mounted Word Processor, with the text editor's
    hooks for them (`showGhosts` and `Ghost`, `mentions` and `Mention`, the bubble's Comment where a host marks
    `data-comments`) and their colors in editors.css (src/styles/changes.css), and the edit that rejects a change
    (kit/text/reject.ts). test/changes.test.ts tracks versions, rejects their changes and fuzzes both from the
    kernel's grammar; test/browser/changes.test.ts mounts a Word Processor with the kit alone, tracks two people's
    versions and draws them, pins a comment by its quote, has the bubble's Comment tell the host and offers "@"
    people: see Tracked changes and comments for a host.

## Tracked changes and comments for a host

A host whose documents several people write (Atlas's shared documents) shows who did what: the words each person put
in, in their color; the words they took out, in place and struck through; each edit bracketed in its author's color
with a lozenge of their initials; and comments beside the words they are about. `tinylittleoffice/kit` serves it in two
modules, kit/text/changes.ts, which says who did what and is pure, and kit/text/redline.ts, which draws it over a
mounted Word Processor's words without writing anything into them. What is pure is served by `tinylittleoffice/doc`
too, for a server that tracks with no Lit and no DOM: `track`, `trackOn`, `changesOf`, `rejectOps`, `diffLines`, the
helpers that put a block back as it was (`blockFrom`, `kindTo`, `lookOf`, `lookTo`, `marksOf`, `runOf`,
`restylings`, `isHead`, `OTHER`) and the types (`Step`, `Tracked`, `Tok`, `Change`, `Under`), the same functions the
kit serves; the kit's `textOf` (a block's words as the editor counts them) is the kit's alone, the kernel's `textOf`
being its text layer.

- **What the host gives.** Its versions of a document in order, each a `Step`: its author (the string the host names a
  person by, an email), its TLO text, a hash that names its changes (`<hash>:0` is the first it made) and its place in
  the host's log (`seq`). If any change was accepted or rejected, which ones and when (`track`'s `rejectedBy(id, seq)`
  and `reviewedBy(id, seq)`): a rejection stays in sight as a change of its own, and a change reviewed is closed, so an
  edit beside it is another, and words its author takes out again, reviewed, are taken out as a change (unreviewed,
  they are simply gone). The words being typed and not yet saved are a version too, the last tracking taken one
  version further (`trackOn`). And its people: their order, a person's color their place in it (`COLORS`), their
  names (`initialsOf`), and what the drawing says in the host's language (`Drawing`).
- **What it gets.** `track(versions)` is the document as `Tracked` blocks of `Tok`s: each word with who put it in and
  who took it out, and each word, block and head field restyled with who restyled it and what it was. `changesOf` is
  each person's changes in reading order (`Change`: what it put in, took out and restyled, and whether it is an edit,
  a rejection, words put back or a restyling alone), to list and to accept or reject. A rejection is the host's own
  edit, made like any other: `rejectOps(tracked, blocks, ids)` (kit/text/reject.ts) gives the kernel's operations
  that take back exactly the changes `ids` (a lozenge's, or a `Change`'s), made against the editor's blocks as they
  are now (`words.model`): the words they put in taken out, the words they took out put back where they were with
  their marks, and a word's marks, a block's kind or look and a field of the head as they were; null where none can
  be made (the change's words have moved, a restyling over it stands, or it is one no part of the tracking could
  place, `OTHER`). Rejecting every change of a version gives back the version before it, and rejecting one leaves the
  others' words, but on a card (a table, another document), which is put back whole with every change open on it.
  `diffLines` (kit/text/diff.ts), the comparison the tracking pairs blocks by, is served for a host that pairs the
  tracked blocks with the editor's itself, and so are the helpers that put a block back as it was (`blockFrom`,
  `kindTo`, `lookTo`, `runOf`, `restylings`).
- **What is drawn.** Over the words of a mounted Word Processor (`wordsOf(editor)`, its `<to-text>`), never in them.
  `ghostsOf(tracked, words.model, settled, drawing)` gives each block's ghosts, which `words.showGhosts()` draws: the
  words taken out, struck through; the brackets; the lozenge, filled while the edit waits for this reader and named
  `edit:` and its changes' ids (`data-ghost`) for the host to open, by a click or by the keys (below); a paragraph
  taken out, a line of its own. Then `paint(words, tracked, order)` highlights each person's words, and their
  restyling with dots, by the CSS Custom Highlight API. The caret, the copy and the IME pass over the ghosts, and the caret is written back where it was in the
  words, so a host draws again whenever the words or the versions change, typing or not: the ghosts first, awaited,
  then the paint. A change the host calls `settled` is drawn as plain words, or, taken out, not at all. The highlights
  are named `tlo-by-0` and on (`PREFIX`), which `tinylittleoffice/editors.css` colors; a host that names its own
  (`paint`'s last argument) colors them itself. A browser with no highlights gets the ghosts alone.
- **A lozenge by the keys.** The ghosts take no focus (the caret passes over them), so the keys reach an edit from the
  words: Alt+Enter with the caret in an edit's words, or else at the nearest edit in its paragraph (before the caret
  first), fires "text-ghost" from the `<to-text>`, bubbling, with `{ id, block, el }` (`GhostAt`): the lozenge's name
  (`edit:` and its ids), its block, and the lozenge as drawn, to open the panel beside. The kit finds it by the words
  each lozenge stands for (`covers`, which `ghostsOf` gives), never by counting brackets. A read-only editor answers
  it too; a paragraph with no edit, or words with no ghosts, leaves the key to the page (docs/editing.md lists it).
- **Comments.** A comment is anchored by its quote, the words it is about as they read when it was made: the kit takes
  each as `{ id, quote }` and reads nothing else. A host that wants to say which version a comment was made on (to show
  it against that version, or to tell a comment on words since changed) keeps that version with it, its own; the kit
  neither needs it nor checks it. `pinComments(words, frame, comments)` finds each quote in the words as they are now,
  highlights it (`tlo-by-comment`) and says how far below `frame`'s top its note goes; a comment whose words are gone
  is not pinned, and the host lists it with the rest. Found by its words rather than kept at a place, a comment needs
  no index carried through the edits after it: nothing is transformed, on the server or on the page. Where the host
  marks an element around the editor `data-comments`, the selection's bubble begins with Comment, which sends
  "text-comment" up from the `<to-text>` (its `sel` the words selected) for the host to open its box; inside an element
  marked `data-comment-box` (where a comment is written) there is none, and nowhere else is there a Comment. A reader
  of a read-only editor there (`readOnly`) who selects words gets the bubble with Comment alone, nothing that formats,
  sending the same "text-comment", and Escape lets it go; nowhere else does a read-only editor show a bubble.
- **"@" for its people.** `words.mentions = people.map((p) => ({ name: p.name, detail: p.email }))`, and "@" with
  letters offers them as ":" offers icons, the one picked put in by name. With none, "@" is a letter like any other.

A page that gives none of it, no ghosts and no people, is drawn as before, and the site's pages give none. The
Contract Editor, an app on a branch of its own, made these modules, and is to be rebased onto them; its review panel
(the redline, Accept and Reject) stays its own, and so does what it has beside them: two people's edits of one version
merged, its log and its server.

```ts
import { COLORS, ghostsOf, initialsOf, mount, paint, pinComments, track, wordsOf, type Step } from 'tinylittleoffice/kit';
const { editor } = await mount('write', versions.at(-1)!.text, main, save);
const words = wordsOf(editor)!;
const order = people.map((p) => p.email);
const initials = initialsOf(people);
words.mentions = people.map((p) => ({ name: p.name, detail: p.email }));
async function draw(versions: Step[]) {
  const tracked = track(versions);
  const ghosts = ghostsOf(tracked, words.model, () => false, {
    color: (who) => COLORS[order.indexOf(who) % COLORS.length], initials: (who) => initials.get(who) ?? '?', name: nameOf,
    accepted: () => false, takenOutBy: (name) => `Taken out by ${name}`, cardChanged: 'Changed', rejected: 'rejected', restored: 'restored',
  });
  await words.showGhosts(ghosts.size ? (i) => ghosts.get(i) ?? [] : null);
  paint(words, tracked, order);
  pinComments(words, main, comments);
}
```

## An app built outside

An app is a definition and an editor element (What a page that holds an editor needs), and nothing in that needs the
suite's repository: an app built outside it, cards in lanes first, is made with `tinylittleoffice/kit` and the kernel
(`tinylittleoffice/doc`) and put beside the suite's apps by the page that holds it.

- **The registry.** `registerApp(def)` (kit/core/apps.ts) puts a definition after the suite's, and from then on
  `appOf(def.id)` is it: `editorTag` loads its editor and registers its commands, `mount` draws it with a document in
  it (and `onOps`, `applyRemote` and `readOnly`, as for any app), and a document of it placed in another is drawn by
  its own `view`. An id the registry knows already (a suite app's, the QR code's and the locked document's, or one
  registered before) throws. `apps()` keeps meaning the suite's apps, since everything that lists it is the site's: the
  home page, the routes and the pages the build writes, Insert ▾'s new documents, the drawer, the API, the skill. The
  site never calls `registerApp`.
- **The words.** `addStrings(code, source)` (kit/core/i18n.ts) adds a Fluent source to a language beside the site's
  messages, English included, and `t()` finds them. Added to a language not yet loaded, the words wait and join its
  messages when its file comes; added to one loaded, they join at once. Nothing is replaced: an id the language has
  keeps its message, so an app's ids carry a prefix of its own (`tally-…`), as each suite app's carry its id. A word
  missing in a language is said in English, as the site's are. An editor that draws again when the language changes
  listens with `onLanguage`.
- **The editor.** It extends `DocElement` (kit/core/element.ts): `read(doc)` gives the view, `edit(ops)` changes the
  document (history, `docops`, `docchange` and `applyRemote` come with it), `pickOf(el)` names the item a read-only
  editor's page is told of, `undoTools()` are the bar's last two buttons. Its commands are declared with `commandsOf`
  in a scope named by its id and answered with `runKey` in its own keydown, as the suite's are (kit/core/commands.ts).
  It draws with the kit's elements and helpers: `<to-bar>`, `<to-menu>`, `<to-insert>`, `<to-dialog>`, `<to-text>`,
  `Rows`, `reveal`; its pages, for print, files and thumbnails, with the kit's drawing (`rect`, `text`, `wrapText`, the
  colors) and, for a table, the Spreadsheet's words (`cellAsShown`, a cell as its column shows it, and `tableAsCsv`);
  words a program puts in a cell are written with `asWords` (the kernel's, from `tinylittleoffice/doc` too), so words
  that start with `=` or read as a number stay words (`'=SUM(1)`: docs/kernel.md §5).
- **One of everything.** `tinylittleoffice/kit` is the editors' own file at run time: the package's "./kit" names
  dist/editors.js, typed by dist/types/kit.d.ts, and src/editors.ts exports everything src/kit.ts does
  (test/kit-entry.test.ts reads both; test/package.test.ts finds every value in the built file and resolves "./kit" to
  it). A second entry built beside the first would carry Lit and the kit twice, and with them two registries of apps,
  of commands and of words, and two LitElement bases: an app registered in one would be unknown to `mount` in the
  other. Built as one file there is one of each, whichever of the two a page imports. So Lit is served from the kit
  (`LitElement`, `html`, `css`, `svg`, `nothing`, `render`, and the directives the kit uses, Lit's `live` as
  `liveValue`), and an app imports Lit from there, never from `lit`, which would be a second Lit. The kit's
  declarations name Lit's types: an app that wants them installs `lit` at the kit's version (3.3.3) as a development
  dependency, for its types alone, as test/package.test.ts's program does; without it they read as `any` under
  `skipLibCheck`, and an element of its own is no `HTMLElement` to the checker. The kernel is a file of its own,
  `tinylittleoffice/doc`, whose functions keep nothing between calls, so the editors' copy of it and an app's never
  disagree on a document; they cost their bytes twice, and the one class it exports, `Conflict`, is two classes, so
  a conflict is told by its `name` rather than by `instanceof` across them.
- **The page.** A page that holds an outside app registers it, adds its words and mounts it before anything draws it:

```ts
import { registerApp, addStrings, mount } from 'tinylittleoffice/kit';
import tally, { words } from 'tally'; // the app's package: its definition, and its Fluent sources by language
for (const [code, source] of Object.entries(words)) addStrings(code, source);
registerApp(tally);
const { editor } = await mount('tally', text, main, save, { onOps: send });
```

## Shared editing from a page

An editor tells each change as the kernel's operations as well as its text (kit/core/element.ts): before each
`docchange` it fires `docops` on itself, never bubbling, with `{ ops, base }`: the primitives the change applied (an
edit's, an undo's inverse, a redo's; a deck loosened as it arrives) and how many it had applied before them since it was
given its value, which a page maps to its own version. `mount(app, text, into, onChange, { commands, context, onOps })`
hands them to `onOps(ops, base)` and returns `{ editor, applyRemote }`, no longer the editor itself (a page that kept
the result as the element reads `.editor`). `applyRemote(ops)` takes in ops the page's server ordered, rebased over the
page's own not yet told back (`rebase`, from `tinylittleoffice/doc`): applied with no step of the history and neither
event fired, the view drawn again, and the history carried over them, so an undo takes back only what was done here
(where they cross, it is let go). Only the Word Processor carries its caret and its undo's saved carets past them; the
other apps hold theirs within the document. A page that takes the server's document again gives it as a new `value`.
An editor's ops leave its words as the format keeps them (docs/kernel.md §2, point 5: no mark on a space at its edge),
so a server that keeps the document as its text, and applies the same ops to what it reads back, holds the words the
editor holds.

Of the server's four rules (docs/kernel.md §12), the kernel enforces two: `transform` throws `Conflict` for crossing
spans, and `apply` throws for a table left with no column or one past Z. The third, no lock in the head, has no check in
the kernel: the server refuses an op on the head's `lock` itself. The Spreadsheet does not keep it yet: it writes the
head's lock while its first table carries no `{lock=…}`, so a person locking cells in a shared sheet sends an op the
server refuses, until the Spreadsheet writes the table's lock when its page shares the document.

## A page's own commands

A page's commands are declared as the kit's and the apps' are (kit/core/commands.ts: id, label, icon, keys, scope,
where, when, does), in a scope of the page's own (`host`, `atlas`), and act on a context of its own: its pipeline, the
record in hand. `tinylittleoffice/editors` exports what declares, draws and answers them, and nothing beside it:

- declaring: `command`, `register`, `registered`, `inScope`, and the types `Command`, `Words` and `Where`;
- running: `live` (in force and not disabled), `run`, and `runKey(e, commands, context)` (a key answered by a scope:
  the first command in force whose key it is runs, and the key stops there);
- drawing: `cmdTool`, `cmdBtn` and `cmdMenu` (a bar's button, a button with words, a menu: Lit templates, for
  `<to-bar>`, which the page renders with its own Lit's `render`), `drawnIn` and `contextOf` (the same as plain objects, `Drawn`, for a page that draws with something
  else), `labelOf` (a command's words in a context) and `keysText` (its keys as this device writes them).

`mount(app, text, into, onChange, { commands, context })` answers the page's commands' keys inside the editor, after
the words', the app's and undo's, so a key an inner scope takes (Mod+B, bold) is never the page's (the shell's rule:
the inner scope wins). Of the site's page's own keys a bare page has nothing for (Mod+F, Mod+S, Mod+P, Mod+K, Mod+/,
Mod+Shift+S, Mod+Shift+D), `mount` takes none, and they reach the page's commands and then the browser. Outside the
editor the keys are the page's to listen for, with the same `runKey`; a key `mount` took is not taken again.

```ts
import { command, register, mount, cmdTool } from 'tinylittleoffice/editors';
const open = command<Pipeline>({ id: 'host.open', scope: 'host', label: (b) => `Open ${b?.record.name ?? 'record'}`,
  keys: 'Mod+Shift+O', where: ['bar'], does: (b) => b.open(b.record) });
register([open]);
await mount('write', text, main, save, { commands: [open], context: pipeline });
render(html`<to-bar>${cmdTool(open, pipeline)}</to-bar>`, bar);
```

A command's label is `Words`: a string is the id of a message of the site's (src/i18n/en.ftl), put through `t()` and
translated with the rest; a function of the context is words of the page's own, in its own language, and `t()` is not
asked (test/commands.test.ts holds that `labelOf` gives them). A page's commands are registered as it runs, so the
site's registry, which scripts/commands.ts loads under node for docs/editing.md's tables and the lints (every label a
message of en.ftl, every command run by a test, no key bound twice in a chain of scopes), never holds them: those lints
are the site's, and a page keeps its own keys clear of the site's (docs/editing.md's tables list every key bound).

## Commands for a program

Atlas serves its commands to programs as well as pages: an API, an assistant's tools, an MCP server, the
documentation (its docs/commands.md). The kernel of that is this registry, and `tinylittleoffice/commands`
(src/commands.ts, built to dist/commands.js: one file, no imports, no DOM, for Node 24 or a page) serves it: `command`,
`register`, `registered`, `inScope`, `live`, `run`, `labelOf`, `keysText`, and the types `Command`, `Schema`, `Where`
and `Words`, with nothing that draws. A command may carry its program's half beside its words and keys:

- `input` and `output`, JSON Schema objects (`Schema`): what it takes and gives back, which the API, the tools and a
  fuzz read. Atlas writes them with Zod and hands the kernel `z.toJSONSchema()` of them.
- `who`, the actors that may run it (`team`, `atlas`); without it, no program may, and it is a page's alone.
- `reads: true` when it changes nothing; `doc`, one sentence saying what it does.

Two pure derivations come from a list of them. `tools(commands, actor)` is the tool list an assistant or an MCP server
serves that actor: for each command whose `who` names it, `{ name: id, description: doc ?? its words, inputSchema:
input ?? { type: 'object' } }`, MCP's field names. `docsOf(commands)` is a Markdown page: every command in the list's
order, what it does, its scope, who, whether it reads, its input and its output. Running them, the log and undo are
the program's own (Atlas's `serve()`).

A label that is a message's id is said by `t()` in the language in use, and a program chooses none: it gets English,
whose messages ride in commands.js, so `tools()` describes a command without a `doc` in English with nothing set up.
What the registry's modules ask of a page (the platform, which spells keys a Mac's way; the root, which takes a
language) the build answers "none" (vite.lib.config.ts), so `keysText` spells keys as on Windows wherever a program
runs, unless asked for a Mac's; test/lints.test.ts holds that those modules name a browser global only behind a
`typeof` of it, and test/package.test.ts that commands.js names none. commands.js holds a registry of its own: a page
that draws commands with `tinylittleoffice/editors` declares them there, and the site's registry (scripts/commands.ts)
never holds a program's.

## Theming

`tinylittleoffice/editors.css` puts every rule in a cascade layer (`tokens`, `kit`, `apps`, `responsive`, `a11y`), so
a page's own rules outside a layer outrank all of them. It sets nothing on the page's root but custom properties and
`color-scheme` (light or dark with the theme; light for the instant of a copy), and nothing on its body. A few rules
name elements rather than the kit's classes, and reach the page's own elements where the page says nothing of them:
border-box sizing, a control's font size, code in the mono face, a link's color, the focus ring, `[hidden]`, and no
transitions for a person who asks for less motion. The editors draw on the page's own ground: the site's is
`--to-bg`.

A page themes the editors with custom properties (src/styles/tokens.css), on `:root` or on an element that holds them,
since they inherit. Light is on `:root`; dark is under `:root[data-theme='dark']`, which `setup()` and `setTheme()` set
on the root (kit/ui/theme.ts), so a page's own dark values go under the same selector.

- **Colors.** `--to-bg` (the ground, under the bar), `--to-surface` and `--to-surface-2` (panels, menus, dialogs),
  `--to-border` and `--to-border-strong`, `--to-ink`, `--to-ink-2` and `--to-ink-3` (words, from loudest to
  quietest), `--to-accent`, `--to-accent-soft` and `--to-on-accent` (words on the accent), `--to-danger`,
  `--to-success`, `--to-go`, `--to-warning`, `--to-placeholder`, `--to-input-bg` and `--to-input-border`. The paper a
  document is drawn on: `--to-paper`, `--to-paper-ink`, `--to-paper-muted`, `--to-paper-line`, `--to-paper-shade`
  and `--to-paper-accent`. test/contrast.test.ts holds the site's pairs to their contrast; a page's own are its own.
- **Type.** `--to-font` (the interface and the Sans look), `--to-font-serif`, `--to-font-mono`, `--to-font-system` (the
  device's stack, behind the rest), `--to-line` and `--to-line-label` (the line of body text, and of headings and
  labels). The faces are IBM Plex, which the site's stylesheet names at `/fonts/…` (public/fonts/, under the SIL Open
  Font License); the package carries the files and the license in dist/fonts/, and its stylesheet names them there,
  `./fonts/…` (vite.lib.config.ts). A page serves that folder beside editors.css, or sets the fonts to faces of its own.
- **Shape.** `--to-radius`, `--to-radius-sm`, `--to-radius-pill`, `--to-shadow` and `--to-shadow-pop`.
- **Room.** `--to-gutter-k` (the gutter, as a number of the scale's 16px: 1, and 0.75 on a narrow screen), `--to-max-w`
  (the measure of a column of words), and `--to-col-h`, the height a canvas or a map fills (the Drawing, the Diagram,
  the Animator, the Trip Planner's map): the screen less the site's header and bar unless the page sets it, as the
  site's chrome does to its column's measured height.
- **Size.** `--to-doc` and `--to-nav` (kit/ui/zoom.ts): the size of everything as two plain numbers on the root, which
  `setup()` sets (1.3 at 100%; the nav's stops at 120%). A document's lengths are in rem, and on the site the root's
  font size is the browser's default times `--to-doc` (page.css); the editors' stylesheet leaves the root's font size
  to the page. A page that wants the size of everything sets `html { font-size: calc(100% * var(--to-doc, 1)) }`
  itself; one that keeps its own draws the editors at its own rem, and should keep the size at 100%, since the nav's
  scale is reckoned from the root's (`--to-nav-font`: a rem over `--to-doc`, times `--to-nav`).

budgets.json does not weigh editors.css: scripts/budgets.ts weighs the site's build (dist/), and editors.css comes
from a second one (`npm run build:lib`), which `npm run build` does not run; test/package.test.ts holds that it is
there.
