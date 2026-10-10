/**
 * Installing the site as an app ("Add to home screen"): the browser's own prompt where it has one, kept for
 * the menu's button rather than shown whenever the browser likes, and the way by hand on iPhone and iPad.
 */
let installer: (Event & { prompt(): Promise<unknown> }) | null = null;
const listeners = new Set<() => void>();
const changed = () => {
  for (const cb of listeners) cb();
};
/** Whoever shows the button is told when the browser offers, or the offer is taken up. */
export function onInstall(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
if (typeof window !== 'undefined')
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installer = e as Event & { prompt(): Promise<unknown> };
    changed();
  });

/** The browser offers to install the site (Chrome, Edge, Android), and it has not been taken up. */
export const canInstall = () => installer !== null;
/** The browser's own prompt, once: it cannot be shown twice. */
export async function install() {
  const p = installer;
  installer = null;
  changed();
  await p?.prompt();
}
/** iPhone and iPad have no prompt: the way is Share, then Add to Home Screen. True there, unless the site is already opened from the home screen. */
export function installByHand(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}
