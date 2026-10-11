# R17-lazy-templates: a definition is light again

**Paul, 2026-10-11:** *"Lazy templates is right."* The review measured it: each `src/apps/<id>/def.ts` imports `./templates.ts` statically, so the apps chunk is 152 KB gzipped (392 KB raw) and the first load of the home page or `/sheet/` is 329 KB across 37 files; first paint took 5.3 s at 1.6 Mbps with a 4× CPU slowdown. `src/kit/apps.ts` says "a definition is light", and it was.

## The design

- **Templates are loaded when asked for.** `AppDef.templates` becomes `() => Promise<Template[]>` (`() => import('./templates.ts').then((m) => m.default)`), one line in each def.ts. The Blank template needs no file: it stays in the definition.
- **Who asks.** The home page's template dropdown and the templates dialog (`src/kit/home.ts`, `<to-templates>`) await the app's templates on open, with the Blank entry shown at once and the rest filled when they arrive (no spinner: the list grows, under 100 ms on a good connection); a template link (`#/v1/<app>/t/<name>` or however a template is named in the route) awaits before it builds the document. Everything else that reads templates (the skill's generator `scripts/make-skill.ts`, `docs/templates.md`'s generator, `scripts/make-cards.ts`, the lints' fixtures, the walks) awaits.
- **Preload on intent.** A pointer over an app's row on the home page, or the drawer's app row, `import()`s its templates ahead of the tap (modulepreload for the one chunk), so the dropdown is full by the time it opens.
- **Budgets.** `budgets.json`: `apps` comes down to what the definitions weigh without templates (measure, then set the tripwire 5% above), and each app gains a `templates.<id>` line.
- docs/kernel.md or docs/rebuild.md where "a definition is light" is stated: templates are a chunk of their own.

## Where

Every `src/apps/*/def.ts`, `src/kit/apps.ts`, `src/kit/home.ts`, `src/kit/templates.ts` (or wherever `<to-templates>` lives), `src/kit/route.ts` (template links), `scripts/make-skill.ts`, `scripts/make-cards.ts`, the templates doc generator, `test/**` that read `def.templates`, `budgets.json`, `vite.config.ts` (chunk names).

## Proof

- `npm run build`: the apps chunk under its new budget; one `templates-<id>` chunk per app; the home page's first load (`scripts/check-build.ts` or a new count in the budgets lint) lists no templates chunk.
- A browser test: the home page's dropdown for the Spreadsheet shows Blank at once and the rest after `await`; a template link builds the right document.
- `npm run skill` and the templates doc generator produce the same output as before (diff empty).

## Not this

- No change to any template's content (that is r17-american's).
