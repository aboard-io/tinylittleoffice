/** Calculator: what the shell knows. Modes and maths: lib/calc.ts. */
import { defineApp, text, rect, place, ACCENT, MUTED, INK, FAINT, type Page } from '../kit/core.ts';
import { chartPage } from '../lib/chart.ts';
import { MODES, FIELDS, cashflow, inputs, interest, invest, money, mortgage, parseCalc, plot, readCalc, shown, tape, withDefaults, type Calc } from '../lib/calc.ts';

const W = 720;

/** A card of headline figures, then a table, then a chart: the shape every money mode shares. */
function sheet(title: string, figures: [string, string][], head: string[], rows: string[][], chart?: Page): Page {
  let y = 56;
  let svg = text(48, y, title, { px: 26, bold: true });
  y += 28;
  const colW = (W - 96) / figures.length;
  figures.forEach(([k, v], i) => {
    svg += rect(48 + i * colW + 4, y, colW - 8, 64, '#f4f4f5', 'rx="10"');
    svg += text(48 + i * colW + 16, y + 24, k, { px: 12, fill: MUTED });
    svg += text(48 + i * colW + 16, y + 50, v, { px: 20, bold: true, fill: ACCENT });
  });
  y += 92;
  const cw = (W - 96) / head.length;
  head.forEach((h, i) => (svg += text(48 + i * cw + (i ? cw - 8 : 0), y, h, { px: 12, bold: true, fill: MUTED, anchor: i ? 'end' : 'start' })));
  y += 6;
  // Every row: a thirty-year mortgage is thirty rows, and the page is as tall as it needs to be.
  for (const r of rows) {
    y += 22;
    svg += `<line x1="48" x2="${W - 48}" y1="${y - 16}" y2="${y - 16}" stroke="#e4e4e7"/>`;
    r.forEach((c, i) => (svg += text(48 + i * cw + (i ? cw - 8 : 0), y, c, { px: 13, fill: INK, anchor: i ? 'end' : 'start' })));
  }
  if (chart) {
    y += 24;
    svg += place(chart, 48, y, W - 96, (chart.h * (W - 96)) / chart.w);
    y += (chart.h * (W - 96)) / chart.w;
  }
  return { w: W, h: y + 48, svg };
}

const yr = (n: number) => `Year ${n}`;

