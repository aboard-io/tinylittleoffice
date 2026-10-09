/**
 * Things from the web in a document: a video, a post, a song, a place, a
 * picture, by its address and nothing else. The document keeps only the
 * address (a line that is the address alone, or a Markdown image); a page
 * shows it as a card, with the provider's name and a way to load it, and
 * asks the provider for nothing until that is tapped. Loaded, it comes
 * from the provider's own privacy endpoint where there is one, in a
 * sandboxed frame that sends no referrer, or, for a sound, a film, a PDF
 * or a picture that is simply a file, through the browser's own element.
 * Nothing here touches the DOM; embedOf is a function of the address.
 */

import { takeHead, withHead } from './tlo.ts';

/**
 * What kind of thing it is, which is how it is shown once tapped:
 *   video    a frame 16:9, or the browser's own <video> for a film by its address
 *   audio    the browser's own <audio>
 *   image    <img> (an SVG too, only ever as a picture, where it can run nothing)
 *   pdf      the browser's own viewer, framed
 *   post     a tall frame
 *   music    a player's frame, at the provider's height
 *   map      a frame 4:3
 *   code     a frame
 *   page     a whole page, framed (the Wayback Machine's copy)
 *   article  a card that asks the provider for a summary (Wikipedia)
 *   link     nothing to frame: the card opens it on the provider
 */
export type EmbedKind = 'video' | 'audio' | 'image' | 'pdf' | 'post' | 'music' | 'map' | 'code' | 'page' | 'article' | 'link';

export interface Embed {
  kind: EmbedKind;
  /** YouTube, Mastodon, Spotify…, or the host of a file. */
  provider: string;
  /** What to load when asked: a frame's address, or the file's own; nothing for a link card. */
  src: string;
  /** A word or two for the card: the video's id, the post's author, the file's name. */
  title: string;
  url: string;
  /** The address is the thing itself (a sound, a film, a PDF, a picture), for the browser's own element. */
  file?: boolean;
  /** A frame's height, where the provider's player has one. */
  h?: number;
  /**
   * Asked on the tap, before anything else: Bluesky for who a handle is
   * (its embed page wants the account's id; withAccount puts the answer
   * into src), Wikipedia for the article's summary, which is what is shown.
   */
  lookup?: string;
}

const ID = '[A-Za-z0-9_-]+';
/** Where Bluesky answers who a handle is. */
export const LOOKUP_HOST = 'https://public.api.bsky.app';
/** The providers, in a line, for a hint and the guide. */
export const KNOWN = 'a YouTube, Vimeo, PeerTube or Internet Archive video; a Bluesky, Mastodon, X or Reddit post; a Spotify or SoundCloud player; a place on OpenStreetMap; a CodePen; a Wikipedia article; a Wayback Machine page; a picture, a sound, a film or a PDF by its address';
/** Hosts with nothing that embeds without their script: the card opens the page there. */
const LINK_ONLY: [RegExp, string][] = [
  [/^instagram\.com$/, 'Instagram'],
  [/^(?:vm\.|vt\.)?tiktok\.com$/, 'TikTok'],
  [/^threads\.(?:net|com)$/, 'Threads'],
  [/^(?:facebook\.com|fb\.com|fb\.watch)$/, 'Facebook'],
  [/^linkedin\.com$/, 'LinkedIn'],
  [/^gist\.github\.com$/, 'GitHub'],
  [/\.bandcamp\.com$/, 'Bandcamp'],
];
const AUDIO = /\.(?:mp3|ogg|oga|wav|m4a|flac|aac|opus)$/i;
const VIDEO = /\.(?:mp4|webm|mov|m4v|ogv)$/i;
const IMAGE = /\.(?:png|jpe?g|gif|webp|avif|svg)$/i;

