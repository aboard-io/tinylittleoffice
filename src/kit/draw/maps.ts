/**
 * A map in a picture: a box a drawing leaves for one (apps/trip/view.ts, an SVG `<image data-map="z/x/y/w/h">` with no
 * picture of its own yet: the ground under it shows), filled with a picture of that ground by whatever draws maps, which
 * the app that draws them names (drawsMaps: the Trip Planner's, apps/trip/picture.ts, MapLibre on OpenFreeMap). On the
 * screen each box is filled as it is put on the page (installMaps, from the shell); in a file, before the file is made
 * (raster.ts). Each box is drawn once a visit and kept for the visit; one that cannot be drawn (no network, no WebGL, a
 * page whose policy asks no one) stays the ground. Nothing here touches the DOM until it is called, so a definition read
 * under node may import it.
 *
 * A box is "z/x/y/w/h": the zoom (as Leaflet's 256-pixel tiles count it), the box's top left in pixels of that zoom,
 * and its width and height in pixels.
 */

/** Draws the ground of a box as a picture (a data: URL), or null where it cannot. */
export type MapDrawer = (box: string) => Promise<string | null>;

const BOX = /^\d{1,2}\/-?\d+(\.\d+)?\/-?\d+(\.\d+)?\/\d+\/\d+$/;
const MAP = 'image[data-map]';
let drawer: MapDrawer | null = null;
const drawn = new Map<string, Promise<string | null>>();

/** The app that draws maps names its drawer, which draws every box afresh; boxes already on the page are filled now. */
export function drawsMaps(draw: MapDrawer) {
  drawer = draw;
  drawn.clear();
  if (installed) fill(document);
}

/** The picture of a box, drawn once a visit; null where there is no drawer or it cannot be drawn. */
function mapPicture(box: string): Promise<string | null> {
  if (!drawer || !BOX.test(box)) return Promise.resolve(null);
  let p = drawn.get(box);
  if (!p) drawn.set(box, (p = drawer(box).catch(() => null)));
  return p;
}

/** The boxes in an SVG's markup filled with their pictures, as a file needs them (raster.ts); one that cannot be drawn is left the ground. */
export async function withMaps(svg: string): Promise<string> {
  const boxes = [...new Set(Array.from(svg.matchAll(/<image data-map="([^"]+)"/g), (m) => m[1]))];
  if (!boxes.length) return svg;
  const got = new Map(await Promise.all(boxes.map(async (b) => [b, await mapPicture(b)] as const)));
  return svg.replace(/<image data-map="([^"]+)"([^>]*)\/>/g, (all, b: string, rest: string) => {
    const d = got.get(b);
    return d ? `<image data-map="${b}" href="${d}"${rest}/>` : all;
  });
}

/** Each box in `root` filled with its picture once it is drawn. */
function fill(root: ParentNode) {
  for (const image of root.querySelectorAll<SVGImageElement>(MAP)) {
    if (image.hasAttribute('href')) continue;
    const box = image.dataset.map!;
    void mapPicture(box).then((d) => d && image.dataset.map === box && !image.hasAttribute('href') && image.setAttribute('href', d));
  }
}

let installed = false;
/** From now on, every map box put on this page, now and later. */
export function installMaps() {
  if (installed || typeof MutationObserver === 'undefined') return;
  installed = true;
  fill(document);
  new MutationObserver((changes) => {
    for (const c of changes) for (const n of c.addedNodes) if (n instanceof Element) fill(n.matches(MAP) ? (n.parentNode ?? n) : n);
  }).observe(document.documentElement, { childList: true, subtree: true });
}
