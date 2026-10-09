/**
 * Motion: a drawing that moves. The document is Draw's table of shapes, the length and speed in the head,
 * and a table of keys (model.ts); the drawing at any moment, the self-playing SVG and the GIF's frames are
 * view.ts; the editor editor.ts. Draw hands a drawing over as it is ("Animate this drawing").
 */
import { Clapperboard } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { pageSvg, utf8 } from '../../kit/draw.ts';
import { encodeGif, type GifFrame } from '../../kit/gif.ts';
import { t } from '../../kit/i18n.ts';
import { pixels } from '../../kit/raster.ts';
import { H, W } from '../draw/model.ts';
import { gifLoop, readAnim } from './model.ts';
import { templates } from './templates.ts';
import { altOf, animFrames, animPage, animToSvg, frameSvg } from './view.ts';

export const titleOf = (doc: Doc): string => parse(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/** The animated GIF: every frame of a round drawn in the browser, each held 1/fps of a second, repeating as the motion says. */
export async function animGif(doc: Doc): Promise<Uint8Array> {
  const { pages, delayMs, loop } = animFrames(parse(doc));
  const frames: GifFrame[] = [];
  for (const p of pages) {
    const px = await pixels(pageSvg(p), W, H);
    if (px) frames.push({ data: px, delayMs });
  }
  return encodeGif(W, H, frames, { loop: gifLoop(loop) });
}

export default defineApp({
  id: 'anim',
  get name() {
    return t('Animator');
  },
  get noun() {
    return t('animation');
  },
  get group() {
    return t('Design');
  },
  icon: Clapperboard,
  get blurb() {
    return t('Anything from the Drawing Tool, moving: position, depth, size, spin and turn over time, with effects for memes.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  // A thumbnail is the first moment, still; a page is the whole, playing once and resting where it ends.
  view: (doc, opts) => {
    const anim = readAnim(parse(doc));
    return [opts?.small ? { w: W, h: H, svg: frameSvg(anim, 0), alt: altOf(anim) } : animPage(anim, true)];
  },
  exports: [
    { ext: 'gif', label: () => t('Animated GIF'), mime: 'image/gif', build: (doc) => animGif(doc) },
    { ext: 'svg', label: () => t('Animated SVG'), mime: 'image/svg+xml', build: (doc) => utf8(animToSvg(parse(doc))) },
  ],
});
