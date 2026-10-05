/** Draw: what the shell knows about drawings. Format: lib/drawmodel.ts. */
import { defineApp, utf8, xml, pageSvg, r, INK, PAPER, SHADE, type Page } from '../kit/core.ts';
import { COLORS, iconOf, isLine, isLink, linkEnds, paint, parseDrawing, W, H, type Shape } from '../lib/drawmodel.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { textWidth } from '../kit/core.ts';

const x = xml;

export interface Theme {
  ink: string;
  paper: string;
  shade: string;
}
const PRINT: Theme = { ink: INK, paper: PAPER, shade: SHADE };

/**
 * One shape as SVG. `all` is the drawing it belongs to (joins need to find
 * their shapes). The editor draws with the same function, passing the
 * page's colours and asking for a fat invisible line to make thin ones easy
 * to hit.
 */
export function shapeSvg(s: Shape, all: Shape[] = [], t: Theme = PRINT, hit = false): string {
  const p = paint(s, t.ink, t.paper, t.shade);
  const look = `fill="${p.fill}"${p.fillOpacity < 1 ? ` fill-opacity="${p.fillOpacity}"` : ''} stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round"`;
  const { x: X, y: Y, w, h } = s;
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
  } else if (s.k === 'c') {
    // A cylinder: the classic database.
    const e = Math.min(h * 0.16, 12);
    body = `<path d="M${X} ${r(Y + e)}v${r(h - 2 * e)}a${w / 2} ${r(e)} 0 0 0 ${w} 0v${r(-(h - 2 * e))}" ${look}/><ellipse cx="${X + w / 2}" cy="${r(Y + e)}" rx="${w / 2}" ry="${r(e)}" ${look}/>`;
    ty += e / 2;
  } else if (s.k === 'n') {
    // A note, with its corner folded.
    const f = Math.min(14, w / 3, h / 3);
    body = `<path d="M${X} ${Y}h${r(w - f)}l${r(f)} ${r(f)}v${r(h - f)}h${-w}z" ${look}/><path d="M${r(X + w - f)} ${Y}v${r(f)}h${r(f)}" fill="none" stroke="${p.stroke}" stroke-width="2" stroke-linejoin="round"/>`;
  } else if (s.k === 't' && hit) body = `<rect x="${X}" y="${Y}" width="${w}" height="${h}" fill="transparent"/>`;
  const glyph = (name: string, gx: number, gy: number, size: number, color: string) =>
    ICON_SVG[name] ? `<g transform="translate(${r(gx)} ${r(gy)}) scale(${r(size / 24)})" fill="none" stroke="${color}" stroke-width="${size > 40 ? 1.6 : 2}" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[name]}</g>` : '';
  if (s.k === 'i') {
    // An icon on its own: as large as its box allows.
    const size = Math.max(8, Math.min(Math.abs(w), Math.abs(h)));
    return (hit ? `<rect x="${X}" y="${Y}" width="${w}" height="${h}" fill="transparent"/>` : '') + glyph(s.text, X + (w - size) / 2, Y + (h - size) / 2, size, p.stroke);
  }
  if (!s.text) return body;
  const halo = isLine(s.k) ? ` stroke="${t.paper}" stroke-width="4" paint-order="stroke"` : '';
  // ":rocket Launch" is an icon and then the words; "Name | Role" is two lines (a note may have more).
  const [icon, words] = iconOf(s.text);
  const lines = s.k === 't' ? [words] : words.split(' | ');
  const even = s.k === 'n';
  const lh = p.px * 1.25;
  const mark = icon && ICON_SVG[icon] ? p.px * 1.35 : 0;
  const wide = Math.max(...lines.map((l, i) => textWidth(l, i && !even ? p.px * 0.8 : p.px, !i && lines.length > 1 && !even)));
  const left = s.k === 't';
  // Icon and words sit together, centred as one (or from the left edge, for plain text).
  const start = left ? X + 4 : tx - (wide + (mark ? mark + (words ? 6 : 0) : 0)) / 2;
  const textX = left ? start + (mark ? mark + 6 : 0) : tx + (mark ? (mark + 6) / 2 : 0);
  const anchor = left ? 'start' : 'middle';
  const top = ty - ((lines.length - 1) * lh) / 2;
  const out = lines
    .map((l, i) => {
      const small = i > 0 && !even;
      const weight = lines.length > 1 && !even && i === 0 ? ';font-weight:600' : '';
      return `<text x="${r(textX)}" text-anchor="${anchor}" y="${r(top + i * lh)}" dominant-baseline="middle" style="font-size:${small ? Math.round(p.px * 0.8) : p.px}px${weight}" fill="${p.text}"${small ? ' fill-opacity="0.75"' : ''}${halo}>${x(l)}</text>`;
    })
    .join('');
  return body + (mark ? glyph(icon, start, ty - mark / 2, mark, p.text) : '') + out;
}

/** The arrowheads a drawing may use, one per colour. */
export const arrowDefs = (ink: string = INK) =>
  [['arrow', ink], ...Object.entries(COLORS).map(([c, v]) => [`arrow-${c}`, v.hex])]
  .map(([id, fill]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker>`)
  .join('');

/**
 * Shapes as a page of any size; `upTo` of them while it builds. Every
 * diagram app draws through here.
 */
export function shapesPage(shapes: Shape[], w = W, h = H, upTo = Infinity): Page {
  return { w, h, svg: `<defs>${arrowDefs()}</defs><g>${shapes.map((s, i) => (i < upTo ? shapeSvg(s, shapes) : '')).join('')}</g>` };
}

export const drawingPage = (body: string, upTo = Infinity) => shapesPage(parseDrawing(body), W, H, upTo);

export const drawingToSvg = (body: string) => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(drawingPage(body)) + '\n';

export default defineApp({
  id: 'draw',
  group: 'Visualization',
  name: 'Draw',
  icon: 'draw',
  blurb: 'Boxes, ellipses, diamonds, lines, arrows and labels on a grid.',
  title: () => '',
  outline: (body) => parseDrawing(body).map((s) => s.text.trim()).filter(Boolean),
  view: (body, opts = {}) => [drawingPage(body, opts.step)],
  // A drawing on a slide appears one shape per click, in the order it was drawn.
  steps: (body) => parseDrawing(body).length,
  downloads: [{ ext: 'svg', label: 'SVG image', mime: 'image/svg+xml', build: (b) => utf8(drawingToSvg(b)) }],
  shortcuts: [
    { keys: 'V R E D L A T', does: 'Select, rectangle, ellipse, diamond, line, arrow, text' },
    { keys: 'K', does: 'Join two shapes: press on one, let go on the other' },
    { keys: 'Ctrl + wheel', does: 'Zoom in and out' },
    { keys: 'Arrows', does: 'Nudge the selected shape' },
    { keys: 'Mod+D', does: 'Duplicate' },
    { keys: 'Delete', does: 'Delete the selected shape' },
  ],
});
