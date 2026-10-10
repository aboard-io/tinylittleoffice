// A walk over the command registry (src/kit/commands.ts): in each app, from a document of its own templates and from
// the states its commands need (a card in hand, rows chosen, a slide presented, a shape chosen, a pen drawing, words
// typed in a row, a thing open), every command in force is run as its bar, menu, context bar or key would run it. None
// throws, nothing it starts is left failing, and the document stays one the kernel writes back byte for byte. The walk
// is also what runs the commands no other test reaches, for the registry's lint that every command is run by a test.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { appOf } from '../../src/kit/apps.ts';
import { inScope, live, run, type Command } from '../../src/kit/commands.ts';
import { KIT_COMMANDS } from '../../src/kit/keys.ts';
import { TEXT_COMMANDS } from '../../src/kit/text-commands.ts';
import { ROWS_COMMANDS } from '../../src/kit/rows-commands.ts';
import { parse, write } from '../../src/doc/index.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import { setLoop } from '../../src/apps/anim/model.ts';
import type { ToText } from '../../src/kit/text.ts';

// What the walk opens that would leave the page: a new tab, the printer, a question.
beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null);
  vi.spyOn(window, 'print').mockImplementation(() => undefined);
  vi.spyOn(window, 'confirm').mockImplementation(() => false);
  vi.spyOn(window, 'alert').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ed = any;
interface State {
  name: string;
  /** The template the walk begins from (an id of the app's templates). */
  tpl: string;
  /** What the commands of this state need, set on the editor. */
  set?: (ed: Ed, shell: ToShell) => unknown;
}

/** Everything a command left open, closed: dialogs (their questions answered with nothing), menus, the drawer, the palette. */
function closeAll() {
  for (const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) d.close();
  for (const p of document.querySelectorAll<HTMLElement>('[popover]:popover-open')) if (!p.matches('.to-context')) p.hidePopover();
}

/** One state of one app: every command in force, run; what failed, by id. */
async function walk(app: string, s: State): Promise<string[]> {
  const def = appOf(app)!;
  const tpl = def.templates.find((x) => x.id === s.tpl)!;
  const shell = await mount(`#/v1/${app}/${encodeDoc(tpl.doc)}`);
  await until(() => !!shell.editor && !!(shell.editor as Ed).updateComplete, 5000);
  const ed = shell.editor as Ed;
  await ed.updateComplete;
  await until(() => inScope(app).length > 0);
  await tick(50);
  await s.set?.(ed, shell);
  await ed.updateComplete;
  const failed: string[] = [];
  const fail = (id: string, e: unknown) => failed.push(`${s.name}: ${id}: ${e instanceof Error ? e.message : String(e)}`);
  let current = '';
  const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
    const reason = 'reason' in e ? e.reason : e.error;
    // A clipboard the test browser refuses, and a picture or a map tile it cannot fetch, are the browser's, not the command's.
    if (/clipboard|Document is not focused|NotAllowedError|Failed to fetch|NetworkError/i.test(String(reason?.message ?? reason))) return;
    fail(current || 'between commands', reason);
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onError);
  const scopes: [readonly Command[], () => unknown][] = [
    [inScope(app), () => ed],
    [TEXT_COMMANDS, () => ed.querySelector('to-text') as ToText | null],
    [ROWS_COMMANDS, () => (ed.rows?.range ? ed.rows : null)],
    [KIT_COMMANDS.filter((c) => c.id !== 'kit.shortcuts'), () => shell.page],
  ];
  const original = ed.value as string;
  /** Each command from the state as it was set: the document put back and the state set again, so no command's turn depends on the one before. */
  const reset = async () => {
    closeAll();
    if (ed.value !== original) {
      ed.value = original;
      await ed.updateComplete;
      await tick(0);
    }
    await s.set?.(ed, shell);
    await ed.updateComplete;
  };
  for (const [cmds, ctxOf] of scopes)
    for (const c of cmds) {
      await reset();
      const ctx = ctxOf();
      if (c.menu || !ctx || !c.where.length) continue;
      let ok = false;
      try {
        ok = live(c, ctx);
      } catch (e) {
        fail(`${c.id} (when)`, e);
      }
      if (!ok) continue;
      current = c.id;
      try {
        const r = run(c, ctx);
        if (r instanceof Promise) await Promise.race([r.catch((e) => onError({ reason: e } as PromiseRejectionEvent)), tick(30)]);
      } catch (e) {
        fail(c.id, e);
      }
      await tick(0);
      closeAll();
      await ed.updateComplete;
      await tick(0);
    }
  current = '';
  await tick(50);
  window.removeEventListener('error', onError);
  window.removeEventListener('unhandledrejection', onError);
  closeAll();
  // The document as it is now is one the kernel writes back as it reads it.
  const text = (shell.editor as Ed).value as string;
  if (write(parse(text)) !== text) failed.push(`${s.name}: the document no longer round-trips`);
  return failed;
}

