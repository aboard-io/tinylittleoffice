// More of what happy-dom leaves out, for the shell and the dialogs it opens (test/dom/env.ts has the rest).

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
