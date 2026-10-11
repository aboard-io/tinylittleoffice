/**
 * The link: "#/v1/<app>/<payload>". The document lives after the "#", which a browser never sends to a
 * server. "#/v1/<app>.<view>/<payload>" opens the document as a view: a file to download on arrival
 * ("text.pdf"), or a way of showing it. "#/v1/<app>/<payload>?s=<id>&k=<key>&o=<o>" is how the owner of a
 * short link arrives from tinier (kit/short.ts): the query after the payload names the short link they may
 * update, and stays in the address while they edit; every link the shell shares is written without it.
 * "…?d" is the Display Link: the same document shown as its pages, to read or print, with an Edit button
 * (never inside the payload, so the document is the same bytes either way). tinier hands an owner on by
 * adding "?s=…" to whatever link it held, so "?d?s=…" reads as "?d&s=…". Everyone who arrives by a short link
 * arrives with "?s=<id>&x=<expires>" (ms since the epoch), the owner with k and o too: the shell shows how long
 * the link has left (Paul, 2026-10-09), and keeps x in the address beside the owner's query.
 * A payload that starts "E" is sealed under a password (kit/crypt.ts): `sealed` says so, and the shell asks
 * for the password before anything of the document is shown. "…?show" is a
 * deck's show link: it opens presenting. "#/v1/<app>.embed/<payload>" is the embed view: the pages alone, for
 * another site's frame (served at "<site>embed/", the one address the site lets be framed).
 * "…?lang=<code>" is the language the page is in, when one was chosen in the menu (Paul, 2026-10-11: "Why are we
 * writing language at all instead of encoding the parameter in the link?"): the home page carries it too ("#/?lang=ht"),
 * a link opens in it, and nothing of it is written to the device. A link made by someone who never chose has none, and
 * opens in its reader's browser's language. (kit/i18n.ts; the shell keeps it in the address, withLang.)
 * Pure: the shell and the tests both read links through here.
 */

import { isSealed } from './codec.ts';

/** The version of the link format. 1 is the rebuilt format; nothing older is read. */
export const LINK_VERSION = 1;
/** What every document's link starts with, after the "#". */
export const LINK = `#/v${LINK_VERSION}/`;

/** A short link this document's owner may update: its id, the AES key, and the owner key o. All three base64url. */
export interface Owned {
  id: string;
  key: string;
  o: string;
}

export interface Route {
  /** The app's id, or null when the link is not a document (the home page). */
  app: string | null;
  payload: string;
  version: number;
  /** The view asked for ('' for the editor). */
  view: string;
  /** The short link this document arrived from as its owner, or null. */
  owned: Owned | null;
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
}

const ROUTE = /^#\/v(\d+)\/([a-z][a-z0-9-]*)(?:\.([A-Za-z0-9.]+))?(?:\/([^?]*))?(?:\?(.*))?$/;
const B64 = /^[A-Za-z0-9_~-]+$/;
/** A language's code as src/i18n names its files: "ht", "pt-br", "zh-hant". */
const LANG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
/** The language a query names, well formed, as a property to spread (absent when none). */
const langOf = (q: URLSearchParams) => {
  const lang = q.get('lang') ?? '';
  return LANG.test(lang) ? { lang } : {};
};

/** The owner's query, "s=<id>&k=<key>&o=<o>", read; null unless all three are there and well formed. */
function parseOwned(q: URLSearchParams): Owned | null {
  const id = q.get('s') ?? '',
    key = q.get('k') ?? '',
    o = q.get('o') ?? '';
  return /^[a-z0-9]{7}$/.test(id) && B64.test(key) && B64.test(o) ? { id, key, o } : null;
}

/** The shell's flush (kit/shell.ts flushLink): the link brought up to the document, which it follows only when typing pauses. */
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
    return { app: null, payload: '', version: LINK_VERSION, view: '', owned: null, display: false, arrived: null, sealed: false, ...langOf(q) };
  }
  const q = new URLSearchParams((m[5] ?? '').replace(/\?/g, '&'));
  const id = q.get('s') ?? '',
    x = q.get('x') ?? '';
  const arrived = /^[a-z0-9]{7}$/.test(id) && /^\d{1,15}$/.test(x) ? { id, expires: Number(x) } : null;
  return {
    app: m[2],
    payload: m[4] ?? '',
    version: parseInt(m[1], 10),
    view: m[3] ?? '',
    owned: parseOwned(q),
    display: q.has('d'),
    arrived,
    sealed: isSealed(m[4] ?? ''),
    ...(q.has('show') ? { show: true as const } : {}),
    ...langOf(q),
  };
}

/** The fragment for a document, optionally as a view; with `owned`, carrying the short link its owner may update; with `display`, the Display Link; with `arrived`, the short link it came by and when that expires; with `lang`, the language it opens in. */
export function routeHash(app: string, payload = '', view = '', owned: Owned | null = null, display = false, arrived: Route['arrived'] = null, lang: string | null = null): string {
  const tie = owned ? [`s=${owned.id}`, `k=${owned.key}`, `o=${owned.o}`] : arrived ? [`s=${arrived.id}`] : [];
  const parts = [...(display ? ['d'] : []), ...tie, ...(arrived && (!owned || owned.id === arrived.id) ? [`x=${arrived.expires}`] : []), ...(lang ? [`lang=${lang}`] : [])];
  const query = parts.length ? `?${parts.join('&')}` : '';
  return `${LINK}${app}${view ? '.' + view : ''}${payload ? '/' + payload : ''}${query}`;
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
 * (kit/shell.ts: a document that lives nowhere but its link); a link a person follows is asked about the same way.
 * Whether it went now (false: asked, and it goes once the person says so).
 */
export function go(hash: string): boolean {
  const now = window.dispatchEvent(new CustomEvent('to-leave', { cancelable: true, detail: hash }));
  if (now) location.hash = hash;
  return now;
}
