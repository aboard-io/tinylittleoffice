/**
 * The Deck's reading of a document, with no DOM in it. A deck is TLO, a slide between each "---" and the
 * next (docs/kernel.md §1, §3):
 *
 *   ## :rocket: Headline {.title}    the icon, the headline, and the layout: .title, .two or .icon
 *   - A bullet                       the words: items are bullets, paragraphs are prose
 *     - Under it
 *   |                                on a two-column slide, where the right column starts
 *   ```sheet                         another document shown on the slide (or a table, a picture, a web
 *   > Say this first                 address alone); speaker notes, never on the slide
 *
 * The header holds the deck's settings: "theme: midnight", "transition: cut", "color: red" (every icon),
 * "qr: no" (no closing QR slide), and "format: zine" — a printed thing (zine, booklet, brochure, comic,
 * poster, badges) is a deck whose pages have another geometry (view.ts); its header may add "sides: 2"
 * and "pages: 12". A slide records its block span, so the editor puts <to-text> straight over the blocks
 * and every command here is a list of the kernel's operations. (Ported from the old tree's deckmodel.ts.)
 */
import { apply, isEmbed, isText, notesOf, pages, parse, plainText, write, type Attrs, type Block, type Doc, type Op, type Run } from '../../doc/index.ts';
import { t } from '../../kit/i18n.ts';
import { ICON_COLORS, THEMES, themeOf } from './theme.ts';

/** '' bullets (words as written: items dotted, paragraphs plain), 't' title, '2' two columns, 'i' big icon. */
export type Layout = '' | 't' | '2' | 'i';
export const LAYOUTS: { id: Layout; name: () => string }[] = [
  { id: '', name: () => t('Bullets') },
  { id: 't', name: () => t('Title') },
  { id: '2', name: () => t('Two columns') },
  { id: 'i', name: () => t('Big icon') },
];
/** A layout as the class on the headline that says it. */
const CLASS_OF: Record<Layout, string> = { '': '', t: 'title', '2': 'two', i: 'icon' };
const LAYOUT_OF: Record<string, Layout> = { title: 't', two: '2', icon: 'i' };

/** How one slide gives way to the next. '' is the default, a fade. */
export type Transition = '' | 'cut' | 'slide' | 'zoom';
export const TRANSITIONS: { id: Transition; name: () => string }[] = [
  { id: '', name: () => t('Fade') },
  { id: 'cut', name: () => t('Cut') },
  { id: 'slide', name: () => t('Slide') },
  { id: 'zoom', name: () => t('Zoom') },
];

/** The printed things a deck can be: the head's "format:"; '' is a deck of slides. */
export type Format = '' | 'zine' | 'booklet' | 'brochure' | 'comic' | 'poster' | 'badges';
export const FORMATS: { id: Format; name: () => string }[] = [
  { id: '', name: () => t('Slides') },
  { id: 'zine', name: () => t('Zine') },
  { id: 'booklet', name: () => t('Booklet') },
  { id: 'brochure', name: () => t('Brochure') },
  { id: 'comic', name: () => t('Comic') },
  { id: 'poster', name: () => t('Poster') },
  { id: 'badges', name: () => t('Name badges') },
];

/** One line of words on a slide: a bullet at a depth (numbered when its list is), or a paragraph. */
export interface Item {
  runs: Run[];
  depth: number;
  /** Its number in an ordered list. */
  n?: number;
  /** A paragraph: drawn without a dot. */
  para?: boolean;
}

