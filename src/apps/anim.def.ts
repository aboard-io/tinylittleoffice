/** Motion: what the shell knows about animations. Format: lib/animmodel.ts. */
import { defineApp, utf8, xml, pageSvg, INK, type Page } from '../kit/core.ts';
import { ICON_SVG } from '../lib/icons.ts';
import { parseAnim, stateAt, FPS, W as STAGE_W, H as STAGE_H, type Item } from '../lib/animmodel.ts';

const x = xml;

/** One item drawn about the origin, as the editor and the SVG view both show it. */
export function animItemSvg(item: Item): string {
  if (item.kind === 't') return `<text text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="600" fill="${INK}">${x(item.value)}</text>`;
  return `<g transform="translate(-24 -24) scale(2)" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[item.value] ?? '<circle cx="12" cy="12" r="9"/>'}</g>`;
}

/**
 * The animation as a page that plays (SVG animates itself). On its own it
 * loops; shown in another document it plays once and stays where it ended.
 */
export function animPage(body: string, once = false): Page {
  const anim = parseAnim(body);
  const last = anim.frames - 1;
  const dur = (last / FPS).toFixed(2);
  const n = (v: number) => String(Math.round(v * 100) / 100);
  const items = anim.items.map((it) => {
    const frames = [...new Set([0, ...it.keys.map((k) => k.t), last])].sort((a, b) => a - b);
    const states = frames.map((f) => stateAt(it, f));
    const first = states[0];
    const shape = animItemSvg(it);
    if (it.keys.length < 2) return `<g transform="translate(${n(first.x)} ${n(first.y)}) scale(${n(first.s)})">${shape}</g>`;
    const times = frames.map((f) => n(f / last)).join(';');
    const tween = (type: string, values: string) => `<animateTransform attributeName="transform" type="${type}" values="${values}" keyTimes="${times}" dur="${dur}s" ${once ? 'repeatCount="1" fill="freeze"' : 'repeatCount="indefinite"'}/>`;
    return `<g transform="translate(${n(first.x)} ${n(first.y)})">${tween('translate', states.map((k) => `${n(k.x)} ${n(k.y)}`).join(';'))}<g transform="scale(${n(first.s)})">${tween('scale', states.map((k) => n(k.s)).join(';'))}${shape}</g></g>`;
  });
  return { w: STAGE_W, h: STAGE_H, svg: items.join('') };
}

export const animToSvg = (body: string) => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(animPage(body)) + '\n';

export default defineApp({
  id: 'anim',
  group: 'Visualization',
  name: 'Motion',
  icon: 'anim',
  blurb: 'Icons and text that move between the moments you set.',
  title: () => '',
  outline: (body) => parseAnim(body).items.map((it) => it.value.trim()).filter(Boolean),
  view: (body, opts = {}) => [animPage(body, opts.embed)],
  downloads: [{ ext: 'svg', label: 'Animated SVG', mime: 'image/svg+xml', build: (b) => utf8(animToSvg(b)) }],
  shortcuts: [
    { keys: 'Space', does: 'Play or stop' },
    { keys: 'Left / Right', does: 'Step back or forward in time' },
    { keys: 'Delete', does: 'Delete the selected thing' },
  ],
});
