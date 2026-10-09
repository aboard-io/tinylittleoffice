/**
 * The service worker: the whole site, kept on the device. Installed only
 * when the switch in the menu is turned on (kit/offline.ts); then every
 * file of the build (dist/files.json) is fetched once, and from then on
 * the site's own files are served from the device first, the network
 * second, so it opens and works with no connection. Nothing else is kept:
 * map tiles, embedded pages and the short-link service go to the network
 * as they always did.
 *
 * Built by Vite as its own entry, dist/sw.js; the build writes the version
 * in, so a new build is a new worker, which fetches the new files and drops
 * the old cache.
 */
const VERSION = '__TLO_VERSION__';
const CACHE = `tlo-${VERSION}`;

type Install = Event & { waitUntil(p: Promise<unknown>): void };
type Fetched = Event & { request: Request; respondWith(r: Promise<Response>): void };
const sw = self as unknown as {
  addEventListener(type: 'install' | 'activate', fn: (e: Install) => void): void;
  addEventListener(type: 'fetch', fn: (e: Fetched) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  registration: ServiceWorkerRegistration;
};

sw.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const { files } = (await (await fetch('files.json', { cache: 'reload' })).json()) as { files: string[] };
      const cache = await caches.open(CACHE);
      await cache.addAll(files.map((f) => new Request(f, { cache: 'reload' })));
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    (async () => {
      const hit = await caches.match(request, { ignoreSearch: true });
      if (hit) return hit;
      try {
        return await fetch(request);
      } catch (err) {
        // A page not kept (a path never built), offline: the home page is the same shell, and the link after "#" opens there.
        const home = request.mode === 'navigate' ? await caches.match(sw.registration.scope) : undefined;
        if (home) return home;
        throw err;
      }
    })(),
  );
});
