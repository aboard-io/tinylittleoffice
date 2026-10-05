/** Draw: what the shell knows about drawings. Format: lib/drawmodel.ts. */
import { defineApp, utf8, xml, pageSvg, INK, PAPER, SHADE, type Page } from '../kit/core.ts';
import { COLORS, paint, parseDrawing, W, H, type Shape } from '../lib/drawmodel.ts';

const x = xml;

function shapeSvg(s: Shape): string {
  const p = paint(s, INK, PAPER, SHADE);
  const isLine = s.k === 'l' || s.k === 'a';
  const look = `fill="${p.fill}"${p.fillOpacity < 1 ? ` fill-opacity="${p.fillOpacity}"` : ''} stroke="${p.stroke}" stroke-width="2"`;
  let body = '';
  if (s.k === 'r') body = `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="2" ${look}/>`;
  else if (s.k === 'e') body = `<ellipse cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w / 2}" ry="${s.h / 2}" ${look}/>`;
  else if (s.k === 'd') body = `<polygon points="${s.x + s.w / 2},${s.y} ${s.x + s.w},${s.y + s.h / 2} ${s.x + s.w / 2},${s.y + s.h} ${s.x},${s.y + s.h / 2}" ${look} stroke-linejoin="round"/>`;
  else if (isLine) {
    const dash = s.f === 1 ? ' stroke-dasharray="6 4"' : s.f === 2 ? ' stroke-dasharray="2 3"' : '';
    body = `<line x1="${s.x}" y1="${s.y}" x2="${s.x + s.w}" y2="${s.y + s.h}" stroke="${p.stroke}" stroke-width="2"${dash}${s.k === 'a' ? ` marker-end="url(#${p.marker})"` : ''}/>`;
  }
  if (!s.text) return body;
  const halo = isLine ? ` stroke="${PAPER}" stroke-width="4" paint-order="stroke"` : '';
  const at = s.k === 't' ? `x="${s.x + 4}" text-anchor="start"` : `x="${s.x + s.w / 2}" text-anchor="middle"`;
  return `${body}<text ${at} y="${s.y + s.h / 2}" dominant-baseline="middle"${p.px !== 14 ? ` font-size="${p.px}"` : ''} fill="${p.text}"${halo}>${x(s.text)}</text>`;
}

const ARROWS = [['arrow', INK], ...Object.entries(COLORS).map(([c, v]) => [`arrow-${c}`, v.hex])]
  .map(([id, fill]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${fill}"/></marker>`)
  .join('');

/** The drawing as a page; `upTo` shapes of it while it builds. */
export function drawingPage(body: string, upTo = Infinity): Page {
  return { w: W, h: H, svg: `<defs>${ARROWS}</defs><g font-size="14">${parseDrawing(body).slice(0, upTo).map(shapeSvg).join('')}</g>` };
}

export const drawingToSvg = (body: string) => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(drawingPage(body)) + '\n';

export default defineApp({
  id: 'draw',
  name: 'Draw',
  icon: 'draw',
  blurb: 'Boxes, ellipses, diamonds, lines, arrows and labels on a grid.',
  title: () => '',
  outline: (body) => parseDrawing(body).map((s) => s.text.trim()).filter(Boolean),
  view: (body, opts = {}) => [drawingPage(body, opts.step)],
  // A drawing on a slide appears one shape per click, in the order it was drawn.
  steps: (body) => parseDrawing(body).length,
  build: 'click',
  downloads: [{ ext: 'svg', label: 'SVG image', mime: 'image/svg+xml', build: (b) => utf8(drawingToSvg(b)) }],
  shortcuts: [
    { keys: 'V R E D L A T', does: 'Select, rectangle, ellipse, diamond, line, arrow, text' },
    { keys: 'Arrows', does: 'Nudge the selected shape' },
    { keys: 'Mod+D', does: 'Duplicate' },
    { keys: 'Delete', does: 'Delete the selected shape' },
  ],
});
