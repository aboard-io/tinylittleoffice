/**
 * A website's look: sixteen themes, each one accent colour, a type and a roundness, light or dark. Every
 * shade a page uses is the accent's hue at a lightness fixed for its role, in oklch, where one lightness
 * reads the same in every hue: on a light page the accent is held dark enough for white words on it, the
 * tint is nearly white and the deep shade (links, words on the tint) nearly black; on a dark page the
 * accent is lifted for dark words, the tint is a dark wash and the deep shade pale. The shades are worked
 * out here, gamut-mapped by chroma as CSS does, and written into the page as oklch() (the same numbers
 * drawn as hex into the pictures), so the contrast test reads exactly what the browser shows.
 * (Ported from the old tree's lib/sitemodel.ts, which left the arithmetic to `oklch(from …)` in CSS.)
 */
export type Face = 'sans' | 'serif' | 'rounded' | 'mono';

export interface SiteTheme {
  /** The accent, as hex. */
  a: string;
  face: Face;
  /** Corner radius, in rem. */
  round: number;
  /** Light words on a dark page by nature; "light" asks for the other. */
  dark?: boolean;
}

export const THEMES: Record<string, SiteTheme> = {
  indigo: { a: '#4f46e5', face: 'sans', round: 0.9 },
  teal: { a: '#0f766e', face: 'sans', round: 0.9 },
  rose: { a: '#be123c', face: 'serif', round: 1.2 },
  amber: { a: '#b45309', face: 'serif', round: 0.6 },
  ink: { a: '#18181b', face: 'sans', round: 0.3 },
  forest: { a: '#15803d', face: 'serif', round: 0.9 },
  ocean: { a: '#0369a1', face: 'sans', round: 1.4 },
  sunset: { a: '#c2410c', face: 'rounded', round: 1.6 },
  plum: { a: '#7e22ce', face: 'sans', round: 1.2 },
  candy: { a: '#db2777', face: 'rounded', round: 2 },
  olive: { a: '#4d7c0f', face: 'serif', round: 0.4 },
  slate: { a: '#334155', face: 'sans', round: 0.5 },
  paper: { a: '#78350f', face: 'serif', round: 0 },
  typewriter: { a: '#111827', face: 'mono', round: 0 },
  midnight: { a: '#818cf8', face: 'sans', round: 0.9, dark: true },
  coal: { a: '#f59e0b', face: 'rounded', round: 1.2, dark: true },
};
export const FACES: Face[] = ['sans', 'serif', 'rounded', 'mono'];

/** What `theme:` in the head asks for: a theme, and the type and the mode where they differ from its own. */
export interface Theme {
  id: string;
  face?: Face;
  dark?: boolean;
}

const FONTS: Record<Face, string> = {
  sans: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
  serif: "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif",
  rounded: 'ui-rounded,"SF Pro Rounded","Nunito","Varela Round",system-ui,sans-serif',
  mono: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace',
};
const FACE_WORDS: Record<string, Face> = { sans: 'sans', serif: 'serif', rounded: 'rounded', round: 'rounded', mono: 'mono' };

/** "theme: forest serif dark": a look, a type, a mode, any of them, in any order; a word it does not know is let be. */
export function parseTheme(words = ''): Theme {
  const into: Theme = { id: 'indigo' };
  for (const w of words.toLowerCase().split(/[\s,]+/)) {
    if (THEMES[w]) into.id = w;
    else if (FACE_WORDS[w]) into.face = FACE_WORDS[w];
    else if (w === 'dark' || w === 'light') into.dark = w === 'dark';
  }
  return into;
}
const themeOf = (t: Theme) => THEMES[t.id] ?? THEMES.indigo;
/** The words for `theme:`, canonical: the theme's own type and mode are not written. */
export function themeWords(t: Theme): string {
  const T = themeOf(t);
  const face = t.face && t.face !== T.face ? t.face : '';
  const mode = t.dark === true && !T.dark ? 'dark' : t.dark === false && T.dark ? 'light' : '';
  return [t.id, face, mode].filter(Boolean).join(' ');
}
export const isDark = (t: Theme) => t.dark ?? !!themeOf(t).dark;
export const faceOf = (t: Theme): Face => t.face ?? themeOf(t).face;

/* ---------- oklch ---------- */

