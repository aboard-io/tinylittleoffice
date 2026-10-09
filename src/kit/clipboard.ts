/**
 * The editor's clipboard. Copy and cut write the selected blocks as TLO
 * (text/plain) and as HTML with a generator marker (text/html), so a paste
 * into another TinyLittleOffice document comes back whole and a paste into
 * anything else arrives with its marks. Paste reads, in order: our own HTML
 * (the marker) → the TLO; a TinyLittleOffice link alone → a fence holding
 * that document; a web address alone → a paragraph that is the address (a
 * card); HTML from elsewhere → blocks (tags and styles to marks, lists to
 * items, Google Docs' bold-that-is-not); plain text with a line break → read
 * as TLO (pasted Markdown becomes headings and lists); plain words → words.
 * What comes back is fitted to the editor's shape: lines keeps items and
 * paragraphs only; a line takes the words alone.
 */
import { column, isAtomic, isText, linkable, linkTarget, normalRuns, parse, refFence, write, type Block, type Column, type Run } from '../doc/index.ts';
import { decodeDoc } from './codec.ts';
import { parseHash } from './route.ts';
import { sliceBlocks, type Sel, type Shape } from './textops.ts';

/** The mark our own HTML carries. */
export const GENERATOR = 'TinyLittleOffice';
const MARKER = `<meta name="generator" content="${GENERATOR}">`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Runs as HTML: marks nested, an icon and a footnote as their own elements, a line break as <br>. */
export function runsToHtml(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.ic) return `<span data-icon="${esc(r.ic)}">:${esc(r.ic)}:</span>`;
      if (r.fn !== undefined) return `<sup data-fn="${esc(r.fn)}">*</sup>`;
      let s = esc(r.t).replace(/\n/g, '<br>');
      if (r.h) s = `<mark>${s}</mark>`;
      if (r.s) s = `<s>${s}</s>`;
      if (r.u) s = `<u>${s}</u>`;
      if (r.i) s = `<i>${s}</i>`;
      if (r.b) s = `<b>${s}</b>`;
      if (r.href) s = `<a href="${esc(r.href)}">${s}</a>`;
      return s;
    })
    .join('');
}

/** Blocks as HTML, our marker first: what the clipboard's text/html holds. */
export function docToHtml(blocks: Block[]): string {
  const out: string[] = [MARKER];
  let list: { ord: boolean; depth: number }[] = [];
  const closeLists = (to: number) => {
    while (list.length > to) out.push(list.pop()!.ord ? '</ol>' : '</ul>');
  };
  for (const b of blocks) {
    if (b.k !== 'li') closeLists(0);
    switch (b.k) {
      case 'h':
        out.push(`<h${b.level}>${runsToHtml(b.runs)}</h${b.level}>`);
        break;
      case 'p':
        out.push(`<p>${runsToHtml(b.runs)}</p>`);
        break;
      case 'quote':
        out.push(`<blockquote>${runsToHtml(b.runs)}</blockquote>`);
        break;
      case 'li': {
        closeLists(b.depth + 1);
        while (list.length < b.depth + 1) {
          list.push({ ord: !!b.ord, depth: list.length });
          out.push(b.ord ? '<ol>' : '<ul>');
        }
        out.push(`<li>${b.done === undefined ? '' : b.done ? '☑ ' : '☐ '}${runsToHtml(b.runs)}</li>`);
        break;
      }
      case 'hr':
        out.push('<hr>');
        break;
      case 'table':
        out.push(`<table><tr>${b.cols.map((c) => `<th>${esc(c.name)}</th>`).join('')}</tr>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`);
        break;
      case 'fence':
        out.push(`<pre data-lang="${esc(b.lang)}">${esc(b.body)}</pre>`);
        break;
      case 'edge':
        out.push(`<p>${esc(`${b.from} ${b.dir} ${b.to}${b.label ? `: ${b.label}` : ''}`)}</p>`);
        break;
      case 'img':
        out.push(`<img src="${esc(b.url)}" alt="${esc(b.alt)}">`);
        break;
    }
  }
  closeLists(0);
  return out.join('\n');
}

/** What copy puts on the clipboard for a selection: the TLO, and the HTML. */
export function copyData(blocks: Block[], sel: Sel): { text: string; html: string } {
  const picked = sliceBlocks(blocks, sel);
  return { text: write({ head: {}, blocks: picked }), html: docToHtml(picked) };
}

