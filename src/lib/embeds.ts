/**
 * Things from the web in a document: a video, a post, a picture, by its
 * address and nothing else. The document keeps only the address (a line
 * that is the address alone, or a Markdown image); a page shows it as a
 * card, with the provider's name and a way to load it, and asks the
 * provider for nothing until that is tapped. Loaded, it comes from the
 * provider's own privacy endpoint where there is one, in a sandboxed
 * frame. Nothing here touches the DOM.
 */

import { takeHead } from './tlo.ts';

export type EmbedKind = 'video' | 'post' | 'image';

export interface Embed {
  kind: EmbedKind;
  /** YouTube, Vimeo, Bluesky, X, or the host of a picture. */
  provider: string;
  /** What to load when asked: an iframe's address, or the picture's own. */
  src: string;
  /** A word or two for the card: the video's id, the post's author. */
  title: string;
  url: string;
  /**
   * Bluesky knows a post by its author's id, not their handle, and its
   * embed page refuses the handle. This is where to ask for the id (asked
   * only when the card is tapped); withAccount puts the answer into src.
   */
  lookup?: string;
}

const ID = '[A-Za-z0-9_-]+';
/** Where Bluesky answers who a handle is. */
export const LOOKUP_HOST = 'https://public.api.bsky.app';

/** What a web address embeds, if anything: null for an ordinary link. */
export function embedOf(url: string): Embed | null {
  const u = url.trim();
  if (!/^https?:\/\/\S+$/.test(u)) return null;
  let m: RegExpExecArray | null;
  if ((m = new RegExp(`^https?://(?:www\\.|m\\.)?(?:youtube\\.com/(?:watch\\?(?:.*&)?v=|shorts/|embed/|live/)|youtu\\.be/)(${ID})`).exec(u)))
    return { kind: 'video', provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${m[1]}`, title: `Video ${m[1]}`, url: u };
  if ((m = /^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/.exec(u))) return { kind: 'video', provider: 'Vimeo', src: `https://player.vimeo.com/video/${m[1]}?dnt=1`, title: `Video ${m[1]}`, url: u };
  if ((m = new RegExp(`^https?://bsky\\.app/profile/([^/]+)/post/(${ID})`).exec(u))) {
    const did = m[1].startsWith('did:');
    return {
      kind: 'post',
      provider: 'Bluesky',
      src: `https://embed.bsky.app/embed/${m[1]}/app.bsky.feed.post/${m[2]}`,
      title: did ? 'Post' : `@${m[1]}`,
      url: u,
      ...(did ? {} : { lookup: `${LOOKUP_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(m[1])}` }),
    };
  }
  if ((m = /^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/([^/]+)\/status\/(\d+)/.exec(u)))
    return { kind: 'post', provider: 'X', src: `https://platform.twitter.com/embed/Tweet.html?id=${m[2]}&dnt=true`, title: `@${m[1]}`, url: u };
  if (/\.(?:png|jpe?g|gif|webp|avif|svg)(?:\?[^#]*)?(?:#.*)?$/i.test(u)) {
    const host = /^https?:\/\/([^/]+)/.exec(u)![1].replace(/^www\./, '');
    return { kind: 'image', provider: host, src: u, title: decodeURIComponent(u.split('/').pop()!.split('?')[0]), url: u };
  }
  return null;
}

/** The embed with the account's id in place of its handle, once the lookup has answered. */
export const withAccount = (e: Embed, did: string): Embed => ({ ...e, src: e.src.replace(/\/embed\/[^/]+\//, `/embed/${did}/`), lookup: undefined });

/** The address and the alt text a web document (the hidden "web" app) holds: the address alone, "alt: words" in its header. */
export function parseWeb(body: string): { url: string; alt: string; embed: Embed | null } {
  const [head, rest] = takeHead(body, ['alt']);
  const url = rest.trim().split('\n')[0]?.trim() ?? '';
  return { url, alt: head.alt ?? '', embed: embedOf(url) };
}

/** The hosts a page may load into a frame when asked (the site's policy, public/_headers, says the same). */
export const FRAME_HOSTS = ['https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://embed.bsky.app', 'https://platform.twitter.com'];
