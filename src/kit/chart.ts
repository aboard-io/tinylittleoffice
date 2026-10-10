/**
 * Charts from a table, with no setup: the first column is the labels, every other column of numbers is a
 * series, named by its column's name. A table of From | To | Amount is also a set of flows, drawn as a
 * Sankey. Drawn as SVG so a chart works wherever a picture does, under node as in a browser. (Ported from
 * the old tree's lib/chart.ts; d3-sankey is pinned exactly and is the one dependency: the Sugiyama-style
 * layering it does has no native counterpart.)
 */
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { Page } from './app.ts';
import { FAINT, INK, LINE, MUTED, SERIES, clip, patternDefs, patternFill, r, rect, text } from './draw.ts';
import { t } from './i18n.ts';

export type ChartKind = 'bar' | 'line' | 'pie' | 'sankey';
export const CHART_KINDS: { id: ChartKind; name: () => string }[] = [
  { id: 'bar', name: () => t('Bars') },
  { id: 'line', name: () => t('Lines') },
  { id: 'pie', name: () => t('Pie') },
  { id: 'sankey', name: () => t('Flows (Sankey)') },
];

export interface Flow {
  from: string;
  to: string;
  value: number;
}
export interface ChartData {
  labels: string[];
  series: { name: string; values: number[] }[];
  /** The rows that read as From | To | Amount: what a Sankey draws. */
  flows?: Flow[];
}

type Cell = number | string | null;

/** The From, To and Amount columns: those named so (From or Source; To or Target; Amount, Value or How much), else the first three. */
function flowColumns(names: string[]): [number, number, number] {
  const find = (re: RegExp, or: number) => {
    const i = names.findIndex((n) => re.test(n.trim()));
    return i < 0 ? or : i;
  };
  return [find(/^(from|source)$/i, 0), find(/^(to|target|into)$/i, 1), find(/^(amount|value|how much|flow)$/i, 2)];
}

/** The rows whose From and To are words and whose Amount is a number: each a flow from one thing to another. */
export function flowsOf(rows: Cell[][], names: string[] = []): Flow[] {
  const [f, to, a] = flowColumns(names);
  const word = (c: Cell): c is string => typeof c === 'string' && c.trim() !== '' && !c.startsWith('#');
  return rows.flatMap((row) => (word(row[f]) && word(row[to]) && typeof row[a] === 'number' && isFinite(row[a]) && row[a] > 0 ? [{ from: row[f].trim(), to: row[to].trim(), value: row[a] }] : []));
}

/** `names`: each column's name, for its series. */
export function chartData(rows: Cell[][], names: string[] = []): ChartData {
  const used = rows.filter((row) => row.some((c) => c !== null && c !== ''));
  const cols = Math.max(0, ...used.map((row) => row.length));
  const isNum = (c: Cell) => typeof c === 'number' && isFinite(c);
  const holdsNumbers = (c: number) => used.filter((row) => isNum(row[c])).length >= Math.max(1, used.filter((row) => row[c] !== null && row[c] !== '').length / 2);
  // The first column names each row, unless it is the only column of numbers there is.
  let numeric = Array.from({ length: cols }, (_, c) => c).filter((c) => c > 0 && holdsNumbers(c));
  const labelled = cols > 1 && numeric.length > 0;
  const flows = flowsOf(used, names);
  if (!numeric.length && holdsNumbers(0)) numeric = [0];
  if (!numeric.length) return { labels: [], series: [], flows };
  const body = used.filter((row) => numeric.some((c) => isNum(row[c])));
  return {
    labels: body.map((row, i) => (labelled ? String(row[0] ?? '') : String(i + 1))),
    series: numeric.map((c) => ({ name: names[c] ?? '', values: body.map((row) => (isNum(row[c]) ? (row[c] as number) : 0)) })),
    flows,
  };
}

/** The chart that suits the data, or '' if there is nothing to chart. */
export function suggestChart(d: ChartData): ChartKind | '' {
  // Things that flow on, from one to another to a third: a Sankey. (A table of Item | Kind | Cost is not that.)
  if (d.flows && d.flows.length >= 2 && d.flows.some((f) => d.flows!.some((g) => g.from === f.to))) return 'sankey';
  if (!d.series.length || !d.labels.length) return '';
  const first = d.series[0].values;
  // Parts of a whole: one series, a handful of positive numbers.
  if (d.series.length === 1 && first.length >= 2 && first.length <= 6 && first.every((v) => v > 0)) return 'pie';
  // Things in order (years, quarters, months, days) read best as lines.
  if (first.length >= 4 && d.labels.every((l) => /^(\d{4}|q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mon|tue|wed|thu|fri|sat|sun|week|day|month|year|y\d|m\d)/i.test(l.trim())))
    return 'line';
  return 'bar';
}

