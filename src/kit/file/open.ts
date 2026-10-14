/**
 * Opening a file: a .tlo (the text a Download → Text (TLO) gives, its app in its head) opens as its own app
 * and title; a .md or .txt opens in the app open now, else the Word Processor, called by its file name when
 * it names nothing itself. Reached by a file dropped anywhere on the page (the shell); the menu's Open a file… is
 * gone (Paul, 2026-10-12). A .json (Download → Data (JSON): the kernel's document, src/doc/json.ts)
 * opens as its .tlo would, when it fits the schema; one that does not is said so. A .png (Download → Icon: the
 * document inside the picture, kit/file/png.ts) opens the document it carries; a picture that carries none is said so.
 * The document goes into a link and the link is followed: no file is kept, nothing is sent.
 *
 * A zip goes in too (Paul, 2026-10-11: "Let me download all my docs as a single zip file and upload them too"):
 * its .tlo and .md files are documents (kit/core/plain.ts readZip), the rest of it (a README, a picture) left alone. Under Saved they are kept (kit/share/library.ts keepAll),
 * a document already kept with the same text left as it is; under Private a dialog lists them by app and name and
 * offers to keep them (Saved turned on) or open one. A zip of one document opens it, as that file would.
 */
import { html } from 'lit';
import { appOf } from '../core/apps.ts';
import { encodeDoc } from '../core/codec.ts';
import { write } from '../../doc/index.ts';
import { t } from '../core/i18n.ts';
import { icon, UI } from '../draw/icons.ts';
import { readFile, readPlain, readZip, type InZip, type Plain } from '../core/plain.ts';
import { keepDocuments, keeping, setPrivate } from '../share/privacy.ts';
import { go, routeHash } from '../core/route.ts';
import { toast } from '../core/say.ts';
import { unzip } from './zip.ts';
import type { ToDialog } from '../ui/dialog.ts';
import '../ui/dialog.ts';

const known = (id: string) => !!appOf(id);

/** A document read from a file as a link's hash, called by the file's name when it names nothing itself. */
function linkOf(plain: Pick<Plain, 'app' | 'text' | 'title'>): string {
  const def = appOf(plain.app)!;
  const doc = plain.title && !def.title(plain.text) ? def.retitle(plain.text, plain.title) : plain.text;
  return routeHash(def.id, encodeDoc(doc));
}

/** A file's words as a link's hash; '' when it is not words. */
function hashFor(name: string, text: string, fallback: string): string {
  const plain = readFile(name, text, fallback, known);
  return plain ? linkOf(plain) : '';
}

const isJson = (file: File) => /\.json$/i.test(file.name) || /^application\/json/.test(file.type);

/** A .json's document as a link's hash, as its .tlo would be ('' when it is not a document: not JSON, or not the schema's). */
async function jsonHash(name: string, json: string, fallback: string): Promise<string> {
  const { jsonDoc } = await import('../../doc/json.ts');
  try {
    return hashFor(name, write(jsonDoc(json)), fallback);
  } catch {
    return '';
  }
}

const isZip = (file: File) => /\.zip$/i.test(file.name) || /^application\/(?:x-)?zip/.test(file.type);

const isPng = (file: File) => /\.png$/i.test(file.name) || file.type === 'image/png';

/** A .png's document (the words it carries under "tlo", kit/file/png.ts) as a link's hash; '' when it carries none. */
async function pngHash(file: File, fallback: string): Promise<string> {
  const { KEYWORD, textOf } = await import('./png.ts');
  const text = textOf(new Uint8Array(await file.arrayBuffer()), KEYWORD);
  return text ? hashFor(file.name.replace(/\.icon\.png$/i, '.png'), text, fallback) : '';
}

