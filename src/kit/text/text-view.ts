/**
 * The text layer (src/doc/text.ts, kit/text/text-layer.ts) drawn as plain HTML: h1 to h4, paragraphs with their marks,
 * lists (a task's state said before its words, its box drawn and kept from the reader), tables with their column
 * heads, fences as written, a document held in this one as a section of
 * its own, the footnotes, and a rule between pages. Nothing styled but by the kit's tokens: the person's size, the
 * theme's colors, reflowed (kit.css .to-display-text).
 *
 * The Display Link (kit/core/shell.ts) puts it first, for a screen reader, the pages after it hidden from one; its Text
 * button shows it instead of the pages. A web page made of a document (kit/file/exports.ts htmlOf) carries it the same
 * way. A link is a plain <a>, asked about by the link guard (kit/ui/link-guard.ts) like every other.
 */
import { linkable, type TextList, type TextNode, type TextRun } from '../../doc/index.ts';
import { xml } from '../draw/draw.ts';
import { t } from '../core/i18n.ts';

/** Words with their marks (code a <code>), a line break a <br>, a footnote's mark its number raised. */
function runs(rs: TextRun[]): string {
  return rs
    .map((r) => {
      if (r.note !== undefined) return `<sup>${xml(r.t)}</sup>`;
      let s = xml(r.t).replace(/\n/g, '<br>');
      if (r.c) s = `<code>${s}</code>`;
      if (r.b) s = `<strong>${s}</strong>`;
      if (r.i) s = `<em>${s}</em>`;
      if (r.u) s = `<u>${s}</u>`;
      if (r.s) s = `<s>${s}</s>`;
      if (r.h) s = `<mark>${s}</mark>`;
      return r.href && linkable(r.href) ? `<a href="${xml(r.href)}" rel="noopener noreferrer">${s}</a>` : s;
    })
    .join('');
}

function list(l: TextList): string {
  const tag = l.ord ? 'ol' : 'ul';
  const item = (it: TextList['items'][number]) => {
    const task =
      it.done === undefined
        ? ''
        : `<span class="to-text-box" aria-hidden="true">${it.done ? '☑' : '☐'}</span> <span class="sr-only">${xml(it.done ? t('editor-done-lowercase') : t('editor-not-done'))} </span>`;
    return `<li${it.done === undefined ? '' : ' class="to-text-task"'}>${task}${runs(it.runs)}${it.list ? list(it.list) : ''}</li>`;
  };
  return `<${tag}>${l.items.map(item).join('')}</${tag}>`;
}

function node(n: TextNode): string {
  switch (n.k) {
    case 'h':
      return `<h${n.level}>${runs(n.runs)}</h${n.level}>`;
    case 'p':
      return `<p>${runs(n.runs)}</p>`;
    case 'quote':
      return `<blockquote><p>${runs(n.runs)}</p></blockquote>`;
    case 'list':
      return list(n);
    case 'table':
      return `<table><thead><tr>${n.head.map((h) => `<th scope="col">${xml(h)}</th>`).join('')}</tr></thead><tbody>${n.rows.map((r) => `<tr>${r.map((c) => `<td>${xml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'pre':
      return `<pre>${xml(n.body)}</pre>`;
    case 'doc':
      return `<section class="to-text-doc" aria-label="${xml(n.title || n.app)}">${textHtml(n.nodes)}</section>`;
    case 'notes':
      return `<section class="to-text-notes" aria-label="${xml(t('common-footnotes'))}"><ol>${n.notes.map((r) => `<li>${runs(r)}</li>`).join('')}</ol></section>`;
    case 'break':
      return '<hr>';
  }
}

/** The text layer as HTML: what goes inside its box (the Display Link's .to-display-text, a web page's article). */
export const textHtml = (nodes: TextNode[]): string => nodes.map(node).join('\n');
