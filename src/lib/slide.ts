/**
 * Drawing a slide: where everything goes and how big the type is, so that
 * it all fits. A deck's slides and a printed page with a layout (lib/fold.ts)
 * are both laid out here, at their own size.
 */
import { wrap, text, place, r, ACCENT, MUTED, type Page, type Span } from '../kit/core.ts';
import { parseInline } from './richtext.ts';
import { refPage, refSteps } from '../kit/embed.ts';
import { ICON_SVG } from './icons.ts';
import { ICON_COLORS, type Slide } from './deckmodel.ts';

export const SW = 960;
export const SH = 600;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SlideLayout {
  /** Font sizes chosen so everything fits: bigger when there is less to say. */
  titlePx: number;
  bodyPx: number;
  title: Box & { lines: Span[][]; center: boolean };
  cols: (Box & { items: Span[][][]; depths: number[] })[];
  icon?: Box;
  sub?: Box;
}

export const live = (list: string[] = []) => list.filter((b) => b.trim() !== '');
/** How far in a bullet goes: two spaces (or a tab) a level, up to three levels. */
export const depthOf = (b: string) => Math.min(3, Math.floor(/^[ \t]*/.exec(b)![0].replace(/\t/g, '  ').length / 2));
const IN = 1.4;

/** Where everything on a slide goes, and how big the type is. */
/** The page a slide is laid on: a slide's 960 by 600 unless told otherwise; `loud` makes the type bigger (a poster), `prose` drops the bullet dots. */
export interface SlideSize {
  w?: number;
  h?: number;
  loud?: number;
  prose?: boolean;
}
export function layoutSlide(s: Slide, o: SlideSize = {}): SlideLayout {
  const SW = o.w ?? 960;
  const SH = o.h ?? 600;
  // Type and margins scale with the page's width; a tall page gets more rows, not bigger type.
  const k = (SW / 960) * (o.loud ?? 1);
  const M = 64 * k;
  const PAD = 20 * k;
  const sz = (list: number[]) => list.map((n) => n * k);
  // A document shown on a slide takes the whole slide: no headline, no bullets.
  if (s.sub) return { titlePx: 0, bodyPx: 0, title: { x: 0, y: 0, w: 0, h: 0, lines: [], center: false }, cols: [], sub: { x: PAD, y: PAD, w: SW - 2 * PAD, h: SH - 2 * PAD } };
  const kind = s.layout ?? '';
  const left = live(s.bullets);
  const right = kind === '2' ? live(s.right) : [];
  const fitTitle = (w: number, sizes: number[], maxLines: number) => {
    for (const px of sizes) {
      const lines = wrap(parseInline(s.title), w, px, true);
      if (lines.length <= maxLines) return { px, lines };
    }
    const px = sizes[sizes.length - 1];
    return { px, lines: wrap(parseInline(s.title), w, px, true).slice(0, maxLines) };
  };
  const fitBody = (cols: (Box & { src: string[] })[], sizes: number[], bullet: boolean) => {
    for (const px of sizes) {
      const laid = cols.map((c) => c.src.map((b) => wrap(parseInline(b.trim()), c.w - (bullet ? px * (1.1 + depthOf(b) * IN) : 0), px)));
      const tall = (items: Span[][][]) => items.reduce((a, l) => a + l.length * px * 1.3 + px * 0.45, 0);
      if (laid.every((items, i) => tall(items) <= cols[i].h) || px === sizes[sizes.length - 1]) return { px, cols: cols.map((c, i) => ({ x: c.x, y: c.y, w: c.w, h: c.h, items: laid[i], depths: c.src.map(depthOf) })) };
    }
    throw new Error('unreachable');
  };

  if (kind === 't') {
    const t = fitTitle(SW - 2 * M, sz([72, 64, 56, 48, 40, 34]), 2);
    const sub = fitBody([{ x: M, y: 0, w: SW - 2 * M, h: SH * 0.25 + (SH > SW ? SH * 0.25 : 0), src: left }], sz([30, 26, 22, 18]), false);
    const iconH = s.icon ? 112 * k : 0;
    const tall = iconH + t.lines.length * t.px * 1.15 + (left.length ? 24 + sub.cols[0].items.reduce((a, l) => a + l.length * sub.px * 1.3, 0) : 0);
    const top = (SH - tall) / 2;
    const ty = top + iconH;
    return {
      titlePx: t.px,
      bodyPx: sub.px,
      title: { x: M, y: ty, w: SW - 2 * M, h: t.lines.length * t.px * 1.15, lines: t.lines, center: true },
      cols: [{ ...sub.cols[0], y: ty + t.lines.length * t.px * 1.15 + 24 }],
      icon: s.icon ? { x: SW / 2 - 48 * k, y: top, w: 96 * k, h: 96 * k } : undefined,
    };
  }

  const headIcon = s.icon && kind !== 'i';
  const tx = M + (headIcon ? 88 * k : 0);
  const t = fitTitle(SW - M - tx, sz([46, 40, 34, 28]), 2);
  const headH = Math.max(headIcon ? 72 * k : 0, t.lines.length * t.px * 1.15);
  const top = M + headH + 28 * k;
  const bodyH = SH - top - 48 * k;
  const half = (SW - 2 * M - 40 * k) / 2;
  const split = kind === 'i' || kind === '2';
  const colsIn: (Box & { src: string[] })[] = [{ x: M, y: top, w: split ? half : SW - 2 * M, h: bodyH, src: left }];
  if (kind === '2') colsIn.push({ x: M + half + 40 * k, y: top, w: half, h: bodyH, src: right });
  const body = fitBody(colsIn, sz([34, 30, 26, 23, 20, 18, 16, 14]), !o.prose);
  const sideBox: Box = { x: M + half + 40 * k, y: top, w: half, h: bodyH };
  return {
    titlePx: t.px,
    bodyPx: body.px,
    title: { x: tx, y: M + (headH - t.lines.length * t.px * 1.15) / 2, w: SW - M - tx, h: headH, lines: t.lines, center: false },
    cols: body.cols,
    icon: headIcon ? { x: M, y: M + (headH - 72 * k) / 2, w: 72 * k, h: 72 * k } : kind === 'i' && s.icon ? { x: sideBox.x + (sideBox.w - 260 * k) / 2, y: sideBox.y + (sideBox.h - 260 * k) / 2, w: 260 * k, h: 260 * k } : undefined,
  };
}

