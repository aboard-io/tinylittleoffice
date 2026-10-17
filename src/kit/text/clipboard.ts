/**
 * The editor's clipboard. Copy and cut write the selected blocks as the words
 * a person reads (text/plain: no mark in them, an item with its marker, a
 * table's cells by tabs) and as HTML with a generator marker (text/html) that
 * carries the exact TLO in a meta, so a paste into another Tiny Little Office
 * document comes back whole, a paste into a rich editor arrives with its marks,
 * and a paste into a text field, a chat or a search box gets the words alone
 * (Paul, 2026-10-13: an address marked as code came over with its backticks,
 * and a linked item as "- [`words`](address)"). Paste reads, in order: our own HTML
 * (the marker) → the TLO it carries, or for words from within one block their exact
 * runs; a Tiny Little Office link alone → a fence holding that document;
 * any other web address is words, as typed; HTML from elsewhere → blocks (tags and styles to marks, lists to items from
 * Google Docs, Word, Apple Notes, Notion and Slack, Docs'
 * bold-that-is-not); plain text → read as TLO, a bullet glyph as an item,
 * one line too (pasted Markdown becomes headings, lists and marks); words
 * with no syntax → those words. What comes back is fitted to the editor's
 * shape and what it can show: lines keeps items and paragraphs only; a
 * line takes the words alone; a table, a connection or a fence
 * of no app's is words where it cannot be shown. Words that look like
 * syntax stay words: the TLO writer escapes them.
 */
import { column, isAtomic, isText, linkable, linkTarget, normalRuns, parse, plainText, refFence, runLength, sliceRuns, write, type Block, type Column, type Run } from '../../doc/index.ts';
import { lineEnd } from '../../doc/ops.ts';
import { lookup } from '../core/app.ts';
import { decodeDoc } from '../core/codec.ts';
import { parseHash, routeHash } from '../core/route.ts';
import { LOCKED_LANG, lockedFence, lockedOf } from '../share/locked.ts';
import { MARKS, sayableBlock, sliceBlocks, type Sel, type Shape } from './textops.ts';

/** The mark our own HTML carries. */
export const GENERATOR = 'TinyLittleOffice';
const MARKER = `<meta name="generator" content="${GENERATOR}">`;
/** The meta our HTML carries the exact TLO of what was copied in, for our own paste: text/plain holds the words alone. */
const TLO = 'tlo';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unesc = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

/** A run's words as a person reads them: the marks dropped, a footnote's note in parentheses, an icon left out. */
const plainRun = (r: Run): string => (r.ic ? '' : r.fn !== undefined ? ` (${r.fn})` : r.t);
/** Runs as the words alone. */
const plainRuns = (runs: Run[]): string => runs.map(plainRun).join('');
const ARROW: Record<string, string> = { '->': '→', '<-': '←', '<->': '↔', '--': '–' };

/**
 * Blocks as text/plain holds them: what a person pasting into a text field, a chat or a search box expects. A
 * heading's, a paragraph's and a note's words alone; an item with its depth, its marker (numbered as it is) and its
 * box; a table's cells by tabs, a line a row; a fence's body; a connection as words with an arrow; a rule as "---".
 * Items follow one another a line each; anything else has a blank line before it; the last line ends, as lines
 * do. The exact document rides in our HTML (docToHtml), so none of this is read back by our own paste.
 */
export function plainOf(blocks: Block[]): string {
  const out: string[] = [];
  const counts: number[] = [];
  let prevItem = false;
  for (const b of blocks) {
    const item = b.k === 'li';
    if (out.length) out.push(item && prevItem ? '\n' : '\n\n');
    if (!item) counts.length = 0;
    switch (b.k) {
      case 'h':
      case 'p':
      case 'quote':
        out.push(plainRuns(b.runs));
        break;
      case 'li': {
        counts.length = b.depth + 1;
        counts[b.depth] = b.ord && prevItem ? (counts[b.depth] ?? 0) + 1 : 1;
        out.push(`${'  '.repeat(b.depth)}${b.ord ? `${counts[b.depth]}. ` : '- '}${b.done === undefined ? '' : b.done ? '[x] ' : '[ ] '}${plainRuns(b.runs)}`);
        break;
      }
      case 'hr':
        out.push('---');
        break;
      case 'table':
        out.push([b.cols.map((c) => c.name), ...b.rows].map((r) => r.join('\t')).join('\n'));
        break;
      case 'fence':
        out.push(b.body.replace(/\n$/, ''));
        break;
      case 'edge':
        out.push(`${b.from} ${ARROW[b.dir] ?? '→'} ${b.to}${b.label ? `: ${b.label}` : ''}`);
        break;
    }
    prevItem = item;
  }
  return out.length ? out.join('') + '\n' : '';
}

