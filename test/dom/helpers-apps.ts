/** The whole page in happy-dom: the shell (<to-app>) opened at a link, as a visitor arrives at it; and the page an editor shows in its frame. */
import { expect, vi } from 'vitest';
import { litElements } from './env-apps.ts';
// As src/main.ts puts the page together (less the stylesheet and the offline copy).
import '../../src/widgets/meter.ts';
import '../../src/kit/tip.ts';
import '../../src/app.ts';
import { decodeEnvelope, encodeEnvelope } from '../../src/lib/envelope.ts';
import { type Editor } from './helpers.ts';

// A test that works the whole shell takes about a second here; on a busy machine, several. Time enough for that.
vi.setConfig({ testTimeout: 20_000 });

export type Shell = HTMLElement & { updateComplete: Promise<unknown> };

/** Let the page (the shell, what is in it, its dialogs) finish drawing: until nothing is waiting to be drawn again. */
export async function settleAll(most = 6) {
  for (let i = 0; i < most; i++) {
    await Promise.all([...litElements].map((e) => e.updateComplete));
    await new Promise((r) => setTimeout(r, 0));
    if (i > 0 && ![...litElements].some((e) => e.isUpdatePending)) return;
  }
}

/**
 * The preferences a visitor's browser has kept, as the e2e suite sets them:
 * things kept on the device, the editor (not the reading view) on opening,
 * and text apps opened as their text. Null for a visitor with none.
 */
export type Prefs = { edit?: 'text' | 'form' | null; open?: 'edit' | null; theme?: 'light' | 'dark' };

/** Open the shell at a link (`#/v0/todo`, or an app and its document), as a fresh page load would. */
export async function shell(at: string | { app: string; body: string; title?: string; view?: string }, prefs: Prefs = { edit: 'text', open: 'edit' }) {
  // (The page's one tooltip box stays: it is made once, as a page is.)
  for (const el of [...document.body.children]) if (el.id !== 'to-tip') el.remove();
  localStorage.clear();
  localStorage.setItem('tinyoffice.keep', '1');
  if (prefs.edit) localStorage.setItem('tinyoffice.edit', prefs.edit);
  if (prefs.open) localStorage.setItem('tinyoffice.open', prefs.open);
  if (prefs.theme) localStorage.setItem('to-theme', prefs.theme);
  location.hash = typeof at === 'string' ? at : link(at.app, at.body, at.title, at.view);
  return open();
}

/** A link to a document: what a visitor pastes. */
export function link(app: string, body: string, title?: string, view = '') {
  return `#/v0/${app}${view ? '.' + view : ''}/${encodeEnvelope({ created: 1, body, title })}`;
}

/** Put the shell on the page at the current location. */
async function open() {
  const app = document.createElement('to-app') as Shell;
  document.body.append(app);
  await settleAll();
  return app;
}

/** Close the page and open it again at the same address: the address is the document, so this is the persistence test. */
export async function reopen() {
  document.querySelector('to-app')?.remove();
  document.querySelectorAll('body > sl-dialog').forEach((d) => d.remove());
  return open();
}

/** The editor of an app, as the shell put it on the page. */
export function editorOf(id: string): Editor {
  const el = document.querySelector<Editor>(`to-${id}`);
  if (!el) throw new Error(`no to-${id} on the page`);
  return el;
}

/** The document in the address bar: what would be shared. */
export function bodyOf(): string {
  const m = /^#\/v\d+\/([a-z]+)(?:\.[a-z0-9.]+)?\/?(.*)$/.exec(location.hash);
  if (!m || !m[2]) return '';
  return decodeEnvelope(m[2], m[1]).body;
}

/** Try an assertion until it holds, as a person waits for a page to catch up (a debounce, a font, a dialog's animation). */
export async function until(check: () => void | Promise<void>, ms = 2000) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      await check();
      return;
    } catch (err) {
      if (Date.now() > end) throw err;
      await new Promise((r) => setTimeout(r, 15));
    }
  }
}

/** A key pressed anywhere on the page (the shell's and the editors' shortcuts listen on the window). */
export function shortcut(key: string, mods: { shift?: boolean; alt?: boolean; mod?: boolean } = {}) {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: !!mods.shift, altKey: !!mods.alt, ctrlKey: !!mods.mod, bubbles: true, composed: true }));
}

/** The words of each element the selector finds. */
export const texts = (root: ParentNode, selector: string) => [...root.querySelectorAll(selector)].map((e) => e.textContent?.trim() ?? '');

/**
 * The page an editor shows in its sandboxed frame (an invoice, a website, a
 * bill split), and its side of the conversation. The frame's own script,
 * which turns typing in the page into messages, needs a real browser (one
 * e2e test drives it); here the same messages are posted to the editor as
 * the frame would post them, and what the editor draws next is read from
 * the page it hands the frame.
 */
export function framed(el: Element) {
  const frame = () => {
    const f = el.querySelector<HTMLIFrameElement>('.diagram.page iframe');
    if (!f) throw new Error('no page frame');
    return f;
  };
  /** The page in the frame, as the editor wrote it. */
  const page = () => new DOMParser().parseFromString(frame().getAttribute('srcdoc') ?? frame().srcdoc, 'text/html');
  /** What the editing script is told: the values, the kinds of row, where the cursor goes, the stamp. */
  const data = () => JSON.parse(page().getElementById('lf')?.textContent ?? 'null') as { v: [number, number, string, string][]; k: { name: string; hidden: boolean }[]; f: string; s: number; p: [string, number, string][] } | null;
  /** Post a message as the frame's script would. */
  const post = (m: Record<string, unknown>) => {
    const d = data();
    window.dispatchEvent(new MessageEvent('message', { data: { s: d?.s, ...m }, source: frame().contentWindow }));
  };
  return { frame, page, data, post };
}

/** Choose from one of the shell's menus (Download, Share, ...): its button, then the item whose words match. */
export async function choose(menu: string, item: string | RegExp) {
  const dropdown = [...document.querySelectorAll('sl-dropdown')].find((d) => d.querySelector(`[slot="trigger"][aria-label="${menu}"]`));
  if (!dropdown) throw new Error(`no menu ${menu}`);
  const items = [...dropdown.querySelectorAll<HTMLElement>('sl-menu-item')];
  const it = items.find((i) => (typeof item === 'string' ? i.textContent?.trim().startsWith(item) : item.test(i.textContent?.trim() ?? '')));
  if (!it) throw new Error(`no ${item} in ${menu}: ${items.map((i) => i.textContent?.trim()).join(' | ')}`);
  // What Shoelace's menu does with a click on an item: it says which was chosen. (It hears the click through its
  // slot, which happy-dom leaves out of the click's path.)
  it.closest('sl-menu')!.dispatchEvent(new CustomEvent('sl-select', { bubbles: true, composed: true, detail: { item: it } }));
  await settleAll();
}

/** The files downloaded so far (env-apps.ts keeps them), oldest first. */
export const saved = () => (window as unknown as { __saved: { name: string; blob: Blob }[] }).__saved;
/** The file the next step downloads: its name, its words, its bytes. */
export async function downloaded(start: () => unknown, ms = 3000) {
  const before = saved().length;
  await start();
  await until(() => expect(saved().length).toBeGreaterThan(before), ms);
  const file = saved()[before];
  return { name: file.name, text: () => file.blob.text(), bytes: async () => new Uint8Array(await file.blob.arrayBuffer()) };
}
/** The pages opened in a new tab so far. */
export const opened = () => (window as unknown as { __opened: string[] }).__opened;
