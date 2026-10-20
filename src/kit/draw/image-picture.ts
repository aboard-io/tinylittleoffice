/**
 * A host-kept picture as every app draws it: a fence "```image" (doc/image.ts) whose body is the host's reference.
 * The kit's registry lookup knows it by "image" (kit/core/apps.ts), as it knows the QR code (qr-picture.ts), so a
 * slide, a page, an outline's item and a card draw it as a document they hold, though it is no app of its own (no
 * home row, no editor; its words are edited where it is drawn). Where the host keeps pictures (kit/core/host.ts
 * `images`), the page is the picture, fetched from the host's own address; where it keeps none, the site above all,
 * the page is a plain card saying the picture is not kept here, and nothing is fetched from anywhere.
 *
 * A page drawn where nothing can move (a PDF, a PNG, a print) cannot fetch: `readyImages` asks the host for the
 * bytes first and keeps them as data: URLs, which `imageHref` then gives in the host's address's place. The kit's
 * exports call it before they build (kit/file/exports.ts), as they draw every icon first.
 */
import { Image as ImageIcon } from 'lucide';
import type { AppDef, ExportContext, Page } from '../core/app.ts';
import type { FenceBlock } from '../../doc/model.ts';
import { host } from '../core/host.ts';
import { t } from '../core/i18n.ts';
import { MUTED, rect, SHADE, text, xml } from './draw.ts';
import { IMAGE_LANG, imageBlock, imageOf, imageRefs, parse, type Image } from '../../doc/index.ts';

export { IMAGE_LANG, imageBlock, imageOf };

/** The bytes a host gave, as data: URLs by reference, for a page that cannot fetch (readyImages). */
const inlined = new Map<string, string>();

/** What a picture's first bytes say it is; PNG unless they say otherwise (a browser draws it by its bytes either way). */
function mimeOf(b: Uint8Array): string {
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[8] === 0x57) return 'image/webp';
  if (b[0] === 0x3c || (b[0] === 0xef && b[3] === 0x3c)) return 'image/svg+xml';
  return 'image/png';
}
const base64 = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};

/**
 * Every picture a document names, its bytes asked of the host and kept inline, where the host gives bytes; each asked
 * once a visit. A host that gives none, or a picture that does not come, leaves the address, which a raster's fetch
 * may still bring (kit/draw/raster.ts inlineImages, an https address only).
 */
export async function readyImages(text: string): Promise<void> {
  const bytes = host.images?.bytes;
  if (!bytes) return;
  await Promise.all(
    imageRefs(parse(text))
      .filter((ref) => !inlined.has(ref))
      .map(async (ref) => {
        try {
          const b = await bytes(ref);
          if (b?.length) inlined.set(ref, `data:${mimeOf(b)};base64,${base64(b)}`);
        } catch {
          // Not given: the address stays.
        }
      }),
  );
}

/** Where a picture is drawn from: the context's answer, else the bytes readyImages kept, else the host's address; null where no host keeps it. */
export function imageHref(ref: string, ctx?: Pick<ExportContext, 'image'>): string | null {
  if (ctx?.image) return ctx.image(ref);
  return inlined.get(ref) ?? host.images?.url(ref) ?? null;
}

/** A picture's bytes as a file that writes them in takes them (a .docx's media, an RTF's pict). */
export interface ImageData {
  mime: string;
  bytes: Uint8Array;
  /** Its size in pixels, as the fence says it or the bytes do; absent where neither does. */
  w?: number;
  h?: number;
}

/** The size a PNG, a GIF or a JPEG says it is, from its bytes; undefined for another kind or bytes that say none. */
function pixelSize(b: Uint8Array, mime: string): { w: number; h: number } | undefined {
  const at16 = (i: number) => (b[i] << 8) | b[i + 1];
  if (mime === 'image/png' && b.length >= 24) return { w: (at16(16) << 16) | at16(18), h: (at16(20) << 16) | at16(22) };
  if (mime === 'image/gif' && b.length >= 10) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  if (mime === 'image/jpeg')
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) return undefined;
      const marker = b[i + 1];
      // A start of frame (SOF0 to SOF15 but DHT, JPG and DAC) holds the height, then the width.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { w: at16(i + 7), h: at16(i + 5) };
      i += 2 + at16(i + 2);
    }
  return undefined;
}

/**
 * A picture's bytes where they are in hand, for a file that writes them in: the context's answer or the bytes
 * readyImages kept (`images.bytes`), as a data: URL read back; null where none are (a host that gives no bytes, a
 * picture that did not come), and the file says the picture's words instead.
 */
