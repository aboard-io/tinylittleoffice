/**
 * The calculator drawn and written out, with no DOM: the tape as a page (each line and what it comes to),
 * the graph as a page (each curve in a colour of its own, named by its expression), and the tape as text.
 * Ported from the old tree's calc.def.ts (its calc and graph pages).
 */
import type { Doc } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { clip, FAINT, LINE, MUTED, rect, SERIES, text } from '../../kit/draw.ts';
import { curves, isNote, plot, readCalc, shown, tape } from './model.ts';

const W = 720;

/** The tape: each line, and what it comes to beside it; the last `max` of them. */
export function tapePage(lines: string[], title = '', max = Infinity): Page {
  const shownLines = lines.slice(-max);
  const texts = tape(lines).texts.slice(-max);
  let y = title ? 56 : 24;
  let svg = title ? text(48, y, clip(title, W - 96, 26, true), { px: 26, bold: true }) : '';
  shownLines.forEach((l, i) => {
    y += 34;
    const answer = texts[i] ? `= ${texts[i]}` : '';
    // A note is words across the tape, in ink; a sum is muted beside its answer.
    if (isNote(l, texts[i])) svg += text(48, y, clip(l, W - 96, 17), { px: 17 });
    else {
      svg += text(48, y, clip(l, W - 96 - answer.length * 11 - 24, 17), { px: 17, fill: MUTED });
      svg += text(W - 48, y, answer, { px: 19, bold: true, anchor: 'end' });
    }
    svg += `<line x1="48" x2="${W - 48}" y1="${y + 12}" y2="${y + 12}" stroke="${LINE}"/>`;
  });
  return { w: W, h: Math.max(140, y + 40), svg, alt: shownLines.map((l, i) => `${l}${texts[i] ? ` = ${texts[i]}` : ''}`).join('; ') || undefined };
}

/** The graph: y = f(x) for each line, across the range the first line may set ("x from -10 to 10"). */
export function graphPage(lines: string[], title = ''): Page {
  const { from, to, exprs } = curves(lines);
  const pts = exprs.map((e) => plot(e, from, to));
  const ys = pts.flat().filter((p): p is readonly [number, number] => !!p).map((p) => p[1]);
  const lo = Math.min(-1, ...ys.filter((y) => y > -1e4));
  const hi = Math.max(1, ...ys.filter((y) => y < 1e4));
  const top = title ? 72 : 32;
  const [x0, pw, ph] = [64, W - 112, 400];
  const sx = (x: number) => x0 + ((x - from) / (to - from)) * pw;
  const sy = (y: number) => top + ph - ((y - lo) / (hi - lo)) * ph;
  let svg = title ? text(48, 48, clip(title, W - 96, 26, true), { px: 26, bold: true }) : '';
  svg += rect(x0, top, pw, ph, '#ffffff', `stroke="${LINE}"`);
  if (from < 0 && to > 0) svg += `<line x1="${sx(0).toFixed(1)}" x2="${sx(0).toFixed(1)}" y1="${top}" y2="${top + ph}" stroke="${FAINT}"/>`;
  if (lo < 0 && hi > 0) svg += `<line x1="${x0}" x2="${x0 + pw}" y1="${sy(0).toFixed(1)}" y2="${sy(0).toFixed(1)}" stroke="${FAINT}"/>`;
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
    const colour = SERIES[i % SERIES.length];
    if (d) svg += `<path d="${d}" fill="none" stroke="${colour}" stroke-width="2.4" stroke-linejoin="round"/>`;
    svg += text(x0 + 12, top + 24 + i * 22, clip(`y = ${exprs[i]}`, pw - 24, 15, true), { px: 15, bold: true, fill: colour });
  });
  svg += text(x0, top + ph + 20, shown(from), { px: 13, fill: MUTED }) + text(x0 + pw, top + ph + 20, shown(to), { px: 13, fill: MUTED, anchor: 'end' });
  svg += text(x0 - 8, top + 12, shown(hi), { px: 13, fill: MUTED, anchor: 'end' }) + text(x0 - 8, top + ph, shown(lo), { px: 13, fill: MUTED, anchor: 'end' });
  if (!exprs.length) svg += text(x0 + pw / 2, top + ph / 2, 'y = …', { px: 18, fill: FAINT, anchor: 'middle' });
  return { w: W, h: top + ph + 44, svg, alt: exprs.length ? exprs.map((e) => `y = ${e}`).join('; ') + `, x from ${shown(from)} to ${shown(to)}` : undefined };
}

/** The document drawn: its tape or its graph. */
export function calcPage(doc: Doc, small = false): Page {
  const v = readCalc(doc);
  const title = doc.head.title ?? '';
  return v.mode === 'graph' ? graphPage(v.lines, title) : tapePage(v.lines, title, small ? 8 : Infinity);
}

/** The tape as text: a line each and what it comes to; a graph's curves as y = …. */
export function tapeText(doc: Doc): string {
  const v = readCalc(doc);
  const texts = v.mode === 'graph' ? [] : tape(v.lines).texts;
  const lines = v.lines.map((l, i) => (v.mode === 'graph' ? (/^x\s+from/i.test(l) ? l : `y = ${l}`) : texts[i] ? `${l} = ${texts[i]}` : l));
  return (doc.head.title ? `${doc.head.title}\n\n` : '') + (lines.length ? lines.join('\n') + '\n' : '');
}