/** Open a file: its document, in its app, as a new entry in the tab's history (Back returns); a zip's documents, kept or offered. */
export async function openFile(file: File, fallback: string): Promise<boolean> {
  if (isZip(file)) return openZip(file, fallback);
  if (file.size > 2_000_000) {
    toast(t('That file is too large to be a document here.'));
    return false;
  }
  const hash = isPng(file) ? await pngHash(file, fallback) : isJson(file) ? await jsonHash(file.name, await file.text(), fallback) : hashFor(file.name, await file.text(), fallback);
  if (!hash) {
    toast(isPng(file) ? t('That picture carries no document.') : t('That file is not words Tiny Little Office can read.'));
    return false;
  }
  if (go(hash)) toast(t('Opened {name}', { name: file.name }));
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

/** A plain-parameter link ("#title=…&doc=…", kit/core/plain.ts) made the packed link it stands for, the address replaced (Back does not return to it). */
export function unplain(pageApp: string) {
  const plain = readPlain(location.hash, pageApp, (id) => !!appOf(id));
  if (!plain) return;
  const def = appOf(plain.app)!;
  const doc = plain.title ? def.retitle(plain.text, plain.title) : plain.text;
  const view = plain.view === 'show' ? '' : plain.view;
  history.replaceState(null, '', routeHash(def.id, encodeDoc(doc), view) + (plain.view === 'show' ? '?show' : ''));
}

/** A zip's document as it opens: a locked one is its link; one with words is called by its file's name if it names nothing. */
const opens = (d: InZip) => (d.payload ? routeHash(d.app, d.payload) : linkOf(d));
/** As it is kept: its text as it was written, and the name the zip gives it. */
const kept = (d: InZip) => ({ app: d.app, title: d.payload ? '' : appOf(d.app)!.title(d.text) || d.title, hash: routeHash(d.app, d.payload || encodeDoc(d.text)) });

/** A zip opened: its documents kept (Saved) or offered (Private); one alone opens. */
async function openZip(file: File, fallback: string): Promise<boolean> {
  let docs: InZip[] = [];
  try {
    // A document is small (a file over 2 MB is not one, as above): only those are inflated.
    docs = readZip(
      unzip(new Uint8Array(await file.arrayBuffer()), (name, size) => /\.(?:tlo|md|markdown|txt)$/i.test(name) && size <= 2_000_000),
      fallback,
      known,
    );
  } catch {
    // Not a zip after all: the same as one with nothing in it.
  }
  if (!docs.length) {
    toast(t('That zip holds no documents Tiny Little Office can read.'));
    return false;
  }
  if (docs.length === 1) {
    if (go(opens(docs[0]))) toast(t('Opened {name}', { name: docs[0].title || file.name }));
    return true;
  }
  if (keeping()) {
    keepDocuments(docs.map(kept));
    toast(t('{n|# document kept|# documents kept}', { n: docs.length }));
    return true;
  }
  void offer(docs);
  return true;
}

let dialog: ToDialog | null = null;

/** Under Private, a zip's documents listed by app and name: keep them here (Saved turned on), open the first, or a tap on one opens it. */
async function offer(docs: InZip[]) {
  if (!dialog?.isConnected) {
    dialog = document.createElement('to-dialog') as ToDialog;
    dialog.className = 'to-zip-dialog';
    document.body.append(dialog);
  }
  const d = dialog;
  const keepThem = async () => {
    await setPrivate(false);
    keepDocuments(docs.map(kept));
    d.close();
    toast(t('Saving in this browser: {n|# document kept|# documents kept}', { n: docs.length }));
  };
  const open = (hash: string) => {
    d.close();
    go(hash);
  };
  const byApp = [...new Set(docs.map((x) => x.app))].map((app) => ({ def: appOf(app)!, docs: docs.filter((x) => x.app === app) }));
  d.heading = t('{n|# document|# documents}', { n: docs.length });
  d.body = html`<p class="to-hint">${t('Nothing is saved on this device now. Keep them here, or open one.')}</p>
    ${byApp.map(
      ({ def, docs }) => html`<h3 class="to-zip-app">${def.name}</h3>
        <ul class="to-zip-docs">
          ${docs.map((x) => {
            const href = opens(x);
            return html`<li><a href=${href} @click=${(e: Event) => (e.preventDefault(), open(href))}>${icon(def.icon, 16)}<span>${appOf(x.app)!.title(x.text) || x.title || t('Untitled')}</span></a></li>`;
          })}
        </ul>`,
    )}
    <div class="to-zip-acts">
      <button type="button" class="to-btn primary to-zip-keep" @click=${() => void keepThem()}>${icon(UI.device, 16)}<span>${t('Keep them on this device')}</span></button>
      <button type="button" class="to-btn to-zip-first" @click=${() => open(opens(docs[0]))}><span>${t('Open the first')}</span></button>
      <button type="button" class="to-btn to-zip-cancel" @click=${() => d.close()}><span>${t('Cancel')}</span></button>
    </div>`;
  await d.show();
}
