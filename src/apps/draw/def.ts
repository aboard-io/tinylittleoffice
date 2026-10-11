/**
 * Draw: boxes, ellipses, diamonds, lines, arrows, icons and labels on a grid, and pixel art as a grid mode.
 * The document is a table, a row per shape, the alt text in the head (model.ts); the drawing is view.ts;
 * the editor editor.ts. A pixel grid can become a repeating background tile (kit/tile.ts) for this drawing
 * or any page.
 */
import { PenTool } from 'lucide';
import { apply, parse, write, type Doc as Kernel } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { drawn, raster } from '../../kit/raster.ts';
import { blankTile, tileSvg, type Tile } from '../../kit/tile.ts';
import { readDrawing } from './model.ts';
import { drawingPage, drawingToSvg } from './view.ts';

const headOf = (doc: Doc): Kernel => parse(doc);
export const titleOf = (doc: Doc): string => headOf(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(headOf(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/** The tile a drawing offers: its pixel grid in pixel mode, else the background it carries, else a clear one. */
export function tileOfDoc(doc: Doc): Tile {
  const v = readDrawing(parse(doc));
  return v.grid ? v.pixels : (v.tile ?? blankTile(8));
}
/** One repeat of the tile, large enough to be sharp as a picture: 16 px a square. */
const tileSide = (tile: Tile) => tile.n * 16;

export default defineApp({
  id: 'draw',
  get name() {
    return t('Drawing Tool');
  },
  get noun() {
    return t('drawing');
  },
  get group() {
    return t('Design');
  },
  icon: PenTool,
  get blurb() {
    return t('Boxes, arrows, icons and labels on a grid; or pixel art, which can become a background tile.');
  },
  blank: () => '',
  templates: () => import('./templates.ts').then((m) => m.templates()),
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [drawingPage(parse(doc), opts?.upTo, opts?.thumb)],
  // Presented on a slide, a shape a step, in the order they were drawn.
  steps: (doc) => {
    const v = readDrawing(parse(doc));
    return v.grid ? 0 : v.shapes.length;
  },
  exports: [
    { ext: 'svg', label: () => t('Picture (SVG)'), mime: 'image/svg+xml', shows: 'own', build: (doc) => utf8(drawingToSvg(parse(doc))) },
    { ext: 'tile.svg', label: () => t('Background tile (SVG)'), mime: 'image/svg+xml', shows: 'own', build: (doc) => utf8(tileSvg(tileOfDoc(doc), tileSide(tileOfDoc(doc)))) },
    {
      ext: 'tile.png',
      label: () => t('Background tile (PNG)'),
      mime: 'image/png',
      shows: 'own',
      build: async (doc) => {
        const tile = tileOfDoc(doc);
        const side = tileSide(tile);
        return drawn(await raster(tileSvg(tile, side), side, side, 1, null));
      },
    },
  ],
  // Motion reads a drawing's table as it is; the entry shows once the Motion app is in the registry.
  handoffs: [{ to: 'anim', label: () => t('Animate this drawing'), convert: (doc) => doc }],
  commands: () => import('./commands.ts'),
});
