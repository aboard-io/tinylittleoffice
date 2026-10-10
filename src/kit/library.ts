/**
 * The library: the documents this device has made or opened, kept so they can be found again without their
 * links (the home page lists them under their apps). Kept through kit/store.ts and only while the device is
 * Saved: under Private the list is empty and nothing is written. Nothing here leaves the device; a document
 * is still, entirely, its link.
 */
import { keeping, store } from './store.ts';
import { t } from './i18n.ts';
import type { AppDef } from './app.ts';

export interface Kept {
  /** What makes it the same document after a change: made at its first keep, carried in the tab's history.state. */
  id: string;
  app: string;
  title: string;
  /** The link's "#/v1/<app>/<payload>" part: the whole document (never a short link's owner query). */
  hash: string;
  /** When it was last kept, ms since the epoch. */
  at: number;
}

const KEY = 'tinyoffice.library';
/** The most kept; the oldest go first. */
export const MOST = 400;

const valid = (k: Kept) => !!k && typeof k.id === 'string' && typeof k.app === 'string' && typeof k.hash === 'string' && typeof k.at === 'number';

/** Every kept document, newest first; nothing under Private. */
export function library(): Kept[] {
  if (!keeping()) return [];
  try {
    const all = JSON.parse(store.get(KEY) ?? '[]');
    return Array.isArray(all) ? all.filter(valid).sort((a, b) => b.at - a.at) : [];
  } catch {
    return [];
  }
}

/** Newest first, one entry per hash (the newest), at most MOST; when storage is full, halves until it fits. */
function write(all: Kept[]) {
  const seen = new Set<string>();
  const list = all.sort((a, b) => b.at - a.at).filter((k) => !seen.has(k.hash) && !!seen.add(k.hash));
  if (!list.length) return store.remove(KEY);
  for (let n = Math.min(list.length, MOST); n > 0; n = Math.floor(n / 2)) {
    try {
      return store.set(KEY, JSON.stringify(list.slice(0, n)));
    } catch {
      /* full: fewer */
    }
  }
}

/** Keep a document, or the newer state of one already kept (same id). Only while Saved. */
export function keep(entry: Kept) {
  if (!keeping()) return;
  const all = library();
  const was = all.find((k) => k.id === entry.id);
  if (was && was.hash === entry.hash && was.title === entry.title) return;
  write([entry, ...all.filter((k) => k.id !== entry.id)]);
}

export function forget(id: string) {
  if (keeping()) write(library().filter((k) => k.id !== id));
}

export function forgetAll() {
  if (keeping()) store.remove(KEY);
}

/** A document's first words, for one with no name: the first line that says something, marks and front matter left out. */
export function firstWords(doc: string, most = 60): string {
  const body = doc.replace(/^---\n[\s\S]*?\n---\n/, '');
  for (const raw of body.split('\n')) {
    const line = raw
      .replace(/\{[^}]*\}\s*$/, '')
      .replace(/^\s*(?:#+|[-*+>]|\d+[.)]|\|)\s*(?:\[[ xX]\]\s*)?/, '')
      .replace(/[*_~`|]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (/\p{L}|\p{N}/u.test(line)) return line.length > most ? line.slice(0, most).replace(/\s+\S*$/, '') + '…' : line;
  }
  return '';
}

/** When, said as people say it: "2 hours ago", "yesterday"; older than a week, the day. */
export function ago(at: number, lang?: string, now = Date.now()): string {
  const s = Math.round((at - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang || undefined, { numeric: 'auto' });
  if (Math.abs(s) < 60) return rtf.format(0, 'second');
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (Math.abs(s) < 7 * 86400) return rtf.format(Math.round(s / 86400), 'day');
  const d = new Date(at);
  return d.toLocaleDateString(lang || undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date(now).getFullYear() ? { year: 'numeric' } : {}) });
}

/** A day as "2026-10-09", in the device's own time zone. */
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * The first number from 1 that no title of the form `name` takes, `name` holding "{n}" where the number
 * goes ("New Spreadsheet 2026-10-09 #{n}"): how a new document is named so that it is told apart from the
 * others of its app made that day (Paul, 2026-10-09).
 */
export function firstFree(titles: string[], name: string): number {
  const [before, after = ''] = name.split('{n}');
  const taken = new Set(titles.filter((s) => s.startsWith(before) && s.endsWith(after) && s.length > before.length + after.length).map((s) => s.slice(before.length, s.length - after.length)).filter((n) => /^\d+$/.test(n)).map(Number));
  let n = 1;
  while (taken.has(n)) n++;
  return n;
}

/**
 * One open document's entry in the library, as the shell keeps it: adopted on arrival by the tab's history.state or
 * by its link, made at the first keep, written 800 ms after the last change (soon) or at once (flush: leaving the
 * document or the page; Mod+S). `state` is what the tab carries in history.state, so the next change, and a reload,
 * are the same entry.
 */
export class Keeper {
  id: string | null = null;
  private pending: Kept | null = null;
  private timer = 0;
  /** The entry this tab's document is: history.state's, else the kept one at this link, else none yet. */
  adopt(hash: string) {
    const kept = (history.state as { kept?: unknown } | null)?.kept;
    this.id = typeof kept === 'string' ? kept : hash ? (library().find((k) => k.hash === hash)?.id ?? null) : null;
  }
  state = () => (this.id ? { kept: this.id } : null);
  soon(entry: Omit<Kept, 'id' | 'at'>, wait = 800) {
    this.id ??= crypto.randomUUID();
    this.pending = { ...entry, id: this.id, at: Date.now() };
    clearTimeout(this.timer);
    this.timer = window.setTimeout(this.flush, wait);
  }
  flush = () => {
    clearTimeout(this.timer);
    const entry = this.pending;
    this.pending = null;
    if (entry) keep({ ...entry, at: Date.now() });
  };
}

/** A new document's name, at once: "New Spreadsheet 2026-10-09 #2", the app's noun, today, and the first number the library leaves free (Paul, 2026-10-09). */
export function newName(def: AppDef): string {
  const lang = document.documentElement.lang || undefined;
  const noun = def.noun.charAt(0).toLocaleUpperCase(lang) + def.noun.slice(1);
  const name = t('New {noun} {date} #{n}', { noun, date: localDay() });
  const n = firstFree(library().filter((k) => k.app === def.id).map((k) => k.title), name);
  return name.replace('{n}', String(n));
}
