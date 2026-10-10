// The walks' model (test/walks-model.ts) against the registry: a command joins the random walks by being registered.
// Every command but a menu's opener is a step of some family's walk, allowed in at least one state of the model, and
// every app is in a family. (The walks themselves are browser tests: test/browser/walks.test.ts.)
import { describe, expect, test } from 'vitest';
import { apps } from '../src/kit/apps.ts';
import { allCommands } from './commands-graph.ts';
import { KNOWN } from './walks-known.ts';
import { allowed, FAMILIES, familyCommands, KEYS, type Model, type Open, type Step } from './walks-model.ts';

const all = allCommands();

/** Every state the model can be in, for an app of a family: open or not, editing or presenting, either size. */
function states(family: string): Model[] {
  const out: Model[] = [];
  for (const app of FAMILIES[family])
    for (const open of [null, 'drawer', 'dialog', 'menu', 'context', 'palette'] as Open[])
      for (const mode of ['editing', 'presenting'] as const)
        for (const size of ['phone', 'desktop'] as const) out.push({ app, home: app, mode, open, focusWas: null, scrolled: false, size, keyboard: false });
  return out;
}

describe('the walks cover the registry', () => {
  test('every app is in one family', () => {
    const placed = Object.values(FAMILIES).flat();
    expect(
      apps()
        .map((a) => a.id)
        .filter((id) => placed.filter((p) => p === id).length !== 1),
    ).toStrictEqual([]);
  });

  test('every registry command (but a menu’s opener) is a step of some family’s walk, allowed in at least one state', () => {
    const missing = all
      .filter((c) => !c.menu)
      .filter((c) => !Object.keys(FAMILIES).some((f) => familyCommands(all, f).includes(c) && states(f).some((m) => allowed({ kind: 'command', id: c.id }, m, c))))
      .map((c) => `${c.id} is in no walk`);
    expect(missing).toStrictEqual([]);
  });

  test('a command is not a step over a modal, nor another app’s in this one', () => {
    const bold = all.find((c) => c.id === 'text.bold')!;
    const m: Model = { app: 'write', home: 'write', mode: 'editing', open: null, focusWas: null, scrolled: false, size: 'phone', keyboard: false };
    expect(allowed({ kind: 'command', id: bold.id }, m, bold)).toBe(true);
    expect(allowed({ kind: 'command', id: bold.id }, { ...m, open: 'dialog' }, bold)).toBe(false);
    const sheet = all.find((c) => c.scope === 'sheet')!;
    expect(allowed({ kind: 'command', id: sheet.id }, m, sheet)).toBe(false);
  });

  test('a pinch and a keyboard are a phone’s; a route back follows a route away', () => {
    const m: Model = { app: 'write', home: 'write', mode: 'editing', open: null, focusWas: null, scrolled: false, size: 'desktop', keyboard: false };
    const steps: Step[] = [{ kind: 'pinch', wider: true }, { kind: 'keyboard', up: true }, { kind: 'back' }];
    expect(steps.map((s) => allowed(s, m))).toStrictEqual([false, false, false]);
    expect(allowed({ kind: 'keyboard', up: true }, { ...m, size: 'phone' })).toBe(true);
    expect(allowed({ kind: 'back' }, { ...m, app: 'outline' })).toBe(true);
    expect(allowed({ kind: 'route', to: 'outline' }, m)).toBe(true);
    expect(KEYS).toContain('Escape');
  });
});

describe('what the walks found and left', () => {
  test('each known finding names a rule of the walks, why it is left, and how to replay it; no two share an id', () => {
    const rules = ['focus', 'back', 'modal', 'window', 'link', 'bar', 'overflow', 'names', 'keystroke', 'errors'];
    for (const k of KNOWN) {
      expect(rules, k.id).toContain(k.rule);
      expect(k.why.length, `${k.id} needs a reason`).toBeGreaterThan(80);
      expect(k.replay, `${k.id} needs a replay`).toMatch(/VITE_WALK_SEED=-?\d+/);
    }
    expect(new Set(KNOWN.map((k) => k.id)).size).toBe(KNOWN.length);
  });
});
