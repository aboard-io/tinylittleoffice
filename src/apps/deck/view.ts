/**
 * A deck drawn, with no DOM: where everything on a slide goes and how big the type is so that it all fits
 * (the layout), the slide as a page in its theme, a printed page fitted the same way or as prose, a comic's
 * panels, and the pages laid on letter sheets so that folding puts them in order (the imposition). The
 * closing slide is a QR code of the deck's own link. The deck as a web page plays itself: one slide at a
 * time, with the transition the header names, by a fixed script the site's policy allows by hash.
 * (Ported from the old tree's slide.ts, fold.ts, the fold apps' definitions and deck.def.ts.)
 */
import { lookup, type Page } from '../../kit/app.ts';
import { encodeDoc } from '../../kit/codec.ts';
import { FAINT, FONT, INK, MUTED, PAPER, pageSvg, r, rect, textWidth, xml } from '../../kit/draw.ts';
import { glyphNamed, iconNamed } from '../../kit/icons.ts';
import { chosenLanguage, t } from '../../kit/i18n.ts';
import { MOTION_JS } from '../../kit/motion.ts';
import { pageScript } from '../../kit/page.ts';
import { QR_MAX_BYTES, qrSvg } from '../../kit/qr.ts';
import { routeHash } from '../../kit/route.ts';
import { attr, markNotes, noteNumbers, noteRuns, parse, plainText, runLinks, write, type Doc, type Run } from '../../doc/index.ts';
import { iconHex, isBlank, panelOf, settingsOf, slideNotes, slideText, slidesOf, type Format, type Item, type Settings, type Slide } from './model.ts';
import { themeOf, type DeckTheme } from './theme.ts';

export const SW = 960;
export const SH = 600;
export const LETTER = { w: 816, h: 1056 };

/* ---------- words with their marks, wrapped and drawn ---------- */

/** A piece of a line: words with their marks, a link, a raised number (a footnote's mark), or an icon by name. */
export interface Span {
  t: string;
  b?: true;
  i?: true;
  u?: true;
  s?: true;
  h?: true;
  /** Where these words link. */
  link?: string;
  sup?: boolean;
  ic?: string;
}
const HIGHLIGHT = '#fef08a';
const SUP = 0.62;
const iconWidth = (px: number) => px * 1.25;
const spanWidth = (sp: Span, px: number, bold: boolean) => (sp.ic ? iconWidth(px) : textWidth(sp.t, sp.sup ? px * SUP : px, bold || !!sp.b));
const same = (a: Span, b: Span) => !a.ic && !b.ic && !a.sup && !b.sup && a.b === b.b && a.i === b.i && a.u === b.u && a.s === b.s && a.h === b.h && a.link === b.link;

/** Runs as spans: footnote marks as raised numbers, links (and web addresses in plain words) marked, icons by name. */
export function spansOf(runs: Run[], next: () => number = noteNumbers()): Span[] {
  const out: Span[] = [];
  for (const run of markNotes(runs, next)) {
    if (run.sup) {
      out.push({ t: run.t, sup: true });
      continue;
    }
    if (run.ic) {
      out.push({ t: '', ic: run.ic });
      continue;
    }
    const marks = {
      ...(run.b ? { b: true as const } : {}),
      ...(run.i ? { i: true as const } : {}),
      ...(run.u ? { u: true as const } : {}),
      ...(run.s ? { s: true as const } : {}),
      ...(run.h ? { h: true as const } : {}),
    };
    for (const p of runLinks(run)) out.push({ t: p.t.replace(/\n/g, ' '), ...marks, ...(p.url ? { link: p.url } : {}) });
  }
  return out;
}

/** A word too long for a line (a web address) in pieces that fit: broken after a "/", ".", "-", "?", "&", "=" or "_" near the end of a piece, else where the line runs out. */
function breakWord(word: string, max: number, px: number, bold: boolean): string[] {
  if (max <= 0 || textWidth(word.trimEnd(), px, bold) <= max) return [word];
  const out: string[] = [];
  let rest = word;
  while (rest && textWidth(rest.trimEnd(), px, bold) > max) {
    let n = 1;
    while (n < rest.length && textWidth(rest.slice(0, n + 1), px, bold) <= max) n++;
    const soft = Math.max(...['/', '.', '-', '?', '&', '=', '_'].map((c) => rest.lastIndexOf(c, n - 1)));
    const at = soft >= Math.ceil(n * 0.66) ? soft + 1 : n;
    out.push(rest.slice(0, at));
    rest = rest.slice(at);
  }
  if (rest) out.push(rest);
  return out;
}

/** Spans wrapped to a width: words kept whole, marks kept on every piece, a note's mark staying with the word before it. */
export function wrap(spans: Span[], max: number, px: number, bold = false): Span[][] {
  const lines: Span[][] = [[]];
  let width = 0;
  for (const span of spans) {
    if (span.ic) {
      const w = iconWidth(px);
      if (width + w > max && width > 0) {
        lines.push([]);
        width = 0;
      }
      lines[lines.length - 1].push({ ...span });
      width += w;
      continue;
    }
    if (span.sup) {
      lines[lines.length - 1].push({ ...span });
      width += spanWidth(span, px, bold);
      continue;
    }
    for (const word of span.t.split(/(?<= )/).flatMap((wd) => breakWord(wd, max, px, bold || !!span.b))) {
      const w = textWidth(word, px, bold || !!span.b);
      if (width + textWidth(word.trimEnd(), px, bold || !!span.b) > max && width > 0) {
        lines.push([]);
        width = 0;
      }
      const line = lines[lines.length - 1];
      const last = line[line.length - 1];
      if (last && same(last, span)) last.t += word;
      else line.push({ ...span, t: word });
      width += w;
    }
  }
  return lines.map((l) => {
    const last = l[l.length - 1];
    if (last && !last.sup && !last.ic) last.t = last.t.replace(/\s+$/, '');
    return l.filter((sp) => sp.t || sp.ic);
  });
}
export const wrapText = (words: string, max: number, px: number, bold = false): string[] => wrap([{ t: words }], max, px, bold).map((l) => l.map((s) => s.t).join(''));

export interface LineStyle {
  px?: number;
  bold?: boolean;
  fill?: string;
  /** Links, where the ink is not for them. */
  link?: string;
  anchor?: 'start' | 'middle' | 'end';
}

/** The addresses a drawn link may go to: a web page, an email, a phone number. */
const OPENS = /^(?:https?:|mailto:|tel:)/i;
/** An <a> opening in a new tab with nothing of this page sent along. */
const linkOpen = (url: string, more = '') => `<a href="${xml(url)}" target="_blank" rel="noopener noreferrer"${more}>`;

