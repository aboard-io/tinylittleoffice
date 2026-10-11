// Every key in docs/editing.md's tables does what its row says, in at least one app: the rows are read from the
// generated tables themselves (§10, `npm run commands`), each key is pressed where its row says it is heard (in words,
// on the canvas, in a cell, on the rail, in the show…), from a state where its command is in force, and the command
// the row names is the one that runs (src/kit/commands.ts `trace`). The browser's own keys (Copy, Cut, Paste: `native`)
// raise their events, which the clipboard tests follow; they are not pressed here.
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import editing from '../../docs/editing.md?raw';
import { mount, tick, until } from './helpers.ts';
import { encodeDoc } from '../../src/kit/codec.ts';
import { appOf, apps } from '../../src/kit/apps.ts';
import { keyList, labelOf, register, registered, trace, type Command } from '../../src/kit/commands.ts';
import type { ToShell } from '../../src/kit/shell.ts';
import '../../src/kit/rows-commands.ts';

beforeEach(() => {
  vi.spyOn(window, 'open').mockImplementation(() => null);
  vi.spyOn(window, 'print').mockImplementation(() => undefined);
  vi.spyOn(window, 'confirm').mockImplementation(() => false);
});
afterEach(() => vi.restoreAllMocks());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ed = any;

/** The rows of the generated tables: the scope a table is for, the keys written in the row, the command's words. */
function rows(): { scope: string; keys: string[]; label: string }[] {
  const part = editing.slice(editing.indexOf('<!-- commands:begin'), editing.indexOf('<!-- commands:end'));
  const out: { scope: string; keys: string[]; label: string }[] = [];
  let scope = '';
  for (const line of part.split('\n')) {
    const head = /^### .*\(`([a-z]+)`\)$/.exec(line);
    if (head) scope = head[1];
    const row = /^\| (.*?) \| (.*?) \| (.*?) \|$/.exec(line);
    if (!row || row[1] === 'Keys' || row[1].startsWith('---') || !row[1]) continue;
    out.push({ scope, keys: [...row[1].matchAll(/`([^`]+)`/g)].map((m) => m[1]), label: row[2].replace(/\\\|/g, '|').replace(/&lt;/g, '<') });
  }
  return out;
}

const CODES: Record<string, string> = { '.': 'Period', ',': 'Comma', '/': 'Slash', '[': 'BracketLeft', ']': 'BracketRight', '=': 'Equal', '-': 'Minus' };
/** A key as the registry writes it, pressed: its key, its code, its modifiers (Mod is Ctrl here). */
function press(at: EventTarget, spec: string) {
  const parts = spec.split('+');
  const k = parts.pop() || '+';
  const key = k === 'Space' ? ' ' : k.length === 1 && /[A-Z]/.test(k) && !parts.includes('Shift') ? k.toLowerCase() : k;
  const code = /^[A-Z]$/.test(k) ? `Key${k}` : /^\d$/.test(k) ? `Digit${k}` : (CODES[k] ?? (k === 'Space' ? 'Space' : k));
  const e = new KeyboardEvent('keydown', {
    key,
    code,
    ctrlKey: parts.includes('Mod'),
    altKey: parts.includes('Alt'),
    shiftKey: parts.includes('Shift'),
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  at.dispatchEvent(e);
}

interface Place {
  /** A template of the app to start from, and what to set first. */
  tpl: string;
  set?: (ed: Ed) => unknown;
  /** Where the key is pressed. */
  at: (ed: Ed, shell: ToShell) => EventTarget | null;
}
const words = (sel: string) => (ed: Ed) => {
  const tx = ed.querySelector(`${sel} .tx`) as HTMLElement | null;
  tx?.focus();
  return tx;
};
/** The n-th of what a selector finds (from 0), its words focused when it is words. */
function nth(ed: Ed, sel: string, n: number): HTMLElement | null {
  const el = ed.querySelectorAll(sel)[n] as HTMLElement | undefined;
  const tx = el?.querySelector<HTMLElement>('.tx');
  tx?.focus();
  return tx ?? el ?? null;
}
/** For each scope and place (a command's `at`, '' for its scope's own), where its keys are pressed from. */
const PLACES: Record<string, Record<string, Place[]>> = {
  kit: { '': [{ tpl: 'write:invoice', at: () => document.body }] },
  text: {
    '': [
      { tpl: 'write:invoice', set: (ed) => ed.focusFirst(), at: words('to-text.write-text') },
      { tpl: 'deck:talk', set: (ed) => ed.focusBox('words'), at: words('to-text.deck-words') },
    ],
  },
  rows: {
    '': [...[1, 2, 3, 4].map((i) => ({ tpl: 'outline:talk', set: (ed: Ed) => ed.rows.choose(ed.items[i].at), at: (ed: Ed) => ed.rows.o.box() }))],
  },
  write: {
    words: [{ tpl: 'write:invoice', set: (ed) => ed.focusFirst(), at: words('to-text.write-text') }],
    // The table in hand (it has the focus as a card: cardAt), the keys pressed on it.
    card: [{ tpl: 'write:invoice', set: (ed) => (ed.cardAt = ed.doc.blocks.findIndex((b: { k: string }) => b.k === 'table')), at: (ed) => ed.text.tx.children[ed.cardAt] }],
  },
  outline: {
    words: [
      ...[1, 2, 3, 4, 6].map((i) => ({ tpl: 'outline:talk', at: (ed: Ed) => nth(ed, '.ol-row to-text', i) })),
      {
        tpl: 'outline:talk',
        set: (ed) => ed.zoomTo(ed.items.find((_: unknown, i: number) => ed.items[i + 1] && ed.items[i + 1].depth > ed.items[i].depth).at),
        at: (ed) => nth(ed, '.ol-row to-text', 1),
      },
    ],
  },
  deck: {
    words: [{ tpl: 'deck:talk', set: (ed) => ed.go(1), at: words('to-text.deck-title') }],
    slide: [{ tpl: 'deck:talk', at: words('to-text.deck-words') }],
    rail: [{ tpl: 'deck:talk', at: (ed) => ed.querySelector('.deck-thumb') }],
    show: [{ tpl: 'deck:talk', set: (ed) => ed.show(0), at: () => document.body }],
  },
  sheet: {
    cell: [
      { tpl: 'sheet:budget', at: (ed) => ed.querySelector('input[aria-label="B2"]') },
      { tpl: 'sheet:budget', set: (ed) => ((ed.sel = [0, 0]), (ed.end = [2, 1])), at: (ed) => ed.querySelector('input[aria-label="A1"]') },
      { tpl: 'sheet:habits', at: (ed) => ed.querySelector('input[type=checkbox]')?.closest('td')?.querySelector('input') ?? null },
    ],
  },
  calc: {
    entry: [{ tpl: 'calc:bill', set: (ed) => ed.setEntry('2+2'), at: (ed) => ed.querySelector('.calc-display') }],
    line: [{ tpl: 'calc:bill', at: (ed) => ed.querySelector('.calc-line') }],
  },
  draw: {
    canvas: [
      { tpl: 'draw:flowchart', at: (ed) => ed.querySelector('.draw-wrap') },
      { tpl: 'draw:flowchart', set: (ed) => (ed.sel = 0), at: (ed) => ed.querySelector('.draw-wrap') },
      { tpl: 'draw:card', set: (ed) => (ed.sel = ed.shapes.findIndex((s: { k: string }) => s.k === 't')), at: (ed) => ed.querySelector('.draw-wrap') },
      {
        tpl: 'draw:flowchart',
        set: (ed) => (
          (ed.tool = 'v'),
          (ed.pen = [
            [40, 40],
            [120, 40],
            [80, 120],
          ])
        ),
        at: (ed) => ed.querySelector('.draw-wrap'),
      },
      { tpl: 'draw:flowchart', set: (ed) => ((ed.tool = 'k'), (ed.sel = 0)), at: (ed) => ed.querySelector('.draw-wrap') },
    ],
    pixels: [{ tpl: 'draw:flowchart', set: (ed) => ed.setMode(8), at: (ed) => ed.querySelector('.draw-wrap') }],
  },
  diagram: {
    thing: [1, 2, 3, 5].flatMap((i) => [
      { tpl: 'diagram:mind-launch', at: (ed: Ed) => ed.querySelectorAll('.dg-pic g.dg-thing')[i] },
      { tpl: 'diagram:org-company', at: (ed: Ed) => ed.querySelectorAll('.dg-pic g.dg-thing')[i] },
    ]),
    picture: [
      { tpl: 'diagram:mind-launch', at: (ed) => ed.querySelector('.dg-wrap') },
      { tpl: 'diagram:net-webapp', set: (ed) => ed.armJoin(), at: (ed) => ed.querySelector('.dg-wrap') },
    ],
    words: [{ tpl: 'diagram:mind-launch', set: (ed) => ed.open(ed.view.d.shapes.find((s: { hit?: { k: string } }) => s.hit?.k === 'line').hit), at: words('to-text.dg-words') }],
    '': [{ tpl: 'diagram:net-webapp', set: (ed) => ed.armJoin(), at: (ed) => ed.querySelector('.dg-wrap') }],
  },
  anim: {
    stage: [
      { tpl: 'anim:bounce', at: (ed) => ed.querySelector('svg.anim-stage') },
      { tpl: 'anim:bounce', set: (ed) => (ed.sels = [0]), at: (ed) => ed.querySelector('svg.anim-stage') },
      { tpl: 'anim:bounce', set: (ed) => ed.toggle(), at: (ed) => ed.querySelector('svg.anim-stage') },
    ],
  },
  cal: {
    words: [{ tpl: 'cal:project', at: (ed) => nth(ed, '.cal-trow to-text', 2) }],
    rows: [{ tpl: 'cal:project', set: (ed) => ed.rows.choose(ed.view.items[1].at), at: (ed) => ed.rows.o.box() }],
    day: [
      { tpl: 'cal:family', at: (ed) => ed.querySelector('.cal-n') },
      { tpl: 'cal:family', set: (ed) => (ed.sweep = { from: ed.todayDay(), to: ed.todayDay() + 1 }), at: (ed) => ed.querySelector('.cal-n') },
    ],
    entry: [{ tpl: 'cal:family', at: (ed) => ed.querySelector('.cal-chip, .cal-agenda-item') }],
  },
  trip: {
    words: [{ tpl: 'trip:weekend', at: (ed) => nth(ed, '.trip-stop to-text.trip-name', 1) }],
    show: [{ tpl: 'trip:weekend', set: async (ed) => ((ed.presenting = 0), await ed.updateComplete), at: (ed) => ed.querySelector('.trip-present') }],
    pin: [{ tpl: 'trip:weekend', at: (ed) => ed.querySelector('.leaflet-marker-icon') }],
    '': [{ tpl: 'trip:weekend', at: (ed) => ed.querySelector('.trip-stops') ?? ed }],
  },
};

/** Whether pressing this key, from this place, runs this command. */
async function tryKey(cmd: Command, key: string, place: Place): Promise<boolean> {
  const [app, tpl] = place.tpl.split(':');
  const def = appOf(app)!;
  const shell = await mount(`#/v1/${app}/${encodeDoc(def.templates.find((x) => x.id === tpl)!.doc)}`);
  await until(() => !!shell.editor, 5000);
  const ed = shell.editor as Ed;
  await ed.updateComplete;
  await until(() => registered().some((c) => c.scope === app));
  await tick(30);
  await place.set?.(ed);
  await ed.updateComplete;
  await tick(30);
  const at = place.at(ed, shell);
  if (!at) return false;
  const seen: string[] = [];
  const was = trace.ran;
  trace.ran = (id) => (seen.push(id), was?.(id));
  try {
    press(at, key);
    await tick(60);
  } finally {
    trace.ran = was;
    for (const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) d.close();
  }
  return seen.includes(cmd.id);
}

test('every key in docs/editing.md’s tables runs the command its row names, pressed where it is heard', { timeout: 300000 }, async () => {
  const table = rows();
  expect(table.length).toBeGreaterThan(100);
  for (const a of apps()) register((await a.commands!()).default);
  const all = registered();
  const missed: string[] = [];
  for (const row of table) {
    const cmd = all.find((c) => c.scope === row.scope && labelOf(c) === row.label && keyList(c.keys).join(' ') === row.keys.join(' '));
    if (!cmd) {
      missed.push(`${row.scope}: ${row.label}: no such command`);
      continue;
    }
    if (cmd.native) continue;
    const places = PLACES[row.scope]?.[cmd.at ?? ''] ?? [];
    let ok = false;
    for (const place of places) {
      if ((ok = await tryKey(cmd, row.keys[0], place))) break;
    }
    if (!ok) missed.push(`${row.scope}: ${row.keys[0]} (${row.label}) runs nothing it says`);
  }
  expect(missed).toStrictEqual([]);
});
