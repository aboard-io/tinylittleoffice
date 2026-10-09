/**
 * Drawing a document's pages, with no DOM: what a definition's view() builds on, what the build and the
 * tests read under node. The colours and the font are the ones every page is drawn with; a page is SVG.
 */
import type { Page } from './app.ts';

export const xml = (s: string) =>
  s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const PAPER = '#ffffff';
export const INK = '#18181b';
export const MUTED = '#52525b';
export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** A page as a complete SVG document. */
export function pageSvg(p: Page, attrs = ''): string {
  const alt = p.alt ? xml(p.alt) : '';
  const a = alt ? `${attrs ? attrs + ' ' : ''}role="img" aria-label="${alt}"` : attrs;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}" font-family="${FONT}"${a ? ' ' + a : ''}>${alt ? `<title>${alt}</title>` : ''}<rect width="${p.w}" height="${p.h}" fill="${PAPER}"/>${p.svg}</svg>`;
}

/** Several pages as one tall one. */
export function stack(pages: Page[], gap = 16): Page {
  if (pages.length === 1) return pages[0];
  const w = Math.max(...pages.map((p) => p.w));
  let y = 0;
  let svg = '';
  for (const p of pages) {
    svg += `<svg x="${(w - p.w) / 2}" y="${y}" width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}"><rect width="${p.w}" height="${p.h}" fill="${PAPER}"/>${p.svg}</svg>`;
    y += p.h + gap;
  }
  return { w, h: y - gap, svg: `<rect width="${w}" height="${y - gap}" fill="#f4f4f5"/>` + svg };
}

/**
 * Words as a file name safe on every filesystem: letters and digits of any script, lowercased, joined by
 * hyphens; Latin letters lose their accents; nothing else, and never long.
 */
export function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/([A-Za-z])\p{M}+/gu, '$1')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/, '');
}

export const fileName = (title: string, fallback: string, ext: string) => `${slug(title) || fallback}.${ext}`;
export const utf8 = (s: string) => new TextEncoder().encode(s);

/* ---------- lines, shades and words on a page ---------- */

/** The lightest grey for words: 4.9:1 on white, which is enough to read. */
export const FAINT = '#6b7280';
export const LINE = '#d4d4d8';
export const SHADE = '#f4f4f5';
export const ACCENT = '#4f46e5';

export const r = (n: number) => String(Math.round(n * 100) / 100);
export const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;

/** Width of text in px, estimated: a page is drawn the same under node and in a browser. */
export const textWidth = (text: string, px: number, bold = false) => text.length * px * (bold ? 0.56 : 0.52);

/** Cut text to fit a width, with an ellipsis. */
export function clip(text: string, max: number, px: number, bold = false): string {
  if (textWidth(text, px, bold) <= max) return text;
  let t = text;
  while (t.length > 1 && textWidth(t + '…', px, bold) > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/**
 * Words wrapped to a width: the lines, broken between words; a word too long for a line (a web address,
 * say) is broken after a "/", ".", "-", "?", "&", "=" or "_" near the end of a piece, else where the line
 * runs out.
 */
export function wrapText(content: string, max: number, px: number, bold = false): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of content.split(/(?<= )/).flatMap((w) => breakWord(w, max, px, bold))) {
    if (cur && textWidth(cur + word.trimEnd(), px, bold) > max) {
      out.push(cur.trimEnd());
      cur = '';
    }
    cur += word;
  }
  if (cur.trim() || !out.length) out.push(cur.trimEnd());
  return out;
}
function breakWord(word: string, max: number, px: number, bold: boolean): string[] {
  if (max <= 0 || textWidth(word.trimEnd(), px, bold) <= max) return [word];
  const out: string[] = [];
  let rest = word;
  while (rest && textWidth(rest.trimEnd(), px, bold) > max) {
    let n = 1;
    while (n < rest.length && textWidth(rest.slice(0, n + 1), px, bold) <= max) n++;
    const soft = Math.max(...['/', '.', '-', '?', '&', '=', '_'].map((c) => rest.lastIndexOf(c, n - 1)));
    const at = soft >= Math.ceil(n * 0.66) ? soft + 1 : n;
    out.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest) out.push(rest);
  return out;
}

export interface TextStyle {
  px?: number;
  bold?: boolean;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
}

/** One line of words. y is the baseline. */
export function text(x: number, y: number, content: string, style: TextStyle = {}): string {
  const { px = 16, bold = false, fill = INK, anchor = 'start' } = style;
  return `<text x="${r(x)}" y="${r(y)}" font-size="${px}"${bold ? ' font-weight="700"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}" xml:space="preserve">${xml(content)}</text>`;
}

/* ---------- the palette ---------- */

/**
 * Colours in the order a series takes them: each a clear step from the last, whatever your eyes. Blue,
 * orange, green, purple and red are the Okabe–Ito colours, with lightness as well as hue between them.
 */
export const SERIES = ['#0072b2', '#d55e00', '#009e73', '#a05ca8', '#56b4e9', '#e8b400', '#b3261e', '#18181b'];

/**
 * Something besides colour, for charts: a pattern to lay over each series after the first, so bars and
 * slices can be told apart in black and white. The patterns, as SVG defs, and the fill that uses one.
 */
export function patternDefs(id = 'p'): string {
  const marks = ['', 'M0 0L6 6M-1 5L1 7M5 -1L7 1', 'M3 0V6', 'M0 3H6', 'M0 6L6 0M-1 1L1 -1M5 7L7 5', 'M3 3m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0', 'M0 0L6 6M0 6L6 0', 'M0 3H6M3 0V6'];
  return marks.map((d, i) => (d ? `<pattern id="${id}${i}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="${d}" stroke="#fff" stroke-width="1.2" fill="#fff" stroke-opacity="0.55" fill-opacity="0.55"/></pattern>` : '')).join('');
}
export const patternFill = (i: number, id = 'p') => (i % 8 ? `url(#${id}${i % 8})` : '');
