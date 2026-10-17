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
   stylesheet still names the site's fonts by the site's paths (/fonts/…), which step 3 takes up.
3. **The stylesheet for a page that is not the site.** styles.css in layers, with what belongs to the site's page
   (`html`, `body`, the chrome) kept apart from what an editor needs, and the colors, type and sizes as custom
   properties a page sets.
4. **A page's own commands.** A page registers commands and scopes of its own beside the kit's (Atlas's records, its
   board), drawn and answered the same way.
5. **A bare page that holds `<to-write-editor>`** with a host of its own, and a test that types in it and reads the
   `docchange`. Done when the site is unchanged (every test, walk and budget) and the bare page works.

Then, for Atlas and the site alike: operations with ids, authors and versions, ordered by a server, with the property
that any order of delivery ends in the same document (Atlas's plan, phase 3).
