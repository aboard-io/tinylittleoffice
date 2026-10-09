// A shell on the page, at a link; and a wait for something to be so.
import '../../src/styles.css';
import '../../src/kit/shell.ts';
import type { ToShell } from '../../src/kit/shell.ts';

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