/** The exact TLO our HTML carries, or null for HTML that is not ours or is from before it carried one. */
function ownTlo(html: string): string | null {
  const m = html.includes(MARKER) ? html.match(new RegExp(`<meta name="${TLO}" content="([^"]*)">`)) : null;
  return m ? unesc(m[1]) : null;
}

/** What a paste reads as TLO: our own copy exactly as it was, else the text as it came. */
export const clipText = (data: { text: string; html: string }): string => ownTlo(data.html) ?? data.text;

/** Runs as HTML: marks nested, an icon and a footnote as their own elements, a line break as <br>. */
export function runsToHtml(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.ic) return `<span data-icon="${esc(r.ic)}">:${esc(r.ic)}:</span>`;
      if (r.fn !== undefined) return `<sup data-fn="${esc(r.fn)}">*</sup>`;
      let s = esc(r.t).replace(/\n/g, '<br>');
      if (r.c) s = `<code>${s}</code>`;
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

/** Blocks as HTML, our marker first and the exact TLO in a meta after it: what the clipboard's text/html holds. */
export function docToHtml(blocks: Block[]): string {
  const out: string[] = [MARKER, `<meta name="${TLO}" content="${esc(write({ head: {}, blocks }))}">`];
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
        // (A list of the other kind at this depth ends here: an ordered item after a bulleted one starts its own list.)
        closeLists(list[b.depth] && list[b.depth].ord !== !!b.ord ? b.depth : b.depth + 1);
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
    }
  }
  closeLists(0);
  return out.join('\n');
}

/**
 * What copy puts on the clipboard for a selection: the words alone (plainOf; words from within one block exactly,
 * the spaces at their ends and all, with no line break after), and our HTML, which carries the exact TLO. Words
 * from within one block carry their runs exactly as well, in a meta of our HTML, marks and all.
 */
export function copyData(blocks: Block[], sel: Sel): { text: string; html: string } {
  const picked = sliceBlocks(blocks, sel);
  const one = picked.length === 1 && isText(picked[0]) ? picked[0] : null;
  const html = docToHtml(picked);
  return { text: one ? plainRuns(one.runs) : plainOf(picked), html: one ? html.replace(MARKER, `${MARKER}\n<meta name="${RUNS}" content="${esc(JSON.stringify(one.runs))}">`) : html };
}

/** What the clipboard holds or is to hold: the words (our TLO), and the HTML (ours carries the marker). */
export interface Clip {
  text: string;
  html: string;
}

/**
 * A copy put on the system clipboard as a page may put it, from a button rather than the keys (a phone's Copy, a
 * card's): the TLO and our HTML together, the words alone where the browser takes no HTML. False where it refuses.
 */
export async function writeClip(c: Clip): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([c.text], { type: 'text/plain' }), 'text/html': new Blob([c.html], { type: 'text/html' }) })]);
    return true;
  } catch {
    try {
      await navigator.clipboard.writeText(c.text);
      return true;
    } catch {
      return false;
    }
  }
}
/** The system clipboard read as a page may read it, for a Paste button: its words and its HTML; null where the browser refuses (then only the keyboard's paste reaches it). */
export async function readClip(): Promise<Clip | null> {
  try {
    const items = await navigator.clipboard.read();
    const got: Clip = { text: '', html: '' };
    for (const item of items) {
      if (!got.html && item.types.includes('text/html')) got.html = await (await item.getType('text/html')).text();
      if (!got.text && item.types.includes('text/plain')) got.text = await (await item.getType('text/plain')).text();
    }
    return { text: got.text.replace(/\r\n?/g, '\n'), html: got.html };
  } catch {
    try {
      return { text: (await navigator.clipboard.readText()).replace(/\r\n?/g, '\n'), html: '' };
    } catch {
      return null;
    }
  }
}

/** The meta our HTML carries the exact runs of a fragment in. */
const RUNS = 'tlo-runs';

