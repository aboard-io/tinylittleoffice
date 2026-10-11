/**
 * A text drawn and exported, with no DOM: its pages on paper (letter or A4, the margin an inch), with the
 * title large, the document's own head fields under it, headings, paragraphs, lists, quotes, a table block
 * drawn by the sheet's renderer and worked out in place, another document as a picture of its first page,
 * and the footnotes small at the end; and the same text as a web page, as
 * Word (.docx), as RTF and as Markdown. A rule (`hr`) is a page break: the next page on paper, in print
 * and in .docx and .rtf; `---` in Markdown. A contract's signatures are a signature block: a line for each
 * party with their name under it, the day, the key's fingerprint and whether it was verified when drawn
 * (contract.ts). The look (look.ts) sets the type in each: its faces, justified lines, indented paragraphs,
 * small capitals, two columns on paper. (Ported from the old tree's write.def.ts onto runs.)
 */
import { encodeDoc } from '../../kit/codec.ts';
import { ACCENT, FAINT, FONT, INK, LINE, MUTED, SHADE, pageSvg, r, rect, text as svgText, textWidth, xml } from '../../kit/draw.ts';
import { glyphNamed } from '../../kit/icons.ts';
import { LOCKED_LANG, placedLink } from '../../kit/locked.ts';
import { XML_HEAD, zip } from '../../kit/zip.ts';
import { lookup, type ExportContext, type Page } from '../../kit/app.ts';
import { formatCell, listNumbers, markNotes, noteNumbers, noteRuns, notesOf, parse, plainText, referenceNotes, runLinks, write, isText, type Block, type Doc, type Run } from '../../doc/index.ts';
import { currencyAt } from '../sheet/model.ts';
import { tablePage } from '../sheet/view.ts';
import { PAPERS, fenceTitle, fieldsOf, paperOf, tableView, titleBlock } from './model.ts';
import { printedSignatures } from './contract.ts';
import { lookOf, NAMED, STACKS, WIDTH, type Look } from './look.ts';

/* ---------- words on a page ---------- */

/** A piece of a line: words with their marks, a link, a raised number (a footnote's mark), monospace, or an icon by name (its words a space the glyph is drawn over). */
interface Span {
  t: string;
  ic?: string;
  b?: true;
  i?: true;
  u?: true;
  s?: true;
  h?: true;
  link?: boolean;
  sup?: boolean;
  mono?: boolean;
}

const same = (a: Span, b: Span) => !a.ic && !b.ic && a.b === b.b && a.i === b.i && a.u === b.u && a.s === b.s && a.h === b.h && a.link === b.link && a.sup === b.sup && a.mono === b.mono;
const spanWidth = (sp: Span, px: number, bold: boolean) => textWidth(sp.t, sp.sup ? px * 0.65 : px, bold || !!sp.b);

/** Runs as spans: footnote marks as raised numbers, links (and web addresses in plain words) marked; an icon has no words on paper. */
function spansOf(runs: Run[], next: () => number): Span[] {
  const out: Span[] = [];
  for (const run of markNotes(runs, next)) {
    if (run.sup) {
      out.push({ t: run.t, sup: true });
      continue;
    }
    if (run.ic) {
      out.push({ t: '\u2003', ic: run.ic });
      continue;
    }
    for (const p of runLinks(run))
      out.push({
        t: p.t,
        ...(run.b ? { b: true } : {}),
        ...(run.i ? { i: true } : {}),
        ...(run.u ? { u: true } : {}),
        ...(run.s ? { s: true } : {}),
        ...(run.h ? { h: true } : {}),
        ...(p.url ? { link: true } : {}),
      });
  }
  return out;
}

/** Spans wrapped to a width: words kept whole, a line break in the words a new line, marks kept on every piece. */
export function wrapSpans(spans: Span[], max: number, px: number, bold = false): Span[][] {
  const lines: Span[][] = [[]];
  let w = 0;
  const line = () => lines[lines.length - 1];
  const add = (sp: Span) => {
    const l = line();
    const last = l[l.length - 1];
    if (last && !last.sup && !sp.sup && same(last, sp)) last.t += sp.t;
    else l.push({ ...sp });
    w += spanWidth(sp, px, bold);
  };
  for (const sp of spans) {
    if (sp.sup || sp.ic) {
      if (sp.ic && w > 0 && w + spanWidth(sp, px, bold) > max) {
        lines.push([]);
        w = 0;
      }
      add(sp);
      continue;
    }
    sp.t.split('\n').forEach((part, i) => {
      if (i) {
        lines.push([]);
        w = 0;
      }
      for (const word of part.split(/(?<=\s)/)) {
        if (!word) continue;
        if (w > 0 && w + textWidth(word.trimEnd(), px, bold || !!sp.b) > max) {
          lines.push([]);
          w = 0;
        }
        add({ ...sp, t: word });
      }
    });
  }
  return lines.map((l) => {
    const last = l[l.length - 1];
    if (last && !last.sup) last.t = last.t.replace(/\s+$/, '');
    return l.filter((sp) => sp.t);
  });
}

/** One line of spans as SVG text at a baseline. */
function lineSvg(x: number, y: number, line: Span[], px: number, o: { bold?: boolean; anchor?: 'start' | 'middle' | 'end'; fill?: string; font?: string; caps?: boolean; fit?: number } = {}): string {
  const { bold = false, anchor = 'start', fill = INK } = o;
  // The look's face, small capitals, and a justified line stretched to its measure.
  const type = (o.font ? ` font-family="${xml(o.font)}"` : '') + (o.caps ? ' font-variant="small-caps" letter-spacing="0.6"' : '') + (o.fit ? ` textLength="${r(o.fit)}" lengthAdjust="spacing"` : '');
  // Icons are drawn as glyphs over the space their span leaves, at the x the words before them reach (left-aligned lines).
  let glyphs = '';
  let at = x;
  const inner = line
    .map((sp) => {
      if (sp.ic && anchor === 'start') glyphs += glyphNamed(sp.ic, at + px * 0.05, y - px * 0.85, px * 0.9, fill);
      at += spanWidth(sp, px, bold);
      const a: string[] = [];
      if (sp.b && !bold) a.push('font-weight="700"');
      if (sp.i) a.push('font-style="italic"');
      const deco = [sp.u || sp.link ? 'underline' : '', sp.s ? 'line-through' : ''].filter(Boolean).join(' ');
      if (deco) a.push(`text-decoration="${deco}"`);
      if (sp.link) a.push(`fill="${ACCENT}"`);
      if (sp.sup) a.push(`font-size="${r(px * 0.65)}"`, 'baseline-shift="super"');
      if (sp.mono) a.push('font-family="ui-monospace, Menlo, Consolas, monospace"');
      return a.length ? `<tspan ${a.join(' ')}>${xml(sp.t)}</tspan>` : xml(sp.t);
    })
    .join('');
  return `<text x="${r(x)}" y="${r(y)}" font-size="${px}"${type}${bold ? ' font-weight="700"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}" xml:space="preserve">${inner}</text>${glyphs}`;
}

