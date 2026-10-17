/**
 * The one voice: anything says something with toast('Link copied'), and the page's <to-toast> (kit/ui/toast.ts)
 * shows the words and says them. An event on the window, so what speaks needs no element: a format's builder in
 * kit/file/exports.ts speaks through it in the page, and the API (src/api.ts), which has no page, carries no chrome.
 * A page may offer one thing to do beside the words (`action`: "Moved to Won. Undo"), drawn as a button after them;
 * the event's `detail` is the words either way, and the action rides on the event beside it.
 */
export const TOAST = 'to-toast';
/** What a toast offers beside its words: the button's label, and what it does. */
export interface Action {
  label: string;
  does: () => void;
}
export function toast(message: string, opts?: { action?: Action }) {
  window.dispatchEvent(Object.assign(new CustomEvent(TOAST, { detail: message }), { action: opts?.action }));
}
