/** The whole shell, <to-app>, on a page emulated by happy-dom: opened at a link, worked as a person would. */
import { downloads } from './env-shell.ts';
import '../../src/widgets/meter.ts';
import '../../src/kit/tip.ts';
import '../../src/app.ts';
import type { ToApp } from '../../src/app.ts';
import { decodeEnvelope, type Envelope } from '../../src/lib/envelope.ts';
import { isSealed } from '../../src/lib/privacy.ts';

export { downloads };

let app: ToApp | null = null;

/** The shell as it stands. */
export const shell = () => app!;

/**
 * Go to a link: "#/v0/sheet", or a whole document's link. As in a browser, a link on the page already open
 * only changes what is after "#" (the shell hears "hashchange"); a link elsewhere, or the first, is a fresh page.
 */
export async function open(hash: string, path = '/') {
  if (!app?.isConnected || location.pathname !== path) return fresh(hash, path);
  if (location.hash === hash || (!hash && !location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href }));
  else location.hash = hash;
  await new Promise((r) => setTimeout(r, 2));
  await idle();
  return app;
}

/** Open a link in a fresh page: nothing kept from before but what the device keeps. */
export async function fresh(hash: string, path = '/') {
  app?.remove();
  document.body.innerHTML = '';
  history.replaceState(null, '', path + hash);
  app = document.createElement('to-app');
  document.body.append(app);
  await idle();
  return app;
}

/** Open the link the page is at now in a fresh page: the URL is the document, so this is the persistence test. */
export const reopen = () => fresh(location.hash, location.pathname);

/** Let everything on the page finish drawing: the shell, whatever is inside it, and a turn or two of the clock. */
export async function idle(turns = 3) {
  for (let i = 0; i < turns; i++) {
    await app?.updateComplete;
    const els = [...document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('*')].filter((e) => e.updateComplete);
    await Promise.all(els.map((e) => e.updateComplete));
    await new Promise((r) => setTimeout(r, 0));
  }
}

/** Wait, a little at a time, for something that takes a while (a key derived, a signature checked). */
export async function until<T>(get: () => T, what = 'the condition', ms = 8000): Promise<NonNullable<T>> {
  const end = Date.now() + ms;
  for (;;) {
    const v = get();
    if (v) return v as NonNullable<T>;
    if (Date.now() > end) throw new Error(`waited ${ms}ms for ${what}`);
    await new Promise((r) => setTimeout(r, 10));
    await idle(1);
  }
}

/** The app in the link, its payload, and the document in it (null while it is sealed with a password). */
export function link(): { app: string; payload: string; env: Envelope | null } {
  const m = /^#\/v\d+\/([a-z]+)(?:\.[a-z.]+)?\/?(.*)$/.exec(location.hash);
  if (!m) return { app: '', payload: '', env: null };
  return { app: m[1], payload: m[2], env: isSealed(m[2]) ? null : decodeEnvelope(m[2], m[1]) };
}
/** The document's text, as the link carries it. */
export const body = () => link().env?.body ?? '';

/** The first element matching, or a failure that says what was looked for. */
export function $<E extends Element = HTMLElement>(sel: string, root: ParentNode = document): E {
  const el = root.querySelector<E>(sel);
  if (!el) throw new Error(`nothing matches ${sel}`);
  return el;
}
export const $$ = <E extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<E>(sel)];

/** Text of an element, spaces squeezed. */
export const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** A press of the pointer: down (which may be refused, as a cell taken for a formula refuses it), focus, up, click. */
export function tap(el: Element | null) {
  if (!el) throw new Error('nothing to tap');
  const opts = { bubbles: true, composed: true, cancelable: true, button: 0, buttons: 1 };
  const go = el.dispatchEvent(new MouseEvent('mousedown', opts));
  if (go) {
    const target = el.closest<HTMLElement>('input, textarea, button, a, [tabindex], [contenteditable]') ?? (el as HTMLElement);
    target.focus?.();
  }
  el.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
  (el as HTMLElement).click?.();
}

/** Put the caret in a box and fill it as Playwright's fill() does: focus, the value, its input event. */
export function fill(box: Element | null, value: string) {
  if (!box) throw new Error('nothing to fill');
  if (box.tagName.startsWith('SL-')) {
    // A Shoelace box: its value, and the event it sends for typing.
    const sl = box as unknown as { value: string; input?: HTMLInputElement; focus(): void };
    sl.focus();
    sl.value = value;
    box.dispatchEvent(new CustomEvent('sl-input', { bubbles: true, composed: true }));
    return;
  }
  const input = box as HTMLInputElement;
  input.focus();
  input.value = value;
  input.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }));
}

