import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { templates } from '../../../src/apps/write/templates.ts';
import { encodeDoc } from '../../../src/kit/core/codec.ts';
import { routeHash } from '../../../src/kit/core/route.ts';
import { utf8 } from '../../../src/kit/draw/draw.ts';
import { QR_MAX_BYTES, qrSvg } from '../../../src/kit/draw/qr.ts';

/**
 * A QR code from bytes (kit/draw/qr.ts): byte mode, level L, the smallest version that fits. The default is the link
 * of the Word Processor's letter template, as a document's own QR code holds its link; up to QR_MAX_BYTES bytes.
 */
const LINK = `https://tinylittleoffice.com/write/${routeHash('write', encodeDoc(templates()[0].doc))}`;

const meta = {
  title: 'Kit/Draw/QR',
  args: { text: LINK, px: 4 },
  argTypes: { text: { control: 'text', description: `The words or link encoded (up to ${QR_MAX_BYTES} bytes)` }, px: { control: { type: 'range', min: 1, max: 10 } } },
  render: ({ text, px }) => {
    const bytes = utf8(text);
    return bytes.length > QR_MAX_BYTES
      ? html`<p class="sb-caption">${bytes.length} bytes: over the ${QR_MAX_BYTES} a code holds</p>`
      : html`${unsafeSVG(qrSvg(bytes, px))}
          <p class="sb-caption">${bytes.length} bytes</p>`;
  },
} satisfies Meta<{ text: string; px: number }>;
export default meta;

export const QR: StoryObj<{ text: string; px: number }> = {};
