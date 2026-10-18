/**
 * What the stories share: an app's editor mounted as a page mounts one (kit/core/mount.ts `mount`), its events told to
 * Storybook's Actions panel; two editors sharing one document, each one's ops handed to the other; an app's templates,
 * the sample documents every app story draws from (src/apps/<id>/templates.ts), never documents made up here.
 */
import { action } from 'storybook/actions';
import { appOf, mount, type DocPick, type Mounted, type Template } from '../src/editors.ts';
import type { Op } from '../src/doc/index.ts';

/** A story's box: a block element with a class the Storybook's page sheet sizes (.storybook/preview.css). */
export function box(cls = 'sb-box'): HTMLDivElement {
  const el = document.createElement('div');
  el.className = cls;
  return el;
}

/** Said in the Actions panel and on the console, never thrown into nowhere: a mount that fails is a story that fails. */
const failed = (what: string) => (e: unknown) => console.error(`${what} failed`, e);

/**
 * `app`'s editor over `text`, mounted into a box that is returned at once (a story renders synchronously, the editor
 * arrives when its module has): every "docchange", "docops" and "docpick" told to the Actions panel. `ready` is told
 * the mounted editor.
 */
export function editorBox(app: string, text: string, opts: { readOnly?: boolean; ready?: (m: Mounted) => void } = {}): HTMLDivElement {
  const el = box();
  el.dataset.app = app;
  el.addEventListener('docpick', (e) => action('docpick')((e as DocPick).detail));
  mount(app, text, el, action('docchange'), { readOnly: opts.readOnly, onOps: action('docops') })
    .then((m) => {
      el.dataset.ready = '';
      opts.ready?.(m);
    })
    .catch(failed(`mounting ${app}`));
  return el;
}

/**
 * Two editors of `app` over one document, side by side, as two people on two pages share it: each change's ops, as
 * the editor tells them (`onOps`), handed to the other's `applyRemote` (docs/library.md, Shared editing from a page).
 * One page's change reaches the other before anything else can happen here, so nothing waits to be rebased, as it
 * would on a server between two browsers. Type in either and the other follows, its own undo taking back only its own.
 */
export function sharedBoxes(app: string, text: string): HTMLDivElement {
  const row = box('sb-row');
  const mounted: (Mounted | null)[] = [null, null];
  for (const i of [0, 1]) {
    const who = i ? 'B' : 'A';
    const el = box();
    el.dataset.app = app;
    el.dataset.person = who;
    const col = box('');
    col.append(Object.assign(document.createElement('p'), { className: 'sb-caption', textContent: `Person ${who}` }), el);
    row.append(col);
    mount(app, text, el, action(`docchange ${who}`), {
      onOps: (ops: Op[], base) => {
        action(`docops ${who}`)({ ops, base });
        mounted[1 - i]?.applyRemote(ops);
      },
    })
      .then((m) => {
        mounted[i] = m;
        el.dataset.ready = '';
      })
      .catch(failed(`mounting ${app}`));
  }
  return row;
}

/** An app's templates, in its language now: the sample documents its stories show. */
export async function templatesOf(app: string): Promise<Template[]> {
  const def = appOf(app);
  if (!def) throw new Error(`no app "${app}"`);
  return def.templates();
}
