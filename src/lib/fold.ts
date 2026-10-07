/**
 * Paper that folds: zines, booklets, brochures, comics. Each is a few
 * small pages (a deck's slides: an icon, a headline, words, or another
 * document) laid on letter paper so that folding puts them in order.
 * A Format says how many pages, how big, and where each lands on the sheet;
 * everything else (fitting the type, the editor, the PDF, the page to tap
 * through on a phone) is shared.
 *
 * Document format: a deck's (lib/deckmodel.ts), with a first chunk "!two"
 * (two-sided, where a format offers the choice) or "!12" (how many pages,
 * where a format can grow).
 */
import { defineApp, text, wrapText, textWidth, place, pageSvg, xml, FAINT, ACCENT, INK, FONT, type AppDef, type Page } from '../kit/core.ts';
import { refPage } from '../kit/embed.ts';
import { parseDeck, serializeDeck, type Slide } from './deckmodel.ts';
import { ICON_SVG } from './icons.ts';

export interface Format {
  /** How many pages; with `grow`, how many to start with. */
  count: number;
  /** The most pages it can grow to, four at a time. */
  grow?: number;
  /** Offers one-sided and two-sided printing. */
  sides?: boolean;
  /** A page, in px at 96 to the inch. */
  size(two: boolean): { w: number; h: number };
  /** What page i of n is called. */
  name(i: number, n: number): string;
  /** The pages laid on the sheets to print. */
  sheets(pages: Page[], two: boolean): Page[];
  /** Its pages are panels (a comic): at most this many to a page, each a line ":icon said | caption". */
  panels?: number;
  /** Draws a page its own way; otherwise the words are fitted to it. */
  page?(s: Slide, i: number): Page;
  /** How to print and fold it. */
  how(two: boolean): string;
}

export interface Folded {
  two: boolean;
  pages: Slide[];
}

const FORMATS = new Map<string, Format>();
export const formatOf = (id: string) => FORMATS.get(id);
const isBlank = (s: Slide) => !s.icon && !s.title && !s.sub && s.bullets.every((b) => !b.trim());
const blank = (): Slide => ({ icon: '', title: '', bullets: [] });

export function parseFold(body: string, f: Format): Folded {
  const set = /^!(two|\d+)(?:\n\n|$)/.exec(body);
  const pages = parseDeck(set ? body.slice(set[0].length) : body);
  const want = f.grow ? Math.min(f.grow, Math.max(f.count, +(set?.[1] ?? 0) || 0, Math.ceil(pages.length / 4) * 4)) : f.count;
  while (pages.length < want) pages.push(blank());
  return { two: set?.[1] === 'two', pages: pages.slice(0, want) };
}

export function serializeFold(z: Folded, f: Format): string {
  // Blank pages at the end need not be written down.
  const pages = z.pages.slice();
  while (pages.length > 1 && isBlank(pages[pages.length - 1])) pages.pop();
  const text = pages.length === 1 && isBlank(pages[0]) ? '' : serializeDeck(pages);
  const set = z.two ? '!two' : f.grow && z.pages.length > f.count ? `!${z.pages.length}` : '';
  return set && text ? `${set}\n\n${text}` : set || text;
}

export interface Fit {
  /** Centred and louder, as a cover is. */
  cover?: boolean;
  /** A line at the foot (a page number). */
  foot?: string;
  /** The largest the words may be, in px. */
  max?: number;
  /** The margin, in px. */
  m?: number;
}

/**
 * A slide fitted to a page: the largest type at which everything is on it.
 * A page that shows another document is given over to it entirely.
 */
