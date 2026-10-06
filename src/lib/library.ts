/**
 * The library: the documents this browser has made or opened, kept in its
 * own storage so they can be found again without their links. Nothing here
 * leaves the device; a document is still, entirely, its link.
 */
export interface Kept {
  /** The app and when the document was made: what makes it the same document after a change. */
  id: string;
  app: string;
  title: string;
  /** The link's "#/v2/..." part: the whole document. */
  hash: string;
  folder: string;
  /** When it was last kept, in ms. */
  at: number;
}

const KEY = 'tinyoffice.library';
const MOST = 400;

export function library(): Kept[] {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}

function write(all: Kept[]) {
  // Newest first; when storage is full, the oldest go until it fits.
  all.sort((a, b) => b.at - a.at);
  for (let keep = Math.min(all.length, MOST); keep >= 0; keep = Math.floor(keep / 2)) {
    try {
      return localStorage.setItem(KEY, JSON.stringify(all.slice(0, keep)));
    } catch {
      if (!keep) return;
    }
  }
}

/** Keep a document, or the newer state of one already kept (which stays in its folder). */
export function keep(doc: Omit<Kept, 'folder' | 'at'>, folder: string) {
  const all = library();
  const was = all.find((k) => k.id === doc.id);
  if (was && was.hash === doc.hash && was.title === doc.title) return;
  write([{ ...doc, folder: was?.folder ?? folder, at: Date.now() }, ...all.filter((k) => k.id !== doc.id)]);
}

export const forgetAll = () => write([]);
export const forget = (id: string) => write(library().filter((k) => k.id !== id));
export const moveTo = (id: string, folder: string) => write(library().map((k) => (k.id === id ? { ...k, folder: folder.trim() || k.folder } : k)));

/** The library by folder, folders in alphabetical order, each newest first. */
export function folders(all = library()): { folder: string; docs: Kept[] }[] {
  const names = [...new Set(all.map((k) => k.folder))].sort((a, b) => a.localeCompare(b));
  return names.map((folder) => ({ folder, docs: all.filter((k) => k.folder === folder).sort((a, b) => b.at - a.at) }));
}
