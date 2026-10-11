# R17-urdu: Urdu reads in Nastaliq where the device has it

**Paul, 2026-10-11:** *"Choose the best path for colloquial speakers of Urdu. I don't know it."* The choice: Urdu readers in New York read Nastaliq; Naskh (the Arabic default) reads to them as a foreign typesetting, the way Fraktur would to a German reader. Every iPhone ships Noto Nastaliq Urdu; Android ships it from 8 on; Windows has Urdu Typesetting. Where none is there, Naskh is the fallback and nothing breaks.

## What is wrong today

The stylesheet has no `:lang(ur)` rule, so Urdu is set in the device's Arabic font (Naskh). `docs/translation.md` §8 left the choice open. Nastaliq is taller than Naskh: its line box needs about 1.7 to 2 line-height, and its baseline sits lower, so the kit's `--to-line` (1.4 or so) clips descenders.

## The design

- **A font stack for Urdu**, in `src/styles/tokens.css` under `:lang(ur)`: `--to-font: 'Noto Nastaliq Urdu', 'Urdu Typesetting', 'Jameel Noori Nastaleeq', 'Awami Nastaliq', var(--to-font-arabic-fallback)`, where the fallback is the Arabic stack the device would have used. Headings, body and the bar's labels all take it: one token, no per-component rule.
- **Room for the script.** Under `:lang(ur)`, the line-height tokens go to 1.9 for body text and 1.6 for labels, and the bar's label slots (`test/browser/label-widths.test.ts`) measure Urdu in Nastaliq, as `test/browser/fonts.ts` already does; shorten any Urdu label that no longer fits rather than raising its slot.
- **The measuring tests** (`metrics.test.ts` within-10%, label-widths) already use Noto Nastaliq Urdu on the box. Keep that, and add one test that `:lang(ur)` resolves `--to-font` to the Nastaliq stack and the body line-height to the taller token.
- **Pages drawn to SVG** (`kit/draw.ts` textWidth) keep their per-script widths; add a note that Urdu's Nastaliq measure is the Arabic width times 1.15 and test one Urdu string against the browser's measurement within 10%.
- `docs/translation.md` §8: the choice, in two sentences, and why.

## Where

`src/styles/tokens.css`, `src/styles/kit.css` (only if a component overrides the line-height token), `src/kit/draw.ts`, `test/browser/fonts.ts`, `test/browser/metrics.test.ts`, `test/browser/label-widths.test.ts`, `docs/translation.md`.

## Proof

- A browser test in `ur`: `getComputedStyle(document.body).fontFamily` starts with Noto Nastaliq Urdu and the line-height is the taller token; in `ar` neither.
- label-widths passes for `ur` in Nastaliq, with every shortened label named in the commit.

## Not this

- No bundled Urdu font (the device's own, or Naskh).
- No change to Arabic.
