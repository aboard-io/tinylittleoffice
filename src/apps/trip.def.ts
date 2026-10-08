/** Trip: what the shell knows about routes. Format: lib/tripmodel.ts. */
import { defineApp, utf8, xml, text, clip, r, ACCENT, LINE, MUTED, SHADE, rect, type Page } from '../kit/core.ts';
import { distanceKm, formatLeg, parseTrip, readTrip, routeKm, tripUnits } from '../lib/tripmodel.ts';

const x = xml;

const title = (body: string) => {
  const named = parseTrip(body).filter((s) => s.name.trim());
  return named.length > 1 ? `${named[0].name.trim()} to ${named[named.length - 1].name.trim()}` : named[0]?.name.trim() ?? '';
};
const titleOf = (_app: string, body: string) => title(body);

export function tripToGpx(body: string): string {
  const stops = parseTrip(body);
  const pt = (tag: string, s: (typeof stops)[number], i: number) =>
    `<${tag} lat="${s.lat.toFixed(5)}" lon="${s.lon.toFixed(5)}"><name>${x(s.name || String(i + 1))}</name>${s.note ? `<desc>${x(s.note)}</desc>` : ''}</${tag}>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TinyLittleOffice" xmlns="http://www.topografix.com/GPX/1/1">\n${stops.map((s, i) => pt('wpt', s, i)).join('\n')}\n<rte><name>${x(titleOf('trip', body) || 'Trip')}</name>\n${stops.map((s, i) => pt('rtept', s, i)).join('\n')}\n</rte>\n</gpx>\n`;
}

export function tripToGeoJson(body: string): string {
  const stops = parseTrip(body);
  const features: unknown[] = stops.map((s, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { name: s.name || String(i + 1), note: s.note, order: i + 1 } }));
  if (stops.length > 1) features.unshift({ type: 'Feature', geometry: { type: 'LineString', coordinates: stops.map((s) => [s.lon, s.lat]) }, properties: { name: titleOf('trip', body), km: Math.round(routeKm(stops) * 10) / 10 } });
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n';
}


