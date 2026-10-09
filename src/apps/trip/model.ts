/**
 * A trip as a view of the document, and its commands as operations (docs/kernel.md §3; ported from the old
 * tree's lib/tripmodel.ts). The route is a table, a stop a row, its place in decimal degrees; the head says
 * how the legs are measured (`units: km` or `units: miles`; without it, hours of driving) and whether the
 * stops are a route at all (`route: dots`: places that stand alone, no line between them, no legs):
 *
 *   ---
 *   units: km
 *   ---
 *   Place | Lat:number | Lon:number | Note
 *   --- | --- | --- | ---
 *   Lisbon | 38.7223 | -9.1393 | Pastel de nata first
 *
 * Columns are found by name in any order (Place, Name, Stop or Where; Lat; Lon, Lng or Long; Note), so a
 * table pasted from elsewhere is a trip as it is. A stop added is `rows` at the table's end (the table's
 * birth a `splice`); its name, note or place changed is `cells`; moved, `rows` out and `rows` back in; taken
 * away, `rows`; a Note column wanted and missing is `cols`. Units and dots are `head`. Words that are not a
 * table but say where (`38.7223, -9.1393, Lisbon | a note`, `Porto (41.1579, -8.6291)`) become the table in
 * one splice as they arrive (`tabulate`). Nothing here touches the DOM.
 */
import { column, columnsOf, plainText, type Doc, type Op, type TableBlock } from '../../doc/index.ts';
import { language } from '../../kit/i18n.ts';

export interface Stop {
  /** Its row in the table. */
  row: number;
  lat: number;
  lon: number;
  name: string;
  note: string;
}
export type Units = 'h' | 'm' | 'k';
/** Where each field is in the table, -1 for one it has not got. */
export interface Cols {
  name: number;
  lat: number;
  lon: number;
  note: number;
}
export interface TripView {
  /** The table's block index, -1 while there is none. */
  at: number;
  cols: Cols;
  /** The rows that are places, in order; a row whose degrees are not a place is left out (and left alone). */
  stops: Stop[];
  units: Units;
  /** Joined in order (a route), or dots. */
  linked: boolean;
  /** No table, but words that say where: the editor makes them the table. */
  loose: boolean;
}

export const MAX_STOPS = 40;
export const TRIP_HEAD = ['Place', 'Lat:number', 'Lon:number', 'Note'];

/** Degrees to five places, about a metre: as short as that allows. */
export const deg = (n: number) => String(Math.round(n * 1e5) / 1e5);
export const valid = (lat: number, lon: number) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const flat = (s: string) => s.replace(/\n/g, ' ').trim();

const UNIT_WORD: Record<Units, string | undefined> = { h: undefined, m: 'miles', k: 'km' };
export const unitsOf = (word: string | undefined): Units => (/^(miles|mi)$/i.test(word ?? '') ? 'm' : /^(km|kilometres|kilometers)$/i.test(word ?? '') ? 'k' : 'h');
export const linkedOf = (word: string | undefined): boolean => !/^(dots|no|none|off)$/i.test(word ?? '');

/** The trip's table: the first whose columns say where. */
export function tripAt(doc: Doc): number {
  return doc.blocks.findIndex((b) => b.k === 'table' && colsOf(b).lat >= 0 && colsOf(b).lon >= 0);
}
export function colsOf(b: TableBlock): Cols {
  const [name, lat, lon, note] = columnsOf(b, /^(place|name|stop|where)$/, /^(lat|latitude)$/, /^(lon|lng|long|longitude)$/, /^(notes?|description|desc)$/);
  return { name, lat, lon, note };
}
function tableStops(b: TableBlock, c: Cols): Stop[] {
  return b.rows.flatMap((r, row) => {
    const [lat, lon] = [parseFloat(r[c.lat]), parseFloat(r[c.lon])];
    return valid(lat, lon) ? [{ row, lat, lon, name: c.name >= 0 ? flat(r[c.name] ?? '') : '', note: c.note >= 0 ? flat(r[c.note] ?? '') : '' }] : [];
  });
}

export function readTrip(doc: Doc): TripView {
  const at = tripAt(doc);
  const units = unitsOf(doc.head.units);
  const linked = linkedOf(doc.head.route);
  if (at < 0) return { at, cols: { name: -1, lat: -1, lon: -1, note: -1 }, stops: [], units, linked, loose: looseStops(doc).stops.length > 0 };
  const b = doc.blocks[at] as TableBlock;
  const cols = colsOf(b);
  return { at, cols, stops: tableStops(b, cols), units, linked, loose: false };
}