/** One line of spans as SVG text at a baseline: highlights behind the words, icons drawn as glyphs where their span sits. */
export function line(x: number, y: number, content: string | Span[], style: LineStyle = {}): string {
  const { px = 16, bold = false, fill = INK, link: linkFill = fill, anchor = 'start' } = style;
  const spans = typeof content === 'string' ? [{ t: content } as Span] : content;
  let before = '';
  let at = 0;
  const total = spans.reduce((a, s) => a + spanWidth(s, px, bold), 0);
  const x0 = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
  const inner = spans
    .map((s) => {
      const w = spanWidth(s, px, bold);
      if (s.h && !s.ic) before += `<rect x="${r(x0 + at)}" y="${r(y - px * 0.82)}" width="${r(w)}" height="${r(px * 1.1)}" fill="${HIGHLIGHT}" rx="2"/>`;
      if (s.ic) before += glyphNamed(s.ic, x0 + at + px * 0.1, y - px * 0.85, px * 1.05, fill);
      at += w;
      if (s.ic) return `<tspan dx="${r(w)}"></tspan>`;
      if (s.sup) return `<tspan font-size="${r(px * SUP)}" baseline-shift="super">${xml(s.t)}</tspan>`;
      const a =
        (s.b && !bold ? ' font-weight="700"' : '') +
        (s.i ? ' font-style="italic"' : '') +
        (s.link ? ` fill="${linkFill}"` : s.h ? ` fill="${INK}"` : '') +
        (s.u || s.s || s.link ? ` text-decoration="${[(s.u || s.link) && 'underline', s.s && 'line-through'].filter(Boolean).join(' ')}"` : '');
      const words = a ? `<tspan${a}>${xml(s.t)}</tspan>` : xml(s.t);
      // A link is a link: a tap in the reader or the show follows it (through the link guard), an export's reader opens it.
      return s.link && OPENS.test(s.link) ? `${linkOpen(s.link)}${words}</a>` : words;
    })
    .join('');
  return (
    before +
    `<text x="${r(x)}" y="${r(y)}" font-size="${r(px)}"${bold ? ' font-weight="700"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}" xml:space="preserve">${inner}</text>`
  );
}

/** A page placed inside a box on another page, scaled to fit and centred. */
export function place(p: Page, x: number, y: number, w: number, h: number): string {
  const k = Math.min(w / p.w, h / p.h);
  return `<svg x="${r(x + (w - p.w * k) / 2)}" y="${r(y + (h - p.h * k) / 2)}" width="${r(p.w * k)}" height="${r(p.h * k)}" viewBox="0 0 ${p.w} ${p.h}">${p.svg}</svg>`;
}

/* ---------- the document a slide shows ---------- */

/** The page another document makes on a slide: its own app draws it small; a table is a sheet. `open`: in the editor (a locked document opened this visit drawn open). `still`: drawn where nothing can move (an animation a frame). */
export function subPage(doc: Doc, s: Slide, upTo?: number, open = false, still = false): Page | null {
  const b = s.sub >= 0 ? doc.blocks[s.sub] : null;
  if (!b) return null;
  if (b.k === 'fence' && b.lang) {
    const def = lookup.appOf(b.lang);
    // Presented, the document as far as it has built (its app's steps); else whole.
    if (def) return def.view(b.body, { small: true, ...(still ? { still } : {}), ...(upTo !== undefined && def.steps ? { upTo } : {}), ...(open ? { open } : {}) })[0];
    const lines = b.body
      .split('\n')
      .filter((l) => l.trim() && !/^---/.test(l))
      .slice(0, 8);
    return {
      w: 480,
      h: 40 + lines.length * 22,
      svg: line(24, 28, t('{app} document', { app: b.lang }), { px: 13, fill: MUTED }) + lines.map((l, i) => line(24, 56 + i * 22, l, { px: 14 })).join(''),
      alt: t('{app} document', { app: b.lang }),
    };
  }
  if (b.k === 'table') {
    const sheet = lookup.appOf('sheet');
    const chart = attr(b, 'chart');
    const body = write({ head: chart ? { chart } : {}, blocks: [{ k: 'table', cols: b.cols, rows: b.rows }] });
    if (sheet) return sheet.view(body, { small: true, ...(still ? { still } : {}) })[0];
    const rows = [b.cols.map((c) => c.name), ...b.rows];
    return { w: 480, h: 24 + rows.length * 26, svg: rows.map((row, i) => line(24, 20 + i * 26, row.join('   '), { px: 14, bold: i === 0 })).join(''), alt: t('Table') };
  }
  return null;
}

/* ---------- the layout ---------- */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SlideLayout {
  /** Font sizes chosen so everything fits: bigger when there is less to say. */
  titlePx: number;
  bodyPx: number;
  title: Box & { lines: Span[][]; center: boolean };
  cols: (Box & { items: { lines: Span[][]; depth: number; n?: number; para?: boolean }[] })[];
  icon?: Box;
  sub?: Box;
  /** The slide's footnotes, at its foot: each note's lines, and the size of their type. */
  notes?: Box & { lines: Span[][][]; px: number };
  /** What fitting cost (what the lint reads, src/lint.ts): a headline set at its smallest size, its lines cut off; words set at their smallest, and how far they still run past their box. */
  fit: Fitting;
}

export interface Fitting {
  title: { smallest: boolean; cut: number };
  body: { smallest: boolean; over: number };
}

/** How far a bullet steps in a level, in the size of the type. */
const IN = 1.4;

/** The page a slide is laid on: a slide's 960 by 600 unless told otherwise; `loud` makes the type bigger (a poster). */
export interface SlideSize {
  w?: number;
  h?: number;
  loud?: number;
}

