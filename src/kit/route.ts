/**
 * The link: "#/v1/<app>/<payload>". The document lives after the "#", which a browser never sends to a
 * server. "#/v1/<app>.<view>/<payload>" opens the document as a view: a file to download on arrival
 * ("text.pdf"), or a way of showing it.
 * "…?d" is the Display Link: the same document shown as its pages, to read or print, with an Edit button
 * (never inside the payload, so the document is the same bytes either way). Everyone who arrives by a short
 * link (kit/short.ts) arrives with "?s=<id>&x=<expires>" (ms since the epoch) after the payload: the shell
 * shows how long the link has left (Paul, 2026-10-09); every link the shell shares is written without it.
 * tinier adds "?s=…" to whatever link it held, so "?d?s=…" reads as "?d&s=…".
 * A payload that starts "E" is sealed under a password (kit/crypt.ts): `sealed` says so, and the shell asks
 * for the password before anything of the document is shown. "…?show" is a
 * deck's show link: it opens presenting. "#/v1/<app>.embed/<payload>" is the embed view: the pages alone, for
 * another site's frame (served at "<site>embed/", the one address the site lets be framed).
 * Pure: the shell and the tests both read links through here.
 */

import { isSealed } from './codec.ts';

/** The version of the link format. 1 is the rebuilt format; nothing older is read. */
export const LINK_VERSION = 1;
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
}

const ROUTE = /^#\/v(\d+)\/([a-z][a-z0-9-]*)(?:\.([A-Za-z0-9.]+))?(?:\/([^?]*))?(?:\?(.*))?$/;

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
  if (!m) return { app: null, payload: '', version: LINK_VERSION, view: '', display: false, arrived: null, sealed: false };
  const q = new URLSearchParams((m[5] ?? '').replace(/\?/g, '&'));
  const id = q.get('s') ?? '',
    x = q.get('x') ?? '';
  const arrived = /^[a-z0-9]{7}$/.test(id) && /^\d{1,15}$/.test(x) ? { id, expires: Number(x) } : null;
  return {
    app: m[2],
    payload: m[4] ?? '',
    version: parseInt(m[1], 10),
    view: m[3] ?? '',
    display: q.has('d'),
    arrived,
    sealed: isSealed(m[4] ?? ''),
    ...(q.has('show') ? { show: true as const } : {}),
  };
}

/** The fragment for a document, optionally as a view; with `display`, the Display Link; with `arrived`, the short link it came by and when that expires. */
export function routeHash(app: string, payload = '', view = '', display = false, arrived: Route['arrived'] = null): string {
  const parts = [...(display ? ['d'] : []), ...(arrived ? [`s=${arrived.id}`, `x=${arrived.expires}`] : [])];
  const query = parts.length ? `?${parts.join('&')}` : '';
  return `${LINK}${app}${view ? '.' + view : ''}${payload ? '/' + payload : ''}${query}`;
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
