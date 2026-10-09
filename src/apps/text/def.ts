/**
 * Text: the placeholder app of the skeleton. Rich text comes with the kernel and <to-text> (docs/kernel.md);
 * until then its editor is the TLO text itself, and its pages are the lines, drawn. What is real already:
 * the shape every app will have (this definition, a lazy editor, templates, pages).
 */
import { FileText } from 'lucide';
import { defineApp, type Doc, type Page } from '../../kit/app.ts';
import { t } from '../../kit/i18n.ts';
import { INK, MUTED, xml } from '../../kit/exports.ts';
import { templates } from './templates.ts';

const HEAD = /^---\n([\s\S]*?)\n---\n?/;

/** The head's title line. (Until the kernel: then takeHead/withHead do this for every app.) */
export function titleOf(doc: Doc): string {
  const m = HEAD.exec(doc);
  const line = m?.[1].split('\n').find((l) => /^title:/i.test(l));
  return line ? line.slice(6).trim() : '';
}

export function retitle(doc: Doc, title: string): Doc {
  const m = HEAD.exec(doc);
  const keys = m ? m[1].split('\n').filter((l) => l.trim() && !/^title:/i.test(l)) : [];
  const body = m ? doc.slice(m[0].length) : doc;
  if (title) keys.unshift(`title: ${title.replace(/\n/g, ' ')}`);
  return keys.length ? `---\n${keys.join('\n')}\n---\n${body}` : body;
}

/** Width of text in px, estimated; the editor phase brings real measurement. */
const width = (s: string, px: number) => s.length * px * 0.52;
function wrap(line: string, max: number, px: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of line.split(/(?<= )/)) {
    if (cur && width(cur + word.trimEnd(), px) > max) {
      out.push(cur.trimEnd());
      cur = '';
    }
    cur += word;
  }
  if (cur.trim() || !out.length) out.push(cur.trimEnd());
  return out;
}

/** A letter page (8.5 by 11 inches at 96 px) of the text's lines; more pages when they run over. */
export function pages(doc: Doc, small = false): Page[] {
  const W = 816;
  const H = 1056;
  const margin = 96;
  const px = small ? 28 : 16;
  const lead = px * 1.5;
  const body = doc.replace(HEAD, '');
  const title = titleOf(doc);
  const rows: { t: string; px: number; bold: boolean; fill: string }[] = [];
  if (title) rows.push({ t: title, px: px * 1.8, bold: true, fill: INK });
  for (const raw of body.split('\n')) {
    const h = /^(#{1,6})\s+(.*)/.exec(raw);
    const line = h ? h[2] : raw;
    const size = h ? px * (h[1].length === 1 ? 1.6 : 1.25) : px;
    if (!line.trim()) {
      rows.push({ t: '', px, bold: false, fill: INK });
      continue;
    }
    for (const piece of wrap(line, W - 2 * margin, size)) rows.push({ t: piece, px: size, bold: !!h, fill: h ? INK : MUTED });
  }
  const out: Page[] = [];
  let svg = '';
  let y = margin + px;
  const flush = () => {
    out.push({ w: W, h: H, svg, alt: title || t('A page of text') });
    svg = '';
    y = margin + px;
  };
  for (const row of rows) {
    const step = row.px === px ? lead : row.px * 1.4;
    if (y + step > H - margin) flush();
    if (row.t) svg += `<text x="${margin}" y="${y}" font-size="${row.px}"${row.bold ? ' font-weight="700"' : ''} fill="${row.fill}" xml:space="preserve">${xml(row.t)}</text>`;
    y += step;
    if (small && out.length) break;
  }
  if (svg || !out.length) flush();
  return out;
}

export default defineApp({
  id: 'text',
  get name() {
    return t('Text');
  },
  get group() {
    return t('Words');
  },
  icon: FileText,
  get blurb() {
    return t('Words on a page: headings, lists, links and notes, printed on letter or A4.');
  },
  blank: () => '',
  get templates() {
    return templates();
  },
  editor: () => import('./editor.ts'),
  title: titleOf,
  retitle,
  view: (doc, opts) => pages(doc, opts?.small),
});
