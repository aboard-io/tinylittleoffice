// A diagram as text (def.text): each thing a heading with its words, then its connections as a list.
import { expect, test } from 'vitest';
import diagram from '../def.ts';

test('a mind map: its things as headings by depth, a cross-link under Connections', () => {
  expect(diagram.text!('---\nkind: mind\n---\n- Launch\n  - Press\n  - Site: six pages\n~ Press -> Site: links to\n')).toStrictEqual([
    { k: 'h', level: 2, runs: [{ t: 'Launch' }] },
    { k: 'h', level: 3, runs: [{ t: 'Press' }] },
    { k: 'h', level: 3, runs: [{ t: 'Site' }] },
    { k: 'p', runs: [{ t: 'six pages' }] },
    { k: 'h', level: 2, runs: [{ t: 'Connections' }] },
    { k: 'list', ord: false, items: [{ runs: [{ t: 'Press → Site: links to' }] }] },
  ]);
});

test('an org chart: a person’s name the heading, their role the words', () => {
  expect(diagram.text!('---\nkind: org\n---\n- Ada Diaz | Chief executive\n  - Ben Ode | Design\n')).toStrictEqual([
    { k: 'h', level: 2, runs: [{ t: 'Ada Diaz' }] },
    { k: 'p', runs: [{ t: 'Chief executive' }] },
    { k: 'h', level: 3, runs: [{ t: 'Ben Ode' }] },
    { k: 'p', runs: [{ t: 'Design' }] },
  ]);
});

test('every template with things in it reads as headings (a blank page per kind says nothing)', () => {
  for (const tp of diagram.templates) {
    const nodes = diagram.text!(tp.doc);
    if (!tp.doc.includes('\n- ') && !tp.doc.startsWith('- ')) {
      expect(nodes, tp.id).toEqual([]);
      continue;
    }
    expect(nodes.length, tp.id).toBeGreaterThan(0);
    expect(nodes[0].k, tp.id).toBe('h');
  }
});
