// The outline's lines between items: their kinds and names as an item's attributes, joins as edges "~ A -> B: name", documents as fences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveLinks, outlineToDeck, outlineToNet, outlineToOrg, parseLinks, parseOutline, plainOutline, readOutline, readTree, serializeOutline } from '../src/lib/outlinemodel.ts';

const DOC = '- Launch\n  - Product {.from}\n    - Pricing {.from label=sets}\n  - Marketing {.both}\n  - Ops {label="part of"}\n  - Support {.to}\n\n~ Pricing -> Marketing: feeds\n~ Ops -- Product';

test('each kind of line is written and read back', () => {
  const items = parseOutline(DOC);
  assert.deepEqual(items.map((it) => [it.text, it.dir ?? '--', it.label ?? '']), [
    ['Launch', '--', ''], ['Product', '->', ''], ['Pricing', '->', 'sets'], ['Marketing', '<->', ''], ['Ops', '--', 'part of'], ['Support', '<-', ''],
  ]);
  assert.deepEqual(parseLinks(DOC), [{ from: 'Pricing', to: 'Marketing', dir: '->', label: 'feeds' }, { from: 'Ops', to: 'Product', dir: '--' }]);
  assert.equal(serializeOutline(items, parseLinks(DOC)), DOC);
});

test('words that only look like a line are left alone, and a join to a missing item is dropped by the editor', () => {
  assert.deepEqual(parseOutline('- A\n  - -5 degrees\n  - <-ish\n  - ~strike~ me').map((it) => it.text), ['A', '-5 degrees', '<-ish', '~strike~ me']);
  const items = parseOutline('- A\n  - B');
  assert.equal(serializeOutline(items, liveLinks(items, [{ from: 'A', to: 'Gone', dir: '->' }])), '- A\n  - B');
});

test('documents under items are fences that say their depth; the list after one says its depth too, until the next top item', () => {
  const items = [
    { depth: 0, text: 'A' },
    { depth: 1, text: 'B' },
    { depth: 2, text: '', doc: 'sheet\nx | y\n--- | ---\n1 | 2' },
    { depth: 2, text: 'C' },
    { depth: 1, text: 'D' },
    { depth: 0, text: 'E' },
    { depth: 1, text: 'F' },
  ];
  const text = serializeOutline(items);
  assert.equal(text, '- A\n  - B\n\n```sheet {depth=2}\nx | y\n--- | ---\n1 | 2\n```\n\n    - C {depth=2}\n  - D {depth=1}\n- E\n  - F');
  assert.deepEqual(parseOutline(text), items);
});

test('loose Markdown reads as the nested list: plain lines, other bullets, headings with their lists under them', () => {
  assert.equal(readOutline('Launch\n  Product\n    Pricing\n  Marketing'), '- Launch\n  - Product\n    - Pricing\n  - Marketing');
  assert.equal(readOutline('• a\n    * b\n        + c\n            1. d\nfar\n      x'), '- a\n  - b\n    - c\n      - d\n- far\n  - x');
  assert.equal(readOutline('# Plan\n\n- a\n  - b\n\n## Later\n- c'), '- Plan\n  - a\n    - b\n  - Later\n    - c');
  // Canonical text reads as itself.
  assert.equal(readOutline(DOC), DOC);
});

test('a mind map gets the plain list; an org chart its joins as dotted lines; a network every line and join', () => {
  const { items, links } = readTree(DOC);
  assert.equal(plainOutline(items), '- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support');
  assert.equal(outlineToOrg(items, links), '- Launch\n  - Product\n    - Pricing\n  - Marketing\n  - Ops\n  - Support\n\n~ Pricing -- Marketing: feeds\n~ Ops -- Product');
  assert.equal(outlineToNet(items, links), '~ Launch -> Product\n~ Product -> Pricing: sets\n~ Launch <-> Marketing\n~ Launch -- Ops: part of\n~ Launch <- Support\n~ Pricing -> Marketing: feeds\n~ Ops -- Product');
  assert.equal(outlineToNet(parseOutline('- Alone\n- A\n  - B'), []), '- Alone\n\n~ A -- B');
});

test('a deck: a slide for every item with something under it, headlines and bullets, a document a slide of its own', () => {
  const deck = outlineToDeck(parseOutline('- Launch\n  - Product\n    - Pricing\n      - Tiers\n    - Onboarding\n  - Marketing\n    - Press\n\n```sheet {depth=1}\na | b\n```\n\n  - Done {depth=1}'));
  assert.equal(
    deck,
    '## Launch {.title}\n\n- Product\n- Marketing\n- Done\n\n---\n\n## Product\n\n- Pricing\n- Onboarding\n\n---\n\n## Pricing\n\n- Tiers\n\n---\n\n## Marketing\n\n- Press\n\n---\n\n```sheet\na | b\n```',
  );
  // Two roots: no title slide, each root a slide.
  assert.equal(outlineToDeck(parseOutline('- A\n  - a1\n- B\n  - b1')), '## A\n\n- a1\n\n---\n\n## B\n\n- b1');
});
