/**
 * What the eye would see in a diagram, said in words and numbers, so an agent never opens a page to check one
 * (src/lint.ts runs it, for a diagram and for one fenced in another document). Every measure is the layout's
 * own: `layout()` places the shapes and Draw's `fitLabel` sets their words, as the page draws them, with the
 * fallback metrics the exports use (kit/draw/draw.ts `textWidth`); nothing here draws, and nothing needs a browser.
 *
 *   edge-end      a connection naming no thing in the list (a tree or swimlanes draws it not at all)
 *   edge-unused   a connection in a kind that draws none (timeline, venn, seating)
 *   net-colon     "- Name: description" in a network, where the whole line is the thing's name
 *   comma-number  a comma inside a number in a Venn's or a table's list ("2,000" is two things)
 *   label-long    a thing's words too long for its box: set smaller, or cut short with "…"
 *   label-over    a connection's label lying over another label or a thing
 */
import { parse, type Doc } from '../../doc/index.ts';
import { isLink, linkEnds, paint, type Shape } from '../draw/model.ts';
import { fitLabel } from '../draw/view.ts';
import { INK, PAPER, SHADE, textWidth } from '../../kit/draw/draw.ts';
import { edgesOf, isListed, isTree, kindOf, linesOf, nameOf, stepName, stepNamed, who, type KindId } from './model.ts';
import { layout, type DShape } from './view.ts';
import type { Found } from '../../lint.ts';

/** The smallest share of their size a shape's words are set at before they are cut (Draw's fitLabel). */
const SMALLEST = 0.61;
const KIND_NAME: Record<KindId, string> = {
  mind: 'a mind map',
  org: 'an org chart',
  family: 'a family tree',
  lanes: 'swimlanes',
  timeline: 'a timeline',
  venn: 'a Venn',
  seating: 'a seating chart',
  net: 'a network',
};
const quote = (s: string, n = 48) => `"${s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s}"`;
const plainLabel = (label: string) => label.replace(/^:[a-z0-9-]+\s*/, '').replace(/ \| /g, ' / ');

/** The things a connection can name in this kind, by the name a connection uses. */
function thingNames(doc: Doc): string[] {
  const seen = new Set<string>();
  const lines = linesOf(doc);
  const name = (l: (typeof lines)[number]) => (kindOf(doc) !== 'lanes' ? nameOf(l.all.words) : l.words.words ? stepName(lines, l) : '');
  return lines.map(name).filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()));
}

/** A label's words, the most of them that sit in the shape at their full size: the "few words" a thing of this box holds. */
function wordsThatFit(s: Shape): number {
  const words = s.text.split(' ');
  let n = 0;
  while (n < words.length) {
    const f = fitLabel({ ...s, text: words.slice(0, n + 1).join(' ') });
    if (f.cut || f.scale < 1 || f.laid.lines.length > 2) break;
    n++;
  }
  return Math.max(1, n);
}

/** Where a thing's words sit, as Draw sets them: centred in its box, as wide as their widest line. */
function wordsBox(s: Shape): [number, number, number, number] | null {
  if (!s.text || s.k === 'i') return null;
  const f = fitLabel(s);
  const w = Math.max(...f.laid.lines.map((l) => textWidth(l.t, l.small ? f.laid.px * 0.8 : f.laid.px, l.strong))) + (f.big ? f.laid.px * f.big + 6 : 0);
  const h = f.laid.lines.length * f.laid.px * 1.25;
  const left = s.k === 't' ? (s.al === 'r' ? s.x + s.w - 4 - w : s.al === 'c' ? s.x + (s.w - w) / 2 : s.x + 4) : s.x + (s.w - w) / 2;
  return [left, s.y + (s.h - h) / 2, w, h];
}

/** Where a connection's label sits, as Draw sets it on the line's middle. */
function labelBox(s: Shape, all: Shape[]): [number, number, number, number] | null {
  const ends = linkEnds(s, all);
  if (!ends || !s.text) return null;
  const px = paint(s, INK, PAPER, SHADE).px;
  const w = textWidth(s.text, px);
  const [x, y] = [(ends[0] + ends[2]) / 2, (ends[1] + ends[3]) / 2];
  return [x - w / 2, y - px * 0.6, w, px * 1.2];
}
/** Whether two boxes cross by more than a hair (TOUCH px each way): words that only touch read apart. */
const TOUCH = 4;
const overlap = (a: number[], b: number[]) => Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > TOUCH && Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > TOUCH;

