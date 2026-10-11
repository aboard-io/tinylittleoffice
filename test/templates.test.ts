// Every template of every app parses, and none shows an attribute mark as words: "{.right}" at the end of a line
// inside a paragraph is not the block's attribute (that sits at the block's end) and would be drawn as typed
// (Paul, 2026-10-10, the letter's address: "Mara Quill {.right}" displaying).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { apps } from '../src/kit/apps.ts';
import { parse } from '../src/doc/index.ts';

const MARK = /\{[.#][\w-]+\}/;

const wordsOf = (doc: ReturnType<typeof parse>): string[] => {
  const out: string[] = [];
  const walk = (x: unknown) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(walk);
    const o = x as Record<string, unknown>;
    if (typeof o.t === 'string') out.push(o.t);
    for (const k of Object.keys(o)) if (k !== 't') walk(o[k]);
  };
  walk(doc.blocks);
  return out;
};

test('no template draws an attribute mark as words', async () => {
  const shown: string[] = [];
  for (const app of apps()) {
    for (const tpl of await app.templates()) {
      const doc = parse(tpl.doc);
      for (const w of wordsOf(doc)) if (MARK.test(w)) shown.push(`${app.id}/${tpl.id}: ${w.slice(0, 60)}`);
    }
  }
  expect(shown).toEqual([]);
});

// A definition is light (Paul, 2026-10-11: "Lazy templates is right"): an app's templates are a chunk of their own,
// loaded when the home page's list, a script or a test asks for them, so the registry the home page imports carries
// none of their words.
test('a definition is light: its templates are imported when asked for, never with it', async () => {
  for (const app of apps()) {
    const def = readFileSync(join(import.meta.dirname, '../src/apps', app.id, 'def.ts'), 'utf8');
    expect(def, app.id).not.toMatch(/^import [^;]*from '\.\/templates\.ts'/m);
    expect(def, app.id).toContain("import('./templates.ts')");
    const asked = app.templates();
    expect(asked, app.id).toBeInstanceOf(Promise);
    expect((await asked).length, app.id).toBeGreaterThan(0);
  }
});