export type Lch = [number, number, number];
type Rgb = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgbOf = (hex: string): Rgb => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255) as Rgb;

export function hexToLch(hex: string): Lch {
  const [r, g, b] = rgbOf(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
/** Linear sRGB of an oklch colour, unclamped (a channel past 0..1 is out of gamut). */
function lchToLinear([L, C, H]: Lch): Rgb {
  const A = C * Math.cos((H * Math.PI) / 180);
  const B = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const inGamut = (c: Lch) => lchToLinear(c).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
/** The colour with its chroma reduced until it is inside sRGB, as CSS maps a colour it cannot show. */
function mapped([L, C, H]: Lch): Lch {
  if (inGamut([L, C, H])) return [L, C, H];
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut([L, mid, H])) lo = mid;
    else hi = mid;
  }
  return [L, lo, H];
}
export function lchToHex(c: Lch): string {
  return '#' + lchToLinear(c).map((v) => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('');
}
const round = (c: Lch): Lch => [Math.round(c[0] * 1000) / 1000, Math.round(c[1] * 10000) / 10000, Math.round(c[2] * 10) / 10];
export const lchCss = ([l, c, h]: Lch) => `oklch(${l} ${c} ${h})`;

/** A shade's rule: its lightness, exactly or as a bound, and the most chroma it keeps, if capped. */
export interface Shade {
  l: number;
  at?: 'min' | 'max';
  c?: number;
}
export const SHADES: Record<'light' | 'dark', Record<'a' | 'tint' | 'deep', Shade>> = {
  light: { a: { l: 0.52, at: 'min' }, tint: { l: 0.96, c: 0.05 }, deep: { l: 0.4 } },
  dark: { a: { l: 0.75, at: 'max', c: 0.15 }, tint: { l: 0.28, c: 0.06 }, deep: { l: 0.85, c: 0.12 } },
};
export function shade(hex: string, s: Shade): Lch {
  const [L, C, H] = hexToLch(hex);
  const l = s.at === 'min' ? Math.min(L, s.l) : s.at === 'max' ? Math.max(L, s.l) : s.l;
  return round(mapped([l, s.c === undefined ? C : Math.min(C, s.c), H]));
}

/** Every colour a page of this theme uses: the three shades (oklch, and the same as hex), and the fixed ones. */
export interface Palette {
  a: Lch;
  tint: Lch;
  deep: Lch;
  hex: { a: string; tint: string; deep: string };
  on: string;
  bg: string;
  glass: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
}
export function paletteOf(t: Theme): Palette {
  const T = themeOf(t);
  const dark = isDark(t);
  const S = SHADES[dark ? 'dark' : 'light'];
  const a = shade(T.a, S.a);
  const tint = shade(T.a, S.tint);
  const deep = shade(T.a, S.deep);
  const hex = { a: lchToHex(a), tint: lchToHex(tint), deep: lchToHex(deep) };
  return dark
    ? { a, tint, deep, hex, on: '#18181b', bg: T.dark ? '#141418' : '#18181b', glass: 'rgba(20,20,24,.92)', ink: '#fafafa', ink2: '#d4d4d8', ink3: '#a1a1aa', line: '#3f3f46' }
    : { a, tint, deep, hex, on: '#ffffff', bg: t.id === 'paper' ? '#fffdf5' : '#ffffff', glass: 'rgba(255,255,255,.92)', ink: '#18181b', ink2: '#3f3f46', ink3: '#52525b', line: '#e4e4e7' };
}

/** The theme as CSS variables on :root, and the face. */
export function themeCss(t: Theme): string {
  const T = themeOf(t);
  const p = paletteOf(t);
  return `:root{--a:${lchCss(p.a)};--on:${p.on};--tint:${lchCss(p.tint)};--deep:${lchCss(p.deep)};--bg:${p.bg};--glass:${p.glass};--ink:${p.ink};--ink2:${p.ink2};--ink3:${p.ink3};--line:${p.line};--r:${T.round}rem;--font:${FONTS[faceOf(t)]}}body,h1,h2,h3,button,.btn{font-family:var(--font)}`;
}

/** WCAG contrast of two hex colours. */
export function contrast(x: string, y: string): number {
  const lum = (hex: string) => rgbOf(hex).map(toLinear).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const [a, b] = [lum(x), lum(y)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