export function lintDiagram(text: string): Found[] {
  const doc = parse(text);
  const kind = kindOf(doc);
  const out: Found[] = [];
  const lines = linesOf(doc);
  const names = thingNames(doc);
  const known = new Set(names.map(who));
  // A swimlane's step may be named by its words, or with its lane's.
  const named = (n: string) => (kind === 'lanes' ? !!stepNamed(lines, n) : known.has(who(n)));

  // Connections: in a tree an end that names no thing is not drawn; in a list-like kind, none is.
  for (const e of edgesOf(doc)) {
    const what = `${kind === 'mind' ? 'A cross-link' : isTree(kind) ? 'A dotted line' : 'A connection'} from ${e.from} to ${e.to}`;
    if (!isTree(kind) && kind !== 'net' && kind !== 'lanes') {
      out.push({ block: e.at, kind: 'edge-unused', words: `${what} is not drawn: ${KIND_NAME[kind]} draws no connections`, fix: 'take it out, or say it in a thing’s words' });
      continue;
    }
    const missing = [e.from, e.to].filter((n) => !named(n));
    if ((isTree(kind) || kind === 'lanes') && missing.length)
      out.push({
        block: e.at,
        kind: 'edge-end',
        words: `${what} is not drawn: no thing is called ${missing.join(' or ')}; the things are ${names.slice(0, 12).join(', ')}${names.length > 12 ? ', …' : ''}`,
        fix: 'name each end exactly as its line names the thing (the words before " | ")',
      });
  }

  // A network's thing is its whole line: "- Name: description" makes a thing called all of that.
  if (kind === 'net')
    for (const l of lines)
      if (l.key && l.words.words)
        out.push({
          block: l.at,
          kind: 'net-colon',
          words: `the thing is named ${quote(l.all.words.replace(/\n/g, ' / '))}, the whole line${edgesOf(doc).some((e) => who(e.from) === who(l.key!.words) || who(e.to) === who(l.key!.words)) ? `, and a connection to ${l.key.words} makes a second thing` : ''}`,
          fix: `write "- ${l.key.words}" alone; its words go in a connection's label (~ ${l.key.words} -> …: ${l.words.words.split(/\s+/).slice(0, 4).join(' ')}…)`,
        });

  // A Venn's or a table's things are cut at each comma, a comma in a number too.
  if (isListed(kind))
    for (const l of lines)
      l.items.forEach((p, i) => {
        const next = l.items[i + 1];
        if (!next || !/\d$/.test(p.src) || !/^\d{3}(?!\d)/.test(next.src)) return;
        out.push({
          block: l.at,
          kind: 'comma-number',
          words: `${quote(`${p.src},${next.src}`)} reads as two things: ${quote(p.words)} and ${quote(next.words)}`,
          fix: `write the number without its comma (${p.src}${next.src.slice(0, 3)}) or in words`,
        });
      });

  // Words the layout had to set smaller, or cut short, in their box.
  const d = layout(doc);
  const solid = d.shapes.filter((s) => !isLink(s.k));
  for (const s of d.shapes) {
    if (!s.text || isLink(s.k) || !s.hit || s.hit.k === 'edge') continue;
    const f = fitLabel(s);
    // A second line (a role, a date's event) is small print by design: only words cut, or one line set at the smallest size, are said.
    if (!f.cut && (f.scale >= SMALLEST || s.text.includes(' | '))) continue;
    const at = s.hit.k === 'line' ? s.hit.at : (lines.find((l) => who(l.all.words) === who(s.hit!.k === 'node' || s.hit!.k === 'lane' ? s.hit!.name : ''))?.at ?? -1);
    const words = plainLabel(s.text);
    const n = wordsThatFit(s);
    out.push({
      block: at,
      kind: 'label-long',
      words: f.cut
        ? `${quote(words)} is too long for its box: it is cut to ${quote(f.laid.lines.map((x) => x.t).join(' '), 80)}`
        : `${quote(words)} is too long for its box: it is set at ${Math.round(f.scale * 100)}% of its size`,
      fix: `a thing is a name of ${n} word${n === 1 ? '' : 's'} or so here; ${isTree(kind) ? 'its other words go in a child, or in the notes' : 'its other words go in a connection’s label, or in the notes'}`,
    });
  }

  // A connection's label on its line's middle: over another's, or over a thing.
  const boxes = d.shapes.map((s) => (isLink(s.k) ? labelBox(s, d.shapes) : null));
  const said = new Set<number>();
  d.shapes.forEach((s, i) => {
    const box = boxes[i];
    if (!box || s.hit?.k !== 'edge' || said.has(s.hit.at)) return;
    const other = d.shapes.findIndex((_, j) => j !== i && boxes[j] && overlap(box, boxes[j]!));
    const under = solid.find((q: DShape) => {
      const at = q.region === undefined ? wordsBox(q) : null;
      return at && overlap(box, at);
    });
    if (other < 0 && !under) return;
    said.add(s.hit.at);
    // A pair of labels is said once, at the first.
    const theirs = other >= 0 ? d.shapes[other].hit : undefined;
    if (theirs?.k === 'edge') said.add(theirs.at);
    out.push({
      block: s.hit.at,
      kind: 'label-over',
      words: `the label ${quote(s.text)} lies over ${other >= 0 ? `the label ${quote(d.shapes[other].text)}` : quote(plainLabel(under!.text) || 'a thing')}`,
      fix: 'a label of two or three words; the rest goes in the notes',
    });
  });
  return out.sort((a, b) => a.block - b.block);
}

/** What the layout made of a diagram, in numbers: its things and connections, drawn and not, and how each thing's words were set. */
export interface DiagramMeasure {
  kind: KindId;
  w: number;
  h: number;
  things: number;
  edges: { written: number; drawn: number; dropped: number };
  labels: { words: string; px: number; scale: number; lines: number; cut: boolean }[];
}

export function measureDiagram(text: string): DiagramMeasure {
  const doc = parse(text);
  const d = layout(doc);
  const written = doc.blocks.filter((b) => b.k === 'edge').length;
  const drawn = new Set(d.shapes.flatMap((s) => (s.hit?.k === 'edge' ? [s.hit.at] : []))).size;
  const labels = d.shapes
    .filter((s) => s.text && !isLink(s.k) && s.hit && s.hit.k !== 'edge')
    .map((s) => {
      const f = fitLabel(s);
      return { words: plainLabel(s.text), px: Math.round(f.laid.px * 10) / 10, scale: Math.round(f.scale * 100) / 100, lines: f.laid.lines.length, cut: f.cut };
    });
  return { kind: kindOf(doc), w: Math.round(d.w), h: Math.round(d.h), things: labels.length, edges: { written, drawn, dropped: written - drawn }, labels };
}