/** What a web address embeds, if anything: null for an ordinary link. */
export function embedOf(url: string): Embed | null {
  const u = url.trim();
  if (!/^https?:\/\/\S+$/.test(u)) return null;
  let at: URL;
  try {
    at = new URL(u);
  } catch {
    return null;
  }
  const host = at.hostname.toLowerCase().replace(/^(?:www|m|mobile)\./, '');
  const path = at.pathname;
  const q = at.searchParams;
  // A TinyLittleOffice link is a document, never a thing from the web (kit/embed.ts reads those).
  if (host === 'tinylittleoffice.com' || host.endsWith('.tinylittleoffice.com')) return null;
  const file = (kind: EmbedKind): Embed => ({ kind, provider: host, src: u, title: decodeURIComponent(path.split('/').pop()!), url: u, file: true });
  const frame = (kind: EmbedKind, provider: string, src: string, title: string, h?: number): Embed => ({ kind, provider, src, title, url: u, ...(h ? { h } : {}) });
  let m: RegExpExecArray | null;
  if (/^(?:youtube(?:-nocookie)?\.com|youtu\.be)$/.test(host)) {
    const id = host === 'youtu.be' ? /^\/([A-Za-z0-9_-]+)/.exec(path)?.[1] : (q.get('v') ?? new RegExp(`^/(?:shorts|embed|live)/(${ID})`).exec(path)?.[1]);
    return id && new RegExp(`^${ID}$`).test(id) ? frame('video', 'YouTube', `https://www.youtube-nocookie.com/embed/${id}`, `Video ${id}`) : null;
  }
  if (host === 'vimeo.com' && (m = /^\/(?:video\/)?(\d+)/.exec(path))) return frame('video', 'Vimeo', `https://player.vimeo.com/video/${m[1]}?dnt=1`, `Video ${m[1]}`);
  if (host === 'bsky.app' && (m = new RegExp(`^/profile/([^/]+)/post/(${ID})`).exec(path))) {
    const did = m[1].startsWith('did:');
    return {
      ...frame('post', 'Bluesky', `https://embed.bsky.app/embed/${m[1]}/app.bsky.feed.post/${m[2]}`, did ? 'Post' : `@${m[1]}`),
      ...(did ? {} : { lookup: `${LOOKUP_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(m[1])}` }),
    };
  }
  if (/^(?:twitter|x)\.com$/.test(host) && (m = /^\/([^/]+)\/status\/(\d+)/.exec(path))) return frame('post', 'X', `https://platform.twitter.com/embed/Tweet.html?id=${m[2]}&dnt=true`, `@${m[1]}`);
  if (/^(?:old\.|new\.)?reddit\.com$/.test(host) && (m = /^\/r\/([^/]+)\/comments\/([a-z0-9]+)(?:\/([^/]+))?/i.exec(path)))
    return frame('post', 'Reddit', `https://embed.reddit.com/r/${m[1]}/comments/${m[2]}/${m[3] ? m[3] + '/' : ''}?embed=true`, `r/${m[1]}`);
  if (host === 'archive.org' && (m = /^\/details\/([A-Za-z0-9_.-]+)/.exec(path))) return frame('video', 'Internet Archive', `https://archive.org/embed/${m[1]}`, m[1]);
  if (host === 'web.archive.org' && (m = /^\/web\/\d+[a-z_]*\/(.+)/.exec(path))) return frame('page', 'Wayback Machine', u, m[1].replace(/^https?:\/\//, '') + at.search);
  if (host === 'open.spotify.com' && (m = /^(?:\/intl-[a-z]+)?\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/.exec(path)))
    return frame('music', 'Spotify', `https://open.spotify.com/embed/${m[1]}/${m[2]}`, `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}`, m[1] === 'track' ? 152 : m[1] === 'episode' ? 232 : 352);
  if (host === 'soundcloud.com' && (m = /^\/([^/]+)\/([^/]+)/.exec(path)) && m[1] !== 'discover') return frame('music', 'SoundCloud', `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}&visual=false`, decodeURIComponent(path.replace(/^\/|\/$/g, '')), 166);
  if (/^(?:openstreetmap|osm)\.org$/.test(host)) {
    const map = /#map=(\d+)\/(-?[\d.]+)\/(-?[\d.]+)/.exec(at.hash);
    const lat = Number(q.get('mlat') ?? map?.[2]);
    const lon = Number(q.get('mlon') ?? map?.[3]);
    if (!map && !q.has('mlat')) return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const z = Math.min(19, Math.max(1, Number(map?.[1] ?? 15)));
    // A frame about 720 by 405: 2.8 tiles wide at this zoom, 16:9, narrower in longitude towards the poles.
    const dLon = 504 / 2 ** z;
    const dLat = dLon * 0.5625 * Math.max(0.1, Math.cos((lat * Math.PI) / 180));
    const r = (n: number) => n.toFixed(5);
    return frame('map', 'OpenStreetMap', `https://www.openstreetmap.org/export/embed.html?bbox=${r(lon - dLon)},${r(lat - dLat)},${r(lon + dLon)},${r(lat + dLat)}&layer=mapnik&marker=${lat},${lon}`, `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  }
  if (host === 'codepen.io' && (m = /^\/([^/]+)\/(?:pen|full|details|embed)\/([A-Za-z0-9]+)/.exec(path))) return frame('code', 'CodePen', `https://codepen.io/${m[1]}/embed/${m[2]}?default-tab=result`, `@${m[1]}`, 400);
  if ((m = /^([a-z]{2,3}(?:-[a-z]+)?)(?:\.m)?\.wikipedia\.org$/.exec(host)) && path.startsWith('/wiki/') && path.length > 6) {
    const title = path.slice(6).split('/')[0];
    return { ...frame('article', 'Wikipedia', '', decodeURIComponent(title).replace(/_/g, ' ')), lookup: `https://${m[1]}.wikipedia.org/api/rest_v1/page/summary/${title}` };
  }
  // The fediverse: any host, known by the path's shape. Mastodon's embed page is the post's address and "/embed"; PeerTube's player is under /videos/embed.
  if ((m = /^\/@([\w.-]+(?:@[\w.-]+)?)\/(\d+)\/?$/.exec(path)) || (m = /^\/users\/([\w.-]+)\/statuses\/(\d+)\/?$/.exec(path))) return frame('post', 'Mastodon', `https://${at.host}/@${m[1]}/${m[2]}/embed`, `@${m[1].split('@')[0]}@${host}`);
  if ((m = /^\/(?:w|videos\/watch)\/([A-Za-z0-9-]{8,})\/?$/.exec(path))) return frame('video', 'PeerTube', `https://${at.host}/videos/embed/${m[1]}`, `Video ${m[1]}`);
  for (const [re, provider] of LINK_ONLY) if (re.test(host) && path.length > 1) return { kind: 'link', provider, src: '', title: decodeURIComponent(path.replace(/^\/|\/$/g, '')), url: u };
  // Files, by their names: the browser plays, shows or reads them itself.
  if (AUDIO.test(path)) return file('audio');
  if (VIDEO.test(path)) return file('video');
  if (/\.pdf$/i.test(path)) return file('pdf');
  if (IMAGE.test(path)) return file('image');
  return null;
}

/** The embed with the account's id in place of its handle, once the lookup has answered. */
export const withAccount = (e: Embed, did: string): Embed => ({ ...e, src: e.src.replace(/\/embed\/[^/]+\//, `/embed/${did}/`), lookup: undefined });

/** A thing from the web as a ref: the hidden "web" app, holding the address (and for a picture, what it shows). */
export const webRef = (url: string, alt = '') => `web\n${withHead(url.trim(), alt ? { alt } : {})}`;

/** The address and the alt text a web document (the hidden "web" app) holds: the address alone, "alt: words" in its header. */
export function parseWeb(body: string): { url: string; alt: string; embed: Embed | null } {
  const [head, rest] = takeHead(body, ['alt']);
  const url = rest.trim().split('\n')[0]?.trim() ?? '';
  return { url, alt: head.alt ?? '', embed: embedOf(url) };
}