/** A slide as read from its blocks: what to draw, and where each part sits in the document. */
export interface Slide {
  /** The slide's blocks, [from, to) in the document (the rules are not in it). */
  from: number;
  to: number;
  /** The headline block, -1 when the slide has none. */
  head: number;
  layout: Layout;
  /** The headline's icon, by name ('' for none): a leading icon run of the headline. */
  icon: string;
  /** The headline's words, the icon left off. */
  title: Run[];
  /** The blocks the words editor owns: from the headline to the notes or the end. */
  words: [number, number];
  /** The "|" paragraph that starts the right column, -1 when there is none. */
  pipe: number;
  items: Item[];
  right: Item[];
  /** The block that is a document shown on the slide (a fence, a table, a picture, a web address alone), -1 for none. */
  sub: number;
  /** The speaker notes: the quote blocks at the slide's end, [from, to). */
  notes: [number, number];
  /** The notes' lines, plain. */
  noteLines: string[];
}

/** The settings a deck keeps in its header. */
export interface Settings {
  theme: string;
  transition: Transition;
  /** A key of ICON_COLORS, or '' for the theme's accent. */
  color: string;
  qr: boolean;
  format: Format;
  /** Two-sided printing, where the format offers it. */
  two: boolean;
  /** How many pages the header asks for, 0 for the format's own count. */
  pages: number;
}

const PIPE = (b: Block) => b.k === 'p' && b.runs.length === 1 && b.runs[0].t === '|';
/** A block that is another document on the slide: a fence named for an app, a table, a picture, a web address alone. */
const isSub = (b: Block) => b.k === 'table' || isEmbed(b);

/** The headline's runs as the icon and the words: ":rocket: Headline" is the icon rocket, the words "Headline". */
export function splitHeadline(runs: Run[]): { icon: string; title: Run[] } {
  const [first, ...rest] = runs;
  if (!first?.ic) return { icon: '', title: runs };
  const title = rest.length && !rest[0].ic && rest[0].fn === undefined ? [{ ...rest[0], t: rest[0].t.replace(/^ /, '') }, ...rest.slice(1)] : rest;
  return { icon: first.ic, title: title.filter((r) => r.t || r.ic || r.fn !== undefined) };
}
/** The headline's runs from an icon and words. */
export const joinHeadline = (icon: string, title: Run[]): Run[] => {
  if (!icon) return title;
  if (!title.length) return [{ t: '', ic: icon }];
  const [first, ...rest] = title;
  return [{ t: '', ic: icon }, ...(first && !first.ic && first.fn === undefined ? [{ ...first, t: ' ' + first.t }, ...rest] : [{ t: ' ' }, ...title])];
};

function itemsOf(blocks: Block[], from: number, to: number): Item[] {
  const out: Item[] = [];
  let n = 0;
  for (let i = from; i < to; i++) {
    const b = blocks[i];
    n = b.k === 'li' && b.ord ? n + 1 : 0;
    if (b.k === 'li') out.push({ runs: b.runs, depth: Math.min(3, b.depth), ...(b.ord ? { n } : {}) });
    else if (b.k === 'p' && !PIPE(b) && !isEmbed(b)) out.push({ runs: b.runs, depth: 0, para: true });
    else if (b.k === 'h') out.push({ runs: b.runs, depth: 0, para: true });
    else if (b.k === 'fence' && !b.lang) out.push(...b.body.split('\n').map((l) => ({ runs: [{ t: l }], depth: 0, para: true })));
  }
  return out;
}

