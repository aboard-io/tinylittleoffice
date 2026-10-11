/**
 * Privacy, in one place: everything that protects a document or touches what the device keeps.
 *
 *   - Private or Saved: whether the device keeps anything. Private (the default) writes nothing of the site's
 *     but the language chosen in the menu (kit/i18n.ts): no cookies, no storage. The browser's own history still
 *     holds every link opened, and a link is the document; that is not ours to clear. Saved keeps the preferences, the documents
 *     opened here (kit/library.ts) and the short links' owner links (kit/links.ts). Turned back to
 *     Private, all of it goes from the device. Forget everything forgets the language chosen as well.
 *   - The password: a document sealed (kit/crypt.ts) and opened, here. A password is never kept, under
 *     Saved or not: the key that opened a document stays in memory for the visit, so it opens again
 *     without asking.
 *   - What the device holds, item by item, and everything kept in one zip.
 *
 * The shell and <to-privacy> (kit/privacy-dialog.ts) only call this.
 */
import { keeping, setKeeping, store } from './store.ts';
import { decodeDoc, encodeDoc, isSealed, packDoc, unpackDoc } from './codec.ts';
import { newLocker, PBKDF2_ITERATIONS, seal, unseal, unsealWith, type Locker } from './crypt.ts';
import { forgetAll, keepAll, library, type Kept } from './library.ts';
import { keptLinks } from './links.ts';
import { parseHash } from './route.ts';
import { slug } from './draw.ts';
import { forgetLanguage } from './i18n.ts';

/** The preferences this site may keep, by key. */
export const PREFS = ['to-theme', 'tinyoffice.lang', 'tinyoffice.shortTtl', 'tinyoffice.size'];
/** Where the owner links are kept. */
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

/** The switch, turned: keep things from now on, or forget all of it and keep nothing. */
export async function setPrivate(privately: boolean) {
  setKeeping(!privately);
  changed();
}

export const prefsKept = (): number => PREFS.filter((k) => store.get(k) !== null).length;

/* ---------- the password ---------- */

/** How slow a password is to try. Lowered by the tests alone, for sealing and opening at once. */
export const lockCost = { iterations: PBKDF2_ITERATIONS };
/** The keys that opened documents this visit: memory only, never written. */
const opened: Locker[] = [];

/** A new password's locker. */
export const lockWith = (password: string): Promise<Locker> => newLocker(password, lockCost.iterations);

/** A document's text as its link's payload: sealed under the locker when there is one. */
export async function pack(text: string, locker: Locker | null): Promise<string> {
  if (!locker) return encodeDoc(text);
  const { flag, bytes } = packDoc(text);
  return seal(locker, flag, bytes);
}

/** A password tried on a sealed payload: the text and its locker, or null when it is not the password. */
export async function unlock(password: string, payload: string): Promise<{ text: string; locker: Locker } | null> {
  const r = await unseal(password, payload, lockCost.iterations);
  if (!r) return null;
  opened.push(r.locker);
  return { text: unpackDoc(r.flag, r.bytes), locker: r.locker };
}

/** A sealed payload opened by a password already given this visit, or null. */
export async function reopen(payload: string): Promise<{ text: string; locker: Locker } | null> {
  for (const locker of opened) {
    const r = await unsealWith(locker, payload);
    if (r) return { text: unpackDoc(r.flag, r.bytes), locker };
  }
  return null;
}
/** A locker made here (a password set) opens its document again this visit too. */
export const remember = (locker: Locker) => void (opened.includes(locker) || opened.push(locker));

/* ---------- what the device holds ---------- */

export interface Holdings {
  /** Preferences set (theme, language…). */
  prefs: number;
  /** Documents in the library. */
  documents: number;
  /** Short links' owner links. */
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
/** Documents kept at once (a zip of them opened, kit/open.ts), what shows them told: how many were new. */
export function keepDocuments(entries: Omit<Kept, 'id' | 'at'>[]): number {
  const n = keepAll(entries);
  changed();
  return n;
}
export function forgetLinks() {
  store.remove(LINKS);
  changed();
}
/** Forget everything this site keeps here, the language chosen with it, and keep nothing from now on. */
export async function forgetEverything() {
  for (const k of store.keys()) store.remove(k);
  forgetLanguage();
  await setPrivate(true);
}

/**
 * Every document kept here as a file, in a folder by app: its text as .tlo; one under a password as its link
 * in a .txt (its text is not to be had without the password). `base` is the address a link starts with.
 */
export async function everything(base: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const name = (dir: string, stem: string, ext: string) => {
    let path = `${dir}/${stem}.${ext}`;
    for (let n = 2; path in files; n++) path = `${dir}/${stem}-${n}.${ext}`;
    return path;
  };
  for (const k of library()) {
    const { payload } = parseHash(k.hash);
    if (isSealed(payload)) files[name(k.app, slug(k.title) || 'locked', 'txt')] = `${base}${k.hash}\n`;
    else {
      const text = decodeDoc(payload);
      if (text) files[name(k.app, slug(k.title) || 'untitled', 'tlo')] = text;
    }
  }
  return files;
}
