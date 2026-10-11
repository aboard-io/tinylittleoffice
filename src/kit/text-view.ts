/**
 * The text layer (src/doc/text.ts, kit/text-layer.ts) drawn as plain HTML: h1 to h4, paragraphs with their marks,
 * lists (a task's state said before its words, its box drawn and kept from the reader), tables with their column
 * heads, fences as written, pictures, things from the web as links, a document held in this one as a section of
 * its own, the footnotes, and a rule between pages. Nothing styled but by the kit's tokens: the person's size, the
 * theme's colors, reflowed (kit.css .to-display-text).
 *
 * The Display Link (kit/shell.ts) puts it first, for a screen reader, the pages after it hidden from one; its Text
 * button shows it instead of the pages. A web page made of a document (kit/exports.ts htmlOf) carries it the same
 * way, with `file`. A link is a plain <a>, asked about by the link guard (kit/link-guard.ts) like every other; a
 * picture goes through the same gate as the pages' (kit/pictures.ts): from the web and not yet asked for, it is its
 * card, whose Show catches the same tap. In a file, a picture is its address, and fileOf puts its bytes in.
 */
import { linkable, type TextList, type TextNode, type TextRun } from '../doc/index.ts';
import { xml } from './draw.ts';
import { t } from './i18n.ts';
import { hostOf, pictureSrc } from './media.ts';
import { mayShow } from './pictures.ts';

export interface TextViewOptions {
  /** For a file (a web page saved): every picture by its own address, no gate. */
  file?: boolean;
}

/** Words with their marks, a line break a <br>, a footnote's mark its number raised. */
function runs(rs: TextRun[]): string {
  return rs
    .map((r) => {
      if (r.note !== undefined) return `<sup>${xml(r.t)}</sup>`;
      let s = xml(r.t).replace(/\n/g, '<br>');
      if (r.b) s = `<strong>${s}</strong>`;
      if (r.i) s = `<em>${s}</em>`;
      if (r.u) s = `<u>${s}</u>`;
      if (r.s) s = `<s>${s}</s>`;
      if (r.h) s = `<mark>${s}</mark>`;
      return r.href && linkable(r.href) ? `<a href="${xml(r.href)}">${s}</a>` : s;
    })
    .join('');
}

function list(l: TextList, o: TextViewOptions): string {
  const tag = l.ord ? 'ol' : 'ul';
  const item = (it: TextList['items'][number]) => {
    const task = it.done === undefined ? '' : `<span class="to-text-box" aria-hidden="true">${it.done ? '☑' : '☐'}</span> <span class="sr-only">${xml(it.done ? t('done') : t('not done'))} </span>`;
    return `<li${it.done === undefined ? '' : ' class="to-text-task"'}>${task}${runs(it.runs)}${it.list ? list(it.list, o) : ''}</li>`;
  };
  return `<${tag}>${l.items.map(item).join('')}</${tag}>`;
}

function picture(url: string, alt: string, o: TextViewOptions): string {
  if (o.file) return `<img src="${xml(url)}" alt="${xml(alt)}">`;
  if (mayShow(url)) return `<img src="${xml(pictureSrc(url))}" alt="${xml(alt)}" referrerpolicy="no-referrer" loading="lazy">`;
  // Asked for first, as on the pages: the card's Show is caught by kit/pictures.ts (data-webpic).
  return `<span class="to-webpic" role="group" aria-label="${xml(t('A picture from {host}', { host: hostOf(url) }))}"><span class="to-webpic-words"><b>${xml(hostOf(url))}</b>${alt ? `<small>${xml(alt)}</small>` : ''}<small class="to-webpic-why">${xml(t('Showing them tells their site this document was opened, and when.'))}</small></span><button type="button" class="to-btn to-webpic-show" data-webpic="">${xml(t('Show pictures from the web'))}</button></span>`;
}

function node(n: TextNode, o: TextViewOptions): string {
  switch (n.k) {
    case 'h':
      return `<h${n.level}>${runs(n.runs)}</h${n.level}>`;
    case 'p':
      return `<p>${runs(n.runs)}</p>`;
    case 'quote':
      return `<blockquote><p>${runs(n.runs)}</p></blockquote>`;
    case 'list':
      return list(n, o);
    case 'table':
      return `<table><thead><tr>${n.head.map((h) => `<th scope="col">${xml(h)}</th>`).join('')}</tr></thead><tbody>${n.rows.map((r) => `<tr>${r.map((c) => `<td>${xml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'pre':
      return `<pre>${xml(n.body)}</pre>`;
    case 'img':
      return `<p>${picture(n.url, n.alt, o)}</p>`;
    case 'embed':
      return linkable(n.url) ? `<p><a href="${xml(n.url)}">${xml(n.title || n.url)}</a></p>` : `<p>${xml(n.title || n.url)}</p>`;
    case 'doc':
      return `<section class="to-text-doc" aria-label="${xml(n.title || n.app)}">${textHtml(n.nodes, o)}</section>`;
    case 'notes':
      return `<section class="to-text-notes" aria-label="${xml(t('Footnotes'))}"><ol>${n.notes.map((r) => `<li>${runs(r)}</li>`).join('')}</ol></section>`;
    case 'break':
      return '<hr>';
  }
}

/** The text layer as HTML: what goes inside its box (the Display Link's .to-display-text, a web page's article). */
export const textHtml = (nodes: TextNode[], o: TextViewOptions = {}): string => nodes.map((n) => node(n, o)).join('\n');
