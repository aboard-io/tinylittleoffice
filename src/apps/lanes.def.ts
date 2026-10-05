/** Swimlanes: steps in order, each in the lane of whoever does it. */
import { defineDiagram, frame, join, shape, PALETTE, type Diagram } from '../lib/diagram.ts';
import type { Shape } from '../lib/drawmodel.ts';

const LABEL = 120;
const COL = 176;
const ROW = 88;

function layout(text: string): Diagram {
  const steps = text
    .split('\n')
    .map((l) => /^\s*([^:]+):\s*(.+)$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ lane: m[1].trim(), text: m[2].trim() }));
  const lanes = [...new Set(steps.map((s) => s.lane))];
  if (!steps.length) return frame([]);
  const width = LABEL + steps.length * COL + 12;
  // The lanes lie behind everything: a band and its name each.
  const bands: Shape[] = lanes.flatMap((lane, i) => [shape('r', 0, i * ROW, width, ROW - 8, '', 1, PALETTE[i % PALETTE.length]), shape('t', 8, i * ROW + (ROW - 8) / 2 - 12, LABEL - 12, 24, lane, 0, PALETTE[i % PALETTE.length])]);
  const first = bands.length;
  // A step that asks a question is a decision.
  const boxes = steps.map((s, i) => shape(s.text.endsWith('?') ? 'd' : 'o', LABEL + i * COL + 12, lanes.indexOf(s.lane) * ROW + 14, COL - 28, ROW - 36, s.text));
  return frame([...bands, ...boxes, ...steps.slice(1).map((_, i) => join(first + i, first + i + 1))]);
}

export const spec = {
  hint: 'One step per line, in order: "Who: what they do". A step ending in "?" is drawn as a decision.',
  example: 'Customer: Places order\nSales: Checks stock\nSales: In stock?\nWarehouse: Packs it\nCourier: Delivers\nCustomer: Signs for it',
  layout,
};

export default defineDiagram({ id: 'lanes', group: 'Visualization', under: 'draw', name: 'Swimlanes', icon: 'lanes', blurb: 'A process, step by step, with a lane for each person or team that acts.' }, spec);
