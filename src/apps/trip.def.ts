/** Trip: what the shell knows about routes. Format: lib/tripmodel.ts. */
import { defineApp, utf8, xml, text, clip, r, ACCENT, LINE, MUTED, SHADE, rect, type Page } from '../kit/core.ts';
import { distanceKm, formatLeg, parseTrip, routeKm, tripUnits } from '../lib/tripmodel.ts';

const x = xml;

const title = (body: string) => {
  const named = parseTrip(body).filter((s) => s.name.trim());
  return named.length > 1 ? `${named[0].name.trim()} to ${named[named.length - 1].name.trim()}` : named[0]?.name.trim() ?? '';
};
const titleOf = (_app: string, body: string) => title(body);

export function tripToGpx(body: string): string {
  const stops = parseTrip(body);
  const pt = (tag: string, s: (typeof stops)[number], i: number) =>
    `<${tag} lat="${s.lat.toFixed(5)}" lon="${s.lon.toFixed(5)}"><name>${x(s.name || `Stop ${i + 1}`)}</name>${s.note ? `<desc>${x(s.note)}</desc>` : ''}</${tag}>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TinyOffice" xmlns="http://www.topografix.com/GPX/1/1">\n${stops.map((s, i) => pt('wpt', s, i)).join('\n')}\n<rte><name>${x(titleOf('trip', body) || 'Trip')}</name>\n${stops.map((s, i) => pt('rtept', s, i)).join('\n')}\n</rte>\n</gpx>\n`;
}

export function tripToGeoJson(body: string): string {
  const stops = parseTrip(body);
  const features: unknown[] = stops.map((s, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name || `Stop ${i + 1}`, note: s.note, order: i + 1 } }));
  if (stops.length > 1) features.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map((s) => [s.lon, s.lat]) }, properties: { name: titleOf('trip', body), km: Math.round(routeKm(stops) * 10) / 10 } });
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n';
}


/** The route as a diagram: stops in their true positions, without a map behind them. */
function page(body: string): Page {
  const stops = parseTrip(body);
  const units = tripUnits(body);
  const W = 720;
  const MAP = 300;
  if (!stops.length) return { w: W, h: 120, svg: text(W / 2, 66, 'No stops yet', { px: 16, fill: MUTED, anchor: 'middle' }) };
  // Equirectangular, squeezed east-west by the cosine of the middle latitude.
  const k = Math.cos(((Math.min(...stops.map((s) => s.lat)) + Math.max(...stops.map((s) => s.lat))) / 2) * (Math.PI / 180));
  const xs = stops.map((s) => s.lon * k);
  const ys = stops.map((s) => -s.lat);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * ((W - 120) / (MAP - 80)), 1e-6);
  const px = (i: number) => W / 2 + ((xs[i] - (Math.min(...xs) + Math.max(...xs)) / 2) / span) * (W - 120);
  const py = (i: number) => 24 + MAP / 2 + ((ys[i] - (Math.min(...ys) + Math.max(...ys)) / 2) / span) * (W - 120);
  let svg = rect(24, 24, W - 48, MAP, SHADE, 'rx="10"');
  if (stops.length > 1) svg += `<polyline points="${stops.map((_, i) => `${r(px(i))},${r(py(i))}`).join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>`;
  stops.forEach((_, i) => (svg += `<circle cx="${r(px(i))}" cy="${r(py(i))}" r="13" fill="${ACCENT}" stroke="#fff" stroke-width="2"/>` + text(px(i), py(i) + 5, String(i + 1), { px: 13, bold: true, fill: '#fff', anchor: 'middle' })));
  let y = MAP + 44;
  stops.forEach((s, i) => {
    if (i) svg += text(W - 40, y + 4, formatLeg(distanceKm(stops[i - 1], s), units), { px: 13, fill: MUTED, anchor: 'end' });
    svg += text(40, (y += 26), `${i + 1}.  ${clip(s.name || `Stop ${i + 1}`, W - 220, 17, true)}`, { px: 17, bold: true });
    if (s.note) svg += text(66, (y += 22), clip(s.note, W - 110, 14), { px: 14, fill: MUTED });
    svg += `<line x1="40" y1="${y + 12}" x2="${W - 40}" y2="${y + 12}" stroke="${LINE}"/>`;
    y += 8;
  });
  if (stops.length > 1) svg += text(W - 40, (y += 30), `Total ${formatLeg(routeKm(stops), units)}`, { px: 15, bold: true, anchor: 'end' });
  return { w: W, h: y + 28, svg };
}

export default defineApp({
  id: 'trip',
  name: 'Trip',
  icon: 'trip',
  blurb: 'A route on an OpenStreetMap map: stops in order, each with a note.',
  title,
  outline(body) {
    const stops = parseTrip(body);
    return [...stops.map((s, i) => `${i + 1}.  ${s.name || 'Stop'}`), ...(stops.length > 1 ? [formatLeg(routeKm(stops), tripUnits(body))] : [])];
  },
  view: (body) => [page(body)],
  // On a slide the map goes to each stop in turn, a click at a time.
  steps: (body) => parseTrip(body).length,
  build: 'click',
  html(body) {
    const stops = parseTrip(body);
    const units = tripUnits(body);
    return `<h1>${x(title(body) || 'Trip')}</h1>\n<ol>\n${stops
      .map((s, i) => `<li><strong>${x(s.name || `Stop ${i + 1}`)}</strong>${i ? ` <small>${x(formatLeg(distanceKm(stops[i - 1], s), units))} from the last stop</small>` : ''}${s.note ? `<br>${x(s.note)}` : ''} <small><a href="https://www.openstreetmap.org/?mlat=${s.lat}&amp;mlon=${s.lon}#map=14/${s.lat}/${s.lon}">map</a></small></li>`)
      .join('\n')}\n</ol>${stops.length > 1 ? `\n<p>Total: ${x(formatLeg(routeKm(stops), units))}</p>` : ''}`;
  },
  downloads: [
    { ext: 'gpx', label: 'GPX route', mime: 'application/gpx+xml', build: (b) => utf8(tripToGpx(b)) },
    { ext: 'geojson', label: 'GeoJSON', mime: 'application/geo+json', build: (b) => utf8(tripToGeoJson(b)) },
  ],
  shortcuts: [
    { keys: 'Enter', does: 'Search for the place being typed' },
    { keys: 'Alt+Up / Alt+Down', does: 'Move the stop earlier or later' },
  ],
});
