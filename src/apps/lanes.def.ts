/** Swimlanes: steps in order, each in the lane of whoever does it. */
import type { Kind as LineKind } from '../lib/lines.ts';
import { defineDiagram, frame, join, shape, COLOR_CYCLE, type Diagram } from '../lib/diagram.ts';
import type { Shape } from '../lib/drawmodel.ts';

const LABEL = 120;
const COL = 176;
const ROW = 88;

/** The lanes in order of first mention, and the steps; "Sales:" alone is a lane with nothing in it yet. */
function parse(text: string) {
  const lines = text
    .split('\n')
    .map((l) => /^\s*([^:]+):\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ lane: m[1].trim(), text: m[2].trim() }));
  return { lanes: [...new Set(lines.map((s) => s.lane))], steps: lines.filter((s) => s.text) };
}

function layout(text: string): Diagram {
  const { lanes, steps } = parse(text);
  if (!lanes.length) return frame([]);
  const width = LABEL + Math.max(1, steps.length) * COL + 12;
  // The lanes lie behind everything: a band and its name each.
  const bands: Shape[] = lanes.flatMap((lane, i) => [shape('r', 0, i * ROW, width, ROW - 8, '', 1, COLOR_CYCLE[i % COLOR_CYCLE.length]), shape('t', 8, i * ROW + (ROW - 8) / 2 - 12, LABEL - 12, 24, lane, 0, COLOR_CYCLE[i % COLOR_CYCLE.length])]);
  const first = bands.length;
  // A step that asks a question is a decision.
  const boxes = steps.map((s, i) => shape(s.text.endsWith('?') ? 'd' : 'o', LABEL + i * COL + 12, lanes.indexOf(s.lane) * ROW + 14, COL - 28, ROW - 36, s.text));
  return frame([...bands, ...boxes, ...steps.slice(1).map((_, i) => join(first + i, first + i + 1))]);
}

export const spec = {
  form: [
    { name: 'Step', is: '{Who}: {What they do}' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: 'One step per line, in order: "Who: what they do". A step ending in "?" is drawn as a decision.',
  example: 'Customer: Places order\nSales: Checks stock\nSales: In stock?\nWarehouse: Packs it\nCourier: Delivers\nCustomer: Signs for it',
  layout,
  // A tap in a lane's band adds a step to that lane; a step dropped in one moves there.
  keyAt(text: string, x: number, y: number) {
    const d = layout(text);
    const band = d.shapes.findIndex((s) => s.k === 'r' && !s.text && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
    return band >= 0 ? d.shapes[band + 1]?.text : undefined;
  },
};

export default defineDiagram({ id: 'lanes', name: 'Swimlanes', icon: 'lanes', blurb: 'A process, step by step, with a lane for each person or team that acts.' }, spec);
