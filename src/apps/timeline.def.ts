/**
 * Timeline: what happened, in order, along one line. Each event is a dot on
 * the axis with its words in a box above or below it, turn about; a long
 * timeline grows wider, never winds down the page. When every "When" is a
 * year or a date, in order, the dots are spaced as the years were.
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

/** Where each dot goes along the axis: as the years fall when they are known and in order, else evenly; never closer than GAP. */
export function places(whens: string[]): number[] {
  const t = whens.map(moment);
  const n = t.length;
  const dated = n > 1 && t.every((v) => Number.isFinite(v)) && t.every((v, i) => !i || v >= t[i - 1]) && t[n - 1] > t[0];
  const span = (n - 1) * GAP * 1.6;
  const xs = t.map((v, i) => (dated ? ((v - t[0]) / (t[n - 1] - t[0])) * span : i * GAP * 1.4));
  for (let i = 1; i < n; i++) xs[i] = Math.max(xs[i], xs[i - 1] + GAP);
  return xs;
}

function layout(text: string): Diagram {
  const events = readLines(text, form).filter((r) => r.kind === 0).map((r) => r.values);
  if (!events.length) return frame([]);
  const xs = places(events.map(([when]) => when));
  const shapes: Shape[] = [];
  const joins: Shape[] = [];
  // The axis: from a little before the first dot to a little after the last.
  shapes.push(shape('l', xs[0] - 48, AXIS, xs[xs.length - 1] - xs[0] + 96, 0));
  events.forEach(([when, what = ''], i) => {
    const x = xs[i];
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
  hint: 'An event per line, in order: "- When: what happened". Years and dates are spaced as they fell.',
  example:
    '- 1843: Lovelace publishes her notes\n- 1936: Turing describes his machine\n- 1945: ENIAC is switched on\n- 1969: The first ARPANET message\n- 1976: The Apple I\n- 1989: The web is proposed\n- 2007: The phone becomes a computer\n- 2022: Everyone talks to a machine',
  layout,
};

export default defineDiagram({ id: 'timeline', name: 'Timeline', icon: 'timeline', blurb: 'A timeline: events in order along a line, spaced as they happened.', read: readItems(form) }, spec);
