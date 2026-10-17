/**
 * Privacy, in one place: everything that protects a document or touches what the device keeps.
 *
 *   - Private or Saved: whether the device keeps anything. Private (the default) writes nothing of the site's
 *     but the size of everything and the theme (kit/core/store.ts): no cookies. The language is in the link, never on the
 *     device (kit/core/i18n.ts). The browser's own history still
 *     holds every link opened, and a link is the document; that is not ours to clear. Saved keeps the preferences, the documents
 *     opened here (kit/share/library.ts) and the short links made here (kit/share/kept-links.ts), and the site itself
 *     is kept for offline by its service worker (kit/share/offline.ts). Turned back to Private, all of it goes from the
 *     device, the worker and its caches with it.
 *   - The password: a document sealed (kit/share/crypt.ts) and opened, here. A password is never kept, under
 *     Saved or not: the key that opened a document stays in memory for the visit, so it opens again
 *     without asking.
 *   - What the device holds, item by item.
 *
 * The shell and <to-privacy> (kit/ui/privacy-dialog.ts) only call this.
 */
import { forgetOpened } from './locked.ts';
import { keeping, setKeeping, store } from '../core/store.ts';
import { newLocker, reopenWith, unlock as opened, type Locker } from './crypt.ts';
import { forgetAll, keepAll, library, type Kept } from './library.ts';
import { keptLinks } from './kept-links.ts';
import { keepOffline } from './offline.ts';

/** The preferences this site may keep, by key; with them which documents have been told they are copies (kit/core/shell.ts). */
export const PREFS = ['to-theme', 'tinyoffice.shortTtl', 'tinyoffice.size', 'tinyoffice.copiesSaid'];
/** Where the short links made here are kept. */
const LINKS = 'tinyoffice.links';

const listeners = new Set<() => void>();
export function onPrivacy(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
const changed = () => {
  for (const cb of listeners) cb();
};

export { keeping };

/**
 * The switch, turned: keep things from now on, or forget all of it and keep nothing: what the device holds, and
 * what this visit holds in memory too, the passwords given and the texts they opened (Paul, 2026-10-12: "Are we
 * sure when I turn stuff off no cookies or local storage or in memory remains").
 */
export async function setPrivate(privately: boolean) {
  setKeeping(!privately);
  if (privately) {
    lockers.length = 0;
    forgetOpened();
  }
  changed();
  await keepOffline(!privately);
}

export const prefsKept = (): number => PREFS.filter((k) => store.get(k) !== null).length;

/* ---------- the password ---------- */

/** The keys that opened documents this visit: memory only, never written. */
const lockers: Locker[] = [];

/** A new password's locker. */
export const lockWith = (password: string): Promise<Locker> => newLocker(password);

/** A password tried on a sealed payload (crypt.ts unlock), its locker kept for the visit: the text and the locker, or null. */
export async function unlock(password: string, payload: string): Promise<{ text: string; locker: Locker } | null> {
  const r = await opened(password, payload);
  if (r) lockers.push(r.locker);
  return r;
}

/** A sealed payload opened by a password already given this visit, or null. */
export async function reopen(payload: string): Promise<{ text: string; locker: Locker } | null> {
  for (const locker of lockers) {
    const text = await reopenWith(locker, payload);
    if (text !== null) return { text, locker };
  }
  return null;
}
/** A locker made here (a password set) opens its document again this visit too. */
export const remember = (locker: Locker) => void (lockers.includes(locker) || lockers.push(locker));

/* ---------- what the device holds ---------- */

export interface Holdings {
  /** Preferences set (theme, size…). */
  prefs: number;
  /** Documents in the library. */
  documents: number;
  /** The short links made here. */
  links: number;
}

export async function holdings(): Promise<Holdings> {
  return { prefs: prefsKept(), documents: library().length, links: keptLinks().length };
}

export function forgetPrefs() {
  for (const k of PREFS) store.remove(k);
  changed();
}
export function forgetDocuments() {
  forgetAll();
  changed();
}
/** Documents kept at once (a zip of them opened, kit/file/open.ts), what shows them told: how many were new. */
export function keepDocuments(entries: Omit<Kept, 'id' | 'at'>[]): number {
  const n = keepAll(entries);
  changed();
  return n;
}
export function forgetLinks() {
  store.remove(LINKS);
  changed();
}
/** Forget everything this site keeps here, and keep nothing from now on. */
export async function forgetEverything() {
  for (const k of store.keys()) store.remove(k);
  await setPrivate(true);
}
