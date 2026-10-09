# TinyLittleOffice

A tiny office suite that lives entirely in the URL. Every document is one text, written in TLO (Markdown
with a few additions), compressed into the part of the address after `#`, which no server ever sees. Copy
the link and you have copied the file. No accounts, no saving, nothing sent anywhere unless you share it.

This tree is the rebuild (branch `next`): one kit, apps as definitions on it, a document kernel at the
heart and one editor over it. The plan is `docs/rebuild.md`, the kernel's design `docs/kernel.md`, the
format `docs/tlo.md` in the old tree until it moves here.

## Layout

```
src/kit/        the kit: shell, bar, insert, menu, dialog, toast, drawer, home, routing, codec, store,
                privacy, offline, share, exports, i18n, theme, icons, app (the AppDef contract), apps (registry)
src/doc/        the document kernel (docs/kernel.md); empty until it lands
src/apps/<id>/  an app: def.ts (its definition), editor.ts (its element, a lazy chunk), style.css
                (wrapped in @layer apps), templates.ts, tests/
src/i18n/       the strings: en.ts is every key, by hand; a sibling file is a language
src/styles.css  declares the cascade: @layer tokens, kit, apps, responsive, a11y; src/styles/ holds each
src/sw.ts       the service worker, for the copy kept on the device
public/         _headers (the Content-Security-Policy), manifest, icons, theme.js
scripts/        offline-files.ts (what the device keeps), i18n-extract.ts (the strings, checked)
test/           unit tests under node; test/browser/ the shell in a real Chromium (Vitest browser mode)
e2e/            the small Playwright smoke on the built site, desktop Chromium and iPhone-sized WebKit
```

## Commands

```sh
npm ci
npm run dev           # 0.0.0.0:4178 (pefdev.exe.xyz allowed)
npm run build         # typecheck, then dist/ with a page per app, the CSP hashes, files.json, sw.js
npm run typecheck     # tsc is the lint
npm test              # unit (node) and browser (Chromium) tests
npm run test:e2e      # the smoke, on a fresh build; SHOTS=<dir> saves screenshots
npm run i18n:check    # every t('…') in src/ is in src/i18n/en.ts, placeholders matching
npm run i18n:extract  # append the missing keys to en.ts, at the end, to be sorted by hand
```

Strings: every string a person sees is `t('English words')`; English is the key, `{name}` a placeholder,
`{n|one slide|# slides}` a plural (the forms in the language's own order, `#` the number). See `src/kit/i18n.ts`.

Deploy: `wrangler.jsonc` serves `dist/` as static assets on Cloudflare with `public/_headers`; the build
output is deployable, but nothing here deploys.
