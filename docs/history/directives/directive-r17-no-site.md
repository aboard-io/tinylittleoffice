# R17-no-site: the Website Builder is gone

**Paul, 2026-10-11:** *"Let's get rid of the Website Builder entirely."* It rendered arbitrary HTML, CSS and script from a link inside a page served from tinylittleoffice.com: a phishing kit with our domain on it, which no sandbox makes safe. Pre-launch there is no compatibility to keep (prelaunch-no-compat): delete, do not shim.

## What goes

- `src/apps/site/` whole (def, editor, model, view, frame, forms, theme, commands, templates, templates.md, tests, style), its registration in `src/kit/apps.ts` and the registry, its icon, its routes (`#/v1/site/…` becomes an unknown app: the shell's existing "no such app" path), its exports (`.html` website export in `src/kit/exports.ts`), its chunk and budgets (`budgets.json`), its strings in all 19 language files (every key only it used: `npm run i18n:check` and the unused-strings lint will say which), the walks' model entries for it, its e2e specs, `scripts/site-frame.ts` and the `siteFrame` plugin in `vite.config.ts` and `vitest.config.ts`, the display frame in `src/kit/shell.ts` that only a website used (and the `allow-popups` sandbox it needed; r16-gates' message hand-off goes with it), `src/kit/install.ts`'s and `src/kit/embeds.ts`'s references, `images.unsplash.com`'s reason in `src/kit/network.ts` (keep the host, reword the reason), the Insert dialogs that offered a website, the hand-offs into or out of the Website Builder in other apps' defs, the home page's row (twelve apps now), docs (README, docs/kernel.md, docs/editing.md, docs/templates.md, docs/transparency.md, the generated docs by their scripts), `skill/tinyoffice/SKILL.tpl.md` and `public/llms.txt` via `npm run skill`, `src/api.ts` and `packages/doc/tinyoffice.ts` where they name apps.
- The threat model's rows about the website frame become one line: there is no website builder; a document never runs code.

## Proof

- `grep -rn "site" src/ docs/ skill/ e2e/ test/` finds no reference to the app (the word "site" meaning this website stays; name each remaining use in the report).
- `npm run build`: no site chunk; the home page lists twelve apps; the CSP has no frame-src for srcdoc or the frame script.
- The whole suite green; the walks run over twelve apps.

## Not this

- No replacement app and no "coming back later" note anywhere.