/** One slide from the blocks [from, to) of the document. */
export function slideOf(blocks: Block[], from: number, to: number): Slide {
  let head = -1;
  for (let i = from; i < to && head < 0; i++) if (blocks[i].k === 'h') head = i;
  let notesFrom = to;
  while (notesFrom > from && blocks[notesFrom - 1].k === 'quote') notesFrom--;
  const start = head >= 0 ? head + 1 : from;
  let pipe = -1;
  let sub = -1;
  for (let i = start; i < notesFrom; i++) {
    if (pipe < 0 && PIPE(blocks[i])) pipe = i;
    if (sub < 0 && isSub(blocks[i])) sub = i;
  }
  const h = head >= 0 ? blocks[head] : null;
  const { icon, title } = h && isText(h) ? splitHeadline(h.runs) : { icon: '', title: [] };
  let layout: Layout = (h?.a?.cls ?? []).map((c) => LAYOUT_OF[c]).find(Boolean) ?? '';
  // A column break on a slide with no layout makes it two columns; on one with another layout, the columns run together.
  if (pipe >= 0 && !layout) layout = '2';
  const items = itemsOf(blocks, start, pipe >= 0 && layout === '2' ? pipe : notesFrom);
  const right = pipe >= 0 && layout === '2' ? itemsOf(blocks, pipe + 1, notesFrom) : [];
  if (pipe >= 0 && layout !== '2') items.push(...itemsOf(blocks, pipe + 1, notesFrom));
  const noteLines = blocks
    .slice(notesFrom, to)
    .flatMap((b) => (isText(b) ? plainText(b.runs).split('\n') : []))
    .filter((l) => l.trim());
  return { from, to, head, layout, icon, title, words: [start, notesFrom], pipe, items, right, sub, notes: [notesFrom, to], noteLines };
}

/** The slides a document's blocks make, a slide between rules, each with its span. A document with no blocks is one blank slide. */
export function slidesOf(doc: Doc): Slide[] {
  const out: Slide[] = [];
  let from = 0;
  for (const page of pages(doc.blocks)) {
    out.push(slideOf(doc.blocks, from, from + page.length));
    from += page.length + 1;
  }
  return out;
}

/** Nothing written on it, nothing shown on it. */
export const isBlank = (s: Slide): boolean =>
  !s.icon &&
  !plainText(s.title).trim() &&
  s.sub < 0 &&
  !s.items.some((it) => plainText(it.runs).trim() || it.runs.some((r) => r.ic)) &&
  !s.right.some((it) => plainText(it.runs).trim()) &&
  !s.noteLines.length;

/** The footnotes a slide holds, in the order their marks are drawn: the headline's, then the words', column by column. */
export const slideNotes = (s: Slide): string[] => (s.sub >= 0 ? notesOf([{ runs: s.title }]) : notesOf([{ runs: s.title }, ...s.items, ...s.right]));

/** How a slide's words are spoken or listed: the headline, then each line. */
export const slideText = (s: Slide): string[] => [plainText(s.title), ...[...s.items, ...s.right].map((it) => plainText(it.runs))].map((l) => l.trim()).filter(Boolean);

/* ---------- the header ---------- */

export function settingsOf(doc: Doc): Settings {
  const h = doc.head;
  const theme = (h.theme ?? '').trim().toLowerCase();
  const tr = (h.transition ?? '').trim().toLowerCase();
  const color = (h.color ?? '').trim().toLowerCase();
  const format = (h.format ?? '').trim().toLowerCase();
  return {
    theme: theme in THEMES ? theme : '',
    transition: TRANSITIONS.some((x) => x.id === tr) ? (tr as Transition) : '',
    color: color in ICON_COLORS ? color : '',
    qr: !/^(no|false|off)$/i.test(h.qr ?? ''),
    format: FORMATS.some((f) => f.id === format) ? (format as Format) : '',
    two: h.sides === '2',
    pages: Math.max(0, parseInt(h.pages ?? '0', 10) || 0),
  };
}
/** The colour icons are drawn: the one chosen, or the theme's accent. */
export const iconHex = (s: Pick<Settings, 'theme' | 'color'>): string => ICON_COLORS[s.color]?.hex ?? themeOf(s.theme).accent;

/** A header field set, or removed when the value is the default (so an untouched deck costs nothing). */
export const setHead = (key: string, value: string): Op[] => [{ op: 'head', key, value: value || undefined }];

/* ---------- the name ---------- */

const firstTitle = (doc: Doc): string => {
  for (const s of slidesOf(doc)) {
    const words = plainText(s.title).trim();
    if (words) return words;
  }
  return '';
};
/** The deck's name: the head's title, else the first headline's words, else nothing. */
export function titleOf(text: string): string {
  const doc = parse(text);
  return doc.head.title || firstTitle(doc);
}
export const retitle = (text: string, title: string): string => write(apply(parse(text), { op: 'head', key: 'title', value: title.replace(/\n/g, ' ').trim() || undefined }));