export function fitted(s: Slide, w: number, h: number, o: Fit = {}): Page {
  const k = w / 264;
  const m = o.m ?? Math.min(48, 20 * k);
  const cover = !!o.cover;
  const inner = w - 2 * m;
  const room = h - 2 * m - (o.foot ? 12 : 0);
  const foot = o.foot ? text(w / 2, h - m * 0.55, o.foot, { px: Math.min(11, 8 * k), fill: FAINT, anchor: 'middle' }) : '';
  if (s.sub) {
    // Laid out narrow, so its words are a size to read on a small page; from the top if it does not fill the page.
    const sub = refPage(s.sub, { w: 340 });
    const scale = Math.min(inner / sub.w, room / sub.h);
    return { w, h, svg: place(sub, m, m, inner, sub.h * scale > room * 0.6 ? room : sub.h * scale) + foot };
  }
  const paras = s.bullets.filter((b) => b.trim());
  const lay = (px: number) => {
    const tpx = px * (cover ? 2.1 : 1.5);
    const ipx = s.icon && ICON_SVG[s.icon] ? px * (cover ? 4.5 : 2.2) : 0;
    const title = s.title ? wrapText(s.title, inner, tpx, true) : [];
    const lines = paras.map((p) => wrapText(p, inner, px));
    const words = (ipx ? ipx + px * 0.6 : 0) + title.length * tpx * 1.15 + (title.length && paras.length ? px * 0.6 : 0) + lines.reduce((a, l) => a + l.length * px * 1.38 + px * 0.5, 0);
    return { px, tpx, ipx, title, lines, words };
  };
  const max = o.max ?? Math.min(cover ? 34 : 17, (cover ? 17 : 13) * k);
  let fit = lay(5);
  for (let px = max; px > 5; px -= Math.max(0.5, max / 40)) {
    const tried = lay(px);
    // (A word too long for the line is the other way not to fit.)
    if (tried.words <= room && tried.title.every((l) => textWidth(l, tried.tpx, true) <= inner) && tried.lines.flat().every((l) => textWidth(l, tried.px) <= inner)) {
      fit = tried;
      break;
    }
  }
  const x = cover ? w / 2 : m;
  const anchor = cover ? 'middle' : 'start';
  // A cover's words sit in the middle of the page; other pages start at the top.
  let y = m + (cover ? Math.max(0, (room - fit.words) / 2) : 0);
  let svg = '';
  if (fit.ipx) {
    svg += `<g transform="translate(${cover ? (w - fit.ipx) / 2 : m} ${y}) scale(${fit.ipx / 24})" fill="none" stroke="${ACCENT}" stroke-width="${cover ? 1.5 : 2}" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[s.icon]}</g>`;
    y += fit.ipx + fit.px * 0.6;
  }
  for (const line of fit.title) svg += text(x, (y += fit.tpx * 1.15) - fit.tpx * 0.25, line, { px: fit.tpx, bold: true, anchor });
  if (fit.title.length && paras.length) y += fit.px * 0.6;
  for (const para of fit.lines) {
    for (const line of para) svg += text(x, (y += fit.px * 1.38) - fit.px * 0.35, line, { px: fit.px, anchor, fill: INK });
    y += fit.px * 0.5;
  }
  return { w, h, svg: svg + foot };
}

/** Page i of a folded thing: the first is its cover; inside pages are numbered. */
export const foldPage = (z: Folded, i: number, f: Format): Page => {
  const { w, h } = f.size(z.two);
  if (f.page) return f.page(z.pages[i], i);
  return fitted(z.pages[i], w, h, { cover: i === 0, foot: i === 0 || i === z.pages.length - 1 ? '' : String(i + 1) });
};
const pagesOf = (z: Folded, f: Format) => z.pages.map((_, i) => foldPage(z, i, f));
export const foldSheets = (z: Folded, f: Format) => f.sheets(pagesOf(z, f), z.two);

/* ---------- laying pages on sheets ---------- */

export const LETTER = { w: 816, h: 1056 };
const guide = (x1: number, y1: number, x2: number, y2: number, cut = false) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cut ? '#71717a' : '#d4d4d8'}" stroke-width="1" stroke-dasharray="${cut ? '8 5' : '2 6'}"/>`;

/**
 * One side of a sheet: rows of page numbers (0 for an empty place), each
 * page in its cell of an even grid. Dotted lines are folds; `cut` adds a
 * dashed line to cut along ([row, from column, to column], below that row);
 * `flip` lists the rows printed upside down.
 */
export function side(pages: Page[], rows: number[][], o: { flip?: number[]; cut?: [number, number, number]; note?: string } = {}): Page {
  const { w, h } = pages[0];
  const W = rows[0].length * w;
  const H = rows.length * h;
  let svg = '';
  rows.forEach((row, r) =>
    row.forEach((n, c) => {
      if (!pages[n - 1]) return;
      const placed = place(pages[n - 1], c * w, r * h, w, h);
      svg += o.flip?.includes(r) ? `<g transform="rotate(180 ${c * w + w / 2} ${r * h + h / 2})">${placed}</g>` : placed;
    }),
  );
  for (let c = 1; c < rows[0].length; c++) svg += guide(c * w, 0, c * w, H);
  for (let r = 1; r < rows.length; r++) svg += o.cut?.[0] === r ? guide(0, r * h, o.cut[1] * w, r * h) + guide(o.cut[1] * w, r * h, o.cut[2] * w, r * h, true) + guide(o.cut[2] * w, r * h, W, r * h) : guide(0, r * h, W, r * h);
  if (o.note) svg += text(w / 2, (o.cut?.[0] ?? rows.length) * h - 4, o.note, { px: 8, fill: FAINT, anchor: 'middle' });
  return { w: W, h: H, svg };
}

