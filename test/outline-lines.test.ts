// The outline's lines between items: their kinds and names written before an item's words, and joins as "~ A -> B".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { edgeText, outlineToNet, parseLinks, parseOutline, plainOutline, serializeOutline } from '../src/lib/outlinemodel.ts';

const DOC = 'Launch\n  -> Product\n    -(sets)-> Pricing\n  <-> Marketing\n  -(part of)- Ops\n  <- Support\n~ Pricing -(feeds)-> Marketing\n~ Ops - Product';

test('each kind of line is written and read back', () => {
  assert.deepEqual(['-', '>', '<', '<>'].map((d) => edgeText(d as never)), ['', '->', '<-', '<->']);
  assert.deepEqual(['-', '>', '<', '<>'].map((d) => edgeText(d as never, 'x')), ['-(x)-', '-(x)->', '<-(x)-', '<-(x)->']);
  const items = parseOutline(DOC);
  assert.deepEqual(items.map((it) => [it.text, it.dir ?? '-', it.label ?? '']), [
    ['Launch', '-', ''], ['Product', '>', ''], ['Pricing', '>', 'sets'], ['Marketing', '<>', ''], ['Ops', '-', 'part of'], ['Support', '<', ''],
  ]);
  assert.deepEqual(parseLinks(DOC), [{ from: 'Pricing', to: 'Marketing', dir: '>', label: 'feeds' }, { from: 'Ops', to: 'Product', dir: '-' }]);
  assert.equal(serializeOutline(items, parseLinks(DOC)), DOC);
});

test('words that only look like a line are left alone, and a join to a missing item is dropped', () => {
  assert.deepEqual(parseOutline('A\n  -5 degrees\n  <-ish\n  ~strike~ me').map((it) => it.text), ['A', '-5 degrees', '<-ish', '~strike~ me']);
  assert.equal(serializeOutline(parseOutline('A\n  B'), [{ from: 'A', to: 'Gone', dir: '>' }]), 'A\n  B');
});

test('a mind map gets plain text; a network gets every line and join', () => {
  const items = parseOutline(DOC);
  assert.equal(plainOutline(items), 'Launch\n  Product\n    Pricing\n  Marketing\n  Ops\n  Support');
  assert.equal(outlineToNet(items, parseLinks(DOC)), 'Launch > Product\nProduct > Pricing: sets\nLaunch <-> Marketing\nLaunch - Ops: part of\nSupport > Launch\nPricing > Marketing: feeds\nOps - Product');
});
