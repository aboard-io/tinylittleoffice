/**
 * Zine: eight small pages from one sheet of letter paper.
 *
 * One-sided is the classic mini zine: all eight pages on one side, folded
 * into eighths with one cut along the middle. Two-sided prints both sides;
 * the sheet is cut in half, the halves nested and folded, for bigger pages.
 * Either way each page is fitted to exactly one page: the type shrinks
 * until everything is on it.
 *
 * Document format: a deck's (lib/deckmodel.ts), always eight pages, with a
 * first chunk "!two" when it is two-sided.
 */
import { defineApp, text, wrapText, place, pageSvg, xml, FAINT, ACCENT, INK, FONT, type Page } from '../kit/core.ts';
import { refPage } from '../kit/embed.ts';
import { parseDeck, serializeDeck, type Slide } from '../lib/deckmodel.ts';
import { ICON_SVG } from '../lib/icons.ts';

export const PAGES = 8;
export interface Zine {
  two: boolean;
  pages: Slide[];
}

export function parseZine(body: string): Zine {
  const pages = parseDeck(body).slice(0, PAGES);
  while (pages.length < PAGES) pages.push({ icon: '', title: '', bullets: [] });
  return { two: body.startsWith('!two'), pages };
}

export function serializeZine(z: Zine): string {
  // Blank pages at the end need not be written down.
  const pages = z.pages.slice(0, PAGES);
  while (pages.length > 1 && isBlank(pages[pages.length - 1])) pages.pop();
  const text = pages.length === 1 && isBlank(pages[0]) ? '' : serializeDeck(pages);
  return z.two ? (text ? `!two\n\n${text}` : '!two') : text;
}

const isBlank = (s: Slide) => !s.icon && !s.title && !s.sub && s.bullets.every((b) => !b.trim());

/** A page of the zine, in px at 96 to the inch: a quarter of the sheet's long side by half its short side, or twice that. */
export const pageSize = (two: boolean) => (two ? { w: 408, h: 528 } : { w: 264, h: 408 });
export const pageName = (i: number) => (i === 0 ? 'Front cover' : i === PAGES - 1 ? 'Back cover' : `Page ${i + 1}`);

/**
 * One page, fitted: the largest type at which everything is on the page.
 * The cover is centred and louder; an embedded document gets whatever room
 * the words leave (at least a third of the page).
 */
export function zinePage(s: Slide, i: number, two: boolean): Page {
  const { w, h } = pageSize(two);
  const k = w / 264;
  const m = 20 * k;
  const cover = i === 0;
  const inner = w - 2 * m;
  const foot = cover || i === PAGES - 1 ? 0 : 12 * k;
  const room = h - 2 * m - foot;
  const paras = s.bullets.filter((b) => b.trim());
  const sub = s.sub ? refPage(s.sub) : null;
  const lay = (px: number) => {
    const tpx = px * (cover ? 2.1 : 1.5);
    const ipx = s.icon && ICON_SVG[s.icon] ? px * (cover ? 4.5 : 2.2) : 0;
    const title = s.title ? wrapText(s.title, inner, tpx, true) : [];
    const lines = paras.map((p) => wrapText(p, inner, px));
    const words = (ipx ? ipx + px * 0.6 : 0) + title.length * tpx * 1.15 + (title.length && paras.length ? px * 0.6 : 0) + lines.reduce((a, l) => a + l.length * px * 1.38 + px * 0.5, 0);
    return { px, tpx, ipx, title, lines, words };
  };
  let fit = lay(6 * k);
  for (let px = (cover ? 17 : 13) * k; px > 6 * k; px -= 0.5) {
    const tried = lay(px);
    const longest = Math.max(0, ...[...tried.title, ...tried.lines.flat()].map((l) => l.length));
    if (tried.words <= room - (sub ? room / 3 : 0) && longest < 400) {
      fit = tried;
      break;
    }
  }
  const x = cover ? w / 2 : m;
  const anchor = cover ? 'middle' : 'start';
  // The cover's words sit in the middle of the page; other pages start at the top.
  let y = m + (cover && !sub ? Math.max(0, (room - fit.words) / 2) : 0);
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
  if (sub) svg += place(sub, m, y + (fit.words ? 4 * k : 0), inner, m + room - y - (fit.words ? 4 * k : 0));
  if (foot) svg += text(w / 2, h - m * 0.55, String(i + 1), { px: 8 * k, fill: FAINT, anchor: 'middle' });
  return { w, h, svg };
}

const pagesOf = (z: Zine) => z.pages.map((s, i) => zinePage(s, i, z.two));
const guide = (x1: number, y1: number, x2: number, y2: number, cut = false) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cut ? '#71717a' : '#d4d4d8'}" stroke-width="1" stroke-dasharray="${cut ? '8 5' : '2 6'}"/>`;
const note = (x: number, y: number, t: string) => text(x, y, t, { px: 8, fill: FAINT, anchor: 'middle' });

