/**
 * A document locked with a password, placed inside another. Its link is sealed (`E…`, kit/crypt.ts) and
 * carries nothing in the clear but its app: not its title, not a word. So the outer document holds the link
 * itself, in a fence the kit knows by "locked" (as it knows "qr"):
 *
 *   ```locked
 *   #/v1/write/E…
 *   ```
 *
 * and every place that draws a placed document draws it as a locked card, at the card's normal size for its
 * app: the lock, "Locked with a password", the app's icon and name. The registry's lookup knows the fence
 * (kit/apps.ts), so a text's pages, a slide, a print and every export draw the card with no
 * code of their own. In an editor a tap asks for the password (kit/locked-doc.ts) and, opened, the card
 * draws the document (`view(…, { open: true })`), the opened copy held in memory for this visit alone and
 * never written into the outer document, whose link goes on holding the sealed one. A fence whose link
 * cannot be read draws the "cannot be read" card instead.
 *
 * Pure: no DOM, so the build and the node tests draw it.
 */
import { Lock } from 'lucide';
import { lookup, type AppDef, type Page, type ViewOpts } from './app.ts';
import { LINE, MUTED, INK, SHADE, rect, text } from './draw.ts';
import { t } from './i18n.ts';
import { iconGlyph } from './icons.ts';
import { parseHash, routeHash } from './route.ts';
import type { Block } from '../doc/index.ts';

export const LOCKED_LANG = 'locked';

/**
 * Said when a password does not open a sealed link. AES-GCM cannot tell a wrong password from a link cut short in a
 * chat, so it says both, the cut first-hand: a person sure of their password asks for the link again.
 */
export const notOpened = () => t('That password does not open this link. If you are sure of it, the link may have been cut short when it was copied: ask for it again, or for a short link.');

/** The fence that holds a sealed document by its link. */
export const lockedFence = (app: string, payload: string): Block => ({ k: 'fence', lang: LOCKED_LANG, body: routeHash(app, payload) });

/** A locked fence's app and sealed payload, or null for a body that is not a sealed document's link (of an app here). */
export function lockedOf(body: string): { app: string; payload: string } | null {
  const { app, payload, sealed } = parseHash(body.trim());
  return app && sealed && lookup.appOf(app) && app !== LOCKED_LANG ? { app, payload } : null;
}

/** The address a placed document opens at: a locked one's own link; else its text packed into one (`encode`). */
export const placedLink = (lang: string, body: string, encode: (text: string) => string, site = ''): string => site + (lang === LOCKED_LANG ? body.trim() : routeHash(lang, encode(body)));

/* ---------- opened this visit ---------- */

/** The documents opened this visit, by their sealed payload: memory only, never written. */
const opened = new Map<string, string>();
/** A sealed payload's text, opened this visit. */
export const openedText = (payload: string): string | undefined => opened.get(payload);
/** Whether a locked fence's document has been opened this visit. */
export const isOpened = (body: string): boolean => {
  const it = lockedOf(body);
  return !!it && opened.has(it.payload);
};
/** A sealed payload opened: its text kept for the visit. */
export const setOpened = (payload: string, text: string) => void opened.set(payload, text);
/** Everything opened forgotten (the tests). */
export const forgetOpened = () => opened.clear();

/* ---------- the card ---------- */

/** The card's size: the app's own small page, a blank one's. */
const sizes = new Map<string, { w: number; h: number }>();
function sizeOf(def: AppDef): { w: number; h: number } {
  let s = sizes.get(def.id);
  if (!s) {
    const p = def.view(def.blank(), { small: true })[0];
    s = p ? { w: p.w, h: p.h } : { w: 480, h: 320 };
    sizes.set(def.id, s);
  }
  return s;
}

/** The locked card for a document of `def`: the lock, the words, the app's icon and name, in the middle of its page. */
export function lockedCard(def: AppDef): Page {
  const { w, h } = sizeOf(def);
  const u = Math.max(0.5, Math.min(w, h) / 320);
  const words = t('Locked with a password');
  const cy = h / 2;
  const lock = 40 * u;
  const appSize = 18 * u;
  const name = def.name;
  const nameW = name.length * 14 * u * 0.52;
  const rowW = appSize + 8 * u + nameW;
  const svg =
    rect(0, 0, w, h, SHADE) +
    rect(1, 1, w - 2, h - 2, 'none', `stroke="${LINE}" stroke-width="2" rx="${8 * u}"`) +
    iconGlyph(Lock, w / 2 - lock / 2, cy - lock - 24 * u, lock, INK) +
    text(w / 2, cy + 8 * u, words, { px: 18 * u, bold: true, anchor: 'middle' }) +
    iconGlyph(def.icon, w / 2 - rowW / 2, cy + 26 * u, appSize, MUTED) +
    text(w / 2 - rowW / 2 + appSize + 8 * u, cy + 26 * u + appSize * 0.75, name, { px: 14 * u, fill: MUTED });
  return { w, h, svg, alt: t('A {app} document, locked with a password', { app: name }) };
}

/** A placed document that cannot be read: said so, on a card of its own. */
export function unreadableCard(): Page {
  const w = 480;
  const h = 200;
  const words = t('This document cannot be read.');
  return {
    w,
    h,
    svg: rect(0, 0, w, h, SHADE) + rect(1, 1, w - 2, h - 2, 'none', `stroke="${LINE}" stroke-width="2" rx="8"`) + text(w / 2, h / 2 + 6, words, { px: 16, fill: MUTED, anchor: 'middle' }),
    alt: words,
  };
}

/** A locked fence drawn: the locked card; in an editor (`open`), the document itself once opened this visit. */
export function lockedPage(body: string, opts: ViewOpts = {}): Page {
  const it = lockedOf(body);
  if (!it) return unreadableCard();
  const def = lookup.appOf(it.app)!;
  const text = opts.open ? openedText(it.payload) : undefined;
  if (text !== undefined) return def.view(text, { ...opts, open: false })[0] ?? lockedCard(def);
  return lockedCard(def);
}

/** How the lookup knows a locked fence: enough of a definition for the hosts to draw it, and a name for its caption. */
export const lockedDoc: AppDef = {
  id: LOCKED_LANG,
  get name() {
    return t('Locked document');
  },
  get noun() {
    return t('locked document');
  },
  group: '',
  icon: Lock,
  get blurb() {
    return t('A document locked with a password');
  },
  blank: () => '',
  templates: [],
  editor: () => Promise.reject(new Error('A locked document is opened in its own app')),
  title: () => '',
  retitle: (doc) => doc,
  view: (body, opts) => [lockedPage(body, opts)],
};
