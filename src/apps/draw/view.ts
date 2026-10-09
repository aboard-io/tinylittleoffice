/**
 * A drawing drawn, with no DOM: each shape as SVG (ported from the old tree's draw.def.ts), the page of
 * them over its background tile, the pixel grid as a picture. What `def.ts` builds its pages and files on;
 * the editor draws its shapes with the same shapeSvg, in the page's own colours.
 */
import type { Page } from '../../kit/app.ts';
import { INK, PAPER, SHADE, clip, pageSvg, r, rect, textWidth, wrapText, xml } from '../../kit/draw.ts';
import { glyphNamed, iconNamed } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { TILE_INKS, tilePattern, type Tile } from '../../kit/tile.ts';
import type { Doc } from '../../doc/index.ts';
import { COLORS, H, W, describeDrawing, iconOf, isLine, isLink, linkEnds, paint, pairs, readDrawing, type DrawView, type Shape } from './model.ts';

export interface Theme {
  ink: string;
  paper: string;
  shade: string;
}
export const PRINT: Theme = { ink: INK, paper: PAPER, shade: SHADE };

/**
 * One shape as SVG. `all` is the drawing it belongs to (joins need to find their shapes). The editor draws
 * with the same function, passing the page's colours and asking for a fat invisible line to make thin ones
 * easy to hit.
 */