/**
 * The sheets to print. One-sided: one landscape sheet, the top row upside
 * down, so that folding puts the pages in order. Two-sided: the two sides
 * of a portrait sheet (flip on the long edge), cut across the middle.
 * Dotted lines are folds; the dashed line is the cut.
 */
export function sheets(z: Zine): Page[] {
  const p = pagesOf(z);
  const { w, h } = pageSize(z.two);
  const at = (n: number, col: number, row: number, flip = false) => {
    const placed = place(p[n - 1], col * w, row * h, w, h);
    return flip ? `<g transform="rotate(180 ${col * w + w / 2} ${row * h + h / 2})">${placed}</g>` : placed;
  };
  if (!z.two) {
    const svg = [5, 4, 3, 2].map((n, c) => at(n, c, 0, true)).join('') + [6, 7, 8, 1].map((n, c) => at(n, c, 1)).join('');
    const folds = [1, 2, 3].map((c) => guide(c * w, 0, c * w, 2 * h)).join('') + guide(0, h, w, h) + guide(3 * w, h, 4 * w, h) + guide(w, h, 3 * w, h, true);
    return [{ w: 4 * w, h: 2 * h, svg: svg + folds + note(2 * w, h - 4, 'cut along the dashes · fold along the dots') }];
  }
  const side = (rows: number[][], hint: string): Page => ({
    w: 2 * w,
    h: 2 * h,
    svg: rows.map((row, r) => row.map((n, c) => at(n, c, r)).join('')).join('') + guide(w, 0, w, 2 * h) + guide(0, h, 2 * w, h, true) + note(w / 2, h - 4, hint),
  });
  return [side([[8, 1], [6, 3]], 'cut along the dashes · this half goes outside'), side([[2, 7], [4, 5]], 'print on the back, flipped on the long edge')];
}

/** The zine to read on a phone: one page at a time, tap to turn. */
function reader(body: string, name: string): string {
  const z = parseZine(body);
  const { w, h } = pageSize(z.two);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${xml(name)}</title>
<meta property="og:title" content="${xml(name)}">
<meta property="og:type" content="article">
<meta name="generator" content="TinyOffice">
<style>
html,body{height:100%;margin:0}body{display:grid;grid-template-rows:1fr auto;background:#27272a;color:#fafafa;font:15px/1.4 ${FONT};-webkit-tap-highlight-color:transparent;user-select:none}
main{position:relative;display:grid;place-items:center;min-height:0;padding:12px}
section{display:none;height:100%;width:100%;place-items:center;min-height:0}section.on{display:grid}
section svg{max-width:100%;max-height:100%;width:auto;height:auto;aspect-ratio:${w}/${h};background:#fff;box-shadow:0 6px 30px rgba(0,0,0,.5);border-radius:3px}
nav{display:flex;align-items:center;justify-content:center;gap:18px;padding:10px 12px calc(10px + env(safe-area-inset-bottom))}
button{font:inherit;color:inherit;background:#3f3f46;border:0;border-radius:999px;padding:9px 18px;cursor:pointer}button:disabled{opacity:.35}
button:focus-visible{outline:3px solid #a5b4fc;outline-offset:2px}
</style>
</head>
<body>
<main id="pages" aria-live="polite">
${pagesOf(z).map((p, i) => `<section${i ? '' : ' class="on"'} aria-label="${pageName(i)}">${pageSvg(p, `role="img" aria-label="${xml([z.pages[i].title, ...z.pages[i].bullets].filter(Boolean).join('. ') || pageName(i))}"`)}</section>`).join('\n')}
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

export default defineApp({
  id: 'zine',
  group: 'Publish and sell',
  name: 'Zine',
  icon: 'zine',
  blurb: 'An eight-page zine from one sheet of paper: print, fold and cut, or read it by tapping on a phone.',
  title: (body) => parseZine(body).pages[0].title,
  outline: (body) => parseZine(body).pages.map((p) => p.title).filter(Boolean),
  // Printed, it is its sheets. Shown inside something else it is its pages, turned one per click.
  view: (body, opts = {}) => {
    const z = parseZine(body);
    return opts.embed || opts.step !== undefined ? [zinePage(z.pages[Math.min(opts.step ?? 0, PAGES - 1)], Math.min(opts.step ?? 0, PAGES - 1), z.two)] : sheets(z);
  },
  steps: () => PAGES - 1,
  document: (body) => reader(body, parseZine(body).pages[0].title || 'Zine'),
  shortcuts: [
    { keys: 'Alt+↑ / Alt+↓', does: 'The page before, the page after' },
    { keys: 'Enter (in the headline)', does: 'On to the words' },
  ],
});
