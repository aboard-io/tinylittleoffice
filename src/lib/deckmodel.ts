import { PALETTE } from './palette.ts';
import { ACCENT } from '../kit/core.ts';
import { linkToRef, makeRef } from '../kit/embed.ts';
import { attr, pages, parse, takeHead, write, type Block, type Head, type Tlo } from './tlo.ts';
import { nested, outlineToDeck, readTree } from './outlinemodel.ts';
/**
 * Deck document model. A deck is TLO (lib/tlo.ts), a slide between each
 * "---" and the next:
 *
 *   ## :rocket: Headline {.title}    the icon, the headline, and the layout:
 *                                    .title, .two (two columns) or .icon (a big icon)
 *   - A bullet                       the words, two spaces in a level
 *     - Under it
 *   |                                on a two-column slide, where the right column starts
 *   ```sheet                         another document shown on the slide: its app, its text
 *   > Say this first                 speaker notes, never on the slide
 *
 * The header holds the deck's settings: "transition: cut" (fade unless
 * said), "color: red" (every icon in the deck) and "qr: no" (no closing QR
 * slide). The pages of a printed thing (lib/fold.ts) are written the same
 * way, their prose as paragraphs.
 */
/** No cap on slides: the link's length is the only limit, and the meter shows it. */
export const MAX_SLIDES = Infinity;

/** '' bullets (a deck's default), 't' title, '2' two columns, 'i' big icon; 'b' says bullets where the default is prose (a printed page). */
export type Layout = '' | 't' | '2' | 'i' | 'b';
export const LAYOUTS: { id: Layout; name: string }[] = [
  { id: '', name: 'Bullets' },
  { id: 't', name: 'Title' },
  { id: '2', name: 'Two columns' },
  { id: 'i', name: 'Big icon' },
];
/** How one slide gives way to the next. '' is the default, a fade. */
export type Transition = '' | 'cut' | 'slide' | 'zoom';
export const TRANSITIONS: { id: Transition; name: string }[] = [
  { id: '', name: 'Fade' },
  { id: 'cut', name: 'Cut' },
  { id: 'slide', name: 'Slide' },
  { id: 'zoom', name: 'Zoom' },
];

export interface Slide {
  icon: string;
  title: string;
  bullets: string[];
  /** '' bullets, 't' title slide, '2' two columns, 'i' bullets beside a big icon. */
  layout?: Layout;
  /** Right-hand column, for the two-column layout. */
  right?: string[];
  /** Another document shown on the slide, as a ref: "<app>\n<its text>" (kit/embed.ts). */
  sub?: string;
  /** Speaker notes: shown to the presenter, never on the slide. */
  notes?: string[];
}

/** A layout as the class on the headline that says it. */
const CLASS_OF: Partial<Record<Layout, string>> = { t: 'title', '2': 'two', i: 'icon' };
const LAYOUT_OF: Record<string, Layout> = { title: 't', two: '2', icon: 'i' };

/** The colours a deck's icons can be: the accent (no letter), or one of these. */
export const ICON_COLORS: Record<string, { name: string; hex: string }> = { '': { name: 'Indigo', hex: ACCENT }, k: PALETTE.k, r: PALETTE.r, o: PALETTE.o, g: PALETTE.g, b: PALETTE.b, p: PALETTE.p };

const settings = (text: string): Head => takeHead(text, ['transition', 'color', 'qr'])[0];
/** A colour as the header names it ("red"), as its letter. */
const colorOf = (name = '') => Object.keys(ICON_COLORS).find((k) => ICON_COLORS[k].name.toLowerCase() === name.trim().toLowerCase()) ?? '';

export const deckIconColor = (text: string): string => colorOf(settings(text).color);

/** Whether the deck ends with the slide that is a QR code of itself: it does unless it says not to. */
export const deckEndsWithQr = (text: string): boolean => !/^(no|false|off)$/i.test(settings(text).qr ?? '');

export function deckTransition(text: string): Transition {
  const t = (settings(text).transition ?? '').toLowerCase();
  return TRANSITIONS.some((x) => x.id === t) ? (t as Transition) : '';
}

/** What a new deck opens with: a title slide. */
const first = (): Slide => ({ icon: '', title: '', bullets: [], layout: 't' });

/** A table on a slide is a sheet holding it; "{chart=bar}" after it asks for the sheet drawn as a chart. */
function sheetOf(t: Extract<Block, { k: 'table' }>): string {
  const chart = attr(t, 'chart');
  return makeRef('sheet', write({ head: chart ? { chart } : {}, blocks: [{ k: 'table', head: t.head, rows: t.rows }] }).trimEnd());
}

/**
 * One slide from its blocks. The first heading is the headline; what is
 * not a note or another document is words, a line each. `prose`: a page
 * where a list says bullets ('b') and paragraphs are the default.
 */
