// A bare page with the Board on it, as a page that is not Tiny Little Office's site holds one (docs/library.md, The
// library's own apps): the editors' stylesheet and the Board's, the Board registered (src/board.ts), the
// page's own column padded by the gutter (`--to-gutter`, as the site's column and a host's are: an editor's bar reaches
// across it to the column's edges), and `board()`, an editor of it mounted by the editors' `mount` (kit/core/mount.ts) with the
// page's own callbacks; and the waits every browser file uses (until a test holds, until the page is quiet), which are
// conditions, never times (the suite's own, test/browser/wait.ts, and the page at rest).
import '../../../editors.css';
import { mount, type Own } from '../../../kit/core/mount.ts';
import type { Op } from '../../../doc/index.ts';
import { registerBoard } from '../../../board.ts';
import type { ToBoardEditor } from '../editor.ts';
import { tick } from '../../../../test/browser/wait.ts';

registerBoard();
const column = document.createElement('style');
column.textContent = 'main { padding-inline: var(--to-gutter); }';
document.head.append(column);

export { tick, until } from '../../../../test/browser/wait.ts';

/**
 * Until the page is quiet: the editor drawn, then every Lit element on the page drawn with nothing left to draw, twice
 * in a row, a frame and a task apart (a focus moved after a draw, a draw a frame asked for). The suite's tests waited
 * 30 ms here, which a loaded machine can outrun; this waits for what the 30 ms stood for, and says so if it never comes.
 */
export async function settle(el: { updateComplete: Promise<boolean> }, ms = 3000): Promise<void> {
  const end = Date.now() + ms;
  await el.updateComplete;
  let calm = 0;
  while (calm < 2) {
    if (Date.now() > end) throw new Error('the page never settled');
    const lit = [...document.querySelectorAll('*')].filter((x): x is Element & { updateComplete: Promise<boolean> } => 'updateComplete' in x);
    calm = (await Promise.all(lit.map((x) => x.updateComplete))).every(Boolean) ? calm + 1 : 0;
    await new Promise(requestAnimationFrame);
    await tick();
  }
}

/** What the page heard from the editor, in order: each change's ops (`onOps`), then its text. */
export type Heard = { ops: Op[]; base: number } | string;

/**
 * The Board mounted on an empty page holding `value`: the element, the last text the page was told, everything it
 * heard (ops and texts, in order), and `applyRemote`, which takes another's ops in.
 */
export async function board(value: string, own: Own<unknown> = {}) {
  document.body.innerHTML = '';
  window.scrollTo(0, 0);
  const main = document.createElement('main');
  document.body.append(main);
  const heard: Heard[] = [];
  const changes: string[] = [];
  const m = await mount('board', value, main, (next) => (changes.push(next), heard.push(next)), { ...own, onOps: (ops, base) => heard.push({ ops, base }) });
  const el = m.editor as unknown as ToBoardEditor;
  await el.updateComplete;
  return { el, last: () => changes.at(-1), heard, applyRemote: m.applyRemote };
}
