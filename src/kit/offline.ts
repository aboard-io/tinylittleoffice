/**
 * The app kept on the device, so it opens with no connection: a switch in the menu. On, the service worker
 * (src/sw.ts) is registered and fetches every file of the build; off, it is unregistered and its cache
 * deleted. Keeping the app is keeping something on the device, so turning it on turns Private to Saved.
 * The browser's own storage API says how much is kept, and is asked to hold on to it.
 * (Ported from the old tree's src/lib/offline.ts.)
 */
import { apps } from './apps.ts';
import { keeping, setKeeping, store } from './store.ts';
import { t } from './i18n.ts';

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

/** The site's own address, whichever app page we were opened from ("/text/" is a page of the site at "/"). */
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
  const mb = bytes ? ` · ${t('{mb} MB', { mb: (bytes / 1e6).toFixed(1) })}` : '';
  const line = !offlineSupported()
    ? import.meta.env?.DEV
      ? t('Only on the built site')
      : t('Not possible in this browser')
    : status === 'saving'
      ? t('Saving…')
      : status === 'ready'
        ? t('Ready to work offline') + mb
        : status === 'updated'
          ? t('Updated, reload')
          : status === 'failed'
            ? t('Could not save')
            : t('Not kept');
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
    if (!keeping()) setKeeping(true);
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
