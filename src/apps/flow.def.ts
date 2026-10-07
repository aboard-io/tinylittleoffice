/**
 * Stock and flow: a small model of a business (or anything that moves from
 * place to place), drawn as a Sankey diagram, with a slider for every
 * number you might want to change.
 *
 * A line "name = 1000 (0 to 5000)" is a number with a slider. A line
 * "From > To = formula" is a flow. A formula may use the sliders' names and
 * the names of stocks: a stock's name stands for everything that has flowed
 * into it so far (or out of it, for one nothing flows into, unless a slider
 * has its name: then it is that number). Spaces in names become "_".
 */
import type { Kind as LineKind } from '../lib/lines.ts';
import { definePage, htmlPage, h1, rest, js } from '../lib/diagram.ts';
import { xml } from '../kit/core.ts';

const id = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export function parseFlow(body: string) {
  const sliders: { id: string; name: string; value: number; min: number; max: number; unit: string }[] = [];
  const flows: { from: string; to: string; formula: string }[] = [];
  for (const l of rest(body)) {
    const flow = /^(.+?)\s*>\s*(.+?)\s*=\s*(.+)$/.exec(l);
    const slider = /^(.+?)\s*=\s*(-?[\d.]+)\s*(%?)\s*(?:\(\s*(-?[\d.]+)\s*(?:to|\.\.|-)\s*(-?[\d.]+)\s*\))?$/.exec(l);
    if (flow) flows.push({ from: flow[1].trim(), to: flow[2].trim(), formula: flow[3].replace(/(\d)\s*%/g, '$1/100') });
    else if (slider) sliders.push({ id: id(slider[1]), name: slider[1].trim(), value: +slider[2], unit: slider[3], min: +(slider[4] ?? 0), max: +(slider[5] ?? (slider[3] ? 100 : Math.max(10, +slider[2] * 2))) });
  }
  return { sliders, flows };
}

/**
 * Plain arithmetic, worked out by hand: numbers, + - * / and brackets, and
 * nothing else (no code is ever run). Anything that does not add up is 0.
 */