/* ---------- HTML from elsewhere ---------- */

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'PRE', 'TABLE', 'HR', 'IMG', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'NAV', 'FIGURE', 'DL', 'DT', 'DD', 'TR', 'ADDRESS']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'svg', 'BUTTON', 'SELECT', 'INPUT', 'TEXTAREA', 'HEAD']);

type Marks = Partial<Pick<Run, 'b' | 'i' | 'u' | 's' | 'h' | 'href'>>;

/**
 * HTML from anywhere as blocks: tags and styles to marks, lists to items
 * with their depth, headings by level, pictures and tables as such. Spaces
 * collapse as a browser shows them; a <br> is a line break.
 */
export function htmlToBlocks(html: string): Block[] {
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks: Block[] = [];
  let cur: { k: 'p' | 'li' | 'h' | 'quote'; level?: number; depth?: number; ord?: true; runs: Run[] } | null = null;
  let lists: { ord: boolean }[] = [];
  let pre = false;

  const open = (k: 'p' | 'li' | 'h' | 'quote', extra: { level?: number } = {}) => {
    if (k === 'li') cur = { k, depth: Math.min(3, Math.max(0, lists.length - 1)), ...(lists[lists.length - 1]?.ord ? { ord: true } : {}), runs: [] };
    else cur = { k, ...extra, runs: [] };
  };
  const close = () => {
    if (!cur) return;
    const runs = normalRuns(cur.runs);
    // Spaces at either end of a block are the markup's, not the words'.
    if (runs.length) {
      runs[0] = { ...runs[0], t: runs[0].t.replace(/^[ \n]+/, '') };
      const last = runs.length - 1;
      runs[last] = { ...runs[last], t: runs[last].t.replace(/[ \n]+$/, '') };
    }
    const kept = normalRuns(runs);
    if (kept.length) {
      if (cur.k === 'h') blocks.push({ k: 'h', level: (cur.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6, runs: kept });
      else if (cur.k === 'li') blocks.push({ k: 'li', depth: cur.depth ?? 0, ...(cur.ord ? { ord: true } : {}), runs: kept });
      else blocks.push({ k: cur.k, runs: kept });
    }
    cur = null;
  };
  const addText = (raw: string, m: Marks) => {
    const t = pre ? raw : raw.replace(/[ \t\r\n ]+/g, ' ');
    if (!t) return;
    if (!cur) open('p');
    const run: Run = { t, ...m };
    // A heading is bold through and through, so bold inside one says nothing.
    if (cur!.k === 'h') delete run.b;
    cur!.runs.push(run);
  };

  const walk = (node: Node, m: Marks) => {
    if (node.nodeType === Node.TEXT_NODE) return addText(node.textContent ?? '', m);
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (SKIP_TAGS.has(tag)) return;
    if (el.dataset.icon) {
      if (!cur) open('p');
      cur!.runs.push({ t: '', ic: el.dataset.icon });
      return;
    }
    if (el.dataset.fn !== undefined) {
      if (!cur) open('p');
      cur!.runs.push({ t: '', fn: el.dataset.fn });
      return;
    }
    if (tag === 'BR') {
      if (!cur) open('p');
      cur!.runs.push({ t: '\n', ...m });
      return;
    }
    if (tag === 'IMG') {
      close();
      const src = el.getAttribute('src') ?? '';
      if (/^https?:/.test(src)) blocks.push({ k: 'img', alt: el.getAttribute('alt') ?? '', url: src });
      return;
    }
    if (tag === 'HR') {
      close();
      blocks.push({ k: 'hr' });
      return;
    }
    if (tag === 'TABLE') {
      close();
      const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()));
      if (rows.length) {
        const cols: Column[] = rows[0].map((h) => column(h));
        blocks.push({ k: 'table', cols, rows: rows.slice(1).map((r) => cols.map((_, i) => r[i] ?? '')) });
      }
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      close();
      lists.push({ ord: tag === 'OL' });
      for (const c of el.childNodes) {
        if (c.nodeType === Node.ELEMENT_NODE && (c as Element).tagName === 'LI') {
          close();
          open('li');
          for (const cc of c.childNodes) walk(cc, {});
          close();
        } else walk(c, {});
      }
      lists.pop();
      close();
      return;
    }
    const next: Marks = { ...m };
    const st = el.style;
    // A tag can say bold while its style says otherwise: Google Docs wraps all it copies in <b style="font-weight:normal">.
    const weight = st.fontWeight === 'bold' ? 700 : st.fontWeight === 'normal' ? 400 : parseInt(st.fontWeight);
    if (((tag === 'B' || tag === 'STRONG') && !(weight < 600)) || weight >= 600) next.b = true;
    if (tag === 'I' || tag === 'EM' || st.fontStyle === 'italic') next.i = true;
    if (tag === 'U' || st.textDecoration.includes('underline')) next.u = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || st.textDecoration.includes('line-through')) next.s = true;
    if (tag === 'MARK' || (st.backgroundColor && !['transparent', 'initial', 'inherit', 'white', 'rgb(255, 255, 255)', '#ffffff', '#fff'].includes(st.backgroundColor))) next.h = true;
    if (tag === 'A') {
      // Words linked somewhere are a link; an address showing itself is only the address.
      const href = el.getAttribute('href') ?? '';
      const words = (el.textContent ?? '').trim();
      if (linkable(href) && words !== href && words !== href.replace(/^mailto:/, '')) next.href = linkTarget(href);
      else delete next.href;
    }
    if (BLOCK_TAGS.has(tag)) {
      close();
      const h = /^H([1-6])$/.exec(tag);
      if (h) open('h', { level: Number(h[1]) });
      else if (tag === 'BLOCKQUOTE') open('quote');
      else if (tag === 'LI') open('li');
      else open('p');
      const wasPre = pre;
      if (tag === 'PRE') pre = true;
      for (const c of el.childNodes) walk(c, next);
      pre = wasPre;
      close();
      return;
    }
    for (const c of el.childNodes) walk(c, next);
  };
  for (const c of root.childNodes) walk(c, {});
  close();
  return blocks;
}

