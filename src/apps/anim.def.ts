/** Motion: what the shell knows about a drawing that moves. Format: lib/animmodel.ts. */
import { defineApp, utf8, pageSvg, r, INK, type Page } from '../kit/core.ts';
import { W, H, bounds, describeDrawing, isLine, type Shape } from '../lib/drawmodel.ts';
import { parseAnim, readAnim, stateAt, depthScale, type Anim, type Key } from '../lib/animmodel.ts';
import { arrowDefs, shapeSvg, type Theme } from './draw.def.ts';

/** The transform that puts a shape where a key says, turning and growing about its centre. */
export function transformOf(s: Shape, all: Shape[], k: Key, frame = k.t): string {
  const [x, y, w, h] = bounds(s, all);
  const [cx, cy] = [x + w / 2, y + h / 2];
  const scale = k.s * depthScale(k.z);
  const spin = k.r + (k.fx.includes('w') ? (Math.floor(frame) % 2 ? 4 : -4) : 0);
  return `translate(${r(cx + k.dx)} ${r(cy + k.dy)}) rotate(${r(spin)}) scale(${r(k.fx.includes('m') ? -scale : scale)} ${r(scale)}) translate(${r(-cx)} ${r(-cy)})`;
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

/**
 * One shape, drawn with its effects, about the origin of the drawing (no
 * transform yet). `defs` collects anything the picture must define once.
 */
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

/** Shape numbers from the furthest to the nearest, so near things are drawn over far ones. */
export const drawOrder = (anim: Anim, frame: number) => anim.shapes.map((_, i) => i).sort((a, b) => stateAt(anim, a, frame).z - stateAt(anim, b, frame).z || a - b);

/** The stage at a frame, as the inside of an <svg>. The theme is the page's colours, for the editor. */
export function frameSvg(anim: Anim, frame: number, theme?: Theme): string {
  const defs = new Set<string>();
  const shapes = drawOrder(anim, frame)
    .map((i) => {
      const s = anim.shapes[i];
      const k = stateAt(anim, i, frame);
      const body = effectsSvg(k.pts && (s.k === 'v' || s.k === 'w') ? { ...s, pts: k.pts } : s, i, anim.shapes, k.fx, theme, defs);
      return body ? `<g transform="${transformOf(s, anim.shapes, k, frame)}">${body}</g>` : '';
    })
    .join('');
  return `<defs>${arrowDefs(theme?.ink)}${FX_DEFS}${[...defs].join('')}</defs>${shapes}`;
}

/**
 * The animation as a page that plays (SVG animates itself): each shape's
 * offset, spin and size are tweened between its keys, its effects held as
 * they are at the start. On its own it loops; shown in another document it
 * plays once and rests where it ends, which is also what a still of it (a
 * PDF, a picture) shows.
 */
export function animPage(anim: Anim, once = false): Page {
  const defs = new Set<string>();
  const last = anim.frames - 1;
  const dur = (last / anim.fps).toFixed(2);
  const shapes = drawOrder(anim, 0)
    .map((i) => {
      const s = anim.shapes[i];
      const keys = anim.keys[i] ?? [];
      const times = [...new Set([0, ...keys.map((k) => k.t), last])].sort((a, b) => a - b);
      const states = times.map((t) => stateAt(anim, i, t));
      const at = once ? states[states.length - 1] : states[0];
      const body = effectsSvg(s, i, anim.shapes, at.fx, undefined, defs);
      if (!body) return '';
      if (keys.length < 2) return `<g transform="${transformOf(s, anim.shapes, at)}">${body}</g>`;
      const [x, y, w, h] = bounds(s, anim.shapes);
      const [cx, cy] = [x + w / 2, y + h / 2];
      const keyTimes = times.map((t) => r(t / last)).join(';');
      const tween = (type: string, values: string) => `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${keyTimes}" dur="${dur}s" ${once ? 'repeatCount="1" fill="freeze"' : 'repeatCount="indefinite"'}/>`;
      const scale = (k: Key) => `${r((k.fx.includes('m') ? -1 : 1) * k.s * depthScale(k.z))} ${r(k.s * depthScale(k.z))}`;
      return (
        `<g transform="translate(${r(cx + at.dx)} ${r(cy + at.dy)})">${tween('translate', states.map((k) => `${r(cx + k.dx)} ${r(cy + k.dy)}`).join(';'))}` +
        `<g transform="rotate(${r(at.r)})">${tween('rotate', states.map((k) => r(k.r)).join(';'))}` +
        `<g transform="scale(${scale(at)})">${tween('scale', states.map(scale).join(';'))}` +
        `<g transform="translate(${r(-cx)} ${r(-cy)})">${body}</g></g></g></g>`
      );
    })
    .join('');
  return { w: W, h: H, svg: `<defs>${arrowDefs()}${FX_DEFS}${[...defs].join('')}</defs>${shapes}`, alt: anim.alt || describeDrawing(anim.shapes) };
}

export const animToSvg = (body: string) => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(animPage(parseAnim(body))) + '\n';

/** Every frame as a page, for the animated GIF. */
export function animFrames(body: string): { pages: Page[]; delayMs: number } {
  const anim = parseAnim(body);
  return { pages: Array.from({ length: anim.frames }, (_, f) => ({ w: W, h: H, svg: frameSvg(anim, f) })), delayMs: Math.round(1000 / anim.fps) };
}

export default defineApp({
  id: 'anim',
  group: 'Design',
  name: 'Motion',
  icon: 'anim',
  blurb: 'Anything from Draw, moving: position, depth, size and spin over time, with effects for memes.',
  title: () => '',
  read: readAnim,
  outline: (body) => [parseAnim(body).alt ?? '', ...parseAnim(body).shapes.map((s) => s.text.trim())].filter(Boolean),
  view: (body, opts = {}) => [animPage(parseAnim(body), opts.embed)],
  frames: animFrames,
  downloads: [{ ext: 'svg', label: 'Animated SVG', mime: 'image/svg+xml', build: (b) => utf8(animToSvg(b)) }],
  shortcuts: [
    { keys: 'Space', does: 'Play or pause' },
    { keys: 'Left / Right', does: 'A frame back or forward' },
    { keys: 'Home / End', does: 'The start or the end' },
    { keys: 'K', does: 'Add a key for the selected shape at this moment' },
    { keys: 'Mod+D', does: 'Duplicate the selected shape' },
    { keys: 'Delete', does: 'Delete the selected shape' },
  ],
});
