# Tiny Little Office as a library

Tiny Little Office is becoming a library other pages build on, first among them Atlas (github.com/aboard-io/atlas,
its docs/plan.md): its documents are built with the kernel and edited with these editors, kept in Postgres rather than in
links. The site stays what it is, and is the library's first user: whatever an editor needs from the page it is in, the
site gives it the way any other page would.

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
   `tinylittleoffice/doc` (dist/doc.js: the kernel, the model, ops, TLO, JSON and formulas, one file with no
   dependencies and no DOM, for Node 24 or a page), `tinylittleoffice/editors` (dist/editors.js: the registry, each
   app's editor element, the host, and what a page sets up once, the language, the theme and the size, with no shell;
   Lit and the rest bundled in, as the site bundles its app file) and `tinylittleoffice/editors.css` (its stylesheet,
   one file). What the editors fetch only when asked for, an app's templates, a language other than English and the
   trip's map and its worker, is in dist/editors/ beside them. The site's build keeps its own entry; both are built
   from the same modules. test/package.test.ts packs and installs the package and runs the kernel from it; the
   stylesheet names the site's fonts by the site's paths (/fonts/…): see Theming. The package is typed: build:lib
   writes the declarations of the three and of the API into dist/types (tsconfig.lib.json), which each export names
   first, and test/package.test.ts type-checks a strict program against them as installed (with `skipLibCheck`, since
   the commands' declarations name Lucide's `IconNode` and the editors' name Lit's and Lucide's types, which are bundled
   in, not installed).
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
   board), and draws and answers it with the kit's functions: see A page's own commands.
5. **A bare page that holds `<to-write-editor>`** with a host of its own, and a test that types in it and reads the
   `docchange`. Done when the site is unchanged (every test, walk and budget) and the bare page works.
6. **Commands for a program.** Done: src/commands.ts, served as `tinylittleoffice/commands` (dist/commands.js), the
   registry with a program's half and the two derivations Atlas's docs/commands.md asks of it: see Commands for a
   program.

## A page's own commands

A page's commands are declared as the kit's and the apps' are (kit/core/commands.ts: id, label, icon, keys, scope,
where, when, does), in a scope of the page's own (`host`, `atlas`), and act on a context of its own: its board, the
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
const open = command<Board>({ id: 'host.open', scope: 'host', label: (b) => `Open ${b?.record.name ?? 'record'}`,
  keys: 'Mod+Shift+O', where: ['bar'], does: (b) => b.open(b.record) });
register([open]);
await mount('write', text, main, save, { commands: [open], context: board });
render(html`<to-bar>${cmdTool(open, board)}</to-bar>`, bar);
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
  labels). The faces are IBM Plex, which the stylesheet's `@font-face` rules name at `/fonts/…` on the page's own
  origin; the package does not carry the files (public/fonts/ in this repository, under the SIL Open Font License).
  A page serves them there, or sets the fonts to faces of its own.
- **Shape.** `--to-radius`, `--to-radius-sm`, `--to-radius-pill`, `--to-shadow` and `--to-shadow-pop`.
- **Room.** `--to-gutter-k` (the gutter, as a number of the scale's 16px: 1, and 0.75 on a narrow screen), `--to-max-w`
  (the measure of a column of words), and `--to-col-h`, the height a canvas or a map fills (the Drawing, the Diagram,
  the Animation, the Trip Planner's map): the screen less the site's header and bar unless the page sets it, as the
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

Then, for Atlas and the site alike: operations with ids, authors and versions, ordered by a server, with the property
that any order of delivery ends in the same document (Atlas's plan, phase 3).