/* ---------- loose words, made a table ---------- */

/** Stops as a person or a model writes them in words, and a line saying how the legs are measured. */
function looseStops(doc: Doc): { stops: Omit<Stop, 'row'>[]; units?: Units } {
  const stops: Omit<Stop, 'row'>[] = [];
  let units: Units | undefined;
  for (const b of doc.blocks) {
    if (b.k !== 'li' && b.k !== 'p') continue;
    const lines = plainText(b.runs).split('\n');
    lines.forEach((line, i) => {
      const said = /^\s*(miles|mi|km|kilometres|kilometers|hours)\s*$/i.exec(line);
      if (said) return void (units = unitsOf(said[1]));
      const a = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*(?:,\s*([^|]*))?(?:\|\s*(.*))?$/.exec(line);
      const n = /^(.*?)\s*\((-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)\)\s*(.*)$/.exec(line);
      const [lat, lon, name, note] = a ? [+a[1], +a[2], a[3] ?? '', a[4] ?? ''] : n ? [+n[2], +n[3], n[1], n[4]] : [NaN, NaN, '', ''];
      if (valid(lat, lon)) stops.push({ lat, lon, name: name.trim(), note: note.trim() });
      // A line of words under a stop (in its item, or the paragraph's next line) is its note.
      else if ((b.k === 'li' ? i > 0 : true) && stops.length && !stops[stops.length - 1].note && line.trim()) stops[stops.length - 1].note = line.trim();
    });
  }
  return { stops, units };
}
export const stopRow = (s: Pick<Stop, 'lat' | 'lon' | 'name' | 'note'>): string[] => [flat(s.name), deg(s.lat), deg(s.lon), flat(s.note)];
const tripTable = (rows: string[][]): TableBlock => ({ k: 'table', cols: TRIP_HEAD.map(column), rows });

/** Loose words that say where, as the one table they mean: one splice of every block, and the units said. */
export function tabulate(doc: Doc): Op[] {
  const { stops, units } = looseStops(doc);
  if (!stops.length || tripAt(doc) >= 0) return [];
  const ops: Op[] = [{ op: 'splice', at: 0, n: doc.blocks.length, blocks: [tripTable(stops.slice(0, MAX_STOPS).map(stopRow))] }];
  if (units && UNIT_WORD[units] !== doc.head.units) ops.push({ op: 'head', key: 'units', value: UNIT_WORD[units] });
  return ops;
}

/* ---------- the commands ---------- */

/** A row for a stop in the table's own columns ('' where it has none). */
function rowIn(b: TableBlock, c: Cols, s: Pick<Stop, 'lat' | 'lon' | 'name' | 'note'>): string[] {
  const row = b.cols.map(() => '');
  const put = (i: number, value: string) => i >= 0 && (row[i] = value);
  put(c.name, flat(s.name));
  put(c.lat, deg(s.lat));
  put(c.lon, deg(s.lon));
  put(c.note, flat(s.note));
  return row;
}
/** The table row a stop put after stop `after` goes in at (the table's end when there is no such stop). */
const rowAfter = (doc: Doc, v: TripView, after: number | null | undefined): number => {
  const s = after !== null && after !== undefined ? v.stops[after] : undefined;
  return s ? s.row + 1 : (doc.blocks[v.at] as TableBlock).rows.length;
};

/**
 * A stop after stop `after` (the route's end when none is given); the first is the table's birth, after whatever
 * else the document holds.
 */
export function addStop(doc: Doc, v: TripView, lat: number, lon: number, name = '', after: number | null = null): Op[] {
  if (v.stops.length >= MAX_STOPS || !valid(lat, lon)) return [];
  const s = { lat, lon, name, note: '' };
  if (v.at < 0) return [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [tripTable([stopRow(s)])] }];
  const b = doc.blocks[v.at] as TableBlock;
  const row = rowIn(b, v.cols, s);
  const r = rowAfter(doc, v, after);
  // A name with no Place column to go in: the column comes first, at the start.
  if (v.cols.name < 0 && name) return [{ op: 'cols', at: v.at, c: 0, n: 1, cols: [column('Place')] }, { op: 'rows', at: v.at, r, n: 1, rows: [[flat(name), ...row]] }];
  return [{ op: 'rows', at: v.at, r, n: 1, rows: [row] }];
}

