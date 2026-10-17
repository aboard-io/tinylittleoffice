// The command registry's lints (src/kit/core/commands.ts; docs/editing.md §10): each fails naming the command, the key or
// the string that broke its rule. And what the registry writes (docs/editing.md's tables, the skill's keys) is current.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { keyList, keyOf, keysText, labelOf, normalKey, runKey, command, say } from '../src/kit/core/commands.ts';
import { flatMessages } from '../scripts/ftl.ts';
import { editingTables } from '../scripts/commands.ts';
import { makeSkill } from '../scripts/make-skill.ts';
import { apps } from '../src/kit/core/apps.ts';
import { allCommands, collisions } from './commands-graph.ts';
import { SHADOWS } from './commands-shadows.ts';

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const all = allCommands();

describe('the registry is whole', () => {
  test('every app has its commands, through its definition, and they are the ones the tables are written from', async () => {
    for (const a of apps()) {
      expect(a.commands, `${a.id} has no commands`).toBeTypeOf('function');
      const got = (await a.commands!()).default;
      expect(got.length, `${a.id}'s commands`).toBeGreaterThan(0);
      for (const c of got) expect(c.scope, `${c.id}'s scope`).toBe(a.id);
      expect(
        got.every((c) => all.includes(c)),
        `${a.id}: a command the tables do not list`,
      ).toBe(true);
    }
  });
  test('ids are unique, each begins with its scope, and every keys string is written as it is read', () => {
    const ids = all.map((c) => c.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toStrictEqual([]);
    expect(all.filter((c) => !c.id.startsWith(`${c.scope}.`)).map((c) => c.id)).toStrictEqual([]);
    const crooked = all.filter((c) => c.keys && c.keys.split(' / ').some((k) => normalKey(k) !== k)).map((c) => `${c.id}: ${c.keys}`);
    expect(crooked, 'keys not written Mod+Alt+Shift+Key').toStrictEqual([]);
  });
  test('a menu named in a where is a menu some command opens, and that command is drawn somewhere a person reaches', () => {
    const menus = new Set(all.filter((c) => c.menu).map((c) => `${c.scope}:${c.menu}`));
    const orphans = all.flatMap((c) => c.where.filter((w) => w.startsWith('menu:') && !menus.has(`${c.scope}:${w.slice(5)}`)).map((w) => `${c.id} in ${w}`));
    expect(orphans).toStrictEqual([]);
  });
  test('the size of everything is three commands of the page, found by the drawer’s search, and none takes a key: Ctrl+=, Ctrl+- and Ctrl+0 are the browser’s own zoom', () => {
    const size = all.filter((c) => ['kit.larger', 'kit.smaller', 'kit.normal-size'].includes(c.id));
    expect(size.map((c) => labelOf(c))).toStrictEqual(['Zoom in', 'Zoom out', 'Reset zoom']);
    expect(size.filter((c) => c.keys).map((c) => c.id)).toStrictEqual([]);
    for (const k of ['Mod+=', 'Mod+-', 'Mod+0'])
      expect(
        all.filter((c) => c.scope === 'kit' && keyList(c.keys).includes(k)).map((c) => c.id),
        k,
      ).toStrictEqual([]);
  });
});

describe('the graph lints', () => {
  test('no key reaches two commands at once (the page, then the app, then the rows or the words, each at its place) unless listed with why', () => {
    const found = collisions().map((c) => c.id);
    const unlisted = collisions()
      .filter((c) => !(c.id in SHADOWS))
      .map((c) => `${c.key} binds ${c.id}`);
    expect(unlisted, 'a key bound twice: give one of them its place (`at`), or list the pair in test/commands-shadows.ts with why').toStrictEqual([]);
    expect(
      Object.keys(SHADOWS).filter((id) => !found.includes(id)),
      'an allowance for a pair that no longer meets',
    ).toStrictEqual([]);
    for (const [id, why] of Object.entries(SHADOWS)) expect(why.length, `${id} needs a reason`).toBeGreaterThan(20);
  });

  test('every command in a bar or a menu has keys, or the bar’s arrows reach it (the bar is a toolbar; a menu’s items are walked by its arrows once it is open)', () => {
    const menus = new Map(all.filter((c) => c.menu).map((c) => [`${c.scope}:${c.menu}`, c]));
    const reached = (c: (typeof all)[number]): boolean =>
      !!c.keys ||
      c.where.includes('bar') ||
      c.where.includes('drawer') ||
      c.where.includes('in-doc') ||
      c.where.some((w) => w.startsWith('menu:') && !!menus.get(`${c.scope}:${w.slice(5)}`) && reached(menus.get(`${c.scope}:${w.slice(5)}`)!));
    expect(all.filter((c) => c.where.some((w) => w === 'bar' || w.startsWith('menu:')) && !reached(c)).map((c) => c.id)).toStrictEqual([]);
  });

  test('every label is a message of en.ftl, through t()', () => {
    const messages = flatMessages(read('src/i18n/en.ftl'), 'en');
    const en = new Set(Object.keys(messages));
    const english = new Set(Object.values(messages));
    // The keys a label's function passes to t(), as written (the test's transform calls t as `(0, import.t)(…)`).
    const literals = (fn: unknown) => [...String(fn).matchAll(/(?:\bt|\.t\))\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2].replace(/\\(['"`\\])/g, '$1'));
    const bad = all.filter((c) => {
      if (typeof c.label === 'string') return !en.has(c.label);
      const literals_ = literals(c.label);
      return literals_.length ? !literals_.every((k) => en.has(k)) : !english.has(labelOf(c));
    });
    expect(bad.map((c) => `${c.id}: "${labelOf(c)}"`)).toStrictEqual([]);
  });

  test('no two commands of a scope share a label at one place, unless one of them is in force only sometimes', () => {
    const by = new Map<string, string[]>();
    for (const c of all.filter((x) => !x.menu && !x.when)) {
      const k = `${c.scope} at ${c.at ?? 'everywhere'}: ${labelOf(c)}`;
      by.set(k, [...(by.get(k) ?? []), c.id]);
    }
    expect([...by].filter(([, ids]) => ids.length > 1).map(([k, ids]) => `${k} (${ids.join(', ')})`)).toStrictEqual([]);
  });

  test('every command is run by at least one test (the browser tests write the map, test/commands-covered.json)', () => {
    const covered = new Set<string>(JSON.parse(read('test/commands-covered.json')));
    expect(all.filter((c) => !c.menu && !covered.has(c.id)).map((c) => `${c.id} is run by no test`)).toStrictEqual([]);
  });

  test('a key is spelled for a person by one function, a Mac’s way and Windows’, and nowhere else', () => {
    for (const c of all.filter((x) => x.keys)) {
      const mac = keysText(c.keys!, true);
      const win = keysText(c.keys!, false);
      expect(mac, c.id).not.toMatch(/Mod|Ctrl|Alt\+|Shift\+/);
      expect(win, c.id).not.toMatch(/⌘|⌥|⇧|Mod/);
      expect(mac.split(' / ').length, c.id).toBe(c.keys!.split(' / ').length);
    }
    expect(keysText('Mod+Shift+Z / Mod+Y', true)).toBe('⌘⇧Z / ⌘Y');
    expect(keysText('Mod+Alt+ArrowLeft', false)).toBe('Ctrl+Alt+←');
    // No other module writes a key's spelling of its own.
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : /\.ts$/.test(f) ? [join(dir, f)] : []));
    const spellers = files(join(root, 'src'))
      .filter((f) => !f.endsWith('kit/core/commands.ts') && !f.includes('/i18n/') && !f.includes('/tests/'))
      .filter((f) => /['"`]⌘|replace\(['"]Mod\+/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(root.length + 1));
    expect(spellers).toStrictEqual([]);
  });
});

describe('the keys as the registry reads them', () => {
  const ev = (key: string, o: Partial<KeyboardEvent> = {}) => ({ key, code: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...o }) as KeyboardEvent;
  test('a key pressed is spelled as the registry spells it, whatever the layout or Alt made of it', () => {
    expect(keyOf(ev('b', { ctrlKey: true }))).toBe('Mod+B');
    expect(keyOf(ev('B', { metaKey: true, shiftKey: true }))).toBe('Mod+Shift+B');
    expect(keyOf(ev('≠', { code: 'Equal', metaKey: true, altKey: true }))).toBe('Mod+Alt+=');
    expect(keyOf(ev('>', { metaKey: true, shiftKey: true }))).toBe('Mod+Shift+.');
    expect(keyOf(ev(' '))).toBe('Space');
    expect(keyOf(ev('ArrowUp', { altKey: true }))).toBe('Alt+ArrowUp');
    expect(keyList('Mod+Shift+Z / Mod+Y')).toStrictEqual(['Mod+Shift+Z', 'Mod+Y']);
  });
  test('runKey runs the first command in force whose key it is, takes the key, and lets a command that did not apply pass it on', () => {
    const log: string[] = [];
    const ctx = { on: true };
    const cmds = [
      command<typeof ctx>({ id: 't.a', scope: 't', label: () => 'a', keys: 'Tab', where: ['keys-only'], does: () => (log.push('a'), false) }),
      command<typeof ctx>({ id: 't.b', scope: 't', label: () => 'b', keys: 'Tab', where: ['keys-only'], when: (c) => c.on, does: () => void log.push('b') }),
      command<typeof ctx>({ id: 't.c', scope: 't', label: () => 'c', keys: 'Mod+C', native: true, where: ['keys-only'], does: () => void log.push('c') }),
    ];
    let prevented = false;
    const e = { ...ev('Tab'), defaultPrevented: false, isComposing: false, preventDefault: () => (prevented = true) } as unknown as KeyboardEvent;
    expect(runKey(e, cmds, ctx)).toBe(true);
    expect(log).toStrictEqual(['a', 'b']);
    expect(prevented).toBe(true);
    const copy = { ...ev('c', { ctrlKey: true }), defaultPrevented: false, isComposing: false, preventDefault: () => undefined } as unknown as KeyboardEvent;
    expect(runKey(copy, cmds, ctx)).toBe(false);
    ctx.on = false;
    log.length = 0;
    expect(runKey(e, cmds, ctx)).toBe(false);
  });
});

describe('a page’s own commands (docs/library.md)', () => {
  // A page that holds an editor declares its scope as the kit does, and registers it as the page runs: the registry the
  // lints and the tables read is the site's, loaded by scripts/commands.ts, and a host's is never in it.
  const own = command<{ record: string }>({ id: 'host.open', scope: 'host', label: (b) => (b ? `Open ${b.record}` : 'Open a record'), keys: 'Mod+Shift+9', where: ['bar'], does: () => {} });
  test('its words are its own, a function of its context rather than a message of en.ftl', () => {
    expect(labelOf(own)).toBe('Open a record');
    expect(labelOf(own, { record: 'r1' })).toBe('Open r1');
    expect(say(own.label, { record: 'r2' })).toBe('Open r2');
  });
  test('the key the browser test binds for it is no command’s of the site’s, so no chain of scopes meets it', () => {
    expect(all.filter((c) => keyList(c.keys).includes('Mod+Shift+9')).map((c) => c.id)).toStrictEqual([]);
    expect(collisions([...all, own]).filter((c) => c.a === own || c.b === own)).toStrictEqual([]);
    expect(all.some((c) => c.scope === 'host')).toBe(false);
  });
});

// That docs/editing.md and the skill are current is test/lints.test.ts's (npm run commands writes them).
describe('what the registry writes', () => {
  test('rows of data (themes, inks, a new document of each app) are drawn but left out of the tables, and none has keys', () => {
    const data = all.filter((c) => c.data);
    expect(data.length).toBeGreaterThan(20);
    expect(data.filter((c) => c.keys).map((c) => c.id)).toStrictEqual([]);
    const rows = editingTables()
      .split('\n')
      .filter((l) => /^\| [^K-]/.test(l) || /^\| \| /.test(l)).length;
    expect(rows).toBe(all.filter((c) => !c.menu && !c.data).length);
  });
  test('the skill lists the keys of every app', async () => {
    const skill = await makeSkill();
    for (const a of apps().filter((x) => all.some((c) => c.scope === x.id && c.keys))) expect(skill).toContain(`**${a.name}**:`);
  });
});
