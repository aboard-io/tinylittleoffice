/**
 * Comic: a zine whose pages are panels. Each line of a page's words is a
 * panel: ":icon What is said | caption". A page with a headline and no
 * panels is a title page.
 */
import { defineFold, fitted } from '../lib/fold.ts';
import { ZINE } from './zine.def.ts';
import { rect, text, wrapText, INK, type Page } from '../kit/core.ts';
import { iconOf } from '../lib/drawmodel.ts';
import { ICON_SVG } from '../lib/icons.ts';
import type { Slide } from '../lib/deckmodel.ts';

export const MAX_PANELS = 6;
const { w, h } = ZINE.size(false);

/** A page of panels: one to three in a column, more in two columns. A headline runs along the top. */
function panels(s: Slide): Page {
  const lines = s.bullets.filter((b) => b.trim()).slice(0, MAX_PANELS);
  const n = lines.length;
  const cols = n > 3 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const head = s.title ? 16 : 0;
  const [pw, ph] = [(w - 20 - (cols - 1) * 6) / cols, (h - 20 - head - (rows - 1) * 6) / rows];
  let svg = s.title ? text(w / 2, 20, s.title, { px: 10, bold: true, anchor: 'middle' }) : '';
  lines.forEach((line, i) => {
    const [x, y] = [10 + (i % cols) * (pw + 6), 10 + head + Math.floor(i / cols) * (ph + 6)];
    const [icon, words] = iconOf(line);
    const [said = '', caption = ''] = words.split('|').map((p) => p.trim());
    const speech = said ? wrapText(said, pw - 24, 8.5).slice(0, 4) : [];
    const foot = caption ? wrapText(caption, pw - 10, 7.5).slice(0, 2) : [];
    const [top, bottom] = [speech.length ? speech.length * 11 + 16 : 6, foot.length ? foot.length * 10 + 6 : 0];
    const size = Math.max(12, Math.min(pw - 16, ph - top - bottom - 8));
    svg += rect(x, y, pw, ph, '#fff', `stroke="${INK}" stroke-width="1.5"`);
    if (ICON_SVG[icon]) svg += `<g transform="translate(${x + (pw - size) / 2} ${y + top + (ph - top - bottom - size) / 2}) scale(${size / 24})" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICON_SVG[icon]}</g>`;
    if (speech.length) {
      // What is said, in a bubble with a tail toward the picture.
      const bh = speech.length * 11 + 6;
      svg += `<path d="M${x + pw / 2 - 5} ${y + 4 + bh - 1}l3 8 6-8z" fill="#fff" stroke="${INK}"/>` + rect(x + 5, y + 5, pw - 10, bh, '#fff', `rx="8" stroke="${INK}"`) + rect(x + pw / 2 - 6, y + 4 + bh - 2, 10, 2.5, '#fff');
      speech.forEach((l, k) => (svg += text(x + pw / 2, y + 16 + k * 11, l, { px: 8.5, anchor: 'middle' })));
    }
    if (foot.length) {
      svg += rect(x + 0.75, y + ph - bottom, pw - 1.5, bottom - 0.75, '#fef3c7');
      foot.forEach((l, k) => (svg += text(x + 5, y + ph - bottom + 11 + k * 10, l, { px: 7.5 })));
    }
  });
  return { w, h, svg };
}

/**
 * A comic written plainly: pages separated by a blank line, a panel per
 * line, "# Title" for a title page. (A page of panels has an empty headline
 * above them, which nobody should have to type.)
 */
export function readComic(body: string): string {
  return body
    .split('\n\n')
    .map((page) => (/^:[a-z0-9-]+ \S/.test(page) ? ' \n' + page : page.replace(/^# +/, '')))
    .join('\n\n');
}

export default defineFold(
  { id: 'comic', group: 'Print', under: 'zine', name: 'Comic', icon: 'comic', blurb: 'A mini comic: panels with a picture, a speech bubble and a caption, folded from one sheet.', read: readComic },
  {
    ...ZINE,
    sides: false,
    panels: MAX_PANELS,
    sheets: (p) => ZINE.sheets(p, false),
    how: () => ZINE.how(false),
    // A page with panels is drawn as panels; a title page, or one given to another document, as any zine page is.
    page: (s) => (s.sub || !s.bullets.some((b) => b.trim()) ? fitted(s, w, h, { cover: true }) : panels(s)),
  },
);