/** The stop's name or note as typed. A note with no Note column makes one, at the end. */
export function setText(doc: Doc, v: TripView, s: Stop, field: 'name' | 'note', value: string): Op[] {
  const words = flat(value);
  if (words === s[field]) return [];
  const c = v.cols[field];
  if (c >= 0) return [{ op: 'cells', at: v.at, r: s.row, c, values: [[words]] }];
  const b = doc.blocks[v.at] as TableBlock;
  const where = field === 'name' ? 0 : b.cols.length;
  return [
    { op: 'cols', at: v.at, c: where, n: 1, cols: [column(field === 'name' ? 'Place' : 'Note')] },
    { op: 'cells', at: v.at, r: s.row, c: where, values: [[words]] },
  ];
}

/** The stop somewhere else (a pin dragged): its two cells. */
export function setPlace(v: TripView, s: Stop, lat: number, lon: number): Op[] {
  if (!valid(lat, lon)) return [];
  const ops: Op[] = [];
  if (deg(lat) !== deg(s.lat)) ops.push({ op: 'cells', at: v.at, r: s.row, c: v.cols.lat, values: [[deg(lat)]] });
  if (deg(lon) !== deg(s.lon)) ops.push({ op: 'cells', at: v.at, r: s.row, c: v.cols.lon, values: [[deg(lon)]] });
  return ops;
}

/** Stop `i` moved one place earlier or later: its row out, and in again where its neighbour's is. */
export const moveStop = (doc: Doc, v: TripView, i: number, by: -1 | 1): Op[] => moveStops(doc, v, i, i + 1, by);

/** Stops [from, to) moved one place earlier or later, past their neighbour: their rows out, and in again beside it. */
export function moveStops(doc: Doc, v: TripView, from: number, to: number, by: -1 | 1): Op[] {
  const chosen = v.stops.slice(from, to);
  const over = v.stops[by < 0 ? from - 1 : to];
  if (!chosen.length || !over || from < 0) return [];
  const b = doc.blocks[v.at] as TableBlock;
  const rows = chosen.map((s) => b.rows[s.row]);
  // Without the moved rows, the neighbour's row is where they go: before an earlier one, after a later one.
  const r = by < 0 ? over.row : over.row - chosen.length + 1;
  return [...removeStops(v, chosen.map((_, k) => from + k)), { op: 'rows', at: v.at, r, n: rows.length, rows }];
}

/** Stop `i` carried to just after stop `to` (a drag by its number). Where it lands in the route: `to`'s place, or the one after. */
export function putAfter(doc: Doc, v: TripView, i: number, to: number): { ops: Op[]; at: number } {
  const s = v.stops[i];
  const over = v.stops[to];
  if (!s || !over || i === to || i === to + 1) return { ops: [], at: i };
  const row = (doc.blocks[v.at] as TableBlock).rows[s.row];
  const r = over.row + 1 - (s.row < over.row ? 1 : 0);
  return { ops: [{ op: 'rows', at: v.at, r: s.row, n: 1 }, { op: 'rows', at: v.at, r, n: 1, rows: [row] }], at: i < to ? to : to + 1 };
}

/** Some stops taken away (by their places in the route): their rows, from the last up, so each index holds. */
export function removeStops(v: TripView, idx: number[]): Op[] {
  const rows = [...new Set(idx)].flatMap((i) => (v.stops[i] ? [v.stops[i].row] : [])).sort((a, b) => b - a);
  return rows.map((r): Op => ({ op: 'rows', at: v.at, r, n: 1 }));
}
export const removeStop = (v: TripView, s: Stop): Op[] => [{ op: 'rows', at: v.at, r: s.row, n: 1 }];

/** Stops [from, to) again, right after the last of them (never past the most a route holds). */
export function duplicateStops(doc: Doc, v: TripView, from: number, to: number): Op[] {
  const chosen = v.stops.slice(Math.max(0, from), to);
  if (!chosen.length || v.stops.length + chosen.length > MAX_STOPS) return [];
  const b = doc.blocks[v.at] as TableBlock;
  return [{ op: 'rows', at: v.at, r: chosen[chosen.length - 1].row + 1, n: chosen.length, rows: chosen.map((s) => [...b.rows[s.row]]) }];
}

/** Stops [from, to) as a table of their own (the clipboard's): the trip's columns, whatever the document's were. */
export const stopsTable = (v: TripView, from: number, to: number): TableBlock => tripTable(v.stops.slice(from, to).map(stopRow));