export function shapeSvg(s: Shape, all: Shape[] = [], th: Theme = PRINT, hit = false): string {
  const p = paint(s, th.ink, th.paper, th.shade);
  const look = `fill="${p.fill}"${p.fillOpacity < 1 ? ` fill-opacity="${p.fillOpacity}"` : ''} stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round"`;
  const { x: X, y: Y, w, h } = s;
  // Something to catch the pointer where a shape has no paint of its own.
  const hitBox = hit ? `<rect x="${X}" y="${Y}" width="${w}" height="${h}" fill="transparent"/>` : '';
  let body = '';
  let [tx, ty] = [X + w / 2, Y + h / 2];
  if (isLine(s.k)) {
    const ends = isLink(s.k) ? linkEnds(s, all) : ([X, Y, X + w, Y + h] as [number, number, number, number]);
    if (!ends) return '';
    const [x1, y1, x2, y2] = ends;
    [tx, ty] = [(x1 + x2) / 2, (y1 + y2) / 2];
    const dash = s.f === 1 ? ' stroke-dasharray="6 4"' : s.f === 2 ? ' stroke-dasharray="2 3"' : '';
    const at = `x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"`;
    body = (hit ? `<line ${at} stroke="transparent" stroke-width="14"/>` : '') + `<line ${at} stroke="${p.stroke}" stroke-width="2"${dash}${s.k === 'a' || s.k === 'k' ? ` marker-end="url(#${p.marker})"` : ''}/>`;
  } else if (s.k === 'r') body = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="2" ${look}/>`;
  else if (s.k === 'o') body = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" rx="${r(Math.min(h / 2, 18))}" ${look}/>`;
  else if (s.k === 'e') body = `<ellipse cx="${X + w / 2}" cy="${Y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${look}/>`;
  else if (s.k === 'd') body = `<polygon points="${X + w / 2},${Y} ${X + w},${Y + h / 2} ${X + w / 2},${Y + h} ${X},${Y + h / 2}" ${look}/>`;
  else if (s.k === 'h') {
    const i = Math.min(w * 0.22, h / 2);
    body = `<polygon points="${r(X + i)},${Y} ${r(X + w - i)},${Y} ${X + w},${Y + h / 2} ${r(X + w - i)},${Y + h} ${r(X + i)},${Y + h} ${X},${Y + h / 2}" ${look}/>`;
  } else if (s.k === 'p') {
    const i = Math.min(w * 0.2, 20);
    body = `<polygon points="${r(X + i)},${Y} ${X + w},${Y} ${r(X + w - i)},${Y + h} ${X},${Y + h}" ${look}/>`;
  } else if (s.k === 'v' || s.k === 'w') {
    // Any shape at all: its corners, as hundredths of its box; a stroke is the same corners as an open line.
    const pts = s.pts && s.pts.length >= 4 ? s.pts : [0, 0, 100, 0, 100, 100, 0, 100];
    const points = pairs(pts)
      .map(([px, py]) => `${r(X + (px / 100) * w)},${r(Y + (py / 100) * h)}`)
      .join(' ');
    const dash = s.f === 1 ? ' stroke-dasharray="6 4"' : s.f === 2 ? ' stroke-dasharray="2 3"' : '';
    body = s.k === 'v' ? `<polygon points="${points}" ${look}/>` : (hit ? `<polyline points="${points}" fill="none" stroke="transparent" stroke-width="14"/>` : '') + `<polyline points="${points}" fill="none" stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${dash}/>`;
  } else if (s.k === 'c') {
    // A cylinder: the classic database.
    const e = Math.min(h * 0.16, 12);
    body = `<path d="M${X} ${r(Y + e)}v${r(h - 2 * e)}a${w / 2} ${r(e)} 0 0 0 ${w} 0v${r(-(h - 2 * e))}" ${look}/><ellipse cx="${X + w / 2}" cy="${r(Y + e)}" rx="${w / 2}" ry="${r(e)}" ${look}/>`;
    ty += e / 2;
  } else if (s.k === 'n') {
    // A note, with its corner folded.
    const f = Math.min(14, w / 3, h / 3);
    body = `<path d="M${X} ${Y}h${r(w - f)}l${r(f)} ${r(f)}v${r(h - f)}h${-w}z" ${look}/><path d="M${r(X + w - f)} ${Y}v${r(f)}h${r(f)}" fill="none" stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round"/>`;
  } else if (s.k === 't') body = hitBox;
  if (s.k === 'i') {
    // An icon on its own: as large as its box allows.
    const size = Math.max(8, Math.min(Math.abs(w), Math.abs(h)));
    return hitBox + glyphNamed(s.text, X + (w - size) / 2, Y + (h - size) / 2, size, p.stroke);
  }
  if (!s.text) return body;
  const halo = isLine(s.k) || s.k === 'w' ? ` stroke="${th.paper}" stroke-width="4" paint-order="stroke"` : '';
  // ":rocket Launch" is an icon and then the words; "Name | Role" is two lines (a note may have more).
  const [icon, words] = iconOf(s.text);
  const parts = s.k === 't' ? [words] : words.split(' | ');
  const even = s.k === 'n';
  // The words wrap to the room inside the shape (less in a round or pointed one), and get smaller if they still do not fit; past that, the last line ends in "…".
  const inside = isLine(s.k) || s.k === 'w' ? Infinity : s.k === 'd' ? 0.55 : s.k === 'e' ? 0.72 : s.k === 'h' ? 0.8 : 1;
  const big = icon && iconNamed(icon) ? 1.35 : 0;
  const fit = (scale: number) => {
    const px = p.px * scale;
    const room = inside === Infinity ? Infinity : Math.max(24, w * inside - (s.k === 't' ? 8 : 16) - (big ? px * big + 6 : 0));
    const lines: { t: string; small: boolean; strong: boolean }[] = [];
    parts.forEach((part, i) => {
      const small = i > 0 && !even;
      const strong = !i && parts.length > 1 && !even;
      for (const line of room === Infinity ? [part] : wrapText(part, room, small ? px * 0.8 : px, strong)) lines.push({ t: line, small, strong });
    });
    return { px, lines, room };
  };
  let laid = fit(1);
  const tall = (l: typeof laid) => l.lines.length * l.px * 1.25;
  const height = isLine(s.k) || s.k === 't' || s.k === 'w' ? Infinity : h * (s.k === 'd' ? 0.6 : s.k === 'e' ? 0.8 : 1) - 6;
  for (let k = 0.9; tall(laid) > height && k >= 0.6; k -= 0.1) laid = fit(k);
  if (tall(laid) > height) {
    const keep = Math.max(1, Math.floor(height / (laid.px * 1.25)));
    const cut = laid.lines.slice(0, keep);
    const end = cut[keep - 1];
    cut[keep - 1] = { ...end, t: clip(end.t + '…', laid.room, end.small ? laid.px * 0.8 : laid.px, end.strong).replace(/……$/, '…') };
    laid = { ...laid, lines: cut };
  }
  const fs = laid.px;
  const lh = fs * 1.25;
  const mark = big ? fs * big : 0;
  const wide = Math.max(...laid.lines.map((l) => textWidth(l.t, l.small ? fs * 0.8 : fs, l.strong)));
  const left = s.k === 't';
  // Icon and words sit together, centred as one (or from the left edge, for plain text).
  const start = left ? X + 4 : tx - (wide + (mark ? mark + (words ? 6 : 0) : 0)) / 2;
  const textX = left ? start + (mark ? mark + 6 : 0) : tx + (mark ? (mark + 6) / 2 : 0);
  const anchor = left ? 'start' : 'middle';
  const top = ty - ((laid.lines.length - 1) * lh) / 2;
  const out = laid.lines
    .map((l, i) => `<text x="${r(textX)}" text-anchor="${anchor}" y="${r(top + i * lh)}" dominant-baseline="middle" font-size="${r(l.small ? fs * 0.8 : fs)}"${l.strong ? ' font-weight="600"' : ''} fill="${p.text}"${l.small ? ' fill-opacity="0.75"' : ''}${halo}>${xml(l.t)}</text>`)
    .join('');
  return body + (mark ? glyphNamed(icon, start, ty - mark / 2, mark, p.text) : '') + out;
}

