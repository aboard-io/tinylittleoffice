/**
 * Trip document model: a route as an ordered list of stops, each with a name
 * and a note. The route is a TLO table (lib/tlo.ts), a stop a row, its place
 * in decimal degrees; the header says whether the legs are measured in km or
 * miles (without it, in hours of driving).
 *
 *   ---
 *   units: km
 *   ---
 *   Place | Lat:number | Lon:number | Note
 *   --- | --- | --- | ---
 *   Lisbon | 38.70775 | -9.13659 | Pastel de nata first
 */
import { parse, write, column, type Block } from './tlo.ts';

export interface Stop {
  lat: number;
  lon: number;
  name: string;
  note: string;
}

export const MAX_STOPS = 40;
export const TRIP_HEAD = ['Place', 'Lat:number', 'Lon:number', 'Note'];

/** Degrees to five places, about a metre: as short as that allows. */
const deg = (n: number) => String(Math.round(n * 1e5) / 1e5);
const valid = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/** The stops of a table, its columns found by name in any order: Place (or Name, Stop), Lat, Lon, Note. */
function tableStops(b: Extract<Block, { k: 'table' }>): Stop[] | null {
  const names = b.head.map((h) => column(h).name.toLowerCase());
  const find = (...want: string[]) => names.findIndex((n) => want.includes(n));
  const [name, lat, lon, note] = [find('place', 'name', 'stop', 'where'), find('lat', 'latitude'), find('lon', 'lng', 'long', 'longitude'), find('note', 'notes', 'description', 'desc')];
  if (lat < 0 || lon < 0) return null;
  return b.rows.flatMap((r) => {
    const [y, x] = [parseFloat(r[lat]), parseFloat(r[lon])];
    return valid(y, x) ? [{ lat: y, lon: x, name: (r[name] ?? '').replace(/\n/g, ' ').trim(), note: note >= 0 ? r[note].replace(/\n/g, ' ').trim() : '' }] : [];
  });
}

export function parseTrip(text: string): Stop[] {
  for (const b of parse(text).blocks) if (b.k === 'table') return tableStops(b) ?? [];
  return [];
}

export function serializeTrip(stops: Stop[], units: Units = 'h'): string {
  if (!stops.length) return '';
  const flat = (s: string) => s.replace(/\n/g, ' ').trim();
  const rows = stops.map((s) => [flat(s.name), deg(s.lat), deg(s.lon), flat(s.note)]);
  return write({ head: units === 'h' ? {} : { units: UNIT_WORD[units] }, blocks: [{ k: 'table', head: TRIP_HEAD, rows }] }).trimEnd();
}

/**
 * A route as a person or a model writes it, made canonical: a table whose
 * columns are in another order (a CSV of stops is one), or lines of
 * "38.7223, -9.1393, Lisbon | a note" or "Lisbon (38.7223, -9.1393)",
 * listed or not, with the note on the line after. A line or a header of
 * "miles" or "km" says how the legs are measured.
 */
export function readTrip(text: string): string {
  const doc = parse(text);
  let units = unitsOf(doc.head.units);
  const stops: Stop[] = [];
  for (const b of doc.blocks) {
    if (b.k === 'table') {
      stops.push(...(tableStops(b) ?? []));
      continue;
    }
    if (b.k !== 'li' && b.k !== 'p') continue;
    for (const line of b.k === 'li' ? [b.text] : b.text.split('\n')) {
      const said = /^\s*(miles|mi|km|kilometres|kilometers|hours)\s*$/i.exec(line);
      if (said) {
        units = unitsOf(said[1]);
        continue;
      }
      const [first, ...more] = line.split('\n');
      const a = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*(?:,\s*([^|]*))?(?:\|\s*(.*))?$/.exec(first);
      const n = /^(.*?)\s*\((-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)\)\s*(.*)$/.exec(first);
      const [lat, lon, name, note] = a ? [+a[1], +a[2], a[3] ?? '', a[4] ?? ''] : n ? [+n[2], +n[3], n[1], n[4]] : [NaN, NaN, '', ''];
      if (valid(lat, lon)) stops.push({ lat, lon, name: name.trim(), note: [note, ...more].join(' ').trim() });
      // A line of words under a stop is its note.
      else if (b.k === 'p' && stops.length && !stops[stops.length - 1].note) stops[stops.length - 1].note = line.trim();
    }
  }
  return serializeTrip(stops, units);
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Pick<Stop, 'lat' | 'lon'>, b: Pick<Stop, 'lat' | 'lon'>): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function routeKm(stops: Stop[]): number {
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += distanceKm(stops[i - 1], stops[i]);
  return km;
}

export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString('en-US')} km`;
}

export type Units = 'h' | 'm' | 'k';
export const UNITS: { id: Units; name: string }[] = [
  { id: 'h', name: 'Hours' },
  { id: 'm', name: 'Miles' },
  { id: 'k', name: 'Kilometres' },
];

const UNIT_WORD: Record<Units, string> = { h: 'hours', m: 'miles', k: 'km' };
const unitsOf = (word: string | undefined): Units => (/^(miles|mi)$/i.test(word ?? '') ? 'm' : /^(km|kilometres|kilometers)$/i.test(word ?? '') ? 'k' : 'h');

/** How the legs are measured: the header's "units", hours without it. */
export const tripUnits = (text: string): Units => unitsOf(parse(text).head.units);

/**
 * Hours are a driving estimate, since stops are joined by straight lines:
 * roads run about 1.3 times the straight distance, at about 80 km/h.
 */
export const driveHours = (km: number) => (km * 1.3) / 80;

export function formatLeg(km: number, units: Units): string {
  if (units === 'k') return formatKm(km);
  if (units === 'm') {
    const mi = km / 1.609344;
    return mi < 0.2 ? `${Math.round(mi * 5280)} ft` : `${mi < 100 ? mi.toFixed(1) : Math.round(mi).toLocaleString('en-US')} mi`;
  }
  const min = Math.round(driveHours(km) * 60);
  return min < 60 ? `${Math.max(1, min)} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
}