const first = <T,>(xs: T[], f: (x: T) => boolean) => xs.find(f);
const PLAN: Record<string, State[]> = {
  write: [
    { name: 'words', tpl: 'invoice', set: (ed) => ed.focusFirst() },
    { name: 'words selected', tpl: 'invoice', set: (ed) => (ed.text.sel = { anchor: { block: 1, offset: 0 }, focus: { block: 1, offset: 4 } }) },
    { name: 'a document in hand', tpl: 'news', set: (ed) => (ed.cardAt = ed.doc.blocks.findIndex((b: { k: string; lang?: string }) => b.k === 'fence' && !!b.lang)) },
    { name: 'a card in hand', tpl: 'invoice', set: (ed) => (ed.cardAt = ed.doc.blocks.findIndex((b: { k: string }) => b.k === 'table')) },
  ],
  outline: [
    { name: 'a row', tpl: 'talk', set: (ed) => ed.focusFirst() },
    { name: 'rows chosen', tpl: 'talk', set: (ed) => ed.rows.choose(ed.items[1].at) },
  ],
  deck: [
    { name: 'a slide', tpl: 'talk', set: (ed) => ed.focusFirst() },
    { name: 'presenting', tpl: 'talk', set: (ed) => ed.show(0) },
    { name: 'a printed format', tpl: 'talk', set: (ed) => ed.setFormat('zine') },
  ],
  sheet: [
    { name: 'a cell', tpl: 'budget', set: (ed) => (ed.focusFirst(), (ed.here = { r: 1, c: 1, at: { rich: false, atStart: true, atEnd: true, all: true, empty: false, selectAll() {}, toEnd() {} } })) },
    { name: 'a block', tpl: 'budget', set: (ed) => ((ed.sel = [0, 0]), (ed.end = [2, 1]), (ed.menuRow = 1)) },
  ],
  calc: [
    { name: 'the entry', tpl: 'bill', set: (ed) => ed.setEntry('2+2') },
    { name: 'a line', tpl: 'bill', set: (ed) => ((ed.here = { i: 0, box: ed.querySelector('.calc-line'), offset: 0 }), ed.rows.choose(0)) },
  ],
  draw: [
    { name: 'the canvas', tpl: 'flowchart' },
    { name: 'a shape', tpl: 'flowchart', set: (ed) => (ed.sel = 0) },
    { name: 'shapes', tpl: 'flowchart', set: (ed) => (ed.picked = [0, 1]) },
    { name: 'a text', tpl: 'card', set: (ed) => (ed.sel = ed.shapes.findIndex((s: { k: string }) => s.k === 't')) },
    { name: 'a pen', tpl: 'flowchart', set: (ed) => ((ed.tool = 'v'), (ed.pen = [[40, 40], [120, 40], [80, 120]])) },
    { name: 'joining', tpl: 'flowchart', set: (ed) => ((ed.tool = 'k'), (ed.sel = 0)) },
    { name: 'a line', tpl: 'flowchart', set: (ed) => (ed.sel = ed.shapes.findIndex((s: { k: string }) => s.k === 'a' || s.k === 'l' || s.k === 'k' || s.k === 'j')) },
    { name: 'pixels', tpl: 'flowchart', set: async (ed) => (ed.view.grid ? undefined : (ed.setMode(8), await ed.updateComplete), ed.paint(1, 1)) },
  ],
  diagram: [
    { name: 'a tree', tpl: 'mind-launch', set: (ed) => ed.open(first(ed.view.d.shapes, (s: { hit?: { k: string } }) => s.hit?.k === 'line')!.hit) },
    { name: 'a thing focused', tpl: 'mind-launch', set: (ed) => (ed.here = first(ed.view.d.shapes, (s: { hit?: { k: string } }) => s.hit?.k === 'line')!.hit) },
    { name: 'lanes', tpl: 'lanes-order', set: (ed) => (ed.here = first(ed.view.d.shapes, (s: { hit?: { k: string } }) => s.hit?.k === 'lane')?.hit ?? null) },
    { name: 'a network', tpl: 'net-webapp', set: (ed) => (ed.here = first(ed.view.d.shapes, (s: { hit?: { k: string } }) => s.hit?.k === 'edge')?.hit ?? null) },
    { name: 'joining', tpl: 'net-webapp', set: (ed) => ed.armJoin() },
  ],
  anim: [
    { name: 'the stage', tpl: 'bounce' },
    { name: 'a shape', tpl: 'bounce', set: (ed) => (ed.sels = [0]) },
    { name: 'drawing', tpl: 'bounce', set: (ed) => ed.setMode('draw') },
    { name: 'four times', tpl: 'bounce', set: (ed) => ed.act(setLoop(ed.doc, 4)) },
  ],
  board: [
    { name: 'a card', tpl: 'project', set: (ed) => (ed.here = { at: ed.view.stages[0].cards[0].at, tx: ed.querySelector('.board-card to-text') }) },
    { name: 'a stage name', tpl: 'project', set: (ed) => ((ed.here = { at: ed.view.stages[1].at, tx: ed.querySelector('.board-head to-text') }), (ed.menu = ed.view.stages[1].at)) },
    { name: 'cards chosen', tpl: 'project', set: (ed) => ed.rows.choose(ed.view.stages[1].cards[0].at) },
    { name: 'as rows', tpl: 'project', set: (ed) => ((ed.menu = ed.view.stages[1].at), ed.edit([{ op: 'head', key: 'look', value: 'rows' }])) },
  ],
  todo: [
    { name: 'a task', tpl: 'week', set: (ed) => ((ed.here = ed.view.tasks[1]), (ed.hereTx = ed.querySelectorAll('.todo-row to-text')[1]), (ed.menuAt = ed.view.tasks[1].at)) },
    { name: 'a due date', tpl: 'week', set: (ed) => ((ed.menuAt = ed.view.tasks.find((x: { due?: string }) => x.due)?.at ?? ed.view.tasks[0].at), ed.rows.choose(ed.view.tasks[0].at)) },
  ],
  cal: [
    { name: 'a month', tpl: 'family', set: (ed) => ((ed.sweep = { from: ed.todayDay(), to: ed.todayDay() + 1 }), (ed.here = { day: ed.todayDay() })) },
    { name: 'an entry', tpl: 'family', set: (ed) => (ed.here = { el: ed.querySelector('.cal-chip, .cal-agenda-item') }) },
    { name: 'a year', tpl: 'family', set: (ed) => ed.setMode('year') },
    { name: 'a schedule', tpl: 'project', set: (ed) => (ed.here = { at: ed.view.items[1].at }) },
    { name: 'tasks chosen', tpl: 'project', set: (ed) => ed.rows.choose(ed.view.items[1].at) },
  ],
  trip: [
    { name: 'a stop', tpl: 'weekend', set: (ed) => (ed.here = { i: 1, field: 'name' }) },
    { name: 'stops chosen', tpl: 'weekend', set: (ed) => ed.rows.choose(0) },
    { name: 'a pin', tpl: 'weekend', set: (ed) => (ed.pinAt = 0) },
    { name: 'presenting', tpl: 'weekend', set: (ed) => ((ed.presenting = 0), ed.requestUpdate()) },
  ],
  site: [
    { name: 'the page', tpl: 'cafe' },
    { name: 'a thing in hand', tpl: 'cafe', set: (ed) => ed.hold(String(ed.doc.blocks.findIndex((b: { k: string }) => b.k === 'p'))) },
    { name: 'preview', tpl: 'cafe', set: (ed) => ed.startPreview() },
  ],
};

for (const [app, states] of Object.entries(PLAN))
  test(`every command of ${app} in force runs, in each of its states, and leaves a document the kernel keeps`, { timeout: 60000 }, async () => {
    const failed: string[] = [];
    for (const s of states) failed.push(...(await walk(app, s)));
    expect(failed).toStrictEqual([]);
  });
