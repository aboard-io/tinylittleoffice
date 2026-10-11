// A calendar as text (def.text): each day a heading, its events items with their times and how they repeat.
import { expect, test } from 'vitest';
import cal from '../def.ts';

test('days as headings in order, events with their times', () => {
  const nodes = cal.text!(
    '---\nzone: Europe/London\n---\n- 2026-11-05 18:30-20:00: Bonfire night\n- 2026-11-03 16:30-17:15: Swimming {every=week times=10}\n- 2026-11-03: Bins out\n- 2026-11-21 to 2026-11-22: Grandma visits\n',
  );
  expect(nodes.map((n) => n.k)).toEqual(['h', 'list', 'h', 'list', 'h', 'list']);
  const words = (n: (typeof nodes)[number]) => (n.k === 'h' ? n.runs.map((r) => r.t).join('') : n.k === 'list' ? n.items.map((i) => i.runs.map((r) => r.t).join('')) : '');
  expect(words(nodes[0])).toMatch(/3 November 2026|November 3, 2026/);
  expect(words(nodes[1])).toEqual(['Bins out', '16:30–17:15 Swimming (Every week, 10 times)']);
  expect(words(nodes[2])).toMatch(/5 November|November 5/);
  expect(words(nodes[3])).toEqual(['18:30–20:00 Bonfire night']);
  expect(words(nodes[5])[0]).toMatch(/^Grandma visits \(Saturday, November 21.*22, 2026\)$/);
});

test('an empty calendar says nothing', () => {
  expect(cal.text!('')).toEqual([]);
});
