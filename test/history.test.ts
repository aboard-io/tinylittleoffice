// The op log: entries hold the ops and their inverse; typing folds within 700 ms under one key; undo hands back the
// inverse and the selection from before, redo the ops and the selection after; a new change ends the redo list.
import { expect, test } from 'vitest';
import { applyAll, parse, write, type Doc, type Op } from '../src/doc/index.ts';
import { History } from '../src/kit/history.ts';
import { caret } from '../src/kit/textops.ts';

const text = (at: number, from: number, to: number, s: string): Op => ({ op: 'text', at, from, to, runs: s ? [{ t: s }] : [] });

test('record, undo, redo: ops back and forth with the caret', () => {
  let now = 1000;
  const h = new History(() => now);
  let d = parse('abc\n');
  const op = text(0, 3, 3, 'd');
  h.record(d, [op], caret(0, 3), caret(0, 4));
  d = applyAll(d, [op]);
  expect(write(d)).toBe('abcd\n');
  expect(h.canUndo).toBe(true);
  const u = h.undo()!;
  expect(u.sel).toEqual(caret(0, 3));
  d = applyAll(d, u.ops);
  expect(write(d)).toBe('abc\n');
  expect(h.canUndo).toBe(false);
  expect(h.canRedo).toBe(true);
  const r = h.redo()!;
  expect(r.sel).toEqual(caret(0, 4));
  expect(write(applyAll(d, r.ops))).toBe('abcd\n');
  expect(h.undo()).not.toBeNull();
  expect(h.undo()).toBeNull();
});

test('typing within 700 ms folds into one entry; a pause, another key, or an undo starts a new one', () => {
  let now = 0;
  const h = new History(() => now);
  let d: Doc = { head: {}, blocks: [{ k: 'p', runs: [] }] };
  const type = (s: string, at: number, key?: string) => {
    const op = text(0, at, at, s);
    h.record(d, [op], caret(0, at), caret(0, at + 1), key);
    d = applyAll(d, [op]);
  };
  type('a', 0, 'type');
  now = 300;
  type('b', 1, 'type');
  now = 600;
  type('c', 2, 'type');
  expect(h.length).toBe(1);
  now = 1400;
  type('d', 3, 'type');
  expect(h.length).toBe(2);
  now = 1500;
  type('e', 4);
  expect(h.length).toBe(3);
  now = 1600;
  type('f', 5, 'type');
  expect(h.length).toBe(4);
  const u = h.undo()!;
  expect(write(applyAll(d, u.ops))).toBe('abcde\n');
  d = applyAll(d, u.ops);
  // After an undo the top entry does not take more letters.
  now = 1650;
  type('g', 5, 'type');
  expect(h.length).toBe(4);
  // The folded entry (under g, e and d) undoes as one, back to the caret where the burst began.
  h.undo();
  h.undo();
  h.undo();
  const first = h.undo()!;
  expect(first.ops).toHaveLength(3);
  expect(first.sel).toEqual(caret(0, 0));
  expect(write(applyAll(parse('abcd\n'), [text(0, 3, 4, '')]))).toBe('abc\n');
});

test('a change after an undo clears what could be redone; empty ops record nothing', () => {
  const h = new History(() => 0);
  const d = parse('x\n');
  h.record(d, [text(0, 1, 1, 'y')], null, null);
  h.undo();
  expect(h.canRedo).toBe(true);
  h.record(d, [text(0, 1, 1, 'z')], null, null);
  expect(h.canRedo).toBe(false);
  h.record(d, [], null, null);
  expect(h.length).toBe(1);
  h.clear();
  expect(h.canUndo).toBe(false);
});
