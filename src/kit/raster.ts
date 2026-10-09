/**
 * SVG markup drawn as a PNG, through a canvas. On its own so a definition (read under node by the build)
 * can import it: nothing here touches the DOM until it is called.
 */
import { PAPER } from './draw.ts';

/** Draw SVG markup as a PNG. `scale` trades sharpness for size; `paper` is painted under it first, or nothing when null (a tile keeps its clear squares). */
export async function raster(svg: string, w: number, h: number, scale = 1, paper: string | null = PAPER): Promise<Uint8Array | null> {
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
    const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/png'));
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
