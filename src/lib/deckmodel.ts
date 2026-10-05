/**
 * Deck document model.
 * Format: slides separated by a blank line. Within a slide: an optional
 * ":icon-name" line, then the headline, then one bullet per line.
 *
 * The icon line may carry a layout after a second colon: ":rocket:t" is a
 * title slide, "::2" two columns of bullets, ":star:i" bullets beside one big
 * icon. Among the bullets, a line "|" starts the right-hand column and a
 * line "@@<app>/<payload>" is another TinyOffice document shown on the
 * slide. A deck may open with a chunk "!<transition>" ("!fade", "!slide",
 * "!zoom"): how one slide gives way to the next.
 */
export const MAX_SLIDES = 10;

export type Layout = '' | 't' | '2' | 'i';
export const LAYOUTS: { id: Layout; name: string }[] = [
  { id: '', name: 'Bullets' },
  { id: 't', name: 'Title' },
  { id: '2', name: 'Two columns' },
  { id: 'i', name: 'Big icon' },
];
export type Transition = '' | 'fade' | 'slide' | 'zoom';
export const TRANSITIONS: { id: Transition; name: string }[] = [
  { id: '', name: 'Cut' },
  { id: 'fade', name: 'Fade' },
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

const SETTINGS = /^!([a-z]*)$/;
const SUB = /^@@([a-z]+\/[A-Za-z0-9_-]*)$/;

/** What a new deck opens with: a title slide. */
const first = (): Slide => ({ icon: '', title: '', bullets: [], layout: 't' });

export function deckTransition(text: string): Transition {
  const m = SETTINGS.exec(text.split('\n\n', 1)[0]);
  return m && TRANSITIONS.some((t) => t.id === m[1]) ? (m[1] as Transition) : '';
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

export function serializeDeck(slides: Slide[], transition: Transition = ''): string {
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
  if (chunks.length === 1 && chunks[0] === '::t' && !transition) return '';
  if (transition || SETTINGS.test(chunks[0])) chunks.unshift('!' + transition);
  return chunks.join('\n\n');
}
