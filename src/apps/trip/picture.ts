/**
 * A trip's map as a picture (view.ts leaves the box, kit/draw/maps.ts asks for it): the ground drawn by MapLibre from
 * OpenFreeMap's tiles in Liberty's style, as the Trip Planner's own map is (maplibre.ts), on a map of the box's size off
 * the screen that takes no input, read back as a JPEG once it is still, and taken away. One at a time, since a browser
 * keeps only so many WebGL pages at once; at twice the box's pixels, so a slide or a page in a file is sharp. Null where
 * it cannot be drawn: no WebGL, no network, a page whose policy asks no one, or nothing still within half a minute.
 */
import { MAP_STYLE, maplibre, Z } from './maplibre.ts';

/** How long a map may take to come to rest before the box is left the ground. */
const PATIENCE = 30_000;
/** The pixels drawn for each pixel of the box. */
const SHARP = 2;
/** The JPEG's quality: the streets' names and lines sharp, the ground's flat colours cheap. */
const QUALITY = 0.82;

/** A box "z/x/y/w/h" (kit/draw/maps.ts) as MapLibre's view of it: its centre in degrees, its zoom (512-pixel tiles), its size. */
export function viewOf(box: string): { lon: number; lat: number; zoom: number; w: number; h: number } {
  const [z, x0, y0, w, h] = box.split('/').map(Number);
  const world = 256 * 2 ** z;
  const [cx, cy] = [(x0 + w / 2) / world, (y0 + h / 2) / world];
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI;
  return { lon: cx * 360 - 180, lat, zoom: Z(z), w, h };
}

let queue: Promise<unknown> = Promise.resolve();

/** The box's ground as a JPEG data: URL, or null. Each waits for the one before it. */
export function drawMap(box: string, style: string = MAP_STYLE): Promise<string | null> {
  const run = queue.then(() => draw(box, style));
  queue = run.catch(() => null);
  return run;
}

async function draw(box: string, style: string): Promise<string | null> {
  const v = viewOf(box);
  const ml = await maplibre();
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = `position:fixed;left:-${v.w + 100}px;top:0;width:${v.w}px;height:${v.h}px;pointer-events:none;`;
  document.body.append(el);
  let map: InstanceType<typeof ml.Map> | null = null;
  try {
    map = new ml.Map({
      container: el,
      style,
      center: [v.lon, v.lat],
      zoom: v.zoom,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      pixelRatio: SHARP,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });
    const m = map;
    const still = await new Promise<boolean>((done) => {
      const late = setTimeout(() => done(false), PATIENCE);
      m.once('idle', () => (clearTimeout(late), done(true)));
      // A style that does not come (no network, a policy that asks no one) ends it at once; a tile that does not come is a gap in the ground.
      m.on('error', () => !m.isStyleLoaded() && (clearTimeout(late), done(false)));
    });
    // A JPEG: a map has no clear ground, and every browser writes one (Safari writes no WebP); a quarter of a PNG's bytes (a slide's Brooklyn: 439 KB to 1.8 MB).
    return still ? m.getCanvas().toDataURL('image/jpeg', QUALITY) : null;
  } catch {
    return null;
  } finally {
    map?.remove();
    el.remove();
  }
}
