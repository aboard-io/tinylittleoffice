import { PALETTE } from './palette.ts';
/**
 * Deck document model.
 * Format: slides separated by a blank line. Within a slide: an optional
 * ":icon-name" line, then the headline, then one bullet per line.
 *
 * The icon line may carry a layout after a second colon: ":rocket:t" is a
 * title slide, "::2" two columns of bullets, ":star:i" bullets beside one big
 * icon. Among the bullets, a line "|" starts the right-hand column and a
 * line "@@<app>/<payload>" is another TinyLittleOffice document shown on the
 * slide. A deck may open with a chunk "!<transition>" ("!cut", "!slide",
 * "!zoom"; a fade without one): how one slide gives way to the next. A colour letter may follow
 * it after a colon ("!fade:r", "!:g"): the colour of every icon in the deck.
 */
/** No cap on slides: the link's length is the only limit, and the meter shows it. */
export const MAX_SLIDES = Infinity;

export type Layout = '' | 't' | '2' | 'i';
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
  /** Another document shown on the slide, as "<app>/<payload>". */
  sub?: string;
}

const SETTINGS = /^!([a-z]*)(?::([a-z]))?$/;

/** The colours a deck's icons can be: the accent (no letter), or one of these. */
export const ICON_COLORS: Record<string, { name: string; hex: string }> = { '': { name: 'Indigo', hex: '#4f46e5' }, k: PALETTE.k, r: PALETTE.r, o: PALETTE.o, g: PALETTE.g, b: PALETTE.b, p: PALETTE.p };

export function deckIconColor(text: string): string {
  const m = SETTINGS.exec(text.split('\n\n', 1)[0]);
  return m && m[2] && m[2] in ICON_COLORS ? m[2] : '';
}
const SUB = /^@@([a-z]+\/[A-Za-z0-9_-]*)$/;

/** What a new deck opens with: a title slide. */
const first = (): Slide => ({ icon: '', title: '', bullets: [], layout: 't' });

export function deckTransition(text: string): Transition {
  const m = SETTINGS.exec(text.split('\n\n', 1)[0]);
  // ("fade" was once written out; it is now what a deck does unless told otherwise.)
  return m && m[1] !== 'fade' && TRANSITIONS.some((t) => t.id === m[1]) ? (m[1] as Transition) : '';
}

export function parseDeck(text: string): Slide[] {
  const chunks = text ? text.split('\n\n') : [];
  if (chunks.length && SETTINGS.test(chunks[0])) chunks.shift();
  if (!chunks.length) return [first()];
  return chunks.map((chunk) => {
    const lines = chunk.split('\n');
    const slide: Slide = { icon: '', title: '', bullets: [] };
    if (lines[0]?.startsWith(':')) {
      const [iconName, layout] = lines.shift()!.slice(1).split(':');
      slide.icon = iconName;
      if (layout === 't' || layout === '2' || layout === 'i') slide.layout = layout;
    }
    // An empty headline is written as a single space so no chunk ever
    // starts with a newline (which would collide with the slide separator).
    slide.title = (lines.shift() ?? '').replace(/^ $/, '');
    let into = slide.bullets;
    for (const line of lines) {
      const sub = SUB.exec(line);
      if (sub) slide.sub = sub[1];
      else if (line === '|') into = slide.right = [];
      else into.push(line.replace(/^\\(?=[|@\\])/, ''));
    }
    if (slide.layout !== '2') delete slide.right;
    return slide;
  });
}

export function serializeDeck(slides: Slide[], transition: Transition = '', color = ''): string {
  const flat = (b: string) => {
    const s = b.replace(/\n/g, ' ');
    return s === '' ? ' ' : s === '|' || /^(@@|\\)/.test(s) ? '\\' + s : s;
  };
  const trim = (list: string[]) => {
    const out = list.slice();
    while (out.length && out[out.length - 1].trim() === '') out.pop();
    return out.map(flat);
  };
  const chunks = slides.map((s) => {
    const lines: string[] = [];
    const title = s.title.replace(/\n/g, ' ');
    const layout = s.layout ?? '';
    const right = layout === '2' ? trim(s.right ?? []) : [];
    const body = [...trim(s.bullets), ...(right.length ? ['|', ...right] : []), ...(s.sub ? ['@@' + s.sub] : [])];
    if (s.icon || layout || title.startsWith(':')) lines.push(':' + s.icon + (layout ? ':' + layout : ''));
    if (title !== '' || body.length) lines.push(title === '' ? ' ' : title);
    lines.push(...body);
    return lines.join('\n');
  });
  // Trailing empty slides cost nothing when dropped.
  while (chunks.length > 1 && chunks[chunks.length - 1] === '') chunks.pop();
  // An untouched new deck costs nothing.
  if (chunks.length === 1 && chunks[0] === '::t' && !transition && !color) return '';
  if (transition || color || SETTINGS.test(chunks[0])) chunks.unshift('!' + transition + (color ? ':' + color : ''));
  return chunks.join('\n\n');
}
