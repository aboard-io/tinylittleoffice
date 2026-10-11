/**
 * An outline drawn, with no DOM: a dot per item, deeper ones stepped in, the words wrapped with their marks,
 * the kind of line to the parent named before them, a document under an item as a card, the footnotes
 * and the joins listed under it. Fits a letter page's width; as tall as it needs. What def.ts builds its
 * pages on, and the print and the thumbnail.
 */
import { listNumbers, markNotes, noteNumbers, noteRuns, notesOf, plainText, type Dir, type Doc, type Run } from '../../doc/index.ts';
import type { Page } from '../../kit/app.ts';
import { ACCENT, INK, LINE, MUTED, SHADE, clip, r, rect, textWidth, xml } from '../../kit/draw.ts';
import { glyphNamed } from '../../kit/icons.ts';
import { t } from '../../kit/i18n.ts';
import { docGist, hasChildren, liveLinks, readOutline } from './model.ts';

export { docGist };

/** How each kind of line looks, drawn. */
export const ARROW: Record<Dir, string> = { '--': '—', '->': '→', '<-': '←', '<->': '↔' };

/** A run as drawn: a note's mark is its number, raised. */
export type Piece = Run & { sup?: boolean };

const pieceWidth = (p: Piece, px: number, bold: boolean) => (p.ic ? px : textWidth(p.t, p.sup ? px * 0.65 : px, bold || !!p.b));

/** Rich words wrapped to a width: lines of pieces, broken between words, every mark kept on its piece. */
export function wrapRuns(runs: Piece[], max: number, px: number, bold = false): Piece[][] {
  const lines: Piece[][] = [[]];
  let width = 0;
  for (const run of runs) {
    const pieces: Piece[] = run.ic || run.fn !== undefined || run.sup ? [run] : run.t.split(/(?<= )/).map((t) => ({ ...run, t }));
    for (const p of pieces) {
      const w = pieceWidth({ ...p, t: p.t.trimEnd() }, px, bold);
      if (width && width + w > max) {
        lines.push([]);
        width = 0;
      }
      lines[lines.length - 1].push(p);
      width += pieceWidth(p, px, bold);
    }
  }
  return lines;
}

/** One line of rich words as SVG: tspans carry the marks, a note's number is raised, a link is in the accent, an icon is its glyph. y is the baseline. */
export function richText(x: number, y: number, pieces: Piece[], px: number, bold = false, fill = INK): string {
  let out = '';
  let at = x;
  let spans = '';
  const flush = () => {
    if (spans) out += `<text x="${r(at)}" y="${r(y)}" font-size="${r(px)}" fill="${fill}" xml:space="preserve">${spans}</text>`;
    spans = '';
  };
  let left = x;
  // Neighbouring words with the same marks share one tspan.
  const same = (a: Piece, b: Piece) => !a.ic && !b.ic && a.b === b.b && a.i === b.i && a.u === b.u && a.s === b.s && a.href === b.href && a.sup === b.sup;
  const joined: Piece[] = [];
  for (const p of pieces) {
    const last = joined[joined.length - 1];
    if (last && same(last, p)) joined[joined.length - 1] = { ...last, t: last.t + p.t };
    else joined.push(p);
  }
  for (const p of joined) {
    if (p.ic) {
      flush();
      out += glyphNamed(p.ic, left, y - px * 0.85, px, fill);
      left += px;
      at = left;
      continue;
    }
    const attrs = [
      p.b || bold ? 'font-weight="700"' : '',
      p.i ? 'font-style="italic"' : '',
      p.u ? 'text-decoration="underline"' : p.s ? 'text-decoration="line-through"' : '',
      p.href ? `fill="${ACCENT}"` : '',
      p.sup ? `baseline-shift="super" font-size="${r(px * 0.65)}"` : '',
    ]
      .filter(Boolean)
      .join(' ');
    spans += `<tspan${attrs ? ' ' + attrs : ''}>${xml(p.t)}</tspan>`;
    left += pieceWidth(p, px, bold);
  }
  flush();
  return out;
}

