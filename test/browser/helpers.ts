// A shell on the page, at a link; and a wait for something to be so.
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
