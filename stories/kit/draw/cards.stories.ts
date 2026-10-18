import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { apps, appOf, type Template } from '../../../src/editors.ts';
import { cardSvg, RIGHT, WHOLE } from '../../../src/kit/draw/card.ts';

/**
 * The picture a link previews with, 1200 by 630 (kit/draw/card.ts): a page on a neutral ground at the largest size
 * that fits its box. `WHOLE` is a document's card (Share, with the preview on); `RIGHT` an app's, the page at the right.
 * The page is the first of an app's first template.
 */
const meta = {
  title: 'Kit/Draw/Cards',
  args: { app: 'deck', box: 'WHOLE' },
  argTypes: {
    app: { control: 'select', options: apps().map((a) => a.id) },
    box: { control: 'inline-radio', options: ['WHOLE', 'RIGHT'], description: 'Where the page goes on the card' },
  },
  loaders: [async ({ args }) => ({ first: ((await appOf(args.app as string)!.templates()) as Template[])[0] })],
  render: (args, { loaded }) => {
    const def = appOf(args.app)!;
    const first = loaded.first as Template | undefined;
    const page = def.view(first?.doc ?? def.blank(), { still: true, card: true })[0];
    return html`<div class="sb-picture">${unsafeSVG(cardSvg(page, args.box === 'RIGHT' ? RIGHT : WHOLE))}</div>`;
  },
} satisfies Meta<{ app: string; box: 'WHOLE' | 'RIGHT' }>;
export default meta;

export const Card: StoryObj<{ app: string; box: 'WHOLE' | 'RIGHT' }> = {};