const short = (n: number) => {
  const a = Math.abs(n);
  const f = (v: number, s: string) => (Math.round(v * 10) / 10).toString() + s;
  return a >= 1e9 ? f(n / 1e9, 'B') : a >= 1e6 ? f(n / 1e6, 'M') : a >= 1e4 ? f(n / 1e3, 'k') : String(Math.round(n * 100) / 100);
};

/** A round-numbered scale that covers the data and always includes zero. */
function scale(values: number[]): { min: number; max: number; ticks: number[] } {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { min, max, ticks };
}

/** A shape in its series' colour, then again in its pattern (every series after the first has one), which `draw` is told it is drawing. */
function painted(i: number, draw: (fill: string, pattern: boolean) => string): string {
  const pattern = patternFill(i);
  return draw(SERIES[i % SERIES.length], false) + (pattern ? draw(pattern, true) : '');
}

/** A number as a Sankey labels it. */
const fmt = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : String(Math.round(n * 100) / 100));

interface SNode {
  name: string;
}
interface SLink {
  source: string;
  target: string;
  value: number;
  /** Where the flow stands in the table: what a slide reveals one of at a time. */
  i: number;
}

/**
 * Flows as a Sankey: a bar for each thing, as tall as what passes through it, in columns from where the
 * flows start to where they end; a band for each flow, as thick as its amount. d3-sankey orders the bars
 * and places the bands; this draws them. The first `upTo` flows are drawn, the layout the same however
 * many are, so a slide builds it without a jump. A flow that would turn back on itself (A to A, or closing
 * a loop) has no place in a flow diagram and is left out.
 */
export function sankeyPage(flows: Flow[], title = '', w = 720, h = 440, upTo = Infinity): Page {
  let svg = title ? text(w / 2, 34, clip(title, w - 80, 20, true), { px: 20, bold: true, anchor: 'middle' }) : '';
  const top = title ? 56 : 12;
  if (!flows.length) return { w, h, svg: svg + text(w / 2, h / 2, t('Nothing to chart yet: rows of From | To | Amount'), { px: 16, fill: FAINT, anchor: 'middle' }), alt: t('An empty chart') };
  // The things, in the order they are first named; the flows that keep moving forward.
  const names: string[] = [];
  const name = (n: string) => (names.includes(n) || names.push(n), n);
  const reaches = (from: string, to: string, links: SLink[]): boolean => from === to || links.some((l) => l.source === from && reaches(l.target, to, links));
  const links: SLink[] = [];
  flows.forEach((f, i) => {
    name(f.from);
    name(f.to);
    if (!reaches(f.to, f.from, links)) links.push({ source: f.from, target: f.to, value: f.value, i });
  });
  const nw = 14;
  const graph = sankey<SNode, SLink>()
    .nodeId((n) => n.name)
    .nodeWidth(nw)
    .nodePadding(14)
    .extent([
      [0, top],
      [w - 150, h - 12],
    ])({ nodes: names.map((n) => ({ name: n })), links });
  const path = sankeyLinkHorizontal<SNode, SLink>();
  const color = (n: SNode) => SERIES[names.indexOf(n.name) % SERIES.length];
  for (const l of graph.links) {
    if (l.i >= upTo) continue;
    svg += `<path d="${path(l)!.replace(/-?\d+\.\d+/g, (v) => String(r(+v)))}" fill="none" stroke="${color(l.source as SNode)}" stroke-opacity="0.35" stroke-width="${r(Math.max(1, l.width ?? 1))}"/>`;
  }
  for (const n of graph.nodes) {
    const nh = Math.max(2, n.y1! - n.y0!);
    svg += rect(n.x0!, n.y0!, nw, nh, color(n), 'rx="3"');
    const ly = n.y0! + Math.min(nh / 2, 60);
    svg += text(n.x0! + nw + 6, ly + 1, clip(n.name, 150, 12, true), { px: 12, bold: true, fill: INK }) + text(n.x0! + nw + 6, ly + 15, fmt(n.value ?? 0), { px: 12, fill: MUTED });
  }
  const shown = flows.slice(0, upTo);
  return { w, h, svg, alt: t('Flows: {list}.', { list: shown.map((f) => `${f.from} → ${f.to} ${fmt(f.value)}`).join('; ') }) };
}

