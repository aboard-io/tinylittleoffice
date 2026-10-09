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
import { raster } from '../../kit/raster.ts';
import { blankTile, tileSvg, type Tile } from '../../kit/tile.ts';
import { readDrawing } from './model.ts';
import { drawingPage, drawingToSvg } from './view.ts';
import { templates } from './templates.ts';

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
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc) => [drawingPage(parse(doc))],
  exports: [
    { ext: 'svg', label: () => t('Picture (SVG)'), mime: 'image/svg+xml', build: (doc) => utf8(drawingToSvg(parse(doc))) },
    { ext: 'tile.svg', label: () => t('Background tile (SVG)'), mime: 'image/svg+xml', build: (doc) => utf8(tileSvg(tileOfDoc(doc), tileSide(tileOfDoc(doc)))) },
    {
      ext: 'tile.png',
      label: () => t('Background tile (PNG)'),
      mime: 'image/png',
      build: async (doc) => {
        const tile = tileOfDoc(doc);
        const side = tileSide(tile);
        return (await raster(tileSvg(tile, side), side, side, 1, null)) ?? new Uint8Array();
      },
    },
  ],
  // Motion reads a drawing's table as it is; the entry shows once the Motion app is in the registry.
  handoffs: [{ to: 'anim', label: () => t('Animate this drawing'), convert: (doc) => doc }],
  keys: [
    { keys: 'V', does: () => t('Select') },
    { keys: 'R', does: () => t('Rectangle') },
    { keys: 'E', does: () => t('Ellipse') },
    { keys: 'D', does: () => t('Diamond') },
    { keys: 'L', does: () => t('Line') },
    { keys: 'A', does: () => t('Arrow') },
    { keys: 'T', does: () => t('Text') },
    { keys: 'K', does: () => t('Join two shapes') },
    { keys: 'P', does: () => t('Pen: any shape, a tap for each corner') },
    { keys: 'F', does: () => t('Freehand: drag to draw a line or a shape') },
    { keys: '[ / ]', does: () => t('Rotate left, rotate right') },
    { keys: 'Arrows', does: () => t('Nudge the shapes in hand') },
  ],
});
