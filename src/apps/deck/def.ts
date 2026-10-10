/**
 * Deck: slides, and the printed things that are slides with another page (zine, booklet, brochure, comic,
 * poster, name badges), chosen by the head's "format:". The document is TLO, a slide between rules
 * (model.ts); the drawing, the layout, the folds and the player page are view.ts; PowerPoint is pptx.ts;
 * the editor editor.ts. Exports: .pptx, the deck as a web page that plays itself, a picture of every slide,
 * a film of the deck (GIF), and the kit's print (the sheets, for a fold) and text.
 */
import { Presentation } from 'lucide';
import { defineApp, isStill } from '../../kit/app.ts';
import { pageSvg } from '../../kit/draw.ts';
import { encodeGif, type GifFrame } from '../../kit/gif.ts';
import { t } from '../../kit/i18n.ts';
import { pixels, raster } from '../../kit/raster.ts';
import { zip } from '../../kit/zip.ts';
import { retitle, titleOf } from './model.ts';
import { buildPptx } from './pptx.ts';
import { templates } from './templates.ts';
import { deckFrames, deckPages, deckToHtml } from './view.ts';

/** How long each frame of the film stays: a slide, then each line as it is revealed. */
const FRAME_MS = 1400;

export default defineApp({
  id: 'deck',
  get name() {
    return t('Presentation Builder');
  },
  get noun() {
    return t('presentation');
  },
  get group() {
    return t('Slides');
  },
  icon: Presentation,
  get blurb() {
    return t('Slides: titles, bullets, two columns, big icons, other documents on a slide; or a zine, booklet, brochure, comic, poster or name badges to print and fold.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => deckPages(doc, opts?.small, isStill(opts)),
  exports: [
    { ext: 'pptx', label: () => t('PowerPoint (PPTX)'), mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', build: (doc, ctx) => buildPptx(doc, ctx) },
    // In place of the kit's pictures of the pages: a page that plays the deck, a slide at a time, with its transition.
    { ext: 'html', label: () => t('Web page (HTML)'), mime: 'text/html', build: (doc, ctx) => deckToHtml(doc, ctx.title || titleOf(doc) || t('Untitled {noun}', { noun: t('presentation') }), ctx.link) },
    {
      ext: 'zip',
      label: () => t('A picture of every slide (ZIP of PNGs)'),
      mime: 'application/zip',
      build: async (doc) => {
        const files: Record<string, Uint8Array> = {};
        const pages = deckPages(doc, false, true);
        for (const [i, p] of pages.entries()) {
          const png = await raster(pageSvg(p), p.w, p.h, 2);
          if (png) files[`slide-${String(i + 1).padStart(2, '0')}.png`] = png;
        }
        return zip(files);
      },
    },
    {
      ext: 'gif',
      label: () => t('A film of the deck (GIF)'),
      mime: 'image/gif',
      build: async (doc) => {
        const frames: GifFrame[] = [];
        const pages = deckFrames(doc);
        const w = 960;
        const h = Math.round((w * pages[0].h) / pages[0].w);
        for (const p of pages) {
          const px = await pixels(pageSvg(p), w, h);
          if (px) frames.push({ data: px, delayMs: FRAME_MS });
        }
        return encodeGif(w, h, frames);
      },
    },
  ],
  keys: [
    { keys: 'Mod+Alt+Enter', does: () => t('Present') },
    { keys: 'Mod+Shift+Enter', does: () => t('A new slide') },
    { keys: 'PageUp / PageDown', does: () => t('The slide before, the slide after (on the rail)') },
    { keys: 'ArrowRight / Space', does: () => t('Presenting: the next line or slide') },
    { keys: 'ArrowLeft', does: () => t('Presenting: back') },
    { keys: 'Escape', does: () => t('Stop presenting') },
  ],
});
