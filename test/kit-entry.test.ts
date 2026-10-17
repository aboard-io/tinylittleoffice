// The kit entry (src/kit.ts, `tinylittleoffice/kit`) for an app built outside the suite: at run time it is the editors'
// own file (packages/doc/package.json names dist/editors.js for "./kit"), so the editors entry must export every name
// the kit's declarations promise, read here from both sources, following an `export *` into the file it names. Neither
// entry runs under node (they define custom elements), so their exports are read, not imported; test/package.test.ts
// holds the built file to the same. And the registry an outside app is put in, under node: after the suite's apps,
// found by appOf, never listed by apps(), drawn where another document places one, and never under a name the registry
// knows.
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { exportsOf } from './lints.ts';
import { appOf, apps, registerApp } from '../src/kit/core/apps.ts';
import { defineApp } from '../src/kit/core/app.ts';
import { QR_LANG } from '../src/kit/draw/qr-picture.ts';
import { LOCKED_LANG } from '../src/kit/share/locked.ts';

const ROOT = join(import.meta.dirname, '..');

/** The names a module of the tree exports, with those of every module of the tree it exports whole. */
function namesOf(path: string): Map<string, boolean> {
  const { names, all } = exportsOf(readFileSync(join(ROOT, path), 'utf8'));
  const out = new Map(names.map((n) => [n.name, n.type]));
  for (const spec of all) for (const [name, type] of namesOf(relative(ROOT, resolve(ROOT, dirname(path), spec)))) out.set(name, type);
  return out;
}

describe('the kit entry', () => {
  const kit = namesOf('src/kit.ts');
  const editors = namesOf('src/editors.ts');

  test('the reader finds names, types, aliases and whole modules', () => {
    const src = "export { a, b as c, type T } from './x.ts';\nexport type { U } from './u.ts';\nexport * from './all.ts';\nexport const d = 1;\nexport interface I {}\nexport default 3;";
    expect(exportsOf(src)).toStrictEqual({
      names: [
        { name: 'a', type: false },
        { name: 'c', type: false },
        { name: 'T', type: true },
        { name: 'U', type: true },
        { name: 'd', type: false },
        { name: 'I', type: true },
      ],
      all: ['./all.ts'],
    });
  });

  test('serves an app’s author the contract, the registry, the commands, the words, the ui, the drawing, the table’s words and Lit', () => {
    for (const name of [
      'defineApp',
      'DocElement',
      'registerApp',
      'mount',
      'addStrings',
      't',
      'command',
      'cmdTool',
      'Rows',
      'ToText',
      'utf8',
      'icon',
      'cellAsShown',
      'tableAsCsv',
      'LitElement',
      'html',
      'liveValue',
    ])
      expect(kit.get(name), name).toBe(false);
    for (const name of ['AppDef', 'Editor', 'Template', 'Export', 'Handoff', 'DocChange', 'DocOps', 'DocPick', 'Picked', 'Entry', 'Command', 'TextOps', 'TemplateResult'])
      expect(kit.get(name), name).toBe(true);
  });

  test('the editors entry exports every name the kit does, as a value where the kit’s is one, since "./kit" is its file at run time', () => {
    expect([...kit].filter(([name, type]) => !editors.has(name) || (!type && editors.get(name)))).toStrictEqual([]);
    // And what it served a page before the kit came.
    for (const name of ['setup', 'mount', 'editorTag', 'apps', 'appOf', 'host', 'setTheme', 'keepSize', 'languages', 'chosenLanguage', 'pageCommands', 'toast'])
      expect(editors.has(name), name).toBe(true);
  });
});

describe('an app registered from outside the suite', () => {
  const tally = defineApp({
    id: 'tally',
    name: 'Tally',
    noun: 'tally',
    group: 'Plan',
    icon: [],
    blurb: 'Marks counted.',
    blank: () => '',
    templates: async () => [],
    editor: async () => ({ tag: 'tally-editor' }),
    title: () => '',
    retitle: (doc) => doc,
    view: () => [{ w: 100, h: 50, svg: '<g id="tally-drawn"/>' }],
  });

  test('comes after the suite’s, is found by its id, and the suite’s list stays the suite’s', () => {
    const suite = apps().map((a) => a.id);
    registerApp(tally);
    expect(appOf('tally')).toBe(tally);
    expect(apps().map((a) => a.id)).toStrictEqual(suite);
  });

  test('a document of it placed in another is drawn by its own view', () => {
    const [page] = appOf('write')!.view('# Count\n\n```tally\n- One\n```\n');
    expect(page.svg).toContain('<g id="tally-drawn"/>');
  });

  test('never takes a name the registry knows: its own again, an app’s, the QR code’s or a locked document’s', () => {
    for (const id of ['tally', 'write', QR_LANG, LOCKED_LANG]) expect(() => registerApp({ ...tally, id }), id).toThrow(`an app "${id}" is registered already`);
    expect(appOf('write')!.name).toBe('Word Processor');
  });
});
