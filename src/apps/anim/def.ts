/**
 * Motion: a drawing that moves. The document is Draw's table of shapes, the length and speed in the head,
 * and a table of keys (model.ts); the drawing at any moment, the self-playing SVG and the GIF's frames are
 * view.ts; the editor editor.ts. Draw hands a drawing over as it is ("Animate this drawing").
 */
import { Clapperboard } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp, isStill, type Doc } from '../../kit/app.ts';
import { pageSvg, utf8 } from '../../kit/draw.ts';
import { encodeGif, type GifFrame } from '../../kit/gif.ts';
import { t } from '../../kit/i18n.ts';
import { pixels } from '../../kit/raster.ts';
import { drawingText, H, W } from '../draw/model.ts';
import { gifLoop, readAnim } from './model.ts';
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
  templates: () => import('./templates.ts').then((m) => m.templates()),
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  // Where nothing can move, one frame: a thumbnail the first moment (something is on the stage then), print, a
  // PDF or a PNG the resting one (where a once-through ends). Anywhere else the motion plays, on its own or placed
  // in another document (`small`), repeating as its loop says.
  // Its alt and each layer's label, as a drawing's.
  text: (doc) => drawingText(readAnim(parse(doc)).draw),
  view: (doc, opts) => {
    const anim = readAnim(parse(doc));
    if (!isStill(opts)) return [animPage(anim)];
    return [{ w: W, h: H, svg: frameSvg(anim, opts?.thumb ? 0 : Math.max(0, anim.frames - 1)), alt: altOf(anim) }];
  },
  exports: [
    { ext: 'gif', label: () => t('Animated GIF'), mime: 'image/gif', shows: 'own', build: (doc) => animGif(doc) },
    { ext: 'svg', label: () => t('Animated SVG'), mime: 'image/svg+xml', shows: 'own', build: (doc) => utf8(animToSvg(parse(doc))) },
  ],
  commands: () => import('./commands.ts'),
});
