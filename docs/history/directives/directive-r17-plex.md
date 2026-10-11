# R17-plex: the type is IBM Plex, on the site and on the measuring box

**Paul, 2026-10-11:** *"Use IBM Plex to measure. We use Plex everywhere!"* Today neither the site nor the box uses Plex: `src/styles/tokens.css` sets `--to-font` to `system-ui, -apple-system, 'Segoe UI', Roboto, …`, the mono stack to `ui-monospace, …` and the serif stack to Iowan Old Style and Palatino; the box measures Latin text in DejaVu Sans (`/etc/fonts/local.conf`, pinned there by the languages round). Every width calibration (label slots, metrics, textWidth in `kit/draw.ts`) was made in DejaVu and is checked against system fonts Paul does not use. Plex is the type: IBM Plex Sans for the interface and the Sans look, IBM Plex Serif for the Serif look, IBM Plex Mono for code and the Mono look.

## The design

- **Self-hosted, never fetched from a third party.** The threat model allows no request to another host for the chrome: the woff2 files live in `public/fonts/` and are served by the site itself (CSP `font-src 'self'` from the one list, `src/kit/network.ts`; the `/network` page and docs/network.md follow). Take the files from IBM's own release of Plex (the OFL licence file goes beside them, `public/fonts/LICENSE.txt`, and `docs/dependencies.md` names them through `scripts/dependencies.ts`'s list).
- **Which files.** Plex Sans Regular, Italic, SemiBold, SemiBold Italic; Plex Serif the same four; Plex Mono Regular and SemiBold. Latin, Latin Extended, Greek and Cyrillic are one subset per file (Plex covers them in one), with `unicode-range` so a page in a script Plex does not cover downloads nothing. Plex Sans Arabic, Devanagari, Hebrew, Thai, KR, JP and TC exist; take only Plex Sans Arabic (Regular, SemiBold) and Plex Sans Devanagari (Regular, SemiBold), each behind its `unicode-range`; Bengali, Korean, Japanese and Chinese stay in the device's font (and Urdu in Nastaliq, r17-urdu). Weights are 400 and 600 only: the kit's `--to-bold` becomes 600 if it is 700 today.
- **The stacks.** `--to-font: 'IBM Plex Sans', system-ui, …` (the old stack behind it), `--to-font-serif: 'IBM Plex Serif', …`, `--to-font-mono: 'IBM Plex Mono', ui-monospace, …`. `font-display: swap`; the `<link rel=preload>` for Plex Sans Regular only.
- **The box measures in Plex.** Install the same files for the box's tests: `fc-cache` over a copy in `~/.fonts/plex/` (a script `scripts/fonts-box.sh` that copies from `public/fonts/`, so the box always measures what the site ships), and `/etc/fonts/local.conf` prefers IBM Plex Sans for `sans-serif` and `system-ui` where it preferred DejaVu. The browser tests load the site's CSS, so Chromium renders in the self-hosted files anyway; the fontconfig change is for what falls through to the system.
- **Recalibrate.** Run `test/browser/label-widths.test.ts`, `metrics.test.ts` and the walks; shorten labels that no longer fit (in their language's voice) and prune RAISED entries that now fit; retune `kit/draw.ts` textWidth's Latin and Cyrillic widths to Plex (measure, do not guess), and re-run `page-bytes` and the deck/diagram lints' fixtures where a width changed what a lint says.
- **Budgets.** Fonts are not chunks; `scripts/check-build.ts` and `budgets.json` gain a `fonts` line (the total woff2 bytes shipped, as a tripwire) and `docs/transparency.md` names the self-hosted fonts.

## Where

`public/fonts/`, `src/styles/tokens.css`, `src/styles/kit.css` (the @font-face rules, or a `fonts.css`), `index.html` (preload), `src/kit/network.ts`, `scripts/dependencies.ts` and `docs/dependencies.md`, `scripts/fonts-box.sh`, `/etc/fonts/local.conf` (the box: say in the report what you changed there), `test/browser/fonts.ts`, `kit/draw.ts`, `budgets.json`, `scripts/check-build.ts`, docs as named.

## Proof

- `test/csp.test.ts`: `font-src 'self'` and nothing else.
- A browser test: `document.fonts.check("16px 'IBM Plex Sans'")` is true after `document.fonts.ready`, and the body's computed family starts with IBM Plex Sans; the Serif look resolves to Plex Serif; code to Plex Mono.
- A node test over `public/fonts/`: every file the CSS names exists and the LICENSE is beside them.
- label-widths and metrics green in every language, the Latin ones measured in Plex (`test/browser/fonts.ts` names Plex for Latin and Cyrillic).

## Not this

- No Google Fonts, no CDN, no request leaving the site for type.
- No variable fonts (two weights are enough) and no Plex for CJK or Bengali (the device's).