const TILE = 256;
/** Web Mercator: where a place falls, in pixels, on the world map at zoom z. */
const mx = (lon: number, z: number) => ((lon + 180) / 360) * TILE * 2 ** z;
const my = (lat: number, z: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

/**
 * The route on the map itself: OpenStreetMap's tiles, the line, the stops.
 * `upTo` stops of it while it builds: each arrives with its name on the map
 * and its note in the list below.
 */
function page(body: string, upTo = Infinity): Page {
  const stops = parseTrip(body);
  const units = tripUnits(body);
  const W = 720;
  const MW = W - 48;
  const MH = 340;
  if (!stops.length) return { w: W, h: 120, svg: text(W / 2, 66, 'No stops yet', { px: 16, fill: MUTED, anchor: 'middle' }) };
  // The closest zoom at which every stop is on the map with room to spare.
  let z = stops.length === 1 ? 12 : 15;
  const span = (zz: number) => [Math.max(...stops.map((s) => mx(s.lon, zz))) - Math.min(...stops.map((s) => mx(s.lon, zz))), Math.max(...stops.map((s) => my(s.lat, zz))) - Math.min(...stops.map((s) => my(s.lat, zz)))];
  while (z > 1 && (span(z)[0] > MW - 120 || span(z)[1] > MH - 100)) z--;
  const cx = (Math.max(...stops.map((s) => mx(s.lon, z))) + Math.min(...stops.map((s) => mx(s.lon, z)))) / 2;
  const cy = (Math.max(...stops.map((s) => my(s.lat, z))) + Math.min(...stops.map((s) => my(s.lat, z)))) / 2;
  const [ox, oy] = [cx - MW / 2, cy - MH / 2];
  const n = 2 ** z;
  let tiles = '';
  for (let ty = Math.floor(oy / TILE); ty * TILE < oy + MH; ty++)
    for (let tx = Math.floor(ox / TILE); tx * TILE < ox + MW; tx++)
      if (ty >= 0 && ty < n) tiles += `<image href="https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png" x="${r(tx * TILE - ox)}" y="${r(ty * TILE - oy)}" width="${TILE}" height="${TILE}"/>`;
  const at = (i: number): [number, number] => [mx(stops[i].lon, z) - ox, my(stops[i].lat, z) - oy];
  const seen = stops.slice(0, upTo);
  let map = rect(0, 0, MW, MH, SHADE) + tiles;
  if (seen.length > 1) map += `<polyline points="${seen.map((_, i) => at(i).map(r).join(',')).join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>`;
  seen.forEach((s, i) => {
    const [px, py] = at(i);
    const name = clip(s.name, 180, 13, true);
    map += `<circle cx="${r(px)}" cy="${r(py)}" r="13" fill="${ACCENT}" stroke="#fff" stroke-width="2"/>` + text(px, py + 4.5, String(i + 1), { px: 13, bold: true, fill: '#fff', anchor: 'middle' });
    // The name beside its pin, on a white plate so the map does not swallow it.
    if (name) map += `<text x="${r(px + 18)}" y="${r(py + 4.5)}" font-size="13" font-weight="700" fill="#18181b" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${x(name)}</text>`;
  });
  map += `<text x="${MW - 6}" y="${MH - 6}" font-size="10" text-anchor="end" fill="#3f3f46" stroke="#fff" stroke-width="3" paint-order="stroke">© OpenStreetMap contributors</text>`;
  let svg = `<svg x="24" y="24" width="${MW}" height="${MH}" viewBox="0 0 ${MW} ${MH}">${map}</svg>` + rect(24, 24, MW, MH, 'none', `stroke="${LINE}" rx="2"`);
  let y = MH + 44;
  stops.forEach((s, i) => {
    const on = i < upTo;
    if (i && on) svg += text(W - 40, y + 4, formatLeg(distanceKm(stops[i - 1], s), units), { px: 13, fill: MUTED, anchor: 'end' });
    y += 26;
    if (on) svg += text(40, y, `${i + 1}.  ${clip(s.name, W - 220, 17, true)}`.trimEnd(), { px: 17, bold: true });
    if (s.note) {
      y += 22;
      if (on) svg += text(66, y, clip(s.note, W - 110, 14), { px: 14, fill: MUTED });
    }
    if (on) svg += `<line x1="40" y1="${y + 12}" x2="${W - 40}" y2="${y + 12}" stroke="${LINE}"/>`;
    y += 8;
  });
  if (stops.length > 1) {
    y += 30;
    if (upTo >= stops.length) svg += text(W - 40, y, `Total ${formatLeg(routeKm(stops), units)}`, { px: 15, bold: true, anchor: 'end' });
  }
  return { w: W, h: y + 28, svg };
}

export default defineApp({
  id: 'trip',
  group: 'Plan',
  name: 'Trip',
  icon: 'trip',
  blurb: 'A route on an OpenStreetMap map: stops in order, each with a note.',
  title,
  outline(body) {
    const stops = parseTrip(body);
    return [...stops.map((s, i) => `${i + 1}.  ${s.name}`.trimEnd()), ...(stops.length > 1 ? [formatLeg(routeKm(stops), tripUnits(body))] : [])];
  },
  view: (body, opts = {}) => [page(body, opts.step)],
  read: readTrip,
  // On a slide the map goes to each stop in turn, a click at a time.
  steps: (body) => parseTrip(body).length,
  html(body) {
    const stops = parseTrip(body);
    const units = tripUnits(body);
    return `<h1>${x(title(body) || 'Trip')}</h1>\n<ol>\n${stops
      .map((s, i) => `<li><strong>${x(s.name || String(i + 1))}</strong>${i ? ` <small>${x(formatLeg(distanceKm(stops[i - 1], s), units))} from the last stop</small>` : ''}${s.note ? `<br>${x(s.note)}` : ''} <small><a href="https://www.openstreetmap.org/?mlat=${s.lat}&amp;mlon=${s.lon}#map=14/${s.lat}/${s.lon}">map</a></small></li>`)
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