/** The places some blocks hold: a trip's table (ours, or one pasted from elsewhere), else words that say where. */
export function placesIn(doc: Doc): Omit<Stop, 'row'>[] {
  const v = readTrip(doc);
  return v.at >= 0 ? v.stops.map(({ lat, lon, name, note }) => ({ lat, lon, name, note })) : looseStops(doc).stops;
}

/**
 * Places pasted in as stops: in place of stops [from, to) when some are chosen, else after stop `after` (the route's
 * end when none). Says where the first of them sits in the route, and how many there are (a route holds 40 at most).
 */
export function pasteStops(doc: Doc, v: TripView, places: Omit<Stop, 'row'>[], at: { replace: [number, number] } | { after: number | null }): { ops: Op[]; at: number; n: number } | null {
  const gone = 'replace' in at ? v.stops.slice(at.replace[0], at.replace[1]) : [];
  const room = MAX_STOPS - v.stops.length + gone.length;
  const put = places.filter((p) => valid(p.lat, p.lon)).slice(0, Math.max(0, room));
  if (!put.length) return null;
  if (v.at < 0) return { ops: [{ op: 'splice', at: doc.blocks.length, n: 0, blocks: [tripTable(put.map(stopRow))] }], at: 0, n: put.length };
  const b = doc.blocks[v.at] as TableBlock;
  const rows = put.map((p) => rowIn(b, v.cols, p));
  if ('replace' in at && gone.length) {
    const [from] = at.replace;
    const ops = removeStops(v, gone.map((_, k) => from + k));
    return { ops: [...ops, { op: 'rows', at: v.at, r: gone[0].row, n: rows.length, rows }], at: from, n: put.length };
  }
  const after = 'after' in at ? at.after : null;
  const first = after !== null && v.stops[after] ? after + 1 : v.stops.length;
  return { ops: [{ op: 'rows', at: v.at, r: rowAfter(doc, v, after), n: rows.length, rows }], at: first, n: put.length };
}

export function setUnits(doc: Doc, u: Units): Op[] {
  return unitsOf(doc.head.units) === u && doc.head.units === UNIT_WORD[u] ? [] : [{ op: 'head', key: 'units', value: UNIT_WORD[u] }];
}
export function setLinked(doc: Doc, linked: boolean): Op[] {
  return linkedOf(doc.head.route) === linked ? [] : [{ op: 'head', key: 'route', value: linked ? undefined : 'dots' }];
}

/* ---------- distances ---------- */

/** Great-circle distance in kilometres. */
export function distanceKm(a: Pick<Stop, 'lat' | 'lon'>, b: Pick<Stop, 'lat' | 'lon'>): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function routeKm(stops: Pick<Stop, 'lat' | 'lon'>[]): number {
  let km = 0;
  for (let i = 1; i < stops.length; i++) km += distanceKm(stops[i - 1], stops[i]);
  return km;
}

/** A number with its unit, in the reader's language (the browser's own words for "km", "mi", "hr"). */
const unit = (n: number, u: string, digits = 0) => new Intl.NumberFormat(language(), { style: 'unit', unit: u, unitDisplay: 'short', maximumFractionDigits: digits }).format(n);

/**
 * Hours are a driving estimate, since stops are joined by straight lines: roads run about 1.3 times the
 * straight distance, at about 80 km/h.
 */
const driveHours = (km: number) => (km * 1.3) / 80;

/** A leg, or the whole route, in the trip's units. */
export function formatLeg(km: number, units: Units): string {
  if (units === 'k') return km < 1 ? unit(Math.round(km * 1000), 'meter') : unit(km < 100 ? Math.round(km * 10) / 10 : Math.round(km), 'kilometer', 1);
  if (units === 'm') {
    const mi = km / 1.609344;
    return mi < 0.2 ? unit(Math.round(mi * 5280), 'foot') : unit(mi < 100 ? Math.round(mi * 10) / 10 : Math.round(mi), 'mile', 1);
  }
  const min = Math.round(driveHours(km) * 60);
  return min < 60 ? unit(Math.max(1, min), 'minute') : [unit(Math.floor(min / 60), 'hour'), ...(min % 60 ? [unit(min % 60, 'minute')] : [])].join(' ');
}

/** "Lisbon to Porto": the first and last named stops; the one name; or ''. */
export function routeName(v: TripView): string {
  const named = v.stops.filter((s) => s.name);
  return named.length > 1 ? `${named[0].name} – ${named[named.length - 1].name}` : (named[0]?.name ?? '');
}