/* ---------- commands, as operations ---------- */

/** The blocks a new slide is born with: nothing for the default layout; a headline that carries the layout otherwise, and for two columns the "|" between them. */
export const blankSlideBlocks = (layout: Layout = ''): Block[] =>
  layout ? [{ k: 'h', level: 2, runs: [], a: { cls: [CLASS_OF[layout]] } }, ...(layout === '2' ? [{ k: 'p', runs: [{ t: '|' }] } as Block] : [])] : [];

/** A new slide after slide `after` (-1: before the first), of a layout; the index it will have. */
export function addSlide(doc: Doc, after: number, layout: Layout = '', blocks: Block[] = blankSlideBlocks(layout)): { ops: Op[]; at: number } {
  const slides = slidesOf(doc);
  if (after < 0) return { ops: [{ op: 'splice', at: 0, n: 0, blocks: [...blocks, { k: 'hr' }] }], at: 0 };
  const s = slides[Math.min(after, slides.length - 1)];
  return { ops: [{ op: 'splice', at: s.to, n: 0, blocks: [{ k: 'hr' }, ...blocks] }], at: Math.min(after, slides.length - 1) + 1 };
}

/** Slides i to j taken out, with the rules beside them; every slide taken is all of them emptied instead. */
export function removeSlide(doc: Doc, i: number, j = i): Op[] {
  const slides = slidesOf(doc);
  const a = slides[i];
  const b = slides[j];
  if (!a || !b || j < i) return [];
  if (i === 0 && j === slides.length - 1) return b.to > a.from ? [{ op: 'splice', at: a.from, n: b.to - a.from, blocks: [] }] : [];
  // The rule before them goes with them (from the first slide, the rule after).
  return i > 0 ? [{ op: 'splice', at: a.from - 1, n: b.to - a.from + 1, blocks: [] }] : [{ op: 'splice', at: a.from, n: b.to - a.from + 1, blocks: [] }];
}

/** The blocks of slides i to j, the rules between them kept: what a copy of them holds. */
export const slideBlocks = (doc: Doc, i: number, j = i): Block[] => {
  const slides = slidesOf(doc);
  return slides[i] && slides[j] ? doc.blocks.slice(slides[i].from, slides[j].to) : [];
};

/** Slides i to j again, right after j; the index the first copy will have. */
export function duplicateSlides(doc: Doc, i: number, j = i): { ops: Op[]; at: number } {
  const slides = slidesOf(doc);
  if (!slides[i] || !slides[j] || j < i) return { ops: [], at: -1 };
  return { ops: [{ op: 'splice', at: slides[j].to, n: 0, blocks: [{ k: 'hr' }, ...slideBlocks(doc, i, j)] }], at: j + 1 };
}

/** Slide i moved to be slide j: the slides between re-laid, every block the same object (the editor redraws nothing). */
export function moveSlide(doc: Doc, i: number, j: number): Op[] {
  const slides = slidesOf(doc);
  if (i === j || !slides[i] || !slides[j]) return [];
  const [lo, hi] = i < j ? [i, j] : [j, i];
  const order = slides.map((_, k) => k);
  order.splice(j, 0, ...order.splice(i, 1));
  const span = (k: number) => doc.blocks.slice(slides[k].from, slides[k].to);
  const blocks = order.slice(lo, hi + 1).flatMap((k, n) => (n ? [{ k: 'hr' } as Block, ...span(k)] : span(k)));
  return [{ op: 'splice', at: slides[lo].from, n: slides[hi].to - slides[lo].from, blocks }];
}

