import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { templates } from '../../../src/apps/sheet/templates.ts';
import { readSheet } from '../../../src/apps/sheet/model.ts';
import { parse } from '../../../src/doc/index.ts';
import { chartOfSheet } from '../../../src/apps/sheet/view.ts';
import { CHART_KINDS, chartPage, suggestChart, type ChartKind } from '../../../src/kit/draw/chart.ts';
import { pageSvg } from '../../../src/kit/draw/draw.ts';

/**
 * Charts from a table with no setup (kit/draw/chart.ts): the first column the labels, every other column of numbers a
 * series, From | To | Amount a Sankey. Drawn as SVG, the same under node as in a page. The tables are the
 * Spreadsheet's templates that ask for a chart, read as the Spreadsheet reads them (`chartOfSheet`).
 */
const charted = templates().filter((t) => readSheet(parse(t.doc)).table.chart);

interface ChartArgs {
  template: string;
  kind: ChartKind | 'own';
  title: string;
  w: number;
  h: number;
}

const meta = {
  title: 'Kit/Draw/Charts',
  args: { template: (charted.find((t) => t.id === 'months') ?? charted[0])?.id ?? '', kind: 'own', title: '', w: 720, h: 440 },
  argTypes: {
    template: { control: 'select', options: charted.map((t) => t.id), description: 'A Spreadsheet template with a chart' },
    kind: { control: 'select', options: ['own', ...CHART_KINDS.map((k) => k.id)], description: 'The kind drawn: the template’s own, or one of CHART_KINDS' },
    w: { control: { type: 'range', min: 240, max: 1200, step: 40 } },
    h: { control: { type: 'range', min: 160, max: 800, step: 40 } },
  },
  render: (args) => {
    const v = readSheet(parse(charted.find((t) => t.id === args.template)!.doc));
    const data = chartOfSheet(v);
    const kind = args.kind === 'own' ? v.table.chart || suggestChart(data) || 'bar' : args.kind;
    const page = chartPage(data, kind, args.title, args.w, args.h);
    return html`<div class="sb-picture" style="max-width: ${args.w}px">${unsafeSVG(pageSvg(page))}</div>
      <p class="sb-caption">${page.alt}</p>`;
  },
} satisfies Meta<ChartArgs>;
export default meta;

export const Chart: StoryObj<ChartArgs> = {};
/** Every kind over the same table. */
export const EveryKind: StoryObj<ChartArgs> = {
  render: (args) => {
    const data = chartOfSheet(readSheet(parse(charted.find((t) => t.id === args.template)!.doc)));
    return html`<div class="sb-row">
      ${CHART_KINDS.map((k) => html`<figure class="sb-template"><div class="sb-picture">${unsafeSVG(pageSvg(chartPage(data, k.id, k.name(), 480, 320)))}</div></figure>`)}
    </div>`;
  },
};
