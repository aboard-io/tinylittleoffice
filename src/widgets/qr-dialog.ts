/**
 * <to-qr-dialog>: the whole document as a QR code. The link is the
 * document, and a code is a link: whoever scans it has it. Give it the
 * link and the document's title; it draws the code and offers PNG and SVG.
 */
import { LitElement, html } from '../kit.ts';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { icon, UI } from '../lib/icons.ts';
import { QR_MAX_BYTES, qrSvg } from '../lib/qr.ts';
import { slug, utf8 } from '../kit/core.ts';
import { raster, saveFile } from '../kit/browser.ts';
import type { SlDialog } from '../lib/shoelace.ts';

export class ToQrDialog extends LitElement {
  static properties = { link: {}, name: {} };
  declare link: string;
  declare name: string;

  constructor() {
    super();
    this.link = '';
    this.name = '';
  }

  protected createRenderRoot() {
    return this;
  }

  show() {
    this.querySelector<SlDialog>('sl-dialog')?.show();
  }

  render() {
    const bytes = new TextEncoder().encode(this.link);
    const fits = bytes.length <= QR_MAX_BYTES;
    const svg = fits && this.link ? qrSvg(bytes, 4) : '';
    const save = async (ext: 'png' | 'svg') => {
      const file = `${slug(this.name) || 'document'}-qr.${ext}`;
      if (ext === 'svg') return saveFile(file, 'image/svg+xml', utf8(svg));
      const side = 1024;
      const png = await raster(svg.replace(/width="\d+" height="\d+"/, `width="${side}" height="${side}"`), side, side);
      if (png) saveFile(file, 'image/png', png);
    };
    return html`<sl-dialog id="qr-dialog" label="QR code" class="to-qr">
      ${fits
        ? html`<div class="code" role="img" aria-label="QR code of this document">${unsafeHTML(svg)}</div>
          <p class="to-hint">The whole document, ${bytes.length.toLocaleString()} bytes, as one code. Anyone who scans it has it.</p>
          <div class="row">
            <sl-button size="small" variant="primary" @click=${() => save('png')}>${icon(UI.download, 14)} PNG</sl-button>
            <sl-button size="small" @click=${() => save('svg')}>${icon(UI.download, 14)} SVG</sl-button>
          </div>`
        : html`<p>This document is ${bytes.length.toLocaleString()} bytes; the largest QR code holds ${QR_MAX_BYTES.toLocaleString()}. Shorten it by ${(bytes.length - QR_MAX_BYTES).toLocaleString()} bytes and it will fit.</p>`}
    </sl-dialog>`;
  }
}
if (!customElements.get('to-qr-dialog')) customElements.define('to-qr-dialog', ToQrDialog);
