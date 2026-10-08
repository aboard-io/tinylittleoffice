import { test, expect } from 'vitest';
import { apps } from '../../src/kit/core.ts';
import { example } from '../../src/api.ts';
import { mount } from './helpers.ts';

// Every editor, empty and with a document in it: it draws, and opening it changes nothing.
for (const def of apps()) {
  test(`${def.id}: the editor opens, empty and with a document`, async () => {
    const empty = await mount(def.id);
    expect(empty.el.childElementCount, 'drawn').toBeGreaterThan(0);
    expect(empty.docs, 'opening an empty one writes nothing').toEqual([]);
    const doc = example(def.id);
    if (!doc) return;
    const full = await mount(def.id, doc);
    expect(full.docs, 'opening one writes nothing').toEqual([]);
    expect(full.el.childElementCount).toBeGreaterThan(0);
  });
}
