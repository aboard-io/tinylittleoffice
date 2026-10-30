/**
 * A pinboard drawn, with no DOM: each thing as SVG, and the page of them, cut to the box round everything. What
 * def.ts builds its pages and files on; the editor draws each thing with the same `itemSvg`, in the page's own colors,
 * with the pictures at the host's address.
 */
import type { Page } from '../../kit/core/app.ts';
import { INK, LINE, MUTED, PAPER, SHADE, pageSvg, r, wrapText, xml } from '../../kit/draw/draw.ts';
import { imageHref } from '../../kit/draw/image-picture.ts';
import { t } from '../../kit/core/i18n.ts';
import { sliceRuns, type Doc, type Run } from '../../doc/index.ts';
import { COLORS, COLOR_NAMES, FRAME_HEAD, NOTE_INK, boundsOf, drawOrder, inkOf, isJoin, joinEnds, paperOf, plainWords, readBoard, wordsRuns, type BoardView, type Item } from './model.ts';

export interface Theme {
  /** Words and strokes with no color of their own. */
  ink: string;
  /** What words over a line stand on (a join's label). */
  paper: string;
  /** A frame's edge and a picture's card with no color. */
  line: string;
  /** A card's ground, where a picture is not kept. */
  shade: string;
  muted: string;
}
export const PRINT: Theme = { ink: INK, paper: PAPER, line: LINE, shade: SHADE, muted: MUTED };

/** The type of each kind's words, in px. */
export const WORDS_PX = { note: 16, text: 20, frame: 16, join: 13 };
/** A note's room inside its edge. */
export const NOTE_PAD = 12;
const LH = 1.3;

/** The markers a join's arrowhead is drawn with: the theme's ink's, and one for each color. */
export function arrowDefs(ink: string): string {
  const one = (id: string, fill: string) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${fill}"/></marker>`;
  return one('pin-arrow', ink) + COLOR_NAMES.map((c) => one(`pin-arrow-${c}`, COLORS[c].ink)).join('');
}

/** Runs as tspans: bold, italic, underline, struck and code drawn as such. */
function runsSvg(runs: Run[]): string {
  return runs
    .map((run) => {
      const deco = [run.u ? 'underline' : '', run.s ? 'line-through' : ''].filter(Boolean).join(' ');
      const attrs = `${run.b ? ' font-weight="600"' : ''}${run.i ? ' font-style="italic"' : ''}${deco ? ` text-decoration="${deco}"` : ''}${run.h ? ' fill-opacity="0.8"' : ''}`;
      return attrs ? `<tspan${attrs}>${xml(run.t)}</tspan>` : xml(run.t);
    })
    .join('');
}

/** Words laid in a box from its top-left: wrapped to `max`, at `px` unless they need less to fit `room` (never under 10), as lines of runs. */
export function layWords(words: string, max: number, px: number, room = Infinity): { px: number; lines: Run[][] } {
  const runs = wordsRuns(words);
  const plain = runs.map((x) => x.t).join('');
  let size = px;
  let lines = wrapText(plain, max, size);
  while (size > 10 && lines.length * size * LH > room) {
    size -= 1;
    lines = wrapText(plain, max, size);
  }
  // Each line's runs: its words found in the words from where the last line ended.
  let at = 0;
  const out = lines.map((line) => {
    const from = plain.indexOf(line, at);
    const start = from < 0 ? at : from;
    at = start + line.length;
    return sliceRuns(runs, start, at);
  });
  return { px: size, lines: out };
}

function wordsSvg(x: number, y: number, laid: { px: number; lines: Run[][] }, fill: string, extra = ''): string {
  const lh = laid.px * LH;
  return laid.lines.map((line, i) => `<text x="${r(x)}" y="${r(y + laid.px + i * lh)}" font-size="${laid.px}" fill="${fill}" xml:space="preserve"${extra}>${runsSvg(line)}</text>`).join('');
}

export interface ItemOpts {
  /** Where a picture is drawn from (the editor's: the host's address); null where it is not kept here. */
  href?: (ref: string) => string | null;
  /** Its words left out, while they are typed over it. */
  noWords?: boolean;
  /** A wide invisible edge, so a thin line or a frame's edge is easy to hit. */
  hit?: boolean;
}

