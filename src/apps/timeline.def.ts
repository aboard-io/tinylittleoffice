/**
 * Timeline: what happened, in order, along one line. Each event is a dot on
 * the axis with its words in a box above or below it, turn about; a long
 * timeline grows wider, never winds down the page. When every "When" is a
 * year or a date, in order, the dots are spaced as the years were, and an
 * event whose When is a span ("1990–1999") is an era: a band at the foot, as
 * long as its years.
 */
import { readLines, type Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, shape, join, readItems, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import type { Shape } from '../lib/drawmodel.ts';

const form: LineKind[] = [{ name: 'Event', is: '- {When}: {What happened}' }];

const BOX_W = 150;
const BOX_H = 64;
/** The least room between two dots: boxes on the same side are two of these apart, so they never touch. */
const GAP = 96;
const AXIS = 150;

/**
 * "When" as a point in time, in years: "1969", "1969-07-20", "July 1969",
 * "44 BC"; NaN for anything else ("Then", "Day one").
 */
export function moment(when: string): number {
  const w = when.trim();
  const iso = /^(-?\d{1,4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(w);
  if (iso) return +iso[1] + (+iso[2] - 1) / 12 + (iso[3] ? (+iso[3] - 1) / 365 : 0);
  const year = /^(?:[A-Za-z]+\.?\s+)?(\d{1,4})\s*(BC|BCE|AD|CE)?$/i.exec(w);
  if (!year) return NaN;
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const m = months.indexOf(w.slice(0, 3).toLowerCase());
  const y = +year[1] * (/^bc/i.test(year[2] ?? '') ? -1 : 1);
  return y + (m >= 0 ? m / 12 : 0);
}

/** "When" as a span of time, "1990–1999" or "1990 - 1999" (a dash between two moments, the second later): its two ends in years, or null. */
export function era(when: string): [number, number] | null {
  const m = /^(.+?)\s*(?:[–—]|\s-\s|(?<=^\d{1,4})-(?=\d{1,4}$))\s*(.+)$/.exec(when.trim());
  if (!m) return null;
  const [a, b] = [moment(m[1]), moment(m[2])];
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? [a, b] : null;
}

/** Moments that make a scale: two or more, none before the one written above it, the last after the first. */
const ordered = (ts: number[]) => ts.length > 1 && ts.every((v, i) => !i || v >= ts[i - 1]) && ts[ts.length - 1] > ts[0];

/**
 * Where each dot goes along the axis: as the years fall when they are known
 * and in order, else evenly; never closer than GAP. A When that is not a
 * year among ones that are ("Soon", or one still being typed) goes a GAP
 * after the dot before it.
 */
export function places(whens: string[]): number[] {
  const t = whens.map(moment);
  const known = t.filter(Number.isFinite);
  const dated = ordered(known);
  const [t0, t1] = [known[0], known[known.length - 1]];
  const span = (whens.length - 1) * GAP * 1.6;
  const xs = t.map((v, i) => (dated ? (Number.isFinite(v) ? ((v - t0) / (t1 - t0)) * span : -Infinity) : i * GAP * 1.4));
  xs[0] = Math.max(xs[0], 0);
  for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + GAP);
  return xs;
}

function layout(text: string): Diagram {
  const rows = readLines(text, form).filter((r) => r.kind === 0).map((r) => r.values);
  if (!rows.length) return frame([]);
  const spans = rows.map(([when]) => era(when));
  const events = rows.filter((_, i) => !spans[i]);
  const xs = places(events.map(([when]) => when));
  // The events whose years are known, and where they fall: eras need these, in order, to have a place; otherwise they
  // are events like the rest.
  const known = events.map(([when], i) => [moment(when), xs[i]]).filter(([t]) => Number.isFinite(t));
  const dated = ordered(known.map(([t]) => t));
  const eras = dated ? spans.map((s, i) => (s ? { span: s, what: rows[i][1] ?? '', when: rows[i][0] } : null)).filter((e) => e !== null) : [];
  if (!dated) rows.forEach((r, i) => spans[i] && events.push(r));
  // A moment's place among the known ones: between the two it falls between, or beyond the ends at the pace of the nearest pair.
  const at = (t: number) => {
    let i = known.findIndex((_, k) => k < known.length - 1 && t <= known[k + 1][0]);
    if (i < 0) i = known.length - 2;
    const [[ta, xa], [tb, xb]] = [known[i], known[i + 1]];
    return xa + ((t - ta) / (tb - ta || 1)) * (xb - xa);
  };
  const shapes: Shape[] = [];
  const joins: Shape[] = [];
  const ends = [...xs, ...eras.flatMap((e) => [at(e.span[0]), at(e.span[1])])];
  const [x0, x1] = [Math.min(...ends), Math.max(...ends)];
  // The axis: from a little before the first dot to a little after the last.
  shapes.push(shape('l', x0 - 48, AXIS, x1 - x0 + 96, 0));
  // Each era a tinted band at the foot, as long as its years, named on it.
  eras.forEach((e, i) => {
    const [a, b] = [at(e.span[0]), at(e.span[1])];
    shapes.push(shape('o', a, AXIS + 40 + BOX_H + 16, Math.max(GAP / 2, b - a), 30, e.what ? `${e.when} | ${e.what}` : e.when, 1, COLOR_CYCLE[(events.length + i) % COLOR_CYCLE.length]));
  });
  events.forEach(([when, what = ''], i) => {
    const x = xs[i] ?? xs[xs.length - 1];
    const c = COLOR_CYCLE[i % COLOR_CYCLE.length];
    const above = i % 2 === 0;
    // A dot on the axis, its box above or below, and a tick between them.
    const dot = shapes.push(shape('e', x - 8, AXIS - 8, 16, 16, '', 2, c)) - 1;
    const box = shapes.push(shape('o', x - BOX_W / 2, above ? AXIS - 40 - BOX_H : AXIS + 40, BOX_W, BOX_H, what ? `${when} | ${what}` : when, 1, c)) - 1;
    joins.push(join(dot, box, false, '', c));
  });
  return frame([...shapes, ...joins]);
}

export const spec = {
  form,
  hint: 'An event per line, in order: "- When: what happened". Years and dates are spaced as they fell; a span ("- 1990–1999: The web\'s first decade") is a band along the line.',
  example:
    '- 1843: Lovelace publishes her notes\n- 1936: Turing describes his machine\n- 1945: ENIAC is switched on\n- 1969: The first ARPANET message\n- 1976: The Apple I\n- 1989: The web is proposed\n- 2007: The phone becomes a computer\n- 2022: Everyone talks to a machine\n- 1969–2007: The network grows',
  layout,
};

export default defineDiagram({ id: 'timeline', name: 'Timeline', icon: 'timeline', blurb: 'A timeline: events in order along a line, spaced as they happened.', read: readItems(form) }, spec);
