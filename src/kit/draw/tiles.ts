/**
 * A map's tiles drawn on the screen (apps/trip/view.ts: an SVG <image> for each), asked as OpenStreetMap's tile policy
 * asks, with the site's name as the referrer. An <image> follows the page's Referrer-Policy, no-referrer, which the tile
 * servers answer with an "Access blocked" picture in place of every tile (#46); and an SVG <image>, unlike an <img>,
 * has no referrerpolicy of its own. So each tile put on the page is asked as an export asks for it (raster.ts dataUrl:
 * the origin alone, never the page's path or anything of the document) and shown from what came, once a visit; one
 * that does not come is left as it was.
 */
import { origin } from '../core/network.ts';
import { dataUrl } from './raster.ts';

const TILE = `image[href^="${origin('tiles')}/"]`;
const got = new Map<string, Promise<string | null>>();

/** Each of the tiles in `root` shown from the tile asked with the site's origin as the referrer. */
function swap(root: ParentNode) {
  for (const image of root.querySelectorAll<SVGImageElement>(TILE)) {
    const href = image.getAttribute('href')!;
    if (!got.has(href)) got.set(href, dataUrl(href));
    void got.get(href)!.then((d) => d && image.getAttribute('href') === href && image.setAttribute('href', d));
  }
}

let installed = false;
/** From now on, every tile drawn on this page, now and later. */
export function installTiles() {
  if (installed || typeof MutationObserver === 'undefined') return;
  installed = true;
  swap(document);
  new MutationObserver((changes) => {
    for (const c of changes) for (const n of c.addedNodes) if (n instanceof Element) swap(n.matches(TILE) ? (n.parentNode ?? n) : n);
  }).observe(document.documentElement, { childList: true, subtree: true });
}