/** The exact runs our HTML carries for words from within one block, or null: only words and marks are taken from it. */
function carriedRuns(html: string): Run[] | null {
  if (!html.includes(`name="${RUNS}"`)) return null;
  const meta = new DOMParser().parseFromString(html, 'text/html').querySelector(`meta[name="${RUNS}"]`);
  try {
    const got: unknown = JSON.parse(meta?.getAttribute('content') ?? '');
    if (!Array.isArray(got)) return null;
    const runs: Run[] = [];
    for (const r of got as Record<string, unknown>[]) {
      if (!r || typeof r.t !== 'string') return null;
      const run: Run = { t: r.t };
      for (const k of MARKS) if (r[k] === true) run[k] = true;
      if (typeof r.href === 'string' && r.href) run.href = r.href;
      if (typeof r.ic === 'string' && r.ic) run.ic = r.ic;
      if (typeof r.fn === 'string') run.fn = r.fn;
      runs.push(run);
    }
    return normalRuns(runs);
  } catch {
    return null;
  }
}

/* ---------- HTML from elsewhere ---------- */

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'LI',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'PRE',
  'TABLE',
  'HR',
  'IMG',
  'SECTION',
  'ARTICLE',
  'HEADER',
  'FOOTER',
  'MAIN',
  'ASIDE',
  'NAV',
  'FIGURE',
  'DL',
  'DT',
  'DD',
  'TR',
  'ADDRESS',
]);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'META', 'LINK', 'TITLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'svg', 'BUTTON', 'SELECT', 'INPUT', 'TEXTAREA', 'HEAD']);

type Marks = Partial<Pick<Run, 'b' | 'i' | 'u' | 's' | 'h' | 'c' | 'href'>>;

