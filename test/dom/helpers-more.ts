/** The whole page in happy-dom: the shell (<to-app>) at a link, its downloads, and what an editor inside it has. */
import { vi } from 'vitest';
import '../../src/app.ts';
import { encodeEnvelope } from '../../src/lib/envelope.ts';
import { store } from '../../src/lib/store.ts';
import { settle, type Editor } from './helpers.ts';

/** A document as the part of a link after "#/v0/": "app/payload". */
export const ref = (app: string, body: string, created: number | null = null) => `${app}/${encodeEnvelope({ created, body })}`;

/** The files the page handed over to be saved, newest last. */
export const saved: File[] = [];
let installed = false;
function catchDownloads() {
  if (installed) return;
  installed = true;
  URL.createObjectURL = (f: Blob) => {
    saved.push(f as File);
    return `blob:test/${saved.length}`;
  };
  URL.revokeObjectURL = () => {};
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (this.download) return;
    click.call(this);
  };
}

/** The browser as the e2e suite sets it up: things kept on the device, the diagram apps as text, links open for editing. */
export function prefs(more: Record<string, string> = {}) {
  localStorage.clear();
  const all = { 'tinyoffice.keep': '1', 'tinyoffice.edit': 'text', 'tinyoffice.open': 'edit', ...more };
  for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
}

/** An editor on its own, with the diagram apps showing their text (as the e2e suite has them). */
export function asText() {
  store.set('tinyoffice.edit', 'text');
}

export type Shell = HTMLElement & { updateComplete: Promise<unknown> };

/** Let the shell and the editor inside it finish drawing. */
export async function settleAll(times = 4) {
  for (let i = 0; i < times; i++) {
    const els = [...document.querySelectorAll<Editor>('*')].filter((e) => 'updateComplete' in e);
    await Promise.all(els.map((e) => e.updateComplete));
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** The shell at a link ("#/v0/sheet", or a path and a hash), as a fresh page load. */
export async function open(at: string) {
  catchDownloads();
  document.body.innerHTML = '';
  history.replaceState(null, '', at.startsWith('#') ? '/' + at : at);
  const app = document.createElement('to-app') as Shell;
  document.body.append(app);
  await settleAll();
  return app;
}

/** Load the page again at its own link: the link is the document, so this is the persistence test. */
export const reopen = () => open(location.pathname + location.hash);

/** Go to another link in the same page, as following a link does. */
export async function go(hash: string) {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await settleAll();
}

/** The editor the shell is showing. */
export const editor = <T = Editor>(app: string) => document.querySelector(`to-${app}`) as T & Editor;

/** The document the shell holds now, from the editor it handed it to. */
export const value = (app: string) => editor(app).value;

/** Wait until a check passes (for what the page does a moment later). */
export const until = <T>(check: () => T | Promise<T>, timeout = 2000) => vi.waitFor(check, { timeout, interval: 10 });

/** A file the page saved, as text. */
export const text = (f: File) => f.text();

/** A key pressed on the window (the shell's shortcuts), with Ctrl. */
export function shortcut(key: string, shift = false) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: shift, bubbles: true }));
}

export { settle };

/** A box by its accessible name: an input or textarea by aria-label, or a rich text box (role="textbox"). */
export function box<T extends HTMLElement = HTMLInputElement>(root: ParentNode, label: string): T {
  const found = root.querySelector<T>(`:is(input, textarea, [role="textbox"], sl-input, sl-textarea)[aria-label="${label}"]`);
  if (!found) throw new Error(`no box ${label}`);
  return found;
}

/** Type into a rich text box (a headline, a slide's bullets, a page's words): its lines, then the input it fires. */
export function typeRich(page: HTMLElement, text: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  page.innerHTML = text
    .split('\n')
    .map((l) => `<p>${esc(l) || '<br>'}</p>`)
    .join('');
  page.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}
