/**
 * Opening a file: a .tlo (the text a Download → Text (TLO) gives, its app in its head) opens as its own app
 * and title; a .md or .txt opens in the app open now, else the Word Processor, called by its file name when
 * it names nothing itself. Reached two ways: a file dropped anywhere on the page (the shell), and Open a
 * file… in the menu (the drawer's file picker). The document goes into a link and the link is followed: no
 * file is kept, nothing is sent.
 */
import { appOf } from './apps.ts';
import { encodeDoc } from './codec.ts';
import { t } from './i18n.ts';
import { readFile, readPlain } from './plain.ts';
import { routeHash } from './route.ts';
import { toast } from './toast.ts';

/** What the picker offers. */
export const OPENS = '.tlo,.md,.markdown,.txt,text/plain,text/markdown';

/** A file's words as a link's hash; '' when it is not words. */
export function hashFor(name: string, text: string, fallback: string): string {
  const plain = readFile(name, text, fallback, (id) => !!appOf(id));
  if (!plain) return '';
  const def = appOf(plain.app)!;
  const doc = plain.title && !def.title(plain.text) ? def.retitle(plain.text, plain.title) : plain.text;
  return routeHash(def.id, encodeDoc(doc));
}

/** Open a file: its document, in its app, as a new entry in the tab's history (Back returns). */
export async function openFile(file: File, fallback: string): Promise<boolean> {
  if (file.size > 2_000_000) {
    toast(t('That file is too large to be a document here.'));
    return false;
  }
  const hash = hashFor(file.name, await file.text(), fallback);
  if (!hash) {
    toast(t('That file is not words Tiny Little Office can read.'));
    return false;
  }
  location.hash = hash;
  toast(t('Opened {name}', { name: file.name }));
  return true;
}

/** A file dropped anywhere on the page opens (the shell's): `before` makes the link current first, `app` is the app open now. Returns the undo. */
export function opensDropped(before: () => void, app: () => string): () => void {
  const over = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const drop = (e: DragEvent) => {
    const file = e.dataTransfer?.files[0];
    if (!file) return;
    e.preventDefault();
    before();
    void openFile(file, app());
  };
  window.addEventListener('dragover', over);
  window.addEventListener('drop', drop);
  return () => (window.removeEventListener('dragover', over), window.removeEventListener('drop', drop));
}

/** A plain-parameter link ("#title=…&doc=…", kit/plain.ts) made the packed link it stands for, the address replaced (Back does not return to it). */
export function unplain(pageApp: string) {
  const plain = readPlain(location.hash, pageApp, (id) => !!appOf(id));
  if (!plain) return;
  const def = appOf(plain.app)!;
  const doc = plain.title ? def.retitle(plain.text, plain.title) : plain.text;
  const view = plain.view === 'show' ? '' : plain.view;
  history.replaceState(null, '', routeHash(def.id, encodeDoc(doc), view) + (plain.view === 'show' ? '?show' : ''));
}
