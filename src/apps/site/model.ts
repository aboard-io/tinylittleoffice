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
 * Every thing on a page (Obj) has an id from its block; every command is a list of the kernel's ops: a thing
 * or a part moved is one `move` (buttons, lines of a quote, a `splice`), removed one `splice`, a thing put in one
 * `splice`, the look a `head`. A thing's fields go to and from its line here, so nobody types a separator.
 * (Ported from the old tree's lib/sitemodel.ts and links.def.ts; its lines form and row numbers are gone, the
 * blocks are the rows.)
 */
import { apply, applyAll, columnsOf, evaluate, isAtomic, normalRuns, parse, plainText, runLength, sliceRuns, text, write, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { slug } from '../../kit/draw.ts';
import { runsDiff } from '../../kit/textops.ts';
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
  /** The Price column's own currency, else the site's: a symbol or an ISO 4217 code. */
  currency: string;
  about: string;
  image: string;
}
/**
 * A thing on a page, as a person sees it and taps it: a page's or a section's heading, a heading inside a
 * section, a paragraph, a button (a line of a quote), a big link (a card: a list item), a small link (a list
 * item on a Quick Links page), a picture, a big icon, a thing from the web, another document, a table, the
 * shop's products. `at` is its block (-1 for the heading of a home page with no name), `line` a button's line
 * in its quote (-1 for the rest), `n` the section it is in. Its id in the page is objId().
 */
export type ObjKind = 'page' | 'section' | 'heading' | 'p' | 'card' | 'button' | 'link' | 'picture' | 'icon' | 'web' | 'doc' | 'table' | 'products';
export interface Obj {
  kind: ObjKind;
  at: number;
  line: number;
  n: number;
}
/** The things that sit side by side in a row: they move left and right among themselves, and up and down as the row. */
export const ROW: ReadonlySet<ObjKind> = new Set(['card', 'button', 'link']);
export const objId = (o: Pick<Obj, 'at' | 'line'>): string => (o.line >= 0 ? `${o.at}.${o.line}` : String(o.at));

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
  /** Its heading as a thing on the page (a page's or a section's). */
  head: Obj;
  /** What is in it, in the order of its blocks. */
  items: Obj[];
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

function section(n: number, page: number, title: string, at: number, from: number, front: boolean): Section {
  return {
    n,
    page,
    title,
    at,
    from,
    to: from,
    id: '',
    text: [],
    cards: [],
    buttons: [],
    socials: [],
    pics: [],
    icon: '',
    embeds: [],
    shop: -1,
    products: [],
    head: { kind: front ? 'page' : 'section', at, line: -1, n },
    items: [],
  };
}