/** One thing as SVG; `v` is the board it is on (a join finds its ends there). */
export function itemSvg(it: Item, v: Pick<BoardView, 'byId'>, th: Theme = PRINT, o: ItemOpts = {}): string {
  const { x, y, w, h } = it;
  const ink = inkOf(it, th.ink);
  if (it.k === 'note') {
    const laid = layWords(it.words, w - NOTE_PAD * 2, WORDS_PX.note, h - NOTE_PAD * 2);
    return (
      `<rect x="${x + 2}" y="${y + 3}" width="${w}" height="${h}" rx="3" fill="#000" fill-opacity="0.12"/>` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${paperOf(it)}"/>` +
      (o.noWords ? '' : wordsSvg(x + NOTE_PAD, y + NOTE_PAD - 2, laid, NOTE_INK))
    );
  }
  if (it.k === 'text') {
    const hit = o.hit ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"/>` : '';
    return hit + (o.noWords ? '' : wordsSvg(x, y, layWords(it.words, w, WORDS_PX.text), ink));
  }
  if (it.k === 'frame') {
    const edge = it.color ? COLORS[it.color].ink : th.line;
    const ground = it.color ? COLORS[it.color].paper : th.line;
    const title = o.noWords
      ? ''
      : plainWords(it.words)
        ? wordsSvg(
            x + 14,
            y + 6,
            { px: WORDS_PX.frame, lines: layWords(it.words, Math.max(24, w - 28), WORDS_PX.frame).lines.slice(0, 1) },
            it.color ? COLORS[it.color].ink : th.ink,
            ' font-weight="600"',
          )
        : '';
    // Only the title strip and the edge take the pointer: a press inside a frame is on the board (or on what it holds).
    const hit = o.hit
      ? `<rect class="pin-hit" x="${x}" y="${y}" width="${w}" height="${FRAME_HEAD}" fill="transparent"/><rect class="pin-hit" x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="transparent" stroke-width="12"/>`
      : '';
    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${ground}" fill-opacity="0.22" stroke="${edge}" stroke-width="1.5" pointer-events="none"/>` +
      `<path d="M${x} ${y + FRAME_HEAD}h${w}" stroke="${edge}" stroke-opacity="0.35" pointer-events="none"/>` +
      title +
      hit
    );
  }
  if (it.k === 'picture') {
    const href = it.image ? (o.href ?? imageHref)(it.image.ref) : null;
    if (href)
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${th.shade}"/><image href="${xml(href)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`;
    // Not kept here (the site keeps no pictures): a card with the picture's words, and nothing fetched.
    const alt = it.image?.alt ?? '';
    const lines = alt ? layWords(alt, w - 24, 13, h - 48) : null;
    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${th.shade}" stroke="${th.line}"/>` +
      `<text x="${r(x + 12)}" y="${r(y + 24)}" font-size="12" fill="${th.muted}">${xml(t('common-picture-not-kept-here'))}</text>` +
      (lines ? wordsSvg(x + 12, y + 32, lines, th.ink) : '')
    );
  }
  if (it.k === 'pen') {
    const pts = it.pts ?? [];
    const points: string[] = [];
    for (let i = 0; i + 1 < pts.length; i += 2) points.push(`${r(x + (pts[i] / 100) * w)},${r(y + (pts[i + 1] / 100) * h)}`);
    const at = `points="${points.join(' ')}" fill="none" stroke-linejoin="round" stroke-linecap="round"`;
    return (o.hit ? `<polyline ${at} stroke="transparent" stroke-width="14"/>` : '') + `<polyline ${at} stroke="${ink}" stroke-width="3"/>`;
  }
  // A join: from the edge of one thing to the edge of the other, its words over its middle.
  const ends = joinEnds(it, v);
  if (!ends) return '';
  const [x1, y1, x2, y2] = ends;
  const line = `x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"`;
  const marker = it.k === 'arrow' ? ` marker-end="url(#${it.color ? `pin-arrow-${it.color}` : 'pin-arrow'})"` : '';
  const words = plainWords(it.words);
  const label =
    words && !o.noWords
      ? `<text x="${r((x1 + x2) / 2)}" y="${r((y1 + y2) / 2 + 4)}" font-size="${WORDS_PX.join}" text-anchor="middle" fill="${ink}" stroke="${th.paper}" stroke-width="4" paint-order="stroke" xml:space="preserve">${runsSvg(wordsRuns(it.words))}</text>`
      : '';
  return (o.hit ? `<line ${line} stroke="transparent" stroke-width="14"/>` : '') + `<line ${line} stroke="${ink}" stroke-width="2"${marker}/>` + label;
}

/** The board in words for whoever cannot see it: how many things, and the frames by name. */
export function describeBoard(v: BoardView): string {
  const things = v.items.filter((i) => !isJoin(i.k)).length;
  if (!things) return t('pinboard-empty-board');
  const frames = v.items
    .filter((i) => i.k === 'frame')
    .map((f) => plainWords(f.words))
    .filter(Boolean);
  const count = t('pinboard-board-of-n-things', { n: things });
  return frames.length ? `${count}. ${t('pinboard-frames-named', { frames: frames.join(', ') })}` : count;
}

/** The board's one page: everything on it, cut to the box round it with a margin; an empty board a blank page. */
export function boardPage(doc: Doc): Page {
  const v = readBoard(doc);
  const box = boundsOf(v);
  if (!box) return { w: 640, h: 400, svg: '', alt: describeBoard(v) };
  const pad = 32;
  const [x0, y0, w, h] = [box[0] - pad, box[1] - pad, Math.max(box[2] + pad * 2, 160), Math.max(box[3] + pad * 2, 120)];
  const items = drawOrder(v)
    .map((it) => itemSvg(it, v))
    .join('');
  return { w, h, svg: `<defs>${arrowDefs(INK)}</defs><rect width="${w}" height="${h}" fill="${PAPER}"/><g transform="translate(${r(-x0)} ${r(-y0)})">${items}</g>`, alt: describeBoard(v) };
}

export const boardToSvg = (doc: Doc): string => '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvg(boardPage(doc)) + '\n';
