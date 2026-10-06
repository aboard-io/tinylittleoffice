/**
 * QR code: a link (or any short text) as a code, to put on a slide, in a
 * text or on a poster, so people can point a phone at it. A link to a
 * TinyLittleOffice document is the document: whoever scans it has it.
 */
import { definePrint } from '../lib/print.ts';
import { linkToRef, resolve } from '../kit/embed.ts';
import { text, clip, MUTED, type Page } from '../kit/core.ts';
import { qrCode, QR_MAX_BYTES } from '../lib/qr.ts';
import type { Kind as LineKind } from '../lib/lines.ts';

/** What the code is of: its document's title if it is one of ours, its host if it is a web address, otherwise the words. */
export function qrLabel(body: string): string {
  const t = body.trim();
  const ref = linkToRef(t);
  if (ref) return resolve(ref).title;
  try {
    return /^https?:/.test(t) ? new URL(t).host : t;
  } catch {
    return t;
  }
}

function page(body: string): Page {
  const t = body.trim();
  const bytes = new TextEncoder().encode(t);
  const S = 480;
  if (!t) return { w: S, h: S, svg: text(S / 2, S / 2, 'Paste a link', { px: 20, fill: MUTED, anchor: 'middle' }) };
  if (bytes.length > QR_MAX_BYTES) return { w: S, h: S, svg: text(S / 2, S / 2 - 12, 'Too long for a QR code', { px: 20, fill: MUTED, anchor: 'middle' }) + text(S / 2, S / 2 + 16, `${bytes.length.toLocaleString('en-US')} bytes; ${QR_MAX_BYTES.toLocaleString('en-US')} is the most`, { px: 14, fill: MUTED, anchor: 'middle' }) };
  const m = qrCode(bytes);
  // The code, with its quiet zone, fills the square; the label sits beneath.
  const n = m.length + 8;
  const c = (S - 40) / n;
  let d = '';
  m.forEach((row, y) => row.forEach((on, x) => on && (d += `M${((x + 4) * c + 20).toFixed(2)} ${((y + 4) * c + 20).toFixed(2)}h${c.toFixed(2)}v${c.toFixed(2)}h-${c.toFixed(2)}z`)));
  return { w: S, h: S + 40, svg: `<path d="${d}" fill="#000" shape-rendering="crispEdges"/>` + text(S / 2, S + 14, clip(qrLabel(t), S - 40, 16), { px: 16, fill: MUTED, anchor: 'middle' }) };
}

export const spec = {
  form: [{ name: 'Link or text', is: '{Link or text:long}' }] as LineKind[],
  hint: 'Paste a link (to a TinyLittleOffice document, or anywhere), or type a few words. Put the code on a slide or in a text.',
  example: 'https://tinylittleoffice.com/',
  sheets: (body: string) => [page(body)],
};

export default definePrint({ id: 'qr', under: undefined, group: 'Collaborate', name: 'QR code', icon: 'qr', blurb: 'A link as a QR code, to put on a slide or a page for phones to scan.', title: (body) => qrLabel(body), outline: (body) => [body.trim()].filter(Boolean) }, spec);