/** Sheets folded in half and nested, as a booklet is: page n beside page 1, and so on inward. */
export function saddle(pages: Page[]): Page[] {
  const n = pages.length;
  return Array.from({ length: n / 4 }, (_, k) => [side(pages, [[n - 2 * k, 1 + 2 * k]]), side(pages, [[2 + 2 * k, n - 1 - 2 * k]])]).flat();
}

/* ---------- the app ---------- */

/** The thing to read on a phone: one page at a time, tap to turn. */
function reader(z: Folded, f: Format, name: string): string {
  const { w, h } = f.size(z.two);
  const n = z.pages.length;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(name)}</title>
<meta property="og:title" content="${xml(name)}">
<meta property="og:type" content="article">
<meta name="generator" content="TinyLittleOffice">
<style>
html,body{height:100%;margin:0}body{display:grid;grid-template-rows:1fr auto;background:#27272a;color:#fafafa;font:15px/1.4 ${FONT};-webkit-tap-highlight-color:transparent;user-select:none}
main{position:relative;display:grid;place-items:center;min-height:0;padding:12px}
section{display:none;height:100%;width:100%;place-items:center;min-height:0}section.on{display:grid}
section>svg{max-width:100%;max-height:100%;width:auto;height:auto;aspect-ratio:${w}/${h};background:#fff;box-shadow:0 6px 30px rgba(0,0,0,.5);border-radius:3px}
nav{display:flex;align-items:center;justify-content:center;gap:18px;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
button{font:inherit;color:inherit;background:#3f3f46;border:0;border-radius:999px;padding:9px 18px;cursor:pointer}button:disabled{opacity:.35}
button:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}
</style>
</head>
<body>
<main id="pages" aria-live="polite">
${pagesOf(z, f).map((p, i) => `<section${i ? '' : ' class="on"'} aria-label="${f.name(i, n)}">${pageSvg(p, `role="img" aria-label="${xml([z.pages[i].title, ...z.pages[i].bullets].filter(Boolean).join('. ') || f.name(i, n))}"`)}</section>`).join('\n')}
</main>
<nav aria-label="Pages"><button id="back">Back</button><span id="where"></span><button id="next">Next</button></nav>
<script>
var pages = [].slice.call(document.querySelectorAll('section')), at = 0;
function go(n) {
  at = Math.max(0, Math.min(pages.length - 1, n));
  pages.forEach(function (p, i) { p.className = i === at ? 'on' : ''; });
  document.getElementById('where').textContent = (at + 1) + ' / ' + pages.length;
  document.getElementById('back').disabled = at === 0;
  document.getElementById('next').disabled = at === pages.length - 1;
}
document.getElementById('back').onclick = function () { go(at - 1); };
document.getElementById('next').onclick = function () { go(at + 1); };
// Tap the right of the page to go on, the left to go back.
document.getElementById('pages').onclick = function (e) { go(at + (e.clientX > innerWidth / 3 ? 1 : -1)); };
document.onkeydown = function (e) {
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') go(at + 1);
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(at - 1);
};
go(0);
</script>
</body>
</html>
`;
}

/** Define an app that is pages folded from letter paper. */
export function defineFold(app: Pick<AppDef, 'id' | 'name' | 'icon' | 'blurb'> & Partial<AppDef>, f: Format): AppDef {
  FORMATS.set(app.id, f);
  const title = (body: string) => parseFold(body, f).pages[0].title;
  return defineApp({
    group: 'Print',
    title,
    outline: (body) => parseFold(body, f).pages.map((p) => p.title).filter(Boolean),
    // Printed, it is its sheets. Shown inside something else it is its pages, turned one per click.
    view: (body, opts = {}) => {
      const z = parseFold(body, f);
      return opts.embed || opts.step !== undefined ? [foldPage(z, Math.min(opts.step ?? 0, z.pages.length - 1), f)] : foldSheets(z, f);
    },
    steps: (body) => parseFold(body, f).pages.length - 1,
    document: (body) => reader(parseFold(body, f), f, title(body) || app.name),
    shortcuts: [
      { keys: 'Alt+↑ / Alt+↓', does: 'The page before, the page after' },
      { keys: 'Enter (in the headline)', does: 'On to the words' },
    ],
    ...app,
  });
}
