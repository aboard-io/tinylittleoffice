/**
 * The link: "#/v2/<app>/<payload>" ("#/v1/…" is read too: kit/core/codec.ts). The document lives after the "#", which a browser never sends to a
 * server. "#/v2/<app>.<view>/<payload>" opens the document as a view: a file to download on arrival
 * ("text.pdf"), or a way of showing it.
 * "…?d" is the Display Link: the same document shown as its pages, to read or print, with an Edit button
 * (never inside the payload, so the document is the same bytes either way); "…?d&text" opens it as its words, reflowed,
 * rather than its pages (the Text button puts "text" in and takes it out: withText). Everyone who arrives by a short
 * link (kit/share/short.ts) arrives with "?s=<id>&x=<expires>" (ms since the epoch) after the payload: the shell
 * shows how long the link has left (Paul, 2026-10-09); every link the shell shares is written without it.
 * tinier adds "?s=…" to whatever link it held, so "?d?s=…" reads as "?d&s=…".
 * A payload that starts "E" is sealed under a password (kit/share/crypt.ts): `sealed` says so, and the shell asks
 * for the password before anything of the document is shown. "…?show" is a
 * deck's show link: it opens presenting. "#/v2/<app>.embed/<payload>" is the embed view: the pages alone, for
 * another site's frame (served at "<site>embed/", the one address the site lets be framed).
 * "…?lang=<code>" is the language the page is in, when one was chosen in the menu (Paul, 2026-10-11: "Why are we
 * writing language at all instead of encoding the parameter in the link?"): the home page carries it too ("#/?lang=ht"),
 * a link opens in it, and nothing of it is written to the device. A link made by someone who never chose has none, and
 * opens in its reader's browser's language. (kit/core/i18n.ts; the shell keeps it in the address, withLang.)
 * The payload is written with a "+" after every 300 characters, for iMessage (kit/core/codec.ts withBreaks), and read
 * without them, or anything else its version's letters do not hold (cleanPayload): a Route's payload never holds one.
 * Pure: the shell and the tests both read links through here.
 */

import { cleanPayload, isSealed, payloadVersion, withBreaks } from './codec.ts';

/**
 * The version of the link format, the one links are written in: a document's TLO text (docs/tlo.md) packed by
 * kit/core/codec.ts, 2 in base62 with a checksum, 1 in base64url. Version 1 is read forever; nothing newer than this
 * is read (a link a newer Tiny Little Office made says so).
 */
export const LINK_VERSION = 2;
/** What every document's link starts with, after the "#". */
export const LINK = `#/v${LINK_VERSION}/`;

export interface Route {
  /** The app's id, or null when the link is not a document (the home page). */
  app: string | null;
  payload: string;
  version: number;
  /** The view asked for ('' for the editor). */
  view: string;
  /** Shown as its pages to read (the Display Link), not opened in the editor. */
  display: boolean;
  /** Arrived by a short link: its id, and when it expires (ms since the epoch); null otherwise. */
  arrived: { id: string; expires: number } | null;
  /** The payload is sealed under a password. */
  sealed: boolean;
  /** A deck's show link: opens presenting. (Absent, not false, when it is not one.) */
  show?: true;
  /** The language the link opens in, when its maker chose one. (Absent when none was.) */
  lang?: string;
  /** A Display Link shown as its text layer, not its pages (kit/text/text-view.ts). (Absent when it is not.) */
  text?: true;
}

const ROUTE = /^#\/v(\d+)\/([a-z][a-z0-9-]*)(?:\.([A-Za-z0-9.]+))?(?:\/([^?]*))?(?:\?(.*))?$/;
/** A language's code as src/i18n names its files: "ht", "pt-br", "zh-hant". */
const LANG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
/** Whether a code is a well-formed language code (the link's "lang", the API's and the command line's). */
export const isLang = (code: string) => LANG.test(code);
/** The language a query names, well formed, as a property to spread (absent when none). */
const langOf = (q: URLSearchParams) => {
  const lang = q.get('lang') ?? '';
  return isLang(lang) ? { lang } : {};
};

/** The shell's flush (kit/core/shell.ts flushLink): the link brought up to the document, which it follows only when typing pauses. */
let flusher: () => void = () => {};
export const onFlush = (fn: () => void) => void (flusher = fn);
/** The address with the document as it is now: whatever reads the link as the document outside the shell reads it here. */
export function currentHash(): string {
  flusher();
  return typeof location === 'undefined' ? '' : location.hash;
}

