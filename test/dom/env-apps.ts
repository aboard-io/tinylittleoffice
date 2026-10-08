// More of what happy-dom leaves out, for the shell and the dialogs it opens (test/dom/env.ts has the rest).
import { ReactiveElement } from 'lit';

// Every Lit element on the page (the editors, the shell, Shoelace's parts), so a test can wait for them all to finish
// drawing without searching the whole page each time.
export const litElements = new Set<ReactiveElement>();
const connected = ReactiveElement.prototype.connectedCallback;
const disconnected = ReactiveElement.prototype.disconnectedCallback;
ReactiveElement.prototype.connectedCallback = function (this: ReactiveElement) {
  litElements.add(this);
  connected.call(this);
};
ReactiveElement.prototype.disconnectedCallback = function (this: ReactiveElement) {
  litElements.delete(this);
  disconnected.call(this);
};

// Whether an element is shown, as Shoelace asks of everything it might move the focus to: happy-dom works out a whole
// computed style for it, which is most of the time a keystroke takes here. No stylesheet is loaded in these tests,
// so it comes down to the element and its ancestors not being hidden.
Element.prototype.checkVisibility = function (this: Element) {
  for (let e: Element | null = this; e; e = e.parentElement ?? ((e.getRootNode() as ShadowRoot).host || null)) {
    if (e.hasAttribute('hidden') || (e as HTMLElement).style?.display === 'none') return false;
  }
  return true;
};

// An animation that is over as soon as it starts: Shoelace waits for a dialog's to finish before it says the dialog has closed.
Element.prototype.animate = function () {
  const done: (() => void)[] = [];
  const a = {
    finished: Promise.resolve(),
    cancel() {},
    finish() {},
    addEventListener(type: string, cb: () => void) {
      if (type === 'finish') done.push(cb);
    },
    removeEventListener() {},
  };
  queueMicrotask(() => done.forEach((cb) => cb()));
  return a as unknown as Animation;
};

// history.replaceState and pushState change the address without a hashchange in a browser; happy-dom sends one a moment
// later, and the shell, taking it for a new link, would forget the document's undo. Those are dropped here.
const quiet = new Set<string>();
for (const name of ['replaceState', 'pushState'] as const) {
  const real = History.prototype[name];
  History.prototype[name] = function (this: History, state: unknown, unused: string, url?: string | URL | null) {
    if (url != null) quiet.add(new URL(String(url), location.href).href);
    return real.call(this, state, unused, url);
  };
}
window.addEventListener(
  'hashchange',
  (e) => {
    if (!quiet.delete(e.newURL)) return;
    e.stopImmediatePropagation();
  },
  true,
);
// (Setting location.hash does navigate: an address set that way is not one to drop.)
const hashOf = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(location), 'hash');
if (hashOf?.set) {
  Object.defineProperty(location, 'hash', {
    configurable: true,
    get: () => hashOf.get!.call(location),
    set: (v: string) => {
      const to = new URL(location.href);
      to.hash = v;
      quiet.delete(to.href);
      hashOf.set!.call(location, v);
    },
  });
}

// The rich-text editor asks what the selection is formatted as; happy-dom has no editing commands, so: nothing.
const doc = document as unknown as Record<string, unknown>;
if (!('queryCommandValue' in document)) doc.queryCommandValue = () => '';
if (!('queryCommandState' in document)) doc.queryCommandState = () => false;
// Focusing an editable element puts the caret in it in a browser; happy-dom leaves the selection at the document, whose
// parent element is null, and the editor asks for that element's style. The document's own style answers instead.
const computed = window.getComputedStyle.bind(window);
window.getComputedStyle = ((el: Element | null, pseudo?: string | null) => computed(el ?? document.documentElement, pseudo)) as typeof window.getComputedStyle;

// A download is a link to a blob, clicked: here the file is kept (window.__saved) instead of going anywhere.
const blobs = new Map<string, Blob>();
let made = 0;
URL.createObjectURL = (b: Blob | MediaSource) => {
  const url = `blob:${location.origin}/${++made}`;
  blobs.set(url, b as Blob);
  return url;
};
URL.revokeObjectURL = (url: string) => void blobs.delete(url);
const saved: { name: string; blob: Blob }[] = [];
(window as unknown as { __saved: typeof saved }).__saved = saved;
const anchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  const blob = blobs.get(this.href);
  if (this.download && blob) return void saved.push({ name: this.download, blob });
  return anchorClick.call(this);
};
// A page opened in a new tab (a compose box, a link): kept, not opened.
const opened: string[] = [];
(window as unknown as { __opened: string[] }).__opened = opened;
window.open = ((url?: string | URL) => {
  opened.push(String(url ?? ''));
  return null;
}) as typeof window.open;
