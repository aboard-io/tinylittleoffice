/**
 * Trip document model: a route as an ordered list of stops, each with a name
 * and a note.
 * Format: one stop per line: "<lat>,<lon>,<name>" and, if there is a note, a
 * tab and the note. Coordinates are degrees times 100,000 (about a metre),
 * rounded, in signed base 36.
 */
export interface Stop {
  lat: number;
  lon: number;
  name: string;
  note: string;
}

export const MAX_STOPS = 40;
const SCALE = 1e5;

const enc = (deg: number) => Math.round(deg * SCALE).toString(36);
const dec = (s: string) => parseInt(s, 36) / SCALE;

export function parseTrip(text: string): Stop[] {
  const out: Stop[] = [];
  if (!text) return out;
  for (const line of text.split('\n')) {
    const tab = line.indexOf('\t');
    const head = tab < 0 ? line : line.slice(0, tab);
    const parts = head.split(',');
    if (parts.length < 2) continue;
    const lat = dec(parts[0]);
    const lon = dec(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    out.push({ lat, lon, name: parts.slice(2).join(','), note: tab < 0 ? '' : line.slice(tab + 1) });
  }
  return out;
}

export function serializeTrip(stops: Stop[]): string {
  const flat = (s: string) => s.replace(/[\n\t]/g, ' ');
  return stops.map((s) => `${enc(s.lat)},${enc(s.lon)},${flat(s.name)}${s.note.trim() ? '\t' + flat(s.note) : ''}`).join('\n');
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