export function calcPage(body: string): Page {
  const c = parseCalc(body);
  const num = (k: string, v: Record<string, number>) => money(v[k], k === 'years' || k === 'times' ? 0 : 2);
  if (c.mode === 'mortgage') {
    const v = withDefaults('mortgage', inputs(c.lines));
    const m = mortgage(v);
    return sheet(
      'Mortgage',
      [['Monthly payment', money(m.monthly)], ['Loan', money(m.loan, 0)], ['Total interest', money(m.interest, 0)], ['Total paid', money(m.total, 0)]],
      ['Year', 'Interest', 'Principal', 'Still owed'],
      m.years.map((y) => [yr(y.year), money(y.interest, 0), money(y.principal, 0), money(y.owed, 0)]),
      chartPage({ labels: m.years.map((y) => String(y.year)), series: [{ name: 'Interest', values: m.years.map((y) => Math.round(y.interest)) }, { name: 'Principal', values: m.years.map((y) => Math.round(y.principal)) }] }, 'bar', `${num('price', v)} at ${v.rate}% over ${v.years} years, ${num('deposit', v)} down`, 720, 300),
    );
  }
  if (c.mode === 'invest') {
    const v = withDefaults('invest', inputs(c.lines));
    const r = invest(v);
    return sheet(
      'Investment',
      [['Final value', money(r.final, 0)], ['Put in', money(r.put, 0)], ['Growth', money(r.growth, 0)], ['Return', `${v.return}% a year`]],
      ['Year', 'Put in', 'Value'],
      r.years.map((y) => [yr(y.year), money(y.put, 0), money(y.value, 0)]),
      chartPage({ labels: r.years.map((y) => String(y.year)), series: [{ name: 'Value', values: r.years.map((y) => Math.round(y.value)) }, { name: 'Put in', values: r.years.map((y) => Math.round(y.put)) }] }, 'line', `${money(v.start, 0)} to start, ${money(v.monthly, 0)} a month`, 720, 300),
    );
  }
  if (c.mode === 'cashflow') {
    const v = withDefaults('cashflow', inputs(c.lines));
    const r = cashflow(v);
    return sheet(
      'Cash flow',
      [['Net present value', money(r.npv, 0)], ['Rate of return (IRR)', isFinite(r.irr) ? `${(r.irr * 100).toFixed(1)}%` : '—'], ['Payback', isFinite(r.payback) ? `${r.payback.toFixed(1)} years` : '—'], ['Discount rate', `${v.rate}%`]],
      ['Year', 'Cash flow', 'Running total'],
      r.flows.map((f, t) => [yr(t), money(f, 0), money(r.cumulative[t], 0)]),
      chartPage({ labels: r.flows.map((_, t) => String(t)), series: [{ name: 'Cash flow', values: r.flows }, { name: 'Running total', values: r.cumulative }] }, 'bar', 'Cash flows by year', 720, 300),
    );
  }
  if (c.mode === 'interest') {
    const v = withDefaults('interest', inputs(c.lines));
    const r = interest(v);
    return sheet(
      'Interest',
      [['Compound', money(r.compound, 0)], ['Simple', money(r.simple, 0)], ['APY', `${(r.apy * 100).toFixed(3)}%`], ['Doubles in', isFinite(r.double) ? `${r.double.toFixed(1)} years` : '—']],
      ['Year', 'Simple', 'Compound'],
      r.years.map((y) => [yr(y.year), money(y.simple, 0), money(y.compound, 0)]),
      chartPage({ labels: r.years.map((y) => String(y.year)), series: [{ name: 'Compound', values: r.years.map((y) => Math.round(y.compound)) }, { name: 'Simple', values: r.years.map((y) => Math.round(y.simple)) }] }, 'line', `${money(v.principal, 0)} at ${v.rate}%, compounded ${v.times} times a year`, 720, 300),
    );
  }
  if (c.mode === 'graph') {
    // y = f(x) for each line; the first line may set the range: "x from -10 to 10".
    const lines = c.lines.filter((l) => l.trim());
    const range = /^x\s+from\s+(-?[\d.]+)\s+to\s+(-?[\d.]+)/i.exec(lines[0] ?? '');
    const [from, to] = range ? [+range[1], +range[2]] : [-10, 10];
    const exprs = (range ? lines.slice(1) : lines).slice(0, 4);
    const pts = exprs.map((e) => plot(e, from, to));
    const ys = pts.flat().filter((p): p is readonly [number, number] => !!p).map((p) => p[1]);
    const lo = Math.min(-1, ...ys.filter((y) => y > -1e4));
    const hi = Math.max(1, ...ys.filter((y) => y < 1e4));
    const [x0, y0, pw, ph] = [48, 48, W - 96, 400];
    const sx = (x: number) => x0 + ((x - from) / (to - from)) * pw;
    const sy = (y: number) => y0 + ph - ((y - lo) / (hi - lo)) * ph;
    let svg = rect(x0, y0, pw, ph, '#fff', 'stroke="#e4e4e7"');
    if (from < 0 && to > 0) svg += `<line x1="${sx(0)}" x2="${sx(0)}" y1="${y0}" y2="${y0 + ph}" stroke="#a1a1aa"/>`;
    if (lo < 0 && hi > 0) svg += `<line x1="${x0}" x2="${x0 + pw}" y1="${sy(0)}" y2="${sy(0)}" stroke="#a1a1aa"/>`;
    const colors = ['#4f46e5', '#b3261e', '#1e7f5c', '#b45309'];
    pts.forEach((ps, i) => {
      let d = '';
      let pen = false;
      for (const p of ps) {
        if (!p || p[1] < lo - (hi - lo) || p[1] > hi + (hi - lo)) {
          pen = false;
          continue;
        }
        d += `${pen ? 'L' : 'M'}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`;
        pen = true;
      }
      svg += `<path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="2.2" stroke-linejoin="round"/>`;
      svg += text(x0 + 12, y0 + 22 + i * 20, `y = ${exprs[i]}`, { px: 14, bold: true, fill: colors[i] });
    });
    svg += text(x0, y0 + ph + 20, shown(from), { px: 12, fill: MUTED }) + text(x0 + pw, y0 + ph + 20, shown(to), { px: 12, fill: MUTED, anchor: 'end' });
    svg += text(x0 - 6, y0 + 12, shown(hi), { px: 12, fill: MUTED, anchor: 'end' }) + text(x0 - 6, y0 + ph, shown(lo), { px: 12, fill: MUTED, anchor: 'end' });
    return { w: W, h: y0 + ph + 48, svg };
  }
  // The tape: each line and what it comes to.
  const lines = c.lines.filter((l) => l.trim());
  const { results } = tape(lines);
  let y = 56;
  let svg = text(48, y, 'Calculator', { px: 26, bold: true });
  lines.slice(-24).forEach((l, i) => {
    y += 30;
    svg += text(48, y, l, { px: 16, fill: MUTED }) + text(W - 48, y, shown(results[lines.length - Math.min(24, lines.length) + i]), { px: 18, bold: true, anchor: 'end' });
  });
  if (!lines.length) svg += text(48, (y += 30), 'Nothing worked out yet.', { px: 14, fill: FAINT });
  return { w: W, h: y + 48, svg };
}

const title = (body: string) => {
  const c = parseCalc(body);
  return c.mode === 'calc' && !c.lines.some((l) => l.trim()) ? '' : (MODES.find((m) => m.id === c.mode)?.name ?? 'Calculator');
};

export default defineApp({
  id: 'calc',
  group: 'Track',
  name: 'Calculator',
  icon: 'calc',
  blurb: 'A calculator with modes: plain, scientific with a graph, mortgage, investment, cash flow, interest. The working is the document.',
  title,
  read: readCalc,
  outline: (body) => {
    const c = parseCalc(body);
    const lines = c.lines.filter((l) => l.trim());
    const { results } = tape(lines);
    return c.mode === 'calc' || c.mode === 'graph' ? lines.map((l, i) => (c.mode === 'calc' ? `${l} = ${shown(results[i])}` : `y = ${l}`)) : FIELDS[c.mode].map((f) => `${f.name}: ${money(withDefaults(c.mode as never, inputs(c.lines))[f.key], f.key === 'years' || f.key === 'times' ? 0 : 2)}${f.unit ? ' ' + f.unit : ''}`);
  },
  view: (body) => [calcPage(body)],
});
export type { Calc };