function slideOf(blocks: Block[], prose: boolean): Slide {
  const s: Slide = { icon: '', title: '', bullets: [] };
  let into = s.bullets;
  let headed = false;
  let listed = false;
  // A numbered list keeps its numbers: a recipe's steps.
  let n = 0;
  for (const b of blocks) {
    n = b.k === 'li' && b.ord ? n + 1 : 0;
    if (b.k === 'h' && !headed) {
      headed = true;
      const m = /^:([a-z][a-z0-9-]*):(?:\s+([\s\S]*))?$/.exec(b.text);
      [s.icon, s.title] = m ? [m[1], m[2] ?? ''] : ['', b.text];
      const layout = b.a?.cls?.map((c) => LAYOUT_OF[c]).find(Boolean);
      if (layout) s.layout = layout;
    } else if (b.k === 'li') {
      listed ||= !b.ord;
      into.push('  '.repeat(Math.min(3, b.depth)) + (b.ord ? `${n}. ` : '') + b.text.replace(/\n/g, ' '));
    } else if (b.k === 'p' && b.text === '|') into = s.right = [];
    else if (b.k === 'p' || b.k === 'h') into.push(...b.text.split('\n'));
    else if (b.k === 'quote') (s.notes ??= []).push(...b.text.split('\n').filter((l) => l.trim()));
    else if (b.k === 'fence') b.lang ? (s.sub = `${b.lang}\n${b.body}`) : into.push(...b.body.split('\n'));
    else if (b.k === 'table') s.sub = sheetOf(b);
    else if (b.k === 'img') {
      const ref = linkToRef(b.url);
      if (ref) s.sub = ref;
      else into.push(`[${b.alt || b.url}](${b.url})`);
    }
  }
  if (!s.layout && prose && listed) s.layout = 'b';
  // A column break on a slide with no layout makes it two columns; on one with another layout, the columns run together.
  if (s.right && !s.layout) s.layout = '2';
  if (s.right && s.layout !== '2') s.bullets.push(...s.right);
  if (s.layout !== '2') delete s.right;
  return s;
}

/** The slides (or pages) a text's blocks make, a slide between rules. */
export const slidesOf = (doc: Tlo, prose = false): Slide[] => pages(doc.blocks).map((p) => slideOf(p, prose));

const live = (lines: string[] = []) => lines.filter((l) => l.trim());
const depth = (b: string) => Math.min(3, Math.floor(/^[ \t]*/.exec(b)![0].replace(/\t/g, '  ').length / 2));

/** A slide's blocks: the headline, the words, the right column, the document, the notes. */
function slideBlocks(s: Slide, prose: boolean): Block[] {
  const layout = s.layout ?? '';
  const cls = CLASS_OF[layout];
  const head = (s.icon ? `:${s.icon}: ${s.title}` : s.title).replace(/\n/g, ' ').trim();
  const out: Block[] = head || cls ? [{ k: 'h', level: 2, text: head, ...(cls ? { a: { cls: [cls] } } : {}) }] : [];
  // A printed page's prose is paragraphs; the rest are bullets.
  const paras = prose && !layout;
  const words = (lines: string[]): Block[] =>
    live(lines).map((l) => {
      const step = paras && /^\d{1,9}[.)]\s+(.*)$/.exec(l.trim());
      return step ? { k: 'li', ord: true, depth: 0, text: step[1] } : paras ? { k: 'p', text: l.trim() } : { k: 'li', depth: depth(l), text: l.trim() };
    });
  out.push(...words(s.bullets));
  if (layout === '2' && live(s.right).length) out.push({ k: 'p', text: '|' }, ...words(s.right!));
  if (s.sub) {
    const nl = s.sub.indexOf('\n');
    out.push({ k: 'fence', lang: nl < 0 ? s.sub : s.sub.slice(0, nl), body: nl < 0 ? '' : s.sub.slice(nl + 1) });
  }
  if (live(s.notes).length) out.push({ k: 'quote', text: live(s.notes).map((n) => n.replace(/\n/g, ' ')).join('\n') });
  return out;
}

/** Slides (or pages) as TLO, with the header given; trailing empty ones are left off. */
export function writeSlides(head: Head, slides: Slide[], prose = false): string {
  const chunks = slides.map((s) => slideBlocks(s, prose));
  while (chunks.length > 1 && !chunks[chunks.length - 1].length) chunks.pop();
  return write({ head, blocks: chunks.flatMap((c, i) => (i ? [{ k: 'hr' } as Block, ...c] : c)) });
}

/**
 * Markdown as a person or a model loosely writes it: with no rules
 * between them, each heading starts a slide. With `title`, a "# Title"
 * above "##" headings is the title slide.
 */
export function loosen(doc: Tlo, title: boolean): Tlo {
  const heads = doc.blocks.filter((b): b is Extract<Block, { k: 'h' }> => b.k === 'h');
  if (doc.blocks.some((b) => b.k === 'hr') || !heads.length) return doc;
  const top = heads[0].level === 1 && heads.length > 1 && !heads.slice(1).some((h) => h.level === 1) ? heads[0] : null;
  const blocks: Block[] = [];
  for (const b of doc.blocks) {
    if (b.k === 'h' && blocks.length) blocks.push({ k: 'hr' });
    blocks.push(title && b === top && !b.a?.cls?.length ? { ...b, a: { ...b.a, cls: ['title'] } } : b);
  }
  return { ...doc, blocks };
}

export function parseDeck(text: string): Slide[] {
  const doc = parse(text);
  return doc.blocks.length ? slidesOf(doc) : [first()];
}

export function serializeDeck(slides: Slide[], transition: Transition = '', color = '', qr = true): string {
  const head: Head = { transition, color: color ? ICON_COLORS[color]?.name.toLowerCase() ?? '' : '', qr: qr ? '' : 'no' };
  // An untouched new deck costs nothing.
  const s = slides[0];
  if (slides.length === 1 && s.layout === 't' && !s.icon && !s.title && !s.sub && !live(s.bullets).length && !live(s.notes).length && !transition && !color && qr) return '';
  return writeSlides(head, slides);
}

/** A deck as written loosely (see loosen; a table on a slide is a sheet), made canonical. */
export function readDeck(text: string): string {
  // An outline is a slide for every item with something under it.
  if (nested(text)) return outlineToDeck(readTree(text).items);
  const doc = loosen(parse(text), true);
  return serializeDeck(doc.blocks.length ? slidesOf(doc) : [first()], deckTransition(text), deckIconColor(text), deckEndsWithQr(text));
}