/** The headline block with these runs and this layout, put in place (or born at the slide's start). */
function headlineOps(doc: Doc, s: Slide, runs: Run[], layout: Layout): Op[] {
  const was = s.head >= 0 ? doc.blocks[s.head] : null;
  const cls = [...(was?.a?.cls ?? []).filter((c) => !LAYOUT_OF[c]), ...(CLASS_OF[layout] ? [CLASS_OF[layout]] : [])];
  const a: Attrs = { ...(was?.a?.id ? { id: was.a.id } : {}), ...(was?.a?.kv ? { kv: was.a.kv } : {}), ...(cls.length ? { cls } : {}) };
  const h: Block = { k: 'h', level: was?.k === 'h' ? was.level : 2, runs, ...(Object.keys(a).length ? { a } : {}) };
  return s.head >= 0 ? [{ op: 'splice', at: s.head, n: 1, blocks: [h] }] : [{ op: 'splice', at: s.from, n: 0, blocks: [h] }];
}

/** The slide given a layout: the class on its headline; two columns puts a "|" among the words (and leaving them takes it out). */
export function setLayout(doc: Doc, s: Slide, layout: Layout): Op[] {
  const ops = headlineOps(doc, s, joinHeadline(s.icon, s.title), layout);
  // The words' indices shift by one when a headline is born.
  const shift = s.head < 0 ? 1 : 0;
  if (layout === '2' && s.pipe < 0) ops.push({ op: 'splice', at: s.words[1] + shift, n: 0, blocks: [{ k: 'p', runs: [{ t: '|' }] }] });
  if (layout !== '2' && s.pipe >= 0) ops.push({ op: 'splice', at: s.pipe + shift, n: 1, blocks: [] });
  return ops;
}

/** The slide's icon: the headline's leading icon run, set or taken away. */
export const setIcon = (doc: Doc, s: Slide, icon: string): Op[] => (icon === s.icon ? [] : headlineOps(doc, s, joinHeadline(icon, s.title), s.layout));

/** Another document on the slide: the block put in place of the one there, or after the words. */
export function setSub(s: Slide, block: Block | null): Op[] {
  if (s.sub >= 0) return [{ op: 'splice', at: s.sub, n: 1, blocks: block ? [block] : [] }];
  return block ? [{ op: 'splice', at: s.words[1], n: 0, blocks: [block] }] : [];
}

/** A paragraph that is one web address: a thing from the web, which takes the slide. */
export const webBlock = (url: string): Block => ({ k: 'p', runs: [{ t: url.trim() }] });

/**
 * Markdown as a person or a model loosely writes it: with no rules between them, each heading starts a
 * slide. A "# Title" above "##" headings is the title slide.
 */
export function loosen(doc: Doc): Doc {
  const heads = doc.blocks.filter((b): b is Extract<Block, { k: 'h' }> => b.k === 'h');
  if (doc.blocks.some((b) => b.k === 'hr') || heads.length < 2) return doc;
  const top = heads[0].level === 1 && !heads.slice(1).some((h) => h.level === 1) ? heads[0] : null;
  const blocks: Block[] = [];
  for (const b of doc.blocks) {
    if (b.k === 'h' && blocks.length) blocks.push({ k: 'hr' });
    blocks.push(b === top && !b.a?.cls?.length ? { ...b, a: { ...b.a, cls: ['title'] } } : b);
  }
  return { ...doc, blocks };
}

/* ---------- a comic's panels ---------- */

/** A comic's panel: its picture, what is said, and the caption, written as a bullet ":dog: Walk? | Monday, noon." */
export interface Panel {
  glyph: string;
  said: string;
  caption: string;
}
export function panelOf(item: Item): Panel {
  const { icon, title } = splitHeadline(item.runs);
  const [said = '', caption = ''] = plainText(title)
    .split('|')
    .map((p) => p.trim());
  return { glyph: icon, said, caption };
}

/** The words of a slide's title block, for the home page and the rail: the headline, or the first line of words. */
export const slideName = (s: Slide): string => plainText(s.title).trim() || plainText(s.items[0]?.runs ?? []).trim();