/** The glyphs a list item is drawn with where it is written as words (Word, Mail, TextEdit, a bullet typed by hand). */
const BULLET = /^[ \t]*[•◦▪▫‣⁃●○■□·–—][ \t ]+/;
/** What the clipboard carries that is no one's words: a zero-width space, a byte-order mark, a word joiner. */
const INVISIBLE = /[​﻿⁠]/g;
/** Backgrounds that are no highlight: none, or white. */
const NO_BACKGROUND = /^(?:|transparent|initial|inherit|unset|none|white|#fff(?:fff)?|rgb\(255, 255, 255\)|rgba\(\d+, \d+, \d+, 0\))$/;

/**
 * HTML from anywhere as blocks: tags and styles to marks, lists to items
 * with their depth, headings by level (by tag, or role="heading"), tables
 * as such, a picture as words that link to it (its description, else its address: nothing is fetched). Spaces collapse as a browser shows them; a <br> is a
 * line break. What other editors put around a list item is read as one:
 * Google Docs' <p> inside each <li> (paragraphs inside an item are its
 * lines), Word's list paragraphs (`mso-list: … level2`, the glyph in a
 * `mso-list:Ignore` span dropped), Slack's flat lists that say their depth
 * (`data-stringify-indent`), and a paragraph that opens with a bullet glyph
 * (Mail, TextEdit). Links are kept for http(s), mailto and tel only.
 * Words come as the format keeps them, with `kept` false as they were marked.
 */
export function htmlToBlocks(html: string, kept = true): Block[] {
  const root = new DOMParser().parseFromString(html, 'text/html').body;
  const blocks: Block[] = [];
  type Cur = { k: 'p' | 'li' | 'h' | 'quote'; level?: number; depth?: number; ord?: true; runs: Run[] };
  let cur: Cur | null = null;
  const lists: { ord: boolean }[] = [];
  let pre = false;
  /** Inside an item's element: words and the blocks within it are that item's (until a list inside it ends it). */
  let inItem = false;

  const open = (k: Cur['k'], extra: Partial<Cur> = {}) => {
    if (k === 'li') cur = { k, depth: Math.min(3, Math.max(0, lists.length - 1)), ...(lists[lists.length - 1]?.ord ? { ord: true } : {}), runs: [], ...extra };
    else cur = { k, ...extra, runs: [] };
  };
  const ensure = () => {
    if (!cur) open(inItem && lists.length ? 'li' : 'p');
    return cur!;
  };
  const close = () => {
    if (!cur) return;
    const c: Cur = cur;
    cur = null;
    // Spaces at either end of a block, and beside a line break, are the markup's, not the words'.
    let runs = normalRuns(c.runs.map((r) => (isAtomic(r) || pre ? r : { ...r, t: r.t.replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n') })));
    if (runs.length) {
      runs[0] = { ...runs[0], t: runs[0].t.replace(/^[ \n]+/, '') };
      const last = runs.length - 1;
      runs[last] = { ...runs[last], t: runs[last].t.replace(/[ \n]+$/, '') };
    }
    runs = normalRuns(runs);
    // A paragraph that opens with a bullet glyph is an item (Mail, TextEdit, Word saved as plain HTML).
    if (c.k === 'p' && runs[0] && !isAtomic(runs[0]) && BULLET.test(runs[0].t)) {
      runs = normalRuns([{ ...runs[0], t: runs[0].t.replace(BULLET, '') }, ...runs.slice(1)]);
      c.k = 'li';
      c.depth = 0;
    }
    if (!runs.length) return;
    if (c.k === 'h') {
      // A heading is one line (docs/kernel.md §2): the lines after a <br> in one are a paragraph after it.
      const nl = lineEnd(runs);
      blocks.push({ k: 'h', level: (c.level ?? 2) as 1 | 2 | 3 | 4 | 5 | 6, runs: nl < 0 ? runs : sliceRuns(runs, 0, nl) });
      if (nl >= 0) blocks.push({ k: 'p', runs: sliceRuns(runs, nl + 1, runLength(runs)) });
    } else if (c.k === 'li') blocks.push({ k: 'li', depth: c.depth ?? 0, ...(c.ord ? { ord: true } : {}), runs });
    else blocks.push({ k: c.k, runs });
  };
  const addText = (raw: string, m: Marks) => {
    const t = (pre ? raw : raw.replace(/[ \t\r\n ]+/g, ' ')).replace(INVISIBLE, '');
    if (!t) return;
    const c = ensure();
    const run: Run = { t, ...m };
    // A heading is bold through and through, so bold inside one says nothing.
    if (c.k === 'h') delete run.b;
    c.runs.push(run);
  };
  /** Word's list paragraph: its level, and whether its glyph is a number. */
  const wordItem = (el: HTMLElement): { depth: number; ord: boolean } | null => {
    const m = /mso-list:\s*l\d+\s+level(\d)/i.exec(el.getAttribute('style') ?? '');
    if (!m && !/MsoListParagraph/.test(el.className)) return null;
    const glyph = (el.querySelector('[style*="mso-list:Ignore" i], [style*="mso-list: Ignore" i]')?.textContent ?? '').replace(/[\s ]+/g, '');
    return { depth: Math.min(3, Number(m?.[1] ?? 1) - 1), ord: /^(?:\d+|[a-z]|[ivxlc]+)[.)]$/i.test(glyph) };
  };

  const walk = (node: Node, m: Marks) => {
    if (node.nodeType === Node.TEXT_NODE) return addText(node.textContent ?? '', m);
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (SKIP_TAGS.has(tag)) return;
    // Word's list glyph and the spaces after it: drawn, not written.
    if (/mso-list:\s*Ignore/i.test(el.getAttribute('style') ?? '')) return;
    if (el.dataset.icon) {
      ensure().runs.push({ t: '', ic: el.dataset.icon });
      return;
    }
    if (el.dataset.fn !== undefined) {
      ensure().runs.push({ t: '', fn: el.dataset.fn });
      return;
    }
    if (tag === 'BR') {
      ensure().runs.push({ t: '\n', ...m });
      return;
    }
    if (tag === 'IMG') {
      const src = el.getAttribute('src') ?? '';
      if (/^https?:/.test(src)) ensure().runs.push({ t: el.getAttribute('alt')?.trim() || src, ...m, href: src });
      return;
    }
    if (tag === 'HR') {
      close();
      blocks.push({ k: 'hr' });
      return;
    }
    if (tag === 'TABLE') {
      close();
      const rows = [...el.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => (c.textContent ?? '').replace(INVISIBLE, '').replace(/\s+/g, ' ').trim()));
      if (rows.length) {
        const cols: Column[] = rows[0].map((h) => column(h));
        blocks.push({ k: 'table', cols, rows: rows.slice(1).map((r) => cols.map((_, i) => r[i] ?? '')) });
      }
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      close();
      // Slack writes each depth as a list of its own, beside the others: its data-indent says how deep.
      const flat = Number(el.dataset.indent ?? 0) || 0;
      const outer = lists.length;
      for (let i = 0; i <= flat; i++) lists.push({ ord: tag === 'OL' });
      const wasItem = inItem;
      for (const c of el.childNodes) {
        if (c.nodeType === Node.ELEMENT_NODE && (c as Element).tagName === 'LI') {
          close();
          open('li');
          inItem = true;
          for (const cc of c.childNodes) walk(cc, {});
          close();
          inItem = false;
        } else walk(c, {});
      }
      inItem = wasItem;
      lists.length = outer;
      close();
      return;
    }
    const next: Marks = { ...m };
    const st = el.style;
    const inline = !BLOCK_TAGS.has(tag);
    // A tag can say bold while its style says otherwise: Google Docs wraps all it copies in <b style="font-weight:normal">.
    const weight = st.fontWeight === 'bold' ? 700 : st.fontWeight === 'normal' ? 400 : parseInt(st.fontWeight);
    if (((tag === 'B' || tag === 'STRONG') && !(weight < 600)) || weight >= 600) next.b = true;
    else if (weight < 600) delete next.b;
    if (tag === 'I' || tag === 'EM' || st.fontStyle === 'italic') next.i = true;
    // A link is drawn underlined already: the underline its words carry (Google Docs') is the link's.
    if (tag === 'U' || (st.textDecoration.includes('underline') && !m.href)) next.u = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || st.textDecoration.includes('line-through')) next.s = true;
    // A background on words is a highlight; on a block it is the page's.
    if (tag === 'MARK' || (inline && !NO_BACKGROUND.test(st.backgroundColor))) next.h = true;
    // Code in the words; a block of it (<pre>) is not a mark (there are no code blocks).
    if (tag === 'CODE' && !el.closest('pre')) next.c = true;
    if (tag === 'A') {
      // Words linked somewhere are a link; an address showing itself is only the address.
      const href = (el.getAttribute('href') ?? '').trim();
      const words = (el.textContent ?? '').trim();
      if (/^(?:https?:|mailto:|tel:)/i.test(href) && linkable(href) && words !== href && words !== href.replace(/^mailto:/, '')) next.href = linkTarget(href);
      else delete next.href;
    }
    const word = tag === 'P' ? wordItem(el) : null;
    const role = el.getAttribute('role') === 'heading' ? Math.min(6, Math.max(1, Number(el.getAttribute('aria-level')) || 2)) : 0;
    if (word) {
      close();
      open('li', { depth: word.depth, ...(word.ord ? { ord: true as const } : {}) });
      for (const c of el.childNodes) walk(c, next);
      close();
      return;
    }
    if (BLOCK_TAGS.has(tag) || role) {
      // A paragraph inside an item is a line of that item, not a block of its own.
      if (inItem && cur && (cur as Cur).k === 'li' && tag !== 'LI') {
        const c = cur as Cur;
        if (c.runs.some((r) => isAtomic(r) || r.t.trim())) c.runs.push({ t: '\n' });
        const wasPre = pre;
        if (tag === 'PRE') pre = true;
        for (const ch of el.childNodes) walk(ch, next);
        pre = wasPre;
        return;
      }
      close();
      const h = /^H([1-6])$/.exec(tag);
      if (h || role) open('h', { level: h ? Number(h[1]) : role });
      else if (tag === 'BLOCKQUOTE') open('quote');
      else if (tag === 'LI') open('li');
      else open(inItem && lists.length ? 'li' : 'p');
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
  // An item is at most one deeper than the item before it, and an item after words begins at the margin: the depth
  // the text can say (a list copied from the middle of another starts deep).
  // A mark on the spaces at a block's ends, "<b>a </b>b", is let go of there, as the format writes it (sayableRuns),
  // unless the blocks go where an editor keeps its words so (`kept` false: words put into a block take its marks' edges).
  let depth = -1;
  return blocks.map((b) => {
    if (kept) b = sayableBlock(b);
    if (b.k !== 'li') return ((depth = -1), b);
    const d = Math.min(b.depth, depth + 1);
    depth = d;
    return d === b.depth ? b : { ...b, depth: d };
  });
}

/* ---------- the paste pipeline ---------- */

/** What a paste becomes: blocks to put in, or words. */
export type Pasted = { blocks: Block[] } | { runs: Run[] };

const TLO_LINK = /^https?:\/\/\S+#\/v\d+\/[a-z][a-z0-9-]*(?:\.[A-Za-z0-9.]+)?\/\S+$/;

/** A Tiny Little Office link as the fence that holds its document (a locked one by its link, kit/share/locked.ts), or null when the link is not one, or cannot be read. */
export function linkToFence(url: string): Block | null {
  if (!TLO_LINK.test(url)) return null;
  const { app, payload, sealed } = parseHash(url.slice(url.indexOf('#')));
  if (!app || !payload) return null;
  if (sealed) return lockedOf(routeHash(app, payload)) ? lockedFence(app, payload) : null;
  const text = decodeDoc(payload);
  return text ? refFence(`${app}\n${text}`) : null;
}

/** Lines of plain text with a bullet glyph at their start ("• one", "◦ two" under it) as Markdown's items, their indent kept. */
const bulletsToItems = (text: string): string => text.replace(/^([ \t]*)[•◦▪▫‣⁃●○■□·–—][ \t ]+/gm, '$1- ');

/** A fence of an app this editor can show (or a locked document): anything else in a fence is words. */
const appFence = (b: Block) => b.k === 'fence' && (b.lang === LOCKED_LANG || !!lookup.appOf(b.lang));

/**
 * What is not words, as the words it holds, where the host cannot show it: a table as its rows (tab between the
 * cells), a connection as its ends, a code fence as its lines; a page break, and
 * another document, are nothing there. `doc` hosts show all of them but a connection and a fence of no app's.
 */
function asWords(b: Block, shape: Shape): Block[] {
  const p = (t: string): Block[] => (t.trim() ? [{ k: 'p', runs: [{ t }] }] : []);
  switch (b.k) {
    case 'edge':
      return p(`${b.from} ${b.dir === '--' ? '–' : b.dir === '<->' ? '↔' : b.dir === '<-' ? '←' : '→'} ${b.to}${b.label ? `: ${b.label}` : ''}`);
    case 'fence':
      return appFence(b) ? (shape === 'doc' ? [b] : []) : p(b.body);
    case 'table':
      return shape === 'doc' ? [b] : [b.cols.map((c) => c.name), ...b.rows].flatMap((r) => p(r.join('\t')));
    case 'hr':
      return shape === 'doc' ? [b] : [];
    default:
      return [b];
  }
}

/**
 * Blocks fitted to an editor's shape: lines keeps items and paragraphs; a line takes the words alone, lines joined
 * by spaces. What the host cannot show becomes words first (asWords); in a document, only for a paste from
 * elsewhere (`foreign`): our own copy pastes back as it was. A block comes as the format keeps it (sayableBlock: no mark
 * on a space at its edge), whole blocks being what a host may put in as they are; words alone go where the editor
 * keeps them so, and so do blocks with `kept` false: the editor's paste, whose first and last blocks' words join the
 * words where they go, settled there with them (an underlined "a " pasted before an underlined word is one underline).
 */
export function fitBlocks(blocks: Block[], shape: Shape, foreign = false, kept = true): Pasted {
  const said = kept ? sayableBlock : <B extends Block>(b: B): B => b;
  if (shape === 'doc') return { blocks: (foreign ? blocks.flatMap((b) => asWords(b, shape)) : blocks).map(said) };
  const words = blocks.flatMap((b) => asWords(b, shape)).filter(isText);
  if (shape === 'lines') return { blocks: words.map((b): Block => said(b.k === 'li' || b.k === 'p' ? b : { k: 'p', runs: b.runs })) };
  const runs: Run[] = [];
  words.forEach((b, i) => {
    if (i) runs.push({ t: ' ' });
    runs.push(...b.runs.map((r) => (isAtomic(r) || !r.t.includes('\n') ? r : { ...r, t: r.t.replace(/\n/g, ' ') })));
  });
  return { runs: normalRuns(runs) };
}

/**
 * Pasted plain text as blocks: Markdown, but a ":name:" inside other words ("a:b:c", "x:y:") is those words; only
 * one standing apart, as a person types an icon or an emoji's short name, is an icon.
 */
function readPlain(md: string): Block[] {
  const apart = (runs: Run[], i: number) => {
    const before = runs[i - 1];
    const after = runs[i + 1];
    return (!before || isAtomic(before) || /\s$/.test(before.t)) && (!after || isAtomic(after) || /^[\s.,;:!?)]/.test(after.t));
  };
  const words = (runs: Run[]) => normalRuns(runs.map((r, i) => (r.ic && !apart(runs, i) ? { t: `:${r.ic}:` } : r)));
  return parse(md).blocks.map((b) => ('runs' in b && b.runs.some((r) => r.ic) ? { ...b, runs: words(b.runs) } : b));
}

/**
 * What a paste's data becomes, by the rules at the top of this file. Null when there is nothing to paste. With `kept`
 * false (the editor's own paste, which settles what it makes) the words keep the marks on their edge spaces (fitBlocks).
 */
export function pasteFrom(data: { text: string; html: string }, shape: Shape, kept = true): Pasted | null {
  const text = data.text.replace(/\r\n?/g, '\n');
  const html = data.html;
  if (html.includes(MARKER)) {
    const blocks = parse(clipText({ text, html })).blocks;
    // Words from within one block: their own runs, spaces at the ends and all.
    const runs = blocks.length <= 1 ? carriedRuns(html) : null;
    if (runs) return fitBlocks([{ ...(blocks[0] && isText(blocks[0]) ? blocks[0] : { k: 'p' as const }), runs }], shape, false, kept);
    return fitBlocks(blocks, shape, false, kept);
  }
  const trimmed = text.trim();
  if (shape === 'doc' && !/\s/.test(trimmed)) {
    const fence = linkToFence(trimmed);
    if (fence) return { blocks: [fence] };
  }
  if (html.trim()) {
    const blocks = htmlToBlocks(html, kept);
    if (blocks.length) return fitBlocks(blocks, shape, true, kept);
  }
  const plain = text.replace(INVISIBLE, '');
  if (!plain) return null;
  const md = bulletsToItems(plain);
  if (plain.includes('\n')) return fitBlocks(readPlain(md), shape, true, kept);
  // One line is read as Markdown too: "• one" is an item, "# Title" a heading, "**bold**" bold. Words that hold no
  // syntax stay exactly as they were, spaces and all (and "2026. A year" is a year, not an item numbered 2026).
  const [b, ...more] = readPlain(md);
  if (!b || more.length) return { runs: [{ t: plain }] };
  if ((b.k === 'li' || b.k === 'h') && b.runs.length && !(b.k === 'li' && b.ord && !/^\s*\d{1,3}[.)]/.test(md))) return fitBlocks([b], shape, true, kept);
  if (b.k === 'p' && plainText(b.runs) !== plain.trim()) return { runs: b.runs };
  return { runs: [{ t: plain }] };
}

const plainly = new WeakSet<Document>();
/**
 * A copy our editors did not take (the reader's pages, a slide's words, anything drawn rather than edited) is the
 * browser's own, and the browser writes what it sees: the words with the colours they were drawn in, so a copy from a
 * midnight slide pasted into Google Docs is white on white (Paul, 2026-10-11: "you're giving me white text"). Taken
 * here instead, after every editor's handler has had its say: the words as text, and as paragraphs with no colour,
 * no style and no font, one per line of what was selected.
 */
export function installPlainCopy(root: Document = document) {
  if (plainly.has(root)) return;
  plainly.add(root);
  // For the instant of a copy or a cut the page is light: iOS Safari puts its own rendering of the selection on the
  // pasteboard beside the HTML a page gives it, with the colours as drawn, and an app that prefers that rendering
  // (Google Docs) pastes a dark theme's words white on white (Paul, 2026-10-11: "It's when we're in dark mode").
  // kit.css: `:root[data-copying]` makes the page light, and page.css draws the site's words black on white under it;
  // the mark goes before anything is painted.
  for (const type of ['copy', 'cut'])
    root.addEventListener(
      type,
      () => {
        root.documentElement.setAttribute('data-copying', '');
        // WebKit serialises the selection with the styles it last computed: a read forces them computed now, under the mark.
        void getComputedStyle(root.documentElement).color;
        void root.body?.offsetHeight;
        setTimeout(() => root.documentElement.removeAttribute('data-copying'), 0);
      },
      true,
    );
  root.addEventListener('copy', (e) => {
    if (e.defaultPrevented || !e.clipboardData) return;
    const sel = root.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const at = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
    // A box the person types in copies as the browser does: its own handler, or the browser's plain text.
    if (at?.closest('input, textarea, [contenteditable="true"], [contenteditable=""]')) return;
    const text = sel.toString();
    if (!text.trim()) return;
    e.preventDefault();
    e.clipboardData.setData('text/plain', text);
    e.clipboardData.setData(
      'text/html',
      text
        .split(/\r?\n/)
        .filter((l) => l.trim())
        .map((l) => `<p>${esc(l)}</p>`)
        .join('\n'),
    );
  });
}
