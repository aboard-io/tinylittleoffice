/**
 * The files of a build that the device keeps, for working with no connection (src/sw.ts fetches them all
 * when the switch in the menu is turned on). The build writes the list as dist/files.json.
 *
 * The server's own files (_headers, files.json), the worker itself, the share cards, and what is for other
 * sites and programs (the embed page, /api.js and its pieces, /llms.txt) stay behind. A page is named by its
 * folder ("text/", "" for the home page): that is the address a browser asks for, so a cold start offline
 * finds it. (Ported from the old tree's scripts/offline-files.ts.)
 */
import { createHash } from 'node:crypto';

export interface Built {
  /** Relative to dist, with forward slashes. */
  path: string;
  bytes: number;
}

export interface OfflineList {
  /** Names the worker's cache: a new build is a new version, and the old cache goes. */
  version: string;
  files: string[];
}

const left = (path: string) => path.startsWith('og/') || path.startsWith('embed/') || path.startsWith('api/') || ['sw.js', '_headers', 'files.json', 'api.js', 'llms.txt'].includes(path);

export function offlineList(built: Built[]): OfflineList {
  const kept = built
    .filter((f) => !left(f.path))
    .map((f) => ({ name: f.path.replace(/(^|\/)index\.html$/, '$1'), bytes: f.bytes }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const version = createHash('sha256')
    .update(kept.map((f) => `${f.name}:${f.bytes}`).join('|'))
    .digest('hex')
    .slice(0, 12);
  return { version, files: kept.map((f) => f.name) };
}
