/**
 * The QR code as a picture a document can hold: a fence "```qr```". Empty, it is the code of this
 * document's own link (the one the shell holds now, `setSelfLink`), drawn afresh each time so it always
 * opens the document as it is; holding an address, it is that address's code. Write and Deck put
 * it in from Insert ▾ ("QR code of this document"), and draw it as they draw another document held in
 * them: the kit's registry lookup knows it by "qr" (kit/apps.ts), though it is not an app of its own (no
 * home row, no editor; editing it does nothing).
 */
import { QrCode } from 'lucide';
import type { AppDef, Page } from './app.ts';
import { MUTED, rect, text } from './draw.ts';
import { t } from './i18n.ts';
import { QR_MAX_BYTES, qrSvg } from './qr.ts';
import type { Block } from '../doc/index.ts';

export const QR_LANG = 'qr';

let self = '';
/** The link of the document on the page now: the shell's, after every change. */
export const setSelfLink = (link: string) => void (self = link);
export const selfLink = () => self;

/** A QR fence: this document's own code. */
export const qrBlock = (): Block => ({ k: 'fence', lang: QR_LANG, body: '' });

/** The code of `link` as a page: the code on white, a line under it. Too long for a code, or no link yet: a sentence instead. */
export function qrPage(link: string, caption = t('QR code of this document')): Page {
  const W = 360;
  const bytes = new TextEncoder().encode(link);
  if (!link || bytes.length > QR_MAX_BYTES) {
    const why = link ? t('Too long for a QR code: shorten the document, or share a short link.') : t('QR code of this document');
    return { w: W, h: 120, svg: rect(0, 0, W, 120, '#fff', 'rx="8"') + text(W / 2, 66, why, { px: 13, fill: MUTED, anchor: 'middle' }), alt: why };
  }
  const code = qrSvg(bytes);
  const n = Number(/viewBox="0 0 (\d+)/.exec(code)?.[1] ?? 0);
  const side = W - 40;
  const svg =
    rect(0, 0, W, W + 24, '#fff') +
    `<svg x="20" y="12" width="${side}" height="${side}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${code.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>` +
    text(W / 2, W + 8, caption, { px: 13, fill: MUTED, anchor: 'middle' });
  return { w: W, h: W + 24, svg, alt: caption };
}

/** How the lookup knows a QR fence: enough of a definition for the hosts to draw it. */
export const qrPicture: AppDef = {
  id: QR_LANG,
  get name() {
    return t('QR code');
  },
  get noun() {
    return t('QR code');
  },
  group: '',
  icon: QrCode,
  get blurb() {
    return t('A QR code of this document');
  },
  blank: () => '',
  templates: async () => [],
  editor: () => Promise.reject(new Error('A QR code is drawn, not edited')),
  title: () => '',
  retitle: (doc) => doc,
  view: (body) => [body.trim() ? qrPage(body.trim(), body.trim()) : qrPage(selfLink())],
};