export function arithmetic(src: string): number {
  let at = 0;
  const s = src.replace(/\s+/g, '');
  const num = (): number => {
    if (s[at] === '(') {
      at++;
      const v = sum();
      if (s[at++] !== ')') throw 0;
      return v;
    }
    if (s[at] === '-') return (at++, -num());
    const m = /^\d*\.?\d+(?:e-?\d+)?/i.exec(s.slice(at));
    if (!m) throw 0;
    at += m[0].length;
    return +m[0];
  };
  const product = (): number => {
    let v = num();
    while (s[at] === '*' || s[at] === '/') v = s[at++] === '*' ? v * num() : v / num();
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (s[at] === '+' || s[at] === '-') v = s[at++] === '+' ? v + product() : v - product();
    return v;
  };
  try {
    const v = sum();
    return at === s.length && isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/** The flows worked out for a set of slider values. A formula is arithmetic over names, and nothing else. */
export function runFlow(m: ReturnType<typeof parseFlow>, values: Record<string, number>): number[] {
  const v: Record<string, number> = {};
  for (const s of m.sliders) v[s.id] = (values[s.id] ?? s.value) / (s.unit ? 100 : 1);
  const fed = new Set<string>();
  return m.flows.map((f) => {
    const expr = f.formula.replace(/[A-Za-z_][A-Za-z0-9_ ]*/g, (name) => String(v[id(name)] ?? 0));
    const n = Math.max(0, arithmetic(expr) || 0);
    // A stock is what has flowed into it; a source, which nothing flows into, is what flows out of it.
    const [from, to] = [id(f.from), id(f.to)];
    if (!fed.has(from) && !m.sliders.some((x) => x.id === from)) v[from] = (v[from] ?? 0) + n;
    v[to] = (fed.has(to) ? v[to] : 0) + n;
    fed.add(to);
    return n;
  });
}

function page(body: string): string {
  const title = h1(body) || 'Stock and flow';
  const m = parseFlow(body);
  return htmlPage(
    title,
    `${m.flows.length} flows, ${m.sliders.length} things to change.`,
    `main{max-width:64rem;margin:0 auto;padding:1.5rem 1.25rem 3rem;display:grid;grid-template-columns:16rem 1fr;gap:2rem;align-items:start}h1{grid-column:1/-1;font-size:1.6rem;margin:0}
label{display:grid;gap:.1rem;margin-bottom:1rem;font-size:.92rem}label b{font-size:1.2rem;color:#4f46e5;font-variant-numeric:tabular-nums}input{width:100%;accent-color:#4f46e5}
svg{width:100%;height:auto;font:600 12px ui-sans-serif,system-ui,sans-serif}svg text.n{font-weight:400;fill:#52525b}@media(max-width:44rem){main{grid-template-columns:1fr}form{order:2;display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:0 1.2rem}}`,
    `<main><h1>${xml(title)}</h1>
<form id="f">${m.sliders.map((s) => `<label>${xml(s.name)} <b id="o_${s.id}"></b><input type="range" id="s_${s.id}" min="${s.min}" max="${s.max}" step="${(s.max - s.min) / 200 >= 1 ? 1 : 'any'}" value="${s.value}"></label>`).join('')}</form>
<div><svg id="k" viewBox="0 0 720 420" role="img" aria-label="Sankey diagram of ${xml(title)}"></svg><p id="say" class="sr" role="status" aria-live="polite" style="position:absolute;left:-999em"></p></div></main>
<script>
var M = ${js(m)}, C = ['#4f46e5', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#ca8a04', '#db2777'];
function id(s) { return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
// Plain arithmetic, worked out by hand: no code is ever run.
function arithmetic(src) {
  var at = 0, s = src.replace(/\\s+/g, '');
  function num() {
    if (s[at] === '(') { at++; var v = sum(); if (s[at++] !== ')') throw 0; return v; }
    if (s[at] === '-') { at++; return -num(); }
    var m = /^\\d*\\.?\\d+(?:e-?\\d+)?/i.exec(s.slice(at)); if (!m) throw 0; at += m[0].length; return +m[0];
  }
  function product() { var v = num(); while (s[at] === '*' || s[at] === '/') v = s[at++] === '*' ? v * num() : v / num(); return v; }
  function sum() { var v = product(); while (s[at] === '+' || s[at] === '-') v = s[at++] === '+' ? v + product() : v - product(); return v; }
  try { var v = sum(); return at === s.length && isFinite(v) ? v : 0; } catch (e) { return 0; }
}
function fmt(n) { return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString() : String(Math.round(n * 100) / 100); }
function run() {
  var v = {}, fed = {};
  M.sliders.forEach(function (s) { var x = +document.getElementById('s_' + s.id).value; v[s.id] = x / (s.unit ? 100 : 1); document.getElementById('o_' + s.id).textContent = fmt(x) + s.unit; });
  return M.flows.map(function (f) {
    var expr = f.formula.replace(/[A-Za-z_][A-Za-z0-9_ ]*/g, function (n) { return String(v[id(n)] || 0); }), n = 0;
    n = Math.max(0, arithmetic(expr) || 0);
    var a = id(f.from), b = id(f.to);
    if (!fed[a] && !M.sliders.some(function (x) { return x.id === a; })) v[a] = (v[a] || 0) + n;
    v[b] = (fed[b] ? v[b] : 0) + n; fed[b] = 1;
    return n;
  });
}
function draw() {
  var val = run(), nodes = {}, order = [];
  function node(name) { if (!nodes[name]) { nodes[name] = { name: name, in: 0, out: 0, col: 0, ins: [], outs: [] }; order.push(nodes[name]); } return nodes[name]; }
  M.flows.forEach(function (f, i) { var a = node(f.from), b = node(f.to); a.out += val[i]; b.in += val[i]; a.outs.push(i); b.ins.push(i); });
  // Each stock sits one column to the right of the furthest thing that feeds it.
  for (var pass = 0; pass < order.length; pass++) M.flows.forEach(function (f) { if (f.from !== f.to) nodes[f.to].col = Math.max(nodes[f.to].col, Math.min(order.length, nodes[f.from].col + 1)); });
  var cols = [], W = 720, H = 420, nw = 14, pad = 14;
  order.forEach(function (n) { n.v = Math.max(n.in, n.out); (cols[n.col] = cols[n.col] || []).push(n); });
  cols = cols.filter(Boolean);
  var scale = Math.min.apply(null, cols.map(function (c) { var sum = c.reduce(function (a, n) { return a + n.v; }, 0); return sum ? (H - 24 - pad * (c.length - 1)) / sum : Infinity; }));
  if (!isFinite(scale)) scale = 0;
  var svg = '';
  cols.forEach(function (c, ci) { var y = 12; c.forEach(function (n) { n.x = cols.length > 1 ? ci * (W - nw - 150) / (cols.length - 1) : 0; n.y = y; n.h = Math.max(2, n.v * scale); n.oy = n.iy = y; y += n.h + pad; }); });
  M.flows.forEach(function (f, i) {
    var a = nodes[f.from], b = nodes[f.to], h = val[i] * scale; if (h <= 0) return;
    var x0 = a.x + nw, x1 = b.x, y0 = a.oy + h / 2, y1 = b.iy + h / 2, mx = (x0 + x1) / 2; a.oy += h; b.iy += h;
    svg += '<path d="M' + x0 + ' ' + y0 + 'C' + mx + ' ' + y0 + ' ' + mx + ' ' + y1 + ' ' + x1 + ' ' + y1 + '" fill="none" stroke="' + C[order.indexOf(a) % C.length] + '" stroke-opacity=".35" stroke-width="' + Math.max(1, h) + '"><title>' + f.from + ' to ' + f.to + ': ' + fmt(val[i]) + '</title></path>';
  });
  order.forEach(function (n, i) {
    svg += '<rect x="' + n.x + '" y="' + n.y + '" width="' + nw + '" height="' + n.h + '" rx="3" fill="' + C[i % C.length] + '"/>';
    var t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.textContent = n.name;
    svg += '<text x="' + (n.x + nw + 6) + '" y="' + (n.y + Math.min(n.h / 2, 60) + 1) + '">' + t.innerHTML + '</text><text class="n" x="' + (n.x + nw + 6) + '" y="' + (n.y + Math.min(n.h / 2, 60) + 15) + '">' + fmt(n.v) + '</text>';
  });
  document.getElementById('k').innerHTML = svg;
  document.getElementById('say').textContent = order.map(function (n) { return n.name + ' ' + fmt(n.v); }).join(', ');
}
document.getElementById('f').oninput = draw; draw();
</script>`,
  );
}

export const spec = {
  form: [
    { name: 'Title', is: '# {Title}', once: true },
    { name: 'Flow', is: '{From} > {To} = {Formula}' },
    { name: 'Slider', is: '{Name} = {Value}[ ({Lowest} to {Highest})]' },
    { name: 'Line', is: '{Text}' },
  ] as LineKind[],
  hint: '"name = 1000 (0 to 5000)" is a number with a slider ("5%" for a rate); "From > To = formula" is a flow. A formula can use slider names and the names of stocks (what has flowed in so far).',
  example: '# A subscription business\nvisitors = 20000 (0 to 100000)\nsignup rate = 6% (0 to 30)\npaid rate = 25% (0 to 100)\nchurn = 8% (0 to 50)\nVisitors > Signups = visitors * signup rate\nVisitors > Bounced = visitors - visitors * signup rate\nSignups > Paying = signups * paid rate\nSignups > Free = signups - signups * paid rate\nPaying > Churned = paying * churn\nPaying > Retained = paying - paying * churn',
  page,
};

export default definePage({ id: 'flow', name: 'Stock and flow', icon: 'flow', group: 'Track', blurb: 'A stock-and-flow model drawn as a Sankey diagram, with a slider for every assumption.' }, spec);
