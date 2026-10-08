/** The whole page in happy-dom: the shell (<to-app>) at a link, its downloads, and what an editor inside it has. */
import { vi } from 'vitest';
import '../../src/app.ts';
import { encodeEnvelope } from '../../src/lib/envelope.ts';
import { store } from '../../src/lib/store.ts';
import { pdf } from '../../src/kit/pdf.ts';
import type { Editor } from './helpers.ts';

// The whole page takes a moment to draw in happy-dom (a second or so on a busy machine): room for a test that opens it several times.
vi.setConfig({ testTimeout: 15_000 });

// Animations end at once (setup.ts's never say so, and a Shoelace dialog waits for its hiding to finish before it says it is hidden).
Element.prototype.animate = function () {
  return {
    finished: Promise.resolve(),
    cancel() {},
    finish() {},
    addEventListener(type: string, cb: () => void) {
      if (type === 'finish') setTimeout(cb, 0);
    },
  } as unknown as Animation;
};

// happy-dom has no editing commands: asked what is bold, nothing is (marks made by execCommand are e2e's).
const doc = document as Document & Record<string, unknown>;
doc.queryCommandValue ??= () => '';
doc.queryCommandState ??= () => false;
doc.execCommand ??= () => false;

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
  const all = { 'tinyoffice.keep': '1', 'tinyoffice.edit': 'text', ...more };
  for (const [k, v] of Object.entries(all)) localStorage.setItem(k, v);
}

/** An editor on its own, with the diagram apps showing their text (as the e2e suite has them). */
export function asText() {
  store.set('tinyoffice.edit', 'text');
}

export type Shell = HTMLElement & { updateComplete: Promise<unknown> };

/** Let the shell and the editor inside it finish drawing. */
export async function settleAll(times = 3) {
  for (let i = 0; i < times; i++) {
    await Promise.all(drawing().map((e) => e.updateComplete));
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** The elements on the page that draw themselves (Lit's, the shell's, the editors', Shoelace's), not looking inside pictures. */
function drawing(): Editor[] {
  const out: Editor[] = [];
  const walk = (el: Element) => {
    for (const c of el.children) {
      if (c.localName === 'svg') continue;
      if (c.localName.includes('-') && 'updateComplete' in c) out.push(c as Editor);
      walk(c);
    }
  };
  walk(document.body);
  return out;
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

/** Arrive at a link (a path and a hash) in the page already open, as pasting it into the address bar does: quicker than a fresh load. */
export async function visit(at: string) {
  if (!document.querySelector('to-app')) return open(at);
  history.replaceState(null, '', at.startsWith('#') ? '/' + at : at);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await settleAll();
}

/**
 * Open the document again from its own link: the link is the document, so this is the persistence test.
 * The editor goes and comes back made afresh from the link; `reload` makes the whole page afresh too
 * (for what the shell reads only as it starts, its size say), at twice the cost.
 */
export async function reopen(reload = false) {
  const at = location.pathname + location.hash;
  if (reload) return open(at);
  await visit('#/drive');
  await visit(at);
}

/** Go to another link in the same page, as following a link does. */
export async function go(hash: string) {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await settleAll();
}

/** The editor the shell is showing. */
export const editor = <T = Editor>(app: string) => document.querySelector(`to-${app}`) as T & Editor;

/** Wait until a check passes (for what the page does a moment later). */
export const until = <T>(check: () => T | Promise<T>, timeout = 2000) => vi.waitFor(check, { timeout, interval: 10 });

/** A key pressed on the window (the shell's shortcuts), with Ctrl. */
export function shortcut(key: string, shift = false) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: shift, bubbles: true }));
}

/** A box by its accessible name: an input or textarea by aria-label, or a rich text box (role="textbox"). */
export function box<T extends HTMLElement = HTMLInputElement>(root: ParentNode, label: string): NoInfer<T> {
  const found = root.querySelector<T>(`:is(input, textarea, [role="textbox"], sl-input, sl-textarea)[aria-label="${label}"]`);
  if (!found) throw new Error(`no box ${label}`);
  return found;
}

/** Type at the caret of a textarea or input, as keys do: the words go in, the caret after them, then the input event. */
export function typeIn(area: HTMLTextAreaElement | HTMLInputElement, text: string) {
  const a = area.selectionStart ?? area.value.length;
  const b = area.selectionEnd ?? a;
  area.value = area.value.slice(0, a) + text + area.value.slice(b);
  area.setSelectionRange(a + text.length, a + text.length);
  area.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

/** A key pressed in a textarea: the editor's own handling, or (if it lets the key through) what the browser does with Enter. */
export function keyIn(area: HTMLTextAreaElement | HTMLInputElement, key: string, shift = false) {
  const e = new KeyboardEvent('keydown', { key, shiftKey: shift, bubbles: true, composed: true, cancelable: true });
  area.dispatchEvent(e);
  if (!e.defaultPrevented && key === 'Enter') typeIn(area, '\n');
}

/** In the icon picker that is open: search, then press the icon of that name (once the full set has arrived). */
export async function pickIcon(search: string, name: string) {
  const dialog = await until(() => {
    const d = document.querySelector('sl-dialog.to-icons');
    if (!d) throw new Error('no icon picker');
    return d;
  });
  const input = dialog.querySelector('sl-input')!;
  (input as unknown as { value: string }).value = search;
  input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true, composed: true }));
  const found = await until(() => {
    const b = dialog.querySelector<HTMLElement>(`[aria-label="Icon library"] button[aria-label="${name}"]`);
    if (!b) {
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true, composed: true }));
      throw new Error(`no icon ${name}`);
    }
    return b;
  });
  found.click();
  await settleAll();
}

/** A document inside another being edited in its own dialog: type its text, press Done, wait for the dialog to go. */
export async function editSub(label: string, text: string) {
  const sub = await until(() => {
    const d = document.querySelector('sl-dialog.to-sub');
    if (!d) throw new Error('no dialog');
    return d;
  });
  await settleAll();
  const area = box<HTMLTextAreaElement>(sub, label);
  area.value = text;
  area.dispatchEvent(new Event('input', { bubbles: true }));
  await settleAll();
  [...sub.querySelectorAll<HTMLElement>('sl-button')].find((b) => b.textContent === 'Done')!.click();
  await until(() => {
    if (sub.isConnected) throw new Error('still open');
  });
  await settleAll();
}

/** Pick from an "Insert" or "Add a slide" box: type a few letters, then Enter. */
export async function insert(root: ParentNode, label: string, what: string) {
  const input = box(root, label);
  input.value = what;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await settleAll();
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await settleAll();
}

/** The bytes of a PDF of these pages as the app writes it, with stand-in pictures (the real ones need a canvas: e2e). */
export function pdfText(pages: { w: number; h: number }[]) {
  const bytes = pdf(pages.map((p) => ({ w: p.w, h: p.h, pw: 1, ph: 1, jpeg: new Uint8Array(0) })));
  return new TextDecoder('latin1').decode(bytes);
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