/** The outline drawn: a dot per item, deeper ones stepped in, the words wrapped. `small`: larger type and the first dozen items, for a thumbnail. */
export function outlinePage(doc: Doc, w = 720, small = false): Page {
  const v = readOutline(doc);
  const items = v.items;
  const px = small ? 26 : 17;
  const step = small ? 40 : 28;
  const margin = 48;
  let y = 44;
  let svg = '';
  const next = noteNumbers();
  // Numbered items count as the text export counts them: the items drawn, a document ending the list.
  const count = listNumbers();
  let drawn = 0;
  items.forEach((it, i) => {
    if (!plainText(it.runs).trim() && !it.doc && !hasChildren(items, i)) return;
    if (small && drawn++ >= 12) return;
    const x = margin + it.depth * step;
    if (it.doc) {
      count({ k: 'hr' });
      // Another document, as a card where its item would be: its app and its first line.
      const { app, gist } = docGist(it.doc);
      const cw = Math.min(w - x - margin, 360);
      svg += rect(x, y + 4, cw, 44, SHADE, `stroke="${LINE}" rx="6"`);
      svg += `<text x="${r(x + 12)}" y="${r(y + 24)}" font-size="${r(px * 0.75)}" font-weight="700" fill="${INK}">${xml(appName(app))}</text><text x="${r(x + 12)}" y="${r(y + 41)}" font-size="${r(px * 0.7)}" fill="${MUTED}">${xml(clip(gist, cw - 24, px * 0.7))}</text>`;
      y += 60;
      return;
    }
    // The kind of line to the parent, and its name, small before the words.
    const kind = it.depth && (it.dir || it.label) ? `${ARROW[it.dir ?? '--']}${it.label ? ' ' + it.label : ''}` : '';
    const indent = kind ? textWidth(kind, px * 0.75) + 8 : 0;
    const lines = wrapRuns(markNotes(it.runs, next), w - x - margin - indent, px, it.depth === 0);
    const n = plainText(it.runs).trim() ? count({ k: 'li', depth: it.depth, ...(it.ord ? { ord: true as const } : {}), runs: [] }) : undefined;
    // A numbered item's number stands where the dot would.
    if (n) svg += `<text x="${r(x - 6)}" y="${r(y + px)}" font-size="${r(px * 0.85)}" text-anchor="end" fill="${ACCENT}"${it.depth ? '' : ' font-weight="700"'}>${n}.</text>`;
    else svg += `<circle cx="${r(x - 12)}" cy="${r(y + px * 0.65)}" r="${it.depth ? 3 : 4}" fill="${it.depth ? 'none' : ACCENT}" stroke="${ACCENT}" stroke-width="1.5"/>`;
    if (kind) svg += `<text x="${r(x)}" y="${r(y + px)}" font-size="${r(px * 0.75)}" fill="${ACCENT}">${xml(kind)}</text>`;
    for (const line of lines) svg += richText(x + indent, (y += px * 1.45) - px * 0.45, line, px, it.depth === 0);
    y += px * 0.45;
  });
  if (!items.some((it) => plainText(it.runs).trim() || it.doc)) svg += `<text x="${margin}" y="${r(y + px)}" font-size="${r(px)}" fill="${MUTED}">${xml(t('An empty outline'))}</text>`;
  // The footnotes, listed under the outline, small.
  const notes = small ? [] : notesOf(items.filter((it) => !it.doc));
  if (notes.length) {
    y += 12;
    svg += `<line x1="${margin}" y1="${r(y)}" x2="${margin + 72}" y2="${r(y)}" stroke="${LINE}"/>`;
    y += 4;
    notes.forEach((fn, i) => {
      for (const part of wrapRuns([{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...noteRuns(fn)], w - 2 * margin, px * 0.8)) svg += richText(margin, (y += px * 1.2) - px * 0.3, part, px * 0.8);
    });
    y += px * 0.45;
  }
  // The joins, listed under the outline.
  const links = small ? [] : liveLinks(v);
  if (links.length) {
    y += 16;
    svg += richText(margin, (y += px * 1.45) - px * 0.45, [{ t: t('Connections'), b: true }], px);
    for (const l of links) {
      const line = `${l.from}  ${ARROW[l.dir]}${l.label ? ' ' + l.label : ''}  ${l.to}`;
      for (const part of wrapRuns([{ t: line }], w - 2 * margin, px * 0.9)) svg += richText(margin + 12, (y += px * 1.35) - px * 0.4, part, px * 0.9);
    }
    y += px * 0.45;
  }
  const first = items.find((it) => plainText(it.runs).trim());
  return { w, h: Math.max(200, y + 40), svg, alt: doc.head.title || (first ? plainText(first.runs).trim() : t('An empty outline')) };
}

/** An app's id as a person reads it on a card. (The registry is not reachable from a view without a cycle; the few names are said here.) */
export function appName(id: string): string {
  const names: Record<string, () => string> = {
    sheet: () => t('Spreadsheet'),
    draw: () => t('Drawing Tool'),
    text: () => t('Text'),
    write: () => t('Word Processor'),
    deck: () => t('Presentation Builder'),
    outline: () => t('Outliner'),
    diagram: () => t('Diagram Maker'),
    cal: () => t('Calendar'),
    trip: () => t('Trip Planner'),
    calc: () => t('Calculator'),
    anim: () => t('Animator'),
    locked: () => t('Locked document'),
  };
  return names[id]?.() ?? id;
}
