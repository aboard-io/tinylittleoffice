/**
 * Private or Saved: whether the device keeps anything. Private (the default) writes nothing: no cookies,
 * no storage, no trace. Saved keeps the preferences (theme, language), and the copy of the app for working
 * offline, and the documents opened here (kit/library.ts); later, a signing key. Turned back to Private, everything goes.
 */
import { keeping, setKeeping, store } from './store.ts';
import { dropOffline } from './offline.ts';

/** The preferences this site may keep, by key. */
export const PREFS = ['to-theme', 'tinyoffice.lang'];

const listeners = new Set<() => void>();
export function onPrivacy(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export { keeping };

/** The switch, turned: keep things from now on, or forget all of it and keep nothing. */
export async function setPrivate(privately: boolean) {
  setKeeping(!privately);
  if (privately) {
    store.remove('tinyoffice.offline');
    await dropOffline();
  }
  for (const cb of listeners) cb();
}

export const prefsKept = (): number => PREFS.filter((k) => store.get(k) !== null).length;
