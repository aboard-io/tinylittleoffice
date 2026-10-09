/**
 * The app kept on the device, so it opens with no connection: a switch in
 * the menu. On, the service worker (src/sw.ts) is registered and fetches
 * every file of the build; off, it is unregistered and its cache deleted.
 * Keeping the app is keeping something on the device, so turning it on
 * turns the header's switch to Saved too. The browser's own storage API
 * says how much is kept, and is asked to hold on to it.
 *
 * Installing as an app ("Add to home screen") lives here as well: the
 * browser's own prompt where there is one, a word on how where there is
 * not (iPhone Safari).
 */
import { apps } from '../kit/core.ts';
import { keeping, setKeeping, store } from './store.ts';

const KEY = 'tinyoffice.offline';
export type OfflineStatus = 'off' | 'saving' | 'ready' | 'updated' | 'failed';
let status: OfflineStatus = 'off';
let bytes = 0;
const listeners = new Set<() => void>();
function changed() {
  for (const cb of listeners) cb();
}
/** Whoever shows the switch is told when something here changes. */
export function onOffline(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The site's own address, whichever app page we were opened from ("/deck/" is a page of the site at "/"). */
export function siteRoot(): string {
  const dir = location.pathname.split('/').slice(-2)[0];
  const onAppPage = /\/[a-z]+\/$/.test(location.pathname) && apps().some((a) => a.id === dir);
  return new URL(onAppPage ? '..' : '.', location.origin + location.pathname).href;
}

/** Whether the switch is on. */
export const offlineOn = () => store.get(KEY) === '1';
/** Only the built site has a worker to register; tests fake one. */
export const offlineSupported = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator && (import.meta.env?.PROD || import.meta.env?.MODE === 'test');

/** The switch's state, and the line beneath it. */
export function offlineState(): { on: boolean; status: OfflineStatus; line: string } {
  const on = offlineOn();
  const mb = bytes ? ` · ${(bytes / 1e6).toFixed(1)} MB` : '';
  const line = !offlineSupported() ? (import.meta.env?.DEV ? 'Only on the built site' : 'Not possible in this browser') : status === 'saving' ? 'Saving…' : status === 'ready' ? `Ready to work offline${mb}` : status === 'updated' ? 'Updated, reload' : status === 'failed' ? 'Could not save' : 'Not kept';
  return { on, status, line };
}

function set(s: OfflineStatus) {
  status = s;
  changed();
}

async function register() {
  set('saving');
  try {
    const root = siteRoot();
    const reg = await navigator.serviceWorker.register(`${root}sw.js`, { scope: root });
    // A worker found after this page's own: a new build. It takes over as it installs; a reload runs it.
    reg.addEventListener('updatefound', () => {
      const update = !!navigator.serviceWorker.controller;
      const w = reg.installing;
      w?.addEventListener('statechange', () => update && w.state === 'activated' && set('updated'));
    });
    await navigator.serviceWorker.ready;
    void navigator.storage?.persist?.().catch(() => false);
    bytes = (await navigator.storage?.estimate?.().catch(() => undefined))?.usage ?? 0;
    set('ready');
  } catch {
    set('failed');
  }
}

/** Take the copy of the app off the device, whatever the switch says. */
export async function dropOffline() {
  if (typeof navigator === 'undefined') return;
  if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  if ('caches' in globalThis) for (const k of await caches.keys()) await caches.delete(k);
  bytes = 0;
  set('off');
}

/** The switch, turned. */
export async function setOffline(on: boolean) {
  if (on) {
    if (!keeping()) await setKeeping(true);
    store.set(KEY, '1');
    if (offlineSupported()) await register();
  } else {
    store.remove(KEY);
    await dropOffline();
  }
}

/** At load: the switch as it was left. */
export function keepOffline() {
  if (offlineOn() && offlineSupported()) void register();
}

/* ---------- installing as an app ---------- */

type InstallPrompt = Event & { prompt(): Promise<unknown> };
let installer: InstallPrompt | null = null;
if (typeof window !== 'undefined')
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installer = e as InstallPrompt;
    changed();
  });

/** The browser offers to install the site (Chrome, Edge, Android), and has not yet. */
export const canInstall = () => installer !== null;
export async function install() {
  const p = installer;
  installer = null;
  changed();
  await p?.prompt();
}
/** iPhone and iPad Safari have no prompt: the way is Share, then Add to Home Screen. */
export function installByHand(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}
