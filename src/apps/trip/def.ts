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

/** The document's own title ('' for none: a GPX or GeoJSON file falls back to the route's ends). */
export const titleOf = (doc: Doc): string => parse(doc).head.title ?? '';
export const retitle = (doc: Doc, title: string): Doc => write(apply(parse(doc), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

export default defineApp({
  id: 'trip',
  get name() {
    return t('Trip');
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
  view: (doc, opts) => [tripPage(parse(doc), opts?.small)],
  exports: [
    { ext: 'gpx', label: () => t('GPX route'), mime: 'application/gpx+xml', build: (doc) => utf8(tripToGpx(parse(doc))) },
    { ext: 'geojson', label: () => t('GeoJSON'), mime: 'application/geo+json', build: (doc) => utf8(tripToGeoJson(parse(doc))) },
  ],
});