export function readSite(doc: Doc): Site {
  const links = doc.head.look === 'links';
  const site: Site = { name: '', theme: parseTheme(doc.head.theme), currency: doc.head.currency || '$', orders: doc.head.orders ?? '', links, pages: [], sections: [] };
  const page = (title: string, at: number, from: number) => {
    const p: Page = { title, at, from, to: from, id: '', sections: [] };
    site.pages.push(p);
    open(section(site.sections.length, site.pages.length - 1, title, at, from, true));
  };
  const open = (s: Section) => {
    site.sections.push(s);
    site.pages[site.pages.length - 1].sections.push(s);
  };
  page('', -1, 0);
  let named = false;
  doc.blocks.forEach((b, i) => {
    const cur = site.sections[site.sections.length - 1];
    const item = (kind: ObjKind, line = -1) => cur.items.push({ kind, at: i, line, n: cur.n });
    if (b.k === 'h' && b.level === 1) {
      const words = plain(b.runs);
      // The first is the site's name, over the home page; each after it a page.
      if (!named) {
        named = true;
        site.name = words;
        site.pages[0].at = i;
        if (cur.n === 0) ((cur.title = words), (cur.at = i), (cur.head.at = i));
      } else page(words, i, i);
    } else if (b.k === 'h' && b.level === 2) open(section(site.sections.length, site.pages.length - 1, plain(b.runs), i, i, false));
    else if (b.k === 'h') {
      // A heading inside a section (### and below): words over what follows, not a section of its own.
      item('heading');
      cur.text.push(b.runs);
    } else if (b.k === 'p') {
      const words = plain(b.runs);
      const [ic, rest] = iconOf(b.runs);
      if (ic && !rest.length) ((cur.icon = ic), item('icon'));
      else if (b.runs.length === 1 && isPicture(words)) (cur.pics.push({ url: words, alt: '' }), item('picture'));
      else if (b.runs.length === 1 && /^https?:\/\/\S+$/.test(words) && embedOf(words)) (cur.embeds.push({ web: words }), item('web'));
      // (A paragraph with no words yet is one too: Enter has just made it, and it is being typed in.)
      else (cur.text.push(...linesOf(b.runs).filter((l) => l.length)), item('p'));
    } else if (b.k === 'quote')
      linesOf(b.runs).forEach((l, k) => {
        if (!l.length) return;
        cur.buttons.push(linkOf(l));
        item('button', k);
      });
    else if (b.k === 'li') {
      if (links) (cur.socials.push(linkOf(b.runs)), item('link'));
      else {
        const [icon, rest] = iconOf(b.runs);
        const [head, detail] = fieldsOf(rest);
        cur.cards.push({ icon, head, detail });
        item('card');
      }
    } else if (b.k === 'img') (cur.pics.push({ url: /^https?:\/\//.test(b.url) ? b.url : '', alt: b.alt }), item('picture'));
    else if (b.k === 'table') {
      if (isShop(b) && cur.shop < 0) {
        item('products');
        cur.shop = i;
        const [n, p, a, im] = columnsOf(b, ...PRODUCT);
        const values = evaluate(doc, i)?.values ?? [];
        const currency = b.cols[p]?.currency || site.currency;
        b.rows.forEach((r, k) => {
          const name = (r[n] ?? '').trim();
          if (!name) return;
          const v = values[k]?.[p];
          const price = typeof v === 'number' ? v : parseFloat((r[p] ?? '').replace(/[^0-9.-]/g, '')) || 0;
          const image = (r[im] ?? '').trim();
          cur.products.push({ name, price, currency, about: a >= 0 ? (r[a] ?? '').trim() : '', image: /^https?:\/\//.test(image) ? image : '' });
        });
      } else (cur.embeds.push({ lang: 'sheet', body: write({ head: {}, blocks: [b] }).trimEnd() }), item('table'));
    } else if (b.k === 'fence' && b.lang) (cur.embeds.push({ lang: b.lang, body: b.body }), item('doc'));
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

/** What Insert ▾ can put in: a website's things, and a Quick Links page's. */
export type Kind = 'page' | 'section' | 'heading' | 'p' | 'button' | 'card' | 'link' | 'picture' | 'icon' | 'web' | 'doc' | 'product';
export const kindsOf = (site: Site, n = 0): Kind[] =>
  site.links
    ? ['p', 'button', 'link', 'picture', 'icon', 'web']
    : ['page', 'section', 'heading', 'p', 'button', 'card', 'picture', 'icon', 'web', 'doc', ...((site.sections[n]?.shop ?? -1) < 0 ? (['product'] as const) : [])];
export const kindName = (k: Kind): string =>
  ({
    page: t('Page'),
    section: t('Section'),
    heading: t('Heading'),
    p: t('Paragraph'),
    button: t('Button'),
    card: t('Big link'),
    link: t('Small link'),
    picture: t('Web Picture'),
    icon: t('Big icon'),
    web: t('Web Embed'),
    doc: t('Tiny Little Office Doc'),
    product: t('Products'),
  })[k];

/** A new products table: what each thing is called, its price, a line about it, a picture; one thing to begin with. */
export const productsBlock = (): Block => ({
  k: 'table',
  cols: [
    { name: 'Name', type: 'text' },
    { name: 'Price', type: 'money' },
    { name: 'About', type: 'text' },
    { name: 'Image', type: 'text' },
  ],
  rows: [[t('New thing'), '10', '', '']],
});

/* ---------- the things on a page ---------- */

/** Every thing on the site, in the order of the document: each section's heading, then what is in it. */
export const objectsOf = (site: Site): Obj[] => site.sections.flatMap((s) => [s.head, ...s.items]);
/** The thing with this id, or null. */
export const objectAt = (site: Site, id: string | null): Obj | null => (id === null ? null : (objectsOf(site).find((o) => objId(o) === id) ?? null));

/** A section's things in rows: a run of cards, of buttons or of small links is one row; anything else is a row of its own. Each with its span of blocks. */
export function rowsOf(s: Section): { items: Obj[]; from: number; to: number }[] {
  const out: { items: Obj[]; from: number; to: number }[] = [];
  for (const o of s.items) {
    const last = out[out.length - 1];
    if (last && ROW.has(o.kind) && last.items[0].kind === o.kind) {
      last.items.push(o);
      last.to = o.at + 1;
    } else out.push({ items: [o], from: o.at, to: o.at + 1 });
  }
  return out;
}

/** A quote's lines, and the quote made again from lines. */
const quoteLines = (b: Block): Run[][] => (b.k === 'quote' ? linesOf(b.runs) : []);
/** A quote with line `line` made these runs. */
export const withLine = (b: Block, line: number, runs: Run[]): Block => {
  const ls = quoteLines(b);
  ls[line] = runs;
  return quoteOf(ls);
};
const quoteOf = (lines: Run[][]): Block => ({ k: 'quote', runs: normalRuns(lines.flatMap((l, i) => (i ? [{ t: '\n' }, ...l] : l))) });

/** What a change to a thing comes to: the ops, and the id of the thing in hand after them (null for none). */
export interface Change {
  ops: Op[];
  id: string | null;
}

/**
 * A thing moved: up and down past the row before or after it (a card, a button or a small link takes its whole
 * row), left and right past its neighbour in its row; a page or a section past its neighbour. Things stay in their
 * section. Null where it cannot go.
 */
export function moveObj(doc: Doc, site: Site, id: string, dir: 'up' | 'down' | 'left' | 'right'): Change | null {
  const o = objectAt(site, id);
  if (!o) return null;
  const vertical = dir === 'up' || dir === 'down';
  if (o.kind === 'page' || o.kind === 'section') {
    const ops = vertical ? moveOps(site, o.n, dir === 'up' ? -1 : 1) : null;
    if (!ops) return null;
    const head = doc.blocks[o.at];
    return { ops, id: String(applyAll(doc, ops).blocks.indexOf(head)) };
  }
  const rows = rowsOf(site.sections[o.n]);
  const k = rows.findIndex((r) => r.items.includes(o));
  const row = rows[k];
  if (vertical) {
    const other = rows[k + (dir === 'up' ? -1 : 1)];
    if (!other) return null;
    const len = row.to - row.from;
    const to = dir === 'up' ? other.from : other.to - len;
    return { ops: [{ op: 'move', at: row.from, n: len, to }], id: objId({ at: o.at + to - row.from, line: o.line }) };
  }
  if (!ROW.has(o.kind)) return null;
  const j = row.items.indexOf(o);
  const next = row.items[j + (dir === 'left' ? -1 : 1)];
  if (!next) return null;
  if (o.kind !== 'button') return { ops: [{ op: 'move', at: o.at, n: 1, to: next.at }], id: String(next.at) };
  // A button changes places with its neighbour, line for line; each quote keeps its number of lines.
  const lines = new Map<number, Run[][]>();
  for (const x of [o, next]) if (!lines.has(x.at)) lines.set(x.at, quoteLines(doc.blocks[x.at]));
  const mine = lines.get(o.at)![o.line];
  lines.get(o.at)![o.line] = lines.get(next.at)![next.line];
  lines.get(next.at)![next.line] = mine;
  return { ops: [...lines].map(([at, ls]) => ({ op: 'splice', at, n: 1, blocks: [quoteOf(ls)] })), id: objId(next) };
}

/** A thing taken away (a page with its sections, a section with what is in it, a button's line); the thing before it is in hand after. */
export function removeObj(doc: Doc, site: Site, id: string): Change | null {
  const all = objectsOf(site);
  const k = all.findIndex((x) => objId(x) === id);
  const o = all[k];
  if (!o) return null;
  const before = all[k - 1];
  let ops: Op[] | null;
  if (o.kind === 'page' || o.kind === 'section') ops = removeOps(site, o.n);
  else if (o.kind === 'button' && quoteLines(doc.blocks[o.at]).length > 1) {
    const ls = quoteLines(doc.blocks[o.at]);
    ls.splice(o.line, 1);
    ops = [{ op: 'splice', at: o.at, n: 1, blocks: [quoteOf(ls)] }];
  } else ops = [{ op: 'splice', at: o.at, n: 1, blocks: [] }];
  if (!ops) return null;
  return { ops, id: before && before.at >= 0 ? objId(before) : null };
}

/** A copy of a thing right after it (a button in its row), in hand after. */
export function duplicateObj(doc: Doc, site: Site, id: string): Change | null {
  const o = objectAt(site, id);
  if (!o || o.at < 0) return null;
  if (o.kind === 'page' || o.kind === 'section') {
    const r = duplicateOps(doc, site, o.n);
    return r && { ops: r.ops, id: String(r.at) };
  }
  if (o.kind === 'button') {
    const ls = quoteLines(doc.blocks[o.at]);
    ls.splice(o.line + 1, 0, structuredClone(ls[o.line]));
    return { ops: [{ op: 'splice', at: o.at, n: 1, blocks: [quoteOf(ls)] }], id: objId({ at: o.at, line: o.line + 1 }) };
  }
  return { ops: [{ op: 'splice', at: o.at + 1, n: 0, blocks: [structuredClone(doc.blocks[o.at])] }], id: String(o.at + 1) };
}

/** The blocks a thing is when copied: a page with its sections, a section with what is in it, a button as a quote of its own line. */
export function objBlocks(doc: Doc, site: Site, id: string): Block[] {
  const o = objectAt(site, id);
  if (!o) return [];
  if (o.kind === 'page' || o.kind === 'section') return partBlocks(doc, site, o.n);
  if (o.kind === 'button') return [quoteOf([quoteLines(doc.blocks[o.at])[o.line]])];
  return [doc.blocks[o.at]];
}

/** Where a thing goes after the one in hand: after its part (a page or a section), after its block (a button's quote). */
function afterObj(site: Site, o: Obj): number {
  if (o.kind === 'page' || o.kind === 'section') return partOf(site, o.n)?.to ?? site.sections[o.n].to;
  return o.at + 1;
}
/** Blocks pasted after the thing in hand: one splice; the first of them in hand after. */
export function pasteObj(site: Site, id: string, blocks: Block[]): { ops: Op[]; at: number } | null {
  const o = objectAt(site, id);
  if (!o || !blocks.length) return null;
  const at = afterObj(site, o);
  return { ops: [{ op: 'splice', at, n: 0, blocks }], at };
}

/**
 * A new thing put in: a page after the page in hand's, a section at the end of the section in hand's; anything
 * else right after the thing in hand (under a page's or a section's heading when that is in hand; a button after a
 * button goes in its row), or, with nothing in hand, at the end of section `cur`. One splice; the new thing's id.
 */
export function insertObj(doc: Doc, site: Site, held: string | null, cur: number, block: Block): Change {
  const o = objectAt(site, held);
  const s = site.sections[o ? o.n : cur] ?? site.sections[0];
  let at: number;
  if (block.k === 'h' && block.level === 1) at = site.pages[s.page].to;
  else if (block.k === 'h' && block.level === 2) at = s.to;
  else if (!o) at = s.to;
  else if (o.kind === 'page' || o.kind === 'section') at = Math.max(0, o.at + 1);
  else if (o.kind === 'button' && block.k === 'quote') {
    const ls = quoteLines(doc.blocks[o.at]);
    ls.splice(o.line + 1, 0, ...quoteLines(block));
    return { ops: [{ op: 'splice', at: o.at, n: 1, blocks: [quoteOf(ls)] }], id: objId({ at: o.at, line: o.line + 1 }) };
  } else at = o.at + 1;
  return { ops: [{ op: 'splice', at, n: 0, blocks: [block] }], id: objId({ at, line: block.k === 'quote' ? 0 : -1 }) };
}

/* ---------- a thing's fields, and the block they make ---------- */

/** Words a person typed, kept from reading as a separator: "|" is what cuts a line into fields, so a typed one is a broken bar. */
const noBar = (s: string) => s.replace(/\|/g, '¦');
const noBarRuns = (runs: Run[]): Run[] => runs.map((r) => (isAtomic(r) ? r : { ...r, t: noBar(r.t) }));
const iconRuns = (icon: string): Run[] => (icon ? [{ t: '', ic: icon }, { t: ' ' }] : []);

/** A button's or a small link's fields, from its line. */
export const linkFields = (runs: Run[]): Link => {
  const [icon, rest] = iconOf(runs);
  const [label, url] = fieldsOf(rest);
  return { icon, label: plain(label), url: plain(url) };
};
/** The line of a button or a small link: its icon, its words and where it goes ("Label | url"), written by the code. */
export const linkRuns = (l: Link): Run[] => normalRuns([...iconRuns(l.icon), { t: noBar(l.label.trim()) + (l.url.trim() ? ` | ${l.url.trim()}` : '') }]);

/** A big link (a card): its icon, its words (rich), the line under them (rich) and where it goes. */
export interface CardFields {
  icon: string;
  head: Run[];
  detail: Run[];
  url: string;
}
export function cardFields(runs: Run[]): CardFields {
  const [icon, rest] = iconOf(runs);
  const [head, detail] = fieldsOf(rest);
  const words = head.filter((r) => !isAtomic(r));
  const url = words.length && words.every((r) => r.href && r.href === words[0].href) ? words[0].href! : '';
  return { icon, head: url ? head.map(({ href: _h, ...r }) => r) : head, detail, url };
}
export function cardRuns(c: CardFields): Run[] {
  const url = c.url.trim();
  const head = noBarRuns(trimRuns(c.head)).map((r) => (url && !isAtomic(r) ? { ...r, href: url } : r));
  const detail = noBarRuns(trimRuns(c.detail));
  return normalRuns([...iconRuns(c.icon), ...head, ...(detail.length ? [{ t: ' | ' }, ...detail] : [])]);
}

/** Plain words as a heading's runs (a heading is drawn as it is typed, never as Markdown). */
export const plainRuns = (words: string): Run[] => (words.trim() ? [{ t: words.replace(/\s+/g, ' ').trim() }] : []);

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
/** The look: the theme words in the head (indigo, the default, is not written). */
export function themeOp(theme: Theme): Op {
  const words = themeWords(theme);
  return { op: 'head', key: 'theme', value: words === 'indigo' ? undefined : words };
}
export const linksOp = (on: boolean): Op => ({ op: 'head', key: 'look', value: on ? 'links' : undefined });
/** A shop setting: `currency:` or `orders:`, gone when empty. */
export const settingOp = (key: 'currency' | 'orders', value: string): Op => ({ op: 'head', key, value: value.trim() || undefined });

/* ---------- words typed in the page ---------- */

/** How a thing's words are typed where they are drawn (frame.ts): rich (marks and links), marks alone, or plain words. */
export type WordsKind = 'rich' | 'marks' | 'plain';
/** One run of words on a thing, as the page's editor types it: its runs, its kind, and what Enter does there. */
export interface WordsPart {
  runs: Run[];
  kind: WordsKind;
  /** Enter makes the next paragraph (a heading's, a paragraph's); else Enter is done. */
  next: boolean;
  /** Shift+Enter is a line break (a paragraph's). */
  breaks: boolean;
  label: string;
  placeholder: string;
}
/** Which of a thing's words: a heading's or a paragraph's ("0"), a button's or a small link's ("label"), a big link's ("head", "detail"). */
export type PartName = '0' | 'label' | 'head' | 'detail';
/** The kinds of thing whose words are typed in the page. */
export const WORDS: ReadonlySet<ObjKind> = new Set(['page', 'section', 'heading', 'p', 'button', 'link', 'card']);
export const partsOf = (k: ObjKind): PartName[] => (k === 'card' ? ['head', 'detail'] : k === 'button' || k === 'link' ? ['label'] : WORDS.has(k) ? ['0'] : []);
const wordsKey = (id: string, part: PartName) => `${id}:${part}`;

/** Every thing's words on the site, by "<id>:<part>", for the page's editor. */
export function wordsOf(doc: Doc, site: Site): Record<string, WordsPart> {
  const out: Record<string, WordsPart> = {};
  for (const o of objectsOf(site)) {
    if (!WORDS.has(o.kind)) continue;
    const id = objId(o);
    const b = o.at >= 0 ? doc.blocks[o.at] : undefined;
    const runs = b && 'runs' in b ? b.runs : [];
    const one = (part: PartName, w: Partial<WordsPart> & Pick<WordsPart, 'runs' | 'kind' | 'label' | 'placeholder'>) => (out[wordsKey(id, part)] = { next: false, breaks: false, ...w });
    switch (o.kind) {
      case 'page':
      case 'section':
      case 'heading': {
        const home = o.kind === 'page' && site.sections[o.n].page === 0;
        const name = site.links ? t('Quick Links') : t('My site');
        one('0', {
          runs: plainRuns(plainText(runs)),
          kind: 'plain',
          next: true,
          label: home ? t('The site’s name') : o.kind === 'page' ? t('Page') : o.kind === 'section' ? t('Section') : t('Heading'),
          placeholder: home ? name : t('Heading'),
        });
        break;
      }
      case 'p':
        one('0', { runs, kind: 'rich', next: true, breaks: true, label: t('Paragraph'), placeholder: t('Words for the page') });
        break;
      case 'button':
      case 'link': {
        const line = o.kind === 'button' ? (linesOf(runs)[o.line] ?? []) : runs;
        one('label', { runs: plainRuns(linkFields(line).label), kind: 'plain', label: o.kind === 'button' ? t('Button') : t('Small link'), placeholder: t('Label') });
        break;
      }
      case 'card': {
        const c = cardFields(runs);
        one('head', { runs: c.head, kind: 'marks', label: t('Big link'), placeholder: t('Heading') });
        one('detail', { runs: c.detail, kind: 'marks', label: t('A line under them'), placeholder: t('A line about it') });
        break;
      }
    }
  }
  return out;
}

/** Words as a kind keeps them: plain words are one run of words on one line, marks alone lose their links, and no notes. */
export function keptRuns(runs: Run[], kind: WordsKind): Run[] {
  if (kind === 'plain') return normalRuns([{ t: plainText(runs.filter((r) => !isAtomic(r))).replace(/\n/g, ' ') }]).filter((r) => r.t);
  const noted = runs.filter((r) => r.fn === undefined);
  return kind === 'marks' ? noted.map(({ href: _h, ...r }) => r) : noted;
}

/**
 * A thing's words typed in the page, as ops: one `text` op on its block (the line of a button, the words or the line
 * under them of a big link, written by the code with the rest of the line as it was); the site's name, where there
 * is none yet, a heading put in at the top. Null where nothing changes.
 */
export function wordsOps(doc: Doc, site: Site, id: string, part: PartName, typed: Run[]): Op[] | null {
  const o = objectAt(site, id);
  if (!o || !partsOf(o.kind).includes(part)) return null;
  if (o.at < 0) return typed.length ? [{ op: 'splice', at: 0, n: 0, blocks: [{ k: 'h', level: 1, runs: keptRuns(typed, 'plain') }] }] : null;
  const b = doc.blocks[o.at];
  if (!b || !('runs' in b)) return null;
  let next: Run[];
  switch (o.kind) {
    case 'button': {
      if (b.k !== 'quote') return null;
      const l = linkFields(linesOf(b.runs)[o.line] ?? []);
      const q = withLine(b, o.line, linkRuns({ ...l, label: plainText(typed) }));
      next = 'runs' in q ? q.runs : [];
      break;
    }
    case 'link':
      next = linkRuns({ ...linkFields(b.runs), label: plainText(typed) });
      break;
    case 'card': {
      const c = cardFields(b.runs);
      next = cardRuns({ ...c, [part === 'head' ? 'head' : 'detail']: keptRuns(typed, 'marks') });
      break;
    }
    case 'p':
      next = keptRuns(typed, 'rich');
      break;
    default:
      next = keptRuns(typed, 'plain');
  }
  const op = runsDiff(o.at, b.runs, next);
  return op ? [op] : null;
}

/**
 * Enter in a heading's or a paragraph's words: the thing keeps the words before the caret and a new paragraph after
 * it takes the rest. The ops and the new paragraph's id.
 */
export function splitOps(doc: Doc, site: Site, id: string, before: Run[], after: Run[]): Change | null {
  const o = objectAt(site, id);
  if (!o || o.at < 0 || !['page', 'section', 'heading', 'p'].includes(o.kind)) return null;
  const words = wordsOps(doc, site, id, '0', before) ?? [];
  return { ops: [...words, { op: 'splice', at: o.at + 1, n: 0, blocks: [{ k: 'p', runs: keptRuns(after, 'rich') }] }], id: String(o.at + 1) };
}
