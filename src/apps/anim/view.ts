/**
 * Motion drawn, with no DOM (ported from the old tree's anim.def.ts): a shape with its effects, the stage at
 * any frame, the whole as an SVG that plays itself, and every frame as a page for the GIF. Shapes are drawn
 * by Draw's own shapeSvg, so a drawing looks the same moving as still.
 */
import type { Page } from '../../kit/app.ts';
import { INK, pageSvg, r } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { tilePattern } from '../../kit/tile.ts';
import type { Doc } from '../../doc/index.ts';
import { H, W, bounds, describeDrawing, isLine, type Shape } from '../draw/model.ts';
import { TILE_SIDE, arrowDefs, shapeSvg, type Theme } from '../draw/view.ts';
import { depthDim, frameOrder, readAnim, stateAt, turnScale, type AnimView, type Key, type Loop } from './model.ts';

/** How wide and how tall a key draws a shape: its size, squeezed across by its turn, mirrored by the Mirror effect. Depth never sizes it. */
const scaleOf = (k: Key): [number, number] => [(k.fx.includes('m') ? -1 : 1) * k.s * turnScale(k.u), k.s];

/** The transform that puts a shape where a key says, spinning, sizing and turning it about its centre. */
export function transformOf(s: Shape, all: Shape[], k: Key, frame = k.t): string {
  const [x, y, w, h] = bounds(s, all);
  const [cx, cy] = [x + w / 2, y + h / 2];
  const [sx, sy] = scaleOf(k);
  const spin = k.r + (k.fx.includes('w') ? (Math.floor(frame) % 2 ? 4 : -4) : 0);
  return `translate(${r(cx + k.dx)} ${r(cy + k.dy)}) rotate(${r(spin)}) scale(${r(sx)} ${r(sy)}) translate(${r(-cx)} ${r(-cy)})`;
}

/** The filters the effects use, once per picture; those that spread reach past the edge of the stage. */
const WIDE = `filterUnits="userSpaceOnUse" x="-100" y="-100" width="${W + 200}" height="${H + 200}"`;
const FX_DEFS =
  `<filter id="fx-d" ${WIDE}><feDropShadow dx="4" dy="5" stdDeviation="3" flood-opacity="0.45"/></filter>` +
  `<filter id="fx-n" ${WIDE}><feGaussianBlur stdDeviation="6" result="b"/><feComponentTransfer in="b" result="g"><feFuncA type="linear" slope="2.5"/></feComponentTransfer><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
  `<filter id="fx-b" ${WIDE}><feGaussianBlur stdDeviation="3"/></filter>` +
  `<filter id="fx-dark"><feColorMatrix type="matrix" values="0.4 0 0 0 0 0 0.4 0 0 0 0 0 0.4 0 0 0 0 0 1 0"/></filter>`;

const RAINBOW = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
const rainbowDef = (id: string, x1: number, y1: number, x2: number, y2: number) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}">${RAINBOW.map((c, i) => `<stop offset="${r((i / (RAINBOW.length - 1)) * 100)}%" stop-color="${c}"/>`).join('')}</linearGradient>`;

/** Impact: the words shouted. (The icon, if any, keeps its name.) */
const shout = (s: Shape): Shape => {
  const m = /^(:[a-z0-9-]+\s*)?(.*)$/s.exec(s.text)!;
  return s.k === 'i' ? s : { ...s, text: (m[1] ?? '') + m[2].toUpperCase() };
};

/** One shape, drawn with its effects, about the origin of the drawing (no transform yet). `defs` collects what the picture must define once. */
export function effectsSvg(s: Shape, i: number, all: Shape[], fx: string, theme?: Theme, defs?: Set<string>): string {
  const has = (l: string) => fx.includes(l);
  let body = shapeSvg(has('i') ? shout(s) : s, all, theme);
  if (!body) return '';
  if (has('i')) body = body.replace(/(<text[^>]*?) fill="[^"]*"/g, '$1 fill="#fff"');
  if (has('g')) {
    const [x, y, w, h] = bounds(s, all);
    const id = `fx-g${i}`;
    defs?.add(w ? rainbowDef(id, x, y, x + w, y) : rainbowDef(id, x, y, x, y + h));
    const paint = isLine(s.k) || s.k === 'i' ? /stroke="(?!none|transparent)[^"]*"/g : /fill="(?!none|transparent)[^"]*"/g;
    body = body.replace(paint, (m) => `${m.split('=')[0]}="url(#${id})"`);
  }
  if (has('i') || has('o')) body = `<g stroke="${INK}" stroke-width="${has('i') ? 4 : 3}" stroke-linejoin="round" paint-order="stroke"${has('i') ? ' font-weight="800"' : ''}>${body}</g>`;
  if (has('3')) body = `<g filter="url(#fx-dark)">${[6, 5, 4, 3, 2, 1].map((k) => `<g transform="translate(${k} ${k})">${body}</g>`).join('')}</g>${body}`;
  if (has('d')) body = `<g filter="url(#fx-d)">${body}</g>`;
  if (has('n')) body = `<g filter="url(#fx-n)">${body}</g>`;
  if (has('b')) body = `<g filter="url(#fx-b)">${body}</g>`;
  return body;
}

/** Shape numbers from the furthest to the nearest, so near things are drawn over far ones (depth is the order, not the size). */
export const drawOrder = (anim: AnimView, frame: number) => anim.shapes.map((_, i) => i).sort((a, b) => stateAt(anim, a, frame).z - stateAt(anim, b, frame).z || a - b);

