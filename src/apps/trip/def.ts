/**
 * Trip: a route on a map, stops in order, each with a note; or places as dots. The document is a table of
 * places (model.ts), the editor is editor.ts (a Leaflet map, a lazy chunk of its own, with OpenStreetMap's
 * pictures while it is on view), the drawing and the files view.ts.
 */
import { MapPinned } from 'lucide';
import { apply, parse, write } from '../../doc/index.ts';
import { defineApp, type Doc } from '../../kit/app.ts';
import { utf8 } from '../../kit/draw.ts';
import { t } from '../../kit/i18n.ts';
import { templates } from './templates.ts';
import { tripPage, tripToGeoJson, tripToGpx } from './view.ts';
import { tripToCal } from './convert.ts';
import { readTrip } from './model.ts';

/** The document's own title ('' for none: a GPX or GeoJSON file falls back to the route's ends). */
export const titleOf = (doc: Doc): string => parse(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'trip',
  get name() {
    return t('Trip Planner');
  },
  get noun() {
    return t('trip');
  },
  get group() {
    return t('Plan');
  },
  icon: MapPinned,
  get blurb() {
    return t('A route on a map: stops in order, each with a note, and how far between them.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => [tripPage(parse(doc), opts?.small, opts?.upTo)],
  // Presented on a slide, a stop a step: the map stays fitted to them all, the route drawn as far as it has come.
  steps: (doc) => readTrip(parse(doc)).stops.length,
  exports: [
    { ext: 'gpx', label: () => t('GPX route'), mime: 'application/gpx+xml', shows: null, build: (doc) => utf8(tripToGpx(parse(doc))) },
    { ext: 'geojson', label: () => t('GeoJSON'), mime: 'application/geo+json', shows: null, build: (doc) => utf8(tripToGeoJson(parse(doc))) },
  ],
  keys: [
    { keys: 'Mod+Alt+Enter', does: () => t('Present: the map flies stop to stop') },
    { keys: 'ArrowRight / Space', does: () => t('Presenting: the next stop') },
    { keys: 'ArrowLeft', does: () => t('Presenting: the stop before') },
    { keys: 'Escape', does: () => t('Stop presenting') },
  ],
  handoffs: [{ to: 'cal', label: () => t('Put the stops on a calendar, a day each'), convert: (doc) => tripToCal(doc) }],
});
