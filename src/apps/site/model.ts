/**
 * A website as a view of the kernel's document (docs/kernel.md §1, "site, links"): the first `# Name` is
 * the site's name over the home page; each further `#` heading starts another page (a `---` before it is
 * welcome); `##` is a section of a page. In a section: paragraphs (inline Markdown), `- :icon: Head |
 * detail` cards, `> :icon: Label | url` buttons (a line each), a picture (`![alt](url)`, or a paragraph that
 * is a picture's address), `:icon:` alone as a big icon, a table `Name | Price:money | About | Image` the
 * products of a shop with one cart for the site, another document (a fence) or a thing from the web (its
 * address alone). The head holds `theme:`, `currency:` and `orders:` (where orders go); `look: links` makes
 * it a Quick Links page: one column, the buttons stacked, and the list items small links at the foot.
 *
 * Every command is a list of the kernel's ops: a part moved is one `move`, removed one `splice`, a thing
 * added one `splice` (a product one `rows`), the look a `head`. (Ported from the old tree's
 * lib/sitemodel.ts and links.def.ts; its lines form and row numbers are gone, the blocks are the rows.)
 */
import { apply, columnsOf, evaluate, isAtomic, parse, plainText, runLength, sliceRuns, text, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { slug } from '../../kit/draw.ts';
import { embedOf } from '../../kit/embeds.ts';
import { t } from '../../kit/i18n.ts';
import { parseTheme, themeWords, type Theme } from './theme.ts';

export interface Link {
  icon: string;
  label: string;
  url: string;
}
export interface Card {
  icon: string;
  head: Run[];
  detail: Run[];
}
export interface Product {
  name: string;
  price: number;
  about: string;
  image: string;
}
/** Another document (a fence: its app and its text) or a thing from the web (its address). */
export type Embed = { lang: string; body: string } | { web: string };

export interface Section {
  /** Its place among all the site's sections, the home page's front first. */
  n: number;
  /** The page it is on. */
  page: number;
  /** Its heading's words: a page's title for a page's front (the site's name for the home page's). */
  title: string;
  /** Its heading block, -1 for none (a home page with no name). */
  at: number;
  /** Its blocks, [from, to): the heading and everything up to the next heading. */
  from: number;
  to: number;
  id: string;
  text: Run[][];
  cards: Card[];
  buttons: Link[];
  socials: Link[];
  pics: { url: string; alt: string }[];
  icon: string;
  embeds: Embed[];
  /** The products table's block, -1 for none. */
  shop: number;
  products: Product[];
}

export interface Page {
  title: string;
  at: number;
  from: number;
  to: number;
  id: string;
  sections: Section[];
}

export interface Site {
  name: string;
  theme: Theme;
  currency: string;
  orders: string;
  /** A Quick Links page: one column, buttons stacked, list items small links. */
  links: boolean;
  /** The home page first. */
  pages: Page[];
  /** Every section in order, the same objects as the pages hold. */
  sections: Section[];
}

/** A paragraph that is only a picture's address. */
export const isPicture = (s: string) => /^https?:\/\/\S+\.(png|jpe?g|gif|webp|svg|avif)(\?\S*)?$/i.test(s);
/** Where a button may go: out to the web, to mail or a phone, or to a page or section of the site. */
export const safeUrl = (url: string) => (/^(https?:|mailto:|tel:|#)/.test(url) ? url : '#');

/* ---------- runs, a line and its fields ---------- */

/** A block's runs as its lines (split at '\n'; marks never cross one). */
export function linesOf(runs: Run[]): Run[][] {
  const out: Run[][] = [[]];
  for (const r of runs) {
    if (isAtomic(r)) {
      out[out.length - 1].push(r);
      continue;
    }
    r.t.split('\n').forEach((part, i) => {
      if (i) out.push([]);
      if (part) out[out.length - 1].push({ ...r, t: part });
    });
  }
  return out;
}
/** The words of runs with each atomic run as one character, so offsets agree with the kernel's. */
const chars = (runs: Run[]) => runs.map((r) => (isAtomic(r) ? '￼' : r.t)).join('');
/** Runs with the spaces at either end taken off. */
export function trimRuns(runs: Run[]): Run[] {
  const s = chars(runs);
  const from = s.length - s.trimStart().length;
  const to = s.trimEnd().length;
  return from >= to ? [] : sliceRuns(runs, from, to);
}
/** A line cut at its first "|": what is before, and what is after (empty when there is none). */
export function fieldsOf(runs: Run[]): [Run[], Run[]] {
  const at = chars(runs).indexOf('|');
  if (at < 0) return [trimRuns(runs), []];
  return [trimRuns(sliceRuns(runs, 0, at)), trimRuns(sliceRuns(runs, at + 1, runLength(runs)))];
}
/** A leading icon and the rest. */
export function iconOf(runs: Run[]): [string, Run[]] {
  const r = trimRuns(runs);
  return r[0]?.ic ? [r[0].ic, trimRuns(r.slice(1))] : ['', r];
}
const plain = (runs: Run[]) => plainText(runs).trim();
function linkOf(runs: Run[]): Link {
  const [icon, rest] = iconOf(runs);
  const [label, url] = fieldsOf(rest);
  return { icon, label: plain(label), url: safeUrl(plain(url)) };
}

/* ---------- reading ---------- */

const PRODUCT = [/^(name|product|item|thing)$/, /^(price|cost)$/, /^(about|description|details?)$/, /^(image|picture|photo)$/];
/** Whether a table is the products of a shop: it has something to call each thing, and a price. */
export const isShop = (b: Block) => b.k === 'table' && (([n, p]) => n >= 0 && p >= 0)(columnsOf(b, ...PRODUCT));

function section(n: number, page: number, title: string, at: number, from: number): Section {
  return { n, page, title, at, from, to: from, id: '', text: [], cards: [], buttons: [], socials: [], pics: [], icon: '', embeds: [], shop: -1, products: [] };
}

export function readSite(doc: Doc): Site {
  const links = doc.head.look === 'links';
  const site: Site = { name: '', theme: parseTheme(doc.head.theme), currency: doc.head.currency || '$', orders: doc.head.orders ?? '', links, pages: [], sections: [] };
  const page = (title: string, at: number, from: number) => {
    const p: Page = { title, at, from, to: from, id: '', sections: [] };
    site.pages.push(p);
    open(section(site.sections.length, site.pages.length - 1, title, at, from));
  };
  const open = (s: Section) => {
    site.sections.push(s);
    site.pages[site.pages.length - 1].sections.push(s);
  };
  page('', -1, 0);
  let named = false;
  doc.blocks.forEach((b, i) => {
    const cur = site.sections[site.sections.length - 1];
    if (b.k === 'h' && b.level === 1) {
      const words = plain(b.runs);
      // The first is the site's name, over the home page; each after it a page.
      if (!named) {
        named = true;
        site.name = words;
        site.pages[0].at = i;
        if (cur.n === 0) (cur.title = words), (cur.at = i);
      } else page(words, i, i);
    } else if (b.k === 'h') open(section(site.sections.length, site.pages.length - 1, plain(b.runs), i, i));
    else if (b.k === 'p') {
      const words = plain(b.runs);
      const [ic, rest] = iconOf(b.runs);
      if (ic && !rest.length) cur.icon = ic;
      else if (b.runs.length === 1 && isPicture(words)) cur.pics.push({ url: words, alt: '' });
      else if (b.runs.length === 1 && /^https?:\/\/\S+$/.test(words) && embedOf(words)) cur.embeds.push({ web: words });
      else if (words || ic) cur.text.push(...linesOf(b.runs).filter((l) => l.length));
    } else if (b.k === 'quote') for (const l of linesOf(b.runs)) l.length && cur.buttons.push(linkOf(l));
    else if (b.k === 'li') {
      if (links) cur.socials.push(linkOf(b.runs));
      else {
        const [icon, rest] = iconOf(b.runs);
        const [head, detail] = fieldsOf(rest);
        cur.cards.push({ icon, head, detail });
      }
    } else if (b.k === 'img') cur.pics.push({ url: /^https?:\/\//.test(b.url) ? b.url : '', alt: b.alt });
    else if (b.k === 'table') {
      if (isShop(b) && cur.shop < 0) {
        cur.shop = i;
        const [n, p, a, im] = columnsOf(b, ...PRODUCT);
        const values = evaluate(doc, i)?.values ?? [];
        b.rows.forEach((r, k) => {
          const name = (r[n] ?? '').trim();
          if (!name) return;
          const v = values[k]?.[p];
          const price = typeof v === 'number' ? v : parseFloat((r[p] ?? '').replace(/[^0-9.-]/g, '')) || 0;
          const image = (r[im] ?? '').trim();
          cur.products.push({ name, price, about: a >= 0 ? (r[a] ?? '').trim() : '', image: /^https?:\/\//.test(image) ? image : '' });
        });
      } else cur.embeds.push({ lang: 'sheet', body: write({ head: {}, blocks: [b] }).trimEnd() });
    } else if (b.k === 'fence' && b.lang) cur.embeds.push({ lang: b.lang, body: b.body });
  });
  // Spans: a section runs to the next one; a page to the next page.
  site.sections.forEach((s, k) => (s.to = site.sections[k + 1]?.from ?? doc.blocks.length));
  site.pages.forEach((p, k) => (p.to = site.pages[k + 1]?.from ?? doc.blocks.length));
  // Ids: the pages first, then the sections, so "#menu" is the page Menu even when a section is called that too.
  const ids = new Set(['home']);
  const idFor = (title: string, fallback: string) => {
    const base = slug(title) || fallback;
    let id = base;
    for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
    ids.add(id);
    return id;
  };
  site.pages.forEach((p, i) => (p.id = i ? idFor(p.title, `page-${i + 1}`) : 'home'));
  for (const p of site.pages) p.sections.forEach((s, j) => (s.id = j ? idFor(s.title, 'section') : p.id));
  return site;
}

/** The site's name, or the head's title. */
export function titleOf(textDoc: string): string {
  const doc = parse(textDoc);
  return doc.head.title || readSite(doc).name;
}
/** The site renamed: its first `#` heading's words (one put in at the top when there is none). */
export function retitle(textDoc: string, title: string): string {
  const doc = parse(textDoc);
  const words = title.replace(/\n/g, ' ').trim();
  const at = readSite(doc).pages[0].at;
  const h: Block = { k: 'h', level: 1, runs: text(words) };
  return write(apply(doc, at >= 0 ? { op: 'splice', at, n: 1, blocks: [{ ...doc.blocks[at], runs: h.runs } as Block] } : { op: 'splice', at: 0, n: 0, blocks: [h] }));
}

/* ---------- commands, as ops ---------- */

/** What can be put in a section: a website's, and a Quick Links page's. */
export type Kind = 'p' | 'card' | 'button' | 'link' | 'picture' | 'icon' | 'product' | 'section' | 'page';
export const kindsOf = (site: Site): Kind[] => (site.links ? ['p', 'button', 'link', 'picture', 'icon'] : ['p', 'card', 'button', 'picture', 'icon', 'product', 'section', 'page']);
export const kindName = (k: Kind): string =>
  ({ p: t('Paragraph'), card: t('Card'), button: t('Button'), link: t('Small link'), picture: t('Picture'), icon: t('Big icon'), product: t('Product'), section: t('Section'), page: t('Page') })[k];

/** What a thing added is, before it is typed over: words to replace, in the right kind of block. */
export function blockOf(k: Kind, arg = ''): Block {
  switch (k) {
    case 'card':
      return { k: 'li', depth: 0, runs: [{ t: `${t('Heading')} | ${t('A line about it')}` }] };
    case 'button':
      return { k: 'quote', runs: [{ t: `${t('Label')} | ${arg || 'https://'}` }] };
    case 'link':
      return { k: 'li', depth: 0, runs: [{ t: '', ic: 'globe' }, { t: ` ${t('Name')} | ${arg || 'https://'}` }] };
    case 'picture':
      return { k: 'img', alt: '', url: arg };
    case 'icon':
      return { k: 'p', runs: [{ t: '', ic: arg || 'star' }] };
    case 'section':
      return { k: 'h', level: 2, runs: [{ t: t('New section') }] };
    case 'page':
      return { k: 'h', level: 1, runs: [{ t: t('New page') }] };
    case 'product':
      return { k: 'table', cols: [{ name: 'Name', type: 'text' }, { name: 'Price', type: 'money' }, { name: 'About', type: 'text' }, { name: 'Image', type: 'text' }], rows: [newProduct()] };
    default:
      return { k: 'p', runs: [] };
  }
}
const newProduct = () => [t('New thing'), '10', '', ''];

/**
 * A thing added to section `n`: the ops, and the block it is (or the table it went into). `after` is the block the
 * caret is in (a document index): the thing goes under it, as Insert ▾ does in the Word Processor; without one, at the
 * end of the section (the frame's "+"). A page always goes after the page the section is on.
 */
export function addOps(doc: Doc, site: Site, n: number, k: Kind, arg = '', after?: number): { ops: Op[]; at: number } {
  const s = site.sections[n] ?? site.sections[0];
  if (k === 'product' && s.shop >= 0) {
    const b = doc.blocks[s.shop] as Extract<Block, { k: 'table' }>;
    const row = b.cols.map((_, c) => newProduct()[columnsOf(b, ...PRODUCT).indexOf(c)] ?? '');
    return { ops: [{ op: 'rows', at: s.shop, r: b.rows.length, n: 1, rows: [row] }], at: s.shop };
  }
  // A page goes after the page the section is on; anything else under the caret's block, or at the end of the section.
  const at = k === 'page' ? site.pages[s.page].to : after !== undefined && after >= s.from && after < s.to ? after + 1 : s.to;
  return { ops: [{ op: 'splice', at, n: 0, blocks: [blockOf(k, arg)] }], at };
}

/** The part a section stands for when it is moved or removed: a page (its front), a section, or nothing (the home page). */
export function partOf(site: Site, n: number): { from: number; to: number; page: boolean } | null {
  const s = site.sections[n];
  if (!s) return null;
  const front = site.pages[s.page].sections[0] === s;
  if (front && s.page === 0) return null;
  const p = site.pages[s.page];
  return front ? { from: p.from, to: p.to, page: true } : { from: s.from, to: s.to, page: false };
}
/** A page past its neighbour page (never past the home page), or a section past its neighbour in the same page: one `move`. */
export function moveOps(site: Site, n: number, by: -1 | 1): Op[] | null {
  const part = partOf(site, n);
  if (!part) return null;
  const s = site.sections[n];
  const len = part.to - part.from;
  if (part.page) {
    const other = site.pages[s.page + by];
    if (!other || s.page + by < 1) return null;
    return [{ op: 'move', at: part.from, n: len, to: by < 0 ? other.from : other.to - len }];
  }
  const list = site.pages[s.page].sections;
  const j = list.indexOf(s);
  const other = list[j + by];
  if (!other || j + by < 1) return null;
  return [{ op: 'move', at: part.from, n: len, to: by < 0 ? other.from : other.to - len }];
}
/** A page with its sections, or a section, taken away: one `splice`. */
export function removeOps(site: Site, n: number): Op[] | null {
  const part = partOf(site, n);
  return part ? [{ op: 'splice', at: part.from, n: part.to - part.from, blocks: [] }] : null;
}
/** A copy of a page with its sections, or of a section, put right after it: one `splice`; `at` is where the copy begins. */
export function duplicateOps(doc: Doc, site: Site, n: number): { ops: Op[]; at: number } | null {
  const part = partOf(site, n);
  if (!part) return null;
  const blocks = structuredClone(doc.blocks.slice(part.from, part.to));
  return { ops: [{ op: 'splice', at: part.to, n: 0, blocks }], at: part.to };
}
/** The blocks section `n` stands for when it is copied: its part (a page with its sections), or the home page's front section. */
export function partBlocks(doc: Doc, site: Site, n: number): Block[] {
  const s = site.sections[n];
  if (!s) return [];
  const part = partOf(site, n);
  return doc.blocks.slice(part ? part.from : s.from, part ? part.to : s.to);
}
/** Blocks pasted after the part section `n` stands for (after the home page's front section for the home page): one `splice`. */
export function pasteOps(site: Site, n: number, blocks: Block[]): { ops: Op[]; at: number } | null {
  const s = site.sections[n];
  if (!s || !blocks.length) return null;
  const at = partOf(site, n)?.to ?? s.to;
  return { ops: [{ op: 'splice', at, n: 0, blocks }], at };
}
/** The look: the theme words in the head (indigo, the default, is not written). */
export function themeOp(theme: Theme): Op {
  const words = themeWords(theme);
  return { op: 'head', key: 'theme', value: words === 'indigo' ? undefined : words };
}
export const linksOp = (on: boolean): Op => ({ op: 'head', key: 'look', value: on ? 'links' : undefined });
/** A shop setting: `currency:` or `orders:`, gone when empty. */
export const settingOp = (key: 'currency' | 'orders', value: string): Op => ({ op: 'head', key, value: value.trim() || undefined });

/** The section a block is in. */
export const sectionAt = (site: Site, at: number): number => {
  let n = 0;
  for (const s of site.sections) if (s.from <= at) n = s.n;
  return n;
};
