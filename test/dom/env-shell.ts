// What the shell (<to-app>) needs from happy-dom beyond env.ts: a browser's way with history, and somewhere for downloads to land.

// The browser's own settings, as the e2e tests start with them (playwright.config.ts): things kept, links open in the editor, text apps as text.
localStorage.setItem('tinyoffice.keep', '1');
localStorage.setItem('tinyoffice.open', 'edit');
localStorage.setItem('tinyoffice.edit', 'text');

// happy-dom fires "hashchange" for history.replaceState and pushState; a browser does not. The shell writes every
// edit with replaceState, and would take each one for a new link (forgetting its undo). Those events are dropped here.
const quiet = new Map<string, number>();
for (const name of ['replaceState', 'pushState'] as const) {
  const real = history[name].bind(history);
  history[name] = (data: unknown, unused: string, url?: string | URL | null) => {
    const before = location.href;
    real(data, unused, url);
    if (location.href !== before && location.hash !== new URL(before).hash) quiet.set(location.href, (quiet.get(location.href) ?? 0) + 1);
  };
}
window.addEventListener(
  'hashchange',
  (e) => {
    const n = quiet.get(e.newURL);
    if (!n) return;
    if (n === 1) quiet.delete(e.newURL);
    else quiet.set(e.newURL, n - 1);
    e.stopImmediatePropagation();
  },
  { capture: true },
);

/** Every file the page has handed over (kit/browser.ts saveFile: a link with "download", clicked). */
export const downloads: { name: string; blob: Blob }[] = [];
const blobs = new Map<string, Blob>();
let made = 0;
URL.createObjectURL = (obj: Blob | MediaSource) => {
  const url = `blob:${location.origin}/${++made}`;
  blobs.set(url, obj as Blob);
  return url;
};
URL.revokeObjectURL = (url: string) => void blobs.delete(url);
const click = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  const blob = blobs.get(this.href);
  if (this.download && blob) downloads.push({ name: this.download, blob });
  else click.call(this);
};

// Rich text asks the document what is under the caret; happy-dom has no editing commands, so nothing is (and a command does nothing).
const doc = document as Document & Record<string, unknown>;
if (!doc.queryCommandValue) doc.queryCommandValue = () => '';
if (!doc.queryCommandState) doc.queryCommandState = () => false;
if (!doc.execCommand) doc.execCommand = () => false;

// No animations (as env.ts), but ones that finish: Shoelace waits for a dialog's closing animation to say
// "finish" before it says the dialog is gone ("sl-after-hide"), which is when a document edited inside another is put back.
Element.prototype.animate = function () {
  const done = Promise.resolve();
  return {
    finished: done,
    cancel() {},
    finish() {},
    addEventListener(type: string, fn: () => void) {
      if (type === 'finish') void done.then(fn);
    },
  } as unknown as Animation;
};

// ":focus-within" in happy-dom misses focus on an element slotted into a dialog, so Shoelace's dialog, which
// keeps the focus inside itself, takes the focus back from the editor in it (a drawing being edited inside a
// document) the moment the editor gets it. Here an element has the focus within it when the focused one is inside it.
const matches = Element.prototype.matches;
Element.prototype.matches = function (this: Element, selector: string) {
  if (selector !== ':focus-within') return matches.call(this, selector);
  for (let at: Node | null = document.activeElement; at; at = at.parentNode ?? (at as unknown as ShadowRoot).host ?? null) if (at === this) return true;
  return false;
};

// happy-dom lays nothing out, so nothing is hidden by layout; asking it (Shoelace does, for every element in an
// open dialog, each time the focus moves) works out every element's whole style, which is slow and says nothing here.
Element.prototype.checkVisibility = () => true;
// The same for whether an element scrolls (Shoelace asks that of each one too): nothing overflows where nothing is laid out;
// and for which way text runs (each menu item asks, as it draws): left to right. Any other part of an element's style is
// worked out by happy-dom as before (it reads every stylesheet on the page to do it), when it is first asked for.
const styleOf = window.getComputedStyle.bind(window);
window.getComputedStyle = (el: Element, pseudo?: string | null) => {
  let real: CSSStyleDeclaration | null = null;
  return new Proxy({} as CSSStyleDeclaration, {
    get(_, k) {
      if (k === 'overflowX' || k === 'overflowY') return 'visible';
      if (k === 'direction') return 'ltr';
      real ??= styleOf(el, pseudo);
      const v = Reflect.get(real, k);
      return typeof v === 'function' ? v.bind(real) : v;
    },
  });
};

// A clock the tests can move on: undo takes changes a moment apart as separate steps, and the tests need not wait that moment.
let ahead = 0;
const now = Date.now.bind(Date);
Date.now = () => now() + ahead;
/** Let this much time pass, as far as the page's clock knows. */
export const passTime = (ms: number) => void (ahead += ms);

// A frame (two links compared side by side) gets an empty page, not the site: what runs inside one is the real browser's to test.
type Win = { happyDOM: { settings: { fetch: { interceptor: unknown } } }; Response: typeof Response };
const win = window as unknown as Win;
win.happyDOM.settings.fetch.interceptor = {
  beforeAsyncRequest: async () => new win.Response('<!doctype html><title>frame</title>', { status: 200, headers: { 'content-type': 'text/html' } }),
};