export function parseHash(hash: string): Route {
  const m = ROUTE.exec(hash);
  if (!m) {
    const at = hash.indexOf('?');
    const q = new URLSearchParams(at < 0 ? '' : hash.slice(at + 1).replace(/\?/g, '&'));
    return { app: null, payload: '', version: LINK_VERSION, view: '', display: false, arrived: null, sealed: false, ...langOf(q) };
  }
  const q = new URLSearchParams((m[5] ?? '').replace(/\?/g, '&'));
  const id = q.get('s') ?? '',
    x = q.get('x') ?? '';
  const arrived = /^[a-z0-9]{7}$/.test(id) && /^\d{1,15}$/.test(x) ? { id, expires: Number(x) } : null;
  const version = parseInt(m[1], 10);
  const payload = cleanPayload(m[4] ?? '');
  return {
    app: m[2],
    payload,
    version,
    view: m[3] ?? '',
    display: q.has('d'),
    arrived,
    sealed: isSealed(payload),
    ...(q.has('show') ? { show: true as const } : {}),
    ...langOf(q),
    ...(q.has('text') ? { text: true as const } : {}),
  };
}

/**
 * The fragment for a document, optionally as a view; with `display`, the Display Link; with `arrived`, the short link it
 * came by and when that expires; with `lang`, the language it opens in. It is of the version its payload is: a payload
 * packed now is v2's, and one a v1 link brought and nobody has changed stays under "#/v1/", so the library knows the
 * link it kept and a copy of the site from before v2 still opens it.
 */
export function routeHash(app: string, payload = '', view = '', display = false, arrived: Route['arrived'] = null, lang: string | null = null): string {
  const parts = [...(display ? ['d'] : []), ...(arrived ? [`s=${arrived.id}`, `x=${arrived.expires}`] : []), ...(lang ? [`lang=${lang}`] : [])];
  const query = parts.length ? `?${parts.join('&')}` : '';
  const prefix = payloadVersion(payload) === 1 ? '#/v1/' : LINK;
  return `${prefix}${app}${view ? '.' + view : ''}${payload ? '/' + withBreaks(payload) : ''}${query}`;
}

/**
 * The site's own address, from any address of it: the page's folder, less an app's own page ("/sheet/") or the embed
 * page's ("/embed/"). The site need not be at a host's root: "https://aboard-io.github.io/tinylittleoffice/sheet/#/v2/…"
 * is a page of the site at "https://aboard-io.github.io/tinylittleoffice/", the mirror on GitHub Pages (docs/mirror.md).
 * `isApp` says whether a folder's name is an app's.
 */
export function siteOf(href: string, isApp: (id: string) => boolean): string {
  const u = new URL(href);
  const dir = u.pathname.replace(/[^/]*$/, '');
  const last = dir.split('/').slice(-2)[0];
  return `${u.origin}${last && (isApp(last) || last === 'embed') ? dir.slice(0, -(last.length + 1)) : dir}`;
}

/**
 * The address with a preview card's id taken out (kit/share/card.ts): a link shared with a network carries it for the
 * network's fetcher alone, in its path ("/c/<id>", whose page becomes the app's own page when the hash names an app,
 * or the site's root), or, before 2026-10-15, as ?c= on the app's page. The document is the hash's, untouched.
 */
export function withoutCard(href: string, isApp: (id: string) => boolean): string {
  const here = new URL(href);
  const shared = /^(.*\/)c\/[a-z0-9]{7}$/.exec(here.pathname);
  if (shared) {
    const app = parseHash(here.hash).app;
    here.pathname = `${shared[1]}${app && isApp(app) ? `${app}/` : ''}`;
  }
  here.searchParams.delete('c');
  return here.href;
}

/** The address with "text" in its query or taken out, the rest as it was ("?d?s=…" read as "?d&s=…"). */
export function withText(hash: string, on: boolean): string {
  const at = hash.indexOf('?');
  const base = at < 0 ? hash : hash.slice(0, at);
  const params = (at < 0 ? '' : hash.slice(at + 1)).split(/[?&]/).filter((p) => p && p !== 'text');
  if (on) params.push('text');
  return params.length ? `${base}?${params.join('&')}` : base;
}

/**
 * Any address in the site with its language put in, changed or taken out (null), the rest as it was: the home page,
 * a document, the compare view. An empty address with no language stays empty.
 */
export function withLang(hash: string, lang: string | null): string {
  const at = hash.indexOf('?');
  const path = at < 0 ? hash || (lang ? '#/' : '') : hash.slice(0, at);
  const parts = (at < 0 ? [] : hash.slice(at + 1).split(/[?&]/)).filter((p) => p && !p.startsWith('lang='));
  if (lang) parts.push(`lang=${lang}`);
  return parts.length ? `${path}?${parts.join('&')}` : path;
}

/**
 * Go to another address in the site: a template chosen, a file opened, a hand-off. The shell may ask first
 * (kit/core/shell.ts: a document that lives nowhere but its link); a link a person follows is asked about the same way.
 * Whether it went now (false: asked, and it goes once the person says so).
 */
export function go(hash: string): boolean {
  const now = window.dispatchEvent(new CustomEvent('to-leave', { cancelable: true, detail: hash }));
  if (now) location.hash = hash;
  return now;
}