/**
 * What a slide reveals, a click at a time: its bullets, or, when a document
 * has the slide, whatever that document is made of (shapes, rows, stops).
 */
export function slideSteps(s: Slide): { bullets: number; sub: number } {
  if (s.sub) return { bullets: 0, sub: refSteps(s.sub) };
  return { bullets: s.layout === 't' ? 0 : live(s.bullets).length + (s.layout === '2' ? live(s.right).length : 0), sub: 0 };
}

const iconAt = (name: string, b: Box, color = ACCENT) =>
  ICON_SVG[name] ? `<g transform="translate(${r(b.x)} ${r(b.y)}) scale(${r(b.w / 24)})" fill="none" stroke="${color}" stroke-width="${b.w > 150 ? 1.5 : 2}" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[name]}</g>` : '';

/**
 * A slide as a page. `bullets` and `sub` say how much has been revealed
 * (absent: everything). Unrevealed things keep their place, so nothing
 * moves as the slide builds.
 */
export function slidePage(s: Slide, bullets = Infinity, sub?: number, tint = '', o: SlideSize = {}): Page {
  const SW = o.w ?? 960;
  const SH = o.h ?? 600;
  const L = layoutSlide(s, o);
  const cover = s.layout === 't';
  const dots = !cover && !o.prose;
  let svg = L.icon ? iconAt(s.icon, L.icon, ICON_COLORS[tint]?.hex) : '';
  L.title.lines.forEach((line, i) => (svg += text(L.title.center ? SW / 2 : L.title.x, L.title.y + L.titlePx * (0.95 + i * 1.15), line, { px: L.titlePx, bold: true, anchor: L.title.center ? 'middle' : 'start' })));
  let n = 0;
  for (const col of L.cols) {
    let y = col.y;
    col.items.forEach((item, k) => {
      const d = col.depths[k] ?? 0;
      const x = col.x + L.bodyPx * d * IN;
      if (cover || n < bullets) {
        // A deeper bullet steps in, with a smaller, hollow dot.
        if (dots) svg += `<circle cx="${r(x + L.bodyPx * 0.35)}" cy="${r(y + L.bodyPx * 0.68)}" r="${r(L.bodyPx * (d ? 0.12 : 0.16))}" fill="${d ? 'none' : ACCENT}"${d ? ` stroke="${ACCENT}" stroke-width="2"` : ''}/>`;
        item.forEach((line, i) => (svg += text(cover ? SW / 2 : x + (dots ? L.bodyPx * 1.1 : 0), y + L.bodyPx + i * L.bodyPx * 1.3, line, { px: L.bodyPx, fill: cover ? MUTED : undefined, anchor: cover ? 'middle' : 'start' })));
      }
      n++;
      y += item.length * L.bodyPx * 1.3 + L.bodyPx * (cover ? 0 : 0.45);
    });
  }
  if (L.sub && s.sub) svg += `<g data-sub="${r(L.sub.x)},${r(L.sub.y)},${r(L.sub.w)},${r(L.sub.h)}">${place(refPage(s.sub, sub === undefined ? {} : { step: sub }), L.sub.x, L.sub.y, L.sub.w, L.sub.h)}</g>`;
  return { w: SW, h: SH, svg };
}