export function imageData(im: Image, ctx?: Pick<ExportContext, 'image'>): ImageData | null {
  const href = imageHref(im.ref, ctx);
  const m = href ? /^data:([^;,]+);base64,([\s\S]*)$/.exec(href) : null;
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const size = im.w && im.h ? { w: im.w, h: im.h } : pixelSize(bytes, m[1]);
  return { mime: m[1], bytes, ...size };
}

/** The address a picture is shown at in a page that may fetch (an editor, a web page): the host's, never the bytes; null where no host keeps it. */
export const imageUrl = (ref: string): string | null => host.images?.url(ref) ?? null;

/** Whether this page keeps pictures: the one question Insert ▾ asks before offering one. */
export const imagesKept = (): boolean => !!host.images;

/** The box a picture of unknown size is drawn in: 4:3, as every preview is. */
const W = 480;
const H = 360;

/** A picture's page: the picture whole inside its box; or, where no host keeps it, a card saying so with its words. */
export function imagePage(im: Image, opts: { ctx?: Pick<ExportContext, 'image'>; w?: number; h?: number } = {}): Page {
  const href = imageHref(im.ref, opts.ctx);
  const alt = im.alt || t('common-picture');
  const w = opts.w ?? (im.w && im.h ? Math.min(W, im.w) : W);
  const h = opts.h ?? (im.w && im.h ? Math.round((w * im.h) / im.w) : H);
  if (href) return { w, h, svg: `<image href="${xml(href)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`, alt };
  const why = t('common-picture-not-kept-here');
  return {
    w,
    h,
    svg: rect(0, 0, w, h, SHADE, 'rx="8"') + text(w / 2, h / 2 - 4, why, { px: 13, fill: MUTED, anchor: 'middle' }) + (im.alt ? text(w / 2, h / 2 + 18, im.alt, { px: 13, anchor: 'middle' }) : ''),
    alt: why + (im.alt ? `: ${im.alt}` : ''),
  };
}

/** The words a host's file is first described by: its name, the extension and the dashes taken out. */
const altFromName = (name: string): string =>
  name
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();

/** A picture file chosen from the device: the browser's own picker, through a file input made for the moment; null when none. */
function fromDevice(): Promise<File | null> {
  return new Promise((done) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    input.addEventListener('change', () => (done(input.files?.[0] ?? null), input.remove()), { once: true });
    input.addEventListener('cancel', () => (done(null), input.remove()), { once: true });
    document.body.append(input);
    input.click();
  });
}

/** Who chooses the file: the device's picker, unless a test (which cannot work a native picker) puts a chooser of its own here. */
export const picker: { choose(): Promise<File | null> } = { choose: fromDevice };
/** A picture file chosen for Insert ▾ Picture; null when none was. */
export const chooseImageFile = (): Promise<File | null> => picker.choose();

/** The size of a picture file as the browser reads it, or nothing where it cannot (not a picture, or no DOM). */
async function imageSize(file: Blob): Promise<{ w: number; h: number } | undefined> {
  if (typeof createImageBitmap !== 'function') return undefined;
  try {
    const bmp = await createImageBitmap(file);
    const size = { w: bmp.width, h: bmp.height };
    bmp.close();
    return size;
  } catch {
    return undefined;
  }
}

/**
 * A file put to the host, as every editor does it: refused with a word where it is too heavy (host `maxBytes`), its
 * size read here where the host did not say it. The fence to put in the document, or null.
 */
export async function putImage(file: Blob, name = ''): Promise<FenceBlock | null> {
  const images = host.images;
  if (!images) return null;
  if (images.maxBytes && file.size > images.maxBytes) {
    const { toast } = await import('../core/say.ts');
    toast(t('common-picture-too-large', { max: `${Math.max(1, Math.round(images.maxBytes / 1024))} KB` }));
    return null;
  }
  const put = await images.put(file);
  const size = put.w && put.h ? { w: put.w, h: put.h } : await imageSize(file);
  return imageBlock(put.ref, altFromName(name), size?.w, size?.h);
}

/** How the lookup knows an image fence: enough of a definition for the hosts to draw it. */
export const imagePicture: AppDef = {
  id: IMAGE_LANG,
  get name() {
    return t('common-picture');
  },
  get noun() {
    return t('common-picture-lowercase');
  },
  group: '',
  icon: ImageIcon,
  get blurb() {
    return t('common-picture-kept-by-this-page');
  },
  blank: () => '',
  templates: async () => [],
  editor: () => Promise.reject(new Error('A picture is drawn, not edited')),
  title: () => '',
  retitle: (doc) => doc,
  // The body alone is the reference: the words and the size ride on the fence, which a host draws itself (Write's card, its pages).
  view: (body) => [imagePage(imageOf({ k: 'fence', lang: IMAGE_LANG, body }) ?? { ref: body.trim(), alt: '' })],
  text: () => [{ k: 'p', runs: [{ t: t('common-picture') }] }],
};
