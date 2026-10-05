import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDeck, serializeDeck } from '../src/lib/deckmodel.ts';
import { parseDrawing, serializeDrawing } from '../src/lib/drawmodel.ts';

test('deck round trip', () => {
  const slides = [
    { icon: 'rocket', title: 'Hello', bullets: ['one', 'two'] },
    { icon: '', title: '', bullets: ['orphan bullet'] },
    { icon: '', title: ': colon title', bullets: [] },
    { icon: '', title: 'Gap', bullets: ['a', '', 'b'] },
  ];
  const s = serializeDeck(slides);
  assert.equal(s, ':rocket\nHello\none\ntwo\n\n \norphan bullet\n\n:\n: colon title\n\nGap\na\n \nb');
  assert.deepEqual(parseDeck(s), [slides[0], slides[1], slides[2], { icon: '', title: 'Gap', bullets: ['a', ' ', 'b'] }]);
});

test('deck title slides', () => {
  const slides = [
    { icon: 'rocket', title: 'Big launch', bullets: ['Spring 2027'], layout: 't' as const },
    { icon: '', title: 'Agenda', bullets: ['one'] },
    { icon: '', title: 'Thanks', bullets: [], layout: 't' as const },
  ];
  const s = serializeDeck(slides);
  assert.equal(s, ':rocket:t\nBig launch\nSpring 2027\n\nAgenda\none\n\n::t\nThanks');
  assert.deepEqual(parseDeck(s), slides);
  // A new deck opens on a title slide and costs nothing until it is touched.
  assert.deepEqual(parseDeck(''), [{ icon: '', title: '', bullets: [], layout: 't' }]);
  assert.equal(serializeDeck(parseDeck('')), '');
});

test('deck empties', () => {
  assert.equal(serializeDeck([{ icon: '', title: '', bullets: [] }, { icon: '', title: '', bullets: [] }]), '');
  assert.equal(serializeDeck([{ icon: '', title: '', bullets: [] }, { icon: '', title: 'x', bullets: [] }]), '\n\nx');
  assert.equal(parseDeck('\n\nx').length, 2);
});

test('drawing round trip in grid units', () => {
  const shapes = [
    { k: 'r' as const, x: 16, y: 8, w: 96, h: 48, f: 1 as const, text: 'Box, with comma' },
    { k: 'a' as const, x: 112, y: 32, w: -64, h: 80, f: 0 as const, text: '' },
    { k: 't' as const, x: 0, y: 0, w: 96, h: 24, f: 0 as const, text: 'T' },
  ];
  const s = serializeDrawing(shapes);
  assert.equal(s, 'r,2,1,12,6,1,Box, with comma\na,14,4,-8,10,0\nt,0,0,12,3,0,T');
  assert.deepEqual(parseDrawing(s), shapes);
  assert.deepEqual(parseDrawing('junk\nq,1,1,1,1,0'), []);
  assert.deepEqual(parseDrawing(''), []);
});