/** The arrowheads a drawing may use, one per colour. */
export const arrowDefs = (ink: string = INK) =>
  [['arrow', ink], ...Object.entries(COLORS).map(([c, hex]) => [`arrow-${c}`, hex])].map(([id, fill]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker>`).join('');

/** The side of one repeat of a background tile on a page, in px. */
export const TILE_SIDE = 64;

/** Shapes as a page of any size, over a tile if there is one; `upTo` of them while it builds. Every diagram draws through here. */
export function shapesPage(shapes: Shape[], w = W, h = H, upTo = Infinity, tile: Tile | null = null): Page {
  const defs = `<defs>${arrowDefs()}${tile ? tilePattern(tile, 'tile', TILE_SIDE) : ''}</defs>`;
  const back = tile ? `<rect width="${w}" height="${h}" fill="url(#tile)"/>` : '';
  return { w, h, svg: `${defs}${back}<g>${shapes.map((s, i) => (i < upTo ? shapeSvg(s, shapes) : '')).join('')}</g>` };
}

/** The pixel grid as a picture, 480 px square; a square a hair wide so no seams show. */
export function pixelPage(v: DrawView): Page {
  const n = v.pixels.n;
  const c = 480 / n;
  let svg = '';
  v.pixels.rows.forEach((row, y) => {
    for (let x = 0; x < n; x++) if (TILE_INKS[row[x]]) svg += rect(x * c, y * c, c + 0.5, c + 0.5, TILE_INKS[row[x]]);
  });
  const filled = v.pixels.rows.join('').replace(/\./g, '').length;
  return { w: 480, h: 480, svg, alt: v.alt || t('Pixel art, {n} by {n}: {filled|one square filled|# squares filled}.', { n, filled }) };
}

/** The drawing's one page: in pixel mode the grid; else the shapes over their tile, with the alt text its author wrote, or a description from the shapes. */
export function drawingPage(doc: Doc, upTo = Infinity): Page {
  const v = readDrawing(doc);
  if (v.grid) return pixelPage(v);
  return { ...shapesPage(v.shapes, W, H, upTo, v.tile), alt: v.alt || describeDrawing(v.shapes) || t('An empty drawing') };
}

export const drawingToSvg = (doc: Doc) => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(drawingPage(doc)) + '\n';
