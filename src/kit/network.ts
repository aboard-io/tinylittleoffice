/**
 * Every place on the web the site can reach, in one list: what each request is for, when it happens, what
 * it carries, and what stops it. Every module that asks the web takes its host from here (`origin`), so a
 * host named anywhere else in src/ fails test/network.test.ts; the Content-Security-Policy's connect-src,
 * img-src, frame-src and media-src are written from the `csp` field (scripts/headers.ts), and
 * docs/network.md and /network (public/network.html) are written from the whole list by
 * scripts/network-doc.ts. The picture whitelist (kit/media.ts TRUSTED) is the entries with a `picture`.
 *
 * A host is a name, a "*." name (every host under it), or "*": any https address, for a thing the person
 * chose by its address (a post on their own Mastodon server, a sound file). Pure data: no DOM.
 */

/** When the request is made: only after the person taps something, while a thing is on the screen, not until they turn a switch on, or when they share. */
export type When = 'after a tap' | 'while shown' | 'never until a switch' | 'on share';
/** The CSP directive a host is allowed by (connect-src, img-src, frame-src, media-src); none: the browser never asks it from a page (a new tab, or the proxy asks). */
export type Directive = 'connect' | 'img' | 'frame' | 'media';

export interface Reach {
  host: string;
  /** What the request is for, in one line. */
  what: string;
  when: When;
  /** What the request holds. */
  carries: string;
  /** The switch or the action that prevents it. */
  stops: string;
  /** The module that makes it. */
  by: string;
  csp?: readonly Directive[];
  /** On the picture whitelist: why this host's pictures show at once. */
  picture?: string;
}

/** A host whose pictures show at once: asked by the proxy, never by the reader's browser. */
const trusted = (host: string, picture: string): Reach => ({
  host,
  what: 'Pictures that show at once, fetched by the picture proxy',
  when: 'while shown',
  carries: 'The picture’s address, asked by the proxy: nothing of the reader',
  stops: 'Nothing to stop: the reader’s browser never asks this host',
  by: 'kit/media.ts TRUSTED, through media/',
  picture,
});

const tapFrame = (host: string, what: string, by = 'kit/embeds.ts'): Reach => ({
  host,
  what,
  when: 'after a tap',
  carries: 'What the address names (the video, the post, the song); no referrer, in a sandboxed frame',
  stops: 'Not tapping the card: until then it is the provider’s name and nothing is asked',
  by,
  csp: ['frame'],
});

const compose = (host: string, what: string): Reach => ({
  host,
  what,
  when: 'on share',
  carries: 'The document’s title and its link, which is the whole document (it is in the link)',
  stops: 'Not choosing that service in Share; it opens in a new tab, which you then post from or close',
  by: 'kit/share.ts',
});

