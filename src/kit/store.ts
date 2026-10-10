/**
 * The one place the site keeps anything on the device. Private by default: settings live in memory for the
 * visit and nothing is written. Asked to keep things (the switch in the menu), it writes to localStorage
 * instead, and the preferences and what comes later follow. Private
 * again, every trace goes. The one key written in either state is the choice itself, and only when it is
 * "keep": a private visit writes nothing at all, but the language chosen in the menu (kit/i18n.ts, its own key),
 * which stays through Private and Saved alike and is the one thing a private visit leaves.
 */
const KEEP = 'tinyoffice.keep';
const memory = new Map<string, string>();
/** The keys this site writes; anything else in localStorage is not ours to touch. */
const ours = (k: string) => k !== KEEP && k !== 'tinyoffice.lang' && (k.startsWith('tinyoffice.') || k === 'to-theme');

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

/** Keep things from now on (what the visit has set so far comes along), or stop: the device forgets all of it, the visit keeps its settings in memory. */
export function setKeeping(on: boolean) {
  const l = local();
  if (!l) return;
  if (on) {
    l.setItem(KEEP, '1');
    for (const [k, v] of memory) l.setItem(k, v);
    memory.clear();
  } else {
    for (const k of store.keys()) {
      memory.set(k, l.getItem(k)!);
      l.removeItem(k);
    }
    l.removeItem(KEEP);
  }
}
