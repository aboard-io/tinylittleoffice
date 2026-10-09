/**
 * Privacy, in one place: everything that protects a document or touches what the device keeps.
 *
 *   - Private or Saved: whether the device keeps anything. Private (the default) writes nothing: no cookies,
 *     no storage, no trace. Saved keeps the preferences, the copy of the app for working offline, the
 *     documents opened here (kit/library.ts), the short links' owner links (kit/links.ts) and the signing
 *     key. Turned back to Private, all of it goes from the device, the key from the visit too.
 *   - The password: a document sealed (kit/crypt.ts) and opened, here. A password is never kept, under
 *     Saved or not: the key that opened a document stays in memory for the visit, so it opens again
 *     without asking.
 *   - The signature: this device's key made, shown, exported, imported and forgotten (kit/sign.ts, kept
 *     through kit/store.ts, so under Private it lives for the visit); a document signed, and checked.
 *   - What the device holds, item by item, and everything kept in one zip.
 *
 * The shell and <to-privacy> (kit/privacy-dialog.ts) only call this.
 */
import { keeping, setKeeping, store } from './store.ts';
import { dropOffline, offlineOn } from './offline.ts';
import { decodeDoc, encodeDoc, isSealed, packDoc, unpackDoc } from './codec.ts';
import { newLocker, PBKDF2_ITERATIONS, seal, unseal, unsealWith, type Locker } from './crypt.ts';
import { createSigner, fingerprintOf, verify } from './sign.ts';
import { isoMinute, messageOf, readEnvelope } from './envelope.ts';
import { withHead } from '../doc/tlo.ts';
import { forgetAll, library } from './library.ts';
import { keptLinks } from './links.ts';
import { parseHash } from './route.ts';
import { slug } from './draw.ts';

/** The preferences this site may keep, by key. */
export const PREFS = ['to-theme', 'tinyoffice.lang', 'tinyoffice.pictures', 'tinyoffice.shortTtl', 'tinyoffice.name'];
/** Where the key, the signer's name and the owner links are kept. */
const KEY = 'tinyoffice.key';
const NAME = 'tinyoffice.name';
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

/** The switch, turned: keep things from now on, or forget all of it (the signing key with it) and keep nothing. */
export async function setPrivate(privately: boolean) {
  setKeeping(!privately);
  if (privately) {
    store.remove(KEY);
    store.remove('tinyoffice.offline');
    await dropOffline();
  }
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

/* ---------- the signature ---------- */

const signer = createSigner({ get: () => store.get(KEY), set: (v) => store.set(KEY, v), remove: () => store.remove(KEY) });

/**
 * A document's signature as checked against its text now: none; valid; stale (this device's key signed it
 * and it has changed since: sign again); invalid (it does not match what is here, whoever signed it).
 */
export type SigState = 'none' | 'valid' | 'stale' | 'invalid';
export interface Signature {
  state: SigState;
  /** The name it was signed under, if any. */
  by?: string;
  /** The signing key's fingerprint. */
  fingerprint?: string;
  /** Signed with this device's key. */
  mine?: boolean;
}

export async function checkSignature(app: string, text: string): Promise<Signature> {
  const env = readEnvelope(text);
  if (!env.key || !env.sig) return { state: 'none' };
  const [ok, fingerprint, me] = await Promise.all([verify(env.key, env.sig, messageOf(app, text)), fingerprintOf(env.key), signer.publicKey()]);
  const mine = me === env.key;
  return { state: ok ? 'valid' : mine ? 'stale' : 'invalid', ...(env.by ? { by: env.by } : {}), fingerprint, mine };
}

/** The name signatures are made under, as given last; '' until one is. */
export const signerName = (): string => store.get(NAME) ?? '';

/**
 * The envelope's keys that sign this text with this device's key (made now if there is none): the name, the
 * creation time (now, if it has none), the public key and the signature, for the shell to put in the head.
 */
export async function signText(app: string, text: string, by: string, now = Date.now()): Promise<{ by: string; created: string; key: string; sig: string }> {
  const name = by.replace(/\s+/g, ' ').trim();
  if (name) store.set(NAME, name);
  const created = isoMinute(readEnvelope(text).created ?? now);
  const unsigned = withHead(text, { by: name, created, key: '', sig: '' });
  const { key, sig } = await signer.sign(messageOf(app, unsigned));
  changed();
  return { by: name, created, key, sig };
}

/* ---------- the key ---------- */

/** This device's key's fingerprint, or null when it has none. */
export const myFingerprint = (): Promise<string | null> => signer.fingerprint();
/** The key as text, to keep somewhere safe or take to another device (made now if there is none). */
export async function exportKey(): Promise<string> {
  const text = await signer.exportKey();
  changed();
  return text;
}
/** A key exported from another device, used here from now on: its fingerprint. Throws for anything that is not one. */
export async function importKey(text: string): Promise<string> {
  const fp = await signer.importKey(text.trim());
  changed();
  return fp;
}
export function forgetKey() {
  signer.forget();
  changed();
}

/* ---------- what the device holds ---------- */

export interface Holdings {
  /** Preferences set (theme, language, the name signatures go under…). */
  prefs: number;
  /** The copy of the app for working offline. */
  offline: boolean;
  /** Documents in the library. */
  documents: number;
  /** Short links' owner links. */
  links: number;
  /** The signing key's fingerprint, or null. */
  key: string | null;
}

export async function holdings(): Promise<Holdings> {
  return { prefs: prefsKept(), offline: offlineOn(), documents: library().length, links: keptLinks().length, key: await myFingerprint() };
}

export function forgetPrefs() {
  for (const k of PREFS) store.remove(k);
  changed();
}
export function forgetDocuments() {
  forgetAll();
  changed();
}
export function forgetLinks() {
  store.remove(LINKS);
  changed();
}
export async function forgetOffline() {
  store.remove('tinyoffice.offline');
  await dropOffline();
  changed();
}
/** Forget everything this site keeps here, the key with it, and keep nothing from now on. */
export async function forgetEverything() {
  signer.forget();
  for (const k of store.keys()) store.remove(k);
  await setPrivate(true);
}

/**
 * Every document kept here as a file, in a folder by app: its text as .tlo; one under a password as its link
 * in a .txt (its text is not to be had without the password). With `withKey`, the signing key too. `base`
 * is the address a link starts with.
 */
export async function everything(withKey: boolean, base: string): Promise<Record<string, string>> {
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
  if (withKey && (await myFingerprint())) files['signing-key.json'] = await exportKey();
  return files;
}