export const NETWORK = {
  site: {
    host: 'tinylittleoffice.com',
    what: 'The site’s own files: the apps, the fonts, the icon set’s chunk (loaded when the icon picker opens)',
    when: 'while shown',
    carries: 'Which file; never the document, which is after the "#" and stays in the browser',
    stops: '“Keep the app on this device”, in the menu: then the files come from the device and nothing is asked',
    by: 'the whole site',
  },
  media: {
    host: 'media.tinylittleoffice.com',
    what: 'The picture proxy: every picture from the web, so its site never learns who is reading',
    when: 'while shown',
    carries: 'The picture’s address, in ?u=; no cookie, no referrer, nothing of the document',
    stops: 'A picture from a host not on the list waits for “Show pictures from the web”; a preview never asks',
    by: 'kit/media.ts pictureSrc',
    csp: ['img', 'connect'],
    picture: 'The proxy itself: an address already its own',
  },
  anyPicture: {
    host: '*',
    what: 'A picture from a site not on the list, asked of the proxy (above), so the site sees the proxy',
    when: 'never until a switch',
    carries: 'The picture’s address, to the proxy',
    stops: '“Show pictures from the web” (this document, this visit) or, under Saved, “Always show pictures from the web” in the menu: off by default',
    by: 'kit/pictures.ts',
  },
  wikimedia: trusted('upload.wikimedia.org', 'Wikimedia Commons’ files: freely licensed, static, the most-used source of public pictures'),
  commons: trusted('commons.wikimedia.org', 'Commons’ own pages’ pictures (the same files, by another address)'),
  archivePictures: trusted('archive.org', 'The Internet Archive’s files: public-domain and archived pictures'),
  archiveStorage: trusted('*.archive.org', 'The Internet Archive’s storage hosts (ia800…us.archive.org)'),
  unsplash: trusted('images.unsplash.com', 'Unsplash’s image CDN: pictures under the Unsplash licence; the Website Builder’s templates use it'),
  pexels: trusted('images.pexels.com', 'Pexels’ image CDN: pictures under the Pexels licence'),
  flickr: trusted('live.staticflickr.com', 'Flickr’s static files: pictures with their licence stated, many Creative Commons'),
  githubRaw: trusted('raw.githubusercontent.com', 'Files in public GitHub repositories: static, the address names the file'),
  githubImages: trusted('user-images.githubusercontent.com', 'Pictures in GitHub issues and READMEs'),
  githubFiles: trusted('*.githubusercontent.com', 'GitHub’s other file hosts, the same kind of file'),
  tiles: {
    host: 'tile.openstreetmap.org',
    what: 'The map’s pictures (tiles) in the Trip Planner, asked directly as OpenStreetMap’s policy asks',
    when: 'while shown',
    carries: 'Which squares of the map are on the screen; no referrer',
    stops: 'Map, in the Trip Planner’s bar, turned off',
    by: 'apps/trip/editor.ts',
    csp: ['img'],
  },
  placeSearch: {
    host: 'nominatim.openstreetmap.org',
    what: 'Place search in the Trip Planner',
    when: 'after a tap',
    carries: 'The words searched for; no referrer',
    stops: 'Not searching: typing a stop’s place by hand asks no one',
    by: 'apps/trip/editor.ts',
    csp: ['connect'],
  },
  tinier: {
    host: 'tinier.tinylittleoffice.com',
    what: 'Short links: made, opened, updated or forgotten',
    when: 'after a tap',
    carries: 'The long link encrypted here, which the service cannot read, and how long to keep it; the owner’s secret to update or forget it',
    stops: 'Not making a short link: the long link needs no one',
    by: 'kit/short.ts',
    csp: ['connect'],
  },
  bskyLookup: {
    host: 'public.api.bsky.app',
    what: 'Who a Bluesky handle is, for a post’s frame',
    when: 'after a tap',
    carries: 'The handle; no referrer',
    stops: 'Not tapping the post’s card',
    by: 'kit/embeds.ts',
    csp: ['connect'],
  },
  wikipedia: {
    host: '*.wikipedia.org',
    what: 'An article’s summary, for its card',
    when: 'after a tap',
    carries: 'The article’s title; no referrer',
    stops: 'Not tapping the article’s card',
    by: 'kit/embeds.ts',
    csp: ['connect'],
  },
  youtube: tapFrame('www.youtube-nocookie.com', 'A YouTube video, from its privacy endpoint'),
  vimeo: tapFrame('player.vimeo.com', 'A Vimeo video, with do-not-track set'),
  bskyPost: tapFrame('embed.bsky.app', 'A Bluesky post'),
  xPost: tapFrame('platform.twitter.com', 'A post on X, with do-not-track set'),
  reddit: tapFrame('embed.reddit.com', 'A Reddit post'),
  archive: tapFrame('archive.org', 'A film or a recording on the Internet Archive'),
  spotify: tapFrame('open.spotify.com', 'A Spotify track, album, playlist or episode'),
  soundcloud: tapFrame('w.soundcloud.com', 'A SoundCloud track'),
  osm: tapFrame('www.openstreetmap.org', 'A place on OpenStreetMap; and the Trip Planner’s credit to it, a link', 'kit/embeds.ts, apps/trip/editor.ts'),
  codepen: tapFrame('codepen.io', 'A CodePen'),
  anyFrame: tapFrame('*', 'A thing on any server, by its address: a Mastodon post, a PeerTube video, a Wayback Machine page, a PDF'),
  anyMedia: { ...tapFrame('*', 'A sound or a film that is a file, played by the browser’s own player'), carries: 'The file’s address; no referrer', csp: ['media'] },
  source: {
    host: 'github.com',
    what: 'The site’s source: the commit this copy was built from, named in About, a link',
    when: 'after a tap',
    carries: 'Which commit; it opens in a new tab, and nothing of the document goes with it',
    stops: 'Not following the link: the commit’s name comes from the site’s own /version.json',
    by: 'kit/drawer.ts, kit/version.ts',
  },
  bskyShare: compose('bsky.app', 'Bluesky’s compose box'),
  xShare: compose('x.com', 'X’s compose box'),
  github: {
    host: 'github.com',
    what: 'The threat model, read where the code is: a link in About that opens in a new tab',
    when: 'after a tap',
    carries: 'Nothing of the document; the tab asks GitHub for a page, as any link does',
    stops: 'Not tapping the link; it names where it goes and asks before it opens',
    by: 'kit/drawer.ts',
  },
  linkedin: compose('www.linkedin.com', 'LinkedIn’s share box'),
  mastodon: compose('*', 'A Mastodon server’s compose box: the one you name'),
} as const satisfies Record<string, Reach>;

export type Place = keyof typeof NETWORK;

/** Every entry, in the order above. */
export const reaches = (): Reach[] => Object.values(NETWORK);

/** An entry's https origin, without a trailing slash; `sub` fills a "*." host ("en" for *.wikipedia.org). */
export function origin(place: Place, sub = ''): string {
  const host: string = NETWORK[place].host;
  return `https://${host.startsWith('*.') ? sub + host.slice(1) : host}`;
}

/** Whether a host is one the list names (by name or under a "*." name; "*" names no host). */
export function listed(host: string): boolean {
  host = host.toLowerCase();
  return reaches().some((r) => (r.host.startsWith('*.') ? host.endsWith(r.host.slice(1)) : r.host === host));
}