/**
 * Write into a rich-text box (Write's page, a slide's headline or bullets) by its name: a paragraph a line,
 * as the browser leaves the page after typing, then the input event the editor reads it on.
 * (happy-dom has no editing commands, so typing itself, and Bold or a list from the toolbar, stay in e2e.)
 */
export function write(name: string, lines: string, root: ParentNode = document) {
  const page = $(`[contenteditable="true"][aria-label="${name}"]`, root);
  page.focus();
  page.innerHTML = lines
    .split('\n')
    .map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || '<br>'}</p>`)
    .join('');
  page.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText' }));
}

/** A Shoelace box by its label. */
export const slBox = (label: string, root: ParentNode = document) => $(`sl-input[label="${label}"], sl-textarea[label="${label}"]`, root);

/** Type into whatever has the focus, a key at a time, at the caret: what a key does unless the page refuses it. */
export async function typeKeys(chars: string) {
  for (const ch of chars) {
    const el = document.activeElement as HTMLInputElement;
    const go = el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, composed: true, cancelable: true }));
    if (go && 'value' in el) {
      const s = el.selectionStart ?? el.value.length;
      const e = el.selectionEnd ?? s;
      el.value = el.value.slice(0, s) + ch + el.value.slice(e);
      el.setSelectionRange(s + 1, s + 1);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: ch }));
    }
    await idle(1);
  }
}

/** A key (with Control, Shift, Alt) pressed on whatever has the focus, or on the page; resolves once the page has answered. */
export async function key(name: string, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}, on: Element | null = document.activeElement) {
  const target = on && on !== document.body ? on : document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt, bubbles: true, composed: true, cancelable: true }));
  target.dispatchEvent(new KeyboardEvent('keyup', { key: name, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt, bubbles: true, composed: true }));
  await idle();
}

/** The button with this accessible name (aria-label, else its words), anywhere on the page. */
export function button(name: string | RegExp, root: ParentNode = document): HTMLElement {
  const all = $$('button, sl-button, [role="button"]', root);
  const label = (b: Element) => b.getAttribute('aria-label') ?? text(b);
  const found = all.find((b) => (typeof name === 'string' ? label(b) === name : name.test(label(b))));
  if (!found) throw new Error(`no button ${name}: ${all.map(label).filter(Boolean).slice(0, 40).join(' | ')}`);
  return found;
}

/** Press a button by its name, and let the page answer. */
export async function press(name: string | RegExp, root: ParentNode = document) {
  button(name, root).click();
  await idle();
}

/** Choose an item from the dropdown menu behind the button of this name. */
export async function menu(trigger: string, item: string | RegExp) {
  const dropdown = button(trigger).closest('sl-dropdown')!;
  const items = $$('sl-menu-item', dropdown);
  const found = items.find((i) => (typeof item === 'string' ? text(i) === item : item.test(text(i))));
  if (!found) throw new Error(`no item ${item} in ${trigger}: ${items.map(text).join(' | ')}`);
  choose(found);
  await idle();
}

/**
 * Choose a menu item: what <sl-menu> does with a click on one. (It listens on a slot in its shadow root,
 * and happy-dom does not carry a click through a slot, so the menu's own event is sent here.)
 */
export function choose(item: Element) {
  const menu = item.closest('sl-menu')!;
  if (item.getAttribute('type') === 'checkbox') (item as unknown as { checked: boolean }).checked = !(item as unknown as { checked: boolean }).checked;
  menu.dispatchEvent(new CustomEvent('sl-select', { bubbles: true, composed: true, cancelable: false, detail: { item } }));
}

/** An input or textarea by its accessible name. */
export const box = <E extends HTMLElement = HTMLInputElement>(name: string, root: ParentNode = document) => $<E>(`[aria-label="${name}"]`, root);

/** A sheet's cell, by its reference. */
export const cell = (ref: string) => box(ref);

/** The toast's words, if one is up. */
export const toast = () => text(document.querySelector('.to-toast'));

/** What a download handed over, as bytes. */
export async function bytes(file: { blob: Blob }) {
  return new Uint8Array(await file.blob.arrayBuffer());
}
