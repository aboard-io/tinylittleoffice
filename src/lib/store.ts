/**
 * The one place this site keeps anything on the device. Private by
 * default: settings live in memory for the visit and nothing is written.
 * Asked to keep things (the switch in the header), it writes to
 * localStorage instead, and the library, the signing key, the offline
 * copy and the preferences all follow. Private again, every trace goes.
 *
 * The one key written in either state is the choice itself, and only
 * when it is "keep": a private visit writes nothing at all.
 */
const KEEP = 'tinyoffice.keep';
const memory = new Map<string, string>();
/** The keys this site writes; anything else in localStorage is not ours to touch. */
const ours = (k: string) => k !== KEEP && (k.startsWith('tinyoffice.') || k === 'to-theme');

function local(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** Whether things are kept on this device. */
export function keeping(): boolean {
  return local()?.getItem(KEEP) === '1';
}

export const store = {
  get(key: string): string | null {
    return keeping() ? (local()?.getItem(key) ?? null) : (memory.get(key) ?? null);
  },
  set(key: string, value: string) {
    if (keeping()) local()?.setItem(key, value);
    else memory.set(key, value);
  },
  remove(key: string) {
    if (keeping()) local()?.removeItem(key);
    else memory.delete(key);
  },
  /** Every key of ours that holds something. */
  keys(): string[] {
    if (!keeping()) return [...memory.keys()];
    const l = local();
    return l ? Object.keys(l).filter(ours) : [];
  },
};

/** Keep things from now on (what the visit has set so far comes along), or stop and leave nothing. */
export async function setKeeping(on: boolean) {
  const l = local();
  if (!l) return;
  if (on) {
    l.setItem(KEEP, '1');
    for (const [k, v] of memory) l.setItem(k, v);
    memory.clear();
    keepOffline();
  } else {
    // What is set stays for the visit, in memory; the device forgets all of it.
    for (const k of store.keys()) {
      memory.set(k, l.getItem(k)!);
      l.removeItem(k);
    }
    l.removeItem(KEEP);
    await dropOffline();
  }
}

/** Take the offline copy of the app off the device. */
export async function dropOffline() {
  if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  if ('caches' in window) for (const k of await caches.keys()) await caches.delete(k);
}

/**
 * Keep the whole site on the device, so it opens with no connection (sw.js,
 * written by the build). Only when asked to keep things: private by default
 * means no offline copy either.
 */
export function keepOffline() {
  if (keeping() && 'serviceWorker' in navigator && !import.meta.env?.DEV) void navigator.serviceWorker.register(new URL('../../sw.js', import.meta.url)).catch(() => {});
}