/** A page placed inside another at x, y, within w by h, keeping its shape. */
export function place(page: Page, x: number, y: number, w: number, h: number): string {
  return `<svg x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" viewBox="0 0 ${page.w} ${page.h}" preserveAspectRatio="xMinYMin meet"><rect width="${page.w}" height="${page.h}" fill="#fff"/>${page.svg}</svg>`;
}

/** The address a document held in a fence opens at: on the site the text was shared from, else the fragment alone. */
export function fenceLink(lang: string, body: string, site = ''): string {
  return placedLink(lang, body, encodeDoc, site);
}
/** A placed document's own name: none for a locked one, whose title is sealed with it (kit/locked.ts). */
const placedTitle = (lang: string, body: string): string => (lang === LOCKED_LANG ? '' : fenceTitle(body));
/** The site a link is on ("https://tinylittleoffice.com/"), or '' when there is none. */
export const siteOf = (link: string): string => {
  try {
    return link ? new URL(link).origin + '/' : '';
  } catch {
    return '';
  }
};

/* ---------- the pages ---------- */

/** A block as a strip of a page: its height, how to draw it at a y, whether it stays with the strip after it (a heading), its first line's height. */
interface Bit {
  h: number;
  svg: (y: number) => string;
  keep?: boolean;
  first: number;
  /** A page break: what follows starts the next page. */
  brk?: true;
  /** Across the page when the look sets the body in columns (the title, the fields). */
  wide?: true;
}

const SIZE: Record<string, [number, boolean, number]> = {
  title: [40, true, 20],
  h1: [28, true, 16],
  h2: [21, true, 12],
  h3: [17, true, 10],
  p: [16, false, 12],
  li: [16, false, 5],
  quote: [16, false, 12],
};

/** The document's own head fields as a block under the title: each a small label over its value, two to a row. */
function fieldBits(doc: Doc, M: number, W: number, font?: string): Bit[] {
  const fields = fieldsOf(doc);
  if (!fields.length) return [];
  const colW = (W - 2 * M - 24) / 2;
  const bits: Bit[] = [];
  for (let i = 0; i < fields.length; i += 2) {
    const pair = fields.slice(i, i + 2);
    const drawn = pair.map(([k, v]) => ({ k, lines: v.split(' | ').flatMap((l) => wrapSpans([{ t: l }], colW, 14).map((ln) => ln)) }));
    const rows = Math.max(...drawn.map((d) => d.lines.length));
    const h = 16 + rows * 19 + 10;
    bits.push({
      h,
      first: h,
      svg: (y) =>
        drawn
          .map((d, j) => {
            const x = M + j * (colW + 24);
            return svgText(x, y + 11, d.k.toUpperCase(), { px: 10, fill: FAINT }) + d.lines.map((ln, n) => lineSvg(x, y + 30 + n * 19, ln, 14, { bold: n === 0 && d.lines.length > 1, font })).join('');
          })
          .join(''),
    });
  }
  bits.push({ h: 8, first: 8, svg: () => '' });
  return bits.map((b) => ({ ...b, wide: true }));
}

/** A contract's signatures as a block on paper: two to a row, each a line to sign on with the name under it and what the check found. */
function signatureBits(doc: Doc, at: number, M: number, inner: number): Bit[] {
  const rows = printedSignatures(doc, at);
  const colW = (inner - 32) / 2;
  const bits: Bit[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2).map((p) => ({ ...p, lines: wrapSpans([{ t: p.detail }], colW, 11) }));
    const h = 40 + 20 + Math.max(...pair.map((p) => p.lines.length)) * 15 + 16;
    bits.push({
      h,
      first: h,
      svg: (y) =>
        pair
          .map((p, j) => {
            const x = M + j * (colW + 32);
            const red = p.verdict === 'mismatch' ? '#b91c1c' : undefined;
            return (
              `<line x1="${r(x)}" y1="${y + 36}" x2="${r(x + colW)}" y2="${y + 36}" stroke="${red ?? INK}" stroke-width="1.5"/>` +
              svgText(x, y + 56, p.name, { px: 14, bold: true }) +
              p.lines.map((ln, n) => lineSvg(x, y + 74 + n * 15, ln, 11, { fill: red ?? MUTED })).join('')
            );
          })
          .join(''),
    });
  }
  return bits;
}

