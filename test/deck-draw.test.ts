import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deckEndsWithQr, deckIconColor, deckTransition, parseDeck, readDeck, serializeDeck } from '../src/lib/deckmodel.ts';
import { parseDrawing, serializeDrawing } from '../src/lib/drawmodel.ts';

test('deck round trip', () => {
  const slides = [
    { icon: 'rocket', title: 'Hello', bullets: ['one', '  two'] },
    { icon: '', title: '', bullets: ['orphan bullet'] },
    { icon: '', title: ': colon title', bullets: [] },
    { icon: '', title: 'Gap', bullets: ['a', '', 'b'], notes: ['Say this'] },
  ];
  const s = serializeDeck(slides);
  assert.equal(s, '## :rocket: Hello\n\n- one\n  - two\n\n---\n\n- orphan bullet\n\n---\n\n## : colon title\n\n---\n\n## Gap\n\n- a\n- b\n\n> Say this\n');
  // An empty bullet is not written down.
  assert.deepEqual(parseDeck(s), [slides[0], slides[1], slides[2], { ...slides[3], bullets: ['a', 'b'] }]);
  assert.equal(serializeDeck(parseDeck(s)), s);
});

test('deck title slides and settings', () => {
  const slides = [
    { icon: 'rocket', title: 'Big launch', bullets: ['Spring 2027'], layout: 't' as const },
    { icon: '', title: 'Agenda', bullets: ['one'] },
    { icon: '', title: 'Thanks', bullets: [], layout: 't' as const },
  ];
  const s = serializeDeck(slides);
  assert.equal(s, '## :rocket: Big launch {.title}\n\n- Spring 2027\n\n---\n\n## Agenda\n\n- one\n\n---\n\n## Thanks {.title}\n');
  assert.deepEqual(parseDeck(s), slides);
  // The settings are the header.
  const set = serializeDeck(slides.slice(1, 2), 'cut', 'r', false);
  assert.equal(set, '---\ntransition: cut\ncolor: red\nqr: no\n---\n## Agenda\n\n- one\n');
  assert.deepEqual([deckTransition(set), deckIconColor(set), deckEndsWithQr(set), deckEndsWithQr(s)], ['cut', 'r', false, true]);
  // A new deck opens on a title slide and costs nothing until it is touched.
  assert.deepEqual(parseDeck(''), [{ icon: '', title: '', bullets: [], layout: 't' }]);
  assert.equal(serializeDeck(parseDeck('')), '');
});

test('deck empties', () => {
  assert.equal(serializeDeck([{ icon: '', title: '', bullets: [] }, { icon: '', title: '', bullets: [] }]), '');
  assert.equal(serializeDeck([{ icon: '', title: '', bullets: [] }, { icon: '', title: 'x', bullets: [] }]), '---\n\n## x\n');
  assert.equal(parseDeck('---\n\n## x\n').length, 2);
});

test('deck read loosely: headings start slides, a table is a sheet', () => {
  assert.equal(readDeck('# Talk\nBy me\n## One\n* a\n    * b\n## Two\nWords'), '## Talk {.title}\n\n- By me\n\n---\n\n## One\n\n- a\n  - b\n\n---\n\n## Two\n\n- Words\n');
  // With rules, the slides are where the rules put them.
  assert.equal(readDeck('## A\n\n## B\n\n---\n\n## C'), '## A\n\n- B\n\n---\n\n## C\n');
  // A column break makes two columns; a link to another document shows it.
  assert.equal(parseDeck('## Now and then\n\n- a\n\n|\n\n- b')[0].layout, '2');
  assert.equal(readDeck(readDeck('# T\n## S\n| A | B |\n|---|---|\n| 1 | 2 |')), readDeck('# T\n## S\n| A | B |\n|---|---|\n| 1 | 2 |'));
  assert.equal(parseDeck('## S\n\n| A | B |\n|---|---|\n| 1 | 2 |')[0].sub, 'sheet\nA | B\n--- | ---\n1 | 2');
});

test('drawing round trip in grid units', () => {
  const shapes = [
    { k: 'r' as const, x: 16, y: 8, w: 96, h: 48, f: 1 as const, text: 'Box, with comma' },
    { k: 'a' as const, x: 112, y: 32, w: -64, h: 80, f: 0 as const, text: '' },
    { k: 't' as const, x: 0, y: 0, w: 96, h: 24, f: 0 as const, text: 'T' },
  ];
  const s = serializeDrawing(shapes);
  assert.equal(s, 'Kind | X | Y | W | H | Style | Label\n--- | --- | --- | --- | --- | --- | ---\nr | 2 | 1 | 12 | 6 | 1 | Box, with comma\na | 14 | 4 | -8 | 10 | 0 |\nt | 0 | 0 | 12 | 3 | 0 | T');
  assert.deepEqual(parseDrawing(s), shapes);
  assert.deepEqual(parseDrawing('junk\n\nKind | X\n--- | ---\nq | 1'), []);
  assert.deepEqual(parseDrawing(''), []);
  assert.equal(serializeDrawing([]), '');
});
