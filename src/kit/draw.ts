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
