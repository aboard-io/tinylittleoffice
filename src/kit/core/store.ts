/**
 * The one place the site keeps anything on the device. Private by default: settings live in memory for the
 * visit and nothing is written. Asked to keep things (the switch in the menu), it writes to localStorage
 * instead, and the preferences and what comes later follow. Private
 * again, every trace goes. The one key written in either state is the choice itself, and only when it is
 * "keep": a private visit writes nothing about a document, but the size of everything (kit/ui/zoom.ts) and the theme
 * (kit/ui/theme.ts) stay through Private and Saved alike: they say nothing of a document, and a link opened from a
 * message at the wrong size is a wall to a person who reads at 200% (the review of 2026-10-11). Forget everything
 * forgets them with the rest. The language is never written here: the link carries it (kit/core/route.ts, kit/core/i18n.ts).
 */
const KEEP = 'tinyoffice.keep';
const memory = new Map<string, string>();
/** Preferences kept on the device in either state, written there straight through `store`. */
const DEVICE = ['tinyoffice.size', 'to-theme'];
/** The keys this site writes, and forgets when Private comes; anything else in localStorage is not ours to touch. */
const ours = (k: string) => k !== KEEP && !DEVICE.includes(k) && k.startsWith('tinyoffice.');

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
    return keeping() || DEVICE.includes(key) ? (local()?.getItem(key) ?? null) : (memory.get(key) ?? null);
  },
  set(key: string, value: string) {
    if (keeping() || DEVICE.includes(key)) local()?.setItem(key, value);
    else memory.set(key, value);
  },
  remove(key: string) {
    if (keeping() || DEVICE.includes(key)) local()?.removeItem(key);
    else memory.delete(key);
  },
  /** Every key of ours that holds something. */
  keys(): string[] {
    const l = local();
    const device = DEVICE.filter((k) => l?.getItem(k) != null);
    if (!keeping()) return [...memory.keys(), ...device];
    return l ? [...Object.keys(l).filter(ours), ...device] : [];
  },
};

/**
 * A page's own preference, kept where it says (kit/ui/theme.ts `keepThemeAt`, kit/ui/zoom.ts `keepSizeAt`): on the
 * device under its key, whatever Private or Saved says, since it is the page's and not the site's; or, with no key, in
 * memory for the visit alone.
 */
export function prefAt(key: string | null) {
  const mine = new Map<string, string>();
  return {
    get: (): string | null => (key === null ? (mine.get('') ?? null) : (local()?.getItem(key) ?? null)),
    set: (value: string) => void (key === null ? mine.set('', value) : local()?.setItem(key, value)),
    remove: () => void (key === null ? mine.delete('') : local()?.removeItem(key)),
  };
}

/**
 * Keep things from now on (what the visit has set so far comes along), or stop: every trace goes, from the device
 * and from memory alike, the size and the theme with the rest, so turning it on again starts from nothing (Paul,
 * 2026-10-12: "I turn save off and then back on and the documents it removed are still there"). Changed afterwards,
 * the size and the theme are written again: they are the two things a private visit keeps on the device.
 */
export function setKeeping(on: boolean) {
  const l = local();
  if (!l) return;
  if (on) {
    l.setItem(KEEP, '1');
    for (const [k, v] of memory) l.setItem(k, v);
    memory.clear();
  } else {
    for (const k of Object.keys(l).filter(ours)) l.removeItem(k);
    for (const k of DEVICE) l.removeItem(k);
    memory.clear();
    l.removeItem(KEEP);
  }
}
