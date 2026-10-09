/**
 * Charts from a table, with no setup: the first column is the labels, every
 * other column of numbers is a series, named by its column's name. Drawn as
 * SVG so a chart works wherever a picture does.
 */
import { SERIES, patternDefs, patternFill } from './palette.ts';
import { FAINT, INK, LINE, MUTED, clip, r, rect, text, type Page } from '../kit/core.ts';

export type ChartKind = 'bar' | 'line' | 'pie';
export const CHART_KINDS: { id: ChartKind; name: string }[] = [
  { id: 'bar', name: 'Bars' },
  { id: 'line', name: 'Lines' },
  { id: 'pie', name: 'Pie' },
];

export interface ChartData {
  labels: string[];
  series: { name: string; values: number[] }[];
}

type Cell = number | string | null;

/** `names`: each column's name, for its series. */
export function chartData(rows: Cell[][], names: string[] = []): ChartData {
  const used = rows.filter((row) => row.some((c) => c !== null && c !== ''));
  const cols = Math.max(0, ...used.map((row) => row.length));
  const isNum = (c: Cell) => typeof c === 'number' && isFinite(c);
  const holdsNumbers = (c: number) => used.filter((row) => isNum(row[c])).length >= Math.max(1, used.filter((row) => row[c] !== null && row[c] !== '').length / 2);
  // The first column names each row, unless it is the only column of numbers there is.
  let numeric = Array.from({ length: cols }, (_, c) => c).filter((c) => c > 0 && holdsNumbers(c));
  const labelled = cols > 1 && numeric.length > 0;
  if (!numeric.length && holdsNumbers(0)) numeric = [0];
  if (!numeric.length) return { labels: [], series: [] };
  const body = used.filter((row) => numeric.some((c) => isNum(row[c])));
  return {
    labels: body.map((row, i) => (labelled ? String(row[0] ?? '') : String(i + 1))),
    series: numeric.map((c) => ({ name: names[c] ?? '', values: body.map((row) => (isNum(row[c]) ? (row[c] as number) : 0)) })),
  };
}

/** The chart that suits the data, or '' if there is nothing to chart. */
export function suggestChart(d: ChartData): ChartKind | '' {
  if (!d.series.length || !d.labels.length) return '';
  const first = d.series[0].values;
  // Parts of a whole: one series, a handful of positive numbers.
  if (d.series.length === 1 && first.length >= 2 && first.length <= 6 && first.every((v) => v > 0)) return 'pie';
  // Things in order (years, quarters, months, days) read best as lines.
  if (first.length >= 4 && d.labels.every((l) => /^(\d{4}|q[1-4]|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|mon|tue|wed|thu|fri|sat|sun|week|day|month|year|y\d|m\d)/i.test(l.trim()))) return 'line';
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
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t / step) * step);
  return { min, max, ticks };
}

/** A shape in its series' colour, then again in its pattern (every series after the first has one), which `draw` is told it is drawing. */
function painted(i: number, draw: (fill: string, pattern: boolean) => string): string {
  const pattern = patternFill(i);
  return draw(SERIES[i % SERIES.length], false) + (pattern ? draw(pattern, true) : '');
}

/** `upTo`: how many labels' worth of the chart to draw (bars, points or slices), for building it up. */
export function chartPage(d: ChartData, kind: ChartKind, title = '', w = 720, h = 440, upTo = Infinity): Page {
  let svg = title ? text(w / 2, 34, clip(title, w - 80, 20, true), { px: 20, bold: true, anchor: 'middle' }) : '';
  const top = title ? 56 : 24;
  const legend = d.series.length > 1 || kind === 'pie';
  const bottom = h - (legend ? 64 : 40);
  if (!d.series.length) return { w, h, svg: svg + text(w / 2, h / 2, 'Nothing to chart yet', { px: 16, fill: FAINT, anchor: 'middle' }) };

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
        v >= total ? `<circle cx="${cx}" cy="${cy}" r="${r(rad)}" fill="${fill}"/>` : `<path d="M${cx} ${cy}L${p(a)}A${r(rad)} ${r(rad)} 0 ${b - a > Math.PI ? 1 : 0} 1 ${p(b)}Z" fill="${fill}"${pattern ? '' : ' stroke="#fff" stroke-width="2"'}/>`,
      );
      if (v / total >= 0.06) svg += text(cx + Math.cos((a + b) / 2) * rad * 0.62, cy + Math.sin((a + b) / 2) * rad * 0.62 + 5, `${Math.round((v / total) * 100)}%`, { px: 14, bold: true, fill: '#fff', anchor: 'middle' });
      a = b;
    });
  } else {
    const { min, max, ticks } = scale(d.series.flatMap((s) => s.values));
    const left = 64;
    const right = w - 24;
    const y = (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
    for (const t of ticks) svg += `<line x1="${left}" y1="${r(y(t))}" x2="${right}" y2="${r(y(t))}" stroke="${t === 0 ? MUTED : LINE}"/>` + text(left - 8, y(t) + 4, short(t), { px: 12, fill: MUTED, anchor: 'end' });
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
        svg += `<polyline points="${pts.map((pt) => pt.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"${['', ' stroke-dasharray="8 6"', ' stroke-dasharray="2 6"', ' stroke-dasharray="12 4 2 4"'][k % 4]}/>` + pts.map(([px, py]) => `<circle cx="${px}" cy="${py}" r="4" fill="${color}"/>`).join('');
      } else {
        const bw = (band * 0.76) / d.series.length;
        s.values.slice(0, upTo).forEach((v, i) => (svg += painted(k, (fill) => rect(left + band * (i + 0.12) + bw * k, Math.min(y(v), y(0)), Math.max(1, bw - 2), Math.abs(y(v) - y(0)), fill, 'rx="2"'))));
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
  return { w, h, svg };
}
