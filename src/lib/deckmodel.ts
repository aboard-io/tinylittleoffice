/**
 * Deck document model.
 * Format: slides separated by a blank line. Within a slide: an optional
 * ":icon-name" line, then the headline, then one bullet per line. A title
 * slide (big centred headline, the other lines as a subtitle) is marked by
 * ":t" after the icon name: ":rocket:t", or "::t" without an icon.
 */
export const MAX_SLIDES = 10;

export interface Slide {
  icon: string;
  title: string;
  bullets: string[];
  /** A title slide rather than a headline with bullets. */
  cover?: boolean;
}

/** What a new deck opens with: a title slide. */
const first = (): Slide => ({ icon: '', title: '', bullets: [], cover: true });

export function parseDeck(text: string): Slide[] {
  if (!text) return [first()];
  return text.split('\n\n').map((chunk) => {
    const lines = chunk.split('\n');
    const slide: Slide = { icon: '', title: '', bullets: [] };
    if (lines[0]?.startsWith(':')) {
      const [iconName, layout] = lines.shift()!.slice(1).split(':');
      slide.icon = iconName;
      if (layout === 't') slide.cover = true;
    }
    // An empty headline is written as a single space so no chunk ever
    // starts with a newline (which would collide with the slide separator).
    slide.title = (lines.shift() ?? '').replace(/^ $/, '');
    slide.bullets = lines;
    return slide;
  });
}

export function serializeDeck(slides: Slide[]): string {
  const chunks = slides.map((s) => {
    const lines: string[] = [];
    const title = s.title.replace(/\n/g, ' ');
    const bullets = s.bullets.map((b) => b.replace(/\n/g, ' '));
    while (bullets.length && bullets[bullets.length - 1].trim() === '') bullets.pop();
    if (s.icon || s.cover || title.startsWith(':')) lines.push(':' + s.icon + (s.cover ? ':t' : ''));
    if (title !== '' || bullets.length) lines.push(title === '' ? ' ' : title);
    for (const b of bullets) lines.push(b === '' ? ' ' : b);
    return lines.join('\n');
  });
  // An untouched new deck costs nothing.
  if (chunks.length === 1 && chunks[0] === '::t') return '';
  // Trailing empty slides cost nothing when dropped.
  while (chunks.length > 1 && chunks[chunks.length - 1] === '') chunks.pop();
  return chunks.join('\n\n');
}
