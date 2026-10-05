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
    const title = lines.shift() ?? '';
    return { icon: iconName, title, bullets: lines };
  });
}

export function serializeDeck(slides: Slide[]): string {
  const chunks = slides.map((s) => {
    const lines: string[] = [];
    const title = s.title.replace(/\n/g, ' ');
    if (s.icon || title.startsWith(':')) lines.push(':' + s.icon);
    lines.push(title);
    const bullets = s.bullets.map((b) => b.replace(/\n/g, ' '));
    while (bullets.length && bullets[bullets.length - 1].trim() === '') bullets.pop();
    for (const b of bullets) lines.push(b === '' ? ' ' : b);
    return lines.join('\n');
  });
  // Trailing empty slides cost nothing when dropped.
  while (chunks.length > 1 && chunks[chunks.length - 1] === '') chunks.pop();
  const out = chunks.join('\n\n');
  return out === '' ? '' : out;
}