/** A chart of the data, `w` by `h`. `upTo`: how many labels' worth (bars, points or slices) to draw, for building it up. */
export function chartPage(d: ChartData, kind: ChartKind, title = '', w = 720, h = 440, upTo = Infinity): Page {
  if (kind === 'sankey') return sankeyPage(d.flows ?? [], title, w, h, upTo);
  let svg = title ? text(w / 2, 34, clip(title, w - 80, 20, true), { px: 20, bold: true, anchor: 'middle' }) : '';
  const top = title ? 56 : 24;
  const legend = d.series.length > 1 || kind === 'pie';
  const bottom = h - (legend ? 64 : 40);
  if (!d.series.length) return { w, h, svg: svg + text(w / 2, h / 2, t('Nothing to chart yet'), { px: 16, fill: FAINT, anchor: 'middle' }), alt: t('An empty chart') };

  // Besides its colour, each series after the first wears a pattern, so they can be told apart in black and white.
  svg += `<defs>${patternDefs()}</defs>`;
  if (kind === 'pie') {
    const values = d.series[0].values.map((v) => Math.max(0, v));
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2;
    const cy = (top + bottom) / 2;
    const rad = Math.min(w, bottom - top) / 2 - 8;
    let a = -Math.PI / 2;
    values.forEach((v, i) => {
      const b = a + (v / total) * Math.PI * 2;
      if (i >= upTo) return void (a = b);
      const p = (ang: number, k = rad) => `${r(cx + Math.cos(ang) * k)} ${r(cy + Math.sin(ang) * k)}`;
      svg += painted(i, (fill, pattern) =>
        v >= total
          ? `<circle cx="${cx}" cy="${cy}" r="${r(rad)}" fill="${fill}"/>`
          : `<path d="M${cx} ${cy}L${p(a)}A${r(rad)} ${r(rad)} 0 ${b - a > Math.PI ? 1 : 0} 1 ${p(b)}Z" fill="${fill}"${pattern ? '' : ' stroke="#fff" stroke-width="2"'}/>`,
      );
      if (v / total >= 0.06)
        svg += text(cx + Math.cos((a + b) / 2) * rad * 0.62, cy + Math.sin((a + b) / 2) * rad * 0.62 + 5, `${Math.round((v / total) * 100)}%`, { px: 14, bold: true, fill: '#fff', anchor: 'middle' });
      a = b;
    });
  } else {
    const { min, max, ticks } = scale(d.series.flatMap((s) => s.values));
    const left = 64;
    const right = w - 24;
    const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
    for (const v of ticks)
      svg += `<line x1="${left}" y1="${r(y(v))}" x2="${right}" y2="${r(y(v))}" stroke="${v === 0 ? MUTED : LINE}"/>` + text(left - 8, y(v) + 4, short(v), { px: 12, fill: MUTED, anchor: 'end' });
    const n = d.labels.length;
    const band = (right - left) / n;
    const every = Math.ceil(n / Math.max(1, Math.floor((right - left) / 70)));
    d.labels.forEach((l, i) => {
      if (i % every === 0) svg += text(left + band * (i + 0.5), bottom + 20, clip(l, band * every - 6, 12), { px: 12, fill: MUTED, anchor: 'middle' });
    });
    d.series.forEach((s, k) => {
      if (kind === 'line') {
        const color = SERIES[k % SERIES.length];
        const pts = s.values.slice(0, upTo).map((v, i) => [r(left + band * (i + 0.5)), r(y(v))]);
        svg +=
          `<polyline points="${pts.map((pt) => pt.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"${['', ' stroke-dasharray="8 6"', ' stroke-dasharray="2 6"', ' stroke-dasharray="12 4 2 4"'][k % 4]}/>` +
          pts.map(([px, py]) => `<circle cx="${px}" cy="${py}" r="4" fill="${color}"/>`).join('');
      } else {
        const bw = (band * 0.76) / d.series.length;
        s.values
          .slice(0, upTo)
          .forEach((v, i) => (svg += painted(k, (fill) => rect(left + band * (i + 0.12) + bw * k, Math.min(y(v), y(0)), Math.max(1, bw - 2), Math.abs(y(v) - y(0)), fill, 'rx="2"'))));
      }
    });
  }
  if (legend) {
    // A pie's key is its slices, as many as are drawn; other charts' is their series.
    const keys = kind === 'pie' ? d.series[0].values.slice(0, upTo).map((_, i) => [d.labels[i], i] as const) : d.series.map((s, k) => [s.name, k] as const);
    const shown = keys.filter(([name]) => name).slice(0, 8);
    const each = Math.min(170, (w - 48) / Math.max(1, shown.length));
    let x = (w - each * shown.length) / 2;
    for (const [name, n] of shown) {
      svg += painted(n, (fill) => rect(x, h - 30, 12, 12, fill, 'rx="3"')) + text(x + 18, h - 19, clip(name, each - 26, 13), { px: 13, fill: INK });
      x += each;
    }
  }
  const alt = d.series.map((s) => `${s.name || t('Series')}: ${s.values.map((v, i) => `${d.labels[i]} ${short(v)}`).join(', ')}`).join('; ');
  return { w, h, svg, alt: t('{kind} chart. {data}', { kind: CHART_KINDS.find((k) => k.id === kind)?.name() ?? kind, data: alt }) };
}
