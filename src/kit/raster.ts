/**
 * SVG markup drawn as a PNG, through a canvas. On its own so a definition (read under node by the build)
 * can import it: nothing here touches the DOM until it is called.
 */
import { PAPER } from './draw.ts';

/** SVG markup painted on a canvas of w by h at `scale`, over `paper` (or nothing when null); null where it cannot be drawn. */
async function paint(svg: string, w: number, h: number, scale: number, paper: string | null): Promise<HTMLCanvasElement | null> {
  try {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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

/** Draw SVG markup as a PNG. `scale` trades sharpness for size; `paper` is painted under it first, or nothing when null (a tile keeps its clear squares). */
export async function raster(svg: string, w: number, h: number, scale = 1, paper: string | null = PAPER): Promise<Uint8Array | null> {
  const canvas = await paint(svg, w, h, scale, paper);
  if (!canvas) return null;
  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/png'));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

/** Draw SVG markup as RGBA pixels (w by h, four bytes each): a frame for the GIF encoder. */
export async function pixels(svg: string, w: number, h: number, paper: string | null = PAPER): Promise<Uint8ClampedArray | null> {
  const canvas = await paint(svg, w, h, 1, paper);
  return canvas ? canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data : null;
}