/** Where everything on a slide goes, and how big the type is. */
export function layoutSlide(s: Slide, o: SlideSize = {}): SlideLayout {
  const W = o.w ?? SW;
  const H = o.h ?? SH;
  // Type and margins scale with the page's width; a tall page gets more rows, not bigger type.
  const k = (W / SW) * (o.loud ?? 1);
  const M = 64 * k;
  const PAD = 20 * k;
  const sz = (list: number[]) => list.map((n) => n * k);
  const hasTitle = plainText(s.title).trim().length > 0 || s.title.some((r) => r.ic || r.fn !== undefined);
  const titleSpans = () => spansOf(s.title, noteNumbers());
  const titleNotes = s.title.filter((r) => r.fn !== undefined).length;
  const fitTitle = (w: number, sizes: number[], maxLines: number) => {
    if (!hasTitle) return { px: sizes[0], lines: [] as Span[][], smallest: false, cut: 0 };
    for (const px of sizes) {
      const lines = wrap(titleSpans(), w, px, true);
      if (lines.length <= maxLines) return { px, lines, smallest: px === sizes[sizes.length - 1] && sizes.length > 1, cut: 0 };
    }
    const px = sizes[sizes.length - 1];
    const lines = wrap(titleSpans(), w, px, true);
    return { px, lines: lines.slice(0, maxLines), smallest: true, cut: lines.length - maxLines };
  };
  // A document on the slide takes the room under the headline (the whole slide when there is none).
  if (s.sub >= 0) {
    const tx = M + (s.icon ? 88 * k : 0);
    const tt = fitTitle(W - M - tx, sz([40, 34, 28]), 1);
    const headH = hasTitle || s.icon ? Math.max(s.icon ? 72 * k : 0, tt.lines.length * tt.px * 1.15) : 0;
    const top = headH ? M * 0.6 + headH + 16 * k : PAD;
    return {
      titlePx: tt.px,
      bodyPx: 0,
      title: { x: tx, y: M * 0.6 + (headH - tt.lines.length * tt.px * 1.15) / 2, w: W - M - tx, h: headH, lines: tt.lines, center: false },
      cols: [],
      icon: s.icon && headH ? { x: M, y: M * 0.6 + (headH - 72 * k) / 2, w: 72 * k, h: 72 * k } : undefined,
      sub: { x: PAD, y: top, w: W - 2 * PAD, h: H - top - PAD },
      fit: { title: { smallest: tt.smallest, cut: tt.cut }, body: { smallest: false, over: 0 } },
    };
  }
  const kind = s.layout;
  // Footnotes are numbered as their marks come: the headline's first, then the words'.
  const bodySpans = (cols: Item[][]) => {
    const next = noteNumbers(titleNotes);
    return cols.map((c) => c.map((it) => spansOf(it.runs, next)));
  };
  // The notes themselves, at the foot, in small type; the words above make room for them.
  const notes = slideNotes(s);
  const notePx = 15 * k;
  const noteLines = notes.map((fn, i) => wrap([{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...spansOf(noteRuns(fn))], W - 2 * M, notePx));
  const notesH = notes.length ? noteLines.reduce((a, l) => a + l.length * notePx * 1.3, 0) + 14 * k : 0;
  const foot = notes.length ? { x: M, y: H - 40 * k - notesH + 14 * k, w: W - 2 * M, h: notesH - 14 * k, lines: noteLines, px: notePx } : undefined;
  const fitBody = (cols: (Box & { src: Item[] })[], sizes: number[], bullet: boolean) => {
    const spans = bodySpans(cols.map((c) => c.src));
    for (const px of sizes) {
      const laid = cols.map((c, i) =>
        c.src.map((it, j) => ({
          lines: wrap(spans[i][j].length ? spans[i][j] : [{ t: ' ' }], c.w - (bullet && !it.para ? px * (1.1 + it.depth * IN) : 0), px),
          depth: it.depth,
          n: it.n,
          para: it.para,
        })),
      );
      const tall = (items: { lines: Span[][] }[]) => items.reduce((a, l) => a + l.lines.length * px * 1.3 + px * 0.45, 0);
      const over = Math.max(0, ...laid.map((items, i) => tall(items) - cols[i].h));
      if (!over || px === sizes[sizes.length - 1])
        return { px, smallest: px === sizes[sizes.length - 1] && laid.some((items) => items.length), over, cols: cols.map((c, i) => ({ x: c.x, y: c.y, w: c.w, h: c.h, items: laid[i] })) };
    }
    throw new Error('unreachable');
  };

  if (kind === 't') {
    const tt = fitTitle(W - 2 * M, sz([72, 64, 56, 48, 40, 34]), 2);
    const sub = fitBody([{ x: M, y: 0, w: W - 2 * M, h: H * 0.25 + (H > W ? H * 0.25 : 0), src: s.items }], sz([30, 26, 22, 18]), false);
    const iconH = s.icon ? 112 * k : 0;
    const tall = iconH + tt.lines.length * tt.px * 1.15 + (s.items.length ? 24 + sub.cols[0].items.reduce((a, l) => a + l.lines.length * sub.px * 1.3, 0) : 0);
    const top = (H - notesH - tall) / 2;
    const ty = top + iconH;
    return {
      titlePx: tt.px,
      bodyPx: sub.px,
      title: { x: M, y: ty, w: W - 2 * M, h: tt.lines.length * tt.px * 1.15, lines: tt.lines, center: true },
      cols: [{ ...sub.cols[0], y: ty + tt.lines.length * tt.px * 1.15 + 24 }],
      icon: s.icon ? { x: W / 2 - 48 * k, y: top, w: 96 * k, h: 96 * k } : undefined,
      notes: foot,
      fit: { title: { smallest: tt.smallest, cut: tt.cut }, body: { smallest: sub.smallest, over: sub.over } },
    };
  }

  const headIcon = !!s.icon && kind !== 'i';
  const tx = M + (headIcon ? 88 * k : 0);
  const tt = fitTitle(W - M - tx, sz([46, 40, 34, 28]), 2);
  const headH = Math.max(headIcon ? 72 * k : 0, tt.lines.length * tt.px * 1.15);
  const top = M + headH + (headH ? 28 * k : 0);
  const bodyH = H - top - 48 * k - notesH;
  const half = (W - 2 * M - 40 * k) / 2;
  const split = kind === 'i' || kind === '2';
  const colsIn: (Box & { src: Item[] })[] = [{ x: M, y: top, w: split ? half : W - 2 * M, h: bodyH, src: s.items }];
  if (kind === '2') colsIn.push({ x: M + half + 40 * k, y: top, w: half, h: bodyH, src: s.right });
  const body = fitBody(colsIn, sz([34, 30, 26, 23, 20, 18, 16, 14]), true);
  const sideBox: Box = { x: M + half + 40 * k, y: top, w: half, h: bodyH };
  return {
    titlePx: tt.px,
    bodyPx: body.px,
    title: { x: tx, y: M + (headH - tt.lines.length * tt.px * 1.15) / 2, w: W - M - tx, h: headH, lines: tt.lines, center: false },
    cols: body.cols,
    icon: headIcon
      ? { x: M, y: M + (headH - 72 * k) / 2, w: 72 * k, h: 72 * k }
      : kind === 'i' && s.icon
        ? { x: sideBox.x + (sideBox.w - 260 * k) / 2, y: sideBox.y + (sideBox.h - 260 * k) / 2, w: 260 * k, h: 260 * k }
        : undefined,
    notes: foot,
    fit: { title: { smallest: tt.smallest, cut: tt.cut }, body: { smallest: body.smallest, over: body.over } },
  };
}

/** The steps a document on a slide builds up in, as its app counts them (AppDef.steps: a list an item, a trip a stop, a drawing a shape); 0 for one shown whole. */
function subSteps(doc: Doc, s: Slide): number {
  const b = s.sub >= 0 ? doc.blocks[s.sub] : null;
  if (b?.k !== 'fence' || !b.lang) return 0;
  return lookup.appOf(b.lang)?.steps?.(b.body) ?? 0;
}

/** What a slide reveals, a click at a time: its lines of words; a slide that shows a document, that document's steps (given `doc`). */
export const slideSteps = (s: Slide, doc?: Doc): number => (s.sub >= 0 ? (doc ? subSteps(doc, s) : 0) : s.layout === 't' ? 0 : s.items.length + (s.layout === '2' ? s.right.length : 0));

const iconAt = (name: string, b: Box, color: string) => glyphNamed(name, b.x, b.y, b.w, color);

/** The look a slide is drawn in: the theme, the colour of its icons, and whether it is drawn where nothing can move (print, a picture, a thumbnail: a document on it is drawn still). */
export interface Look {
  theme: DeckTheme;
  themed: boolean;
  icon: string;
  still?: boolean;
}
export const lookOf = (s: Settings, still = false): Look => ({ theme: themeOf(s.theme), themed: !!s.theme, icon: iconHex(s), ...(still ? { still } : {}) });

/**
 * A slide as a page. `shown` says how many lines have been revealed (absent: everything); unrevealed
 * lines keep their place, so nothing moves as the slide builds. The sub-document is drawn by its own app.
 */
export function slidePage(doc: Doc, s: Slide, look: Look, shown = Infinity, o: SlideSize = {}): Page {
  const W = o.w ?? SW;
  const H = o.h ?? SH;
  const L = layoutSlide(s, o);
  const cover = s.layout === 't' && s.sub < 0;
  const T = look.theme;
  const link = T.link ?? T.accent;
  // The plain theme is the page's own white; any other brings its paper and what is drawn on it.
  let svg = look.themed
    ? rect(0, 0, W, H, T.paper) + (T.deco && W === SW && H === SH ? T.deco : T.deco ? `<svg viewBox="0 0 ${SW} ${SH}" width="${W}" height="${H}" preserveAspectRatio="none">${T.deco}</svg>` : '')
    : '';
  if (L.icon) svg += iconAt(s.icon, L.icon, look.icon);
  L.title.lines.forEach(
    (ln, i) =>
      (svg += line(L.title.center ? W / 2 : L.title.x, L.title.y + L.titlePx * (0.95 + i * 1.15), ln, { px: L.titlePx, bold: true, fill: T.ink, link, anchor: L.title.center ? 'middle' : 'start' })),
  );
  let n = 0;
  for (const col of L.cols) {
    let y = col.y;
    for (const item of col.items) {
      const d = item.depth;
      const dot = !cover && !item.para;
      const x = col.x + (dot ? L.bodyPx * d * IN : 0);
      if (cover || n < shown) {
        // A deeper bullet steps in, with a smaller, hollow dot; a numbered item carries its number.
        if (dot && item.n !== undefined) svg += line(x + L.bodyPx * 0.8, y + L.bodyPx, `${item.n}.`, { px: L.bodyPx, fill: T.accent, anchor: 'end' });
        else if (dot)
          svg += `<circle cx="${r(x + L.bodyPx * 0.35)}" cy="${r(y + L.bodyPx * 0.68)}" r="${r(L.bodyPx * (d ? 0.12 : 0.16))}" fill="${d ? 'none' : T.accent}"${d ? ` stroke="${T.accent}" stroke-width="2"` : ''}/>`;
        item.lines.forEach(
          (ln, i) =>
            (svg += line(cover ? W / 2 : x + (dot ? L.bodyPx * 1.1 : 0), y + L.bodyPx + i * L.bodyPx * 1.3, ln, {
              px: L.bodyPx,
              fill: cover ? T.muted : T.ink,
              link,
              anchor: cover ? 'middle' : 'start',
            })),
        );
      }
      n++;
      y += item.lines.length * L.bodyPx * 1.3 + L.bodyPx * (cover ? 0 : 0.45);
    }
  }
  // The footnotes at the foot, under a thin rule, in the theme's muted ink.
  if (L.notes) {
    const N = L.notes;
    svg += `<line x1="${r(N.x)}" y1="${r(N.y - 8)}" x2="${r(N.x + 72)}" y2="${r(N.y - 8)}" stroke="${T.muted}" stroke-width="1"/>`;
    let y = N.y;
    for (const lines of N.lines) for (const ln of lines) ((svg += line(N.x, y + N.px, ln, { px: N.px, fill: T.muted, link })), (y += N.px * 1.3));
  }
  if (L.sub) {
    // Presented, the document as far as the clicks have built it.
    const sub = subPage(doc, s, Number.isFinite(shown) ? shown : undefined, false, look.still);
    if (sub) {
      // A document is drawn for white paper: on a dark slide it sits on a white card.
      if (T.dark) svg += rect(L.sub.x, L.sub.y, L.sub.w, L.sub.h, '#ffffff', 'rx="12"');
      svg += place(sub, L.sub.x, L.sub.y, L.sub.w, L.sub.h);
    }
  }
  return { w: W, h: H, svg, alt: slideText(s).join('. ') };
}

/* ---------- a printed page ---------- */

export interface Fit {
  /** Centred and louder, as a cover is. */
  cover?: boolean;
  /** How much louder the type is than a slide's, for a page with a layout. */
  loud?: number;
  /** A line at the foot (a page number). */
  foot?: string;
  /** The largest the words may be, in px. */
  max?: number;
  /** The margin, in px. */
  m?: number;
}

/**
 * A slide fitted to a printed page: the largest type at which everything is on it. A page with a layout
 * is a slide laid on paper by the deck's engine, louder on a cover; a page with none is prose, its
 * paragraphs and bullets from the top; a page that shows another document is given over to it.
 */
export function fitted(doc: Doc, s: Slide, look: Look, w: number, h: number, o: Fit = {}): Page {
  const footLine = (px: number) => (o.foot ? line(w / 2, h - (o.m ?? 20) * 0.55, o.foot, { px, fill: FAINT, anchor: 'middle' }) : '');
  if (s.layout || s.sub >= 0) {
    const size = { w, h, loud: o.loud ?? (o.cover ? 1.6 : 1) };
    const p = slidePage(doc, s, look, Infinity, size);
    return { ...p, svg: p.svg + footLine(11) };
  }
  const k = w / 264;
  const m = o.m ?? Math.min(48, 20 * k);
  const cover = !!o.cover;
  const inner = w - 2 * m;
  const room = h - 2 * m - (o.foot ? 12 : 0);
  const next = noteNumbers();
  const titleSpans = spansOf(s.title, next);
  const paras = s.items.map((it) => ({ spans: spansOf(it.runs, next), depth: it.depth, dot: !it.para, n: it.n }));
  const notes = slideNotes(s);
  const lay = (px: number) => {
    const tpx = px * (cover ? 2.1 : 1.5);
    const ipx = s.icon && iconNamed(s.icon) ? px * (cover ? 4.5 : 2.2) : 0;
    const title = titleSpans.length ? wrap(titleSpans, inner, tpx, true) : [];
    const lines = paras.map((p) => wrap(p.spans.length ? p.spans : [{ t: ' ' }], inner - (p.dot ? px * (1.1 + p.depth * IN) : 0), px));
    const npx = Math.max(6, px * 0.72);
    const noteLines = notes.map((fn, i) => wrap([{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...spansOf(noteRuns(fn))], inner, npx));
    const words =
      (ipx ? ipx + px * 0.6 : 0) +
      title.length * tpx * 1.15 +
      (title.length && paras.length ? px * 0.6 : 0) +
      lines.reduce((a, l) => a + l.length * px * 1.38 + px * 0.5, 0) +
      (notes.length ? px + noteLines.reduce((a, l) => a + l.length * npx * 1.3, 0) : 0);
    return { px, tpx, ipx, npx, title, lines, noteLines, words };
  };
  const max = o.max ?? Math.min(cover ? 34 : 17, (cover ? 17 : 13) * k);
  let fit = lay(5);
  for (let px = max; px > 5; px -= Math.max(0.5, max / 40)) {
    const tried = lay(px);
    if (tried.words <= room && tried.title.every((l) => l.reduce((a, sp) => a + spanWidth(sp, tried.tpx, true), 0) <= inner)) {
      fit = tried;
      break;
    }
  }
  const T = look.theme;
  const x = cover ? w / 2 : m;
  const anchor = cover ? 'middle' : 'start';
  let y = m + (cover ? Math.max(0, (room - fit.words) / 2) : 0);
  let svg = look.themed ? rect(0, 0, w, h, T.paper) : '';
  if (fit.ipx) {
    svg += iconAt(s.icon, { x: cover ? (w - fit.ipx) / 2 : m, y, w: fit.ipx, h: fit.ipx }, look.icon);
    y += fit.ipx + fit.px * 0.6;
  }
  for (const ln of fit.title) svg += line(x, (y += fit.tpx * 1.15) - fit.tpx * 0.25, ln, { px: fit.tpx, bold: true, anchor, fill: T.ink, link: T.link ?? T.accent });
  if (fit.title.length && paras.length) y += fit.px * 0.6;
  fit.lines.forEach((para, i) => {
    const p = paras[i];
    const px = fit.px;
    const lx = p.dot ? m + px * (1.1 + p.depth * IN) : x;
    if (p.dot && !cover) {
      if (p.n !== undefined) svg += line(lx - px * 0.4, y + px * 1.38 - px * 0.35, `${p.n}.`, { px, fill: T.accent, anchor: 'end' });
      else
        svg += `<circle cx="${r(lx - px * 0.75)}" cy="${r(y + px * 0.9)}" r="${r(px * (p.depth ? 0.12 : 0.16))}" fill="${p.depth ? 'none' : T.accent}"${p.depth ? ` stroke="${T.accent}" stroke-width="1"` : ''}/>`;
    }
    for (const ln of para) svg += line(cover ? x : lx, (y += px * 1.38) - px * 0.35, ln, { px, anchor, fill: T.ink, link: T.link ?? T.accent });
    y += px * 0.5;
  });
  if (notes.length) {
    y += fit.px * 0.5;
    svg += `<line x1="${r(m)}" y1="${r(y)}" x2="${r(m + inner * 0.25)}" y2="${r(y)}" stroke="${T.muted}" stroke-width="0.6"/>`;
    y += fit.px * 0.4;
    for (const lines of fit.noteLines) for (const ln of lines) svg += line(m, (y += fit.npx * 1.3) - fit.npx * 0.3, ln, { px: fit.npx, fill: T.muted });
  }
  return { w, h, svg: svg + footLine(Math.min(11, 8 * k)), alt: slideText(s).join('. ') };
}

/* ---------- a comic's panels ---------- */

export const MAX_PANELS = 6;
const ZINE_PAGE = { w: 264, h: 408 };

/** A page of panels: one to three in a column, more in two columns. A headline runs along the top. */
export function panelsPage(s: Slide, look: Look): Page {
  const { w, h } = ZINE_PAGE;
  const items = s.items.filter((it) => plainText(it.runs).trim() || it.runs.some((r) => r.ic)).slice(0, MAX_PANELS);
  const n = items.length;
  const cols = n > 3 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const head = plainText(s.title).trim() ? 16 : 0;
  const [pw, ph] = [(w - 20 - (cols - 1) * 6) / cols, (h - 20 - head - (rows - 1) * 6) / rows];
  let svg = head ? line(w / 2, 20, spansOf(s.title), { px: 10, bold: true, anchor: 'middle' }) : '';
  items.forEach((it, i) => {
    const [x, y] = [10 + (i % cols) * (pw + 6), 10 + head + Math.floor(i / cols) * (ph + 6)];
    const { glyph, said, caption } = panelOf(it);
    const speech = said ? wrapText(said, pw - 24, 8.5).slice(0, 4) : [];
    const foot = caption ? wrapText(caption, pw - 10, 7.5).slice(0, 2) : [];
    const [top, bottom] = [speech.length ? speech.length * 11 + 16 : 6, foot.length ? foot.length * 10 + 6 : 0];
    const size = Math.max(12, Math.min(pw - 16, ph - top - bottom - 8));
    svg += rect(x, y, pw, ph, '#fff', `stroke="${INK}" stroke-width="1.5"`);
    if (iconNamed(glyph)) svg += iconAt(glyph, { x: x + (pw - size) / 2, y: y + top + (ph - top - bottom - size) / 2, w: size, h: size }, look.icon === themeOf('').accent ? INK : look.icon);
    if (speech.length) {
      // What is said, in a bubble with a tail toward the picture.
      const bh = speech.length * 11 + 6;
      svg +=
        `<path d="M${r(x + pw / 2 - 5)} ${r(y + 4 + bh - 1)}l3 8 6-8z" fill="#fff" stroke="${INK}"/>` +
        rect(x + 5, y + 5, pw - 10, bh, '#fff', `rx="8" stroke="${INK}"`) +
        rect(x + pw / 2 - 6, y + 4 + bh - 2, 10, 2.5, '#fff');
      speech.forEach((l, k) => (svg += line(x + pw / 2, y + 16 + k * 11, l, { px: 8.5, anchor: 'middle' })));
    }
    if (foot.length) {
      svg += rect(x + 0.75, y + ph - bottom, pw - 1.5, bottom - 0.75, '#fef3c7');
      foot.forEach((l, k) => (svg += line(x + 5, y + ph - bottom + 11 + k * 10, l, { px: 7.5 })));
    }
  });
  return { w, h, svg, alt: [plainText(s.title), ...items.map((it) => plainText(it.runs))].filter(Boolean).join('. ') };
}

/* ---------- laying pages on sheets ---------- */

const guide = (x1: number, y1: number, x2: number, y2: number, cut = false) =>
  `<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke="${cut ? '#71717a' : '#d4d4d8'}" stroke-width="1" stroke-dasharray="${cut ? '8 5' : '2 6'}"/>`;

/**
 * One side of a sheet: rows of page numbers (0 for an empty place), each page in its cell of an even
 * grid. Dotted lines are folds; `cut` adds a dashed line to cut along ([row, from column, to column],
 * below that row); `flip` lists the rows printed upside down.
 */
export function side(pages: Page[], rows: number[][], o: { flip?: number[]; cut?: [number, number, number]; note?: string } = {}): Page {
  const { w, h } = pages[0];
  const W = rows[0].length * w;
  const H = rows.length * h;
  let svg = '';
  rows.forEach((row, ri) =>
    row.forEach((n, c) => {
      if (!pages[n - 1]) return;
      const placed = place(pages[n - 1], c * w, ri * h, w, h);
      svg += o.flip?.includes(ri) ? `<g transform="rotate(180 ${r(c * w + w / 2)} ${r(ri * h + h / 2)})">${placed}</g>` : placed;
    }),
  );
  for (let c = 1; c < rows[0].length; c++) svg += guide(c * w, 0, c * w, H);
  for (let ri = 1; ri < rows.length; ri++)
    svg += o.cut?.[0] === ri ? guide(0, ri * h, o.cut[1] * w, ri * h) + guide(o.cut[1] * w, ri * h, o.cut[2] * w, ri * h, true) + guide(o.cut[2] * w, ri * h, W, ri * h) : guide(0, ri * h, W, ri * h);
  if (o.note) svg += line(w / 2, (o.cut?.[0] ?? rows.length) * h - 4, o.note, { px: 8, fill: FAINT, anchor: 'middle' });
  return {
    w: W,
    h: H,
    svg,
    alt: pages
      .map((p) => p.alt)
      .filter(Boolean)
      .join('. '),
  };
}

/** Sheets folded in half and nested, as a booklet is: page n beside page 1, and so on inward. */
export function saddle(pages: Page[]): Page[] {
  const n = pages.length;
  return Array.from({ length: n / 4 }, (_, k) => [side(pages, [[n - 2 * k, 1 + 2 * k]]), side(pages, [[2 + 2 * k, n - 1 - 2 * k]])]).flat();
}

/** Cards cut from letter sheets: as many sheets as it takes, `cols` by `rows` on each, with lines to cut along. */
export function tile(cards: Page[], cols: number, rows: number, sheet = LETTER): Page[] {
  if (!cards.length) return [{ ...sheet, svg: '' }];
  const { w, h } = cards[0];
  const [x0, y0] = [(sheet.w - cols * w) / 2, (sheet.h - rows * h) / 2];
  const sheets: Page[] = [];
  for (let i = 0; i < cards.length; i += cols * rows) {
    const svg = cards
      .slice(i, i + cols * rows)
      .map((c, n) => {
        const [x, y] = [x0 + (n % cols) * w, y0 + Math.floor(n / cols) * h];
        return place(c, x, y, w, h) + rect(x, y, w, h, 'none', 'stroke="#a1a1aa" stroke-dasharray="6 5"');
      })
      .join('');
    sheets.push({
      ...sheet,
      svg,
      alt: cards
        .slice(i, i + cols * rows)
        .map((c) => c.alt)
        .filter(Boolean)
        .join('. '),
    });
  }
  return sheets;
}

/* ---------- the formats ---------- */

export interface Geometry {
  /** How many pages; with `grow`, how many to start with. */
  count: number;
  /** The most pages it can grow to. */
  grow?: number;
  /** How many pages it grows by: four (a sheet folded) unless said; one for cards. */
  by?: number;
  /** Offers one-sided and two-sided printing. */
  sides?: boolean;
  /** A page, in px at 96 to the inch. */
  size(two: boolean): { w: number; h: number };
  /** What page i of n is called. */
  name(i: number, n: number): string;
  /** The pages laid on the sheets to print. */
  sheets(pages: Page[], two: boolean): Page[];
  /** Draws a page its own way; otherwise the words are fitted to it. */
  page?(doc: Doc, s: Slide, look: Look, i: number, n: number): Page;
  /** How to print and fold it. */
  how(two: boolean): string;
}

const pageName = (i: number, n: number) => (i === 0 ? t('Front cover') : i === n - 1 ? t('Back cover') : t('Page {n}', { n: i + 1 }));

export const ZINE: Geometry = {
  count: 8,
  sides: true,
  size: (two) => (two ? { w: 408, h: 528 } : ZINE_PAGE),
  name: pageName,
  // One-sided: the top row is upside down, so that folding puts the pages in order.
  sheets: (p, two) =>
    two
      ? [
          side(
            p,
            [
              [8, 1],
              [6, 3],
            ],
            { cut: [1, 0, 2], note: t('cut along the dashes · this half goes outside') },
          ),
          side(
            p,
            [
              [2, 7],
              [4, 5],
            ],
            { cut: [1, 0, 2], note: t('print on the back, flipped on the long edge') },
          ),
        ]
      : [
          side(
            p,
            [
              [5, 4, 3, 2],
              [6, 7, 8, 1],
            ],
            { flip: [0], cut: [1, 1, 3], note: t('cut along the dashes · fold along the dots') },
          ),
        ],
  how: (two) =>
    two
      ? t('Print it double-sided on letter paper, flipping on the long edge, at actual size. Cut along the dashes, lay the top half over the bottom half, and fold them together down the middle.')
      : t('Print it on one side of letter paper, at actual size. Fold it in half the long way, then into quarters; cut the dashes in the middle; push the ends together and fold it into a book.'),
};

export const BOOKLET: Geometry = {
  count: 8,
  grow: 20,
  size: () => ({ w: 528, h: 816 }),
  name: pageName,
  sheets: saddle,
  how: () => t('Print it double-sided on letter paper, flipping on the short edge, at actual size. Stack the sheets in order, first on the outside, and fold them together down the middle.'),
};

export const BROCHURE: Geometry = {
  count: 6,
  size: () => ({ w: 352, h: 816 }),
  name: (i) => [t('Front'), t('Inside left'), t('Inside middle'), t('Inside right'), t('Inside flap'), t('Back')][i] ?? t('Page {n}', { n: i + 1 }),
  // Outside: the flap that folds in, the back, the front. Inside: the three panels, left to right.
  sheets: (p) => [side(p, [[5, 6, 1]]), side(p, [[2, 3, 4]])],
  how: () => t('Print it double-sided on letter paper, flipping on the short edge, at actual size. Fold the right third in, then the left third over it: the front is on top.'),
};

export const COMIC: Geometry = {
  ...ZINE,
  sides: false,
  sheets: (p) => ZINE.sheets(p, false),
  how: () => ZINE.how(false),
  // A page with panels is drawn as panels; a title page, or one given to another document, as any zine page is.
  page: (doc, s, look) => (s.sub >= 0 || !s.items.length ? fitted(doc, s, look, ZINE_PAGE.w, ZINE_PAGE.h, { cover: true }) : panelsPage(s, look)),
};

export const POSTER: Geometry = {
  count: 1,
  size: () => LETTER,
  name: () => t('Poster'),
  page: (doc, s, look) => fitted(doc, { ...s, layout: s.layout || 't' }, look, LETTER.w, LETTER.h, { cover: true, loud: 2, max: 150, m: 64 }),
  sheets: (p) => p,
  how: () => t('Print it on letter paper, at actual size.'),
};

export const BADGES: Geometry = {
  count: 2,
  grow: 48,
  by: 1,
  size: () => ({ w: 384, h: 288 }),
  name: (i) => t('Badge {n}', { n: i + 1 }),
  page: (doc, s, look) => fitted(doc, { ...s, layout: s.layout || 't' }, look, 384, 288, { cover: true, loud: 1.1, max: 22 }),
  sheets: (p) => tile(p, 2, 3),
  how: () => t('Print it on letter paper, at actual size. Cut along the dashes: six badges a sheet.'),
};

export const GEOMETRY: Record<Exclude<Format, ''>, Geometry> = { zine: ZINE, booklet: BOOKLET, brochure: BROCHURE, comic: COMIC, poster: POSTER, badges: BADGES };
export const geometryOf = (format: Format): Geometry | null => (format ? GEOMETRY[format] : null);

/** How many pages a printed thing has: the format's count, grown by sheets (or cards) to hold what is written or what the header asks. */
export function pageCount(doc: Doc, s: Settings, written = slidesOf(doc).length): number {
  const g = geometryOf(s.format);
  if (!g) return written;
  const by = g.by ?? 4;
  return g.grow ? Math.min(g.grow, Math.max(g.count, s.pages, Math.ceil(written / by) * by)) : g.count;
}

/** The size of a page in the document's format, in px. */
export const pageSize = (s: Settings): { w: number; h: number } => geometryOf(s.format)?.size(s.two) ?? { w: SW, h: SH };

/** An empty slide past what is written, for a page the format has and the document has not filled yet. */
export const emptySlide = (at: number): Slide => ({
  from: at,
  to: at,
  head: -1,
  layout: '',
  icon: '',
  title: [],
  words: [at, at],
  pipe: -1,
  items: [],
  right: [],
  sub: -1,
  notes: [at, at],
  noteLines: [],
});

/** Page i of the document, drawn in its format: a slide, or a printed page (its cover first; inside pages numbered). */
export function pageOf(doc: Doc, i: number, s: Settings = settingsOf(doc), slides = slidesOf(doc), look: Look = lookOf(s)): Page {
  const n = pageCount(doc, s, slides.length);
  const sl = slides[i] ?? emptySlide(doc.blocks.length);
  const g = geometryOf(s.format);
  if (!g) return slidePage(doc, sl, look);
  if (g.page) return g.page(doc, sl, look, i, n);
  const { w, h } = g.size(s.two);
  return fitted(doc, sl, look, w, h, { cover: i === 0, foot: i === 0 || i === n - 1 ? '' : String(i + 1) });
}

/** Every page of the document in its format (blank pages included, where the format has them); `still` where nothing can move. */
export function pagesOf(doc: Doc, s: Settings = settingsOf(doc), still = false): Page[] {
  const slides = slidesOf(doc);
  const look = lookOf(s, still);
  return Array.from({ length: pageCount(doc, s, slides.length) }, (_, i) => pageOf(doc, i, s, slides, look));
}

/** The sheets to print: the pages laid where the fold needs them; a deck's slides are their own sheets. */
export function sheetsOf(doc: Doc, s: Settings = settingsOf(doc), still = false): Page[] {
  const g = geometryOf(s.format);
  const pages = pagesOf(doc, s, still);
  return g ? g.sheets(pages, s.two) : pages;
}

/* ---------- the closing slide ---------- */

/**
 * The deck the room takes home: its slides as the Display Link, every speaker note cut (the quotes at each slide's
 * end are the speaker's, never the room's), on the site it is shown from (in a browser), else the fragment alone; in the
 * language the deck is shown in, when one was chosen.
 */
export function takeHomeLink(doc: Doc, site = typeof location !== 'undefined' ? location.origin + location.pathname : '', lang = chosenLanguage()): string {
  const notes = new Set(slidesOf(doc).flatMap((s) => Array.from({ length: s.notes[1] - s.notes[0] }, (_, i) => s.notes[0] + i)));
  return site + routeHash('deck', encodeDoc(write({ ...doc, blocks: doc.blocks.filter((_, i) => !notes.has(i)) })), '', true, null, lang);
}

/** Whether the deck ends with its code: not a printed thing, not an empty deck, not when the header says "qr: no". */
export const wantsClosing = (doc: Doc, s: Settings): boolean => s.qr && !s.format && doc.blocks.length > 0;

/**
 * The deck ends with a slide that is a QR code of its slides, its title beneath: whoever is in the room can take
 * them home. Drawn, not written. None unless wanted (wantsClosing), or when the slides are too long for a code.
 */
export function closingPage(text: string, doc: Doc = parse(text), s: Settings = settingsOf(doc), look = lookOf(s)): Page | null {
  if (!wantsClosing(doc, s)) return null;
  const bytes = new TextEncoder().encode(takeHomeLink(doc));
  if (bytes.length > QR_MAX_BYTES) return null;
  const T = look.theme;
  const code = qrSvg(bytes);
  const n = Number(/viewBox="0 0 (\d+)/.exec(code)?.[1] ?? 0);
  const size = 400;
  const title = doc.head.title || plainText(slidesOf(doc)[0]?.title ?? []).trim();
  let svg = look.themed ? rect(0, 0, SW, SH, T.paper) + (T.deco ?? '') : '';
  svg += rect((SW - size) / 2 - 16, 40, size + 32, size + 32, '#ffffff', 'rx="16"');
  svg += `<svg x="${(SW - size) / 2}" y="56" width="${size}" height="${size}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${code.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`;
  svg += line(SW / 2, 530, title ? t('Take this deck home: {title}', { title }) : t('Take this deck home'), { px: 24, bold: true, fill: T.ink, anchor: 'middle' });
  svg += line(SW / 2, 566, t('Scan the code: the whole deck is in the link.'), { px: 16, fill: T.muted, anchor: 'middle' });
  return { w: SW, h: SH, svg, alt: t('A QR code of this deck') };
}

/** The deck as shown and printed: every page in its format, then (for slides) the closing code. `still`: drawn where nothing can move (print, a picture, a thumbnail), so a document on a slide is too. */
export function deckPages(text: string, small = false, still = false): Page[] {
  const doc = parse(text);
  const s = settingsOf(doc);
  if (small) return [pageOf(doc, 0, s, slidesOf(doc), lookOf(s, still))];
  const end = closingPage(text, doc, s);
  const pages = sheetsOf(doc, s, still);
  return end ? [...pages, end] : pages;
}

/** The slides as they play, for a film: every slide, every reveal, the closing code last; each a still picture. */
export function deckFrames(text: string): Page[] {
  const doc = parse(text);
  const s = settingsOf(doc);
  const look = lookOf(s, true);
  const out: Page[] = [];
  for (const sl of slidesOf(doc)) {
    const steps = slideSteps(sl, doc);
    for (let shown = 0; shown <= steps; shown++) out.push(slidePage(doc, sl, look, shown));
  }
  const end = closingPage(text, doc, s, look);
  if (end) out.push(end);
  return out;
}

/* ---------- the deck as a web page ---------- */

/**
 * The player's script: fixed, so the site's policy allows it by hash (kit/page.ts). Tap the right of the page to
 * go on, the left to go back; the keys do the same; a tap on a link follows it and turns no slide. A slide that comes on starts its animations from the
 * beginning and the others are paused (kit/motion.ts).
 */
const PLAYER = pageScript(`${MOTION_JS}
var pages = [].slice.call(document.querySelectorAll('section')), at = 0, was = -1;
function go(n) {
  n = Math.max(0, Math.min(pages.length - 1, n));
  if (n === at && was >= 0) return;
  was = at; at = n;
  pages.forEach(function (p, i) { p.className = i === at ? 'on ' + (at >= was ? 'fwd' : 'back') : i === was ? 'was ' + (at >= was ? 'fwd' : 'back') : ''; motion(p, i === at); });
  document.getElementById('where').textContent = (at + 1) + ' / ' + pages.length;
  document.getElementById('back').disabled = at === 0;
  document.getElementById('next').disabled = at === pages.length - 1;
}
document.getElementById('back').onclick = function (e) { e.stopPropagation(); go(at - 1); };
document.getElementById('next').onclick = function (e) { e.stopPropagation(); go(at + 1); };
document.getElementById('pages').onclick = function (e) { if (e.target.closest && e.target.closest('a')) return; go(at + (e.clientX > innerWidth / 3 ? 1 : -1)); };
document.onkeydown = function (e) {
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown' || e.key === 'Enter') go(at + 1);
  if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') go(at - 1);
  if (e.key === 'Home') go(0);
  if (e.key === 'End') go(pages.length - 1);
};
go(0);
`);

/** The deck (or printed thing) as a page that plays itself: one page at a time, the transition the header names, the way home at the foot. */
export function deckToHtml(text: string, title: string, link = ''): string {
  const doc = parse(text);
  const s = settingsOf(doc);
  const g = geometryOf(s.format);
  const { w, h } = pageSize(s);
  const slides = slidesOf(doc);
  const pages = pagesOf(doc, s);
  const end = closingPage(text, doc, s);
  if (end) pages.push(end);
  const n = pages.length;
  const name = (i: number) => (g ? g.name(i, n) : i === n - 1 && end ? t('A QR code of this deck') : t('Slide {n}', { n: i + 1 }));
  const tr = s.transition || 'fade';
  const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(title)}</title>
<meta name="generator" content="TinyLittleOffice">
<meta property="og:title" content="${xml(title)}">
<meta name="description" content="${xml(slides.flatMap(slideText).join(' · ').slice(0, 200))}">${link ? `\n<link rel="alternate" href="${xml(link)}" title="Open in Tiny Little Office">` : ''}
<style>
html,body{height:100%;margin:0}body{display:grid;grid-template-rows:1fr auto;background:#18181b;color:#fafafa;font:15px/1.4 ${FONT};-webkit-tap-highlight-color:transparent;user-select:none}
main{position:relative;display:grid;place-items:center;min-height:0;padding:12px;overflow:hidden}
section{grid-area:1/1;display:none;height:100%;width:100%;place-items:center;min-height:0}section.on,section.was{display:grid}
section>svg{max-width:100%;max-height:100%;width:auto;height:auto;aspect-ratio:${w}/${h};background:${PAPER};box-shadow:0 6px 30px rgba(0,0,0,.5);border-radius:${g ? 3 : 6}px}
nav{display:flex;align-items:center;justify-content:center;gap:18px;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
button{font:inherit;color:inherit;background:#3f3f46;border:0;border-radius:999px;padding:9px 18px;cursor:pointer}button:disabled{opacity:.35}
button:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}
footer{text-align:center;padding:0 12px 10px;font-size:13px}footer a{color:#a5b4fc}
.fade section.on{animation:fade .6s ease-in-out both}
.slide section.on.fwd{animation:in .55s cubic-bezier(.22,.8,.3,1) both}.slide section.on.back{animation:in-back .55s cubic-bezier(.22,.8,.3,1) both}
.slide section.was.fwd{animation:out .55s cubic-bezier(.22,.8,.3,1) both}.slide section.was.back{animation:out-back .55s cubic-bezier(.22,.8,.3,1) both}
.zoom section.on{animation:zoom-in .6s cubic-bezier(.2,.7,.2,1) both}.zoom section.was{animation:zoom-out .6s ease-in both}
.cut section.was{display:none}
@keyframes fade{from{opacity:0}}@keyframes in{from{transform:translateX(100%)}}@keyframes in-back{from{transform:translateX(-100%)}}
@keyframes out{to{transform:translateX(-30%);opacity:.4}}@keyframes out-back{to{transform:translateX(30%);opacity:.4}}
@keyframes zoom-in{from{transform:scale(.6);opacity:0}}@keyframes zoom-out{to{transform:scale(1.25);opacity:0}}
@media (prefers-reduced-motion: reduce){section{animation:none !important}}
</style>
</head>
<body class="${tr}">
<main id="pages" aria-live="polite">
${pages.map((p, i) => `<section${i ? '' : ' class="on"'} aria-label="${xml(name(i))}">${pageSvg(p, `role="img" aria-label="${xml(p.alt || name(i))}"`)}</section>`).join('\n')}
</main>
<nav aria-label="${xml(t('Pages'))}"><button id="back">${xml(t('Back'))}</button><span id="where"></span><button id="next">${xml(t('Next'))}</button></nav>${link ? `\n<footer><a href="${xml(link)}">${xml(t('Open in Tiny Little Office'))}</a></footer>` : ''}
${PLAYER}
</body>
</html>
`;
}

/** What the view says about an untouched page, for alt text and names: the slide's words, or that it is blank. */
export const pageAlt = (s: Slide, i: number, g: Geometry | null, n: number): string => (g ? g.name(i, n) : t('Slide {n}', { n: i + 1 })) + (isBlank(s) ? '' : `: ${slideText(s)[0] ?? ''}`);
