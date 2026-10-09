/**
 * Web embed: a video, a post, a song, a place or a picture from the web, by its address
 * (lib/embeds.ts). It is a document only so that it can sit inside others
 * as any document does: in a text, as an outline's item, filling a slide.
 * The document is the address, alone; "alt: words" in its header says
 * what a picture shows. Drawn, it is a card naming the provider: the
 * thing itself is loaded only where someone taps the card (kit/browser.ts).
 */
import { defineApp, rect, text, clip, ACCENT, MUTED, FAINT, SHADE, type Page } from '../kit/core.ts';
import { parseWeb } from '../lib/embeds.ts';

const W = 720;

/** The card: the provider and what it is, a play mark for a video, the address small. */
export function webCard(body: string): Page {
  const { url, alt, embed } = parseWeb(body);
  const h = embed && (embed.kind === 'post' || embed.kind === 'audio' || embed.kind === 'music' || embed.kind === 'link' || embed.kind === 'article') ? 300 : 405;
  let svg = rect(0, 0, W, h, SHADE, 'rx="12"');
  if (!embed) {
    svg += text(W / 2, h / 2 - 8, url ? 'Not something to embed' : 'Paste a video, a post, a song, a place or a picture', { px: 22, bold: true, fill: MUTED, anchor: 'middle' });
    if (url) svg += text(W / 2, h / 2 + 24, clip(url, W - 96, 14), { px: 14, fill: FAINT, anchor: 'middle' });
    return { w: W, h, svg, alt: 'Nothing to show' };
  }
  // Something that plays (a video, a sound, a song) has the play mark.
  const plays = embed.kind === 'video' || embed.kind === 'audio' || embed.kind === 'music';
  const cy = h / 2 - (plays ? 10 : 0);
  if (plays) svg += `<circle cx="${W / 2}" cy="${cy - 48}" r="34" fill="${ACCENT}"/><path d="M${W / 2 - 11} ${cy - 66}l30 18-30 18z" fill="#fff"/>`;
  svg += text(W / 2, cy + (plays ? 24 : -4), embed.provider, { px: 26, bold: true, anchor: 'middle' });
  svg += text(W / 2, cy + (plays ? 54 : 26), clip(alt || embed.title, W - 96, 17), { px: 17, fill: MUTED, anchor: 'middle' });
  svg += text(W / 2, h - 24, clip(url, W - 96, 12), { px: 12, fill: FAINT, anchor: 'middle' });
  return { w: W, h, svg, alt: `${embed.provider}: ${alt || embed.title}` };
}

export default defineApp({
  id: 'web',
  name: 'Web embed',
  icon: 'globe',
  hidden: true,
  blurb: 'A video, a post, a song, a place or a picture from the web, by its address, loaded only when tapped.',
  title: (body) => {
    const { alt, embed } = parseWeb(body);
    return embed ? `${embed.provider}: ${alt || embed.title}` : '';
  },
  outline: (body) => [parseWeb(body).url].filter(Boolean),
  view: (body) => [webCard(body)],
});
