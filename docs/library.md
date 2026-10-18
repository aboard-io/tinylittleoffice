# Tiny Little Office as a library

Tiny Little Office is becoming a library other pages build on: a host's documents are built with the kernel and edited
with these editors, kept in the host's database rather than in links. The site stays what it is, and is the library's
first user: whatever an editor needs from the page it is in, the site gives it the way any other page would. And an app
need not be the suite's: one built outside it, on `tinylittleoffice/kit`, registers beside the suite's apps and is
mounted as they are (An app built outside). And the library has an app of its own that the site does not list: the
Board, cards in lanes by their status (The library's own apps).

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
   `AppDef`, `Editor`, `DocChange`, `DocOps`, `DocRemote`, `DocPick`, `Picked`, `Mounted`, `Host`, `Placed` and
   `Action`, a toast's), and beside it what only a page sets: `apps` (the suite's, in order), `chosenLanguage` and
   `languages`, `setTheme`, `theme`, `keepThemeAt` and the type `Theme`, `keepSize`, `keepSizeAt` and `size`, and
   `pageCommands` (the site's page keys, for a page that draws a bar of its own): see A host's page.
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
4. **A page's own commands.** Done: a page declares a scope of its own beside the kit's (a CRM's records, its
   pipeline), and draws and answers it with the kit's functions: see A page's own commands.
5. **A bare page.** Done: test/browser/editors.test.ts mounts `<to-write-editor>` on a bare page with a host of its
   own, types in it and reads the `docchange`.
6. **Commands for a program.** Done: src/commands.ts, served as `tinylittleoffice/commands` (dist/commands.js), the
   registry with a program's half and the two derivations a host's program asks of it: see Commands for a
   program.
7. **Editors speak in ops, and take remote ops.** Done: every editor tells each change as its operations and takes
   another's in, for a page that shares a document: see Shared editing from a page. For a host's server that orders
   them, `tinylittleoffice/doc` serves `transform`, `rebase` and `applyEdits` (src/doc/sync.ts); docs/kernel.md §12 is
   the design, its rules and its properties.
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
    it and reads its ops, runs its command, shows it read-only and speaks Spanish: see An app built outside.
12. **Tracked changes and comments for a host.** Done: who did what in a document several people write, as the
    Contract Editor shows it (Paul, 2026-10-17: "the way it shows who did what is good"), is the kit's:
    kit/text/changes.ts says it and kit/text/redline.ts draws it over a mounted Word Processor, with the text editor's
    hooks for them (`showGhosts` and `Ghost`, `mentions` and `Mention`, the bubble's Comment where a host marks
    `data-comments`) and their colors in editors.css (src/styles/changes.css), and the edit that rejects a change
    (kit/text/reject.ts). test/changes.test.ts tracks versions, rejects their changes and fuzzes both from the
    kernel's grammar; test/browser/changes.test.ts mounts a Word Processor with the kit alone, tracks two people's
    versions and draws them, pins a comment by its quote, has the bubble's Comment tell the host and offers "@"
    people: see Tracked changes and comments for a host.
13. **A Storybook.** Done: every element and every app's editor alone, as a host holds them: see The Storybook.
14. **The library's own apps.** Done: the Board is in src/apps/board/ as the suite's apps are, served on entries of
    its own (`tinylittleoffice/board`, `/board/model`, `/board.css`) and in no list of the site's: see The library's
    own apps.
15. **What a host's own pages are made of.** Done: the elements a host's lists, header and search are built from (its
    lists typed tables, one search at the top of every page), in the kit and served by `tinylittleoffice/kit` and
    `/editors` with their types: a typed table (`<to-table>`), a search box (`<to-search>`), a page's header
    (`<to-header>`) and a template picker (`pickTemplate`). Their rules are src/styles/host.css, which only editors.css
    imports, and nothing of the site's imports them, so the site's files and budgets are as they were.
    test/table.test.ts and test/browser/table.test.ts, search-box.test.ts, header.test.ts and template-picker.test.ts
    hold them: see A typed table, A search box, A page's header and A template picker.
16. **What the Storybook found.** Done (2026-10-18, for a host that had built them by hand: its redline, its margin, its
    comment box and its reviews): the review panel and the margin as components, the redraw that awaits the ghosts, a
    quote from the selection, a color for everyone, "docremote" (Tracked changes and comments for a host, The
    components); five drawing bugs, each with its test (a paragraph taken out last never drawn; one put back whole not
    drawn as restored; a change's words run together; a hint written over drawn word by word; Compare's links made from
    the address); the kit's other elements exported; and a host's page arranged (A host's page).

## The Storybook

Every element the kit and the apps define, and every app's editor, alone on a page that is not the site, as a host
holds them: `npm run storybook` serves it at http://0.0.0.0:6006, and `npm run build-storybook` writes it to
storybook-static/ (ignored by git). It is Storybook 10.6.2 with the web-components renderer, since the elements are
Lit's (.storybook/main.ts), on a Vite config of its own (.storybook/vite.config.ts), so nothing of the site's build runs
and the site never bundles it. Every story imports src/editors.ts and editors.css, as a page does, and is set up once
(`setup`), with the host's links on tinylittleoffice.com (`siteHost`, kit/core/host.ts). The toolbar's Theme is the
kit's `setTheme` and its Language `setLanguage`. A story's documents are the apps' own templates, never made up for it.

- **Foundations.** Colors (every token of tokens.css, and the pairs of ink and ground), Type, Shape, Icons (the
  interface's, the library's search, the picker) and Emoji.
- **Kit.** Core: `mount` over any app, an app of its own on `DocElement`, a page's own commands. UI: the bar, the menus,
  Insert, the dialogs and the doc dialog, the toast, the context bar, the completions, Find, the link box, the preview,
  the locked card, the doc link dialog, the size of everything, a page's header, the template picker. Data: the typed
  table (the Spreadsheet's membership roll, editable, refused, 5,000 rows, empty, narrow) and the search box (inline, in
  a dialog, slow, failing). Text: `<to-text>` alone, who did what (the redline, a person's changes accepted, rejections,
  a reviewer), the review panel (`<to-review-panel>`: alone, for a reader, reviewed, twelve people's colors, and beside
  the words with Accept and Reject), the margin (`<to-comments>`: threads pinned by their quote, over who did what, for
  a reader, made from the bubble, and asking the host's assistant, answered in the thread with a tracked change), "@"
  for people, and Compare. Draw: footnotes, charts, cards, QR codes, tiles.
- **Apps.** Each app's editor over one of its templates, editable and read-only, blank, two people sharing one
  document (each one's `docops` handed to the other's `applyRemote`), and every template drawn small. The Board's
  among them, registered by its stories as a page registers it (`registerBoard`), its words drawn as the library's
  editors draw them (the Storybook's Vite builds the languages with `library: true`).
- **Site.** The site's own page (the shell, the chrome, the drawer, the home page, an app's templates, Share, Privacy),
  with the site's page.css on while each is shown (`parameters.page`): what a host draws for itself, shown for what it is.

A lint (test/lints.test.ts) holds that every tag `customElements.define` gives in src/ is a story's component, or
named in a story's `parameters.covers`, so a new element comes with a story. `node scripts/check-stories.ts` opens
every story of the built Storybook in Chromium (or of a running one, given its address) and fails on any error said or
thrown.

## A typed table

`<to-table>` (kit/ui/table.ts) is a host's records as rows: a person's people, companies, events, tasks and projects,
a pipeline seen as a table. It is not a document: the page holds the rows and hears what is done to them. What a
column's cells hold, and so how each is shown, sorted and edited, is kit/ui/table-model.ts's, which is pure and
reuses the Spreadsheet's words: a number with its commas and money in its currency (the kernel's `formatCell` and
`formatMoney`), an amount typed as "$1,200" or "1,200 USD" read as a money cell reads it (`parseLiteral`), words ordered
as the Spreadsheet's sort orders them (`compareCells`, taken out of `sortRows` for both), a date in the page's language
(kit/core/dates.ts), and a quick search that folds case and accents as the library's does (kit/share/search.ts).

- **What it takes.** `rows`, each with an `id` (TableRow); `columns` (TableColumn): `key` and `label`, and a `type`
  (ColumnType): `text`, `number`, `money` (with `currency`, a code or a symbol), `date` ("2027-03-01", a Date or ms),
  `datetime`, `boolean`, `enum` (its `options`, EnumOption: a value, words and a color, in the order a sort keeps),
  `link` and `person` (`{ label, href }`, or words and the column's `href(row)`), `record` (another of the host's
  records: below), `tags`, or `custom` (`render(value, row)` draws it, `compare` orders it, `text` gives its words);
  `editable` (true, or `editable(row)`, each row's own: below), `hidden`, `sortable`, `width` (a grid track), `fit`
  and `wrap` (below) on any, and `decimals` on a number or money (below). `sort` (SortBy[], the first the primary), `query` and `filter(row)`, `hiddenColumns`, `selected`
  (ids). Attributes: `selectable` (a box a row, and one for all), `addable` (Add row, or `add-label`'s words),
  `filterable` (a field that sets `query`), `hideable` (the Columns menu), `label` (the grid's name), `empty` (what
  an empty table says). A child with `slot="toolbar"` is drawn first in the bar over the table: a page's My and All.
- **Its events.** All bubble. `sortchange` `{ sort }`; `columnschange` `{ hidden }`; `selection` `{ ids }`;
  `rowpick` `{ id, row }` (a cell activated that is not edited); `cellpick` `{ id, column, value, row }` (a link with
  no address, a person); `rowadd`. `rowchange` (RowChange: `{ id, column, value, before, row, wait }`) is cancelable:
  the edit is shown at once, and a page that refuses it calls `preventDefault()`, or hands `wait` a promise that
  rejects or comes back false (a server's answer), and the cell goes back. A kept edit is shown until the page gives
  its rows again, which are then the truth.
- **A row's own editable.** `editable: (row) => boolean` says for each row whether its cell may be changed (a meeting
  that came by invite changes with its invite): a row it says no to offers no field, ticks no box, and its cell is
  `aria-readonly`, so nothing is asked of the page to refuse.
- **Another of the host's records.** A `record` column's cell is `{ id, label, href? }` (RecordValue; an id alone is
  its own words), drawn as a link (the column's `href(row)` where the value has none; with no address, a tap is
  `cellpick`, as a link's is). Edited, it is a picker: a field (`role=combobox`) whose records are the column's
  `search(q, signal)`, the host's own answer (RecordOption: `{ id, label, detail?, href? }`, a second line under the
  words), asked for '' as it opens and then a moment after the last key, the question before let go (its `signal`
  aborted); the records in a list under the cell, Down and Up through them, Enter chooses (the field emptied, none),
  Escape or leaving lets it go, and it says Searching…, that the search failed, or that nothing was found, as the
  search box does. The choice is `rowchange` with the record's id as `value`, the id it had as `before`, and the
  record chosen as `record` (null for none), shown at once and put back if refused, as any edit is.
- **A row's actions.** `rowActions: (row) => RowAction[]` (`{ id, label, icon?, danger?, disabled? }`) gives each
  row a menu at its end, a column of its own stuck to the end as the rest scrolls: its button ("Actions for Ada"), a
  click on its cell, Enter or Space on that cell, or Shift+F10 or the menu key anywhere in the row opens it, and its
  keys are a menu's. An action chosen is `rowaction` (RowActionPick: `{ id, action, row }`); one marked `danger` is
  drawn in the danger color (a menu's item takes `danger` too, `MenuItem`).
- **Money in whole units.** `decimals` on a money column writes every amount with that many places, `0` for whole
  units ("$12,000", "$951"), in its currency as ever; on a number column, that many places always. The sort and an
  edit are by the amount, not its words.
- **A column as wide as its words.** `fit: true` (or `width: 'max-content'`) measures the column's widest words, of
  every row and not only those drawn, and its heading, with the room its cell's face takes beside them (a person's
  initial, a chip), and makes that its width: at least its type's least width and at most 24rem, or `fit: { min,
  max }` in rem. A drawn cell of the page's own drawing wider than its words widens it.
- **Rows that grow.** `wrap: true` on a column lets its words wrap, and each row is as tall as its tallest cell
  (`--to-dt-row-h` at least). The rows are still windowed: each drawn row is measured, each not drawn reckoned from its
  words and its column's width, and the rows are placed by those heights, so a row that grows pushes the ones after it
  down, scrolling and Mod+End reach the last, and 5,000 of them draw in the time 5,000 of one height do. Where no
  column wraps, every row is the one height as before.
- **Sorting.** A click on a heading sorts by it, ascending, descending, then not at all; Shift and a click sorts by it
  as well, after the others (its place shown beside its arrow). Each type by its own order: amounts and times as
  numbers, a status by its options' order, a box unticked first, words as a reader orders them ("Item 2" before
  "Item 10"); an empty cell last whichever way; rows that tie in the page's order.
- **Keys.** A grid, as ARIA has it (`role=grid`, `aria-rowcount`, `aria-rowindex`, `aria-colindex`, `aria-sort`,
  `aria-selected`, `aria-readonly`): one cell takes Tab; the arrows walk the cells and the headings, Home and End the
  row's ends (Mod: the table's), Page Up and Page Down a screenful; Enter edits a cell (F2 too, a double click, or a
  click on the cell in hand), follows its link, or picks its row; on a heading it sorts (Shift: as well); Space ticks
  a row's box, a cell's box or the box for all. In an editor (a number field, a date or a moment field, a status's
  options, words), Enter keeps the edit, Tab keeps it and moves on, Escape lets it go; words that are not a number in
  a number's column are not kept, and the field says so.
- **Its size.** The table scrolls in a box of its own, as the Spreadsheet's grid does (the page never scrolls:
  kit/ui/scroll.ts): its headings stuck to the top, the boxes and the first column to the start. At a phone's width
  it scrolls sideways in that box, the names in sight, rather than becoming cards, since a card a row would be a
  height a row and the rows are drawn by their one height. Only the rows in sight are drawn, and eight more each way,
  each `--to-dt-row-h` tall (2.75rem, or as tall as its words where a column wraps), so 5,000 rows cost what fifty do. The box is `--to-dt-h` tall at most (36rem,
  or three quarters of the screen) unless the page sets its height; a page that lets it grow with no limit draws every
  row. In Chromium, test/browser/table.test.ts's 5,000 rows are drawn in about 70ms, sorted by money in about 30ms and
  by a date and then a name in about 60ms, filtered in about 300ms the first time (every row's words written once,
  its dates among them) and under 10ms for each letter after, scrolled to the end in about 30ms and walked there by
  Mod+End in about 120ms.

```ts
import { type RowActionPick, type RowChange, type TableColumn } from 'tinylittleoffice/kit';
const columns: TableColumn<Person>[] = [
  { key: 'name', label: 'Name', type: 'person', href: (p) => `/people/${p.id}`, editable: true },
  { key: 'company', label: 'Company', type: 'record', editable: (p) => !p.archived, wrap: true,
    value: (p) => p.company && { id: p.company.id, label: p.company.name, href: `/companies/${p.company.id}` },
    search: (q, signal) => run('company.search', { q }, { signal }).then((cs) => cs.map((c) => ({ id: c.id, label: c.name, detail: c.domain }))) },
  { key: 'stage', label: 'Stage', type: 'enum', editable: true, options: STAGES },
  { key: 'value', label: 'Value', type: 'money', currency: 'USD', decimals: 0, editable: true },
  { key: 'met', label: 'Last met', type: 'date' },
];
const table = Object.assign(document.createElement('to-table'), { columns, rows: people, label: 'People' });
table.toggleAttribute('selectable', true);
table.addEventListener('rowchange', (e) => {
  const { id, column, value } = (e as CustomEvent<RowChange<Person>>).detail;
  (e as CustomEvent<RowChange<Person>>).detail.wait(run('person.update', { id, [column]: value }));
});
table.addEventListener('rowpick', (e) => open((e as CustomEvent).detail.id));
table.rowActions = (p) => [{ id: 'delete', label: 'Delete', danger: true }];
table.addEventListener('rowaction', (e) => {
  const { id, action } = (e as CustomEvent<RowActionPick<Person>>).detail;
  if (action === 'delete') remove(id);
});
```

## A search box

`<to-search>` (kit/ui/search-box.ts) is one search across every kind of thing a host keeps. The page gives `search(q,
signal)`, an async function answering with hits (SearchHit: `kind`, `id`, `title`, and `subtitle`, `icon` and `href`
where it has them); the box asks it a moment after the last key (`delay`, 150ms; nothing under `min` letters, 1), and
aborts the question before, whose answer is never shown. It draws the hits grouped by kind, the kinds in the order
`kinds` names them (SearchKind: a heading and an icon), each with its count, then the actions `create(q)` offers for
what was typed (SearchAction: "Add “Clea” as a company", the page's offer to make what it does not know). While the
answer is coming it says Searching…; an answer that fails, that the search did not work; none, that nothing was found;
and how many were, to a screen reader.

- **Its keys.** A combobox, as ARIA has it: the words in the field, Down and Up through the hits and the actions,
  around the ends (`aria-activedescendant`), Enter chooses (the first, where nothing is in hand), Escape closes the
  list and then clears the field.
- **Its event.** `searchpick` (SearchPick: `{ query, hit }` or `{ query, action }`), cancelable. A hit with an `href` is a
  link, opened as one is unless the page prevents it; a page that routes itself prevents it and goes there itself.
- **Inline or a dialog.** Inline (the default) it is a field with the hits in a popover under it, for a header;
  `dialog` makes it a button drawn as the field that opens the search in a dialog. `hotkey` opens it (or puts the
  focus in the field) with Mod+K from anywhere on the page; a page sets it on one box. `placeholder` and `label` are
  the page's words for the field (else Search).

```ts
import { type SearchPick, type Searcher } from 'tinylittleoffice/kit';
const search: Searcher = (q, signal) => fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.json());
const box = Object.assign(document.createElement('to-search'), { search, kinds: { person: { label: 'People' }, company: { label: 'Companies' } },
  create: (q: string) => [{ id: 'company.create', label: `Add “${q}” as a company` }] });
box.toggleAttribute('hotkey', true);
box.addEventListener('searchpick', (e) => {
  const pick = (e as CustomEvent<SearchPick>).detail;
  if (pick.action) create(pick.action.id, pick.query);
});
```

## A page's header

`<to-header>` (kit/ui/header.ts) is a page's header in the site's look for a page with no `<to-shell>`: the way back up,
the page's title, and room for the page's search and actions. It takes `heading` (the title), `editable` (the title a
field: Enter or leaving it keeps new words, told in `titlechange`, `{ title }`; Escape puts the old ones back; empty
words are none), `level` (the heading's, 1) and `crumbs` (Crumb: `{ label, href? }`, from the top: one with an address
is a link, one without a button, either told in `crumbpick`, `{ index, crumb }`, cancelable). Its slots
(kit/ui/slots.ts: a child given with `slot="<name>"`, moved there, never copied) are `start` (before the title),
`search` (a `<to-search>`) and `actions`. On a narrow page (under 40em of its own) the search takes a row of its own.

- **A title given while it is typed in.** A `heading` the page gives while the title's field has the focus (a route
  changed under it) is the field's words from then on, Escape's too; leaving the field then tells no `titlechange`,
  even where the focus left before the header drew again (the field's words were the old title's, not a new one), and
  words half typed give way to it.
- **A long title.** The title takes the room its words want, and the search beside it gives way first (it shrinks a
  hundred times faster, down to 12em); then the title wraps to two lines before it is cut short. A title that is a
  field is one line: it is drawn smaller, down to three quarters of its size, before it is cut short.

```html
<to-header heading="Clear Channel Digital Strategy" editable>
  <to-search slot="search" hotkey></to-search>
  <button slot="actions" class="to-btn primary">New task</button>
</to-header>
```

## A template picker

`pickTemplate(app?)` (kit/ui/template-picker.ts) opens the templates of `app` (every suite app's, under their names,
without it) in a dialog over the page, each drawn small from its own document (`<to-preview>`), Blank first where the
app's templates carry no blank of their own, and resolves with the one chosen, `{ app, id, title, text }`
(PickedTemplate: Blank's id is `blank`, its title the app's "Untitled …"), or null when it is let go. It opens and
navigates to nothing: the page keeps the document as it keeps its own (a CRM built on the library writes an exploration
from one). Its keys are a menu's (kit/ui/menu.ts). `<to-template-picker app="write">` is the same for a page that places
it itself: its `show()` resolves as `pickTemplate` does, and the one chosen is told in `templatepick` too.

```ts
const picked = await pickTemplate('write');
if (picked) await run('document.create', { project, title: picked.title, text: picked.text });
```

## The kit's small pieces

What a host's pages are made of beside the table, the search and the header (Atlas built each of its own, of the kit's
classes, until these came), in kit/ui/ and served by `tinylittleoffice/kit` and `/editors` with their types; their
rules are host.css's, so the site's bytes are as they were.

- **A choice of a few.** `<to-segmented>` (kit/ui/segmented.ts): `options` (Segment: `{ value, label, icon? }`),
  `value`, and `label`, the group's name. A radio group, as ARIA has it: the segment chosen takes Tab, the arrows
  (Left and Right as the page reads), Home and End move and choose, a click chooses; each choice is shown at once and
  told in `change`, bubbling, `{ value }`. It wears the kit's `.to-seg` (My and All, Table or Calendar).
- **A question asked first.** `confirm({ title, body?, yes?, no?, danger?, into? })` (kit/ui/confirm.ts, Confirm)
  asks in the kit's dialog (a modal `<dialog>`, `role=alertdialog`, its title its name and its body its description)
  and resolves true for yes, false for no, Escape, a click outside; the focus is given back where it was. Yes is OK and
  no Cancel unless said. Where yes destroys (`danger`), it is drawn in the danger color and the focus starts on no;
  else on yes. `.to-btn.to-danger` is that button's look, for any button of a page's own (Delete in a header).
- **A fact changed where it is shown.** `<to-field>` (kit/ui/field.ts): `value`, `type` (FieldType: `text`, `number`,
  `money`, `date`, `datetime`, `enum`, `email`, `url`, `tel`), `label` (its name: the pencil's "Edit Title"),
  `placeholder` (what it says when empty), `href` (its words a link), `options` (an enum's), `currency` and
  `decimals` (money's), `multiline` (lines of words, Shift+Enter a new line), `readonly`. Its words are a table
  cell's (`cellWords`: money in its currency, a date in the page's language, an option's label). A click on its words
  (not a link), its pencil, or `edit()` makes it a field of its type, its words chosen; Enter keeps, the focus leaving
  keeps, Escape lets go, and words where a number belongs are not kept (the field says so). The edit is shown at once
  and told in `fieldchange`, cancelable, `{ value, before, wait }` (FieldChange), as `<to-table>`'s `rowchange` is: a
  page that refuses it calls `preventDefault()` or hands `wait` a promise that rejects or comes back false, and what
  was shown before comes back; a kept edit is shown until the page gives `value` again. The focus goes back to the
  pencil.

```ts
import { confirm, type FieldChange } from 'tinylittleoffice/kit';
const size = Object.assign(document.createElement('to-field'), { label: 'Size', type: 'number', value: company.size });
size.addEventListener('fieldchange', (e) => {
  const change = (e as CustomEvent<FieldChange>).detail;
  change.wait(run('company.update', { id: company.id, size: change.value }));
});
const views = Object.assign(document.createElement('to-segmented'), { label: 'View', value: 'table',
  options: [{ value: 'table', label: 'Table' }, { value: 'calendar', label: 'Calendar' }] });
views.addEventListener('change', (e) => show((e as CustomEvent<{ value: string }>).detail.value));
if (await confirm({ title: `Delete ${company.name}?`, yes: 'Delete', danger: true })) await run('company.delete', { id: company.id });
```

## Tracked changes and comments for a host

A host whose documents several people write shows who did what: the words each person put in, in their color; the words
they took out, in place and struck through; each edit bracketed in its author's color with a lozenge of their initials;
and comments beside the words they are about. `tinylittleoffice/kit` serves it in two modules, kit/text/changes.ts,
which says who did what and is pure, and kit/text/redline.ts, which draws it over a mounted Word Processor's words
without writing anything into them. What is pure is served by `tinylittleoffice/doc` too, for a server that tracks with
no Lit and no DOM: `track`, `trackOn`, `changesOf`, `rejectOps`, `diffLines`, the helpers that put a block back as it
was (`blockFrom`, `kindTo`, `lookOf`, `lookTo`, `marksOf`, `runOf`, `restylings`, `isHead`, `OTHER`) and the types
(`Step`, `Tracked`, `Tok`, `Change`, `Under`), the same functions the kit serves; the kit's `textOf` (a block's words as
the editor counts them) is the kit's alone, the kernel's `textOf` being its text layer.

- **What the host gives.** Its versions of a document in order, each a `Step`: its author (the string the host names a
  person by, an email), its TLO text, a hash that names its changes (`<hash>:0` is the first it made) and its place in
  the host's log (`seq`). If any change was accepted or rejected, which ones and when (`track`'s `rejectedBy(id, seq)`
  and `reviewedBy(id, seq)`): a rejection stays in sight as a change of its own, and a change reviewed is closed, so an
  edit beside it is another, and words its author takes out again, reviewed, are taken out as a change (unreviewed,
  they are simply gone). The words being typed and not yet saved are a version too, the last tracking taken one
  version further (`trackOn`). And its people: their order, a person's color their place in it (`colorOf`, below), their
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
  are named `tlo-by-0` and on (`PREFIX`), each colored by a rule the kit gives the page as it paints, in the person's
  color (`colorAt`); a host that names its own (`paint`'s last argument) colors them itself. A browser with no highlights gets the ghosts alone.
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
Contract Editor, an app on a branch of its own, made these modules, and is to be rebased onto them; what it has beside
them stays its own: two people's edits of one version merged, its log and its server.

- **Everyone's color.** `colorOf(who, order)` is a person's color: their place in the host's `order` (`slotOf`), or, for
  someone it does not name, a place past everyone's that their name alone picks, so they are one color wherever they are
  drawn; `colorAt(place)` is the place's. The first six are `COLORS`, Okabe–Ito's; then as many as there are people,
  each a hue a golden angle on from the one before at one of three depths in turn; and each, the first six too, as near
  its hue as words in it read at 4.5:1 on the paper of either theme, darker in the light and lighter in the dark, said
  as CSS's `light-dark()` (test/review.test.ts holds forty of them to it, and twenty-four apart). `paint`'s `order` may
  be each person's place instead of a list (a host may draw its assistant, working for someone, in the assistant's
  color), and the kit gives the page a highlight rule for every place it paints under its own prefix, so changes.css
  names none.
- **A redraw that awaits the ghosts.** `drawChanges(words, tracked, { settled, drawing, order, prefix })` is the
  drawing whole: the words' update awaited, the ghosts given and awaited, then the paint, then "text-redline" from
  the words, bubbling, for whatever is placed by them (the margin). One draw at a time over one editor: asked again
  while one is under way, it draws once more after it, with what it was asked last.
- **Another's ops landed.** `applyRemote` fires "docremote" (`DocRemote`, `{ ops }`) on the editor once they are
  applied, never bubbling, and nothing else does: a change made here is "docops" and "docchange", and neither fires
  for another's. A host draws again on all three.
- **A quote from the selection.** `quoteAt(words)` is the words selected as a comment keeps them (`Quote`: the words, a
  line a block, and the block and place they begin at), and the bubble's Comment says it in "text-comment"'s detail.
  `pinComments` takes a comment's `block` and `offset` beside its quote: where words read twice, it pins the one the
  comment was made on, there if they still read there, else where they read nearest it.

```ts
import { colorOf, ghostsOf, initialsOf, mount, paint, pinComments, track, wordsOf, type Step } from 'tinylittleoffice/kit';
const { editor } = await mount('write', versions.at(-1)!.text, main, save);
const words = wordsOf(editor)!;
const order = people.map((p) => p.email);
const initials = initialsOf(people);
words.mentions = people.map((p) => ({ name: p.name, detail: p.email }));
async function draw(versions: Step[]) {
  const tracked = track(versions);
  const ghosts = ghostsOf(tracked, words.model, () => false, {
    color: (who) => colorOf(who, order), initials: (who) => initials.get(who) ?? '?', name: nameOf,
    accepted: () => false, takenOutBy: (name) => `Taken out by ${name}`, cardChanged: 'Changed', rejected: 'rejected', restored: 'restored',
  });
  await words.showGhosts(ghosts.size ? (i) => ghosts.get(i) ?? [] : null);
  paint(words, tracked, order);
  pinComments(words, main, comments);
}
```

`drawChanges` is the ghosts and the paint in one call.

### The components

Who did what listed, and the comments in the margin, are elements a host puts beside the words. They take data and
tell what is asked in events, and own their layout and what a person does in them; storage is the host's. Their shapes
are a host's server's (kit/text/review.ts), named as a server's rows name them, so its rows are handed in as they come;
a host whose rows name a field differently maps it (the flag on a comment that asks the assistant to `to_assistant`):

| the kit's | what a host's server keeps | read for |
|---|---|---|
| `Step` `{ author, text, hash?, seq? }` | a document's versions, each by its author | `track` |
| `Review` `{ id?, change_id, by, verdict, at_seq, why?, undone_at? }` | the verdicts on changes | `reviewsOf`: `rejectedBy`, `reviewedBy`, `settled`, `standing`, `of` |
| `Comment` `{ id, thread_id?, parent_id?, quote?, block?, offset?, by, text, to_assistant?, change_ids?, resolved_at?, created_at?, deleted_at? }` | the comments, in threads | `threadsOf`, the margin |
| `Person` `{ id, name, color? }` | a team member by id, a guest by email, the host's assistant | names, colors, "@" |

A review names a change (`<hash>:<n>`) or a version's changes whole (`<hash>:*`, `covers`); one taken back still closed
what it reviewed, and settles and rejects nothing; a change accepted by anyone is settled (one redline for everyone).
`standing(id, author, me)` is where it stands for a reader (`Standing`): settled, rejected, theirs, reviewed by them, or
waiting for them.

- **`<to-review-panel>`** (kit/ui/review-panel.ts): `changes` (`changesOf`), `people`, `me`, and `reviews` (or the
  host's own `standing(change)`), `can-review`, `current`. Every change by author, each author in their color with how
  many wait for this reader, each change in words (`changeWords`: "Replaced “30” with “45”") with where it stands;
  Accept on someone else's change waiting for the reader, Reject on any still open, and both for all of one person's.
  It tells "review-accept" and "review-reject" (`ReviewAsk`, `{ ids }`) and "review-show" (`{ id }`), bubbling, and
  changes nothing: an acceptance is the host's row, a rejection its row and its edit (`rejectOps`). `show(id)` brings
  a change into view and gives it the focus (a lozenge's "text-ghost").
- **`<to-comments>`** (kit/ui/comments.ts), the margin: `comments`, `people`, `me`, `can-comment`, `ask` (the host's
  assistant, a Person), `words` (the editor's, `wordsOf`), and for the changes a reply made in answer `changes`
  with `reviews` (or `standing`) and `can-review`. Each open thread whose words are found is a note beside them at their
  height, a note that would meet the one above moved under it, placed again on "docchange", "docremote",
  "text-redline", a scroll and a resize, the words drawn first; where there is no room (the stylesheet's
  `--to-comments-beside`, 0 under 760px) it is a sheet over the page's foot, opened by a button that counts the open
  threads. A note opens its thread (every comment by whom and when, Asks Assistant, the reply box, Resolve or Reopen,
  Delete on the reader's own, Close or Escape); an assistant's reply lists the changes it made (its `change_ids`) as the
  panel does, each with Accept and Reject; until the assistant has answered an ask, the thread says it is answering.
  Threads on words since changed, on the whole document and resolved are listed apart. Given `words`, it marks the
  editor `data-comments`, so the bubble has Comment, and opens a box beside the words selected; New comment writes one
  on the whole document. It tells "comment-send" (`CommentSend`: `text`, `ask`, `mentions`, `parent_id`, `quote`, and
  `done(ok)`, which empties the box once the host has kept the words or keeps them where it refused),
  "comment-resolve" `{ thread_id, resolved }` and "comment-delete" `{ id }`, and the panel's "review-accept" and
  "review-reject".
- **`<to-comment-box>`** (kit/ui/comment-box.ts), the margin's box: a plain field marked `data-comment-box`, "@" with
  letters offering `people` (the assistant first), Comment or Reply, Ask, Cancel; "comment-box-send" (`BoxSend`).

The words are the kit's, in every language (en.ftl's `review-` and `comments-` groups). Their sheet is
src/styles/review.css, in editors.css alone. A host that built its own redline, margin, comment box and reviews (who
reviewed, who rejected, what is settled, where a change stands) can replace them with these; what stays its own is its
server's rule for the steps it keeps, the order of operations (which `mount`'s `onOps` and `applyRemote` serve) and a
thread on what has no words to pin to (a record's, in a box of the same kind).

```ts
import { changesOf, drawChanges, mount, reviewsOf, track, wordsOf, type Comment, type Review, type Step } from 'tinylittleoffice/kit';
const { editor } = await mount('write', versions.at(-1)!.text, main, save, { onOps: send });
const words = wordsOf(editor)!;
const panel = Object.assign(document.createElement('to-review-panel'), { people, me, canReview: true });
const margin = Object.assign(document.createElement('to-comments'), { people, me, canComment: true, ask: { id: 'assistant', name: 'Assistant' }, words });
aside.append(margin, panel);
async function draw(versions: Step[], reviews: Review[], comments: Comment[]) {
  const r = reviewsOf(reviews);
  const tracked = track(versions, r.rejectedBy, r.reviewedBy);
  Object.assign(panel, { changes: changesOf(tracked), reviews });
  Object.assign(margin, { comments, changes: panel.changes, reviews });
  await drawChanges(words, tracked, { settled: r.settled, drawing, order: people.map((p) => p.id) });
}
editor.addEventListener('docremote', () => void draw(versions, reviews, comments));
margin.addEventListener('comment-send', async (e) => e.detail.done(await keep(e.detail)));
panel.addEventListener('review-reject', (e) => reject(e.detail.ids));
```

## An app built outside

An app is a definition and an editor element (What a page that holds an editor needs), and nothing in that needs the
suite's repository: an app built outside it is made with `tinylittleoffice/kit` and the kernel
(`tinylittleoffice/doc`) and put beside the suite's apps by the page that holds it. The Board was the first, a package
of its own on the kit (2026-10-17), until it came into the library (The library's own apps); test/browser/kit.test.ts
builds one now, with the kit and the kernel alone, as Tally below is built.

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

## The library's own apps

An app of the library's is made as the suite's are, in src/apps/<id>/ with the suite's shape (def.ts, model.ts,
editor.ts, view.ts, commands.ts, templates.ts and templates.md, style.css, tests/), but the site does not list it: it is
in no list of kit/core/apps.ts, so the home page, the routes, the pages the build writes, Insert ▾, the drawer, the API
and the skill never name it, and the site's build reaches none of its modules. A page registers it, as it would an app
built outside, and mounts it as any app. There is one, the Board (Paul, 2026-10-18: "go ahead and add [the Board] to the
kit, even if we don't use it in the production build more broadly"): cards in lanes by their status, each card a row of
a table, so a board and a spreadsheet are two views of one table (src/apps/board/model.ts says how a table is read as
lanes). Before it came here it was a package of its own on the kit, and its source came in whole.

- **`tinylittleoffice/board`** (dist/board.js, src/board.ts): its definition (`board`), its editor element
  (`<to-board-editor>`, `ToBoardEditor`, defined as the file loads), `registerBoard()`, which puts it after the suite's
  apps once and does nothing when called again (where `registerApp` would throw), and everything the model serves; the
  type of a pick (`PickedCard`). `install` is `registerBoard` by its package's old name. dist/board.js is a second entry
  of the editors' build (vite.lib.config.ts): what it shares with the editors (Lit, the kit, the kernel) it imports from
  ./editors.js, so the page has one Lit and one registry, and its own modules, and Lucide's icons no suite app draws,
  are never in editors.js. Its templates are fetched when asked for, as every app's are (dist/editors/templates-board-…).
- **`tinylittleoffice/board/model`** (dist/board-model.js, src/apps/board/model.ts): the model alone, pure and with no
  DOM, for a server that makes boards from its own records and changes them as ops (`boardDoc`, `boardOf`, `moveCard`,
  `addCard`…). It imports the kernel from the package's own ./doc.js and nothing else (test/lints.test.ts holds the
  source to it, test/package.test.ts the built file, and runs it under Node).
- **`tinylittleoffice/board.css`** (dist/board.css, src/apps/board/style.css): its own stylesheet, in the editors'
  `apps` layer, beside editors.css rather than in it. In editors.css it would be 907 bytes more, gzipped, on 31,021
  (about 3%) for every page, a board on it or none; on its own it is 1,360 bytes, loaded by the pages that draw one.
- **Its words** are a group of each language's file in src/i18n/ (`board-…`), checked as everyone's are (`npm run
  i18n:check`), and ride in the editors' languages (dist/editors.js's English, and each language's file under
  dist/editors/), so `registerBoard` adds none. Every other build, the site's first, leaves them out
  (scripts/ftl-plugin.ts `LIBRARY_APPS`), and the site's files are the bytes they were before the Board came.
- **What a page sets on it, and hears from it** (src/apps/board/editor.ts, Paul, 2026-10-18, on the Board as a CRM's
  pipeline):
  - **A card is carried from anywhere on it**, with no grip: a mouse's press carries it once it has moved 6px, so a
    click is still a click (the caret where it was in a title, the card chosen, or picked where the page asks for picks);
    a finger's or a pen's once held still for 200ms (the card lifts) and then moved, so a finger that moves at once
    still scrolls the page; held 500ms the card is chosen, the editing standard's hold, and may still be carried. A
    title being typed in keeps its press for its words. A dashed slot the card's height shows where it would land, a
    ghost of its face follows the pointer, Escape lets it go, and near an edge the column, the lanes (sideways) and a
    lane's cards scroll. A page that gives a lane a height of its own sets `--to-board-lane-h` on the element; a lane's
    cards then scroll inside it.
  - **`cardFields`** (a property, `CardField[] | null`): which of a card's fields it shows, in this order, and how:
    `{ column, as? }`, the column by name (any case) or by place, `as` one of `line` (the line under the title: a
    deal's company; one a card), `money` (an amount, short: $12,000), `date` (a day, short: Dec 15), `person` (round
    initials in a hue of the name's own, the name on hover and to a screen reader), `badge` (a chip: a choice, a number
    with its name, a box checked) or `text` (a quiet name and value). Left as null, the columns' types say (the model's
    `cardFieldsOf` and `fieldAs`, which a server can ask too): the first column of words that holds no person is the
    line, a column named Owner, Author, Assignee… a person, then each other by its type, four at most. `[]` shows the
    title alone. Each lane shows its count and, where the table has a column of money, the sum of its first one
    (`moneyColumn`, `laneSum`).
  - **A lane renamed where it is drawn**: a double click on its name (a double tap under a finger: two taps on it
    within 400ms and 24px), Enter or F2 on it, or its menu's Rename lane make it a field, its words chosen; Enter keeps
    it, Escape lets it go, the focus leaving keeps it, and a name that is empty or another lane's is refused and said
    under it (role=alert). The name's hint says the way that fits the device: "Double-click to rename" under a mouse,
    "Double-tap to rename" where the pointer is coarse and nothing hovers. `startRename(i)` does the same from a page's
    own control, `i` the lane's place among the lanes; it does nothing where the lanes may not be changed (read-only, or
    carried only without `own-lanes`).
  - **Add lane**: a button after the last lane, wherever a lane may be changed (carried only with `own-lanes` too),
    which adds "New lane" at the end, its name a field, told first as `laneadd` `{ name, at }` (`at` the lanes' count);
    a page that makes its lanes itself hears it and adds its own.
  - **A lane's kind** (`laneTone`, a property: `(name) => LaneTone | null`, LaneTone `'won' | 'lost' | 'neutral'` or a
    kind of the page's own): drawn on the lane as `data-tone`; won is tinted the success color with a rule along its
    top, lost quieter (a gray rule, its cards a little faded), neutral and none as any lane, and any other kind is the
    page's to draw by its own rules on `[data-tone]`.
  - **The bar on a phone**: where the board is narrower than 26rem the bar's count of cards goes (each lane says its
    own), so Insert, the Spreadsheet's button, Undo and Redo are all on the screen.
  - **A lane's change, told first** (`LaneEvents`, `LaneEvent`): before a lane is renamed, added, moved or deleted the
    board fires, bubbling and cancelable, `lanerename` `{ from, to }`, `laneadd` `{ name, at }`, `lanemove`
    `{ name, from, to }` (places among the named lanes) or `lanedelete` `{ name, cards }` (how many cards go with it).
    A page that refuses it calls `preventDefault()`, and nothing changes; a page that makes it through its own command
    (a CRM whose stages are its records) calls `preventDefault()`, runs its command and gives the board its new
    document. A page that makes every one of them sets `own-lanes` (`ownLanes`): the board tells them and makes none,
    and offers them carried only too (each lane's menu, but Add a card, and Rename).
  - **A table of the same cards** is the page's (`<to-table>`, A typed table): `boardOf(doc)` gives its columns
    (`cols`, typed) and its cards, each with its row worked out (`Card.values`, a value a column: a number for money,
    a serial day for a date) and its row (`Card.row`, the id a table's row keeps); `setCell(doc, row, col, words)` is
    the ops for a cell the table changed, the lane's a move to the end of that lane. The table's edit goes to the board
    as another's ops go (`applyRemote`), and the board's `docchange` gives the table its rows again: Apps/Board/Board
    And Table in the Storybook does both.
- **Its tests** are its own (src/apps/board/tests/): the model and its properties under Node, and its editor, its view
  and its languages on a bare page that registers it and mounts it with `mount`, as a host does. Its commands are not
  in the site's registry (scripts/commands.ts), so docs/editing.md's tables and the skill do not list them;
  docs/editing.md §8 says its keys in words.

What its package of its own served, and where each is now; every name a page or a server used is kept, so a page
moves by its import paths alone:

| its package | the library |
|---|---|
| the root: `install`, `board`, the model, `ToBoardEditor`, `PickedCard` | `tinylittleoffice/board`: the same names, and `registerBoard` |
| the root: `words` (each language's Fluent source, for `addStrings`) | gone: the words are in the editors' languages |
| `/model` | `tinylittleoffice/board/model` |
| its stylesheet | `tinylittleoffice/board.css` |

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
An editor's ops leave its words as the format keeps them (docs/kernel.md §2, point 5: no mark on a space at its edge;
a heading one line), each op on its own, so a server that keeps the document as its text, and applies each op to what
it reads back, holds the words the editor holds.

Of the server's four rules (docs/kernel.md §12), the kernel enforces two: `transform` throws `Conflict` for crossing
spans, and `apply` throws for a table left with no column or one past Z. The third, no lock in the head, has no check in
the kernel: the server refuses an op on the head's `lock` itself. The Spreadsheet does not keep it yet: it writes the
head's lock while its first table carries no `{lock=…}`, so a person locking cells in a shared sheet sends an op the
server refuses, until the Spreadsheet writes the table's lock when its page shares the document.

## Where a document lives: the backends

The site keeps a document in its link; a page may keep it elsewhere, and the five ways are one shape
(backends/README.md): `open(address, ask)` gives the document an address names, whichever backend owns the address's
form, and `place(opened, into, moved, own)` puts it in an editor on the page, as `mount` does, with each change handed to
the backend and the backend's news handed to the editor.

```ts
import { open, place, newShared, readerAddressOf, SyncStore } from 'tinylittleoffice/kit';

// A link, a sealed link (the page is asked for the password) or a short link: the document is in the address.
const doc = await open(location.href, { password: () => ask('Password?') });
const placed = await place(doc, main, (address) => history.replaceState(null, '', address));

// A document several people edit at once: a journal (docs/crypto/journal.md), at a journal service of your own.
const { address, reader } = await newShared('https://journal.example.org/', 'write', text, 'Ann');
const shared = await open(address, { by: 'Ann' });   // by: the name the changes carry
await place(shared, main);                             // others' changes land as they come; a reader's address opens read-only

// A person's own store, the same on every device that has its address: an index of such documents, in a journal of its own.
const store = await SyncStore.make('https://journal.example.org/', 'Ann');
const note = await store.create('https://journal.example.org/', 'write', '', 'A note');
store.watch((documents) => draw(documents));           // told as another device adds, renames or removes
```

An `Opened` has the app, the text, the address that holds the document now (`changed(ops, text)` answers with the next,
a link's with every edit), `readOnly` for a reader's address, and for a shared document `remote(fn)` (others' ops, for
`applyRemote`) and `reset(fn)` (the document taken whole again, for the editor's new value); `place` wires all of it
and returns the editor with `close()`. A shared document's journal is its history: `versions(address)` lists every entry
with who made it and when, `textAt(address, seq)` gives the document as it was. The journal service runs on Cloudflare
or on one machine (docs/self-host.md); it lets only the sites it is told of write, so a page on another origin names
that origin in the service's `SITE`.

## A page's own commands

A page's commands are declared as the kit's and the apps' are (kit/core/commands.ts: id, label, icon, keys, scope,
where, when, does), in a scope of the page's own (`host`, `records`), and act on a context of its own: its pipeline, the
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

A host may serve its commands to programs as well as pages: an API, an assistant's tools, an MCP server, the
documentation. The kernel of that is this registry, and `tinylittleoffice/commands`
(src/commands.ts, built to dist/commands.js: one file, no imports, no DOM, for Node 24 or a page) serves it: `command`,
`register`, `registered`, `inScope`, `live`, `run`, `labelOf`, `keysText`, and the types `Command`, `Schema`, `Where`
and `Words`, with nothing that draws. A command may carry its program's half beside its words and keys:

- `input` and `output`, JSON Schema objects (`Schema`): what it takes and gives back, which the API, the tools and a
  fuzz read. A host may write them with Zod and hand the kernel `z.toJSONSchema()` of them.
- `who`, the actors that may run it (`team`, `assistant`); without it, no program may, and it is a page's alone.
- `reads: true` when it changes nothing; `doc`, one sentence saying what it does.

Two pure derivations come from a list of them. `tools(commands, actor)` is the tool list an assistant or an MCP server
serves that actor: for each command whose `who` names it, `{ name: id, description: doc ?? its words, inputSchema:
input ?? { type: 'object' } }`, MCP's field names. `docsOf(commands)` is a Markdown page: every command in the list's
order, what it does, its scope, who, whether it reads, its input and its output. Running them, the log and undo are
the program's own.

A label that is a message's id is said by `t()` in the language in use, and a program chooses none: it gets English,
whose messages ride in commands.js, so `tools()` describes a command without a `doc` in English with nothing set up.
What the registry's modules ask of a page (the platform, which spells keys a Mac's way; the root, which takes a
language) the build answers "none" (vite.lib.config.ts), so `keysText` spells keys as on Windows wherever a program
runs, unless asked for a Mac's; test/lints.test.ts holds that those modules name a browser global only behind a
`typeof` of it, and test/package.test.ts that commands.js names none. commands.js holds a registry of its own: a page
that draws commands with `tinylittleoffice/editors` declares them there, and the site's registry (scripts/commands.ts)
never holds a program's.

## A host's page

What a page that is not the site arranges, each with the site's way as the default:

- **The toast.** `setup` listens for a toast said on a page with no `<to-toast>`, and puts one at the end of its body
  the first time; a page that draws its own is never given a second (kit/ui/toast.ts `toastAnywhere`).
- **Where a dialog goes.** `editDoc({ app, text, into })` and `editTable(table, into)` put their dialog in `into`, an
  element the page's theme or styles are on; the page's body otherwise.
- **Where the theme and the size are kept.** `keepThemeAt(key)` and `keepSizeAt(key)`, called before `setup`: on the
  device under the page's own key, whatever Private or Saved says (they are the page's, not the site's), or, `null`, in
  memory for the visit. The site's keys ("to-theme", "tinyoffice.size", through kit/core/store.ts) are the default.
- **An app registered twice.** `registerApp` with the same definition again (the object itself, or one whose every
  field is the same value and every function and getter the same code: a module imported twice, or reloaded unchanged)
  is nothing to do; another definition under an id the registry knows still throws.
- **Find.** `find(target, into?)` opens the page's one `<to-find>` over an editor of its own, placed by the editor
  alone (under its bar, at its right edge), never by the site's bar, column or header; Mod+F is the page's to bind.
- **The kit's other elements.** `tinylittleoffice/kit` serves, typed, what the words draw around themselves and an app
  draws with: `<to-find>`, `<to-link-pop>`, `<to-context>`, `<to-complete>`, `<to-preview>`, `<to-locked-doc>`,
  `<to-doc-dialog>` (with `editDoc` and `editTable`), `chooseIcon`, `dateNav`, and a chart from a table (`chartData`,
  `suggestChart`, `chartPage`, `CHART_KINDS`, and `pageSvg` for any Page); test/package.test.ts's strict program
  imports each.
- **Compare.** `<to-compare>` says where each side opens with `host.link`, never the address.

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
