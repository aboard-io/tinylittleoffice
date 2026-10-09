/** Board: what the shell knows about kanban boards. Format: lib/boardmodel.ts. */
import { defineApp, csv, csvSeparator, utf8, xml, text, rect, clip, wrapText, SHADE, LINE, MUTED, type Page } from '../kit/core.ts';
import { parseBoard, progress, readBoard } from '../lib/boardmodel.ts';
import { plainInline } from '../lib/richtext.ts';

export const boardToCsv = (body: string, sep = csvSeparator()) => csv([['Stage', 'Card'], ...parseBoard(body).flatMap((s) => s.cards.map((c) => [s.name, plainInline(c.text)]))], sep);

/** The board as a page; `upTo` cards of it (counting stage by stage) while it builds. */
function page(body: string, upTo = Infinity): Page {
  const stages = parseBoard(body);
  let shown = 0;
  const COL = 220;
  let svg = '';
  let tall = 0;
  stages.forEach((s, i) => {
    const left = 24 + i * (COL + 12);
    let y = 64;
    let cards = '';
    for (const c of s.cards) {
      const lines = wrapText(plainInline(c.text), COL - 40, 14).slice(0, 4);
      const done = progress(c);
      const h = lines.length * 19 + 18 + (done ? 16 : 0);
      if (shown++ < upTo) cards += rect(left + 8, y, COL - 16, h, '#fff', `rx="6" stroke="${LINE}"`) + lines.map((l, k) => text(left + 20, y + 22 + k * 19, l, { px: 14 })).join('') + (done ? text(left + 20, y + h - 8, `☑ ${done}`, { px: 12, fill: MUTED }) : '');
      y += h + 8;
    }
    tall = Math.max(tall, y);
    svg += `<g data-col="${i}">` + text(left + 12, 46, clip(s.name, COL - 80, 15, true), { px: 15, bold: true }) + text(left + COL - 12, 46, `${s.cards.length}${s.limit ? ' / ' + s.limit : ''}`, { px: 13, fill: MUTED, anchor: 'end' }) + cards + '</g>';
  });
  const h = Math.max(160, tall + 24);
  const back = stages.map((_, i) => rect(24 + i * (COL + 12), 20, COL, h - 40, SHADE, 'rx="10"')).join('');
  return { w: 48 + stages.length * (COL + 12) - 12, h, svg: back + svg };
}

export default defineApp({
  id: 'board',
  group: 'Plan',
  name: 'Board',
  icon: 'board',
  blurb: 'A kanban board: the stages of a workflow, cards, and limits per stage.',
  title: () => '',
  outline: (body) => parseBoard(body).map((s) => `${s.name}  ·  ${s.cards.length}`),
  view: (body, opts = {}) => [page(body, opts.step)],
  // On a slide, the stages are there and their cards arrive one at a time.
  steps: (body) => parseBoard(body).reduce((n, s) => n + s.cards.length, 0),
  read: readBoard,
  html: (body) => `<h1>Board</h1>\n${parseBoard(body).map((s) => `<section>\n<h2>${xml(s.name)}</h2>\n<ul>\n${s.cards.map((c) => `<li>${xml(plainInline(c.text))}${c.items.length ? `<ul>${c.items.map((i) => `<li>${i.done ? '☑' : '☐'} ${xml(i.text)}</li>`).join('')}</ul>` : ''}</li>`).join('\n')}\n</ul>\n</section>`).join('\n')}`,
  downloads: [
    { ext: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', build: (b) => utf8('\ufeff' + boardToCsv(b)) },
  ],
  shortcuts: [
    { keys: 'Enter', does: 'Add the card being typed' },
    { keys: 'Alt+Left / Alt+Right', does: 'Move the card to the stage before or after' },
    { keys: 'Alt+Up / Alt+Down', does: 'Move the card within its stage' },
  ],
});
