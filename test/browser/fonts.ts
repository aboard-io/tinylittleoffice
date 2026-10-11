/**
 * The type each language's words are measured in by the measuring tests (label-widths, metrics): the Noto family of its
 * script, as Android and ChromeOS draw it and as the box has it (fonts-noto-core, fonts-noto-cjk, fonts-noto-extra), so
 * a width is a width and never a run of fallback boxes, and never whatever the box's fontconfig happens to reach for
 * first (FreeSans for Bengali, WenQuanYi for Korean). Urdu in Nastaliq, the stylesheet's first choice for it (tokens.css
 * :lang(ur)) and what iOS, Android and Windows draw. English and every language in
 * the Latin or Cyrillic script are measured in the slot's own font, which the box draws in DejaVu Sans: /etc/fonts/local.conf
 * keeps it the box's sans-serif after Noto Sans came with the scripts' fonts, so the widths every Latin test was
 * calibrated against do not move.
 */
/** The family of each script that is not Latin or Cyrillic. */
export const FAMILY: Record<string, string> = {
  ja: 'Noto Sans CJK JP',
  'zh-hans': 'Noto Sans CJK SC',
  'zh-hant': 'Noto Sans CJK TC',
  ko: 'Noto Sans CJK KR',
  ar: 'Noto Sans Arabic',
  ur: 'Noto Nastaliq Urdu',
  hi: 'Noto Sans Devanagari',
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
