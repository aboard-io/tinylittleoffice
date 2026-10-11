/**
 * Trip drawn and written out, with no DOM: the page for print, PDF, PNG and thumbnails, and the two files a
 * map app or a GPS reads (GPX 1.1, GeoJSON). The page draws the route on a plain map of its own (Web
 * Mercator, fitted to the stops, a graticule for scale) and asks no one for anything: OpenStreetMap's
 * pictures are the editor's, only while its map is on view.
 */
import type { Page } from '../../kit/app.ts';
import { ACCENT, clip, FAINT, LINE, MUTED, r, rect, SHADE, text, xml } from '../../kit/draw.ts';
import { distanceKm, formatLeg, readTrip, routeKm, routeName, type TripView } from './model.ts';
import type { Doc } from '../../doc/index.ts';

/** Web Mercator, in units of the world's width: where a place falls. */
const mx = (lon: number) => (lon + 180) / 360;
const my = (lat: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};
/** The least span of a map of several stops, in world widths: about two kilometres across at the equator. */
const MIN_SPAN = 0.00005;
const STEPS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 45, 90];

/** The stops on a map `w` × `h`: lines of latitude and longitude, the route, the numbered pins and their names. Presented, the first `upTo` of them, on the map that fits them all. */
function mapSvg(v: TripView, w: number, h: number, upTo = Infinity): string {
  const s = v.stops;
  let out = rect(0, 0, w, h, SHADE);
  if (!s.length) return out;
  const xs = s.map((p) => mx(p.lon));
  const ys = s.map((p) => my(p.lat));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // As close as fits every stop with room for its name: one stop alone is a town's width; several, never closer
  // than a few streets, so a walk or a food crawl fills the map as a road trip does.
  const span = Math.max(x1 - x0, ((y1 - y0) * w) / h, s.length > 1 ? MIN_SPAN : 0.0004);
  const scale = (w - 160) / span;
  const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
  const px = (lon: number) => w / 2 + (mx(lon) - cx) * scale;
  const py = (lat: number) => h / 2 + (my(lat) - cy) * scale;
  // The graticule, at a step that draws a few lines each way.
  const lonSpan = (w / scale) * 360;
  const step = STEPS.find((d) => lonSpan / d <= 6) ?? 90;
  const [west, east] = [cx * 360 - 180 - lonSpan / 2, cx * 360 - 180 + lonSpan / 2];
  for (let lon = Math.ceil(west / step) * step; lon <= east; lon += step) out += `<path d="M${r(px(lon))} 0V${h}" stroke="${LINE}" stroke-width="1"/>`;
  const latOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * (cy + (y - h / 2) / scale)))) * 180) / Math.PI;
  const [south, north] = [latOf(h), latOf(0)];
  for (let lat = Math.ceil(south / step) * step; lat <= north; lat += step) out += `<path d="M0 ${r(py(lat))}H${w}" stroke="${LINE}" stroke-width="1"/>`;
  const at = s.map((p) => [px(p.lon), py(p.lat)] as const);
  const shown = Math.min(s.length, upTo);
  if (shown > 1 && v.linked)
    out += `<polyline points="${at
      .slice(0, shown)
      .map(([x, y]) => `${r(x)},${r(y)}`)
      .join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>`;
  s.slice(0, shown).forEach((p, i) => {
    const [x, y] = at[i];
    out += `<circle cx="${r(x)}" cy="${r(y)}" r="13" fill="${ACCENT}" stroke="#fff" stroke-width="2"/>` + text(x, y + 4.5, String(i + 1), { px: 13, bold: true, fill: '#fff', anchor: 'middle' });
    // The name beside its pin, on a white edge so the lines do not swallow it.
    const name = clip(p.name, 150, 13, true);
    if (name)
      out += `<text x="${r(x + 18)}" y="${r(y + 4.5)}" font-size="13" font-weight="600" fill="#18181b" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${xml(name)}</text>`;
  });
  return out;
}

/** The route as a page: the map, then the stops in order with their notes and legs, and the total. Small: the map alone. */
export function tripPage(doc: Doc, small = false, upTo = Infinity): Page {
  const v = readTrip(doc);
  const W = 720;
  const [MW, MH] = [W - 48, small ? 420 : 340];
  const alt = v.stops.length ? v.stops.map((s, i) => `${i + 1}. ${s.name || `${s.lat}, ${s.lon}`}`).join('; ') : undefined;
  if (!v.stops.length)
    return { w: W, h: small ? 468 : 120, svg: small ? `<svg x="24" y="24" width="${MW}" height="${MH}">${mapSvg(v, MW, MH)}</svg>` : text(W / 2, 66, '–', { px: 16, fill: MUTED, anchor: 'middle' }) };
  let svg = `<svg x="24" y="24" width="${MW}" height="${MH}" viewBox="0 0 ${MW} ${MH}">${mapSvg(v, MW, MH, upTo)}</svg>` + rect(24, 24, MW, MH, 'none', `stroke="${LINE}" rx="2"`);
  if (small) return { w: W, h: MH + 48, svg, alt };
  let y = MH + 44;
  v.stops.forEach((s, i) => {
    if (i && v.linked) svg += text(W - 40, y + 4, formatLeg(distanceKm(v.stops[i - 1], s), v.units), { px: 13, fill: MUTED, anchor: 'end' });
    y += 26;
    svg += text(40, y, `${i + 1}.  ${clip(s.name || `${s.lat}, ${s.lon}`, W - 220, 17, true)}`, { px: 17, bold: true });
    if (s.note) {
      y += 22;
      svg += text(66, y, clip(s.note, W - 110, 14), { px: 14, fill: FAINT });
    }
    svg += `<line x1="40" y1="${y + 12}" x2="${W - 40}" y2="${y + 12}" stroke="${LINE}"/>`;
    y += 8;
  });
  if (v.stops.length > 1 && v.linked) {
    y += 30;
    svg += text(W - 40, y, formatLeg(routeKm(v.stops), v.units), { px: 15, bold: true, anchor: 'end' });
  }
  return { w: W, h: y + 28, svg, alt };
}

/** GPX 1.1: each stop a waypoint, and the stops in order a route. */
export function tripToGpx(doc: Doc): string {
  const v = readTrip(doc);
  const pt = (tag: string, s: TripView['stops'][number], i: number) =>
    `<${tag} lat="${s.lat.toFixed(5)}" lon="${s.lon.toFixed(5)}"><name>${xml(s.name || String(i + 1))}</name>${s.note ? `<desc>${xml(s.note)}</desc>` : ''}</${tag}>`;
  const name = doc.head.title || routeName(v) || 'Trip';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TinyLittleOffice" xmlns="http://www.topografix.com/GPX/1/1">\n${v.stops.map((s, i) => pt('wpt', s, i)).join('\n')}\n<rte><name>${xml(name)}</name>\n${v.stops.map((s, i) => pt('rtept', s, i)).join('\n')}\n</rte>\n</gpx>\n`;
}

/** GeoJSON (RFC 7946): a point a stop, and, for a route, the line through them first. */
export function tripToGeoJson(doc: Doc): string {
  const v = readTrip(doc);
  const features: unknown[] = v.stops.map((s, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    properties: { name: s.name || String(i + 1), note: s.note, order: i + 1 },
  }));
  if (v.stops.length > 1 && v.linked)
    features.unshift({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: v.stops.map((s) => [s.lon, s.lat]) },
      properties: { name: doc.head.title || routeName(v), km: Math.round(routeKm(v.stops) * 10) / 10 },
    });
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n';
}