/** The background tile the drawing carries, as defs and a rect; '' for none. */
const back = (anim: AnimView) => (anim.draw.tile ? { defs: tilePattern(anim.draw.tile, 'tile', TILE_SIDE), rect: `<rect width="${W}" height="${H}" fill="url(#tile)"/>` } : { defs: '', rect: '' });

/** The stage at a frame, as the inside of an <svg>. The theme is the page's colours, for the editor. */
export function frameSvg(anim: AnimView, frame: number, theme?: Theme): string {
  const defs = new Set<string>();
  const shapes = drawOrder(anim, frame)
    .map((i) => {
      const s = anim.shapes[i];
      const k = stateAt(anim, i, frame);
      const body = effectsSvg(k.pts && (s.k === 'v' || s.k === 'w') ? { ...s, pts: k.pts } : s, i, anim.shapes, k.fx, theme, defs);
      const dim = depthDim(k.z);
      return body ? `<g transform="${transformOf(s, anim.shapes, k, frame)}"${dim < 1 ? ` opacity="${dim}"` : ''}>${body}</g>` : '';
    })
    .join('');
  const b = back(anim);
  return `<defs>${arrowDefs(theme?.ink)}${FX_DEFS}${b.defs}${[...defs].join('')}</defs>${b.rect}${shapes}`;
}

/** What the motion shows, in words. */
export const altOf = (anim: AnimView) => anim.alt || describeDrawing(anim.shapes) || t('An empty stage');

/** How a self-playing SVG repeats: SMIL's repeatCount, and whether it rests where it ends. */
const repeatOf = (loop: Loop): string => (loop === 'forever' || loop === 'bounce' ? 'repeatCount="indefinite"' : `repeatCount="${loop === 'once' ? 1 : loop}" fill="freeze"`);

/**
 * The motion as a page that plays (SVG animates itself): each shape's offset, spin, size, turn and depth's dimming
 * tweened between its keys, its effects held as they are at the start. It repeats as the motion says (for ever, a
 * number of times, or forward and back); `once`, it plays once and rests where it ends, which is also what a still of
 * it (print, a picture) shows. A shape that turns is sampled every frame (a turn's squeeze is no straight line).
 */
export function animPage(anim: AnimView, once = false): Page {
  const defs = new Set<string>();
  const last = Math.max(1, anim.frames - 1);
  const loop: Loop = once ? 'once' : anim.loop;
  const bounce = loop === 'bounce';
  const span = bounce ? 2 * last : last;
  const dur = (span / anim.fps).toFixed(2);
  const repeat = repeatOf(loop);
  const shapes = drawOrder(anim, once ? anim.frames - 1 : 0)
    .map((i) => {
      const s = anim.shapes[i];
      const keys = anim.keys[i] ?? [];
      const turns = keys.some((k) => k.u);
      const ahead = turns ? frameOrder(anim.frames, 'forever') : [...new Set([0, ...keys.map((k) => k.t), last])].sort((a, b) => a - b);
      // Bounce: the same moments again, backwards, on the second half of the time.
      const times = bounce ? [...ahead, ...ahead.slice(0, -1).reverse().map((tm) => 2 * last - tm)] : ahead;
      const states = times.map((tm) => stateAt(anim, i, tm > last ? 2 * last - tm : tm));
      const at = once ? states[states.length - 1] : states[0];
      const body = effectsSvg(s, i, anim.shapes, at.fx, undefined, defs);
      if (!body) return '';
      const dim = (k: Key) => depthDim(k.z);
      const still = (k: Key) => (dim(k) < 1 ? ` opacity="${dim(k)}"` : '');
      if (keys.length < 2) return `<g transform="${transformOf(s, anim.shapes, at)}"${still(at)}>${body}</g>`;
      const [x, y, w, h] = bounds(s, anim.shapes);
      const [cx, cy] = [x + w / 2, y + h / 2];
      const keyTimes = times.map((tm) => r(tm / span)).join(';');
      const tween = (type: string, values: string) => `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${keyTimes}" dur="${dur}s" ${repeat}/>`;
      const scale = (k: Key) => scaleOf(k).map(r).join(' ');
      const fade = states.some((k) => dim(k) < 1) ? `<animate attributeName="opacity" values="${states.map(dim).join(';')}" keyTimes="${keyTimes}" dur="${dur}s" ${repeat}/>` : '';
      return (
        `<g transform="translate(${r(cx + at.dx)} ${r(cy + at.dy)})"${still(at)}>${fade}${tween('translate', states.map((k) => `${r(cx + k.dx)} ${r(cy + k.dy)}`).join(';'))}` +
        `<g transform="rotate(${r(at.r)})">${tween('rotate', states.map((k) => r(k.r)).join(';'))}` +
        `<g transform="scale(${scale(at)})">${tween('scale', states.map(scale).join(';'))}` +
        `<g transform="translate(${r(-cx)} ${r(-cy)})">${body}</g></g></g></g>`
      );
    })
    .join('');
  const b = back(anim);
  return { w: W, h: H, svg: `<defs>${arrowDefs()}${FX_DEFS}${b.defs}${[...defs].join('')}</defs>${b.rect}${shapes}`, alt: altOf(anim) };
}

/** The animated SVG file. */
export const animToSvg = (doc: Doc) => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(animPage(readAnim(doc))) + '\n';

/** Every frame of one round as a page, for the GIF, in the order they show (bounce: there and back); how long each stays; and how it repeats. */
export function animFrames(doc: Doc): { pages: Page[]; delayMs: number; loop: Loop } {
  const anim = readAnim(doc);
  return { pages: frameOrder(anim.frames, anim.loop).map((f) => ({ w: W, h: H, svg: frameSvg(anim, f) })), delayMs: Math.round(1000 / anim.fps), loop: anim.loop };
}