/* ---------- the paste pipeline ---------- */

/** What a paste becomes: blocks to put in, or words. */
export type Pasted = { blocks: Block[] } | { runs: Run[] };

const TLO_LINK = /^https?:\/\/\S+#\/v\d+\/[a-z][a-z0-9-]*(?:\.[A-Za-z0-9.]+)?\/\S+$/;

/** A TinyLittleOffice link as the fence that holds its document, or null when the link is not one, or cannot be read. */
export function linkToFence(url: string): Block | null {
  if (!TLO_LINK.test(url)) return null;
  const { app, payload } = parseHash(url.slice(url.indexOf('#')));
  if (!app || !payload) return null;
  const text = decodeDoc(payload);
  return text ? refFence(`${app}\n${text}`) : null;
}

/** Blocks fitted to an editor's shape: lines keeps items and paragraphs; a line takes the words alone, lines joined by spaces. */
export function fitBlocks(blocks: Block[], shape: Shape): Pasted {
  if (shape === 'doc') return { blocks };
  const words = blocks.filter(isText);
  if (shape === 'lines') return { blocks: words.map((b): Block => (b.k === 'li' || b.k === 'p' ? b : { k: 'p', runs: b.runs })) };
  const runs: Run[] = [];
  words.forEach((b, i) => {
    if (i) runs.push({ t: ' ' });
    runs.push(...b.runs.map((r) => (isAtomic(r) || !r.t.includes('\n') ? r : { ...r, t: r.t.replace(/\n/g, ' ') })));
  });
  return { runs: normalRuns(runs) };
}

/** What a paste's data becomes, by the rules at the top of this file. Null when there is nothing to paste. */
export function pasteFrom(data: { text: string; html: string }, shape: Shape): Pasted | null {
  const text = data.text.replace(/\r\n?/g, '\n');
  const html = data.html;
  if (html.includes(MARKER)) return fitBlocks(parse(text).blocks, shape);
  const trimmed = text.trim();
  if (shape === 'doc' && !/\s/.test(trimmed)) {
    const fence = linkToFence(trimmed);
    if (fence) return { blocks: [fence] };
    if (/^https?:\/\/\S+$/.test(trimmed)) return { blocks: [{ k: 'p', runs: [{ t: trimmed }] }] };
  }
  if (html.trim()) {
    const blocks = htmlToBlocks(html);
    if (blocks.length) return fitBlocks(blocks, shape);
  }
  if (!text) return null;
  if (text.includes('\n')) return fitBlocks(parse(text).blocks, shape);
  return { runs: [{ t: text }] };
}
