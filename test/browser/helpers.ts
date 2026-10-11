// A shell on the page, at a link; a wait for something to be so; two fingers.
import '../../src/styles.css';
import '../../src/kit/shell.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import { applySize } from '../../src/kit/zoom.ts';

// Every test is at the size of everything the shell draws (kit/zoom.ts: the normal size is BASE, 1.3), an editor
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

export const tick = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

/** Until `test()` holds, or a while has passed. */
export async function until(test: () => boolean, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  while (!test()) {
    if (Date.now() > end) throw new Error('never happened');
    await tick(20);
  }
}

/** The drawer open with a document's This document in it, as a person opens it: the menu button. */
export async function openDrawerDoc(shell: HTMLElement): Promise<HTMLElement> {
  shell.querySelector<HTMLButtonElement>('.to-burger')!.click();
  await until(() => !!shell.querySelector('dialog.to-drawer[open] .to-drawer-doc'));
  return shell.querySelector<HTMLElement>('.to-drawer-doc')!;
}

/** Share…, from the drawer (the header has no Share: round nine). */
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

/** What the last toast said to a screen reader: the one region holding words, in the open dialog or the page (kit/toast.ts). */
export const said = () => [...document.querySelectorAll('.to-said')].map((r) => r.textContent ?? '').find(Boolean) ?? '';
