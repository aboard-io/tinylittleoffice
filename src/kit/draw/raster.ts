/**
 * SVG markup drawn as a PNG, through a canvas. On its own so a definition (read under node by the build)
 * can import it: nothing here touches the DOM until it is called.
 */
import { PAPER } from './draw.ts';
import { withMaps } from './maps.ts';

/** A picture from another site as a data: URL, asked by the browser under its own name, naming the site as the referrer (the origin alone, never the page's path or anything of the document); null when it does not come. */
async function dataUrl(href: string): Promise<string | null> {
  try {
    const res = await fetch(href, { mode: 'cors', credentials: 'omit', referrerPolicy: 'strict-origin' });
    const blob = res.ok ? await res.blob() : null;
    if (!blob?.type.startsWith('image/')) return null;
    return await new Promise((done) => {
      const read = new FileReader();
      read.onload = () => done(read.result as string);
      read.onerror = () => done(null);
      read.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Each picture from another site in the markup (a host-kept picture, kit/draw/image-picture.ts) written in as a data:
 * URL, since an SVG drawn as a picture asks no one for anything; one that does not come is taken out. Each asked once,
 * all at once, and kept by no one but the browser's own cache. A map's box is drawn first (kit/draw/maps.ts withMaps).
 */
async function inlineImages(svg: string): Promise<string> {
  const hrefs = [...new Set(Array.from(svg.matchAll(/<image href="(https:[^"]+)"/g), (m) => m[1]))];
  if (!hrefs.length) return svg;
  const got = new Map(await Promise.all(hrefs.map(async (h) => [h, await dataUrl(h)] as const)));
  return svg.replace(/<image href="(https:[^"]+)"([^>]*)\/>/g, (_, h: string, rest: string) => {
    const d = got.get(h);
    return d ? `<image href="${d}"${rest}/>` : '';
  });
}

/** SVG markup painted on a canvas of w by h at `scale`, over `paper` (or nothing when null); null where it cannot be drawn. A map's picture and other sites' pictures are written in first. */
async function paint(svg: string, w: number, h: number, scale: number, paper: string | null): Promise<HTMLCanvasElement | null> {
  try {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await inlineImages(await withMaps(svg)));
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const g = canvas.getContext('2d')!;
    if (paper) {
      g.fillStyle = paper;
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch {
    return null;
  }
}

/** A picture that did not come out (a canvas the browser refused, or none at all) is a failed file, never an empty one. */
export function drawn<T>(bytes: T | null | undefined): T {
  if (!bytes) throw new Error('not drawn');
  return bytes;
}

/** Draw SVG markup as a PNG. `scale` trades sharpness for size; `paper` is painted under it first, or nothing when null (a tile keeps its clear squares). */
export async function raster(svg: string, w: number, h: number, scale = 1, paper: string | null = PAPER): Promise<Uint8Array | null> {
  const canvas = await paint(svg, w, h, scale, paper);
  if (!canvas) return null;
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/png'));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/** Draw SVG markup on a canvas of w by h, over the paper: a frame for the video encoder (kit/file/webm.ts). */
export const canvas = (svg: string, w: number, h: number, paper: string | null = PAPER): Promise<HTMLCanvasElement | null> => paint(svg, w, h, 1, paper);

/** Draw SVG markup as RGBA pixels (w by h, four bytes each): a frame for the GIF encoder. */
export async function pixels(svg: string, w: number, h: number, paper: string | null = PAPER): Promise<Uint8ClampedArray | null> {
  const canvas = await paint(svg, w, h, 1, paper);
  return canvas ? canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data : null;
}

/** Draw SVG markup as a JPEG (over the paper, which a JPEG cannot leave clear): a page of the .pdf file. */
export async function jpeg(svg: string, w: number, h: number, scale = 1, quality = 0.9): Promise<Uint8Array | null> {
  const canvas = await paint(svg, w, h, scale, PAPER);
  if (!canvas) return null;
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', quality));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}
