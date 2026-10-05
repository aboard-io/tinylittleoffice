/**
 * Deck document model.
 * Format: slides separated by a blank line. Within a slide: an optional
 * ":icon-name" line, then the headline, then one bullet per line.
 */
export const MAX_SLIDES = 10;

export interface Slide {
  icon: string;
  title: string;
  bullets: string[];
}

export function parseDeck(text: string): Slide[] {
  if (!text) return [{ icon: '', title: '', bullets: [] }];
  return text.split('\n\n').map((chunk) => {
    const lines = chunk.split('\n');
    let iconName = '';
    if (lines[0]?.startsWith(':')) iconName = lines.shift()!.slice(1);
    // An empty headline is written as a single space so no chunk ever
    // starts with a newline (which would collide with the slide separator).
    const title = (lines.shift() ?? '').replace(/^ $/, '');
    return { icon: iconName, title, bullets: lines };
  });
}

export function serializeDeck(slides: Slide[]): string {
  const chunks = slides.map((s) => {
    const lines: string[] = [];
    const title = s.title.replace(/\n/g, ' ');
    const bullets = s.bullets.map((b) => b.replace(/\n/g, ' '));
    while (bullets.length && bullets[bullets.length - 1].trim() === '') bullets.pop();
    if (s.icon || title.startsWith(':')) lines.push(':' + s.icon);
    if (title !== '' || bullets.length) lines.push(title === '' ? ' ' : title);
    for (const b of bullets) lines.push(b === '' ? ' ' : b);
    return lines.join('\n');
  });
  // Trailing empty slides cost nothing when dropped.
  while (chunks.length > 1 && chunks[chunks.length - 1] === '') chunks.pop();
  return chunks.join('\n\n');
}
