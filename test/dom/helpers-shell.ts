/** The whole shell, <to-app>, on a page emulated by happy-dom: opened at a link, worked as a person would. */
import { downloads } from './env-shell.ts';
import '../../src/widgets/meter.ts';
import '../../src/kit/tip.ts';
import '../../src/app.ts';
import type { ToApp } from '../../src/app.ts';
import { ReactiveElement } from 'lit';
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
  await arrived();
  return app;
}

/** Wait for the page to show what the link holds: its editor drawn (unless it waits for a password), then everything settled. */
async function arrived() {
  await idle();
  const m = /^#\/v\d+\/([a-z]+)(\.[a-z.]+)?(?:\/(E?))?/.exec(location.hash);
  if (m && m[2] !== '.embed' && m[3] !== 'E') {
    await until(() => (document.querySelector(`to-${m[1]}`) as (Element & { hasUpdated?: boolean }) | null)?.hasUpdated, `the ${m[1]} editor`);
    await idle();
  }
}

/** Open a link in a fresh page: nothing kept from before but what the device keeps. */
export async function fresh(hash: string, path = '/') {
  app?.remove();
  document.body.innerHTML = '';
  history.replaceState(null, '', path + hash);
  app = document.createElement('to-app');
  document.body.append(app);
  await arrived();
  return app;
}

/** Open the link the page is at now in a fresh page: the URL is the document, so this is the persistence test. */
export const reopen = () => fresh(location.hash, location.pathname);

// Every element (the shell's, an editor's, Shoelace's) asks to be drawn through ReactiveElement's requestUpdate:
// noted here, so waiting for the page to settle need not look through the whole page for what is still to draw.
const drawing = new Set<ReactiveElement>();
const requestUpdate = ReactiveElement.prototype.requestUpdate;
ReactiveElement.prototype.requestUpdate = function (this: ReactiveElement, ...args: Parameters<ReactiveElement['requestUpdate']>) {
  drawing.add(this);
  return requestUpdate.apply(this, args);
};

/** Let everything on the page finish drawing (drawing one thing may give another something to draw), and a turn or two of the clock. */
export async function idle(turns = 2) {
  for (let i = 0; i < turns; i++) {
    for (let k = 0; k < 20; k++) {
      // (One not on the page yet draws when it is put there: it waits here till then.)
      const now = [...drawing].filter((e) => e.isConnected);
      if (!now.length) break;
      for (const e of now) drawing.delete(e);
      await Promise.all(now.map((e) => e.updateComplete));
    }
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
    await new Promise((r) => setTimeout(r, 3));
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

/** A press and release of the pointer on something drawn (a shape, a card): where it is, not how far it moves. */
export async function poke(el: Element | null) {
  if (!el) throw new Error('nothing to poke');
  const opts = { bubbles: true, composed: true, cancelable: true, button: 0, buttons: 1, pointerId: 1, pointerType: 'mouse', isPrimary: true };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  el.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
  el.dispatchEvent(new MouseEvent('click', opts));
  await idle();
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
    const el = focused() as HTMLInputElement;
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

/** What has the focus, inside whatever shadow root it is in. */
export function focused(): Element {
  let el: Element | null = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el ?? document.body;
}

/** A key (with Control, Shift, Alt) pressed on whatever has the focus, or on the page; resolves once the page has answered. */
export async function key(name: string, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}, on: Element | null = focused()) {
  const target = on ?? document.body;
  target.dispatchEvent(new KeyboardEvent('keydown', { key: name, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt, bubbles: true, composed: true, cancelable: true }));
  target.dispatchEvent(new KeyboardEvent('keyup', { key: name, ctrlKey: !!mods.ctrl, shiftKey: !!mods.shift, altKey: !!mods.alt, bubbles: true, composed: true }));
  await idle();
}

/**
 * Copy, cut or paste where the focus is, as Ctrl+C, X and V do: the event, with the clipboard's data, which
 * the page may take over (a sheet copies its cells); what it puts there goes on the clipboard.
 */
export async function clip(kind: 'copy' | 'cut' | 'paste') {
  const data = new DataTransfer();
  if (kind === 'paste') data.setData('text/plain', await navigator.clipboard.readText());
  const go = focused().dispatchEvent(new ClipboardEvent(kind, { clipboardData: data, bubbles: true, composed: true, cancelable: true }));
  if (kind !== 'paste' && !go) await navigator.clipboard.writeText(data.getData('text/plain'));
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
