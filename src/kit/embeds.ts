/**
 * Things from the web in a document: a video, a post, a song, a place, a picture, by its address and
 * nothing else. The document keeps only the address (a paragraph that is the address alone); a page shows
 * it as a card with the provider's name and a way to load it, and asks the provider for nothing until that
 * is tapped. Loaded, it comes from the provider's own privacy endpoint where there is one, in a sandboxed
 * frame that sends no referrer, or, for a sound, a film, a PDF or a picture that is simply a file, through
 * the browser's own element; a picture (and an article's thumbnail) comes through the picture proxy
 * (kit/media.ts pictureSrc). `embedOf` is a pure function of the address (tests under node); `<to-embed>`
 * is the card. The site's Content-Security-Policy (public/_headers) allows a frame or a medium from any
 * https: address and asks only bsky.app (who a handle is) and Wikipedia (an article's summary).
 * (Ported from the old tree's src/lib/embeds.ts and the card in src/kit/browser.ts.)
 */
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { icon, UI } from './icons.ts';
import { t } from './i18n.ts';
import { pictureSrc } from './media.ts';
import { NETWORK, origin } from './network.ts';

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
  /** Asked on the tap, before anything else: Bluesky for who a handle is, Wikipedia for the article's summary. */
  lookup?: string;
}