/** The text laid out on pages of its paper, in its look's type. `still`: drawn where nothing can move (print, a picture, a thumbnail), so a document placed in it is too. */
export function pages(textOrDoc: string | Doc, small = false, still = false): Page[] {
  const doc = typeof textOrDoc === 'string' ? parse(textOrDoc) : textOrDoc;
  const { w: W, h: PAGE_H, m: M } = PAPERS[paperOf(doc)];
  const look: Look = lookOf(doc);
  const inner = W - 2 * M;
  // Two columns when the look asks for them: everything but the title and the fields is set to a column's width.
  const cols = look.columns ?? 1;
  const GUTTER = 24;
  const colW = cols > 1 ? (inner - GUTTER * (cols - 1)) / cols : inner;
  const font = (f: 'head' | 'body') => (look[f] === 'sans' ? undefined : STACKS[look[f]]);
  const bits: Bit[] = [];
  const number = listNumbers();
  const next = noteNumbers();
  const title = titleBlock(doc);
  const fields = fieldBits(doc, M, W, font('body'));
  // The head's fields sit under the title; with no title, at the top.
  if (!title) bits.push(...fields);
  let fieldsPlaced = !title;
  let prev: Block | undefined;
  for (const b of doc.blocks) {
    const before = prev;
    prev = b;
    const n = number(b);
    const cw = b === title ? inner : colW;
    if (b.k === 'table') {
      const v = tableView(doc, doc.blocks.indexOf(b));
      if (!v) continue;
      const page = tablePage(v);
      const scale = Math.min(1, cw / page.w);
      const h = page.h * scale;
      bits.push({ h: h + 16, first: h + 16, svg: (y) => place(page, M, y, page.w * scale, h) });
      continue;
    }
    if (b.k === 'fence') {
      const lang = b.lang;
      if (lang === 'signatures') {
        bits.push(...signatureBits(doc, doc.blocks.indexOf(b), M, cw));
        continue;
      }
      if (lang) {
        // Another document: its own app draws it small; an app not here yet shows its first lines.
        const def = appOfLazy(lang);
        const page = def ? def.view(b.body, { small: true, ...(still ? { still } : {}) })[0] : null;
        const caption = (def ? placedTitle(b.lang, b.body) || def.name : lang) + (def && placedTitle(b.lang, b.body) ? ` · ${def.name}` : '');
        if (page) {
          const h = Math.min(360, (page.h * cw) / page.w);
          bits.push({
            h: h + 40,
            first: h + 40,
            svg: (y) =>
              `<rect x="${M}" y="${y}" width="${r(cw)}" height="${r(h)}" fill="#fff" stroke="${LINE}" rx="6"/>` + place(page, M, y, cw, h) + svgText(M, y + h + 20, caption, { px: 12, fill: MUTED }),
          });
          continue;
        }
        const lines = b.body
          .split('\n')
          .filter((l) => l.trim() && !/^---/.test(l))
          .slice(0, 6);
        const h = 24 + lines.length * 18 + 12;
        bits.push({
          h: h + 24,
          first: h + 24,
          svg: (y) =>
            rect(M, y, cw, h, SHADE, `stroke="${LINE}" rx="6"`) +
            svgText(M + 12, y + 17, caption, { px: 12, fill: MUTED }) +
            lines.map((l, i) => lineSvg(M + 12, y + 38 + i * 18, [{ t: l, mono: true }], 12)).join(''),
        });
        continue;
      }
      const lines = b.body.split('\n');
      const h = lines.length * 18 + 20;
      bits.push({ h: h + 12, first: h + 12, svg: (y) => rect(M, y, cw, h, SHADE, 'rx="6"') + lines.map((l, i) => lineSvg(M + 12, y + 23 + i * 18, [{ t: l, mono: true }], 13)).join('') });
      continue;
    }
    if (b.k === 'hr') {
      bits.push({ h: 0, first: 0, brk: true, svg: () => '' });
      continue;
    }
    if (b.k === 'edge') {
      bits.push({ h: 28, first: 28, svg: (y) => svgText(M, y + 16, `${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}`, { px: 16 }) });
      continue;
    }
    if (!isText(b)) continue;
    const kind = b.k === 'h' ? (b === title ? 'title' : b.level === 1 ? 'h1' : b.level === 2 ? 'h2' : 'h3') : b.k;
    const [size, bold, gap0] = SIZE[kind];
    const face = b.k === 'h' ? look.head : look.body;
    // A newspaper's headline is larger and its columns' words smaller; a typewriter's page a little smaller, as its letters are wider.
    const px = kind === 'title' && cols > 1 ? 46 : cols > 1 && b.k !== 'h' ? 14 : look.body === 'mono' && kind !== 'title' ? size - 1 : size;
    // A book's paragraphs run on with no gap, each after the first indented; its headings in small capitals, centred.
    const run = look.indent && b.k === 'p' && doc.blocks[doc.blocks.indexOf(b) + 1]?.k === 'p';
    const gap = run ? 0 : gap0;
    const indent = look.indent && b.k === 'p' && before?.k === 'p';
    const caps = look.caps && b.k === 'h' && b !== title;
    const d = b.k === 'li' ? b.depth : 0;
    const left = M + (b.k === 'li' ? 26 * (d + 1) : b.k === 'quote' ? 18 : 0);
    const spans = spansOf(b.runs, next);
    const lead: Span[] = indent ? [{ t: '\u2003\u2003' }] : [];
    const cls = b.a?.cls ?? [];
    const centred = cls.includes('center') || (caps && !cls.includes('right')) || (look.indent && b === title);
    const justify = !centred && !cls.includes('right') && (cls.includes('justify') || (look.justify && (b.k === 'p' || b.k === 'quote')));
    // Wrapped as the sans is estimated, the measure narrowed by how much wider the look's face sets; a justified
    // line is filled a little fuller, as it is fitted to its measure (squeezed a little rather than spaced out).
    const lines = wrapSpans([...lead, ...(spans.length ? spans : [{ t: '' }])], (M + cw - left) / (justify ? 0.92 : WIDTH[face]), px, bold);
    const lh = px * 1.45;
    const mark = b.k === 'li' ? (b.done !== undefined ? (b.done ? '☑' : '☐') : b.ord ? `${n}.` : '•') : '';
    const [tx, anchor] = centred ? [(left + M + cw) / 2, 'middle' as const] : cls.includes('right') ? [M + cw, 'end' as const] : [left, 'start' as const];
    const fill = b.k === 'quote' ? MUTED : INK;
    const f = font(b.k === 'h' ? 'head' : 'body');
    bits.push({
      h: lines.length * lh + gap,
      first: lh + gap,
      keep: b.k === 'h',
      ...(b === title ? { wide: true as const } : {}),
      svg: (y) =>
        (mark ? svgText(left - 8, y + px, mark, { px, anchor: 'end', fill: b.k === 'li' && b.done ? FAINT : INK }) : '') +
        (b.k === 'quote' ? rect(M, y, 3, lines.length * lh, LINE) : '') +
        lines
          .map((l, i) =>
            lineSvg(tx, y + px + i * lh, l, px, { bold: bold && !caps, anchor, fill, font: f, caps, fit: justify && i < lines.length - 1 && !l.some((sp) => sp.ic) ? M + cw - left : undefined }),
          )
          .join(''),
    });
    if (b === title && cols > 1)
      bits.push({
        h: 18,
        first: 18,
        wide: true,
        svg: (y) =>
          `<line x1="${M}" y1="${y + 2}" x2="${M + inner}" y2="${y + 2}" stroke="${INK}" stroke-width="2"/><line x1="${M}" y1="${y + 6}" x2="${M + inner}" y2="${y + 6}" stroke="${INK}" stroke-width="0.75"/>`,
      });
    if (b === title && !fieldsPlaced) {
      bits.push(...fields);
      fieldsPlaced = true;
    }
  }
  // The notes at the end, small, under a thin rule.
  const notes = notesOf(doc.blocks);
  if (notes.length) {
    const px = 11;
    const lh = px * 1.45;
    const f = font('body');
    bits.push({ h: 20, first: 20, keep: true, svg: (y) => `<line x1="${M}" y1="${y + 10}" x2="${M + 72}" y2="${y + 10}" stroke="${LINE}"/>` });
    notes.forEach((fn, i) => {
      const lines = wrapSpans([{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...spansOf(noteRuns(fn), noteNumbers())], colW / WIDTH[look.body], px);
      bits.push({ h: lines.length * lh + 4, first: lh + 4, svg: (y) => lines.map((l, k) => lineSvg(M, y + px + k * lh, l, px, { font: f })).join('') });
    });
  }
  const out: Page[] = [];
  let svg = '';
  let y: number = M;
  // The column being filled, where the columns begin on this page (under the title), and the lowest any column reaches.
  let col = 0;
  let top: number = M;
  let low: number = M;
  const alt = (title ? plainText(title.runs) : '') || doc.head.title || '';
  const turn = () => {
    out.push({ w: W, h: PAGE_H, svg, alt });
    svg = '';
    y = top = low = M;
    col = 0;
  };
  bits.forEach((b, i) => {
    // A page break: the next page, unless this one has nothing on it yet.
    if (b.brk) {
      if (low > M || y > M) turn();
      return;
    }
    // A heading goes to the next column or page rather than sit alone at the foot of this one.
    // (A strip is not split across pages, so it is the next strip whole, when that is short.)
    const after = bits[i + 1];
    const need = b.keep ? b.h + (after ? (after.h <= (PAGE_H - 2 * M) / 4 ? after.h : after.first) : 0) : b.h;
    if (b.wide || cols === 1) {
      // Across the page: under everything on it so far.
      y = Math.max(y, low);
      if (y + need > PAGE_H - M && y > M) turn();
      svg += b.svg(y);
      y += b.h;
      low = top = y;
      col = 0;
      return;
    }
    if (y + need > PAGE_H - M && y > top) {
      if (col < cols - 1) {
        col++;
        y = top;
      } else turn();
    }
    const dx = col * (colW + GUTTER);
    svg += dx ? `<g transform="translate(${r(dx)} 0)">${b.svg(y)}</g>` : b.svg(y);
    y += b.h;
    low = Math.max(low, y);
  });
  out.push({ w: W, h: PAGE_H, svg, alt });
  if (small) return [out[0]];
  // More than one page: each numbered at its foot, in the margin.
  return out.length > 1 ? out.map((p, i) => ({ ...p, svg: p.svg + svgText(W / 2, PAGE_H - M / 2 + 4, String(i + 1), { px: 11, fill: MUTED, anchor: 'middle' }) })) : out;
}

/** Another app's definition, through the kit (the registry imports this app, so this app does not import the registry). */
const appOfLazy = (id: string) => lookup.appOf(id);

/* ---------- HTML ---------- */

/** A run's words as HTML, with their marks and links; a web address in plain words is a link too. */
export function markedHtml(run: Run, bold = 'strong', italic = 'em'): string {
  let s = runLinks(run)
    .map((p) => (p.url ? `<a href="${xml(p.url)}">${xml(p.t)}</a>` : xml(p.t).replace(/\n/g, '<br>')))
    .join('');
  if (run.h) s = `<mark>${s}</mark>`;
  if (run.s) s = `<s>${s}</s>`;
  if (run.u) s = `<u>${s}</u>`;
  if (run.i) s = `<${italic}>${s}</${italic}>`;
  if (run.b) s = `<${bold}>${s}</${bold}>`;
  return s;
}
const htmlRun = (run: Run): string => (run.ic ? `<span class="ic" data-icon="${xml(run.ic)}" role="img" aria-label="${xml(run.ic)}"></span>` : markedHtml(run));

/** A footnote's mark in HTML: its number, raised, a link to the note. `stem` names the ids and keeps two documents on one page apart. */
export const noteMarkHtml = (n: number, stem = 'fn') => `<sup class="fn" role="doc-noteref"><a href="#${stem}-${n}" id="${stem}ref-${n}">${n}</a></sup>`;
/** The notes themselves, at the end: a thin rule, small type, each with a way back to its mark. Nothing when there are none. */
export function endnotesHtml(notes: string[], stem = 'fn'): string {
  if (!notes.length) return '';
  return `<section class="fn-notes" role="doc-endnotes" aria-label="Footnotes"><hr><ol>${notes.map((fn, i) => `<li id="${stem}-${i + 1}">${noteRuns(fn).map(htmlRun).join('')} <a href="#${stem}ref-${i + 1}" role="doc-backlink" aria-label="Back to the text">↩</a></li>`).join('')}</ol></section>`;
}

/** Blocks as pieces of HTML, the list items properly nested: item(b) is what a list item holds, other(b) the whole of any other block. */
export function blocksHtml(blocks: Block[], item: (b: Extract<Block, { k: 'li' }>) => string, other: (b: Block) => string): string[] {
  const out: string[] = [];
  const open: string[] = [];
  const closeTo = (depth: number) => {
    while (open.length > depth) out.push(`</li></${open.pop()}>`);
  };
  for (const b of blocks) {
    if (b.k === 'li') {
      const tag = b.ord ? 'ol' : 'ul';
      const depth = b.depth + 1;
      closeTo(depth);
      if (open.length === depth && open[depth - 1] !== tag) closeTo(depth - 1);
      if (open.length === depth) out.push('</li>');
      while (open.length < depth) {
        out.push(`<${tag}>`);
        open.push(tag);
        if (open.length < depth) out.push('<li>');
      }
      out.push(`<li${b.done !== undefined ? ` class="task${b.done ? ' done' : ''}"` : ''}${alignStyle(b)}>${item(b)}`);
      continue;
    }
    closeTo(0);
    out.push(other(b));
  }
  closeTo(0);
  return out;
}

const alignStyle = (b: Block) => {
  const cls = b.a?.cls ?? [];
  const how = cls.find((c) => c === 'center' || c === 'right' || c === 'justify');
  return how ? ` style="text-align:${how}"` : '';
};

/** A table block as an HTML table: the names over the columns, the values worked out, numbers to the right. */
function tableHtml(doc: Doc, at: number): string {
  const v = tableView(doc, at);
  if (!v) return '';
  const head = v.cols.map((c) => (/^Col[A-Z]$/.test(c.name) ? '' : c.name));
  const named = head.some(Boolean);
  const rows = v.table.rows.map(
    (row, ri) =>
      `<tr>${row.map((_, c) => `<td${typeof v.values[ri]?.[c] === 'number' ? ' class="n"' : ''}>${xml(formatCell(v.values[ri]?.[c] ?? null, v.cols[c]?.type, currencyAt(v, c)))}</td>`).join('')}</tr>`,
  );
  return `<table>${named ? `<thead><tr>${head.map((h) => `<th scope="col">${xml(h)}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.join('')}</tbody></table>`;
}

/** The body of the text as HTML: headings, paragraphs, nested lists, tables, documents held in it as figures, the footnotes at the end. */
export function bodyHtml(doc: Doc, site = '', stem = 'fn'): string {
  const next = noteNumbers();
  const inner = (b: { runs: Run[] }) => b.runs.map((run) => (run.fn === undefined ? htmlRun(run) : noteMarkHtml(next(), stem))).join('');
  const title = titleBlock(doc);
  const fields = fieldsOf(doc);
  const fieldsHtml = fields.length
    ? `<dl class="fields">${fields
        .map(
          ([k, v]) =>
            `<div><dt>${xml(k)}</dt><dd>${v
              .split(' | ')
              .map((l, i) => (i ? xml(l) : `<strong>${xml(l)}</strong>`))
              .join('<br>')}</dd></div>`,
        )
        .join('')}</dl>`
    : '';
  const parts = blocksHtml(
    doc.blocks,
    (b) => (b.done === undefined ? '' : b.done ? '<input type="checkbox" checked disabled> ' : '<input type="checkbox" disabled> ') + inner(b),
    (b) => {
      switch (b.k) {
        case 'h': {
          const tag = `h${b.level}`;
          return `<${tag}${b === title ? ' class="title"' : ''}${alignStyle(b)}>${inner(b) || '<br>'}</${tag}>` + (b === title ? fieldsHtml : '');
        }
        case 'quote':
          return `<blockquote${alignStyle(b)}>${inner(b) || '<br>'}</blockquote>`;
        case 'hr':
          return '<hr class="page-break">';
        case 'table':
          return tableHtml(doc, doc.blocks.indexOf(b));
        case 'edge':
          return `<p>${xml(`${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}`)}</p>`;
        case 'fence': {
          if (!b.lang) return `<pre>${xml(b.body)}</pre>`;
          if (b.lang === 'signatures') {
            const rows = printedSignatures(doc, doc.blocks.indexOf(b));
            return rows.length ? `<div class="signed">${rows.map((p) => `<div class="${p.verdict}"><strong>${xml(p.name)}</strong><small>${xml(p.detail)}</small></div>`).join('')}</div>` : '';
          }
          const def = appOfLazy(b.lang);
          const name = placedTitle(b.lang, b.body) || def?.name || b.lang;
          const page = def?.view(b.body, { small: true })[0];
          return `<figure class="doc">${page ? `<a href="${xml(fenceLink(b.lang, b.body, site))}">${pageSvg(page, `role="img" aria-label="${xml(name)}"`)}</a>` : `<pre>${xml(b.body)}</pre>`}<figcaption><a href="${xml(fenceLink(b.lang, b.body, site))}">${xml(name)}</a>${def ? ` <small>${xml(def.name)}</small>` : ''}</figcaption></figure>`;
        }
        default:
          return `<p${alignStyle(b)}>${inner(b) || '<br>'}</p>`;
      }
    },
  );
  if (!title && fieldsHtml) parts.unshift(fieldsHtml);
  const notes = endnotesHtml(notesOf(doc.blocks), stem);
  return [...parts, ...(notes ? [notes] : [])].join('\n');
}

/** The look as CSS over the page's own: its faces, and a book's or a newspaper's setting (look.ts). */
export function lookCss(look: Look): string {
  const css: string[] = [];
  if (look.body !== 'sans') css.push(`body{font-family:${STACKS[look.body]}}`);
  if (look.head !== 'sans') css.push(`h1,h2,h3,h4,h5,h6{font-family:${STACKS[look.head]}}`);
  if (look.body === 'mono') css.push('body{font-size:15px}h1.title{letter-spacing:0}');
  if (look.justify) css.push('main>p,blockquote{text-align:justify;hyphens:auto}');
  if (look.indent) css.push('main>p{margin:0}main>p+p{text-indent:1.5em}h1.title{text-align:center;font-weight:500;letter-spacing:0}');
  if (look.caps) css.push('h1:not(.title),h2,h3{font-variant:small-caps;letter-spacing:.04em;text-align:center;font-weight:600}');
  if (look.columns)
    css.push(
      `h1.title{font-size:3em;line-height:1.02;padding-bottom:.3em;border-bottom:3px double ${INK}}@media print{main{columns:${look.columns};column-gap:24px}main>h1.title,main>.fields{column-span:all}}`,
    );
  return css.join('\n');
}

/** The text as a standalone web page, the words still words. */
export function docToHtml(doc: Doc, ctx: ExportContext): string {
  const title = ctx.title || (titleBlock(doc) ? plainText(titleBlock(doc)!.runs) : '') || 'Document';
  const paper = PAPERS[paperOf(doc)];
  const look = lookOf(doc);
  return `<!doctype html>
<html lang="${typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(title)}</title>
<meta name="generator" content="TinyLittleOffice">
<meta property="og:title" content="${xml(title)}">${ctx.link ? `\n<link rel="alternate" href="${xml(ctx.link)}" title="Open in Tiny Little Office">` : ''}
<style>
@page{size:${paper.w === 816 ? 'letter' : 'A4'};margin:${paper.w === 816 ? '1in' : '25mm'}}
body{font:16px/1.6 ${FONT};color:${INK};max-width:${paper.w - 2 * paper.m}px;margin:2em auto;padding:0 1em}
h1.title{font-size:2.6em;line-height:1.1;letter-spacing:-0.02em;margin:0 0 .6em}h1{font-size:1.8em}h2{font-size:1.35em}h3,h4,h5,h6{font-size:1.1em}
p,li{margin:0 0 .6em}blockquote{margin:0 0 .6em;padding-left:12px;border-left:3px solid ${LINE};color:${MUTED}}
li.task{list-style:none;margin-left:-1.4em}li.done{color:${MUTED}}
.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(12em,1fr));gap:1em;margin:0 0 1.5em}.fields dt{font-size:.7em;letter-spacing:.06em;text-transform:uppercase;color:${MUTED}}.fields dd{margin:.2em 0 0}
table{border-collapse:collapse;margin:0 0 1em;font-size:.95em}th{background:${SHADE};text-align:left;font-size:.85em;padding:.4em .7em;border:1px solid ${LINE}}td{padding:.4em .7em;border:1px solid ${LINE}}td.n{text-align:right;font-variant-numeric:tabular-nums}
figure{margin:1em 0}figure.doc svg{display:block;max-width:100%;height:auto;border:1px solid ${LINE};border-radius:8px}figcaption,figure.doc{color:${MUTED};font-size:.9em}
mark{background:#fde68a}pre{padding:.8em 1em;background:${SHADE};border-radius:8px;overflow:auto;font-size:.85em}
a{color:${ACCENT}}.fn a{text-decoration:none}.fn-notes{margin-top:2em;font-size:.8em;color:${MUTED}}.fn-notes hr{width:72px;margin:0 0 .6em;border:0;border-top:1px solid ${LINE}}.fn-notes ol{padding-left:1.6em}
.signed{margin:2em 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(15em,1fr));gap:1.5em}.signed div{margin-top:2em;border-top:1.5px solid ${INK};padding-top:.4em}.signed .mismatch{border-top-color:#b91c1c}.signed strong,.signed small{display:block}.signed small{color:${MUTED};font-size:.82em;overflow-wrap:anywhere}.signed .mismatch small{color:#b91c1c}
hr.page-break{margin:2em 0;border:0;border-top:1px dashed ${LINE}}@media print{hr.page-break{break-after:page;margin:0;border:0}}
footer{margin-top:3em;color:${MUTED};font-size:.85em}
${lookCss(look)}
</style>
</head>
<body>
<main>
${bodyHtml(doc, siteOf(ctx.link))}
</main>${ctx.link ? `\n<footer><p><a href="${xml(ctx.link)}">Open in Tiny Little Office</a></p></footer>` : ''}
</body>
</html>
`;
}

/* ---------- Markdown ---------- */

/** The text as Markdown anyone reads: its footnotes in the reference form, [^1] with "[^1]: the note" at the end. */
export const docToMarkdown = (doc: Doc): string => write(referenceNotes(doc));

/* ---------- RTF ---------- */

function rtfText(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const ch = s[i];
    if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
    else if (ch === '\t') out += '\\tab ';
    else if (ch === '\n') out += '\\line ';
    else if (code < 32) continue;
    else if (code < 128) out += ch;
    // \uN takes a signed 16-bit number; astral characters go out as two surrogates.
    else out += `\\u${code > 32767 ? code - 65536 : code}?`;
  }
  return out;
}

function rtfRun(run: Run, next: () => number = noteNumbers()): string {
  if (run.ic) return '';
  if (run.fn !== undefined) return `{\\super ${next()}}`;
  const on = (run.b ? '\\b' : '') + (run.i ? '\\i' : '') + (run.u ? '\\ul' : '') + (run.s ? '\\strike' : '') + (run.h ? '\\highlight3' : '');
  const inner = runLinks(run)
    .map((p) => (p.url ? `{\\field{\\*\\fldinst HYPERLINK "${rtfText(p.url)}"}{\\fldrslt {\\ul\\cf1 ${rtfText(p.t)}}}}` : rtfText(p.t)))
    .join('');
  return on ? `{${on} ${inner}}` : inner;
}

/** The text as RTF: paragraphs, headings, lists, a table as a table, links, footnotes as marks with the notes at the end. */
export function docToRtf(doc: Doc, ctx: ExportContext): string {
  const look = lookOf(doc);
  // The look's faces: f0 the body, f1 the headings (Helvetica for the sans, as RTF readers have it).
  const named = (f: Look['body']) => (f === 'sans' ? { name: 'Helvetica', rtf: 'fswiss' } : NAMED[f]);
  const fonts = [named(look.body), named(look.head)].map((f, i) => `{\\f${i}\\${f.rtf}\\fcharset0 ${f.name};}`).join('');
  const out: string[] = [`{\\rtf1\\ansi\\ansicpg1252\\deff0\\uc1{\\fonttbl${fonts}}{\\colortbl;\\red79\\green70\\blue229;\\red82\\green82\\blue91;\\red253\\green230\\blue138;}`, '\\f0\\fs24'];
  const number = listNumbers();
  const next = noteNumbers();
  const site = siteOf(ctx.link);
  const title = titleBlock(doc);
  const fields = () =>
    fieldsOf(doc).map(
      ([k, v]) =>
        `{\\pard\\sa60 {\\fs16\\cf2 ${rtfText(k.toUpperCase())}}\\line ${v
          .split(' | ')
          .map((l, i) => (i ? rtfText(l) : `{\\b ${rtfText(l)}}`))
          .join('\\line ')}\\par}`,
    );
  // Two columns after the title and its fields, a section of their own that does not start a page.
  const columns = look.columns ? `\\sect\\sectd\\sbknone\\cols${look.columns}\\colsx360` : '';
  if (!title) out.push(...fields(), ...(columns ? [columns] : []));
  const blocks = doc.blocks;
  for (const [at, b] of blocks.entries()) {
    const n = number(b);
    const own = b.a?.cls?.includes('center') ? '\\qc' : b.a?.cls?.includes('right') ? '\\qr' : b.a?.cls?.includes('justify') ? '\\qj' : '';
    // A book's paragraphs: justified, run on with no gap, each after the first indented; its headings centred in small capitals.
    const para = b.k === 'p';
    const jc = own || (look.justify && para ? '\\qj' : '') || (look.caps && b.k === 'h' && b !== title ? '\\qc' : '');
    const book = look.indent && para ? `${blocks[at - 1]?.k === 'p' ? '\\fi360' : ''}${blocks[at + 1]?.k === 'p' ? '\\sa0' : ''}` : '';
    if (b.k === 'table') {
      const v = tableView(doc, doc.blocks.indexOf(b));
      if (!v) continue;
      const width = Math.floor(9000 / Math.max(1, v.cols.length));
      const cells = v.cols.map((_, c) => `\\cellx${(c + 1) * width}`).join('');
      const row = (vals: string[], bold = false) => `{\\trowd\\trgaph80${cells}${vals.map((x) => `\\intbl ${bold ? '{\\b ' : ''}${rtfText(x)}${bold ? '}' : ''}\\cell`).join('')}\\row}`;
      const names = v.cols.map((c) => (/^Col[A-Z]$/.test(c.name) ? '' : c.name));
      if (names.some(Boolean)) out.push(row(names, true));
      v.table.rows.forEach((r, ri) => out.push(row(r.map((_, c) => formatCell(v.values[ri]?.[c] ?? null, v.cols[c]?.type, currencyAt(v, c))))));
      out.push('{\\pard\\sa120\\par}');
      continue;
    }
    if (b.k === 'fence') {
      if (!b.lang) {
        out.push(`{\\pard\\sa160\\f0\\fs20 ${b.body.split('\n').map(rtfText).join('\\line ')}\\par}`);
        continue;
      }
      if (b.lang === 'signatures') {
        for (const p of printedSignatures(doc, doc.blocks.indexOf(b)))
          out.push(`{\\pard\\sb480\\sa120\\brdrt\\brdrs\\brdrw15\\brsp60 {\\b ${rtfText(p.name)}}\\line {\\fs18\\cf2 ${rtfText(p.detail)}}\\par}`);
        continue;
      }
      const def = appOfLazy(b.lang);
      const name = placedTitle(b.lang, b.body) || def?.name || b.lang;
      out.push(
        `{\\pard\\sb120\\sa60\\li360 {\\field{\\*\\fldinst HYPERLINK "${rtfText(fenceLink(b.lang, b.body, site))}"}{\\fldrslt {\\ul\\cf1\\b ${rtfText(name)}}}} {\\i (${rtfText(def?.name ?? b.lang)})}\\par}`,
      );
      continue;
    }
    if (b.k === 'hr') {
      out.push('\\page');
      continue;
    }
    if (b.k === 'edge') {
      out.push(`{\\pard\\sa160 ${rtfText(`${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}`)}\\par}`);
      continue;
    }
    if (!isText(b)) continue;
    const runs = b.runs.map((run) => rtfRun(run, next)).join('');
    if (b.k === 'li') {
      const li = 720 + 360 * b.depth;
      const mark = b.done !== undefined ? (b.done ? '\\u9745?' : '\\u9744?') : b.ord ? `${n}.` : '\\bullet';
      out.push(`{\\pard\\li${li}\\fi-360\\sa60${jc} ${mark}\\tab ${runs}\\par}`);
    } else if (b.k === 'h' && b === title) {
      out.push(`{\\pard\\sa240${jc || (look.indent ? '\\qc' : '')}\\f1\\b\\fs64 ${runs}\\par}`, ...fields(), ...(columns ? [columns] : []));
    } else if (b.k === 'h')
      out.push(`{\\pard\\sb${b.level === 1 ? 240 : 200}\\sa${b.level === 1 ? 160 : 120}${jc}\\f1${look.caps ? '\\scaps' : '\\b'}\\fs${b.level === 1 ? 40 : b.level === 2 ? 30 : 26} ${runs}\\par}`);
    else if (b.k === 'quote') out.push(`{\\pard\\li360\\sa160${jc}\\cf2 ${runs}\\par}`);
    else out.push(`{\\pard\\sa160${book}${jc} ${runs}\\par}`);
  }
  // The notes at the end, small, under a rule.
  notesOf(doc.blocks).forEach((fn, i) =>
    out.push(
      `{\\pard${i ? '' : '\\brdrt\\brdrs\\brdrw10\\brsp120'}\\sa60\\fs18 {\\super ${i + 1}} ${noteRuns(fn)
        .map((run) => rtfRun(run))
        .join('')}\\par}`,
    ),
  );
  return out.join('\n') + '\n}\n';
}

/* ---------- Word ---------- */

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
/** Paper in twentieths of a point, and the margin: Letter with an inch, A4 with 25 mm. */
const TWIPS: Record<string, { w: number; h: number; m: number }> = { letter: { w: 12240, h: 15840, m: 1440 }, a4: { w: 11906, h: 16838, m: 1417 } };

/** A run as WordprocessingML: its marks as run properties; a link a hyperlink, through a relationship the caller gives out; a footnote's mark its number, raised. `small` for the notes themselves. */
function docxRun(run: Run, rel: (url: string) => string, next: () => number = noteNumbers(), small = false): string {
  if (run.ic) return '';
  const size = small ? '<w:sz w:val="18"/>' : '';
  if (run.fn !== undefined) return `<w:r><w:rPr><w:vertAlign w:val="superscript"/>${size}</w:rPr><w:t>${next()}</w:t></w:r>`;
  const props = size + (run.b ? '<w:b/>' : '') + (run.i ? '<w:i/>' : '') + (run.u ? '<w:u w:val="single"/>' : '') + (run.s ? '<w:strike/>' : '') + (run.h ? '<w:highlight w:val="yellow"/>' : '');
  const piece = (t: string, extra = '') =>
    `<w:r>${props || extra ? `<w:rPr>${extra}${props}</w:rPr>` : ''}${t
      .split('\n')
      .map((line) => `<w:t xml:space="preserve">${xml(line)}</w:t>`)
      .join('<w:br/>')}</w:r>`;
  return runLinks(run)
    .map((p) => (p.url ? `<w:hyperlink r:id="${rel(p.url)}">${piece(p.t, '<w:rStyle w:val="Hyperlink"/>')}</w:hyperlink>` : piece(p.t)))
    .join('');
}

/**
 * The text as a Word document (.docx): the smallest WordprocessingML that Word, LibreOffice and Pages all
 * open. Paragraphs, the title and headings as styles, the marks, lists bulleted or numbered to three
 * levels (each numbered list starting at 1), links, alignment, the paper from the header, a table block as
 * a table of its worked-out values, another document as a link to it. Footnotes are marks in the text and
 * the notes as small paragraphs at the end (Word's own notes are deep).
 */
export function docToDocx(doc: Doc, ctx: ExportContext): Uint8Array {
  const rels: string[] = [];
  const rel = (url: string) => {
    const i = rels.indexOf(url);
    return `rId${(i < 0 ? rels.push(url) : i + 1) + 2}`;
  };
  const site = siteOf(ctx.link);
  // Every numbered list is a numbering instance of its own, so each starts again at 1.
  const nums: string[] = [];
  let numbered = 0;
  let prev = '';
  const paras: string[] = [];
  const next = noteNumbers();
  const title = titleBlock(doc);
  const plain = (t: string, props = '') => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(t)}</w:t></w:r>`;
  const look = lookOf(doc);
  const paper = TWIPS[paperOf(doc)];
  const page = `<w:pgSz w:w="${paper.w}" w:h="${paper.h}"/><w:pgMar w:top="${paper.m}" w:right="${paper.m}" w:bottom="${paper.m}" w:left="${paper.m}" w:header="720" w:footer="720" w:gutter="0"/>`;
  // Two columns (a newspaper): the title and the fields a section of one column, the rest a section of two that does not start a page.
  const oneColumn = look.columns ? `<w:p><w:pPr><w:sectPr><w:type w:val="continuous"/>${page}<w:cols w:space="720"/></w:sectPr></w:pPr></w:p>` : '';
  const fields = () =>
    fieldsOf(doc).map(
      ([k, v]) =>
        `<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>${plain(k.toUpperCase(), '<w:sz w:val="16"/><w:color w:val="52525B"/>')}<w:r><w:br/></w:r>${v
          .split(' | ')
          .map((l, i) => plain(l, i ? '' : '<w:b/>'))
          .join('<w:r><w:br/></w:r>')}</w:p>`,
    );
  if (!title) paras.push(...fields(), ...(oneColumn ? [oneColumn] : []));
  const blocks = doc.blocks;
  for (const [at, b] of blocks.entries()) {
    const cls = b.a?.cls ?? [];
    const para = b.k === 'p';
    // A book's paragraphs justified, run on with no gap, each after the first indented (its headings are their styles').
    const how = cls.includes('center') ? 'center' : cls.includes('right') ? 'right' : cls.includes('justify') || (look.justify && para) ? 'both' : '';
    const jc =
      (look.indent && para ? `${blocks[at + 1]?.k === 'p' ? '<w:spacing w:after="0"/>' : ''}${blocks[at - 1]?.k === 'p' ? '<w:ind w:firstLine="360"/>' : ''}` : '') +
      (how ? `<w:jc w:val="${how}"/>` : '');
    const last = prev;
    prev = b.k === 'li' ? (b.ord ? 'ol' : 'ul') : b.k;
    if (b.k === 'table') {
      const v = tableView(doc, doc.blocks.indexOf(b));
      if (!v) continue;
      const width = Math.floor(9000 / Math.max(1, v.cols.length));
      const cell = (t: string, bold = false, right = false) =>
        `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/>${right ? '<w:jc w:val="right"/>' : ''}</w:pPr>${plain(t, bold ? '<w:b/>' : '')}</w:p></w:tc>`;
      const names = v.cols.map((c) => (/^Col[A-Z]$/.test(c.name) ? '' : c.name));
      const rows = [
        ...(names.some(Boolean) ? [`<w:tr>${names.map((nm) => cell(nm, true)).join('')}</w:tr>`] : []),
        ...v.table.rows.map(
          (row, ri) => `<w:tr>${row.map((_, c) => cell(formatCell(v.values[ri]?.[c] ?? null, v.cols[c]?.type, currencyAt(v, c)), false, typeof v.values[ri]?.[c] === 'number')).join('')}</w:tr>`,
        ),
      ];
      paras.push(
        `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D4D4D8"/><w:left w:val="single" w:sz="4" w:color="D4D4D8"/><w:bottom w:val="single" w:sz="4" w:color="D4D4D8"/><w:right w:val="single" w:sz="4" w:color="D4D4D8"/><w:insideH w:val="single" w:sz="4" w:color="D4D4D8"/><w:insideV w:val="single" w:sz="4" w:color="D4D4D8"/></w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${v.cols.map(() => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl><w:p/>`,
      );
      continue;
    }
    if (b.k === 'fence') {
      if (!b.lang) {
        paras.push(
          `<w:p>${b.body
            .split('\n')
            .map((l) => plain(l, '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="18"/>'))
            .join('<w:r><w:br/></w:r>')}</w:p>`,
        );
        continue;
      }
      if (b.lang === 'signatures') {
        for (const p of printedSignatures(doc, doc.blocks.indexOf(b)))
          paras.push(
            `<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="${p.verdict === 'mismatch' ? 'B91C1C' : '18181B'}"/></w:pBdr><w:spacing w:before="600" w:after="120"/></w:pPr>${plain(p.name, '<w:b/>')}<w:r><w:br/></w:r>${plain(p.detail, `<w:sz w:val="18"/><w:color w:val="${p.verdict === 'mismatch' ? 'B91C1C' : '52525B'}"/>`)}</w:p>`,
          );
        continue;
      }
      const def = appOfLazy(b.lang);
      const name = placedTitle(b.lang, b.body) || def?.name || b.lang;
      paras.push(
        `<w:p><w:hyperlink r:id="${rel(fenceLink(b.lang, b.body, site))}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/><w:b/></w:rPr><w:t xml:space="preserve">${xml(name)}</w:t></w:r></w:hyperlink>${plain(` (${def?.name ?? b.lang})`, '<w:i/>')}</w:p>`,
      );
      continue;
    }
    if (b.k === 'hr') {
      paras.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
      continue;
    }
    if (b.k === 'edge') {
      paras.push(`<w:p>${plain(`${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}`)}</w:p>`);
      continue;
    }
    if (!isText(b)) continue;
    const runs = b.runs.map((run) => docxRun(run, rel, next)).join('');
    if (b.k === 'li') {
      if (b.done !== undefined) {
        paras.push(`<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="${720 * (b.depth + 1)}" w:hanging="360"/>${jc}</w:pPr>${plain(b.done ? '☑ ' : '☐ ')}${runs}</w:p>`);
        continue;
      }
      if (b.ord && last !== 'ol')
        nums.push(`<w:num w:numId="${(numbered = nums.length + 2)}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`);
      paras.push(`<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${Math.min(b.depth, 2)}"/><w:numId w:val="${b.ord ? numbered : 1}"/></w:numPr>${jc}</w:pPr>${runs}</w:p>`);
      continue;
    }
    const style = b.k === 'h' ? (b === title ? 'Title' : b.level === 1 ? 'Heading1' : 'Heading2') : b.k === 'quote' ? 'Quote' : '';
    paras.push(`<w:p>${style || jc ? `<w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${jc}</w:pPr>` : ''}${runs}</w:p>`);
    if (b === title) paras.push(...fields(), ...(oneColumn ? [oneColumn] : []));
  }
  notesOf(doc.blocks).forEach((fn, i) =>
    paras.push(
      `<w:p><w:pPr>${i ? '<w:spacing w:after="60"/>' : '<w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="A1A1AA"/></w:pBdr><w:spacing w:before="360" w:after="60"/>'}</w:pPr>${docxRun({ t: '', fn }, rel, () => i + 1, true)}<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>${noteRuns(
        fn,
      )
        .map((run) => docxRun(run, rel, noteNumbers(), true))
        .join('')}</w:p>`,
    ),
  );
  const sect = `<w:sectPr>${look.columns ? '<w:type w:val="continuous"/>' : ''}${page}${look.columns ? `<w:cols w:num="${look.columns}" w:space="360"/>` : ''}</w:sectPr>`;
  const bullets = ['•', '–', '·'];
  const level = (i: number, kind: 'bullet' | 'decimal') =>
    `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${kind}"/><w:lvlText w:val="${kind === 'bullet' ? bullets[i] : `%${i + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (i + 1)}" w:hanging="360"/></w:pPr>${kind === 'bullet' ? '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>' : ''}</w:lvl>`;
  const levels = (kind: 'bullet' | 'decimal') => [0, 1, 2].map((i) => level(i, kind)).join('');
  // The look's faces by name: the body the default, the headings their styles'; a book's headings centred in small capitals.
  const face = (f: Look['body']) => `<w:rFonts w:ascii="${NAMED[f].name}" w:hAnsi="${NAMED[f].name}" w:cs="${NAMED[f].name}"/>`;
  const heading = (id: string, name: string, size: number, before: number) => {
    const caps = look.caps && id !== 'Title';
    const centred = caps || (look.indent && id === 'Title');
    return `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/>${centred ? '<w:jc w:val="center"/>' : ''}<w:outlineLvl w:val="${id === 'Heading2' ? 1 : 0}"/></w:pPr><w:rPr>${face(look.head)}${caps ? '<w:smallCaps/>' : '<w:b/>'}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
  };
  return zip({
    '[Content_Types].xml': `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
    '_rels/.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/styles" Target="styles.xml"/><Relationship Id="rId2" Type="${REL_NS}/numbering" Target="numbering.xml"/>${rels.map((url, i) => `<Relationship Id="rId${i + 3}" Type="${REL_NS}/hyperlink" Target="${xml(url)}" TargetMode="External"/>`).join('')}</Relationships>`,
    'word/styles.xml': `${XML_HEAD}<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr>${face(look.body)}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading('Title', 'Title', 52, 0)}${heading('Heading1', 'heading 1', 32, 360)}${heading('Heading2', 'heading 2', 26, 240)}<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/><w:color w:val="52525B"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style><w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="4F46E5"/><w:u w:val="single"/></w:rPr></w:style></w:styles>`,
    'word/numbering.xml': `${XML_HEAD}<w:numbering ${W_NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels('bullet')}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels('decimal')}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${nums.join('')}</w:numbering>`,
    'word/document.xml': `${XML_HEAD}<w:document ${W_NS}><w:body>${paras.join('')}${sect}</w:body></w:document>`,
  });
}
