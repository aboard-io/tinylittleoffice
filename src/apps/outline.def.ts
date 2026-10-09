/** Outline: what the shell knows about outlines. Format: a nested list, lib/outlinemodel.ts. */
import { defineApp, utf8, wrap, text, xml, place, textWidth, ACCENT, type Page } from '../kit/core.ts';
import { markNotes, noteNumbers, noteRuns, notesIn, parseInline, plainInline } from '../lib/richtext.ts';
import { textPdf, type TextBlock } from '../kit/textpdf.ts';
import { parseOutline, parseLinks, outlineLines, readOutline, toOpml, hasChildren, type Dir, type Item } from '../lib/outlinemodel.ts';
import { refPage, resolve } from '../kit/embed.ts';

/** How each kind of line looks, drawn and said. */
export const ARROW: Record<Dir, string> = { '--': '—', '->': '→', '<-': '←', '<->': '↔' };
export const DIR_NAME: Record<Dir, string> = { '--': 'a plain line', '->': 'an arrow from the parent', '<-': 'an arrow to the parent', '<->': 'arrows both ways' };

/** The outline drawn: a dot per item, deeper ones stepped in, the words wrapped. Fits a letter page's width; as tall as it needs. */
export function outlinePage(body: string, w = 720): Page {
  const items = parseOutline(body);
  const px = 17;
  const step = 28;
  let y = 44;
  let svg = '';
  const next = noteNumbers();
  items.forEach((it, i) => {
    if (!it.text.trim() && !it.doc && !hasChildren(items, i)) return;
    const x = 48 + it.depth * step;
    if (it.doc) {
      // Another document, drawn small where its item would be.
      const p = refPage(it.doc, { w: 340 });
      const pw = Math.min(w - x - 48, 340);
      const ph = (p.h / p.w) * pw;
      svg += place(p, x, y + 8, pw, ph);
      y += ph + 16;
      return;
    }
    // The kind of line to the parent, and its name, small before the words.
    const kind = it.depth && (it.dir || it.label) ? `${ARROW[it.dir ?? '--']}${it.label ? ' ' + it.label : ''}` : '';
    const indent = kind ? textWidth(kind, px * 0.75) + 8 : 0;
    const lines = wrap(markNotes(parseInline(it.text), next), w - x - 48 - indent, px, it.depth === 0);
    const top = y;
    svg += `<circle cx="${x - 12}" cy="${top + px * 0.65}" r="${it.depth ? 3 : 4}" fill="${it.depth ? 'none' : ACCENT}" stroke="${ACCENT}" stroke-width="1.5"/>`;
    if (kind) svg += `<text x="${x}" y="${top + px}" font-size="${px * 0.75}" fill="${ACCENT}">${xml(kind)}</text>`;
    for (const line of lines) svg += text(x + indent, (y += px * 1.45) - px * 0.45, line, { px, bold: it.depth === 0 });
    y += px * 0.45;
  });
  // The footnotes, listed under the outline, small.
  const notes = notesIn(items.filter((it) => !it.doc).map((it) => it.text));
  if (notes.length) {
    y += 12;
    svg += `<line x1="48" y1="${y}" x2="120" y2="${y}" stroke="#d4d4d8"/>`;
    y += 4;
    notes.forEach((fn, i) => {
      for (const part of wrap([{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...noteRuns(fn)], w - 96, px * 0.8)) svg += text(48, (y += px * 1.2) - px * 0.3, part, { px: px * 0.8 });
    });
    y += px * 0.45;
  }
  // The joins, listed under the outline.
  const links = parseLinks(body);
  if (links.length) {
    y += 16;
    svg += text(48, (y += px * 1.45) - px * 0.45, [{ t: 'Connections', b: true }], { px });
    for (const l of links) {
      const line = `${plainInline(l.from)}  ${ARROW[l.dir]}${l.label ? ' ' + l.label : ''}  ${plainInline(l.to)}`;
      for (const part of wrap([{ t: line }], w - 96, px * 0.9, false)) svg += text(60, (y += px * 1.35) - px * 0.4, part, { px: px * 0.9 });
    }
    y += px * 0.45;
  }
  return { w, h: Math.max(200, y + 40), svg };
}

const items = (body: string) => parseOutline(body).filter((it) => it.text.trim() || it.doc);

/**
 * The outline as a document of words, for its PDF: the top items are its
 * sections (each a bookmark), everything under them bullets at their depth.
 * A lone top item is the title, and the items under it the sections. A
 * line's name goes before its words; joins are listed at the end.
 */
export function outlineBlocks(body: string, docTitle = ''): TextBlock[] {
  const all = items(body);
  const roots = all.filter((it) => it.depth === 0);
  const lone = roots.length === 1;
  const base = lone ? 1 : 0;
  const next = noteNumbers();
  const words = (it: Item): TextBlock['runs'] => {
    if (it.doc) return [{ t: `[${resolve(it.doc).title}]`, i: true }];
    return [...(it.label ? [{ t: `${it.label} \u2014 `, i: true }] : []), ...markNotes(parseInline(it.text), next)];
  };
  const out: TextBlock[] = [];
  // A lone top item is what the outline is called; otherwise its title, if it has one.
  const title = lone ? plainInline(roots[0].text) : docTitle;
  if (title) out.push({ kind: 'title', runs: [{ t: title }] });
  for (const it of all) {
    if (lone && it.depth === 0) continue;
    out.push(it.depth === base ? { kind: 'h', runs: words(it) } : { kind: 'li', depth: it.depth - base - 1, runs: words(it) });
  }
  // The footnotes, numbered as their marks came, then the joins.
  const notes = notesIn(all.filter((it) => !it.doc).map((it) => it.text));
  if (notes.length) {
    out.push({ kind: 'h', runs: [{ t: 'Notes' }] });
    notes.forEach((fn, i) => out.push({ kind: 'p', runs: [{ t: `${i + 1}`, sup: true }, { t: ' ' }, ...noteRuns(fn)] }));
  }
  const links = parseLinks(body);
  if (links.length) {
    out.push({ kind: 'h', runs: [{ t: 'Connections' }] });
    const say: Record<Dir, string> = { '--': 'and', '->': 'to', '<-': 'from', '<->': 'and, both ways,' };
    for (const l of links) out.push({ kind: 'li', depth: 0, runs: [...parseInline(l.from), { t: ` ${say[l.dir]} ` }, ...parseInline(l.to), ...(l.label ? [{ t: `: ${l.label}`, i: true }] : [])] });
  }
  return out;
}
const title = (body: string) => plainInline(items(body).find((it) => !it.doc)?.text ?? '');

export default defineApp({
  id: 'outline',
  group: '',
  name: 'Outline',
  icon: 'outline',
  blurb: 'An outliner: ideas under ideas, folded and unfolded, moved about; the same text a mind map or an org chart reads.',
  title,
  outline: outlineLines,
  read: readOutline,
  view: (body) => [outlinePage(body)],
  steps: (body) => items(body).length,
  downloads: [
    { ext: 'opml', label: 'OPML (for outliners)', mime: 'text/x-opml;charset=utf-8', build: (b) => utf8(toOpml(parseOutline(b), title(b) || 'Outline')) },
    { ext: 'pdf', label: 'PDF: sections and bullets', mime: 'application/pdf', build: (b, ctx) => textPdf(outlineBlocks(b, ctx.title ?? ''), ctx.title || title(b) || 'Outline') },
    { ext: 'txt', label: 'Plain text', mime: 'text/plain;charset=utf-8', build: (b) => utf8(outlineLines(b).join('\n') + '\n') },
  ],
  shortcuts: [
    { keys: 'Enter', does: 'A new item below' },
    { keys: 'Tab / Shift+Tab', does: 'Indent, or bring out, with everything under it' },
    { keys: 'Alt+↑ / Alt+↓', does: 'Move the item (and its family) up or down' },
    { keys: 'Alt+← / Alt+→', does: 'Fold or unfold' },
    { keys: 'Backspace (in an empty item)', does: 'Take it away' },
    { keys: 'Mod+.', does: 'Zoom in on the item; Mod+, zooms out' },
    { keys: 'Escape (while connecting)', does: 'Stop connecting' },
  ],
});
