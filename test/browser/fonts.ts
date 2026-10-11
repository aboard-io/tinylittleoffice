/**
 * The type each language's words are measured in by the measuring tests (label-widths, metrics): IBM Plex, the site's
 * own (src/styles/fonts.css, public/fonts/; Paul, 2026-10-11: "Use IBM Plex to measure. We use Plex everywhere!"). English
 * and every language in the Latin or Cyrillic script are measured in the slot's own font, whose stack begins with IBM
 * Plex Sans; Arabic and Hindi in Plex Sans Arabic and Plex Sans Devanagari, which the site serves behind their
 * unicode-range. The scripts Plex is not shipped for are measured in the Noto of the script, as Android and ChromeOS
 * draw them and as the box has them (fonts-noto-core, fonts-noto-cjk, fonts-noto-extra), so a width is a width and never
 * a run of fallback boxes, nor whatever the box's fontconfig reaches for first (FreeSans for Bengali, WenQuanYi for
 * Korean). Urdu in Nastaliq, as iOS draws it.
 *
 * Importing this loads the stylesheet and waits for every Plex face (`plex`), so a test measures in Plex and never in
 * the fallback the page shows while a face is on its way (font-display: swap).
 */
import '../../src/styles.css';

/** Every IBM Plex face the stylesheet declares, loaded. */
export const plex: Promise<unknown> = Promise.all(
  [
    "400 16px 'IBM Plex Sans'",
    "italic 400 16px 'IBM Plex Sans'",
    "600 16px 'IBM Plex Sans'",
    "italic 600 16px 'IBM Plex Sans'",
    "400 16px 'IBM Plex Serif'",
    "italic 400 16px 'IBM Plex Serif'",
    "600 16px 'IBM Plex Serif'",
    "italic 600 16px 'IBM Plex Serif'",
    "400 16px 'IBM Plex Mono'",
    "600 16px 'IBM Plex Mono'",
  ]
    .map((font) => document.fonts.load(font, 'Aa'))
    .concat(['400', '600'].flatMap((w) => [document.fonts.load(`${w} 16px 'IBM Plex Sans Arabic'`, 'ع'), document.fonts.load(`${w} 16px 'IBM Plex Sans Devanagari'`, 'क')])),
);
await plex;

/** The family of each script that is not Latin or Cyrillic. */
export const FAMILY: Record<string, string> = {
  ja: 'Noto Sans CJK JP',
  'zh-hans': 'Noto Sans CJK SC',
  'zh-hant': 'Noto Sans CJK TC',
  ko: 'Noto Sans CJK KR',
  ar: 'IBM Plex Sans Arabic',
  ur: 'Noto Nastaliq Urdu',
  hi: 'IBM Plex Sans Devanagari',
  bn: 'Noto Sans Bengali',
};

/** A CSS font (a computed `font`, or "600 14px system-ui, …") with the language's family put first. */
export const fontIn = (lang: string, font: string): string => {
  const family = FAMILY[lang] ?? FAMILY[lang.split('-')[0]];
  return !family ? font : font.replace(/(\d[\d.]*px(?:\s*\/\s*[^\s,]+)?\s+)/, `$1'${family}', `);
};

/** Whether the box has a family: words in it measure otherwise than in the monospace it would fall back to. */
export function installed(family: string, sample: string): boolean {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = '16px monospace';
  const fallback = ctx.measureText(sample).width;
  ctx.font = `16px '${family}', monospace`;
  return ctx.measureText(sample).width !== fallback;
}

/** Every family the measuring tests use, with words to try it on (a language's name in itself, in its script). */
export const FAMILIES: [string, string][] = Object.entries(FAMILY).map(([lang, family]): [string, string] => [family, new Intl.DisplayNames([lang], { type: 'language' }).of(lang)!]);