const ID = '[A-Za-z0-9_-]+';
/** Where Bluesky answers who a handle is. */
export const LOOKUP_HOST = origin('bskyLookup');
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
  // A Tiny Little Office link is a document, never a thing from the web (the clipboard reads those).
  if (host === NETWORK.site.host || host.endsWith(`.${NETWORK.site.host}`)) return null;
  const file = (kind: EmbedKind): Embed => ({ kind, provider: host, src: u, title: decodeURIComponent(path.split('/').pop()!), url: u, file: true });
  const frame = (kind: EmbedKind, provider: string, src: string, title: string, h?: number): Embed => ({ kind, provider, src, title, url: u, ...(h ? { h } : {}) });
  let m: RegExpExecArray | null;
  if (/^(?:youtube(?:-nocookie)?\.com|youtu\.be)$/.test(host)) {
    const id = host === 'youtu.be' ? /^\/([A-Za-z0-9_-]+)/.exec(path)?.[1] : (q.get('v') ?? new RegExp(`^/(?:shorts|embed|live)/(${ID})`).exec(path)?.[1]);
    return id && new RegExp(`^${ID}$`).test(id) ? frame('video', 'YouTube', `${origin('youtube')}/embed/${id}`, `Video ${id}`) : null;
  }
  if (host === 'vimeo.com' && (m = /^\/(?:video\/)?(\d+)/.exec(path))) return frame('video', 'Vimeo', `${origin('vimeo')}/video/${m[1]}?dnt=1`, `Video ${m[1]}`);
  if (host === 'bsky.app' && (m = new RegExp(`^/profile/([^/]+)/post/(${ID})`).exec(path))) {
    const did = m[1].startsWith('did:');
    return {
      ...frame('post', 'Bluesky', `${origin('bskyPost')}/embed/${m[1]}/app.bsky.feed.post/${m[2]}`, did ? 'Post' : `@${m[1]}`),
      ...(did ? {} : { lookup: `${LOOKUP_HOST}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(m[1])}` }),
    };
  }
  if (/^(?:twitter|x)\.com$/.test(host) && (m = /^\/([^/]+)\/status\/(\d+)/.exec(path))) return frame('post', 'X', `${origin('xPost')}/embed/Tweet.html?id=${m[2]}&dnt=true`, `@${m[1]}`);
  if (/^(?:old\.|new\.)?reddit\.com$/.test(host) && (m = /^\/r\/([^/]+)\/comments\/([a-z0-9]+)(?:\/([^/]+))?/i.exec(path)))
    return frame('post', 'Reddit', `${origin('reddit')}/r/${m[1]}/comments/${m[2]}/${m[3] ? m[3] + '/' : ''}?embed=true`, `r/${m[1]}`);
  if (host === 'archive.org' && (m = /^\/details\/([A-Za-z0-9_.-]+)/.exec(path))) return frame('video', 'Internet Archive', `${origin('archive')}/embed/${m[1]}`, m[1]);
  if (host === 'web.archive.org' && (m = /^\/web\/\d+[a-z_]*\/(.+)/.exec(path))) return frame('page', 'Wayback Machine', u, m[1].replace(/^https?:\/\//, '') + at.search);
  if (host === 'open.spotify.com' && (m = /^(?:\/intl-[a-z]+)?\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/.exec(path)))
    return frame('music', 'Spotify', `${origin('spotify')}/embed/${m[1]}/${m[2]}`, `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}`, m[1] === 'track' ? 152 : m[1] === 'episode' ? 232 : 352);
  if (host === 'soundcloud.com' && (m = /^\/([^/]+)\/([^/]+)/.exec(path)) && m[1] !== 'discover')
    return frame('music', 'SoundCloud', `${origin('soundcloud')}/player/?url=${encodeURIComponent(u)}&visual=false`, decodeURIComponent(path.replace(/^\/|\/$/g, '')), 166);
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
    return frame(
      'map',
      'OpenStreetMap',
      `${origin('osm')}/export/embed.html?bbox=${r(lon - dLon)},${r(lat - dLat)},${r(lon + dLon)},${r(lat + dLat)}&layer=mapnik&marker=${lat},${lon}`,
      `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    );
  }
  if (host === 'codepen.io' && (m = /^\/([^/]+)\/(?:pen|full|details|embed)\/([A-Za-z0-9]+)/.exec(path)))
    return frame('code', 'CodePen', `${origin('codepen')}/${m[1]}/embed/${m[2]}?default-tab=result`, `@${m[1]}`, 400);
  if ((m = /^([a-z]{2,3}(?:-[a-z]+)?)(?:\.m)?\.wikipedia\.org$/.exec(host)) && path.startsWith('/wiki/') && path.length > 6) {
    const title = path.slice(6).split('/')[0];
    return { ...frame('article', 'Wikipedia', '', decodeURIComponent(title).replace(/_/g, ' ')), lookup: `${origin('wikipedia', m[1])}/api/rest_v1/page/summary/${title}` };
  }
  // The fediverse: any host, known by the path's shape. Mastodon's embed page is the post's address and "/embed"; PeerTube's player is under /videos/embed.
  if ((m = /^\/@([\w.-]+(?:@[\w.-]+)?)\/(\d+)\/?$/.exec(path)) || (m = /^\/users\/([\w.-]+)\/statuses\/(\d+)\/?$/.exec(path)))
    return frame('post', 'Mastodon', `https://${at.host}/@${m[1]}/${m[2]}/embed`, `@${m[1].split('@')[0]}@${host}`);
  if ((m = /^\/(?:w|videos\/watch)\/([A-Za-z0-9-]{8,})\/?$/.exec(path))) return frame('video', 'PeerTube', `https://${at.host}/videos/embed/${m[1]}`, `Video ${m[1]}`);
  for (const [re, provider] of LINK_ONLY) if (re.test(host) && path.length > 1) return { kind: 'link', provider, src: '', title: decodeURIComponent(path.replace(/^\/|\/$/g, '')), url: u };
  // Files, by their names: the browser plays, shows or reads them itself.
  if (AUDIO.test(path)) return file('audio');
  if (VIDEO.test(path)) return file('video');
  if (/\.pdf$/i.test(path)) return file('pdf');
  if (IMAGE.test(path)) return file('image');
  return null;
}

/**
 * The places embedOf() knows, by name and by what they hold, for the Web Embed dialog's row of sources (a
 * film, a sound, a PDF or a picture by its own address is known anywhere, and is listed last, as "A file").
 */
export const EMBED_SOURCES: { name: string; kind: EmbedKind }[] = [
  { name: 'YouTube', kind: 'video' },
  { name: 'Vimeo', kind: 'video' },
  { name: 'PeerTube', kind: 'video' },
  { name: 'Internet Archive', kind: 'page' },
  { name: 'Spotify', kind: 'music' },
  { name: 'SoundCloud', kind: 'music' },
  { name: 'Bluesky', kind: 'post' },
  { name: 'Mastodon', kind: 'post' },
  { name: 'Reddit', kind: 'post' },
  { name: 'X', kind: 'post' },
  { name: 'OpenStreetMap', kind: 'map' },
  { name: 'Wikipedia', kind: 'article' },
  { name: 'CodePen', kind: 'code' },
];

/** The embed with the account's id in place of its handle, once the lookup has answered. */
export const withAccount = (e: Embed, did: string): Embed => ({ ...e, src: e.src.replace(/\/embed\/[^/]+\//, `/embed/${did}/`), lookup: undefined });

/** The provider's name and the thing's title, for a card drawn anywhere (a page, a print): "YouTube · Video abc", or the host for a plain link. */
export function embedCaption(url: string): { provider: string; title: string } {
  const e = embedOf(url);
  if (e) return { provider: e.provider, title: e.title };
  try {
    return { provider: new URL(url).hostname.replace(/^www\./, ''), title: url };
  } catch {
    return { provider: '', title: url };
  }
}

interface Summary {
  title: string;
  extract: string;
  thumb: string;
}

/**
 * <to-embed url=…>: the card for a thing from the web, and the thing itself once tapped. Nothing is asked
 * of the provider until the tap. Bluesky is first asked who the handle is (its embed wants the account's
 * id); Wikipedia is asked for the article's summary, which is what the card then shows. If the provider
 * does not answer, the card offers the thing there instead.
 */
export class ToEmbed extends LitElement {
  static properties = { url: {}, alt: {}, loaded: { state: true }, answer: { state: true } };
  declare url: string;
  /** What it shows, in words, for anyone who cannot see it. */
  declare alt: string;
  declare loaded: boolean;
  /** The lookup's answer, once asked: who a Bluesky handle is, or Wikipedia's summary; '' when it did not say. */
  declare answer: string | Summary | null;

  constructor() {
    super();
    this.url = '';
    this.alt = '';
    this.loaded = false;
    this.answer = null;
  }
  createRenderRoot() {
    return this;
  }
  protected willUpdate(changed: Map<string, unknown>) {
    if (changed.has('url') && changed.get('url') !== undefined) {
      this.loaded = false;
      this.answer = null;
    }
  }
  private async load(web: Embed) {
    this.loaded = true;
    if (!web.lookup) return;
    try {
      const r = await fetch(web.lookup, { referrerPolicy: 'no-referrer' });
      const got = r.ok ? ((await r.json()) as { did?: string; title?: string; extract?: string; thumbnail?: { source: string } }) : {};
      this.answer = web.kind === 'article' ? (got.extract ? { title: got.title ?? web.title, extract: got.extract, thumb: got.thumbnail?.source ?? '' } : '') : (got.did ?? '');
    } catch {
      this.answer = '';
    }
  }
  private live(web: Embed, summary: Summary | null): TemplateResult {
    const title = this.alt || web.title;
    if (summary)
      return html`<div class="to-embed-summary">
        ${summary.thumb ? html`<img src=${pictureSrc(summary.thumb)} alt="" referrerpolicy="no-referrer" loading="lazy" />` : nothing}
        <div><b>${summary.title}</b><p>${summary.extract}</p><a href=${web.url} target="_blank" rel="noopener noreferrer">${t('Read on {provider}', { provider: web.provider })}</a></div>
      </div>`;
    if (web.kind === 'image') return html`<img src=${pictureSrc(web.src)} alt=${title} referrerpolicy="no-referrer" loading="lazy" />`;
    // (The site answers every request with Referrer-Policy: no-referrer, so a sound or a film carries none either.)
    if (web.kind === 'audio') return html`<audio controls preload="none" src=${web.src} title=${title}></audio>`;
    if (web.file && web.kind === 'video') return html`<video controls preload="none" playsinline src=${web.src} title=${title}></video>`;
    return html`<iframe class=${web.kind} src=${web.src} title=${title} style=${web.h ? `height:${web.h / 16}rem` : nothing} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation" allow="autoplay; fullscreen; picture-in-picture" referrerpolicy="no-referrer" loading="lazy"></iframe>`;
  }
  render() {
    const asked = embedOf(this.url);
    const web = asked && typeof this.answer === 'string' && this.answer && asked.kind !== 'article' ? withAccount(asked, this.answer) : asked;
    const summary = web?.kind === 'article' && typeof this.answer === 'object' ? this.answer : null;
    const live = !!web && this.loaded && (!web.lookup || !!summary);
    const plays = !!web && (web.kind === 'video' || web.kind === 'audio' || web.kind === 'music');
    // Nothing to load: the card is the way there (the provider embeds nothing without its script, or did not answer).
    const out = !web || web.kind === 'link' || this.answer === '';
    const { provider, title } = embedCaption(this.url);
    const shown = this.alt || title;
    return html`<figure class="to-embed">
      <div class="to-embed-pic ${live ? 'live' : ''}">
        ${
          live && web
            ? this.live(web, summary)
            : html`<div class="to-embed-card">
              ${icon(UI.globe, 28)}
              <span class="to-embed-what"><b>${shown}</b><small>${provider}</small></span>
              ${
                out
                  ? html`<a class="to-btn primary to-embed-load" href=${this.url} target="_blank" rel="noopener noreferrer">${icon(UI.open, 16)}<span>${t('Open on {provider}', { provider })}</span></a>`
                  : html`<button type="button" class="to-btn primary to-embed-load" ?disabled=${this.loaded} @click=${() => void this.load(web!)}>${icon(UI.globe, 16)}<span>${plays ? t('Play (loads it from {provider})', { provider }) : t('Show (loads it from {provider})', { provider })}</span></button>`
              }
            </div>`
        }
      </div>
      <figcaption><a href=${this.url} target="_blank" rel="noopener noreferrer">${shown}</a><small>${provider}</small></figcaption>
    </figure>`;
  }
}
if (!customElements.get('to-embed')) customElements.define('to-embed', ToEmbed);

declare global {
  interface HTMLElementTagNameMap {
    'to-embed': ToEmbed;
  }
}
