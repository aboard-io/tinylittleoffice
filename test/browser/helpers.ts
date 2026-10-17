// A shell on the page, at a link; a wait for something to be so; two fingers.
import '../../src/styles.css';
// The type loaded before any test lays out words: every width is Plex's, never the fallback's of the moment before.
import './fonts.ts';
import '../../src/kit/core/shell.ts';
import type { ToShell } from '../../src/kit/core/shell.ts';
import { currentHash } from '../../src/kit/core/route.ts';
import type { ToPrivacy } from '../../src/kit/ui/privacy-dialog.ts';
import { applySize } from '../../src/kit/ui/zoom.ts';

// Every test is at the size of everything the shell draws (kit/ui/zoom.ts: the normal size is BASE, 1.3), an editor
// mounted without the shell too: a length measured on the screen is BASE times the stylesheet's.
applySize();

export async function mount(hash = ''): Promise<ToShell> {
  document.body.innerHTML = '';
  history.replaceState(null, '', location.pathname + hash);
  const shell = document.createElement('to-shell') as ToShell;
  document.body.append(shell);
  await shell.updateComplete;
  return shell;
}

/**
 * The address with the document as it is now: the shell's flush, then location.hash. The shell writes the link only
 * when typing stops for fifteen seconds (kit/core/shell.ts PAUSE), so a test reads it through the flush, never by waiting.
 */
export const link = (): string => currentHash();

import { until } from './wait.ts';
export { settled, tick, until } from './wait.ts';

/** The drawer open with a document's This document in it, as a person opens it: the menu button. */
export async function openDrawerDoc(shell: HTMLElement): Promise<HTMLElement> {
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('dialog.to-drawer[open] .to-drawer-doc'));
  return shell.querySelector<HTMLElement>('.to-drawer-doc')!;
}

/** Share…, from the drawer (the header has no Share). */
export async function openShare(shell: HTMLElement): Promise<void> {
  (await openDrawerDoc(shell)).querySelector<HTMLButtonElement>('.to-drawer-share')!.click();
}

/** Two touch pointers put down at a and b, moved to a2 and b2 in steps, and lifted unless `hold`. */
export async function pinch(at: Element, a: [number, number], b: [number, number], a2: [number, number], b2: [number, number], hold = false) {
  const fire = (type: string, id: number, [x, y]: [number, number]) => {
    const target = type === 'pointerdown' ? at : (document.elementFromPoint(x, y) ?? document.body);
    target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 11, clientX: x, clientY: y, bubbles: true, cancelable: true, composed: true }));
  };
  fire('pointerdown', 11, a);
  fire('pointerdown', 12, b);
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const f = (p: [number, number], q: [number, number]): [number, number] => [p[0] + ((q[0] - p[0]) * i) / steps, p[1] + ((q[1] - p[1]) * i) / steps];
    fire('pointermove', 11, f(a, a2));
    fire('pointermove', 12, f(b, b2));
    await new Promise(requestAnimationFrame);
  }
  if (hold) return () => (fire('pointerup', 11, a2), fire('pointerup', 12, b2));
  fire('pointerup', 11, a2);
  fire('pointerup', 12, b2);
  return () => {};
}

/** What the last toast said to a screen reader: the one region holding words, in the open dialog or the page (kit/ui/toast.ts). */
export const said = () => [...document.querySelectorAll('.to-said')].map((r) => r.textContent ?? '').find(Boolean) ?? '';

/** The Privacy dialog without a document (what this device holds), drawn alone and opened. */
export async function privacyAlone(): Promise<ToPrivacy> {
  const privacy = document.body.appendChild(document.createElement('to-privacy') as ToPrivacy);
  await privacy.updateComplete;
  await privacy.show();
  return privacy;
}

/** A file dropped on the page, as a person drags one in (kit/file/open.ts: the menu's Open a file… is gone, Paul, 2026-10-12). */
export function dropFile(file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
}
