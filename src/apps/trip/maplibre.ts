/**
 * MapLibre GL and OpenFreeMap, as the Trip Planner's live map and a trip's picture (picture.ts) both draw with them
 * (Paul, 2026-10-15, on issue #4, OpenFreeMap being made for this where OpenStreetMap's tile servers are not: "It's fine
 * to put the openfreemap renderer in, as long as we hot-load it for that path"; and 2026-11-27, for the pictures too).
 * The one large thing only maps need: a file of its own in the build, fetched with the first map and never part of the
 * app file, with its stylesheet and its worker (a file of the site's own, as the policy's worker-src asks; MapLibre
 * would make one from a blob otherwise).
 */
import type * as ML from 'maplibre-gl';
import mapWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { origin } from '../../kit/core/network.ts';

export type L = typeof ML;
let loading: Promise<L> | null = null;
/** MapLibre, once it has come (null before): what the editor draws with once a map is up. */
export let loaded: L | null = null;
/** MapLibre, fetched with the first map that asks for it. */
export const maplibre = (): Promise<L> => (loading ??= Promise.all([import('maplibre-gl'), import('./maplibre.css')]).then(([m]) => (m.setWorkerUrl(mapWorker), (loaded = m))));
/** The map's style: OpenFreeMap's Liberty, its tiles, sprites and fonts all on the one host (kit/core/network.ts). */
export const MAP_STYLE = `${origin('openfreemap')}/styles/liberty`;
// (What the live map says under itself, OpenFreeMap's, OpenMapTiles' and OpenStreetMap's names, comes with the tiles'
// own description, as OpenFreeMap asks; written there too it would show twice. A picture says them in its corner: view.ts.)
/** MapLibre's tiles are 512px to Leaflet's 256: one level out shows the same ground, so a zoom written for Leaflet (home.ts, view.ts) is one less here. */
export const Z = (zoom: number) => zoom - 1;
