import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { templates } from '../../../src/apps/draw/templates.ts';
import { parse } from '../../../src/doc/index.ts';
import { parseTile, tileCss, tileSvg } from '../../../src/kit/draw/tile.ts';

/**
 * A repeating background tile (kit/draw/tile.ts): a small grid of coloured squares in one head field, which a drawing,
 * a slide or a web page draws behind its content. The default is the Drawing Tool's birthday card's.
 */
const OWN = templates()
  .map((t) => parse(t.doc).head.tile)
  .find(Boolean) as string;

const meta = {
  title: 'Kit/Draw/Tile',
  args: { tile: OWN, side: 64 },
  argTypes: { tile: { control: 'text', description: 'The field: the side, then the rows, a to h an ink, "." clear' }, side: { control: { type: 'range', min: 16, max: 128, step: 8 } } },
  render: ({ tile, side }) => {
    const t = parseTile(tile);
    return t
      ? html`<div class="sb-row">
          <div>${unsafeSVG(tileSvg(t, side))}</div>
          <div class="sb-tiled" style="background-image: ${tileCss(t, side)}"></div>
        </div>`
      : html`<p class="sb-caption">Not a tile</p>`;
  },
} satisfies Meta<{ tile: string; side: number }>;
export default meta;

export const Tile: StoryObj<{ tile: string; side: number }> = {};
